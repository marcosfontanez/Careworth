import Link from "next/link";

import { AdvertiserEngagementDashboard } from "@/components/admin/advertiser-engagement-dashboard";
import { AdvertiserEngagementExportButtons } from "@/components/admin/advertiser-engagement-export-buttons";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminPanelCard } from "@/components/admin/admin-panel-card";
import { AdminPrintPdfButton } from "@/components/admin/admin-print-pdf-button";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCount } from "@/lib/admin/format";
import { loadAdvertiserEngagementPayload } from "@/lib/admin/advertiser-engagement-queries";
import { loadBrandSafetySnapshot } from "@/lib/admin/queries";

export default async function AdminMediaKitPage() {
  const [payload, safety] = await Promise.all([
    loadAdvertiserEngagementPayload({ windowDays: 30, cohortMinCount: 10 }),
    loadBrandSafetySnapshot(),
  ]);

  return (
    <div className="space-y-8 print:bg-white print:text-black">
      <AdminPageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Partnerships", href: "/admin/advertisers" },
          { label: "Media kit" },
        ]}
        title="Media kit · advertiser snapshot"
        description="Print-friendly snapshot assembled only from live aggregates — verify footnotes before sending externally."
        actions={
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button size="sm" variant="outline" className="border-white/15" asChild>
              <Link href="/admin/advertisers">Full intelligence center</Link>
            </Button>
            <AdvertiserEngagementExportButtons payload={payload} />
            <AdminPrintPdfButton />
          </div>
        }
      />

      {/* Print trigger needs client — simple instruction */}
      <p className="text-xs text-muted-foreground print:hidden">
        Tip: use your browser&apos;s <span className="text-foreground/90">Print → Save as PDF</span> after scrolling the
        snapshot — sidebar hides automatically.
      </p>

      <AdminPanelCard className="border-primary/20 print:border print:border-neutral-300">
        <CardHeader>
          <CardTitle className="text-xl">PulseVerse · Advertiser snapshot</CardTitle>
          <p className="text-sm text-muted-foreground">
            Generated {new Date(payload.generatedAt).toLocaleString()} · {payload.windowDays}d UTC window ·{" "}
            {payload.dataAccess === "service_role" ? "Service-role aggregates" : "Session-scoped aggregates"}
          </p>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h3 className="text-sm font-semibold text-foreground">Platform overview</h3>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>Registered profiles: {payload.registeredUsersTotal != null ? formatCount(payload.registeredUsersTotal) : "—"}.</li>
              <li>Creators with ≥1 post: {payload.activeCreatorsCount != null ? formatCount(payload.activeCreatorsCount) : "—"}.</li>
              <li>New registrations (30d rolling): {formatCount(payload.registrationGrowth.rolling30d)}.</li>
              <li>Distinct users in analytics sample: {formatCount(payload.distinctUsersAnalyticsSample)} (not MAU).</li>
            </ul>
          </section>
          <section>
            <h3 className="text-sm font-semibold text-foreground">Audience highlights</h3>
            <p>
              Role / specialty / geo charts in this kit mirror capped samples with suppression ≥ {payload.cohortMinCount}. States are intentionally coarse (US state tokens only when populated).
            </p>
          </section>
          <section>
            <h3 className="text-sm font-semibold text-foreground">Engagement highlights</h3>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>Engagements per new post (window): {payload.contentHealth.engagementPerPost}.</li>
              <li>Post views summed on capped in-window sample: {formatCount(payload.postViewsSumSample ?? 0)}.</li>
              <li>Sponsored totals use lifetime row figures — see campaign export for sponsor detail.</li>
            </ul>
          </section>
          <section>
            <h3 className="text-sm font-semibold text-foreground">Brand safety (aggregated)</h3>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>Open reports right now: {formatCount(safety.moderation.open)}.</li>
              <li>Reports filed (30d): {formatCount(safety.reportsCreated30d)}.</li>
              <li>Appeals open: {formatCount(safety.appealsOpen)}.</li>
              <li>Non-standard live streams (24h heuristic): {formatCount(safety.liveNonTerminalStreams24h)}.</li>
            </ul>
          </section>
          <section>
            <h3 className="text-sm font-semibold text-foreground">Campaign readiness</h3>
            <p>
              Delivery analytics today roll up to <span className="text-foreground/90">ad_campaigns</span> totals — no
              per-day impression warehouse in this console yet. CSV exports capture list-level pacing notes where budgets
              exist.
            </p>
          </section>
        </CardContent>
      </AdminPanelCard>

      <div className="print:hidden">
        <AdvertiserEngagementDashboard payload={payload} />
      </div>
    </div>
  );
}
