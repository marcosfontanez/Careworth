import "server-only";

import { NextResponse } from "next/server";

import { requireAdminSupabaseForModeration } from "@/lib/admin/moderation-auth";
import {
  requireStaffPermission,
  type StaffPermission,
} from "@/lib/admin/staff-permissions";
import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminApiSession = {
  supabase: SupabaseClient;
  adminUserId: string;
};

type RequireOptions = {
  permission?: StaffPermission;
};

/**
 * Shared gate for `/api/admin/*` route handlers.
 * Returns 401 when unauthenticated, 403 when signed in but not staff or missing permission.
 * Never leaks server env or role internals in error bodies.
 */
export async function requireAdminApiSession(
  options: RequireOptions = {},
): Promise<
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

  if (options.permission) {
    const perm = await requireStaffPermission(g.supabase, g.adminUserId, options.permission);
    if (!perm.ok) {
      const status = perm.error === "Forbidden" ? 403 : 401;
      return {
        ok: false,
        response: NextResponse.json(
          { ok: false, error: status === 403 ? "Forbidden" : "Unauthorized" },
          { status },
        ),
      };
    }
  }

  return {
    ok: true,
    session: { supabase: g.supabase, adminUserId: g.adminUserId },
  };
}
