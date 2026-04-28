import { Download, SlidersHorizontal } from "lucide-react";

import { ModerationConsole } from "@/components/admin/moderation-console";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { KpiStatCard } from "@/components/admin/kpi-stat-card";
import { Button } from "@/components/ui/button";
import { loadReports } from "@/lib/admin/queries";
import { formatCount } from "@/lib/admin/format";
import { moderationOverviewKpis } from "@/mock/data";

export default async function AdminModerationPage() {
  const reports = await loadReports();
  const open = reports.filter((r) => r.status === "pending" || r.status === "under_review").length;
  const critical = reports.filter((r) => r.severity === "critical").length;
  const kpi = moderationOverviewKpis.map((k) => {
    if (k.key === "open") return { ...k, value: formatCount(open), delta: "live" };
    if (k.key === "critical") return { ...k, value: formatCount(critical), delta: "flagged" };
    return k;
  });

  return (
    <div className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Moderation & insights" }]}
        title="Moderation & insights"
        description="Trust & safety queue — wired to Supabase reports; KPI mix is partly live."
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
      <ModerationConsole reports={reports} />
    </div>
  );
}
