import { createClient } from '@supabase/supabase-js';

let client;

export function isSupabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_ANON_KEY?.trim());
}

export function getSupabaseClient() {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase configuration is missing.');
  }

  if (!client) {
    client = createClient(
      process.env.SUPABASE_URL.trim(),
      process.env.SUPABASE_ANON_KEY.trim(),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }

  return client;
}
