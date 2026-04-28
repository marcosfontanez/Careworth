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
import { loadAdminCounts, loadAdminUsers, loadReports } from "@/lib/admin/queries";
import { formatCount } from "@/lib/admin/format";
import {
  dashboardAlertStrip,
  dashboardKpis,
  moderatorWorkload,
  recentAdminActivity,
  reportQueueSummary,
  systemHealthServices,
} from "@/mock/data";

export default async function AdminDashboardPage() {
  const [counts, liveReports, liveUsers] = await Promise.all([
    loadAdminCounts(),
    loadReports(),
    loadAdminUsers(),
  ]);

  const kpiRow = dashboardKpis.map((k) => {
    if (k.key === "users") return { ...k, value: formatCount(counts.users), delta: "live", trend: "up" as const };
    if (k.key === "reports")
      return { ...k, value: formatCount(counts.openReports), delta: "open queue", trend: "down" as const };
    if (k.key === "live")
      return { ...k, value: formatCount(counts.liveSessions), delta: "live now", trend: "up" as const };
    return k;
  });

  const reportPreview = liveReports.length ? liveReports.slice(0, 4) : [];
  const userPreview = liveUsers.length ? liveUsers.slice(0, 5) : [];

  return (
    <div className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Dashboard" }]}
        title="Admin dashboard"
        description="Overview of platform health, engagement, and operations."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="hidden rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-muted-foreground md:inline">
              Live counts from Supabase · charts illustrative
            </span>
            <Button variant="outline" size="sm" className="border-white/15 bg-transparent">
              Export report
            </Button>
            <Button size="sm" className="bg-primary text-primary-foreground shadow-[0_0_24px_-8px_rgba(45,127,249,0.8)]">
              Filters
            </Button>
          </div>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
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
      <AdminOpsStrip items={dashboardAlertStrip} />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <ReportPipelineSummary items={reportQueueSummary} />
        </div>
        <div className="lg:col-span-3">
          <RecentActivityList items={recentAdminActivity} />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <AdminPanelCard className="lg:col-span-2">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle>User growth</CardTitle>
            <span className="text-xs font-medium text-muted-foreground">Last 8 months · illustrative</span>
          </CardHeader>
          <CardContent>
            <GrowthChart />
          </CardContent>
        </AdminPanelCard>
        <AdminPanelCard className="lg:col-span-2">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle>Engagement overview</CardTitle>
            <span className="text-xs font-medium text-muted-foreground">Messages · reactions · shares</span>
          </CardHeader>
          <CardContent>
            <EngagementOverviewChart />
          </CardContent>
        </AdminPanelCard>
        <AdminPanelCard className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Audience mix</CardTitle>
          </CardHeader>
          <CardContent className="px-1">
            <AudienceDonutChart />
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
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground">
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
            <CardTitle className="text-base">Trust &amp; safety · top report reasons</CardTitle>
            <p className="text-xs text-muted-foreground">Category mix · illustrative</p>
          </CardHeader>
          <CardContent>
            <ReportReasonsDonutChart />
          </CardContent>
        </AdminPanelCard>
        <AdminPanelCard className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Reports by source</CardTitle>
            <p className="text-xs text-muted-foreground">Illustrative · wire warehouse later</p>
          </CardHeader>
          <CardContent>
            <ReportsBySourceBarChart />
          </CardContent>
        </AdminPanelCard>
        <div className="lg:col-span-1">
          <SystemHealthChecklist services={systemHealthServices} />
        </div>
      </div>
      <ModeratorWorkloadPanel moderators={moderatorWorkload} />
      <AdminPanelCard>
        <CardHeader>
          <CardTitle>Top circles by activity</CardTitle>
          <p className="text-xs text-muted-foreground">Illustrative ranking</p>
        </CardHeader>
        <CardContent>
          <TopCirclesBarChart />
        </CardContent>
      </AdminPanelCard>
    </div>
  );
}
