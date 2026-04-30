import type {
  AdminUser,
  AppealRow,
  CampaignRow,
  CircleAdmin,
  CreatorRow,
  LiveSessionRow,
  ModerationItem,
  ReportRow,
} from "@/types/admin";

export const dashboardKpis = [
  {
    key: "users",
    label: "Total users",
    value: "865.4K",
    delta: "+12.6%",
    trend: "up" as const,
    accent: "primary" as const,
  },
  {
    key: "dau",
    label: "DAU",
    value: "128.7K",
    delta: "+9.3%",
    trend: "up" as const,
    accent: "accent" as const,
  },
  {
    key: "live",
    label: "Live sessions",
    value: "3.7K",
    delta: "+18.1%",
    trend: "up" as const,
    accent: "violet" as const,
  },
  {
    key: "reports",
    label: "Open reports",
    value: "2.1K",
    delta: "-7.4%",
    trend: "down" as const,
    accent: "destructive" as const,
  },
  {
    key: "appeals",
    label: "Pending appeals",
    value: "286",
    delta: "-4.2%",
    trend: "down" as const,
    accent: "amber" as const,
  },
];

/** Moderation hub — top summary cards */
export const moderationOverviewKpis = [
  {
    key: "open",
    label: "Open reports",
    value: "327",
    delta: "+12.4%",
    trend: "up" as const,
    accent: "primary" as const,
  },
  {
    key: "review",
    label: "Needs review",
    value: "89",
    delta: "+8.7%",
    trend: "up" as const,
    accent: "accent" as const,
  },
  {
    key: "resolved",
    label: "Resolved today",
    value: "142",
    delta: "+18.2%",
    trend: "up" as const,
    accent: "violet" as const,
  },
  {
    key: "critical",
    label: "Critical alerts",
    value: "7",
    delta: "-12.5%",
    trend: "down" as const,
    accent: "destructive" as const,
  },
  {
    key: "avg",
    label: "Avg resolution",
    value: "2.4h",
    delta: "-15%",
    trend: "down" as const,
    accent: "amber" as const,
  },
];

export const engagementOverviewWeek = [
  { day: "Mon", messages: 4120, reactions: 3050, shares: 880 },
  { day: "Tue", messages: 4680, reactions: 3390, shares: 910 },
  { day: "Wed", messages: 4920, reactions: 3580, shares: 940 },
  { day: "Thu", messages: 5210, reactions: 3710, shares: 1020 },
  { day: "Fri", messages: 4980, reactions: 3620, shares: 990 },
  { day: "Sat", messages: 3840, reactions: 2910, shares: 760 },
  { day: "Sun", messages: 3650, reactions: 2780, shares: 720 },
];

export const growthSeries = [
  { month: "Jan", users: 92000 },
  { month: "Feb", users: 95200 },
  { month: "Mar", users: 98800 },
  { month: "Apr", users: 102400 },
  { month: "May", users: 108900 },
  { month: "Jun", users: 115200 },
  { month: "Jul", users: 121800 },
  { month: "Aug", users: 128540 },
];

export const audienceDonut = [
  { name: "Physicians", value: 48.6, fill: "var(--chart-1)" },
  { name: "Nurses", value: 26.3, fill: "var(--chart-2)" },
  { name: "Students", value: 12.7, fill: "var(--chart-3)" },
  { name: "Allied health", value: 9.4, fill: "var(--chart-4)" },
  { name: "Researchers", value: 3.0, fill: "var(--chart-5)" },
];

export const mockUsers: AdminUser[] = [
  {
    id: "u1",
    displayName: "Dr. Alex Morgan",
    profession: "Physician",
    specialty: "Cardiology",
    status: "active",
    reportsCount: 0,
    strikes: 0,
    joinedAt: "2024-03-12",
    lastActive: "2h ago",
    country: "US",
  },
  {
    id: "u2",
    displayName: "Jordan Lee, RN",
    profession: "RN",
    specialty: "ICU",
    status: "active",
    reportsCount: 1,
    strikes: 0,
    joinedAt: "2024-06-01",
    lastActive: "15m ago",
    country: "CA",
  },
  {
    id: "u3",
    displayName: "Sam Okonkwo",
    profession: "Pharmacist",
    specialty: "Clinical pharmacy",
    status: "suspended",
    reportsCount: 4,
    strikes: 2,
    joinedAt: "2023-11-20",
    lastActive: "3d ago",
    country: "UK",
  },
  {
    id: "u4",
    displayName: "Priya Patel",
    profession: "Radiology Tech",
    specialty: "MRI",
    status: "active",
    reportsCount: 0,
    strikes: 0,
    joinedAt: "2025-01-08",
    lastActive: "1h ago",
    country: "US",
  },
  {
    id: "u5",
    displayName: "Chris Miller",
    profession: "CNA/PCT",
    specialty: "Med-surg",
    status: "banned",
    reportsCount: 11,
    strikes: 3,
    joinedAt: "2023-04-02",
    lastActive: "—",
    country: "US",
  },
];

export const mockReports: ReportRow[] = [
  {
    id: "r1",
    type: "post",
    targetId: "p_88a",
    preview: "Unverified supplement stack that claims to replace statins…",
    details: "Unverified supplement stack that claims to replace statins…",
    reporterName: "Mod team",
    reporterId: "rep1",
    subjectName: "user_2941",
    subjectDisplayName: "Sample post",
    subjectMeta: "Post",
    reason: "unsafe_medical",
    status: "pending",
    severity: "high",
    createdAt: "2026-04-27T14:22:00Z",
  },
  {
    id: "r2",
    type: "comment",
    targetId: "c_12f",
    preview: "Targeted harassment toward night-shift thread…",
    details: "Targeted harassment toward night-shift thread…",
    reporterName: "RN_maya",
    reporterId: "rep2",
    subjectName: "user_8812",
    subjectDisplayName: "Comment excerpt",
    subjectMeta: "Comment",
    reason: "harassment",
    status: "under_review",
    severity: "medium",
    createdAt: "2026-04-27T13:05:00Z",
  },
  {
    id: "r3",
    type: "live",
    targetId: "lv_03",
    preview: "AMA: Interventional Cards — chat escalation",
    details: "AMA: Interventional Cards — chat escalation",
    reporterName: "system_flag",
    reporterId: "rep3",
    subjectName: "Dr. Alex Morgan",
    subjectDisplayName: "Live session",
    subjectMeta: "Live stream",
    reason: "live_incident",
    status: "under_review",
    severity: "critical",
    createdAt: "2026-04-27T12:40:00Z",
  },
  {
    id: "r4",
    type: "pulse",
    targetId: "pu_901",
    preview: "Screenshot appears to include identifiable patient wristband…",
    details: "Screenshot appears to include identifiable patient wristband…",
    reporterName: "user_4401",
    reporterId: "rep4",
    subjectName: "user_4401",
    subjectDisplayName: "Pulse update",
    subjectMeta: "Pulse",
    reason: "potential_phi",
    status: "pending",
    severity: "critical",
    createdAt: "2026-04-27T11:18:00Z",
  },
  {
    id: "r5",
    type: "circle_thread",
    targetId: "th_22",
    preview: "Spam recruitment links in Nursing circle…",
    details: "Spam recruitment links in Nursing circle…",
    reporterName: "circle_mod",
    reporterId: "rep5",
    subjectName: "user_9920",
    subjectDisplayName: "Thread",
    subjectMeta: "Circle thread",
    reason: "spam",
    status: "resolved",
    severity: "low",
    createdAt: "2026-04-26T09:00:00Z",
  },
];

export const mockModerationQueue: ModerationItem[] = [
  {
    id: "m1",
    type: "post",
    title: "Post · video",
    excerpt: "ER shift story — graphic description flagged by viewers",
    subject: "RT_leo",
    flags: 14,
    createdAt: "2026-04-27T15:00:00Z",
  },
  {
    id: "m2",
    type: "comment",
    title: "Comment chain",
    excerpt: "Misinformation on antibiotics duration",
    subject: "user_2210",
    flags: 6,
    createdAt: "2026-04-27T14:12:00Z",
  },
  {
    id: "m3",
    type: "live",
    title: "Live · AMA",
    excerpt: "Off-label device discussion",
    subject: "Dr. Alex Morgan",
    flags: 3,
    createdAt: "2026-04-27T13:50:00Z",
  },
];

export const mockCircles: CircleAdmin[] = [
  {
    id: "c1",
    name: "Funny Medical Memes",
    slug: "memes",
    members: 12400,
    posts24h: 820,
    featuredOrder: 1,
    trendScore: 98,
  },
  {
    id: "c2",
    name: "Night Shift",
    slug: "night-shift",
    members: 9100,
    posts24h: 410,
    featuredOrder: 2,
    trendScore: 92,
  },
  {
    id: "c3",
    name: "ICU",
    slug: "icu",
    members: 7600,
    posts24h: 290,
    featuredOrder: null,
    trendScore: 88,
  },
  {
    id: "c4",
    name: "Pharmacy",
    slug: "pharmacy",
    members: 5400,
    posts24h: 210,
    featuredOrder: 5,
    trendScore: 81,
  },
];

export const mockLiveSessions: LiveSessionRow[] = [
  {
    id: "lv1",
    title: "Ask Me Anything: Interventional Cardiology",
    host: "Dr. Alex Morgan",
    viewers: 842,
    peak: 1204,
    status: "live",
    startedAt: "2026-04-27T18:00:00Z",
    flags: 0,
  },
  {
    id: "lv2",
    title: "New grad residency prep · Q&A",
    host: "Jordan Lee, RN",
    viewers: 216,
    peak: 340,
    status: "live",
    startedAt: "2026-04-27T17:30:00Z",
    flags: 1,
  },
  {
    id: "lv3",
    title: "Wellness after 12s",
    host: "Priya Patel",
    viewers: 0,
    peak: 128,
    status: "ended",
    startedAt: "2026-04-27T16:00:00Z",
    flags: 0,
  },
];

export const mockAppeals: AppealRow[] = [
  {
    id: "a1",
    userName: "Sam Okonkwo",
    actionTaken: "7-day restriction — unsafe medical advice",
    requestedAt: "2026-04-26T10:00:00Z",
    status: "open",
    notes: "User claims context was educational with disclaimers.",
  },
  {
    id: "a2",
    userName: "Chris Miller",
    actionTaken: "Permanent ban — repeated harassment",
    requestedAt: "2026-04-20T08:00:00Z",
    status: "denied",
    notes: "Pattern confirmed across three reports.",
  },
  {
    id: "a3",
    userName: "user_anon_12",
    actionTaken: "Content removal — pulse update",
    requestedAt: "2026-04-25T14:30:00Z",
    status: "under_review",
    notes: "Awaiting senior mod.",
  },
];

export const mockCampaigns: CampaignRow[] = [
  {
    id: "cp1",
    sponsor: "ScrubTech Co.",
    placement: "Feed · sponsored card",
    start: "2026-04-01",
    end: "2026-04-30",
    impressions: 2_400_000,
    ctr: 1.85,
  },
  {
    id: "cp2",
    sponsor: "Veridian Diagnostics",
    placement: "Circles · banner",
    start: "2026-03-15",
    end: "2026-05-15",
    impressions: 890_000,
    ctr: 2.12,
  },
];

export const mockCreators: CreatorRow[] = [
  {
    id: "cr1",
    handle: "cards_with_alex",
    profession_display: "Physician · Cards",
    followers: 128000,
    liveHours: 142,
    verified: true,
    score: 96,
  },
  {
    id: "cr2",
    handle: "nightshift_nurse_j",
    profession_display: "RN · ER",
    followers: 45200,
    liveHours: 88,
    verified: true,
    score: 91,
  },
  {
    id: "cr3",
    handle: "pharm_daily",
    profession_display: "Pharmacist",
    followers: 21900,
    liveHours: 34,
    verified: false,
    score: 82,
  },
];

export const publicStats = [
  { label: "Healthcare pros", value: "10K+", sub: "and growing" },
  { label: "Active circles", value: "500+", sub: "culture & specialty rooms" },
  { label: "Live sessions", value: "200+", sub: "this quarter" },
  { label: "Countries", value: "50+", sub: "global community" },
];

export const insightsOverviewKpis = [
  { label: "Total users", value: "128,540" },
  { label: "DAU", value: "24.9K" },
  { label: "WAU", value: "61.2K" },
  { label: "MAU", value: "94.1K" },
  { label: "Avg session", value: "12m 45s" },
  { label: "Posts (30d)", value: "1.02M" },
  { label: "Live sessions", value: "12.4K" },
  { label: "Circles", value: "518" },
  { label: "Open reports", value: "87" },
  { label: "New users (MoM)", value: "+18%" },
];

export const topCirclesByActivity = [
  { name: "Cardiology", value: 92 },
  { name: "Emergency medicine", value: 86 },
  { name: "Nursing", value: 81 },
  { name: "Pharmacy", value: 74 },
  { name: "Wellness", value: 68 },
];

export const trustSafetyMetrics = [
  { label: "Avg turnaround", value: "2h 14m" },
  { label: "Suspensions (30d)", value: "214" },
  { label: "Appeals filed", value: "38" },
  { label: "Takedown rate", value: "4.1%" },
];

export const recentAdminActivity = [
  {
    id: "act1",
    summary: "Report r4 marked under review — potential PHI in Pulse update",
    actor: "mod_sasha",
    at: "2026-04-27T15:12:00Z",
  },
  {
    id: "act2",
    summary: "Live lv1 cleared after AMA chat cooldown",
    actor: "mod_jo",
    at: "2026-04-27T14:48:00Z",
  },
  {
    id: "act3",
    summary: "User u3 suspension extended + appeal note added",
    actor: "lead_taylor",
    at: "2026-04-27T13:05:00Z",
  },
  {
    id: "act4",
    summary: "Circle “Pharmacy” featured order bumped to slot 5",
    actor: "ops_api",
    at: "2026-04-27T11:40:00Z",
  },
];

export const dashboardAlertStrip = [
  { label: "Critical reports", value: "4", hint: "PHI · live incidents" },
  { label: "Open appeals", value: "12", hint: "awaiting senior mod" },
  { label: "Flagged live", value: "1", hint: "review window" },
  { label: "Trending circle", value: "Memes", hint: "+18% joins 24h" },
];

export const reportQueueSummary = [
  { status: "pending", count: 32 },
  { status: "under_review", count: 18 },
  { status: "resolved", count: 1193 },
];

export const circlesOpsSummary = [
  { label: "Total circles", value: "518" },
  { label: "Featured slots filled", value: "6" },
  { label: "Top growth 24h", value: "+12% ICU" },
];

export const liveOpsSummary = [
  { label: "Live now", value: "2" },
  { label: "Peak viewers (24h)", value: "12.4K" },
  { label: "Flags open", value: "1" },
];

export const appealsOpsSummary = [
  { label: "Open", value: "12" },
  { label: "Under review", value: "7" },
  { label: "Resolved (30d)", value: "148" },
];

/** Dashboard trust & safety — donut + sources */
export const reportReasonsMix = [
  { name: "Harassment", value: 28, fill: "var(--chart-1)" },
  { name: "Misinformation", value: 22, fill: "var(--chart-2)" },
  { name: "Spam", value: 18, fill: "var(--chart-3)" },
  { name: "Unsafe medical", value: 14, fill: "var(--chart-4)" },
  { name: "PHI risk", value: 10, fill: "var(--chart-5)" },
  { name: "Other", value: 8, fill: "rgba(148,163,184,0.5)" },
];

export const reportsBySource = [
  { source: "Live", count: 34 },
  { source: "Comments", count: 28 },
  { source: "Direct", count: 22 },
  { source: "Feed", count: 16 },
];

/** Moderator workload for admin dashboard (0–100) */
export const moderatorWorkload = [
  { id: "mod1", name: "Sasha Kim", load: 88 },
  { id: "mod2", name: "Jordan Ortiz", load: 74 },
  { id: "mod3", name: "Taylor Reeves", load: 62 },
  { id: "mod4", name: "Priya Nair", load: 45 },
];

export const systemHealthServices = [
  { name: "Web platform", status: "operational" as const },
  { name: "API & realtime", status: "operational" as const },
  { name: "Live streaming", status: "operational" as const },
  { name: "Media CDN", status: "operational" as const },
  { name: "Search", status: "operational" as const },
];
