"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseUrlAndAnon } from "@/lib/supabase/public-env";
import { supabaseSsrCookieOptions } from "@/lib/supabase/ssr-cookie-options";

/** Browser-only Supabase client — persists session cookies in a way middleware / RSC can read. */
export function getSupabaseBrowserClient() {
  const creds = getSupabaseUrlAndAnon();
  if (!creds) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.");
  }
  const { url, anon } = creds;
  const cookieOptions = supabaseSsrCookieOptions();
  return createBrowserClient(url, anon, cookieOptions ? { cookieOptions } : undefined);
}
