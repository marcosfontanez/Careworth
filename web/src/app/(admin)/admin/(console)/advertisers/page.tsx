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
import { cn } from "@/lib/utils";

function clampDays(raw: string | undefined): 7 | 30 | 90 {
  const n = Number(raw);
  if (n === 7) return 7;
  if (n === 90) return 90;
  return 30;
}

function clampCohort(raw: string | undefined): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 8;
  return Math.max(1, Math.min(500, Math.round(n)));
}

export default async function AdminAdvertisersPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; cohortMin?: string }>;
}) {
  const q = await searchParams;
  const windowDays = clampDays(q.days);
  const cohortMinCount = clampCohort(q.cohortMin);

  const [payload, counts] = await Promise.all([
    loadAdvertiserEngagementPayload({ windowDays, cohortMinCount }),
    loadAdminCounts(),
  ]);

  const baseQs = (days: 7 | 30 | 90) => {
    const p = new URLSearchParams();
    p.set("days", String(days));
    if (cohortMinCount !== 8) p.set("cohortMin", String(cohortMinCount));
    const s = p.toString();
    return s ? `?${s}` : "";
  };

  return (
    <div className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Partnerships", href: "/admin/advertisers" },
          { label: "Advertiser overview" },
        ]}
        title="Advertiser intelligence center"
        description="Staff-facing operational + commercial analytics — capped samples, explicit provenance, no invented funnel metrics. Prefer CSV/JSON exports plus /contact intake for outbound packages."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="border-white/15" asChild>
              <Link href="/advertisers" target="_blank" rel="noopener noreferrer">
                Public advertisers page
              </Link>
            </Button>
            <Button size="sm" variant="outline" className="border-white/15" asChild>
              <Link href="/admin/insights?tab=engagement">Insights workspace</Link>
            </Button>
            <Button size="sm" variant="outline" className="border-white/15" asChild>
              <Link href="/admin/audience-insights">Audience insights</Link>
            </Button>
            <Button size="sm" variant="outline" className="border-white/15" asChild>
              <Link href="/admin/media-kit">Media kit</Link>
            </Button>
            <Button size="sm" className="bg-primary text-primary-foreground" asChild>
              <Link href="/contact?topic=media">Contact — media kit</Link>
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/8 bg-card/30 px-4 py-3 print:hidden">
        <span className="text-xs font-medium text-muted-foreground">Analytics window</span>
        <div className="flex flex-wrap gap-2">
          {([7, 30, 90] as const).map((d) => (
            <Button
              key={d}
              size="sm"
              variant={windowDays === d ? "default" : "outline"}
              className={cn(windowDays !== d && "border-white/15 bg-transparent")}
              asChild
            >
              <Link href={`/admin/advertisers${baseQs(d)}`}>{d}d</Link>
            </Button>
          ))}
        </div>
        <form className="flex flex-wrap items-center gap-2" action="/admin/advertisers" method="get">
          <input type="hidden" name="days" value={windowDays} />
          <label htmlFor="cohortMin" className="text-xs text-muted-foreground">
            Min cohort size
          </label>
          <input
            id="cohortMin"
            name="cohortMin"
            type="number"
            min={1}
            max={500}
            defaultValue={cohortMinCount}
            className="h-9 w-24 rounded-md border border-white/12 bg-background/80 px-2 text-sm tabular-nums outline-none ring-primary/20 focus:ring-2"
          />
          <Button size="sm" type="submit" variant="secondary">
            Apply
          </Button>
        </form>
      </div>

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
            Copy adapts per buyer; pair methodology footnotes with exports from this page or{" "}
            <Link href="/admin/media-kit" className="text-primary underline-offset-4 hover:underline">
              Media kit
            </Link>
            .
          </p>
        </CardHeader>
        <CardContent>
          <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground marker:text-primary">
            <li>
              <span className="text-foreground/90">One-liner:</span> healthcare-native feed, circles, live, and Pulse Page —
              moderated for professional culture.
            </li>
            <li>
              <span className="text-foreground/90">Proof points:</span> KPI strip + CSV export with provenance meta rows.
            </li>
            <li>
              <span className="text-foreground/90">Inventory:</span> placement occupancy via{" "}
              <Link href="/admin/inventory" className="text-primary underline-offset-4 hover:underline">
                Inventory & placements
              </Link>{" "}
              (derived from campaigns today).
            </li>
            <li>
              <span className="text-foreground/90">Safety:</span> summarized on{" "}
              <Link href="/admin/brand-safety" className="text-primary underline-offset-4 hover:underline">
                Brand safety
              </Link>
              , detail workflows stay in Moderation / Reports / Appeals.
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
