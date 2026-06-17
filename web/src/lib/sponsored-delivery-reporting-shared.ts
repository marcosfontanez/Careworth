/**
 * Sponsored delivery reporting — shared rules for admin performance cards,
 * sponsor-safe exports, launch readiness, and CSV rows.
 */

import {
  CAMPAIGN_PLANNING_CTA_URL,
  CAMPAIGN_PLANNING_MEDIA_URL,
} from "@/lib/admin/campaign-editor-shared";
import type { PlacementBookingRow } from "@/lib/admin/placement-booking-shared";
import {
  evaluateSponsoredDelivery,
  isSafeHttpUrl,
  sanitizeDeliveryCtaUrl,
  SPONSORED_DISCLOSURE_LABEL,
  validateCampaignCreative,
  type DeliveryEvaluation,
  type DeliveryEvaluationState,
  type DeliveryFlagState,
} from "@/lib/sponsored-placement-delivery-shared";

export const DELIVERY_STATE_LABELS: Record<DeliveryEvaluationState, string> = {
  not_delivering: "Not delivering",
  eligible_flags_off: "Eligible but flags off",
  delivering: "Delivering",
  blocked_creative: "Blocked by missing creative",
  blocked_status: "Blocked by campaign status",
  blocked_dates: "Blocked by date window",
  blocked_budget: "Blocked by budget exhausted",
  blocked_no_booking: "Blocked by no active booking",
  blocked_booking: "Blocked by booking ineligible",
  blocked_placement: "Blocked by placement inactive",
};

export const SPONSOR_SAFE_INTERNAL_KEYS = [
  "internal_notes",
  "internalNotes",
  "budget_total",
  "budgetTotal",
  "budget_spent",
  "budgetSpent",
  "lead_id",
  "leadId",
  "owner_id",
  "ownerId",
  "created_by",
  "createdBy",
  "metadata",
  "target_roles",
  "targetRoles",
  "target_specialties",
  "targetStates",
  "target_states",
  "cpm_rate",
  "cpmRate",
  "staff_user_id",
  "staffNote",
  "staff_note",
] as const;

export type LaunchReadinessStatus =
  | "ready"
  | "not_ready"
  | "ready_flags_off"
  | "delivering"
  | "requires_review";

export type LaunchReadinessItem = {
  id: string;
  label: string;
  passed: boolean;
  severity: "required" | "warning" | "info";
  detail?: string;
};

export type LaunchReadinessSummary = {
  status: LaunchReadinessStatus;
  items: LaunchReadinessItem[];
};

export type CampaignReportingInputs = {
  id: string;
  campaignName: string;
  status: string;
  sponsor: string;
  description: string;
  mediaUrl: string;
  ctaLabel: string;
  ctaUrl: string;
  start: string;
  end: string;
  impressions: number;
  clicks: number;
  metadata: Record<string, unknown>;
  budgetSpent: number;
  budgetTotal: number;
};

export type CampaignDeliveryReportRow = {
  campaignId: string;
  campaignName: string;
  advertiserName: string;
  campaignStatus: string;
  campaignStart: string;
  campaignEnd: string;
  impressions: number;
  clicks: number;
  ctr: number;
  lastImpressionAt: string | null;
  lastClickAt: string | null;
  deliveryState: DeliveryEvaluationState;
  deliveryLabel: string;
  evaluation: DeliveryEvaluation;
  flags: DeliveryFlagState;
  primaryBooking: PlacementBookingRow | null;
  activeBookings: PlacementBookingRow[];
  creativeWarnings: string[];
  ctaWarnings: string[];
};

export type SponsorSafeReport = {
  exportAudience: "sponsor_safe";
  campaignName: string;
  advertiserName: string;
  flightStart: string;
  flightEnd: string;
  placementSummary: string;
  impressions: number;
  clicks: number;
  ctr: number;
  lastDeliveredAt: string | null;
  creativePreview: {
    mediaUrl: string;
    headline: string;
    description: string;
  };
  cta: { label: string; url: string | null } | null;
  disclosureNote: string;
};

export type DeliveryReportCsvRow = {
  campaign_id: string;
  campaign_name: string;
  advertiser_name: string;
  status: string;
  placement_key: string;
  placement_name: string;
  surface: string;
  device: string;
  booking_status: string;
  booking_start_at: string;
  booking_end_at: string;
  impressions: number;
  clicks: number;
  ctr: number;
  last_impression_at: string;
  last_click_at: string;
  delivery_state: string;
};

export type SponsoredReportingFilters = {
  status: string;
  deliveryState: DeliveryEvaluationState | "all";
  placementKey: string;
  surface: string;
  from: string;
  to: string;
  advertiser: string;
  hasImpressions: "all" | "yes" | "no";
  hasClicks: "all" | "yes" | "no";
  blockedOnly: boolean;
};

export function calculateCtr(impressions: number, clicks: number): number {
  if (!Number.isFinite(impressions) || impressions <= 0) return 0;
  if (!Number.isFinite(clicks) || clicks < 0) return 0;
  return Math.round((clicks / impressions) * 10000) / 100;
}

export function metaTimestamp(meta: Record<string, unknown> | null | undefined, key: string): string | null {
  const v = meta?.[key];
  return typeof v === "string" && v.trim() ? v : null;
}

export function isPlaceholderCreative(
  mediaUrl: string,
  ctaUrl: string,
  description?: string,
): boolean {
  const media = mediaUrl.trim();
  const cta = ctaUrl.trim();
  if (media === CAMPAIGN_PLANNING_MEDIA_URL) return true;
  if (cta === CAMPAIGN_PLANNING_CTA_URL) return true;
  const desc = (description ?? "").toLowerCase();
  if (/placeholder|planning copy|internal test|lorem ipsum|todo:/i.test(desc)) return true;
  return false;
}

export function assessCtaSafety(
  ctaUrl: string,
  ctaLabel: string,
): { ok: true } | { ok: false; reason: string } {
  const url = ctaUrl.trim();
  const label = ctaLabel.trim();
  if (!url && !label) {
    return { ok: false, reason: "CTA label and URL are missing." };
  }
  if (url && !isSafeHttpUrl(url)) {
    return { ok: false, reason: "CTA URL must be a safe http(s) link." };
  }
  if (url && sanitizeDeliveryCtaUrl(url) === null) {
    return { ok: false, reason: "CTA URL failed safety sanitization." };
  }
  if (url && !label) {
    return { ok: false, reason: "CTA label required when URL is set." };
  }
  return { ok: true };
}

export function pickPrimaryBooking(bookings: PlacementBookingRow[]): PlacementBookingRow | null {
  const deliverable = bookings.filter((b) => ["active", "reserved"].includes(b.status));
  return (
    deliverable.find((b) => b.placementKey === "in_feed_sponsored") ??
    deliverable[0] ??
    bookings[0] ??
    null
  );
}

export function buildDeliveryFlags(platformEnabled: boolean): DeliveryFlagState {
  return {
    sponsoredPostsEnabled: false,
    mobilePlacementDeliveryEnabled: false,
    platformDeliveryEnabled: platformEnabled,
  };
}

export function buildCampaignDeliveryReportRow(args: {
  campaign: CampaignReportingInputs;
  bookings: PlacementBookingRow[];
  platformDeliveryEnabled: boolean;
  now?: Date;
}): CampaignDeliveryReportRow {
  const primaryBooking = pickPrimaryBooking(args.bookings);
  const activeBookings = args.bookings.filter((b) => ["active", "reserved"].includes(b.status));
  const flags = buildDeliveryFlags(args.platformDeliveryEnabled);
  const evaluation = evaluateSponsoredDelivery({
    flags,
    campaign: {
      status: args.campaign.status,
      startDate: args.campaign.start,
      endDate: args.campaign.end,
      advertiserName: args.campaign.sponsor,
      description: args.campaign.description,
      mediaUrl: args.campaign.mediaUrl,
      ctaLabel: args.campaign.ctaLabel,
      ctaUrl: args.campaign.ctaUrl,
      budgetSpent: args.campaign.budgetSpent,
      budgetTotal: args.campaign.budgetTotal,
    },
    booking: primaryBooking
      ? { status: primaryBooking.status, startAt: primaryBooking.startAt, endAt: primaryBooking.endAt }
      : null,
    placement: primaryBooking
      ? {
          key: primaryBooking.placementKey,
          isActive: primaryBooking.placementIsActive,
          surface: primaryBooking.surface,
          device: primaryBooking.placementDevice,
        }
      : null,
    now: args.now,
  });

  const creativeWarnings: string[] = [];
  const ctaWarnings: string[] = [];

  if (isPlaceholderCreative(args.campaign.mediaUrl, args.campaign.ctaUrl, args.campaign.description)) {
    creativeWarnings.push("Creative appears to use planning placeholder copy or assets.");
  }
  const creative = validateCampaignCreative({
    advertiserName: args.campaign.sponsor,
    description: args.campaign.description,
    mediaUrl: args.campaign.mediaUrl,
    ctaLabel: args.campaign.ctaLabel,
    ctaUrl: args.campaign.ctaUrl,
  });
  if (!creative.ok) creativeWarnings.push(creative.reason);

  const cta = assessCtaSafety(args.campaign.ctaUrl, args.campaign.ctaLabel);
  if (!cta.ok) ctaWarnings.push(cta.reason);

  return {
    campaignId: args.campaign.id,
    campaignName: args.campaign.campaignName,
    advertiserName: args.campaign.sponsor,
    campaignStatus: args.campaign.status,
    campaignStart: args.campaign.start,
    campaignEnd: args.campaign.end,
    impressions: args.campaign.impressions,
    clicks: args.campaign.clicks,
    ctr: calculateCtr(args.campaign.impressions, args.campaign.clicks),
    lastImpressionAt: metaTimestamp(args.campaign.metadata, "last_impression_at"),
    lastClickAt: metaTimestamp(args.campaign.metadata, "last_click_at"),
    deliveryState: evaluation.state,
    deliveryLabel: DELIVERY_STATE_LABELS[evaluation.state],
    evaluation,
    flags,
    primaryBooking,
    activeBookings,
    creativeWarnings,
    ctaWarnings,
  };
}

export function buildLaunchReadinessChecklist(args: {
  campaign: CampaignReportingInputs;
  report: CampaignDeliveryReportRow;
  now?: Date;
}): LaunchReadinessSummary {
  const { campaign, report } = args;
  const now = args.now ?? new Date();
  const launchMs = now.getTime();
  const inCampaignWindow =
    launchMs >= new Date(report.campaignStart).getTime() &&
    launchMs <= new Date(report.campaignEnd).getTime();
  const booking = report.primaryBooking;
  const bookingInWindow = booking
    ? launchMs >= new Date(booking.startAt).getTime() && launchMs <= new Date(booking.endAt).getTime()
    : false;

  const creativeValidation = validateCampaignCreative({
    advertiserName: campaign.sponsor,
    description: campaign.description,
    mediaUrl: campaign.mediaUrl,
    ctaLabel: campaign.ctaLabel,
    ctaUrl: campaign.ctaUrl,
  });
  const placeholder = isPlaceholderCreative(campaign.mediaUrl, campaign.ctaUrl, campaign.description);
  const ctaCheck = assessCtaSafety(campaign.ctaUrl, campaign.ctaLabel);

  const items: LaunchReadinessItem[] = [
    {
      id: "campaign_active",
      label: "Campaign active",
      passed: report.campaignStatus === "active",
      severity: "required",
    },
    {
      id: "campaign_dates",
      label: "Campaign date window includes launch date",
      passed: inCampaignWindow,
      severity: "required",
      detail: inCampaignWindow ? undefined : "Today is outside campaign start/end.",
    },
    {
      id: "creative_present",
      label: "Creative present",
      passed: creativeValidation.ok,
      severity: "required",
      detail: creativeValidation.ok ? undefined : creativeValidation.reason,
    },
    {
      id: "creative_public",
      label: "Creative URL public/safe",
      passed: Boolean(campaign.mediaUrl.trim()),
      severity: "required",
    },
    {
      id: "cta_safe",
      label: "CTA safe",
      passed: ctaCheck.ok,
      severity: "required",
      detail: ctaCheck.ok ? undefined : ctaCheck.reason,
    },
    {
      id: "advertiser_name",
      label: "Advertiser name present",
      passed: Boolean(report.advertiserName.trim()),
      severity: "required",
    },
    {
      id: "disclosure",
      label: "Sponsored disclosure enabled",
      passed: true,
      severity: "required",
      detail: `In-app badge: "${SPONSORED_DISCLOSURE_LABEL}"`,
    },
    {
      id: "booking_exists",
      label: "Active/reserved booking exists",
      passed: report.activeBookings.length > 0,
      severity: "required",
    },
    {
      id: "booking_dates",
      label: "Booking date window valid",
      passed: booking ? bookingInWindow : false,
      severity: "required",
    },
    {
      id: "placement_active",
      label: "Placement active",
      passed: booking ? booking.placementIsActive : false,
      severity: "required",
    },
    {
      id: "placement_match",
      label: "Placement surface/device match",
      passed: booking
        ? booking.placementKey === "in_feed_sponsored" &&
          booking.surface === "feed" &&
          (booking.placementDevice === "mobile" || booking.placementDevice === "all")
        : false,
      severity: "required",
    },
    {
      id: "flag_sponsored_posts",
      label: "sponsoredPosts flag state",
      passed: report.flags.sponsoredPostsEnabled,
      severity: "warning",
      detail: report.flags.sponsoredPostsEnabled ? "On" : "Off (mobile session)",
    },
    {
      id: "flag_mobile_delivery",
      label: "sponsoredPlacementDelivery flag state",
      passed: report.flags.mobilePlacementDeliveryEnabled,
      severity: "warning",
      detail: report.flags.mobilePlacementDeliveryEnabled ? "On" : "Off (mobile session)",
    },
    {
      id: "flag_platform_delivery",
      label: "sponsored_placement_delivery_enabled flag state",
      passed: report.flags.platformDeliveryEnabled,
      severity: "warning",
      detail: report.flags.platformDeliveryEnabled ? "On" : "Off",
    },
    {
      id: "kill_switch",
      label: "Kill switch tested",
      passed: false,
      severity: "info",
      detail: "Confirm manually in QA — all three flags off stops delivery.",
    },
    {
      id: "no_placeholder",
      label: "No placeholder creative",
      passed: !placeholder,
      severity: "required",
    },
    {
      id: "no_phi",
      label: "No PHI/internal notes in creative/copy",
      passed: !/phi|patient|mrn|ssn|internal note/i.test(
        `${campaign.description} ${campaign.campaignName}`,
      ),
      severity: "required",
    },
  ];

  const requiredFailed = items.some((i) => i.severity === "required" && !i.passed);

  let status: LaunchReadinessStatus = "not_ready";
  if (report.deliveryState === "delivering") {
    status = "delivering";
  } else if (requiredFailed) {
    status = "requires_review";
  } else if (report.deliveryState === "eligible_flags_off") {
    status = "ready_flags_off";
  } else if (!requiredFailed) {
    status = "ready";
  }

  return { status, items };
}

/** @deprecated Use buildSponsorSafeReportFromCampaign */
export function buildSponsorSafeReport(report: CampaignDeliveryReportRow): SponsorSafeReport {
  return buildSponsorSafeReportFromCampaign({
    campaign: {
      id: report.campaignId,
      campaignName: report.campaignName,
      status: report.campaignStatus,
      sponsor: report.advertiserName,
      description: "",
      mediaUrl: "",
      ctaLabel: "",
      ctaUrl: "",
      start: report.campaignStart,
      end: report.campaignEnd,
      impressions: report.impressions,
      clicks: report.clicks,
      metadata: {},
      budgetSpent: 0,
      budgetTotal: 0,
    },
    report,
  });
}

/** Build sponsor-safe report from campaign inputs (never includes internal CRM fields). */
export function buildSponsorSafeReportFromCampaign(args: {
  campaign: CampaignReportingInputs;
  report: CampaignDeliveryReportRow;
}): SponsorSafeReport {
  const { campaign, report } = args;
  const booking = report.primaryBooking;
  const placementSummary = booking
    ? `${booking.placementName} (${booking.placementKey}) · ${booking.surface} · ${booking.placementDevice}`
    : "No active placement booking";

  const ctaUrl = campaign.ctaUrl.trim() ? sanitizeDeliveryCtaUrl(campaign.ctaUrl) : null;
  const ctaLabel = campaign.ctaLabel.trim() || "Learn More";
  const safeCta =
    ctaUrl && assessCtaSafety(campaign.ctaUrl, campaign.ctaLabel).ok
      ? { label: ctaLabel, url: ctaUrl }
      : ctaUrl
        ? null
        : ctaLabel !== "Learn More"
          ? { label: ctaLabel, url: null }
          : null;

  return {
    exportAudience: "sponsor_safe",
    campaignName: campaign.campaignName,
    advertiserName: campaign.sponsor,
    flightStart: campaign.start,
    flightEnd: campaign.end,
    placementSummary,
    impressions: report.impressions,
    clicks: report.clicks,
    ctr: report.ctr,
    lastDeliveredAt: report.lastImpressionAt ?? report.lastClickAt,
    creativePreview: {
      mediaUrl: campaign.mediaUrl,
      headline: campaign.campaignName,
      description: campaign.description,
    },
    cta: safeCta,
    disclosureNote: `${SPONSORED_DISCLOSURE_LABEL} placement disclosure enabled in feed.`,
  };
}

export function sponsorSafeReportHasInternalFields(payload: Record<string, unknown>): boolean {
  for (const key of Object.keys(payload)) {
    if (SPONSOR_SAFE_INTERNAL_KEYS.some((k) => k.toLowerCase() === key.toLowerCase())) {
      return true;
    }
  }
  return false;
}

export function toDeliveryReportCsvRow(report: CampaignDeliveryReportRow): DeliveryReportCsvRow {
  const booking = report.primaryBooking;
  return {
    campaign_id: report.campaignId,
    campaign_name: report.campaignName,
    advertiser_name: report.advertiserName,
    status: report.campaignStatus,
    placement_key: booking?.placementKey ?? "",
    placement_name: booking?.placementName ?? "",
    surface: booking?.surface ?? "",
    device: booking?.placementDevice ?? "",
    booking_status: booking?.status ?? "",
    booking_start_at: booking?.startAt ?? "",
    booking_end_at: booking?.endAt ?? "",
    impressions: report.impressions,
    clicks: report.clicks,
    ctr: report.ctr,
    last_impression_at: report.lastImpressionAt ?? "",
    last_click_at: report.lastClickAt ?? "",
    delivery_state: report.deliveryState,
  };
}

export function deliveryReportCsvString(rows: DeliveryReportCsvRow[]): string {
  const headers: (keyof DeliveryReportCsvRow)[] = [
    "campaign_id",
    "campaign_name",
    "advertiser_name",
    "status",
    "placement_key",
    "placement_name",
    "surface",
    "device",
    "booking_status",
    "booking_start_at",
    "booking_end_at",
    "impressions",
    "clicks",
    "ctr",
    "last_impression_at",
    "last_click_at",
    "delivery_state",
  ];
  const escape = (v: string | number) => {
    const s = String(v ?? "");
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(","));
  }
  return lines.join("\n");
}

export function dashboardAlertTags(report: CampaignDeliveryReportRow, now: Date = new Date()): string[] {
  const tags: string[] = [];
  if (report.campaignStatus === "active") tags.push("active");
  if (report.deliveryState === "delivering") tags.push("delivering");
  if (report.deliveryState === "eligible_flags_off") tags.push("eligible_flags_off");
  if (report.activeBookings.length > 0 && report.creativeWarnings.length > 0) {
    tags.push("missing_creative");
  }
  if (report.clicks > 0 && !report.lastImpressionAt) tags.push("clicks_no_impressions");
  if (report.primaryBooking) {
    const endMs = new Date(report.primaryBooking.endAt).getTime();
    const daysLeft = (endMs - now.getTime()) / (1000 * 60 * 60 * 24);
    if (daysLeft >= 0 && daysLeft <= 7) tags.push("booking_ending_soon");
  }
  if (
    report.flags.platformDeliveryEnabled &&
    report.deliveryState !== "delivering" &&
    report.impressions === 0 &&
    report.campaignStatus === "active"
  ) {
    tags.push("zero_impressions");
  }
  if (report.ctaWarnings.length > 0) tags.push("unsafe_cta");
  if (report.evaluation.state.startsWith("blocked_")) tags.push("blocked");
  return tags;
}

export function applySponsoredReportingFilters(
  rows: CampaignDeliveryReportRow[],
  filters: SponsoredReportingFilters,
): CampaignDeliveryReportRow[] {
  let out = rows;
  if (filters.status && filters.status !== "all") {
    out = out.filter((r) => r.campaignStatus === filters.status);
  }
  if (filters.deliveryState !== "all") {
    out = out.filter((r) => r.deliveryState === filters.deliveryState);
  }
  if (filters.placementKey) {
    out = out.filter((r) => r.primaryBooking?.placementKey === filters.placementKey);
  }
  if (filters.surface) {
    out = out.filter((r) => r.primaryBooking?.surface === filters.surface);
  }
  if (filters.advertiser) {
    const q = filters.advertiser.toLowerCase();
    out = out.filter((r) => r.advertiserName.toLowerCase().includes(q));
  }
  if (filters.from) {
    const t = new Date(filters.from).getTime();
    if (Number.isFinite(t)) out = out.filter((r) => new Date(r.campaignEnd).getTime() >= t);
  }
  if (filters.to) {
    const t = new Date(filters.to).getTime();
    if (Number.isFinite(t)) out = out.filter((r) => new Date(r.campaignStart).getTime() <= t);
  }
  if (filters.hasImpressions === "yes") out = out.filter((r) => r.impressions > 0);
  if (filters.hasImpressions === "no") out = out.filter((r) => r.impressions === 0);
  if (filters.hasClicks === "yes") out = out.filter((r) => r.clicks > 0);
  if (filters.hasClicks === "no") out = out.filter((r) => r.clicks === 0);
  if (filters.blockedOnly) {
    out = out.filter((r) => r.evaluation.state.startsWith("blocked_") || r.deliveryState === "not_delivering");
  }
  return out;
}

export function parseSponsoredReportingFilters(
  input: Record<string, string | string[] | undefined>,
): SponsoredReportingFilters {
  const pick = (key: string) => {
    const v = input[key];
    return typeof v === "string" ? v.trim() : "";
  };
  const deliveryRaw = pick("deliveryState");
  const deliveryState = (
    [
      "not_delivering",
      "eligible_flags_off",
      "delivering",
      "blocked_creative",
      "blocked_status",
      "blocked_dates",
      "blocked_budget",
      "blocked_no_booking",
      "blocked_booking",
      "blocked_placement",
    ] as const
  ).includes(deliveryRaw as DeliveryEvaluationState)
    ? (deliveryRaw as DeliveryEvaluationState)
    : "all";
  return {
    status: pick("status") || "all",
    deliveryState,
    placementKey: pick("placementKey"),
    surface: pick("surface"),
    from: pick("from"),
    to: pick("to"),
    advertiser: pick("advertiser"),
    hasImpressions: pick("hasImpressions") === "yes" || pick("hasImpressions") === "no" ? pick("hasImpressions") as "yes" | "no" : "all",
    hasClicks: pick("hasClicks") === "yes" || pick("hasClicks") === "no" ? pick("hasClicks") as "yes" | "no" : "all",
    blockedOnly: pick("blockedOnly") === "1" || pick("blockedOnly") === "true",
  };
}
