import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });

  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.error || 'Something went wrong. Please try again.');
  }

  return data;
}

function Icon({ name, size = 18 }) {
  const paths = {
    arrow: <><path d="M7 17 17 7M8 7h9v9" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    copy: <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></>,
    link: <><path d="M10 13a5 5 0 0 0 7.07 0l3-3A5 5 0 0 0 13 2.93l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.07 0l-3 3A5 5 0 0 0 11 21.07l1.71-1.71" /></>,
    pulse: <><path d="M3 12h4l3-8 4 16 3-8h4" /></>,
    refresh: <><path d="M20 7v5h-5" /><path d="M4 17v-5h5" /><path d="M5.6 9a7 7 0 0 1 11.55-2.6L20 12M4 12l2.85 5.6A7 7 0 0 0 18.4 15" /></>,
    spark: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.1L12 19l-1.9-5.9L4 11l6.1-2.2L12 3Z" /><path d="m19 14 1.1 2.9L23 18l-2.9 1.1L19 22l-1.1-2.9L15 18l2.9-1.1L19 14Z" /></>,
  };

  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

function validateDestination(value) {
  try {
    const url = new URL(value.trim());
    return ['http:', 'https:'].includes(url.protocol) && Boolean(url.hostname);
  } catch {
    return false;
  }
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function formatHost(value) {
  try {
    return new URL(value).hostname;
  } catch {
    return value;
  }
}

function formatCount(value) {
  const number = Number(value);
  return Number.isFinite(number) ? new Intl.NumberFormat().format(number) : '—';
}

function shortUrlForCode(code) {
  return new URL(`/r/${encodeURIComponent(code)}`, window.location.origin).toString();
}

function App() {
  const [destinationUrl, setDestinationUrl] = useState('');
  const [links, setLinks] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');
  const [dashboardError, setDashboardError] = useState('');
  const [created, setCreated] = useState(null);
  const [copiedKey, setCopiedKey] = useState('');
  const [copyError, setCopyError] = useState('');

  async function loadDashboard(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setDashboardError('');

    try {
      const [linkData, analyticsData] = await Promise.all([
        apiRequest('/api/links'),
        apiRequest('/api/analytics'),
      ]);
      setLinks(Array.isArray(linkData.links) ? linkData.links : []);
      setAnalytics(analyticsData);
    } catch (error) {
      setDashboardError(error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function handleCreate(event) {
    event.preventDefault();
    setFormError('');
    setCreated(null);

    const normalizedUrl = destinationUrl.trim();
    if (!validateDestination(normalizedUrl)) {
      setFormError('Enter a valid web address starting with http:// or https://.');
      return;
    }

    setCreating(true);
    try {
      const result = await apiRequest('/api/links', {
        method: 'POST',
        body: JSON.stringify({ destinationUrl: normalizedUrl }),
      });
      setCreated({
        ...result,
        shortUrl: shortUrlForCode(result.link.code),
      });
      setDestinationUrl('');
      await loadDashboard(true);
    } catch (error) {
      setFormError(error.message);
    } finally {
      setCreating(false);
    }
  }

  async function copyText(text, key) {
    setCopyError('');
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((current) => current === key ? '' : current), 1800);
    } catch {
      setCopyError('Clipboard access is unavailable. Select and copy the link instead.');
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="LinkPulse home">
          <span className="brand-mark"><Icon name="pulse" size={22} /></span>
          <span>Link<span className="brand-light">Pulse</span></span>
        </a>
        <nav className="main-nav" aria-label="Main navigation">
          <a className="nav-link active" href="#overview">Overview</a>
          <a className="nav-link" href="#links">My links</a>
        </nav>
        <div className="topbar-note"><span className="live-dot" /> Your links, in focus</div>
      </header>

      <main className="page" id="top">
        <section className="hero" id="overview">
          <div className="hero-copy">
            <p className="eyebrow"><Icon name="spark" size={15} /> LINK MANAGEMENT, MADE SIMPLE</p>
            <h1 aria-label="Make every link count.">Make every link<br /><span aria-hidden="true">count.</span></h1>
            <p className="hero-description">Create a shorter link, share it anywhere, and see how it performs.</p>
          </div>
          <div className="shorten-card">
            <div className="card-heading">
              <div className="heading-icon"><Icon name="link" /></div>
              <div>
                <h2>Shorten a link</h2>
                <p>Paste a long URL to get started.</p>
              </div>
            </div>
            <form className="shorten-form" onSubmit={handleCreate} noValidate>
              <label className="sr-only" htmlFor="destination-url">Destination URL</label>
              <div className="input-wrap">
                <Icon name="link" size={19} />
                <input
                  id="destination-url"
                  type="url"
                  inputMode="url"
                  autoComplete="url"
                  placeholder="https://your-very-long-link.com/..."
                  value={destinationUrl}
                  onChange={(event) => {
                    setDestinationUrl(event.target.value);
                    if (formError) setFormError('');
                  }}
                  aria-describedby={formError ? 'form-error' : undefined}
                  required
                />
              </div>
              <button className="primary-button" type="submit" disabled={creating || !destinationUrl.trim()}>
                {creating ? <><span className="spinner" /> Creating…</> : <>Create short link <span aria-hidden="true">↗</span></>}
              </button>
            </form>
            {formError && <p className="form-message error-message" id="form-error" role="alert">{formError}</p>}
            {created?.shortUrl && (
              <div className="created-result" role="status">
                <div className="created-check"><Icon name="check" size={17} /></div>
                <div className="created-copy">
                  <span>Your short link is ready</span>
                  <a href={created.shortUrl} target="_blank" rel="noreferrer">{created.shortUrl}</a>
                </div>
                <button className="copy-button result-copy" type="button" onClick={() => copyText(created.shortUrl, 'created')}>
                  <Icon name={copiedKey === 'created' ? 'check' : 'copy'} size={16} />
                  {copiedKey === 'created' ? 'Copied' : 'Copy'}
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="stats-grid" aria-label="Link analytics">
          <article className="stat-card stat-primary">
            <div className="stat-topline"><span className="stat-icon"><Icon name="link" /></span><span className="stat-caption">ALL TIME</span></div>
            <p className="stat-value">{analytics ? formatCount(analytics.totalLinks) : loading ? '…' : '—'}</p>
            <p className="stat-label">Links created</p>
          </article>
          <article className="stat-card">
            <div className="stat-topline"><span className="stat-icon clicks-icon"><Icon name="pulse" /></span><span className="stat-caption">ALL TIME</span></div>
            <p className="stat-value">{analytics ? formatCount(analytics.totalClicks) : loading ? '…' : '—'}</p>
            <p className="stat-label">Total clicks</p>
          </article>
          <article className="stat-note">
            <span className="note-symbol"><Icon name="spark" size={20} /></span>
            <div><strong>One place for your links</strong><p>Keep destinations organized and check their real click activity.</p></div>
          </article>
        </section>

        <section className="links-section" id="links">
          <div className="section-heading">
            <div>
              <p className="section-kicker">YOUR WORKSPACE</p>
              <h2>Your links <span className="count-pill">{analytics ? formatCount(analytics.totalLinks) : '—'}</span></h2>
            </div>
            <button className="refresh-button" type="button" onClick={() => loadDashboard(true)} disabled={refreshing}>
              <Icon name="refresh" size={16} /> {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>

          {dashboardError && (
            <div className="dashboard-error" role="alert">
              <div><strong>We couldn’t load your link data.</strong><span>{dashboardError}</span></div>
              <button type="button" onClick={() => loadDashboard()}>Try again</button>
            </div>
          )}

          {loading && !dashboardError ? (
            <div className="loading-state"><span className="spinner dark-spinner" /> Loading your links…</div>
          ) : !dashboardError && links.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><Icon name="link" size={23} /></div>
              <h3>Your first short link starts here</h3>
              <p>Paste a destination above and your saved links will appear in this space.</p>
              <a href="#destination-url">Create your first link <span aria-hidden="true">↑</span></a>
            </div>
          ) : !dashboardError ? (
            <>
              <div className="link-list-heading" aria-hidden="true">
                <span>DESTINATION</span><span>SHORT LINK</span><span>CREATED</span><span>CLICKS</span><span />
              </div>
              <div className="link-list">
                {links.map((link) => {
                  const shortUrl = shortUrlForCode(link.code);
                  const rowKey = `link-${link.code}`;
                  return (
                    <article className="link-row" key={link.code}>
                      <div className="destination-cell">
                        <a className="destination-link" href={link.destinationUrl} target="_blank" rel="noreferrer" title={link.destinationUrl}>
                          {link.destinationUrl}<Icon name="arrow" size={14} />
                        </a>
                        <span className="destination-host">{formatHost(link.destinationUrl)}</span>
                      </div>
                      <div className="short-cell">
                        <a className="short-link" href={shortUrl} target="_blank" rel="noreferrer">{shortUrl}</a>
                      </div>
                      <div className="date-cell"><span className="mobile-field-label">CREATED</span>{formatDate(link.createdAt)}</div>
                      <div className="click-cell"><span className="mobile-field-label">CLICKS</span><span className="click-count">{formatCount(link.clickCount)}</span></div>
                      <div className="row-actions">
                        <button className="icon-button" type="button" aria-label={`Copy ${shortUrl}`} title="Copy short link" onClick={() => copyText(shortUrl, rowKey)}>
                          <Icon name={copiedKey === rowKey ? 'check' : 'copy'} size={16} />
                        </button>
                        <a className="icon-button" aria-label="Open destination" title="Open destination" href={link.destinationUrl} target="_blank" rel="noreferrer"><Icon name="arrow" size={16} /></a>
                        {copiedKey === rowKey && <span className="copied-label">Copied</span>}
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          ) : null}
          {copyError && <p className="inline-copy-error" role="alert">{copyError}</p>}
        </section>

        <footer className="footer"><span className="footer-brand"><Icon name="pulse" size={15} /> LinkPulse</span><span>Short links. Clear signals.</span></footer>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>,
);
