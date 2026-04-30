import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";

/**
 * Moderation writes must be performed by a signed-in staff user (admin `proxy` gateway already
 * enforces role_admin for /admin). When SUPABASE_SERVICE_ROLE_KEY is set we prefer the
 * service client so deletes/updates match admin loaders. Session is still verified first.
 */
export async function requireAdminSupabaseForModeration(): Promise<
  | { ok: true; supabase: SupabaseClient; adminUserId: string }
  | { ok: false; error: string }
> {
  let userClient: SupabaseClient;
  try {
    userClient = await createSupabaseServerClient();
  } catch {
    return { ok: false, error: "Server missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY." };
  }

  // Server actions: read session from cookies first (reliable right after sign-in).
  const { data: sessionData } = await userClient.auth.getSession();
  let user = sessionData.session?.user ?? null;
  if (!user) {
    const { data } = await userClient.auth.getUser();
    user = data.user;
  }

  if (!user?.id) {
    return {
      ok: false,
      error:
        "Not signed in from the server’s point of view. Hard-refresh the page, or sign out and sign in again at /admin/login.",
    };
  }

  const { data: profile } = await userClient
    .from("profiles")
    .select("role_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.role_admin) {
    return { ok: false, error: "Not authorized for moderation (profile.role_admin is false)." };
  }

  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      return { ok: true, supabase: createSupabaseServiceRoleClient(), adminUserId: user.id };
    } catch (e) {
      console.warn("requireAdminSupabaseForModeration: service role client failed, using session client:", e);
    }
  }

  return { ok: true, supabase: userClient, adminUserId: user.id };
}
