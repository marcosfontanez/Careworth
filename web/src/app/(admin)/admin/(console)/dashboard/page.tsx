import Link from "next/link";

import { DashboardExportButton, type DashboardExportSnapshot } from "@/components/admin/dashboard-export-button";
import {
  AudienceDonutChart,
  EngagementOverviewChart,
  GrowthChart,
  ReportReasonsDonutChart,
  ReportsBySourceBarChart,
  TopCirclesBarChart,
} from "@/components/admin/insight-charts";
import {
  AdminOpsStrip,
  ModeratorWorkloadPanel,
  RecentActivityList,
  ReportPipelineSummary,
  SystemHealthChecklist,
} from "@/components/admin/dashboard-panels";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminPanelCard } from "@/components/admin/admin-panel-card";
import { KpiStatCard } from "@/components/admin/kpi-stat-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  buildDashboardOpsStrip,
  loadAdminCounts,
  loadAdminUsers,
  loadAudienceRoleMix,
  loadCircles,
  loadCriticalOpenReportsCount,
  loadEngagementWeekSeries,
  loadLive24hSnapshot,
  loadModerationSlaSnapshot,
  loadModeratorWorkloadSnapshot,
  loadProfileGrowthSeries,
  loadRecentAdminActivityFeed,
  loadReportPipelineSummary,
  loadReports,
  loadReportReasonsMix,
  loadReportsBySourceBars,
  loadSystemHealthSnapshot,
  loadTopCirclesActivityBars,
} from "@/lib/admin/queries";
import { formatCount } from "@/lib/admin/format";

export default async function AdminDashboardPage() {
  const [
    counts,
    liveReports,
    liveUsers,
    growthSeries,
    engagementWeek,
    audienceDonut,
    reportReasons,
    reportsBySource,
    topCircles,
    reportPipeline,
    recentActivity,
    moderatorWorkload,
    criticalOpen,
    health,
    liveSnap,
    modSla,
  ] = await Promise.all([
    loadAdminCounts(),
    loadReports(),
    loadAdminUsers(),
    loadProfileGrowthSeries(8),
    loadEngagementWeekSeries(),
    loadAudienceRoleMix(),
    loadReportReasonsMix(),
    loadReportsBySourceBars(),
    loadTopCirclesActivityBars(6),
    loadReportPipelineSummary(),
    loadRecentAdminActivityFeed(10),
    loadModeratorWorkloadSnapshot(),
    loadCriticalOpenReportsCount(),
    loadSystemHealthSnapshot(),
    loadLive24hSnapshot(),
    loadModerationSlaSnapshot(),
  ]);

  const circlesRanked = await loadCircles();
  const topCircle = circlesRanked[0];

  const kpiRow = [
    {
      key: "users",
      label: "Total users",
      value: formatCount(counts.users),
      delta: "database",
      trend: "up" as const,
      accent: "primary" as const,
    },
    {
      key: "dau",
      label: "DAU (24h est.)",
      value: formatCount(counts.dau24h),
      delta: "distinct users · analytics",
      trend: "up" as const,
      accent: "accent" as const,
    },
    {
      key: "live",
      label: "Live sessions",
      value: formatCount(counts.liveSessions),
      delta: "live now",
      trend: "up" as const,
      accent: "violet" as const,
    },
    {
      key: "reports",
      label: "Open reports",
      value: formatCount(counts.openReports),
      delta: "pending",
      trend: "down" as const,
      accent: "destructive" as const,
    },
    {
      key: "appeals",
      label: "Pending appeals",
      value: formatCount(counts.pendingAppeals),
      delta: "pending + in review",
      trend: "down" as const,
      accent: "amber" as const,
    },
    {
      key: "posts",
      label: "Posts (all time)",
      value: formatCount(counts.posts),
      delta: "public feed",
      trend: "up" as const,
      accent: "violet" as const,
    },
    {
      key: "comments",
      label: "Comments (all time)",
      value: formatCount(counts.comments),
      delta: "threads",
      trend: "up" as const,
      accent: "accent" as const,
    },
  ];

  const exportSnapshot: DashboardExportSnapshot = {
    exportedAt: new Date().toISOString(),
    kpis: kpiRow.map((k) => ({ key: k.key, label: k.label, value: k.value, delta: k.delta })),
    counts: {
      users: counts.users,
      dau24h: counts.dau24h,
      liveSessions: counts.liveSessions,
      openReports: counts.openReports,
      pendingAppeals: counts.pendingAppeals,
      circles: counts.circles,
      posts: counts.posts,
      comments: counts.comments,
    },
    notes:
      "JSON snapshot from admin dashboard — not a legal export; pair with Insights → Engagement CSV for partner reporting.",
  };

  const opsStrip = buildDashboardOpsStrip({
    criticalReports: criticalOpen,
    pendingAppeals: counts.pendingAppeals,
    liveFlagged: liveSnap.abnormal,
    topCircleName: topCircle?.name ?? null,
    topCircleMembers: topCircle?.members ?? 0,
  });

  const reportPreview = liveReports.length ? liveReports.slice(0, 4) : [];
  const userPreview = liveUsers.length ? liveUsers.slice(0, 5) : [];

  return (
    <div className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Dashboard" }]}
        title="Admin dashboard"
        description="Overview of platform health, engagement, and operations from Supabase."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="hidden rounded-lg border border-white/10 bg-white/3 px-3 py-1.5 text-xs text-muted-foreground md:inline">
              Charts aggregate local DB rows · analytics events power DAU
            </span>
            <DashboardExportButton snapshot={exportSnapshot} />
            <Button size="sm" className="bg-primary text-primary-foreground shadow-[0_0_24px_-8px_rgba(45,127,249,0.8)]" asChild>
              <Link href="/admin/insights">Insights &amp; analytics</Link>
            </Button>
          </div>
        }
      />
      <p className="text-xs leading-relaxed text-muted-foreground">
        {process.env.SUPABASE_SERVICE_ROLE_KEY ? (
          <>
            Data loads with <span className="text-foreground/90">SUPABASE_SERVICE_ROLE_KEY</span> (server-only).
            Staff routes stay gated in <code className="rounded bg-white/5 px-1 py-px">proxy.ts</code>; this matches
            production admin reads.
          </>
        ) : (
          <>
            <span className="font-medium text-amber-400">Set SUPABASE_SERVICE_ROLE_KEY</span> in{" "}
            <code className="rounded bg-white/5 px-1 py-px">.env.local</code> or Vercel — without it, loaders use
            your browser session and can miss rows under RLS. Your Supabase key is in Project Settings → API →
            service_role (never expose to the client).
          </>
        )}
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
        {kpiRow.map((k) => (
          <KpiStatCard
            key={k.key}
            label={k.label}
            value={k.value}
            delta={k.delta}
            trend={k.trend}
            accent={k.accent}
          />
        ))}
      </div>
      <AdminOpsStrip items={opsStrip} />
      <AdminPanelCard>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Moderation SLA (30d)</CardTitle>
          <p className="text-xs text-muted-foreground">
            Hours from report created → first review · sample {modSla.sampleSize} resolved rows
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-white/8 bg-secondary/20 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Median</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{modSla.medianHours}h</p>
          </div>
          <div className="rounded-lg border border-white/8 bg-secondary/20 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">P90</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{modSla.p90Hours}h</p>
          </div>
        </CardContent>
      </AdminPanelCard>
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <ReportPipelineSummary items={reportPipeline} />
        </div>
        <div className="lg:col-span-3">
          <RecentActivityList items={recentActivity} />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <AdminPanelCard className="lg:col-span-2">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle>User growth</CardTitle>
            <span className="text-xs font-medium text-muted-foreground">Cumulative signups · month end</span>
          </CardHeader>
          <CardContent>
            <GrowthChart data={growthSeries} />
          </CardContent>
        </AdminPanelCard>
        <AdminPanelCard className="lg:col-span-2">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle>Engagement overview</CardTitle>
            <span className="text-xs font-medium text-muted-foreground">Posts+comments · likes · shares (7d)</span>
          </CardHeader>
          <CardContent>
            <EngagementOverviewChart data={engagementWeek} />
          </CardContent>
        </AdminPanelCard>
        <AdminPanelCard className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Audience mix</CardTitle>
            <p className="text-xs text-muted-foreground">By profile role</p>
          </CardHeader>
          <CardContent className="px-1">
            <AudienceDonutChart data={audienceDonut} />
          </CardContent>
        </AdminPanelCard>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <AdminPanelCard>
          <CardHeader>
            <CardTitle>Moderation queue</CardTitle>
            <p className="text-xs text-muted-foreground">{liveReports.length} from database</p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Type</TableHead>
                  <TableHead>Preview</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportPreview.length ? (
                  reportPreview.map((r) => (
                    <TableRow key={r.id} className="border-border">
                      <TableCell className="font-medium capitalize">{r.type.replace("_", " ")}</TableCell>
                      <TableCell className="max-w-[180px] truncate text-muted-foreground">{r.preview}</TableCell>
                      <TableCell>
                        <StatusBadge status={r.severity} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={r.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/admin/moderation?report=${encodeURIComponent(r.id)}`}>Review</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground">
                      No open reports in Supabase yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </AdminPanelCard>
        <AdminPanelCard>
          <CardHeader>
            <CardTitle>Recent profiles</CardTitle>
            <p className="text-xs text-muted-foreground">{liveUsers.length} loaded</p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userPreview.length ? (
                  userPreview.map((u) => (
                    <TableRow key={u.id} className="border-border">
                      <TableCell className="font-medium">{u.displayName}</TableCell>
                      <TableCell className="text-muted-foreground">{u.profession}</TableCell>
                      <TableCell>
                        <StatusBadge status={u.status} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-muted-foreground">
                      No profiles returned (check RLS / connection).
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </AdminPanelCard>
      </div>
      <div className="grid gap-6 lg:grid-cols-5 lg:items-start">
        <AdminPanelCard className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Trust &amp; safety · report reasons</CardTitle>
            <p className="text-xs text-muted-foreground">Sample of recent reports</p>
          </CardHeader>
          <CardContent>
            <ReportReasonsDonutChart data={reportReasons} />
          </CardContent>
        </AdminPanelCard>
        <AdminPanelCard className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Reports by source</CardTitle>
            <p className="text-xs text-muted-foreground">Target type · recent sample</p>
          </CardHeader>
          <CardContent>
            <ReportsBySourceBarChart data={reportsBySource} />
          </CardContent>
        </AdminPanelCard>
        <div className="lg:col-span-1">
          <SystemHealthChecklist services={health} />
        </div>
      </div>
      <ModeratorWorkloadPanel moderators={moderatorWorkload} />
      <AdminPanelCard>
        <CardHeader>
          <CardTitle>Top circles by post volume</CardTitle>
          <p className="text-xs text-muted-foreground">Normalized bar · communities.post_count</p>
        </CardHeader>
        <CardContent>
          <TopCirclesBarChart data={topCircles} />
        </CardContent>
      </AdminPanelCard>
    </div>
  );
}
