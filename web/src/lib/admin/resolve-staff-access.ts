import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseUrlAndAnon } from "@/lib/supabase/public-env";

async function staffFlagViaServiceRole(userId: string): Promise<boolean | null> {
  const creds = getSupabaseUrlAndAnon();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!creds || !serviceKey) {
    return null;
  }

  const service = createClient(creds.url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: profile, error } = await service
    .from("profiles")
    .select("role_admin")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[resolveStaffAccess] service role check:", error.message);
    return false;
  }

  return profile?.role_admin === true;
}

/**
 * Returns whether `userId` is a staff account (`profiles.role_admin`).
 *
 * Prefers a service-role read when available (reliable on Node route handlers).
 * Falls back to current_user_role_admin() for environments without the service key
 * (e.g. Edge middleware — avoid staff gating there).
 */
export async function resolveStaffAccess(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const viaService = await staffFlagViaServiceRole(userId);
  if (viaService === true) {
    return true;
  }
  if (viaService === false) {
    return false;
  }

  await supabase.auth.getSession();
  const { data: isAdmin, error: rpcError } = await supabase.rpc("current_user_role_admin");
  if (rpcError) {
    console.warn("[resolveStaffAccess] current_user_role_admin:", rpcError.message);
    return false;
  }

  return isAdmin === true;
}
