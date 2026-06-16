import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { writeAdminAudit } from "@/lib/admin/audit-log";
import { loadAdminCampaignById } from "@/lib/admin/campaign-editor";
import {
  bookingCountsAgainstCapacity,
  rangesOverlap,
  type BookingInput,
  type BookingStatus,
  type BookingValidation,
  type CapacityType,
  type InventoryFilters,
  type InventoryPlacementSummary,
  type PlacementBookingRow,
  type PlacementCatalogRow,
} from "@/lib/admin/placement-booking-shared";
import { createAdminDataSupabaseClient } from "@/lib/supabase/admin-data";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export {
  BOOKING_STATUSES,
  CAPACITY_TYPES,
  INVENTORY_BOOKING_DISCLAIMER,
  PLACEMENT_DEVICES,
  PLACEMENT_SURFACES,
  parseInventoryFilters,
  type BookingInput,
  type BookingStatus,
  type CapacityType,
  type InventoryFilters,
  type InventoryPlacementSummary,
  type PlacementBookingRow,
  type PlacementCatalogRow,
} from "@/lib/admin/placement-booking-shared";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type PlacementDb = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  surface: string;
  device: string;
  is_active: boolean;
  capacity_type: CapacityType;
  max_active_campaigns: number;
};

type BookingDb = {
  id: string;
  campaign_id: string;
  placement_id: string;
  start_at: string;
  end_at: string;
  status: BookingStatus;
  priority: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  ad_placements?: PlacementDb | PlacementDb[] | null;
};

function mapPlacement(row: PlacementDb): PlacementCatalogRow {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
    surface: row.surface,
    device: row.device,
    isActive: Boolean(row.is_active),
    capacityType: row.capacity_type,
    maxActiveCampaigns: Number(row.max_active_campaigns ?? 1),
  };
}

function placementFromJoin(raw: BookingDb): PlacementDb | null {
  const p = raw.ad_placements;
  if (!p) return null;
  return Array.isArray(p) ? p[0] ?? null : p;
}

async function loadCampaignNames(
  supabase: SupabaseClient,
  ids: string[],
): Promise<Map<string, string>> {
  const uniq = [...new Set(ids.filter(Boolean))];
  if (!uniq.length) return new Map();
  const { data } = await supabase
    .from("ad_campaigns")
    .select("id, title, metadata, advertiser_name")
    .in("id", uniq);
  const map = new Map<string, string>();
  for (const row of data ?? []) {
    const meta = (row.metadata ?? {}) as Record<string, unknown>;
    const name =
      (typeof meta.campaign_name === "string" && meta.campaign_name.trim()) ||
      String(row.title ?? row.advertiser_name ?? row.id).trim();
    map.set(row.id as string, name);
  }
  return map;
}

function parseWindow(input: { startAt: string; endAt: string }): { ok: true; start: string; end: string } | { ok: false; error: string } {
  const startMs = new Date(input.startAt).getTime();
  const endMs = new Date(input.endAt).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return { ok: false, error: "Start and end must be valid dates." };
  }
  if (endMs <= startMs) {
    return { ok: false, error: "End must be after start." };
  }
  return { ok: true, start: new Date(input.startAt).toISOString(), end: new Date(input.endAt).toISOString() };
}

export async function isPlacementBookingEnabled(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const supabase = await createAdminDataSupabaseClient();
    const { data } = await supabase
      .from("feature_flags")
      .select("enabled")
      .eq("key", "admin_placement_booking_enabled")
      .maybeSingle();
    if (data == null) return true;
    return Boolean(data.enabled);
  } catch {
    return true;
  }
}

export async function loadPlacementCatalog(activeOnly = false): Promise<PlacementCatalogRow[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createAdminDataSupabaseClient();
    let q = supabase.from("ad_placements").select("*").order("surface").order("name");
    if (activeOnly) q = q.eq("is_active", true);
    const { data, error } = await q;
    if (error || !data) return [];
    return (data as PlacementDb[]).map(mapPlacement);
  } catch {
    return [];
  }
}

export async function validatePlacementBooking(
  input: BookingInput,
  excludeBookingId?: string,
): Promise<BookingValidation> {
  if (!UUID_RE.test(input.campaignId) || !UUID_RE.test(input.placementId)) {
    return { ok: false, error: "Invalid campaign or placement id." };
  }
  const window = parseWindow({ startAt: input.startAt, endAt: input.endAt });
  if (!window.ok) return { ok: false, error: window.error };

  if (!bookingCountsAgainstCapacity(input.status)) {
    return { ok: true };
  }

  const supabase = await createAdminDataSupabaseClient();
  const { data: placementRow } = await supabase
    .from("ad_placements")
    .select("*")
    .eq("id", input.placementId)
    .maybeSingle();
  if (!placementRow) return { ok: false, error: "Placement not found." };
  const placement = mapPlacement(placementRow as PlacementDb);

  const { data: overlaps } = await supabase
    .from("campaign_placement_bookings")
    .select("id, campaign_id, start_at, end_at, status")
    .eq("placement_id", input.placementId)
    .in("status", ["reserved", "active", "paused"])
    .lt("start_at", window.end)
    .gt("end_at", window.start);

  const peers = (overlaps ?? []).filter((b) => b.id !== excludeBookingId);
  const startMs = new Date(window.start).getTime();
  const endMs = new Date(window.end).getTime();
  const overlapping = peers.filter((b) =>
    rangesOverlap(startMs, endMs, new Date(b.start_at as string).getTime(), new Date(b.end_at as string).getTime()),
  );

  if (placement.capacityType === "exclusive" && overlapping.length > 0) {
    if (!input.confirmExclusiveConflict) {
      return {
        ok: false,
        error: "Exclusive placement conflict — another reserved/active booking overlaps this window.",
        conflict: true,
      };
    }
    return {
      ok: true,
      warning: "Exclusive placement booked with overlapping window (staff confirmed).",
      conflict: true,
    };
  }

  if (overlapping.length >= placement.maxActiveCampaigns) {
    if (!input.confirmOverCapacity) {
      return {
        ok: false,
        error: `Capacity warning — ${overlapping.length} booking(s) already overlap (max ${placement.maxActiveCampaigns}). Confirm to proceed.`,
        overCapacity: true,
      };
    }
    return {
      ok: true,
      warning: `Over-capacity booking allowed (max ${placement.maxActiveCampaigns}).`,
      overCapacity: true,
    };
  }

  return { ok: true };
}

async function enrichBookings(
  supabase: SupabaseClient,
  rows: BookingDb[],
  placementMap: Map<string, PlacementCatalogRow>,
): Promise<PlacementBookingRow[]> {
  const campaignNames = await loadCampaignNames(
    supabase,
    rows.map((r) => r.campaign_id),
  );

  const countingByPlacement = new Map<string, BookingDb[]>();
  for (const row of rows) {
    if (!bookingCountsAgainstCapacity(row.status)) continue;
    const list = countingByPlacement.get(row.placement_id) ?? [];
    list.push(row);
    countingByPlacement.set(row.placement_id, list);
  }

  return rows.map((row) => {
    const placement =
      placementMap.get(row.placement_id) ??
      (placementFromJoin(row) ? mapPlacement(placementFromJoin(row)!) : null);
    const p = placement ?? {
      id: row.placement_id,
      key: "unknown",
      name: "Unknown",
      description: null,
      surface: "—",
      device: "all",
      isActive: false,
      capacityType: "shared" as CapacityType,
      maxActiveCampaigns: 1,
    };

    let conflict = false;
    let overCapacity = false;
    if (bookingCountsAgainstCapacity(row.status)) {
      const peers = (countingByPlacement.get(row.placement_id) ?? []).filter((b) => b.id !== row.id);
      const startMs = new Date(row.start_at).getTime();
      const endMs = new Date(row.end_at).getTime();
      const overlapping = peers.filter((b) =>
        rangesOverlap(
          startMs,
          endMs,
          new Date(b.start_at).getTime(),
          new Date(b.end_at).getTime(),
        ),
      );
      if (p.capacityType === "exclusive" && overlapping.length > 0) conflict = true;
      if (overlapping.length >= p.maxActiveCampaigns) overCapacity = true;
    }

    return {
      id: row.id,
      campaignId: row.campaign_id,
      campaignName: campaignNames.get(row.campaign_id) ?? row.campaign_id.slice(0, 8),
      placementId: row.placement_id,
      placementKey: p.key,
      placementName: p.name,
      surface: p.surface,
      capacityType: p.capacityType,
      maxActiveCampaigns: p.maxActiveCampaigns,
      startAt: row.start_at,
      endAt: row.end_at,
      status: row.status,
      priority: row.priority,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      conflict,
      overCapacity,
    };
  });
}

export async function loadAllBookings(filters: InventoryFilters): Promise<PlacementBookingRow[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createAdminDataSupabaseClient();
    const placements = await loadPlacementCatalog();
    const placementMap = new Map(placements.map((p) => [p.id, p]));

    let q = supabase
      .from("campaign_placement_bookings")
      .select("*, ad_placements(*)")
      .order("start_at", { ascending: true })
      .limit(500);

    if (filters.status !== "all") q = q.eq("status", filters.status);
    if (filters.from) {
      const t = new Date(filters.from).getTime();
      if (Number.isFinite(t)) q = q.gte("end_at", new Date(filters.from).toISOString());
    }
    if (filters.to) {
      const t = new Date(filters.to).getTime();
      if (Number.isFinite(t)) q = q.lte("start_at", new Date(filters.to).toISOString());
    }

    const { data, error } = await q;
    if (error || !data) return [];

    let rows = await enrichBookings(supabase, data as BookingDb[], placementMap);
    if (filters.surface) {
      const s = filters.surface.toLowerCase();
      rows = rows.filter((r) => r.surface.toLowerCase() === s);
    }
    if (filters.conflictOnly) {
      rows = rows.filter((r) => r.conflict || r.overCapacity);
    }
    return rows;
  } catch {
    return [];
  }
}

export async function loadInventoryPlacementSummaries(
  filters: InventoryFilters,
): Promise<InventoryPlacementSummary[]> {
  const placements = await loadPlacementCatalog(true);
  const bookings = await loadAllBookings(filters);
  const now = Date.now();

  return placements
    .filter((p) => !filters.surface || p.surface === filters.surface)
    .map((placement) => {
      const related = bookings.filter((b) => b.placementId === placement.id);
      const counting = related.filter((b) => bookingCountsAgainstCapacity(b.status));
      const reservedCount = counting.length;
      const availableSlots = Math.max(0, placement.maxActiveCampaigns - reservedCount);
      const future = counting
        .filter((b) => new Date(b.endAt).getTime() >= now)
        .sort((a, b) => a.startAt.localeCompare(b.startAt));
      const next = future[0] ?? null;
      const hasConflict = related.some((b) => b.conflict);
      const hasOverCapacity = related.some((b) => b.overCapacity);

      return {
        placement,
        reservedCount,
        availableSlots,
        nextBookedStart: next?.startAt ?? null,
        nextBookedEnd: next?.endAt ?? null,
        hasConflict,
        hasOverCapacity,
        activeBookings: related.slice(0, 8),
      };
    })
    .filter((s) => {
      if (filters.availableOnly && s.availableSlots <= 0) return false;
      if (filters.conflictOnly && !s.hasConflict && !s.hasOverCapacity) return false;
      return true;
    })
    .sort((a, b) => a.placement.surface.localeCompare(b.placement.surface) || a.placement.name.localeCompare(b.placement.name));
}

export async function loadBookingsForCampaign(campaignId: string): Promise<PlacementBookingRow[]> {
  if (!UUID_RE.test(campaignId)) return [];
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createAdminDataSupabaseClient();
    const placements = await loadPlacementCatalog();
    const placementMap = new Map(placements.map((p) => [p.id, p]));
    const { data } = await supabase
      .from("campaign_placement_bookings")
      .select("*, ad_placements(*)")
      .eq("campaign_id", campaignId)
      .order("start_at", { ascending: false });
    if (!data?.length) return [];
    return enrichBookings(supabase, data as BookingDb[], placementMap);
  } catch {
    return [];
  }
}

async function writeBookingAudit(
  supabase: SupabaseClient,
  args: {
    staffUserId: string;
    action: string;
    entityId: string;
    previous?: Record<string, unknown> | null;
    next?: Record<string, unknown> | null;
    staffNote?: string;
    extra?: Record<string, unknown>;
  },
) {
  await writeAdminAudit(supabase, {
    staffUserId: args.staffUserId,
    action: args.action,
    entityType: "campaign_placement_booking",
    entityId: args.entityId,
    metadata: {
      source_surface: "web",
      previous: args.previous ?? null,
      new: args.next ?? null,
      ...(args.staffNote ? { staff_note: args.staffNote } : {}),
      ...(args.extra ?? {}),
    },
  });
}

export async function createPlacementBooking(
  supabase: SupabaseClient,
  staffUserId: string,
  input: BookingInput,
): Promise<{ ok: true; id: string; warning?: string } | { ok: false; error: string }> {
  const campaign = await loadAdminCampaignById(input.campaignId);
  if (!campaign) return { ok: false, error: "Campaign not found." };

  const validation = await validatePlacementBooking(input);
  if (!validation.ok) return { ok: false, error: validation.error ?? "Validation failed." };

  const window = parseWindow({ startAt: input.startAt, endAt: input.endAt });
  if (!window.ok) return { ok: false, error: window.error };

  const { data, error } = await supabase
    .from("campaign_placement_bookings")
    .insert({
      campaign_id: input.campaignId,
      placement_id: input.placementId,
      start_at: window.start,
      end_at: window.end,
      status: input.status,
      priority: input.priority ?? 0,
      notes: input.notes?.trim() || null,
      created_by: staffUserId,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Create failed." };

  const id = data.id as string;
  await writeBookingAudit(supabase, {
    staffUserId,
    action: "campaign.booking.create",
    entityId: id,
    next: {
      campaign_id: input.campaignId,
      placement_id: input.placementId,
      start_at: window.start,
      end_at: window.end,
      status: input.status,
    },
    staffNote: input.notes ?? undefined,
    extra: validation.conflict || validation.overCapacity ? { warning: validation.warning } : undefined,
  });

  if (validation.overCapacity) {
    await writeAdminAudit(supabase, {
      staffUserId,
      action: "placement.capacity.warning",
      entityType: "campaign_placement_booking",
      entityId: id,
      metadata: {
        source_surface: "web",
        placement_id: input.placementId,
        max_active_campaigns: (await loadPlacementCatalog()).find((p) => p.id === input.placementId)?.maxActiveCampaigns,
        warning: validation.warning,
      },
    });
  }

  return { ok: true, id, warning: validation.warning };
}

export async function updatePlacementBooking(
  supabase: SupabaseClient,
  staffUserId: string,
  bookingId: string,
  input: BookingInput,
): Promise<{ ok: true; warning?: string } | { ok: false; error: string }> {
  if (!UUID_RE.test(bookingId)) return { ok: false, error: "Invalid booking id." };

  const validation = await validatePlacementBooking(input, bookingId);
  if (!validation.ok) return { ok: false, error: validation.error ?? "Validation failed." };

  const window = parseWindow({ startAt: input.startAt, endAt: input.endAt });
  if (!window.ok) return { ok: false, error: window.error };

  const supabaseAdmin = await createAdminDataSupabaseClient();
  const { data: existing } = await supabaseAdmin
    .from("campaign_placement_bookings")
    .select("*")
    .eq("id", bookingId)
    .maybeSingle();
  if (!existing) return { ok: false, error: "Booking not found." };

  const payload = {
    campaign_id: input.campaignId,
    placement_id: input.placementId,
    start_at: window.start,
    end_at: window.end,
    status: input.status,
    priority: input.priority ?? 0,
    notes: input.notes?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("campaign_placement_bookings").update(payload).eq("id", bookingId);
  if (error) return { ok: false, error: error.message };

  await writeBookingAudit(supabase, {
    staffUserId,
    action: "campaign.booking.update",
    entityId: bookingId,
    previous: existing as Record<string, unknown>,
    next: payload,
    staffNote: input.notes ?? undefined,
  });

  return { ok: true, warning: validation.warning };
}

export async function cancelPlacementBooking(
  supabase: SupabaseClient,
  staffUserId: string,
  bookingId: string,
  staffNote?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!UUID_RE.test(bookingId)) return { ok: false, error: "Invalid booking id." };

  const { data: existing } = await supabase
    .from("campaign_placement_bookings")
    .select("*")
    .eq("id", bookingId)
    .maybeSingle();
  if (!existing) return { ok: false, error: "Booking not found." };

  const { error } = await supabase
    .from("campaign_placement_bookings")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", bookingId);
  if (error) return { ok: false, error: error.message };

  await writeBookingAudit(supabase, {
    staffUserId,
    action: "campaign.booking.cancel",
    entityId: bookingId,
    previous: { status: existing.status },
    next: { status: "cancelled" },
    staffNote,
  });

  return { ok: true };
}

export async function createPlacementCatalogEntry(
  supabase: SupabaseClient,
  staffUserId: string,
  input: {
    key: string;
    name: string;
    description?: string;
    surface: string;
    device: string;
    capacityType: CapacityType;
    maxActiveCampaigns: number;
  },
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const key = input.key.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_");
  if (!key) return { ok: false, error: "Placement key is required." };
  if (!input.name.trim()) return { ok: false, error: "Placement name is required." };

  const { data, error } = await supabase
    .from("ad_placements")
    .insert({
      key,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      surface: input.surface.trim(),
      device: input.device,
      capacity_type: input.capacityType,
      max_active_campaigns: Math.max(1, input.maxActiveCampaigns),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Create failed." };

  await writeAdminAudit(supabase, {
    staffUserId,
    action: "placement.create",
    entityType: "ad_placement",
    entityId: data.id as string,
    metadata: { source_surface: "web", key, name: input.name.trim() },
  });

  return { ok: true, id: data.id as string };
}
