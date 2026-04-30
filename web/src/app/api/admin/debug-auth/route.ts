import { NextRequest, NextResponse } from "next/server";

import { requireAdminSupabaseForModeration } from "@/lib/admin/moderation-auth";
import { checkRateLimitDistributed } from "@/lib/server/rate-limit-distributed";
import { getClientIpFromHeaders } from "@/lib/server/rate-limit";

/**
 * Open in the browser while logged into /admin to verify cookies + staff reach the API layer.
 */
export async function GET(req: NextRequest) {
  const ip = getClientIpFromHeaders((n) => req.headers.get(n));
  const rl = await checkRateLimitDistributed(`api:debug-auth:${ip}`, 20, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: "Too many requests." }, { status: 429 });
  }

  const g = await requireAdminSupabaseForModeration();
  if (!g.ok) {
    return NextResponse.json(
      { ok: false, error: g.error },
      { status: 401 },
    );
  }
  return NextResponse.json({
    ok: true,
    staffUserId: g.adminUserId,
    hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  });
}
