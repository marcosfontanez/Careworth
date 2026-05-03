import "server-only";

import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";
import { getSupabaseUrlAndAnon } from "@/lib/supabase/public-env";

/**
 * Supabase client for admin dashboard / insights loaders.
 * Prefers the service role key so aggregates bypass RLS (admin `proxy` already enforces role_admin).
 * Falls back to the user session when the service key is not set (local/dev).
 */
export async function createAdminDataSupabaseClient() {
  const creds = getSupabaseUrlAndAnon();
  if (creds && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return createSupabaseServiceRoleClient();
  }
  if (!isSupabaseConfigured()) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return createSupabaseServerClient();
}
