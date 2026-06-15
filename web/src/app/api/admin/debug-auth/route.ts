import { NextRequest, NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin/require-admin-api-session";
import { checkRateLimitDistributed } from "@/lib/server/rate-limit-distributed";
import { getClientIpFromHeaders } from "@/lib/server/rate-limit";

/** Staff-only session probe — production-safe (no env/token diagnostics). */
export async function GET(req: NextRequest) {
  const ip = getClientIpFromHeaders((n) => req.headers.get(n));
  const rl = await checkRateLimitDistributed(`api:debug-auth:${ip}`, 20, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: "Too many requests." }, { status: 429 });
  }

  const auth = await requireAdminApiSession();
  if (!auth.ok) return auth.response;

  return NextResponse.json({ ok: true });
}
