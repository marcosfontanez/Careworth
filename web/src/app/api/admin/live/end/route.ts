import { NextRequest, NextResponse } from "next/server";

import { adminEndLiveStream } from "@/lib/admin/moderation-mutations";
import { checkRateLimitDistributed } from "@/lib/server/rate-limit-distributed";
import { getClientIpFromHeaders } from "@/lib/server/rate-limit";

export async function POST(req: NextRequest) {
  const ip = getClientIpFromHeaders((n) => req.headers.get(n));
  const rl = await checkRateLimitDistributed(`api:live-end:${ip}`, 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: "Too many requests." }, { status: 429 });
  }

  let body: { streamId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const streamId = typeof body.streamId === "string" ? body.streamId.trim() : "";
  if (!streamId) {
    return NextResponse.json({ ok: false, error: "streamId required" }, { status: 400 });
  }
  const result = await adminEndLiveStream(streamId);
  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
