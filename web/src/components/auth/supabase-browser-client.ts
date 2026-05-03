"use client";

import { createBrowserClient } from "@supabase/ssr";

/** Browser-only Supabase client — persists session cookies in a way middleware / RSC can read. */
export function getSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.");
  }
  return createBrowserClient(url, anon);
}
