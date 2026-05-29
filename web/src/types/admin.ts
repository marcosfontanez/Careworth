export type UserStatus = "active" | "suspended" | "banned" | "pending";
export type ReportStatus = "pending" | "under_review" | "resolved" | "escalated";
export type ReportType =
  | "post"
  | "comment"
  | "profile"
  | "live"
  | "pulse"
  | "circle_thread"
  | "circle_reply"
  | "stream_message";
export type ReportReason =
  | "harassment"
  | "misinformation"
  | "hate_abuse"
  | "impersonation"
  | "spam"
  | "nudity"
  | "unsafe_medical"
  | "copyright"
  | "scam"
  | "live_incident"
  | "potential_phi";
export type Severity = "low" | "medium" | "high" | "critical";
export type AppealStatus = "open" | "under_review" | "accepted" | "denied";
export type LiveStatus = "live" | "ended" | "flagged";

export interface AdminUser {
  id: string;
  displayName: string;
  profession: string;
  specialty: string;
  avatarUrl?: string;
  status: UserStatus;
  reportsCount: number;
  strikes: number;
  joinedAt: string;
  lastActive: string;
  country: string;
}

export interface ReportRow {
  id: string;
  type: ReportType;
  targetId: string;
  preview: string;
  /** Full reporter note / fallback description */
  details: string;
  /** Staff-only audit trail (when column exists) */
  staffNotes?: string | null;
  reporterName: string;
  reporterId: string;
  subjectName: string;
  subjectDisplayName: string;
  subjectMeta: string;
  reason: ReportReason;
  status: ReportStatus;
  severity: Severity;
  createdAt: string;
}

export interface ModerationItem {
  id: string;
  type: ReportType;
  title: string;
  excerpt: string;
  subject: string;
  flags: number;
  createdAt: string;
}

export interface CircleAdmin {
  id: string;
  name: string;
  slug: string;
  members: number;
  posts24h: number;
  featuredOrder: number | null;
  trendScore: number;
}

export interface LiveSessionRow {
  id: string;
  title: string;
  host: string;
  viewers: number;
  peak: number;
  status: LiveStatus;
  startedAt: string;
  flags: number;
}

export interface AppealRow {
  id: string;
  userName: string;
  actionTaken: string;
  requestedAt: string;
  status: AppealStatus;
  notes: string;
}

export interface CampaignRow {
  id: string;
  sponsor: string;
  placement: string;
  start: string;
  end: string;
  impressions: number;
  clicks: number;
  ctr: number;
  status: string;
  /** Monetary budget fields when present on row */
  budgetTotal: number;
  budgetSpent: number;
  /** Linear flight pacing vs spend (null when dates/budget unusable) */
  pacingNote: string | null;
}

export interface CreatorRow {
  id: string;
  handle: string;
  profession_display: string;
  followers: number;
  liveHours: number;
  verified: boolean;
  score: number;
  post_count: number;
  updated_at: string;
}

/** Marketing site contact / inquiry rows (`064` + CRM-lite `189`). */
export type MarketingContactLeadRow = {
  id: string;
  name: string;
  email: string;
  message: string;
  created_at: string;
  host: string | null;
  topic: string | null;
  status: string;
  owner_id: string | null;
  owner_display_name: string | null;
  internal_notes: string | null;
  last_contacted_at: string | null;
};

export type PlacementInventoryRow = {
  placement: string;
  campaignCount: number;
  activeCampaignCount: number;
  impressionsSum: number;
  clicksSum: number;
  ctrPct: string;
  statuses: string;
};

export type AdminNotificationItem = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  at: string;
};

export type AdminNotificationDigest = {
  items: AdminNotificationItem[];
  unreadCount: number;
  /** Pending appeals (for sidebar badge). */
  pendingAppealsCount: number;
};
