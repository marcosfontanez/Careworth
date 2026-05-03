import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseUrlAndAnon } from "@/lib/supabase/public-env";

/** Anonymous reads for marketing deep-link pages (honors RLS; use only for public tables). */
export function createPublicSupabaseAnonClient(): SupabaseClient | null {
  const creds = getSupabaseUrlAndAnon();
  if (!creds) return null;
  const { url, anon } = creds;
  return createClient(url, anon);
}
