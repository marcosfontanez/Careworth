import { InsightsWorkspace } from "@/components/admin/insights-workspace";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Card, CardContent } from "@/components/ui/card";
import {
  loadAdminCounts,
  loadAudienceRoleMix,
  loadCampaignInsightKpis,
  loadEngagementWeekSeries,
  loadInsightsOverviewKpis,
  loadLiveInsightKpis,
  loadMyPulseInsightKpis,
  loadProfileGrowthSeries,
  loadReportReasonsMix,
  loadReportsBySourceBars,
  loadTopCirclesActivityBars,
  loadTrustSafetyKpis,
} from "@/lib/admin/queries";
import { loadAdvertiserEngagementPayload } from "@/lib/admin/advertiser-engagement-queries";

export default async function AdminInsightsPage() {
  const counts = await loadAdminCounts();
  const [
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
  ] = await Promise.all([
    loadProfileGrowthSeries(8),
    loadAudienceRoleMix(),
    loadEngagementWeekSeries(),
    loadTopCirclesActivityBars(6),
    loadReportReasonsMix(),
    loadReportsBySourceBars(),
    loadInsightsOverviewKpis({
      users: counts.users,
      dau24h: counts.dau24h,
      openReports: counts.openReports,
      circles: counts.circles,
      liveSessions: counts.liveSessions,
      postsTotal: counts.posts,
      commentsTotal: counts.comments,
    }),
    loadTrustSafetyKpis(),
    loadAdvertiserEngagementPayload(),
    loadLiveInsightKpis(),
    loadCampaignInsightKpis(),
    loadMyPulseInsightKpis(),
  ]);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Insights" }]}
        title="Insights"
        description="Product analytics derived from Supabase — counts, rolls ups, and sampled distributions."
      />
      <Card className="border-border/80 bg-gradient-to-r from-card/95 to-primary/[0.06] shadow-sm ring-1 ring-white/4">
        <CardContent className="p-6 text-sm leading-relaxed text-muted-foreground">
          <p>
            {process.env.SUPABASE_SERVICE_ROLE_KEY ? (
              <>Metrics are computed server-side with your project&apos;s service role (same data as SQL editor).</>
            ) : (
              <>
                Add <span className="font-medium text-amber-400">SUPABASE_SERVICE_ROLE_KEY</span> on the server so
                these tiles match full database totals; without it, RLS + session scope can hide rows.
              </>
            )}{" "}
            DAU/WAU use capped samples from <span className="text-foreground/90">analytics_events</span>.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Dashboard totals use the same server key. Keys: Supabase → Project Settings → API →{" "}
            <span className="text-foreground/80">service_role</span> (never commit or expose to the browser).
          </p>
          <p className="mt-3 text-sm">
            Use <span className="font-medium text-foreground">Overview</span> for executive pulse,{" "}
            <span className="font-medium text-foreground">Trust</span> for safety KPIs and report mix.
          </p>
        </CardContent>
      </Card>
      <InsightsWorkspace
        growthSeries={growthSeries}
        audienceDonut={audienceDonut}
        engagementWeek={engagementWeek}
        topCircles={topCircles}
        reportReasons={reportReasons}
        reportsBySource={reportsBySource}
        overviewKpis={overviewKpis}
        trustKpis={trustKpis}
        advertiserEngagement={advertiserEngagement}
        liveKpis={liveKpis}
        campaignKpis={campaignKpis}
        myPulseKpis={myPulseKpis}
      />
    </div>
  );
}
