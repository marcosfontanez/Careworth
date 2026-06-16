export const CAMPAIGN_STATUSES = ["draft", "active", "paused", "completed", "cancelled"] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const CAMPAIGN_SORTS = ["newest", "start_date", "end_date", "status", "advertiser"] as const;
export type CampaignSort = (typeof CAMPAIGN_SORTS)[number];

export const SUGGESTED_PLACEMENTS = [
  "In-feed sponsored",
  "Feed hero",
  "Live stream bumper",
  "Circle spotlight",
  "Profile banner",
  "Pre-roll interstitial",
] as const;

export const CAMPAIGN_PLANNING_MEDIA_URL = "/brand/pulseverse-logo-lockup.png";
export const CAMPAIGN_PLANNING_CTA_URL = "https://pulseverse.app/advertisers";

export const INVENTORY_PLANNING_DISCLAIMER =
  "Placement availability is currently an internal planning estimate. This campaign record does not guarantee booked delivery until inventory booking is implemented.";

export type CampaignEditorFilters = {
  q: string;
  status: CampaignStatus | "all";
  placement: string;
  ownerId: string;
  from: string;
  to: string;
  sort: CampaignSort;
};

export type AdminCampaignListRow = {
  id: string;
  campaignName: string;
  sponsor: string;
  placement: string;
  start: string;
  end: string;
  impressions: number;
  clicks: number;
  ctr: number;
  status: string;
  budgetTotal: number;
  budgetSpent: number;
  pacingNote: string | null;
  ownerId: string | null;
  ownerDisplayName: string | null;
  leadId: string | null;
  objective: string | null;
  updatedAt: string | null;
};

export type AdminCampaignDetail = AdminCampaignListRow & {
  description: string;
  mediaUrl: string;
  ctaLabel: string;
  ctaUrl: string;
  targetRoles: string[];
  targetSpecialties: string[];
  targetStates: string[];
  cpmRate: number;
  internalNotes: string | null;
  metadata: Record<string, unknown>;
  createdBy: string | null;
  createdAt: string | null;
  leadName: string | null;
  leadEmail: string | null;
  targetAudienceNotes: string | null;
  creativeNotes: string | null;
};

export type CampaignAuditRow = {
  id: string;
  createdAt: string;
  action: string;
  staffDisplayName: string;
  metadata: Record<string, unknown>;
};

export type CampaignOwnerOption = { id: string; label: string };

export type CampaignLeadPrefill = {
  leadId: string;
  advertiserName: string;
  contactName: string;
  contactEmail: string;
  sourceHost: string | null;
  internalNotes: string | null;
  topic: string | null;
};

export type CampaignInput = {
  campaignName: string;
  advertiserName: string;
  placement: string;
  status: CampaignStatus;
  startDate: string;
  endDate: string;
  objective: string;
  budgetTotal?: number;
  ownerId?: string | null;
  leadId?: string | null;
  internalNotes?: string | null;
  targetAudienceNotes?: string | null;
  creativeNotes?: string | null;
  description?: string;
  mediaUrl?: string;
  ctaUrl?: string;
  ctaLabel?: string;
  confirmLockedEdit?: boolean;
};

export function parseCampaignEditorFilters(
  input: Record<string, string | string[] | undefined>,
): CampaignEditorFilters {
  const pick = (key: string) => {
    const v = input[key];
    return typeof v === "string" ? v.trim() : "";
  };
  const statusRaw = pick("status");
  const status = CAMPAIGN_STATUSES.includes(statusRaw as CampaignStatus)
    ? (statusRaw as CampaignStatus)
    : "all";
  const sortRaw = pick("sort");
  const sort = CAMPAIGN_SORTS.includes(sortRaw as CampaignSort) ? (sortRaw as CampaignSort) : "newest";
  return {
    q: pick("q"),
    status,
    placement: pick("placement"),
    ownerId: pick("ownerId"),
    from: pick("from"),
    to: pick("to"),
    sort,
  };
}

export function toCampaignCsvRows(rows: AdminCampaignListRow[]) {
  return rows.map((c) => ({
    id: c.id,
    sponsor: c.sponsor,
    placement: c.placement,
    start: c.start,
    end: c.end,
    impressions: c.impressions,
    clicks: c.clicks,
    ctr: c.ctr,
    status: c.status,
    budgetTotal: c.budgetTotal,
    budgetSpent: c.budgetSpent,
    pacingNote: c.pacingNote,
  }));
}
