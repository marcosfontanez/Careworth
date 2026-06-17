import { describe, expect, it } from "vitest";

import {
  areDeliveryFlagsEnabled,
  createSessionDeduper,
  evaluateSponsoredDelivery,
  isCampaignDeliveryEligible,
  isSafeHttpUrl,
  sanitizeDeliveryCtaUrl,
  toSafeDeliveryPayload,
  type CampaignDeliveryInputs,
  type DeliveryFlagState,
} from "./sponsored-placement-delivery-shared";

const FLAGS_OFF: DeliveryFlagState = {
  sponsoredPostsEnabled: false,
  mobilePlacementDeliveryEnabled: false,
  platformDeliveryEnabled: false,
};

const FLAGS_ON: DeliveryFlagState = {
  sponsoredPostsEnabled: true,
  mobilePlacementDeliveryEnabled: true,
  platformDeliveryEnabled: true,
};

const NOW = new Date("2026-06-15T12:00:00.000Z");

function baseCampaign(overrides: Partial<CampaignDeliveryInputs> = {}): CampaignDeliveryInputs {
  return {
    status: "active",
    startDate: "2026-06-01T00:00:00.000Z",
    endDate: "2026-06-30T23:59:59.000Z",
    advertiserName: "PulseVerse Health",
    description: "Internal test placement.",
    mediaUrl: "https://cdn.example.com/ad.jpg",
    ctaLabel: "Learn More",
    ctaUrl: "https://pulseverse.app/advertisers",
    budgetSpent: 0,
    budgetTotal: 1000,
    ...overrides,
  };
}

const baseBooking = {
  status: "active" as const,
  startAt: "2026-06-01T00:00:00.000Z",
  endAt: "2026-06-30T23:59:59.000Z",
};

const basePlacement = {
  key: "in_feed_sponsored",
  isActive: true,
  surface: "feed",
  device: "mobile",
};

describe("sponsored placement delivery", () => {
  it("flags off returns no ad", () => {
    const evalResult = evaluateSponsoredDelivery({
      flags: FLAGS_OFF,
      campaign: baseCampaign(),
      booking: baseBooking,
      placement: basePlacement,
      now: NOW,
    });
    expect(evalResult.eligible).toBe(false);
    expect(evalResult.state).toBe("eligible_flags_off");
  });

  it("campaign draft returns no ad", () => {
    const evalResult = evaluateSponsoredDelivery({
      flags: FLAGS_ON,
      campaign: baseCampaign({ status: "draft" }),
      booking: baseBooking,
      placement: basePlacement,
      now: NOW,
    });
    expect(evalResult.eligible).toBe(false);
    expect(evalResult.state).toBe("blocked_status");
  });

  it("campaign paused returns no ad", () => {
    expect(isCampaignDeliveryEligible(baseCampaign({ status: "paused" }), NOW).ok).toBe(false);
  });

  it("campaign active but outside date range returns no ad", () => {
    const evalResult = evaluateSponsoredDelivery({
      flags: FLAGS_ON,
      campaign: baseCampaign({
        startDate: "2026-07-01T00:00:00.000Z",
        endDate: "2026-07-31T23:59:59.000Z",
      }),
      booking: baseBooking,
      placement: basePlacement,
      now: NOW,
    });
    expect(evalResult.eligible).toBe(false);
    expect(evalResult.state).toBe("blocked_dates");
  });

  it("active campaign with no booking returns no ad", () => {
    const evalResult = evaluateSponsoredDelivery({
      flags: FLAGS_ON,
      campaign: baseCampaign(),
      booking: null,
      placement: basePlacement,
      now: NOW,
    });
    expect(evalResult.eligible).toBe(false);
    expect(evalResult.state).toBe("blocked_no_booking");
  });

  it("booking outside date range returns no ad", () => {
    const evalResult = evaluateSponsoredDelivery({
      flags: FLAGS_ON,
      campaign: baseCampaign(),
      booking: {
        status: "active",
        startAt: "2026-07-01T00:00:00.000Z",
        endAt: "2026-07-31T23:59:59.000Z",
      },
      placement: basePlacement,
      now: NOW,
    });
    expect(evalResult.eligible).toBe(false);
    expect(evalResult.state).toBe("blocked_booking");
  });

  it("inactive placement returns blocked_placement", () => {
    const evalResult = evaluateSponsoredDelivery({
      flags: FLAGS_ON,
      campaign: baseCampaign(),
      booking: baseBooking,
      placement: { ...basePlacement, isActive: false },
      now: NOW,
    });
    expect(evalResult.eligible).toBe(false);
    expect(evalResult.state).toBe("blocked_placement");
  });

  it("valid campaign + booking + flags on returns safe payload", () => {
    const evalResult = evaluateSponsoredDelivery({
      flags: FLAGS_ON,
      campaign: baseCampaign(),
      booking: baseBooking,
      placement: basePlacement,
      now: NOW,
    });
    expect(evalResult.eligible).toBe(true);
    expect(evalResult.state).toBe("delivering");
    expect(areDeliveryFlagsEnabled(FLAGS_ON)).toBe(true);

    const payload = toSafeDeliveryPayload({
      campaignId: "11111111-1111-4111-8111-111111111111",
      bookingId: "22222222-2222-4222-8222-222222222222",
      placementId: "33333333-3333-4333-8333-333333333333",
      advertiserName: "PulseVerse Health",
      advertiserLogo: null,
      headline: "In-feed test",
      description: "Internal test placement.",
      mediaUrl: "https://cdn.example.com/ad.jpg",
      ctaLabel: "Learn More",
      ctaUrl: "https://pulseverse.app/advertisers",
      disclosureLabel: "Sponsored",
    });
    expect(payload?.disclosureLabel).toBe("Sponsored");
  });

  it("internal fields are not exposed in delivery response", () => {
    const payload = toSafeDeliveryPayload({
      campaignId: "11111111-1111-4111-8111-111111111111",
      bookingId: "22222222-2222-4222-8222-222222222222",
      placementId: "33333333-3333-4333-8333-333333333333",
      advertiserName: "Brand",
      headline: "Headline",
      description: "Body",
      mediaUrl: "https://cdn.example.com/ad.jpg",
      ctaLabel: "Go",
      ctaUrl: "https://example.com",
      budget_total: 9999,
      internal_notes: "secret",
    });
    expect(payload).toBeNull();
  });

  it("unsafe CTA URL is rejected", () => {
    expect(isSafeHttpUrl("javascript:alert(1)")).toBe(false);
    expect(sanitizeDeliveryCtaUrl("javascript:alert(1)")).toBeNull();
    expect(
      toSafeDeliveryPayload({
        campaignId: "11111111-1111-4111-8111-111111111111",
        bookingId: "22222222-2222-4222-8222-222222222222",
        placementId: "33333333-3333-4333-8333-333333333333",
        advertiserName: "Brand",
        headline: "Headline",
        description: "Body",
        mediaUrl: "https://cdn.example.com/ad.jpg",
        ctaLabel: "Go",
        ctaUrl: "javascript:alert(1)",
      }),
    ).toBeNull();
  });

  it("impression tracking increments once per session key", () => {
    const deduper = createSessionDeduper();
    expect(deduper.once("campaign-a")).toBe(true);
    expect(deduper.once("campaign-a")).toBe(false);
    expect(deduper.once("campaign-b")).toBe(true);
  });
});
