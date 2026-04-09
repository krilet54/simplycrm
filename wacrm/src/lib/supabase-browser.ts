// src/lib/supabase-browser.ts
'use client';

import { createBrowserClient } from '@supabase/ssr';

let client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
  if (typeof window === 'undefined') {
    return null;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  if (!client) {
    client = createBrowserClient(
      supabaseUrl,
      supabaseAnonKey
    );
  }
  return client;
}

export function requireSupabaseBrowserClient() {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    throw new Error('Supabase is not configured');
  }

  return supabase;
}
