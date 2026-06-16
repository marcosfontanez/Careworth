import { NextRequest, NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin/require-admin-api-session";
import {
  cancelPlacementBooking,
  createPlacementBooking,
  createPlacementCatalogEntry,
  isPlacementBookingEnabled,
  loadAllBookings,
  loadBookingsForCampaign,
  loadInventoryPlacementSummaries,
  loadPlacementCatalog,
  parseInventoryFilters,
  updatePlacementBooking,
  type BookingInput,
  type CapacityType,
} from "@/lib/admin/placement-booking";
import { getClientIpFromHeaders } from "@/lib/server/rate-limit";
import { checkRateLimitDistributed } from "@/lib/server/rate-limit-distributed";

type MutationBody = {
  action?: string;
  id?: string;
  staffNote?: string;
  booking?: Partial<BookingInput>;
  placement?: {
    key?: string;
    name?: string;
    description?: string;
    surface?: string;
    device?: string;
    capacityType?: CapacityType;
    maxActiveCampaigns?: number;
  };
  confirmOverCapacity?: boolean;
  confirmExclusiveConflict?: boolean;
};

function disabledResponse() {
  return NextResponse.json(
    { ok: false, error: "Placement booking is disabled. Enable admin_placement_booking_enabled on Platform." },
    { status: 403 },
  );
}

export async function GET(req: NextRequest) {
  const auth = await requireAdminApiSession({ permission: "inventory.write" });
  if (!auth.ok) return auth.response;

  const sp = req.nextUrl.searchParams;
  const campaignId = sp.get("campaignId")?.trim();

  if (campaignId) {
    const bookings = await loadBookingsForCampaign(campaignId);
    return NextResponse.json({ ok: true, bookings });
  }

  const filters = parseInventoryFilters({
    surface: sp.get("surface") ?? undefined,
    status: sp.get("status") ?? undefined,
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
    available: sp.get("available") ?? undefined,
    conflict: sp.get("conflict") ?? undefined,
  });

  const [summaries, bookings, placements, enabled] = await Promise.all([
    loadInventoryPlacementSummaries(filters),
    loadAllBookings(filters),
    loadPlacementCatalog(true),
    isPlacementBookingEnabled(),
  ]);

  return NextResponse.json({ ok: true, summaries, bookings, placements, filters, bookingEnabled: enabled });
}

export async function POST(req: NextRequest) {
  const ip = getClientIpFromHeaders((n) => req.headers.get(n));
  const rl = await checkRateLimitDistributed(`api:admin-placements:${ip}`, 40, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  const auth = await requireAdminApiSession({ permission: "inventory.write" });
  if (!auth.ok) return auth.response;

  const enabled = await isPlacementBookingEnabled();
  if (!enabled) return disabledResponse();

  let body: MutationBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const action = typeof body.action === "string" ? body.action.trim() : "";

  if (action === "create_placement") {
    const p = body.placement;
    if (!p) return NextResponse.json({ ok: false, error: "placement payload required" }, { status: 400 });
    const result = await createPlacementCatalogEntry(auth.session.supabase, auth.session.adminUserId, {
      key: String(p.key ?? ""),
      name: String(p.name ?? ""),
      description: p.description,
      surface: String(p.surface ?? "feed"),
      device: String(p.device ?? "all"),
      capacityType: (p.capacityType ?? "shared") as CapacityType,
      maxActiveCampaigns: Number(p.maxActiveCampaigns ?? 1),
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 422 });
  }

  const booking = body.booking;
  if (action === "create_booking") {
    if (!booking?.campaignId || !booking?.placementId) {
      return NextResponse.json({ ok: false, error: "booking.campaignId and placementId required" }, { status: 400 });
    }
    const input: BookingInput = {
      campaignId: String(booking.campaignId),
      placementId: String(booking.placementId),
      startAt: String(booking.startAt ?? ""),
      endAt: String(booking.endAt ?? ""),
      status: (booking.status ?? "draft") as BookingInput["status"],
      priority: booking.priority,
      notes: booking.notes,
      confirmOverCapacity: Boolean(body.confirmOverCapacity),
      confirmExclusiveConflict: Boolean(body.confirmExclusiveConflict),
    };
    const result = await createPlacementBooking(auth.session.supabase, auth.session.adminUserId, input);
    const status = result.ok ? 200 : result.error?.includes("Confirm") ? 409 : 422;
    return NextResponse.json(result, { status });
  }

  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });

  if (action === "update_booking") {
    if (!booking?.campaignId || !booking?.placementId) {
      return NextResponse.json({ ok: false, error: "booking payload required" }, { status: 400 });
    }
    const input: BookingInput = {
      campaignId: String(booking.campaignId),
      placementId: String(booking.placementId),
      startAt: String(booking.startAt ?? ""),
      endAt: String(booking.endAt ?? ""),
      status: (booking.status ?? "draft") as BookingInput["status"],
      priority: booking.priority,
      notes: booking.notes,
      confirmOverCapacity: Boolean(body.confirmOverCapacity),
      confirmExclusiveConflict: Boolean(body.confirmExclusiveConflict),
    };
    const result = await updatePlacementBooking(auth.session.supabase, auth.session.adminUserId, id, input);
    const status = result.ok ? 200 : "error" in result && result.error?.includes("Confirm") ? 409 : 422;
    return NextResponse.json(result, { status });
  }

  if (action === "cancel_booking") {
    const result = await cancelPlacementBooking(
      auth.session.supabase,
      auth.session.adminUserId,
      id,
      body.staffNote,
    );
    return NextResponse.json(result, { status: result.ok ? 200 : 422 });
  }

  return NextResponse.json({ ok: false, error: "Unknown or missing action" }, { status: 400 });
}
