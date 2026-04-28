import { InsightsWorkspace } from "@/components/admin/insights-workspace";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminInsightsPage() {
  return (
    <div className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Insights" }]}
        title="Insights"
        description="Charts and segment tiles below are illustrative until you connect your analytics warehouse; Trust tab reuses the same chart components as the dashboard."
      />
      <Card className="border-border/80 bg-gradient-to-r from-card/95 to-primary/[0.06] shadow-sm ring-1 ring-white/[0.04]">
        <CardContent className="p-6 text-sm leading-relaxed text-muted-foreground">
          <p>
            This workspace is designed to grow with your warehouse: start with directionally accurate mocks, then swap
            tabs for real segment definitions, funnel windows, and trust metrics without restructuring the UI.
          </p>
          <p className="mt-3">
            Use <span className="font-medium text-foreground">Overview</span> for executive pulse,{" "}
            <span className="font-medium text-foreground">Trust</span> for safety KPIs, and vertical tabs for
            Circles/Live/Creators deep dives.
          </p>
        </CardContent>
      </Card>
      <InsightsWorkspace />
    </div>
  );
}
