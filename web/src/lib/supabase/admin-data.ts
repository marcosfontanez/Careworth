import "server-only";

import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";

/**
 * Supabase client for admin dashboard / insights loaders.
 * Prefers the service role key so aggregates bypass RLS (admin `proxy` already enforces role_admin).
 * Falls back to the user session when the service key is not set (local/dev).
 */
export async function createAdminDataSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (url && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return createSupabaseServiceRoleClient();
  }
  if (!isSupabaseConfigured()) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return createSupabaseServerClient();
}
