import { describe, expect, it } from "vitest";

import {
  CAMPAIGN_PLANNING_CTA_URL,
  CAMPAIGN_PLANNING_MEDIA_URL,
} from "@/lib/admin/campaign-editor-shared";
import type { PlacementBookingRow } from "@/lib/admin/placement-booking-shared";
import {
  assessCtaSafety,
  buildCampaignDeliveryReportRow,
  buildLaunchReadinessChecklist,
  buildSponsorSafeReportFromCampaign,
  calculateCtr,
  deliveryReportCsvString,
  isPlaceholderCreative,
  sponsorSafeReportHasInternalFields,
  toDeliveryReportCsvRow,
  type CampaignReportingInputs,
} from "@/lib/sponsored-delivery-reporting-shared";
import {
  evaluateSponsoredDelivery,
  type DeliveryFlagState,
} from "@/lib/sponsored-placement-delivery-shared";

const NOW = new Date("2026-06-15T12:00:00.000Z");

const FLAGS_ON: DeliveryFlagState = {
  sponsoredPostsEnabled: true,
  mobilePlacementDeliveryEnabled: true,
  platformDeliveryEnabled: true,
};

function baseCampaign(overrides: Partial<CampaignReportingInputs> = {}): CampaignReportingInputs {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    campaignName: "QA Campaign",
    status: "active",
    sponsor: "PulseVerse Health",
    description: "Approved creative copy.",
    mediaUrl: "https://cdn.example.com/ad.jpg",
    ctaLabel: "Learn More",
    ctaUrl: "https://pulseverse.app/advertisers",
    start: "2026-06-01",
    end: "2026-06-30",
    impressions: 100,
    clicks: 4,
    metadata: {
      last_impression_at: "2026-06-14T10:00:00.000Z",
      last_click_at: "2026-06-14T11:00:00.000Z",
    },
    budgetSpent: 0,
    budgetTotal: 1000,
    ...overrides,
  };
}

const baseBooking: PlacementBookingRow = {
  id: "22222222-2222-4222-8222-222222222222",
  campaignId: "11111111-1111-4111-8111-111111111111",
  campaignName: "QA Campaign",
  placementId: "33333333-3333-4333-8333-333333333333",
  placementKey: "in_feed_sponsored",
  placementName: "In-feed sponsored",
  surface: "feed",
  placementDevice: "mobile",
  placementIsActive: true,
  capacityType: "shared",
  maxActiveCampaigns: 2,
  startAt: "2026-06-01T00:00:00.000Z",
  endAt: "2026-06-30T23:59:59.000Z",
  status: "active",
  priority: 1,
  notes: "internal booking note",
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
  conflict: false,
  overCapacity: false,
};

describe("sponsored delivery reporting shared", () => {
  it("CTR is zero when impressions are zero", () => {
    expect(calculateCtr(0, 5)).toBe(0);
  });

  it("CTR calculates clicks over impressions", () => {
    expect(calculateCtr(100, 4)).toBe(4);
  });

  it("delivery state is eligible_flags_off when flags are off", () => {
    const report = buildCampaignDeliveryReportRow({
      campaign: baseCampaign(),
      bookings: [baseBooking],
      platformDeliveryEnabled: false,
      now: NOW,
    });
    expect(report.deliveryState).toBe("eligible_flags_off");
  });

  it("delivery state is blocked_status when campaign inactive", () => {
    const report = buildCampaignDeliveryReportRow({
      campaign: baseCampaign({ status: "paused" }),
      bookings: [baseBooking],
      platformDeliveryEnabled: true,
      now: NOW,
    });
    expect(report.deliveryState).toBe("blocked_status");
  });

  it("delivery state is blocked_no_booking when booking missing", () => {
    const report = buildCampaignDeliveryReportRow({
      campaign: baseCampaign(),
      bookings: [],
      platformDeliveryEnabled: true,
      now: NOW,
    });
    expect(report.deliveryState).toBe("blocked_no_booking");
  });

  it("delivery state is delivering when all structural checks and flags on", () => {
    const evalResult = evaluateSponsoredDelivery({
      flags: FLAGS_ON,
      campaign: {
        status: "active",
        startDate: "2026-06-01T00:00:00.000Z",
        endDate: "2026-06-30T23:59:59.000Z",
        advertiserName: "PulseVerse Health",
        description: "Approved creative copy.",
        mediaUrl: "https://cdn.example.com/ad.jpg",
        ctaLabel: "Learn More",
        ctaUrl: "https://pulseverse.app/advertisers",
        budgetSpent: 0,
        budgetTotal: 1000,
      },
      booking: { status: "active", startAt: baseBooking.startAt, endAt: baseBooking.endAt },
      placement: {
        key: "in_feed_sponsored",
        isActive: true,
        surface: "feed",
        device: "mobile",
      },
      now: NOW,
    });
    expect(evalResult.state).toBe("delivering");
  });

  it("strips internal fields from sponsor-safe report", () => {
    const campaign = baseCampaign();
    const report = buildCampaignDeliveryReportRow({
      campaign,
      bookings: [baseBooking],
      platformDeliveryEnabled: false,
      now: NOW,
    });
    const sponsor = buildSponsorSafeReportFromCampaign({ campaign, report });
    expect(sponsorSafeReportHasInternalFields(sponsor as unknown as Record<string, unknown>)).toBe(false);
    expect(JSON.stringify(sponsor)).not.toContain("internal");
    expect(JSON.stringify(sponsor)).not.toContain("budget");
    expect(JSON.stringify(sponsor)).not.toContain(baseBooking.notes);
  });

  it("CSV export contains expected safe fields", () => {
    const report = buildCampaignDeliveryReportRow({
      campaign: baseCampaign(),
      bookings: [baseBooking],
      platformDeliveryEnabled: false,
      now: NOW,
    });
    const csv = deliveryReportCsvString([toDeliveryReportCsvRow(report)]);
    expect(csv).toContain("campaign_id");
    expect(csv).toContain("delivery_state");
    expect(csv).toContain("last_impression_at");
    expect(csv).not.toContain("internal_notes");
  });

  it("unsafe CTA marks launch readiness as requires review", () => {
    const campaign = baseCampaign({ ctaUrl: "javascript:alert(1)" });
    const report = buildCampaignDeliveryReportRow({
      campaign,
      bookings: [baseBooking],
      platformDeliveryEnabled: false,
      now: NOW,
    });
    const readiness = buildLaunchReadinessChecklist({ campaign, report, now: NOW });
    expect(readiness.status).toBe("requires_review");
    expect(readiness.items.find((i) => i.id === "cta_safe")?.passed).toBe(false);
  });

  it("placeholder creative marks launch readiness not ready", () => {
    const campaign = baseCampaign({
      mediaUrl: CAMPAIGN_PLANNING_MEDIA_URL,
      ctaUrl: CAMPAIGN_PLANNING_CTA_URL,
      description: "placeholder planning copy",
    });
    const report = buildCampaignDeliveryReportRow({
      campaign,
      bookings: [baseBooking],
      platformDeliveryEnabled: false,
      now: NOW,
    });
    expect(isPlaceholderCreative(campaign.mediaUrl, campaign.ctaUrl, campaign.description)).toBe(true);
    const readiness = buildLaunchReadinessChecklist({ campaign, report, now: NOW });
    expect(readiness.items.find((i) => i.id === "no_placeholder")?.passed).toBe(false);
    expect(readiness.status).toBe("requires_review");
  });

  it("marks missing CTA as unsafe", () => {
    expect(assessCtaSafety("", "").ok).toBe(false);
  });
});

describe("sponsored delivery reporting permissions matrix", () => {
  it("analyst role includes partnerships.read for sponsor report routes", async () => {
    const { hasStaffPermission } = await import("@/lib/staffPermissions-shared");
    expect(hasStaffPermission(["analyst"], "partnerships.read")).toBe(true);
    expect(hasStaffPermission(["analyst"], "campaigns.write")).toBe(false);
    expect(hasStaffPermission(["marketing"], "partnerships.read")).toBe(true);
    expect(hasStaffPermission(["moderator"], "partnerships.read")).toBe(false);
  });
});
