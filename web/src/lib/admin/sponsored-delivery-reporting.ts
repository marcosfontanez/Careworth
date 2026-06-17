import "server-only";

import { loadAllBookings, loadPlacementCatalog } from "@/lib/admin/placement-booking";
import type { PlacementBookingRow } from "@/lib/admin/placement-booking-shared";
import { createAdminDataSupabaseClient } from "@/lib/supabase/admin-data";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import {
  applySponsoredReportingFilters,
  buildCampaignDeliveryReportRow,
  buildLaunchReadinessChecklist,
  buildSponsorSafeReportFromCampaign,
  parseSponsoredReportingFilters,
  type CampaignDeliveryReportRow,
  type CampaignReportingInputs,
  type LaunchReadinessSummary,
  type SponsorSafeReport,
  type SponsoredReportingFilters,
} from "@/lib/sponsored-delivery-reporting-shared";
import { isSponsoredPlacementDeliveryEnabled } from "@/lib/admin/sponsored-placement-delivery";

export {
  applySponsoredReportingFilters,
  buildCampaignDeliveryReportRow,
  buildLaunchReadinessChecklist,
  buildSponsorSafeReportFromCampaign,
  calculateCtr,
  dashboardAlertTags,
  deliveryReportCsvString,
  DELIVERY_STATE_LABELS,
  parseSponsoredReportingFilters,
  toDeliveryReportCsvRow,
  type CampaignDeliveryReportRow,
  type DeliveryReportCsvRow,
  type LaunchReadinessSummary,
  type SponsorSafeReport,
  type SponsoredReportingFilters,
} from "@/lib/sponsored-delivery-reporting-shared";

async function loadCampaignReportingInputs(): Promise<CampaignReportingInputs[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createAdminDataSupabaseClient();
    const { data, error } = await supabase
      .from("ad_campaigns")
      .select(
        "id, advertiser_name, title, description, media_url, cta_label, cta_url, start_date, end_date, status, impressions, clicks, budget_total, budget_spent, metadata",
      )
      .order("updated_at", { ascending: false })
      .limit(500);
    if (error || !data) return [];
    return (data as Array<Record<string, unknown>>).map((row) => {
      const meta = (row.metadata ?? {}) as Record<string, unknown>;
      const campaignName =
        (typeof meta.campaign_name === "string" && meta.campaign_name.trim()) ||
        String(row.title ?? "Untitled campaign").trim();
      return {
        id: row.id as string,
        campaignName,
        status: String(row.status ?? "draft"),
        sponsor: String(row.advertiser_name ?? ""),
        description: String(row.description ?? ""),
        mediaUrl: String(row.media_url ?? ""),
        ctaLabel: String(row.cta_label ?? ""),
        ctaUrl: String(row.cta_url ?? ""),
        start: String(row.start_date ?? "").slice(0, 10),
        end: String(row.end_date ?? "").slice(0, 10),
        impressions: Number(row.impressions ?? 0),
        clicks: Number(row.clicks ?? 0),
        metadata: meta,
        budgetSpent: Number(row.budget_spent ?? 0),
        budgetTotal: Number(row.budget_total ?? 0),
      };
    });
  } catch {
    return [];
  }
}

export async function loadCampaignDeliveryReport(
  campaign: {
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
  },
  bookings: PlacementBookingRow[],
): Promise<{
  report: CampaignDeliveryReportRow;
  launchReadiness: LaunchReadinessSummary;
  sponsorReport: SponsorSafeReport;
}> {
  const platformEnabled = await isSponsoredPlacementDeliveryEnabled();
  const inputs: CampaignReportingInputs = {
    id: campaign.id,
    campaignName: campaign.campaignName,
    status: campaign.status,
    sponsor: campaign.sponsor,
    description: campaign.description,
    mediaUrl: campaign.mediaUrl,
    ctaLabel: campaign.ctaLabel,
    ctaUrl: campaign.ctaUrl,
    start: campaign.start,
    end: campaign.end,
    impressions: campaign.impressions,
    clicks: campaign.clicks,
    metadata: campaign.metadata,
    budgetSpent: campaign.budgetSpent,
    budgetTotal: campaign.budgetTotal,
  };
  const report = buildCampaignDeliveryReportRow({
    campaign: inputs,
    bookings,
    platformDeliveryEnabled: platformEnabled,
  });
  const launchReadiness = buildLaunchReadinessChecklist({ campaign: inputs, report });
  const sponsorReport = buildSponsorSafeReportFromCampaign({ campaign: inputs, report });
  return { report, launchReadiness, sponsorReport };
}

export async function loadSponsoredDeliveryReportingDashboard(
  filters: SponsoredReportingFilters,
): Promise<{
  rows: CampaignDeliveryReportRow[];
  total: number;
  platformDeliveryEnabled: boolean;
  placements: { key: string; name: string; surface: string }[];
}> {
  const [campaignInputs, bookings, platformEnabled, catalog] = await Promise.all([
    loadCampaignReportingInputs(),
    loadAllBookings({
      surface: "",
      status: "all",
      from: "",
      to: "",
      availableOnly: false,
      conflictOnly: false,
    }),
    isSponsoredPlacementDeliveryEnabled(),
    loadPlacementCatalog(true),
  ]);

  const bookingsByCampaign = new Map<string, PlacementBookingRow[]>();
  for (const b of bookings) {
    const list = bookingsByCampaign.get(b.campaignId) ?? [];
    list.push(b);
    bookingsByCampaign.set(b.campaignId, list);
  }

  const rows: CampaignDeliveryReportRow[] = [];
  for (const c of campaignInputs) {
    rows.push(
      buildCampaignDeliveryReportRow({
        campaign: c,
        bookings: bookingsByCampaign.get(c.id) ?? [],
        platformDeliveryEnabled: platformEnabled,
      }),
    );
  }

  const filtered = applySponsoredReportingFilters(rows, filters);
  return {
    rows: filtered,
    total: filtered.length,
    platformDeliveryEnabled: platformEnabled,
    placements: catalog.map((p) => ({ key: p.key, name: p.name, surface: p.surface })),
  };
}
