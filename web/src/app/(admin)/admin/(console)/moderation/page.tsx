import { Download, SlidersHorizontal } from "lucide-react";

import { ModerationConsole } from "@/components/admin/moderation-console";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { KpiStatCard } from "@/components/admin/kpi-stat-card";
import { Button } from "@/components/ui/button";
import { loadModerationKpiStats, loadReports } from "@/lib/admin/queries";
import { formatCount } from "@/lib/admin/format";

export default async function AdminModerationPage({
  searchParams,
}: {
  searchParams: Promise<{ report?: string }>;
}) {
  const q = await searchParams;
  const [reports, stats] = await Promise.all([loadReports({ openQueueOnly: true }), loadModerationKpiStats()]);

  const avgLabel =
    stats.avgResolutionHours != null && Number.isFinite(stats.avgResolutionHours)
      ? stats.avgResolutionHours < 1
        ? `${Math.round(stats.avgResolutionHours * 60)}m`
        : `${stats.avgResolutionHours.toFixed(1)}h`
      : "—";

  const kpi = [
    {
      key: "open",
      label: "Open reports",
      value: formatCount(stats.open),
      delta: "status = pending",
      trend: "up" as const,
      accent: "primary" as const,
    },
    {
      key: "review",
      label: "Needs review",
      value: formatCount(stats.needsReview),
      delta: "status = reviewed",
      trend: "up" as const,
      accent: "accent" as const,
    },
    {
      key: "resolved",
      label: "Resolved today",
      value: formatCount(stats.resolvedToday),
      delta: "closed · UTC day",
      trend: "up" as const,
      accent: "violet" as const,
    },
    {
      key: "critical",
      label: "Critical alerts",
      value: formatCount(stats.critical),
      delta: "open · PHI / medical / live",
      trend: "down" as const,
      accent: "destructive" as const,
    },
    {
      key: "avg",
      label: "Avg resolution",
      value: avgLabel,
      delta: "recent closed sample",
      trend: "down" as const,
      accent: "amber" as const,
    },
  ];

  return (
    <div className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Moderation & insights" }]}
        title="Moderation & insights"
        description="Open queue (pending & in review). Reject = no violation; Uphold = agree with report and close. Full history: Reports in the sidebar."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" className="border-white/15 bg-transparent">
              <Download className="mr-1.5 h-4 w-4" />
              Export report
            </Button>
            <Button size="sm" className="bg-primary text-primary-foreground shadow-[0_0_24px_-8px_rgba(45,127,249,0.8)]">
              <SlidersHorizontal className="mr-1.5 h-4 w-4" />
              Filters
            </Button>
          </div>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {kpi.map((k) => (
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
      <ModerationConsole reports={reports} initialReportId={q.report ?? null} />
    </div>
  );
}
