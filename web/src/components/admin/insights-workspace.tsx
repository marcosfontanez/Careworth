"use client";

import {
  AudienceDonutChart,
  GrowthChart,
  ReportReasonsDonutChart,
  ReportsBySourceBarChart,
  TopCirclesBarChart,
} from "@/components/admin/insight-charts";
import { AdminPanelCard } from "@/components/admin/admin-panel-card";
import { InsightsKpiGrid } from "@/components/admin/insights-kpi-grid";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { insightsOverviewKpis, trustSafetyMetrics } from "@/mock/data";

const tabClass =
  "rounded-md px-3 py-1.5 text-xs sm:text-sm data-active:bg-sidebar-accent data-active:text-foreground data-active:ring-1 data-active:ring-primary/15";

export function InsightsWorkspace() {
  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList className="flex h-auto max-w-full flex-wrap justify-start gap-1 bg-secondary/40 p-1 ring-1 ring-white/[0.04]">
        {[
          "overview",
          "audience",
          "engagement",
          "content",
          "my_pulse",
          "circles",
          "live",
          "creators",
          "campaigns",
          "trust",
        ].map((t) => (
          <TabsTrigger key={t} value={t} className={tabClass}>
            {t.replaceAll("_", " ")}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="overview" className="space-y-6">
        <InsightsKpiGrid items={insightsOverviewKpis} />
        <div className="grid gap-6 lg:grid-cols-2">
          <AdminPanelCard>
            <CardHeader>
              <CardTitle>Growth</CardTitle>
            </CardHeader>
            <CardContent>
              <GrowthChart />
            </CardContent>
          </AdminPanelCard>
          <AdminPanelCard>
            <CardHeader>
              <CardTitle>Profession mix</CardTitle>
            </CardHeader>
            <CardContent>
              <AudienceDonutChart />
            </CardContent>
          </AdminPanelCard>
        </div>
      </TabsContent>
      <TabsContent value="audience" className="space-y-6">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Breakdowns by profession, specialty, geography, and experience — connect your warehouse to replace sample tiles.
        </p>
        <AudienceDonutChart />
      </TabsContent>
      <TabsContent value="engagement" className="space-y-6">
        <InsightsKpiGrid
          items={[
            { label: "DAU / MAU", value: "26.5%" },
            { label: "Sessions / user", value: "4.2" },
            { label: "Avg session", value: "12m 45s" },
            { label: "Feed depth", value: "28 posts" },
            { label: "Engagement rate", value: "18.7%" },
            { label: "W4 retention", value: "41%" },
          ]}
        />
      </TabsContent>
      <TabsContent value="content" className="space-y-6">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Top viewed / shared / saved clips — connect to warehouse for watch time and completion.
        </p>
        <TopCirclesBarChart />
      </TabsContent>
      <TabsContent value="my_pulse" className="space-y-6">
        <InsightsKpiGrid
          items={[
            { label: "My Pulse posts (30d)", value: "182K" },
            { label: "Text share", value: "34%" },
            { label: "Link tap rate", value: "12.4%" },
            { label: "Avg engagement / post", value: "214" },
          ]}
        />
      </TabsContent>
      <TabsContent value="circles" className="space-y-6">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Fastest growing, most joined, trending topics — sample bar chart until analytics are wired.
        </p>
        <TopCirclesBarChart />
      </TabsContent>
      <TabsContent value="live" className="space-y-6">
        <InsightsKpiGrid
          items={[
            { label: "Sessions started (30d)", value: "3,409" },
            { label: "Avg viewers", value: "412" },
            { label: "Peak concurrent", value: "12.4K" },
            { label: "Avg watch time", value: "7m 12s" },
          ]}
        />
      </TabsContent>
      <TabsContent value="creators" className="space-y-6">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Top creators, fastest growing, live hosts — join creator warehouse.
        </p>
        <GrowthChart />
      </TabsContent>
      <TabsContent value="campaigns" className="space-y-6">
        <InsightsKpiGrid
          items={[
            { label: "Impressions (30d)", value: "18.2M" },
            { label: "CTR", value: "1.96%" },
            { label: "Engaged actions", value: "240K" },
            { label: "Brand lift (sample)", value: "+3.2" },
          ]}
        />
      </TabsContent>
      <TabsContent value="trust" className="space-y-6">
        <InsightsKpiGrid items={trustSafetyMetrics} />
        <div className="grid gap-6 lg:grid-cols-2">
          <AdminPanelCard>
            <CardHeader>
              <CardTitle>Reports by source</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ReportsBySourceBarChart />
            </CardContent>
          </AdminPanelCard>
        </div>
      </TabsContent>
    </Tabs>
  );
}
