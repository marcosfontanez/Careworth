import "server-only";

import { NextResponse } from "next/server";

import { requireAdminSupabaseForModeration } from "@/lib/admin/moderation-auth";
import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminApiSession = {
  supabase: SupabaseClient;
  adminUserId: string;
};

/**
 * Shared gate for `/api/admin/*` route handlers.
 * Returns 401 when unauthenticated, 403 when signed in but not staff.
 * Never leaks server env or role internals in error bodies.
 */
export async function requireAdminApiSession(): Promise<
  | { ok: true; session: AdminApiSession }
  | { ok: false; response: NextResponse }
> {
  const g = await requireAdminSupabaseForModeration();
  if (!g.ok) {
    const forbidden = /not authorized|not a staff/i.test(g.error);
    const status = forbidden ? 403 : 401;
    const error = status === 403 ? "Forbidden" : "Unauthorized";
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error }, { status }),
    };
  }
  return {
    ok: true,
    session: { supabase: g.supabase, adminUserId: g.adminUserId },
  };
}
