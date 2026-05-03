import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Anonymous reads for marketing deep-link pages (honors RLS; use only for public tables). */
export function createPublicSupabaseAnonClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  return createClient(url, anon);
}
