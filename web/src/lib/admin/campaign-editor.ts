import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { writeAdminAudit } from "@/lib/admin/audit-log";
import { loadBookingsForCampaign } from "@/lib/admin/placement-booking";
import { isSponsoredPlacementDeliveryEnabled } from "@/lib/admin/sponsored-placement-delivery";
import {
  evaluateSponsoredDelivery,
  validateCampaignCreative,
} from "@/lib/sponsored-placement-delivery-shared";
import {
  CAMPAIGN_PLANNING_CTA_URL,
  CAMPAIGN_PLANNING_MEDIA_URL,
  CAMPAIGN_STATUSES,
  SUGGESTED_PLACEMENTS,
  type AdminCampaignDetail,
  type AdminCampaignListRow,
  type CampaignAuditRow,
  type CampaignEditorFilters,
  type CampaignInput,
  type CampaignLeadPrefill,
  type CampaignOwnerOption,
  type CampaignSort,
  type CampaignStatus,
} from "@/lib/admin/campaign-editor-shared";
import { createAdminDataSupabaseClient } from "@/lib/supabase/admin-data";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export {
  CAMPAIGN_PLANNING_CTA_URL,
  CAMPAIGN_PLANNING_MEDIA_URL,
  CAMPAIGN_SORTS,
  CAMPAIGN_STATUSES,
  INVENTORY_PLANNING_DISCLAIMER,
  SUGGESTED_PLACEMENTS,
  parseCampaignEditorFilters,
  toCampaignCsvRows,
  type AdminCampaignDetail,
  type AdminCampaignListRow,
  type CampaignAuditRow,
  type CampaignEditorFilters,
  type CampaignInput,
  type CampaignLeadPrefill,
  type CampaignOwnerOption,
  type CampaignSort,
  type CampaignStatus,
} from "@/lib/admin/campaign-editor-shared";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type DbRow = {
  id: string;
  advertiser_name: string;
  advertiser_logo: string | null;
  title: string;
  description: string;
  media_url: string;
  cta_label: string;
  cta_url: string;
  target_roles: string[] | null;
  target_specialties: string[] | null;
  target_states: string[] | null;
  budget_total: number;
  budget_spent: number;
  cpm_rate: number;
  start_date: string;
  end_date: string;
  status: string;
  impressions: number;
  clicks: number;
  objective: string | null;
  internal_notes: string | null;
  metadata: Record<string, unknown> | null;
  lead_id: string | null;
  owner_id: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const SELECT_COLUMNS =
  "id, advertiser_name, advertiser_logo, title, description, media_url, cta_label, cta_url, target_roles, target_specialties, target_states, budget_total, budget_spent, cpm_rate, start_date, end_date, status, impressions, clicks, objective, internal_notes, metadata, lead_id, owner_id, created_by, created_at, updated_at";

function computePacingNote(args: {
  start_date: string;
  end_date: string;
  budget_total: unknown;
  budget_spent: unknown;
}): string | null {
  const budgetTotal = Number(args.budget_total ?? 0);
  if (!Number.isFinite(budgetTotal) || budgetTotal <= 0) return null;
  const startMs = new Date(args.start_date).getTime();
  const endMs = new Date(args.end_date).getTime();
  const now = Date.now();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return null;
  const flight = endMs - startMs;
  const elapsed = Math.min(Math.max(now - startMs, 0), flight);
  const expectedPct = flight > 0 ? elapsed / flight : 0;
  const spentPct = Math.min(Math.max(Number(args.budget_spent ?? 0) / budgetTotal, 0), 1);
  const deltaPts = (spentPct - expectedPct) * 100;
  return `Spend ${(spentPct * 100).toFixed(1)}% vs linear expectation ${(expectedPct * 100).toFixed(1)}% (${deltaPts >= 0 ? "+" : ""}${deltaPts.toFixed(1)} pts)`;
}

function campaignNameFromRow(row: DbRow): string {
  const meta = (row.metadata ?? {}) as Record<string, unknown>;
  const fromMeta = typeof meta.campaign_name === "string" ? meta.campaign_name.trim() : "";
  if (fromMeta) return fromMeta;
  return row.title?.trim() || "Untitled campaign";
}

function metaString(meta: Record<string, unknown>, key: string): string | null {
  const v = meta[key];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export async function isCampaignEditorEnabled(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const supabase = await createAdminDataSupabaseClient();
    const { data, error } = await supabase
      .from("feature_flags")
      .select("enabled")
      .eq("key", "admin_campaign_editor_enabled")
      .maybeSingle();
    if (error || data == null) return true;
    return Boolean(data.enabled);
  } catch {
    return true;
  }
}

export async function loadCampaignOwnerOptions(): Promise<CampaignOwnerOption[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createAdminDataSupabaseClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, username")
      .eq("role_admin", true)
      .order("display_name", { ascending: true })
      .limit(120);
    if (error || !data?.length) return [];
    return data.map((p) => {
      const id = p.id as string;
      const dn = String(p.display_name ?? "").trim();
      const un = String(p.username ?? "").trim();
      const label = dn ? (un ? `${dn} (@${un})` : dn) : un ? `@${un}` : id.slice(0, 8);
      return { id, label };
    });
  } catch {
    return [];
  }
}

export async function loadKnownPlacements(): Promise<string[]> {
  if (!isSupabaseConfigured()) return [...SUGGESTED_PLACEMENTS];
  try {
    const supabase = await createAdminDataSupabaseClient();
    const { data } = await supabase.from("ad_campaigns").select("title").limit(400);
    const set = new Set<string>(SUGGESTED_PLACEMENTS);
    for (const row of data ?? []) {
      const t = String((row as { title: string }).title ?? "").trim();
      if (t) set.add(t);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  } catch {
    return [...SUGGESTED_PLACEMENTS];
  }
}

async function loadOwnerNames(supabase: SupabaseClient, ids: string[]): Promise<Map<string, string>> {
  const uniq = [...new Set(ids.filter(Boolean))];
  if (!uniq.length) return new Map();
  const { data } = await supabase.from("profiles").select("id, display_name, username").in("id", uniq);
  return new Map(
    (data ?? []).map((p) => [
      p.id as string,
      String(p.display_name ?? p.username ?? "").trim() || (p.id as string).slice(0, 8),
    ]),
  );
}

function mapListRow(row: DbRow, ownerName?: string | null): AdminCampaignListRow {
  const impressions = Number(row.impressions ?? 0);
  const clicks = Number(row.clicks ?? 0);
  const ctr = impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0;
  return {
    id: row.id,
    campaignName: campaignNameFromRow(row),
    sponsor: row.advertiser_name,
    placement: row.title || "In-feed",
    start: row.start_date?.slice(0, 10) ?? "—",
    end: row.end_date?.slice(0, 10) ?? "—",
    impressions,
    clicks,
    ctr,
    status: String(row.status ?? "draft"),
    budgetTotal: Number(row.budget_total ?? 0),
    budgetSpent: Number(row.budget_spent ?? 0),
    pacingNote: computePacingNote(row),
    ownerId: row.owner_id,
    ownerDisplayName: ownerName ?? null,
    leadId: row.lead_id,
    objective: row.objective,
    updatedAt: row.updated_at,
  };
}

function mapDetailRow(
  row: DbRow,
  ownerName?: string | null,
  lead?: { name: string; email: string } | null,
): AdminCampaignDetail {
  const meta = (row.metadata ?? {}) as Record<string, unknown>;
  return {
    ...mapListRow(row, ownerName),
    description: row.description ?? "",
    mediaUrl: row.media_url,
    ctaLabel: row.cta_label,
    ctaUrl: row.cta_url,
    targetRoles: row.target_roles ?? [],
    targetSpecialties: row.target_specialties ?? [],
    targetStates: row.target_states ?? [],
    cpmRate: Number(row.cpm_rate ?? 15),
    internalNotes: row.internal_notes,
    metadata: meta,
    createdBy: row.created_by,
    createdAt: row.created_at,
    leadName: lead?.name ?? null,
    leadEmail: lead?.email ?? null,
    targetAudienceNotes: metaString(meta, "target_audience_notes"),
    creativeNotes: metaString(meta, "creative_notes"),
  };
}

function applyFilters(rows: AdminCampaignListRow[], filters: CampaignEditorFilters): AdminCampaignListRow[] {
  let out = rows;
  if (filters.status !== "all") out = out.filter((r) => r.status === filters.status);
  if (filters.placement) {
    const p = filters.placement.toLowerCase();
    out = out.filter((r) => r.placement.toLowerCase().includes(p));
  }
  if (filters.ownerId) out = out.filter((r) => r.ownerId === filters.ownerId);
  if (filters.from) {
    const fromMs = new Date(filters.from).getTime();
    if (Number.isFinite(fromMs)) out = out.filter((r) => new Date(r.start).getTime() >= fromMs);
  }
  if (filters.to) {
    const toMs = new Date(filters.to).getTime();
    if (Number.isFinite(toMs)) out = out.filter((r) => new Date(r.end).getTime() <= toMs);
  }
  if (filters.q) {
    const q = filters.q.toLowerCase();
    out = out.filter(
      (r) =>
        r.campaignName.toLowerCase().includes(q) ||
        r.sponsor.toLowerCase().includes(q) ||
        r.placement.toLowerCase().includes(q) ||
        (r.objective ?? "").toLowerCase().includes(q),
    );
  }
  out = [...out];
  switch (filters.sort) {
    case "start_date":
      out.sort((a, b) => b.start.localeCompare(a.start));
      break;
    case "end_date":
      out.sort((a, b) => b.end.localeCompare(a.end));
      break;
    case "status":
      out.sort((a, b) => a.status.localeCompare(b.status) || b.start.localeCompare(a.start));
      break;
    case "advertiser":
      out.sort((a, b) => a.sponsor.localeCompare(b.sponsor));
      break;
    default:
      out.sort((a, b) => (b.updatedAt ?? b.start).localeCompare(a.updatedAt ?? a.start));
  }
  return out;
}

export async function loadAdminCampaigns(filters: CampaignEditorFilters): Promise<{
  campaigns: AdminCampaignListRow[];
  total: number;
}> {
  if (!isSupabaseConfigured()) return { campaigns: [], total: 0 };
  try {
    const supabase = await createAdminDataSupabaseClient();
    const { data, error } = await supabase
      .from("ad_campaigns")
      .select(SELECT_COLUMNS)
      .order("updated_at", { ascending: false })
      .limit(500);
    if (error || !data) {
      if (error) console.error("loadAdminCampaigns:", error.message);
      return { campaigns: [], total: 0 };
    }
    const ownerIds = (data as DbRow[]).map((r) => r.owner_id).filter(Boolean) as string[];
    const owners = await loadOwnerNames(supabase, ownerIds);
    const mapped = (data as DbRow[]).map((r) => mapListRow(r, r.owner_id ? owners.get(r.owner_id) : null));
    const filtered = applyFilters(mapped, filters);
    return { campaigns: filtered, total: filtered.length };
  } catch (e) {
    console.error("loadAdminCampaigns:", e);
    return { campaigns: [], total: 0 };
  }
}

export async function loadAdminCampaignById(id: string): Promise<AdminCampaignDetail | null> {
  if (!isSupabaseConfigured() || !UUID_RE.test(id)) return null;
  try {
    const supabase = await createAdminDataSupabaseClient();
    const { data, error } = await supabase.from("ad_campaigns").select(SELECT_COLUMNS).eq("id", id).maybeSingle();
    if (error || !data) return null;
    const row = data as DbRow;
    let lead: { name: string; email: string } | null = null;
    if (row.lead_id) {
      const { data: leadRow } = await supabase
        .from("marketing_contact_messages")
        .select("name, email")
        .eq("id", row.lead_id)
        .maybeSingle();
      if (leadRow) lead = { name: String(leadRow.name), email: String(leadRow.email) };
    }
    const owners = await loadOwnerNames(supabase, row.owner_id ? [row.owner_id] : []);
    return mapDetailRow(row, row.owner_id ? owners.get(row.owner_id) : null, lead);
  } catch (e) {
    console.error("loadAdminCampaignById:", e);
    return null;
  }
}

export async function loadCampaignAudit(id: string): Promise<CampaignAuditRow[]> {
  if (!isSupabaseConfigured() || !UUID_RE.test(id)) return [];
  try {
    const supabase = await createAdminDataSupabaseClient();
    const { data: rows } = await supabase
      .from("admin_audit_log")
      .select("id, created_at, action, metadata, staff_user_id")
      .eq("entity_type", "campaign")
      .eq("entity_id", id)
      .order("created_at", { ascending: false })
      .limit(40);
    if (!rows?.length) return [];
    const staffIds = [...new Set(rows.map((r) => r.staff_user_id as string))];
    const names = await loadOwnerNames(supabase, staffIds);
    return rows.map((r) => ({
      id: r.id as string,
      createdAt: r.created_at as string,
      action: String(r.action),
      staffDisplayName: names.get(r.staff_user_id as string) ?? (r.staff_user_id as string).slice(0, 8),
      metadata: (r.metadata as Record<string, unknown>) ?? {},
    }));
  } catch {
    return [];
  }
}

export async function loadCampaignLinksByLead(): Promise<Map<string, { id: string; campaignName: string }[]>> {
  const map = new Map<string, { id: string; campaignName: string }[]>();
  if (!isSupabaseConfigured()) return map;
  try {
    const supabase = await createAdminDataSupabaseClient();
    const { data } = await supabase
      .from("ad_campaigns")
      .select("id, lead_id, title, metadata, advertiser_name")
      .not("lead_id", "is", null)
      .limit(300);
    for (const row of (data ?? []) as DbRow[]) {
      const leadId = row.lead_id;
      if (!leadId) continue;
      const entry = { id: row.id, campaignName: campaignNameFromRow(row) };
      const cur = map.get(leadId) ?? [];
      cur.push(entry);
      map.set(leadId, cur);
    }
  } catch {
    /* migration may not be applied yet */
  }
  return map;
}

export async function loadLeadPrefill(leadId: string): Promise<CampaignLeadPrefill | null> {
  if (!isSupabaseConfigured() || !UUID_RE.test(leadId)) return null;
  try {
    const supabase = await createAdminDataSupabaseClient();
    const { data } = await supabase
      .from("marketing_contact_messages")
      .select("id, name, email, message, host, internal_notes")
      .eq("id", leadId)
      .maybeSingle();
    if (!data) return null;
    const message = String(data.message ?? "");
    const topicMatch = message.match(/^\[Inquiry:\s*([^\]]+)\]/i);
    return {
      leadId: data.id as string,
      advertiserName: String(data.name ?? "").trim() || "Inbound lead",
      contactName: String(data.name ?? ""),
      contactEmail: String(data.email ?? ""),
      sourceHost: data.host ? String(data.host) : null,
      internalNotes: data.internal_notes ? String(data.internal_notes) : null,
      topic: topicMatch?.[1]?.trim() ?? null,
    };
  } catch {
    return null;
  }
}

function parseDateOnly(value: string): string | null {
  const v = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  return new Date(`${v}T12:00:00.000Z`).toISOString();
}

export function validateCampaignInput(input: CampaignInput, previousStatus?: CampaignStatus): {
  ok: true;
  payload: Record<string, unknown>;
} | { ok: false; error: string } {
  const campaignName = input.campaignName.trim();
  const advertiserName = input.advertiserName.trim();
  const placement = input.placement.trim();
  const objective = input.objective.trim();
  if (!campaignName) return { ok: false, error: "Campaign name is required." };
  if (!advertiserName) return { ok: false, error: "Advertiser / brand name is required." };
  if (!placement) return { ok: false, error: "Placement is required." };
  if (!objective) return { ok: false, error: "Objective is required." };
  if (!CAMPAIGN_STATUSES.includes(input.status)) return { ok: false, error: "Invalid status." };

  const startIso = parseDateOnly(input.startDate);
  const endIso = parseDateOnly(input.endDate);
  if (!startIso || !endIso) return { ok: false, error: "Start and end dates must be YYYY-MM-DD." };
  if (new Date(endIso).getTime() < new Date(startIso).getTime()) {
    return { ok: false, error: "End date must be on or after start date." };
  }

  const locked = previousStatus === "completed" || previousStatus === "cancelled";
  if (locked && !input.confirmLockedEdit) {
    return { ok: false, error: "Completed or cancelled campaigns require confirmation to edit." };
  }

  if (input.status === "active") {
    if (!campaignName || !advertiserName || !placement || !objective) {
      return { ok: false, error: "Complete required fields before activating." };
    }
  }

  const ownerId = input.ownerId?.trim();
  if (ownerId && !UUID_RE.test(ownerId)) return { ok: false, error: "Invalid owner." };
  const leadId = input.leadId?.trim();
  if (leadId && !UUID_RE.test(leadId)) return { ok: false, error: "Invalid lead link." };

  const budget = Number(input.budgetTotal ?? 0);
  const metadata: Record<string, unknown> = {
    campaign_name: campaignName,
    planning_record: true,
  };
  if (input.targetAudienceNotes?.trim()) metadata.target_audience_notes = input.targetAudienceNotes.trim();
  if (input.creativeNotes?.trim()) metadata.creative_notes = input.creativeNotes.trim();
  if (leadId) {
    metadata.lead_contact = {
      linked_at: new Date().toISOString(),
    };
  }

  return {
    ok: true,
    payload: {
      advertiser_name: advertiserName,
      title: placement,
      description: input.description?.trim() ?? "",
      media_url: input.mediaUrl?.trim() || CAMPAIGN_PLANNING_MEDIA_URL,
      cta_label: input.ctaLabel?.trim() || "Learn More",
      cta_url: input.ctaUrl?.trim() || CAMPAIGN_PLANNING_CTA_URL,
      budget_total: Number.isFinite(budget) && budget >= 0 ? budget : 0,
      start_date: startIso,
      end_date: endIso,
      status: input.status,
      objective: objective,
      internal_notes: input.internalNotes?.trim() || null,
      owner_id: ownerId || null,
      lead_id: leadId || null,
      metadata,
      updated_at: new Date().toISOString(),
    },
  };
}

const STATUS_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  draft: ["active", "cancelled"],
  active: ["paused", "completed", "cancelled"],
  paused: ["active", "completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function canTransitionStatus(from: CampaignStatus, to: CampaignStatus): boolean {
  if (from === to) return true;
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

async function writeCampaignAudit(
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
    entityType: "campaign",
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

function snapshotCampaign(row: AdminCampaignDetail | DbRow): Record<string, unknown> {
  return {
    status: "status" in row ? row.status : null,
    advertiser_name: "advertiser_name" in row ? row.advertiser_name : row.sponsor,
    title: "title" in row ? row.title : row.placement,
    start_date: "start_date" in row ? row.start_date : row.start,
    end_date: "end_date" in row ? row.end_date : row.end,
    objective: "objective" in row ? row.objective : null,
    lead_id: "lead_id" in row ? row.lead_id : row.leadId,
    owner_id: "owner_id" in row ? row.owner_id : row.ownerId,
  };
}

export async function createAdminCampaign(
  supabase: SupabaseClient,
  staffUserId: string,
  input: CampaignInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const validated = validateCampaignInput({ ...input, status: input.status || "draft" });
  if (!validated.ok) return validated;

  const insert = {
    ...validated.payload,
    status: "draft",
    created_by: staffUserId,
  };

  const { data, error } = await supabase.from("ad_campaigns").insert(insert).select("id").single();
  if (error || !data) return { ok: false, error: error?.message ?? "Create failed." };

  const id = data.id as string;
  await writeCampaignAudit(supabase, {
    staffUserId,
    action: "campaign.create",
    entityId: id,
    next: validated.payload,
    staffNote: input.internalNotes ?? undefined,
    extra: input.leadId ? { lead_id: input.leadId } : undefined,
  });

  if (input.leadId) {
    await writeCampaignAudit(supabase, {
      staffUserId,
      action: "campaign.link_lead",
      entityId: id,
      extra: { lead_id: input.leadId, source: "create" },
    });
  }

  return { ok: true, id };
}

export async function updateAdminCampaign(
  supabase: SupabaseClient,
  staffUserId: string,
  id: string,
  input: CampaignInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!UUID_RE.test(id)) return { ok: false, error: "Invalid campaign id." };
  const existing = await loadAdminCampaignById(id);
  if (!existing) return { ok: false, error: "Campaign not found." };

  const prevStatus = existing.status as CampaignStatus;
  if (!canTransitionStatus(prevStatus, input.status) && prevStatus !== input.status) {
    return { ok: false, error: `Cannot change status from ${prevStatus} to ${input.status}.` };
  }

  const validated = validateCampaignInput(input, prevStatus);
  if (!validated.ok) return validated;

  const previous = snapshotCampaign(existing);
  const { error } = await supabase.from("ad_campaigns").update(validated.payload).eq("id", id);
  if (error) return { ok: false, error: error.message };

  await writeCampaignAudit(supabase, {
    staffUserId,
    action: "campaign.update",
    entityId: id,
    previous,
    next: validated.payload,
    staffNote: input.internalNotes ?? undefined,
  });

  return { ok: true };
}

export async function setAdminCampaignStatus(
  supabase: SupabaseClient,
  staffUserId: string,
  id: string,
  status: CampaignStatus,
  staffNote?: string,
  options?: { confirmDeliveryActivation?: boolean },
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!UUID_RE.test(id)) return { ok: false, error: "Invalid campaign id." };
  const existing = await loadAdminCampaignById(id);
  if (!existing) return { ok: false, error: "Campaign not found." };
  const from = existing.status as CampaignStatus;
  if (!canTransitionStatus(from, status)) {
    return { ok: false, error: `Cannot change status from ${from} to ${status}.` };
  }

  if (status === "active") {
    const creative = validateCampaignCreative({
      advertiserName: existing.sponsor,
      description: existing.description,
      mediaUrl: existing.mediaUrl,
      ctaLabel: existing.ctaLabel,
      ctaUrl: existing.ctaUrl,
    });
    if (!creative.ok) {
      return { ok: false, error: creative.reason };
    }
    if (
      existing.mediaUrl.trim() === CAMPAIGN_PLANNING_MEDIA_URL ||
      existing.ctaUrl.trim() === CAMPAIGN_PLANNING_CTA_URL
    ) {
      return {
        ok: false,
        error: "Replace planning placeholder creative before activating for delivery.",
      };
    }

    const deliveryEnabled = await isSponsoredPlacementDeliveryEnabled();
    if (deliveryEnabled) {
      const bookings = await loadBookingsForCampaign(id);
      const primaryBooking =
        bookings.find((b) => b.placementKey === "in_feed_sponsored") ?? bookings[0] ?? null;
      const wouldDeliver = primaryBooking
        ? evaluateSponsoredDelivery({
            flags: { sponsoredPostsEnabled: true, mobilePlacementDeliveryEnabled: true, platformDeliveryEnabled: true },
            campaign: {
              status: "active",
              startDate: existing.start,
              endDate: existing.end,
              advertiserName: existing.sponsor,
              description: existing.description,
              mediaUrl: existing.mediaUrl,
              ctaLabel: existing.ctaLabel,
              ctaUrl: existing.ctaUrl,
              budgetSpent: existing.budgetSpent,
              budgetTotal: existing.budgetTotal,
            },
            booking: { status: primaryBooking.status, startAt: primaryBooking.startAt, endAt: primaryBooking.endAt },
            placement: {
              key: primaryBooking.placementKey,
              isActive: primaryBooking.placementIsActive,
              surface: primaryBooking.surface,
              device: primaryBooking.placementDevice,
            },
          }).eligible
        : false;

      if (wouldDeliver && !options?.confirmDeliveryActivation) {
        return {
          ok: false,
          error:
            "Delivery flags are on and this campaign has an eligible booking. Confirm activation — turning on sponsored delivery can make eligible booked campaigns visible to users.",
        };
      }
    }
  }

  const { error } = await supabase
    .from("ad_campaigns")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  const action =
    status === "paused"
      ? "campaign.pause"
      : status === "active" && from === "paused"
        ? "campaign.resume"
        : status === "completed"
          ? "campaign.complete"
          : status === "cancelled"
            ? "campaign.cancel"
            : "campaign.status_change";

  await writeCampaignAudit(supabase, {
    staffUserId,
    action,
    entityId: id,
    previous: { status: from },
    next: { status },
    staffNote,
  });

  return { ok: true };
}

export async function duplicateAdminCampaign(
  supabase: SupabaseClient,
  staffUserId: string,
  id: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (!UUID_RE.test(id)) return { ok: false, error: "Invalid campaign id." };
  const existing = await loadAdminCampaignById(id);
  if (!existing) return { ok: false, error: "Campaign not found." };

  const meta = { ...existing.metadata, campaign_name: `${existing.campaignName} (copy)`, duplicated_from: id };
  const { data, error } = await supabase
    .from("ad_campaigns")
    .insert({
      advertiser_name: existing.sponsor,
      title: `${existing.placement} (copy)`,
      description: existing.description,
      media_url: existing.mediaUrl,
      cta_label: existing.ctaLabel,
      cta_url: existing.ctaUrl,
      target_roles: existing.targetRoles,
      target_specialties: existing.targetSpecialties,
      target_states: existing.targetStates,
      budget_total: existing.budgetTotal,
      cpm_rate: existing.cpmRate,
      start_date: parseDateOnly(existing.start) ?? new Date().toISOString(),
      end_date: parseDateOnly(existing.end) ?? new Date().toISOString(),
      status: "draft",
      objective: existing.objective,
      internal_notes: existing.internalNotes,
      owner_id: existing.ownerId,
      metadata: meta,
      created_by: staffUserId,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Duplicate failed." };
  const newId = data.id as string;
  await writeCampaignAudit(supabase, {
    staffUserId,
    action: "campaign.duplicate",
    entityId: newId,
    extra: { source_campaign_id: id },
  });
  return { ok: true, id: newId };
}

export async function linkCampaignLead(
  supabase: SupabaseClient,
  staffUserId: string,
  campaignId: string,
  leadId: string | null,
  staffNote?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!UUID_RE.test(campaignId)) return { ok: false, error: "Invalid campaign id." };
  if (leadId && !UUID_RE.test(leadId)) return { ok: false, error: "Invalid lead id." };
  const existing = await loadAdminCampaignById(campaignId);
  if (!existing) return { ok: false, error: "Campaign not found." };

  const { error } = await supabase
    .from("ad_campaigns")
    .update({ lead_id: leadId, updated_at: new Date().toISOString() })
    .eq("id", campaignId);
  if (error) return { ok: false, error: error.message };

  await writeCampaignAudit(supabase, {
    staffUserId,
    action: leadId ? "campaign.link_lead" : "campaign.unlink_lead",
    entityId: campaignId,
    previous: { lead_id: existing.leadId },
    next: { lead_id: leadId },
    staffNote,
  });

  return { ok: true };
}
