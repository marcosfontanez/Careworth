/** Shared sponsored placement delivery rules — canonical copy for mobile EAS builds. */

export const SPONSORED_DISCLOSURE_LABEL = "Sponsored" as const;

export const DEFAULT_IN_FEED_SLOT_KEY = "in_feed_sponsored";

export const DELIVERABLE_BOOKING_STATUSES = ["active", "reserved"] as const;

export type DeliverableBookingStatus = (typeof DELIVERABLE_BOOKING_STATUSES)[number];

export type SponsoredDeliverySurface =
  | "feed"
  | "circles"
  | "live"
  | "my_pulse"
  | "creator_hub"
  | "web";

export type SponsoredDeliveryDevice = "mobile" | "web" | "all";

/** Safe fields only — never include budget, notes, lead data, or staff metadata. */
export type SponsoredPlacementPayload = {
  campaignId: string;
  bookingId: string;
  placementId: string;
  advertiserName: string;
  advertiserLogo: string | null;
  headline: string;
  description: string;
  mediaUrl: string;
  ctaLabel: string;
  ctaUrl: string | null;
  disclosureLabel: typeof SPONSORED_DISCLOSURE_LABEL;
};

export type DeliveryFlagState = {
  /** Mobile Zustand kill switch `sponsoredPosts`. */
  sponsoredPostsEnabled: boolean;
  /** Mobile Zustand kill switch `sponsoredPlacementDelivery`. */
  mobilePlacementDeliveryEnabled: boolean;
  /** DB flag `sponsored_placement_delivery_enabled`. */
  platformDeliveryEnabled: boolean;
};

export type CampaignDeliveryInputs = {
  status: string;
  startDate: string;
  endDate: string;
  advertiserName: string;
  description: string;
  mediaUrl: string;
  ctaLabel: string;
  ctaUrl: string;
  budgetSpent: number;
  budgetTotal: number;
};

export type BookingDeliveryInputs = {
  status: string;
  startAt: string;
  endAt: string;
};

export type PlacementDeliveryInputs = {
  key: string;
  isActive: boolean;
  surface: string;
  device: string;
};

export type DeliveryEvaluationState =
  | "not_delivering"
  | "eligible_flags_off"
  | "delivering"
  | "blocked_creative"
  | "blocked_status"
  | "blocked_dates"
  | "blocked_budget"
  | "blocked_no_booking"
  | "blocked_booking"
  | "blocked_placement";

export type DeliveryEvaluation = {
  state: DeliveryEvaluationState;
  eligible: boolean;
  reasons: string[];
};

const TERMINAL_CAMPAIGN_STATUSES = new Set(["draft", "paused", "completed", "cancelled"]);

export function isSafeHttpUrl(raw: string | null | undefined): boolean {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return false;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(withScheme);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function sanitizeDeliveryCtaUrl(raw: string | null | undefined): string | null {
  if (!isSafeHttpUrl(raw)) return null;
  const trimmed = (raw ?? "").trim();
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withScheme).toString();
  } catch {
    return null;
  }
}

export function isCampaignInFlightWindow(
  campaign: Pick<CampaignDeliveryInputs, "startDate" | "endDate">,
  now: Date = new Date(),
): boolean {
  const start = new Date(campaign.startDate).getTime();
  const end = new Date(campaign.endDate).getTime();
  const t = now.getTime();
  return Number.isFinite(start) && Number.isFinite(end) && t >= start && t <= end;
}

export function isBookingInWindow(
  booking: Pick<BookingDeliveryInputs, "startAt" | "endAt">,
  now: Date = new Date(),
): boolean {
  const start = new Date(booking.startAt).getTime();
  const end = new Date(booking.endAt).getTime();
  const t = now.getTime();
  return Number.isFinite(start) && Number.isFinite(end) && t >= start && t <= end;
}

export function validateCampaignCreative(
  campaign: Pick<
    CampaignDeliveryInputs,
    "advertiserName" | "description" | "mediaUrl" | "ctaLabel" | "ctaUrl"
  >,
): { ok: true } | { ok: false; reason: string } {
  if (!campaign.advertiserName?.trim()) {
    return { ok: false, reason: "Missing advertiser name." };
  }
  if (!campaign.description?.trim()) {
    return { ok: false, reason: "Missing description." };
  }
  if (!campaign.mediaUrl?.trim()) {
    return { ok: false, reason: "Missing media URL." };
  }
  const ctaUrl = campaign.ctaUrl?.trim();
  if (ctaUrl && !isSafeHttpUrl(ctaUrl)) {
    return { ok: false, reason: "CTA URL must be http(s)." };
  }
  if (ctaUrl && !campaign.ctaLabel?.trim()) {
    return { ok: false, reason: "CTA label required when CTA URL is set." };
  }
  return { ok: true };
}

export function isCampaignDeliveryEligible(
  campaign: CampaignDeliveryInputs,
  now: Date = new Date(),
): { ok: true } | { ok: false; reason: string } {
  if (campaign.status !== "active") {
    return { ok: false, reason: `Campaign status is ${campaign.status}.` };
  }
  if (TERMINAL_CAMPAIGN_STATUSES.has(campaign.status) && campaign.status !== "active") {
    return { ok: false, reason: `Campaign status is ${campaign.status}.` };
  }
  if (!isCampaignInFlightWindow(campaign, now)) {
    return { ok: false, reason: "Campaign is outside its start/end window." };
  }
  const creative = validateCampaignCreative(campaign);
  if (!creative.ok) return creative;
  if (campaign.budgetTotal > 0 && campaign.budgetSpent >= campaign.budgetTotal) {
    return { ok: false, reason: "Campaign budget is exhausted." };
  }
  return { ok: true };
}

export function isBookingDeliveryEligible(
  booking: BookingDeliveryInputs,
  now: Date = new Date(),
): { ok: true } | { ok: false; reason: string } {
  if (!DELIVERABLE_BOOKING_STATUSES.includes(booking.status as DeliverableBookingStatus)) {
    return { ok: false, reason: `Booking status is ${booking.status}.` };
  }
  if (!isBookingInWindow(booking, now)) {
    return { ok: false, reason: "Booking is outside its start/end window." };
  }
  return { ok: true };
}

export function isPlacementContextMatch(
  placement: PlacementDeliveryInputs,
  surface: SponsoredDeliverySurface,
  device: SponsoredDeliveryDevice,
  slotKey: string = DEFAULT_IN_FEED_SLOT_KEY,
): { ok: true } | { ok: false; reason: string } {
  if (!placement.isActive) {
    return { ok: false, reason: "Placement is inactive." };
  }
  if (placement.key !== slotKey) {
    return { ok: false, reason: "Placement slot key mismatch." };
  }
  if (placement.surface !== surface) {
    return { ok: false, reason: "Placement surface mismatch." };
  }
  if (placement.device !== "all" && placement.device !== device) {
    return { ok: false, reason: "Placement device mismatch." };
  }
  return { ok: true };
}

export function areDeliveryFlagsEnabled(flags: DeliveryFlagState): boolean {
  return (
    flags.sponsoredPostsEnabled &&
    flags.mobilePlacementDeliveryEnabled &&
    flags.platformDeliveryEnabled
  );
}

export function evaluateSponsoredDelivery(args: {
  flags: DeliveryFlagState;
  campaign: CampaignDeliveryInputs;
  booking: BookingDeliveryInputs | null;
  placement: PlacementDeliveryInputs | null;
  surface?: SponsoredDeliverySurface;
  device?: SponsoredDeliveryDevice;
  slotKey?: string;
  now?: Date;
}): DeliveryEvaluation {
  const reasons: string[] = [];
  const now = args.now ?? new Date();
  const surface = args.surface ?? "feed";
  const device = args.device ?? "mobile";
  const slotKey = args.slotKey ?? DEFAULT_IN_FEED_SLOT_KEY;

  const campaignOk = isCampaignDeliveryEligible(args.campaign, now);
  if (!campaignOk.ok) reasons.push(campaignOk.reason);

  if (!args.booking) {
    reasons.push("No placement booking linked.");
  } else {
    const bookingOk = isBookingDeliveryEligible(args.booking, now);
    if (!bookingOk.ok) reasons.push(bookingOk.reason);
  }

  if (!args.placement) {
    reasons.push("Placement catalog entry missing.");
  } else {
    const placementOk = isPlacementContextMatch(args.placement, surface, device, slotKey);
    if (!placementOk.ok) reasons.push(placementOk.reason);
  }

  const flagsOn = areDeliveryFlagsEnabled(args.flags);
  if (!flagsOn) {
    reasons.push("Delivery flags are off.");
  }

  const structurallyEligible =
    campaignOk.ok &&
    !!args.booking &&
    isBookingDeliveryEligible(args.booking, now).ok &&
    !!args.placement &&
    isPlacementContextMatch(args.placement, surface, device, slotKey).ok;

  if (!structurallyEligible) {
    if (!campaignOk.ok) {
      if (campaignOk.reason.includes("status")) {
        return { state: "blocked_status", eligible: false, reasons };
      }
      if (campaignOk.reason.includes("window")) {
        return { state: "blocked_dates", eligible: false, reasons };
      }
      if (campaignOk.reason.includes("budget")) {
        return { state: "blocked_budget", eligible: false, reasons };
      }
      return { state: "blocked_creative", eligible: false, reasons };
    }
    if (!args.booking) {
      return { state: "blocked_no_booking", eligible: false, reasons };
    }
    if (args.placement && !args.placement.isActive) {
      return { state: "blocked_placement", eligible: false, reasons };
    }
    return { state: "blocked_booking", eligible: false, reasons };
  }

  if (!flagsOn) {
    return { state: "eligible_flags_off", eligible: false, reasons };
  }

  return { state: "delivering", eligible: true, reasons: [] };
}

const INTERNAL_PAYLOAD_KEYS = new Set([
  "budget_total",
  "budget_spent",
  "internal_notes",
  "metadata",
  "lead_id",
  "owner_id",
  "created_by",
  "cpm_rate",
  "target_roles",
  "target_specialties",
  "target_states",
  "notes",
]);

export function toSafeDeliveryPayload(raw: Record<string, unknown>): SponsoredPlacementPayload | null {
  for (const key of Object.keys(raw)) {
    if (INTERNAL_PAYLOAD_KEYS.has(key)) return null;
  }

  const campaignId = typeof raw.campaignId === "string" ? raw.campaignId : null;
  const bookingId = typeof raw.bookingId === "string" ? raw.bookingId : null;
  const placementId = typeof raw.placementId === "string" ? raw.placementId : null;
  const advertiserName = typeof raw.advertiserName === "string" ? raw.advertiserName.trim() : "";
  const headline = typeof raw.headline === "string" ? raw.headline.trim() : "";
  const description = typeof raw.description === "string" ? raw.description.trim() : "";
  const mediaUrl = typeof raw.mediaUrl === "string" ? raw.mediaUrl.trim() : "";

  if (!campaignId || !bookingId || !placementId || !advertiserName || !headline || !description || !mediaUrl) {
    return null;
  }

  const ctaUrlRaw = typeof raw.ctaUrl === "string" ? raw.ctaUrl : null;
  const ctaUrl = ctaUrlRaw ? sanitizeDeliveryCtaUrl(ctaUrlRaw) : null;
  if (ctaUrlRaw?.trim() && !ctaUrl) return null;

  return {
    campaignId,
    bookingId,
    placementId,
    advertiserName,
    advertiserLogo: typeof raw.advertiserLogo === "string" ? raw.advertiserLogo : null,
    headline,
    description,
    mediaUrl,
    ctaLabel: typeof raw.ctaLabel === "string" && raw.ctaLabel.trim() ? raw.ctaLabel.trim() : "Learn More",
    ctaUrl,
    disclosureLabel: SPONSORED_DISCLOSURE_LABEL,
  };
}

export function payloadToSponsorInfo(payload: SponsoredPlacementPayload) {
  return {
    advertiserName: payload.advertiserName,
    advertiserLogo: payload.advertiserLogo ?? undefined,
    ctaLabel: payload.ctaLabel,
    ctaUrl: payload.ctaUrl ?? "",
    campaignId: payload.campaignId,
  };
}

/** Session-scoped dedupe for impression tracking (one increment per campaign per session). */
export function createSessionDeduper() {
  const seen = new Set<string>();
  return {
    once(key: string): boolean {
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    },
    reset() {
      seen.clear();
    },
  };
}
