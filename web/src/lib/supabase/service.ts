import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getSupabaseUrlAndAnon } from "@/lib/supabase/public-env";

/** Service role — server-only. Admin dashboard data + marketing lead capture (no anon insert policies). */
export function createSupabaseServiceRoleClient() {
  const creds = getSupabaseUrlAndAnon();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!creds || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(creds.url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
