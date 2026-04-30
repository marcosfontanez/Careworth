import { NextRequest, NextResponse } from "next/server";

import { hashPartnerApiKey } from "@/lib/admin/partner-api-key";
import { isPartnerApiFeatureEnabled } from "@/lib/admin/platform-queries";
import { checkRateLimitDistributed } from "@/lib/server/rate-limit-distributed";
import { getClientIpFromHeaders } from "@/lib/server/rate-limit";
import { createAdminDataSupabaseClient } from "@/lib/supabase/admin-data";

/**
 * Partner health check — requires Bearer token matching an active hashed key.
 * Enable via admin → Platform → feature flag `partner_api`.
 */
export async function GET(req: NextRequest) {
  const ip = getClientIpFromHeaders((n) => req.headers.get(n));
  const rl = await checkRateLimitDistributed(`partner:health:${ip}`, 120, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: "Too many requests." }, { status: 429 });
  }

  const auth = req.headers.get("authorization");
  const raw = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!raw) {
    return NextResponse.json({ ok: false, error: "Missing Bearer token." }, { status: 401 });
  }

  const enabled = await isPartnerApiFeatureEnabled();
  if (!enabled) {
    return NextResponse.json(
      {
        ok: false,
        error: "Partner API disabled. Enable the `partner_api` feature flag in /admin/platform.",
      },
      { status: 403 },
    );
  }

  const keyHash = hashPartnerApiKey(raw);
  const supabase = await createAdminDataSupabaseClient();
  const { data: row, error } = await supabase
    .from("partner_api_keys")
    .select("id, label, scopes")
    .eq("key_hash", keyHash)
    .is("revoked_at", null)
    .maybeSingle();

  if (error || !row) {
    return NextResponse.json({ ok: false, error: "Invalid or revoked API key." }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    label: row.label as string,
    scopes: row.scopes as string[],
    service: "pulseverse-partner",
    ts: new Date().toISOString(),
  });
}
