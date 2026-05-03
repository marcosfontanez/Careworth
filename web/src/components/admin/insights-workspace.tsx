"use client";

import { AdvertiserEngagementDashboard } from "@/components/admin/advertiser-engagement-dashboard";
import {
  AudienceDonutChart,
  EngagementOverviewChart,
  GrowthChart,
  MiniLineChart,
  ReportReasonsDonutChart,
  ReportsBySourceBarChart,
  TopCirclesBarChart,
} from "@/components/admin/insight-charts";
import { AdminPanelCard } from "@/components/admin/admin-panel-card";
import { InsightsKpiGrid } from "@/components/admin/insights-kpi-grid";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  AudienceSlice,
  CircleActivityBar,
  EngagementDayPoint,
  GrowthPoint,
  ReportReasonSlice,
  ReportSourceBar,
} from "@/types/admin-charts";
import type { AdvertiserEngagementPayload } from "@/types/advertiser-engagement";

const INSIGHT_TABS = [
  { id: "overview", label: "Overview" },
  { id: "audience", label: "Audience" },
  { id: "engagement", label: "Reach & brands" },
  { id: "my_pulse", label: "My Pulse" },
  { id: "circles", label: "Circles" },
  { id: "live", label: "Live" },
  { id: "creators", label: "Growth" },
  { id: "campaigns", label: "Campaigns" },
  { id: "trust", label: "Trust & safety" },
] as const;

type InsightTabId = (typeof INSIGHT_TABS)[number]["id"];

const TAB_IDS = new Set<string>(INSIGHT_TABS.map((t) => t.id));

function normalizeInsightTab(raw: string | undefined): InsightTabId {
  if (!raw) return "overview";
  if (raw === "content") return "circles";
  if (TAB_IDS.has(raw)) return raw as InsightTabId;
  return "overview";
}

const tabClass =
  "rounded-md px-3 py-1.5 text-xs sm:text-sm data-active:bg-sidebar-accent data-active:text-foreground data-active:ring-1 data-active:ring-primary/15";

export type InsightsWorkspaceProps = {
  growthSeries: GrowthPoint[];
  audienceDonut: AudienceSlice[];
  engagementWeek: EngagementDayPoint[];
  topCircles: CircleActivityBar[];
  reportReasons: ReportReasonSlice[];
  reportsBySource: ReportSourceBar[];
  overviewKpis: { label: string; value: string }[];
  trustKpis: { label: string; value: string }[];
  advertiserEngagement: AdvertiserEngagementPayload;
  liveKpis: { label: string; value: string }[];
  campaignKpis: { label: string; value: string }[];
  myPulseKpis: { label: string; value: string }[];
  /** From `?tab=` on `/admin/insights` — use `engagement`, `trust`, etc. */
  defaultTab?: string;
};

export function InsightsWorkspace({
  growthSeries,
  audienceDonut,
  engagementWeek,
  topCircles,
  reportReasons,
  reportsBySource,
  overviewKpis,
  trustKpis,
  advertiserEngagement,
  liveKpis,
  campaignKpis,
  myPulseKpis,
  defaultTab,
}: InsightsWorkspaceProps) {
  const activeTab = normalizeInsightTab(defaultTab);

  return (
    <Tabs key={activeTab} defaultValue={activeTab} className="space-y-6">
      <TabsList className="flex h-auto max-w-full flex-wrap justify-start gap-1 bg-secondary/40 p-1 ring-1 ring-white/[0.04]">
        {INSIGHT_TABS.map((t) => (
          <TabsTrigger key={t.id} value={t.id} className={tabClass}>
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="overview" className="space-y-6">
        <InsightsKpiGrid items={overviewKpis} />
        <div className="grid gap-6 lg:grid-cols-2">
          <AdminPanelCard>
            <CardHeader>
              <CardTitle>Growth</CardTitle>
            </CardHeader>
            <CardContent>
              <GrowthChart data={growthSeries} />
            </CardContent>
          </AdminPanelCard>
          <AdminPanelCard>
            <CardHeader>
              <CardTitle>Profession mix</CardTitle>
            </CardHeader>
            <CardContent>
              <AudienceDonutChart data={audienceDonut} />
            </CardContent>
          </AdminPanelCard>
        </div>
      </TabsContent>
      <TabsContent value="audience" className="space-y-6">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Role distribution from profiles (recent sample capped for performance).
        </p>
        <AudienceDonutChart data={audienceDonut} />
      </TabsContent>
      <TabsContent value="engagement" className="space-y-6">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Brand-planner view: reach proxies, funnels, inventory, and content performance. Figures use Supabase rollups
          with documented caps; treat reach as directional unless you widen samples in SQL. For a full-page layout with
          outreach copy, open <span className="font-medium text-foreground">Partner metrics</span> in the sidebar.
        </p>
        <AdvertiserEngagementDashboard payload={advertiserEngagement} />
        <AdminPanelCard>
          <CardHeader>
            <CardTitle>7-day activity mix</CardTitle>
          </CardHeader>
          <CardContent>
            <EngagementOverviewChart data={engagementWeek} />
          </CardContent>
        </AdminPanelCard>
      </TabsContent>
      <TabsContent value="my_pulse" className="space-y-6">
        <InsightsKpiGrid items={myPulseKpis} />
      </TabsContent>
      <TabsContent value="circles" className="space-y-6">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Communities ranked by stored post counts (inventory signal for specialty sponsorships).
        </p>
        <TopCirclesBarChart data={topCircles} />
      </TabsContent>
      <TabsContent value="live" className="space-y-6">
        <InsightsKpiGrid items={liveKpis} />
      </TabsContent>
      <TabsContent value="creators" className="space-y-6">
        <p className="text-sm leading-relaxed text-muted-foreground">Cumulative user growth (same series as dashboard).</p>
        <GrowthChart data={growthSeries} />
        <AdminPanelCard>
          <CardHeader>
            <CardTitle>Trailing months (sparkline)</CardTitle>
          </CardHeader>
          <CardContent>
            <MiniLineChart data={growthSeries} />
          </CardContent>
        </AdminPanelCard>
      </TabsContent>
      <TabsContent value="campaigns" className="space-y-6">
        <InsightsKpiGrid items={campaignKpis} />
      </TabsContent>
      <TabsContent value="trust" className="space-y-6">
        <InsightsKpiGrid items={trustKpis} />
        <div className="grid gap-6 lg:grid-cols-2">
          <AdminPanelCard>
            <CardHeader>
              <CardTitle>Reports by source</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ReportsBySourceBarChart data={reportsBySource} />
            </CardContent>
          </AdminPanelCard>
          <AdminPanelCard>
            <CardHeader>
              <CardTitle>Report reasons</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ReportReasonsDonutChart data={reportReasons} />
            </CardContent>
          </AdminPanelCard>
        </div>
      </TabsContent>
    </Tabs>
  );
}
