import { NextRequest, NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toSafeDeliveryPayload } from "@/lib/sponsored-placement-delivery-shared";

const ALLOWED_SURFACES = new Set(["feed", "circles", "live", "my_pulse", "creator_hub", "web"]);
const ALLOWED_DEVICES = new Set(["mobile", "web", "all"]);

export async function GET(req: NextRequest) {
  const surface = req.nextUrl.searchParams.get("surface")?.trim() || "feed";
  const device = req.nextUrl.searchParams.get("device")?.trim() || "mobile";
  const slot = req.nextUrl.searchParams.get("slot")?.trim() || "in_feed_sponsored";

  if (!ALLOWED_SURFACES.has(surface) || !ALLOWED_DEVICES.has(device)) {
    return NextResponse.json({ ok: false, error: "Invalid surface or device." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("fetch_eligible_sponsored_placement", {
    p_surface: surface,
    p_device: device,
    p_slot_key: slot,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: "Unable to load placement." }, { status: 500 });
  }

  if (!data || typeof data !== "object") {
    return NextResponse.json({ ok: true, placement: null });
  }

  const payload = toSafeDeliveryPayload(data as Record<string, unknown>);
  return NextResponse.json({ ok: true, placement: payload });
}
