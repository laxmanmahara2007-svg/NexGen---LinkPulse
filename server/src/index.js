import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import express from 'express';
import { getSupabaseClient, isSupabaseConfigured } from './supabase.js';

const app = express();
const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || '0.0.0.0';
const linkColumns = 'code,destination_url,created_at,click_count';
const pageSize = 1000;
const maxCodeAttempts = 5;
const appBaseUrl = process.env.APP_BASE_URL || `http://localhost:${port}`;

app.use(express.json({ limit: '16kb' }));

function validateHttpUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) return null;

  try {
    const parsed = new URL(value.trim());
    if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) return null;
    if (parsed.username || parsed.password) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function createShortCode() {
  return randomBytes(6).toString('base64url');
}

function shortUrlFor(code) {
  try {
    const base = new URL(appBaseUrl);
    if (!['http:', 'https:'].includes(base.protocol)) return null;
    return new URL(`/r/${encodeURIComponent(code)}`, base).toString();
  } catch {
    return null;
  }
}

function databaseUnavailable(response) {
  return response.status(503).json({ error: 'Database is not configured.' });
}

function databaseFailure(response, operation, error) {
  console.error(`Supabase ${operation} failed (code: ${error?.code ?? 'unknown'}).`);
  return response.status(503).json({ error: 'Database operation failed.' });
}

async function fetchAllLinks(client) {
  const links = [];
  let offset = 0;

  while (true) {
    const { data, error } = await client
      .from('links')
      .select(linkColumns)
      .order('created_at', { ascending: false })
      .order('code', { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) throw error;
    links.push(...(data ?? []));
    if (!data || data.length < pageSize) return links;
    offset += data.length;
  }
}

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok', service: 'LinkPulse API' });
});

app.get('/api/health/db', async (_request, response) => {
  if (!isSupabaseConfigured()) {
    return response.status(503).json({
      status: 'unavailable',
      database: 'not_configured',
    });
  }

  try {
    const { error } = await getSupabaseClient()
      .from('links')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Supabase health check failed:', error.code ?? 'unknown error');
      return response.status(503).json({
        status: 'unavailable',
        database: 'unreachable',
      });
    }

    return response.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    console.error('Supabase health check failed:', error?.code ?? 'unknown error');
    return response.status(503).json({
      status: 'unavailable',
      database: 'unreachable',
    });
  }
});

app.post('/api/links', async (request, response) => {
  const destinationUrl = validateHttpUrl(request.body?.destinationUrl);
  if (!destinationUrl) {
    return response.status(400).json({
      error: 'destinationUrl must be a valid HTTP or HTTPS URL.',
    });
  }

  const shortUrlBase = shortUrlFor('placeholder');
  if (!shortUrlBase) {
    console.error('APP_BASE_URL must be a valid HTTP or HTTPS URL.');
    return response.status(500).json({ error: 'Link service configuration is invalid.' });
  }

  if (!isSupabaseConfigured()) return databaseUnavailable(response);

  try {
    const supabase = getSupabaseClient();

    for (let attempt = 0; attempt < maxCodeAttempts; attempt += 1) {
      const code = createShortCode();
      const { data, error } = await supabase
        .from('links')
        .insert({ code, destination_url: destinationUrl })
        .select(linkColumns)
        .single();

      if (error?.code === '23505') continue;
      if (error) return databaseFailure(response, 'link creation', error);

      return response.status(201).json({
        shortUrl: shortUrlFor(data.code),
        link: {
          code: data.code,
          destinationUrl: data.destination_url,
          createdAt: data.created_at,
          clickCount: data.click_count,
        },
      });
    }

    console.error(`Supabase link creation could not allocate a unique code after ${maxCodeAttempts} attempts.`);
    return response.status(503).json({ error: 'Unable to create a unique short link. Please try again.' });
  } catch (error) {
    return databaseFailure(response, 'link creation', error);
  }
});

app.get('/api/links', async (_request, response) => {
  if (!isSupabaseConfigured()) return databaseUnavailable(response);

  try {
    const links = await fetchAllLinks(getSupabaseClient());
    return response.json({
      links: links.map((link) => ({
        code: link.code,
        destinationUrl: link.destination_url,
        createdAt: link.created_at,
        clickCount: link.click_count,
      })),
    });
  } catch (error) {
    return databaseFailure(response, 'link listing', error);
  }
});

app.get('/api/analytics', async (_request, response) => {
  if (!isSupabaseConfigured()) return databaseUnavailable(response);

  try {
    const { data, error } = await getSupabaseClient().rpc('get_link_analytics');
    if (error) return databaseFailure(response, 'analytics', error);

    const totals = Array.isArray(data) ? data[0] : data;
    if (!totals) return response.status(503).json({ error: 'Analytics function returned no result.' });

    return response.json({
      totalLinks: Number(totals.total_links),
      totalClicks: Number(totals.total_clicks),
    });
  } catch (error) {
    return databaseFailure(response, 'analytics', error);
  }
});

app.get('/r/:code', async (request, response) => {
  const { code } = request.params;
  if (!/^[A-Za-z0-9_-]{3,64}$/.test(code)) {
    return response.status(404).json({ error: 'Short link not found.' });
  }
  if (!isSupabaseConfigured()) return databaseUnavailable(response);

  try {
    const supabase = getSupabaseClient();
    const { data: link, error: lookupError } = await supabase
      .from('links')
      .select('code,destination_url')
      .eq('code', code)
      .maybeSingle();

    if (lookupError) return databaseFailure(response, 'link lookup', lookupError);
    if (!link) return response.status(404).json({ error: 'Short link not found.' });

    const destinationUrl = validateHttpUrl(link.destination_url);
    if (!destinationUrl) {
      console.error('Stored LinkPulse destination failed HTTP(S) validation.');
      return response.status(500).json({ error: 'Stored link destination is invalid.' });
    }

    const { data: updatedCount, error: clickError } = await supabase.rpc(
      'increment_link_click',
      { p_code: code },
    );

    if (clickError) return databaseFailure(response, 'click recording', clickError);
    if (updatedCount === null || updatedCount === undefined) {
      return response.status(404).json({ error: 'Short link not found.' });
    }

    return response.redirect(302, destinationUrl);
  } catch (error) {
    return databaseFailure(response, 'redirect', error);
  }
});

app.use((error, _request, response, _next) => {
  if (error?.type === 'entity.parse.failed') {
    return response.status(400).json({ error: 'Request body must contain valid JSON.' });
  }
  if (error?.type === 'entity.too.large') {
    return response.status(413).json({ error: 'Request body is too large.' });
  }
  console.error('Unhandled LinkPulse request error.');
  return response.status(500).json({ error: 'Internal server error.' });
});

const server = app.listen(port, host, () => {
  const address = server.address();
  const actualPort = typeof address === 'object' && address ? address.port : port;
  console.log(`LinkPulse API listening at http://localhost:${actualPort} (bound to ${host})`);
});

server.on('error', (error) => {
  console.error(`LinkPulse API failed to listen on ${host}:${port}: ${error.message}`);
  process.exit(1);
});
