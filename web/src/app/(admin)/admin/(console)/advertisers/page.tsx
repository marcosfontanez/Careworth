import Link from "next/link";

import { AdvertiserEngagementDashboard } from "@/components/admin/advertiser-engagement-dashboard";
import { AdminOpsStrip } from "@/components/admin/dashboard-panels";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminPanelCard } from "@/components/admin/admin-panel-card";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCount } from "@/lib/admin/format";
import { loadAdvertiserEngagementPayload } from "@/lib/admin/advertiser-engagement-queries";
import { loadAdminCounts } from "@/lib/admin/queries";

export default async function AdminAdvertisersPage() {
  const [payload, counts] = await Promise.all([loadAdvertiserEngagementPayload(), loadAdminCounts()]);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Partner metrics" }]}
        title="Partner & advertiser metrics"
        description="Directional analytics for outreach, RFPs, and renewals — same engine as Insights → Reach & brands. Export JSON or print from the browser; pair with the public /advertisers story."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="border-white/15" asChild>
              <Link href="/advertisers" target="_blank" rel="noopener noreferrer">
                Public advertisers page
              </Link>
            </Button>
            <Button size="sm" variant="outline" className="border-white/15" asChild>
              <Link href="/admin/insights?tab=engagement">Open in Insights</Link>
            </Button>
            <Button size="sm" className="bg-primary text-primary-foreground" asChild>
              <Link href="/contact?topic=media">Contact — media kit</Link>
            </Button>
          </div>
        }
      />

      <AdminOpsStrip
        items={[
          {
            label: "Registered professionals",
            value: formatCount(counts.users),
            hint: "profiles table · all time",
          },
          {
            label: "DAU (24h est.)",
            value: formatCount(counts.dau24h),
            hint: "analytics_events sample",
          },
          {
            label: "Public posts",
            value: formatCount(counts.posts),
            hint: "feed inventory",
          },
          {
            label: "Active circles",
            value: formatCount(counts.circles),
            hint: "communities",
          },
        ]}
      />

      <AdminPanelCard>
        <CardHeader>
          <CardTitle className="text-base">What to send prospects</CardTitle>
          <p className="text-xs text-muted-foreground">
            Copy adapts per buyer; keep figures labeled as directional when samples are capped.
          </p>
        </CardHeader>
        <CardContent>
          <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground marker:text-primary">
            <li>
              <span className="text-foreground/90">One-liner:</span> healthcare-native feed, circles, live, and Pulse
              Page — moderated for professional culture.
            </li>
            <li>
              <span className="text-foreground/90">Proof points:</span> use the KPI strip above + half-window momentum
              table below (screenshot or CSV export).
            </li>
            <li>
              <span className="text-foreground/90">Inventory:</span> sponsored feed, live lower-thirds, circles
              headers — detail on the public advertisers page.
            </li>
            <li>
              <span className="text-foreground/90">Safety:</span> human moderation, appeals, escalation — link{" "}
              <Link href="/trust" className="text-primary underline-offset-4 hover:underline">
                Trust
              </Link>{" "}
              and{" "}
              <Link href="/community-guidelines" className="text-primary underline-offset-4 hover:underline">
                Community guidelines
              </Link>
              .
            </li>
            <li>
              <span className="text-foreground/90">Next step:</span>{" "}
              <Link href="/contact?topic=partnerships" className="text-primary underline-offset-4 hover:underline">
                partnerships intake
              </Link>{" "}
              — attach exports from this page.
            </li>
          </ul>
        </CardContent>
      </AdminPanelCard>

      <AdvertiserEngagementDashboard payload={payload} />
    </div>
  );
}
