import "server-only";

import {
  evaluateSponsoredDelivery,
  type DeliveryEvaluation,
  type DeliveryFlagState,
  type SponsoredPlacementPayload,
  toSafeDeliveryPayload,
} from "@/lib/sponsored-placement-delivery-shared";
import type { PlacementBookingRow } from "@/lib/admin/placement-booking-shared";
import { createAdminDataSupabaseClient } from "@/lib/supabase/admin-data";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export type CampaignDeliveryStatus = {
  flags: DeliveryFlagState;
  evaluation: DeliveryEvaluation;
  activeBookings: PlacementBookingRow[];
  lastImpressionAt: string | null;
  lastClickAt: string | null;
  impressions: number;
  clicks: number;
};

export type InventoryDeliveryRow = {
  placementKey: string;
  placementName: string;
  surface: string;
  deliverableCount: number;
  ineligibleCount: number;
  warnings: string[];
};

export async function isSponsoredPlacementDeliveryEnabled(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const supabase = await createAdminDataSupabaseClient();
    const { data } = await supabase
      .from("feature_flags")
      .select("enabled")
      .eq("key", "sponsored_placement_delivery_enabled")
      .maybeSingle();
    return Boolean(data?.enabled);
  } catch {
    return false;
  }
}

function metaTimestamp(meta: Record<string, unknown> | null | undefined, key: string): string | null {
  const v = meta?.[key];
  return typeof v === "string" && v.trim() ? v : null;
}

export function evaluateCampaignDeliveryFromAdmin(args: {
  campaign: {
    status: string;
    start: string;
    end: string;
    sponsor: string;
    description: string;
    mediaUrl: string;
    ctaLabel: string;
    ctaUrl: string;
    budgetSpent: number;
    budgetTotal: number;
    metadata: Record<string, unknown>;
  };
  bookings: PlacementBookingRow[];
  deliveryFlagEnabled: boolean;
}): CampaignDeliveryStatus {
  const flags: DeliveryFlagState = {
    sponsoredPostsEnabled: false,
    mobilePlacementDeliveryEnabled: false,
    platformDeliveryEnabled: args.deliveryFlagEnabled,
  };

  const deliverableBookings = args.bookings.filter((b) =>
    ["active", "reserved"].includes(b.status),
  );

  const primaryBooking =
    deliverableBookings.find((b) => b.placementKey === "in_feed_sponsored") ??
    deliverableBookings[0] ??
    null;

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
  });

  const finalEval = evaluation;

  return {
    flags,
    evaluation: finalEval,
    activeBookings: deliverableBookings,
    lastImpressionAt: metaTimestamp(args.campaign.metadata, "last_impression_at"),
    lastClickAt: metaTimestamp(args.campaign.metadata, "last_click_at"),
    impressions: 0,
    clicks: 0,
  };
}

export async function loadCampaignDeliveryStatus(
  campaign: {
    id: string;
    status: string;
    start: string;
    end: string;
    sponsor: string;
    description: string;
    mediaUrl: string;
    ctaLabel: string;
    ctaUrl: string;
    budgetSpent: number;
    budgetTotal: number;
    metadata: Record<string, unknown>;
    impressions: number;
    clicks: number;
  },
  bookings: PlacementBookingRow[],
): Promise<CampaignDeliveryStatus> {
  const deliveryFlagEnabled = await isSponsoredPlacementDeliveryEnabled();
  const status = evaluateCampaignDeliveryFromAdmin({ campaign, bookings, deliveryFlagEnabled });
  return {
    ...status,
    impressions: campaign.impressions,
    clicks: campaign.clicks,
  };
}

export function summarizeInventoryDelivery(args: {
  summaries: Array<{
    placement: { key: string; name: string; surface: string };
    activeBookings: PlacementBookingRow[];
  }>;
  deliveryFlagEnabled: boolean;
  campaignById?: Map<
    string,
    {
      status: string;
      start: string;
      end: string;
      sponsor: string;
      description: string;
      mediaUrl: string;
      ctaLabel: string;
      ctaUrl: string;
      budgetSpent: number;
      budgetTotal: number;
    }
  >;
}): InventoryDeliveryRow[] {
  return args.summaries.map(({ placement, activeBookings }) => {
    let deliverableCount = 0;
    let ineligibleCount = 0;
    const warnings: string[] = [];

    for (const booking of activeBookings) {
      const campaign = args.campaignById?.get(booking.campaignId);
      const evalResult = evaluateSponsoredDelivery({
        flags: {
          sponsoredPostsEnabled: true,
          mobilePlacementDeliveryEnabled: true,
          platformDeliveryEnabled: args.deliveryFlagEnabled,
        },
        campaign: campaign
          ? {
              status: campaign.status,
              startDate: campaign.start,
              endDate: campaign.end,
              advertiserName: campaign.sponsor,
              description: campaign.description,
              mediaUrl: campaign.mediaUrl,
              ctaLabel: campaign.ctaLabel,
              ctaUrl: campaign.ctaUrl,
              budgetSpent: campaign.budgetSpent,
              budgetTotal: campaign.budgetTotal,
            }
          : {
              status: "draft",
              startDate: booking.startAt,
              endDate: booking.endAt,
              advertiserName: booking.campaignName,
              description: "—",
              mediaUrl: "",
              ctaLabel: "Learn More",
              ctaUrl: "",
              budgetSpent: 0,
              budgetTotal: 0,
            },
        booking: { status: booking.status, startAt: booking.startAt, endAt: booking.endAt },
        placement: {
          key: booking.placementKey,
          isActive: booking.placementIsActive,
          surface: booking.surface,
          device: booking.placementDevice,
        },
      });
      if (evalResult.eligible) deliverableCount += 1;
      else ineligibleCount += 1;
    }

    if (!args.deliveryFlagEnabled) {
      warnings.push("Delivery flag off — booked slots will not serve.");
    }
    if (ineligibleCount > 0) {
      warnings.push(`${ineligibleCount} booking(s) not eligible for delivery.`);
    }

    return {
      placementKey: placement.key,
      placementName: placement.name,
      surface: placement.surface,
      deliverableCount,
      ineligibleCount,
      warnings,
    };
  });
}

export type { SponsoredPlacementPayload };

export { toSafeDeliveryPayload };
