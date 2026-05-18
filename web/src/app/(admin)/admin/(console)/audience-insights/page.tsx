import Link from "next/link";

import { AdvertiserEngagementDashboard } from "@/components/admin/advertiser-engagement-dashboard";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { loadAdvertiserEngagementPayload } from "@/lib/admin/advertiser-engagement-queries";
import { cn } from "@/lib/utils";

function clampDays(raw: string | undefined): 7 | 30 | 90 {
  const n = Number(raw);
  if (n === 7) return 7;
  if (n === 90) return 90;
  return 30;
}

function clampCohort(raw: string | undefined): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 12;
  return Math.max(1, Math.min(500, Math.round(n)));
}

export default async function AdminAudienceInsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; cohortMin?: string }>;
}) {
  const q = await searchParams;
  const windowDays = clampDays(q.days);
  const cohortMinCount = clampCohort(q.cohortMin);
  const payload = await loadAdvertiserEngagementPayload({ windowDays, cohortMinCount });

  const baseQs = (days: 7 | 30 | 90) => {
    const p = new URLSearchParams();
    p.set("days", String(days));
    if (cohortMinCount !== 12) p.set("cohortMin", String(cohortMinCount));
    const s = p.toString();
    return s ? `?${s}` : "";
  };

  return (
    <div className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Partnerships", href: "/admin/advertisers" },
          { label: "Audience insights" },
        ]}
        title="Audience insights"
        description="Privacy-safe aggregates only — capped samples, cohort suppression, no user-level exports. Default suppression is stricter than Advertiser overview."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="border-white/15" asChild>
              <Link href="/admin/advertisers">Advertiser overview</Link>
            </Button>
            <Button size="sm" variant="outline" className="border-white/15" asChild>
              <Link href="/admin/media-kit">Media kit</Link>
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/8 bg-card/30 px-4 py-3">
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
              <Link href={`/admin/audience-insights${baseQs(d)}`}>{d}d</Link>
            </Button>
          ))}
        </div>
        <form className="flex flex-wrap items-center gap-2" action="/admin/audience-insights" method="get">
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

      <AdvertiserEngagementDashboard payload={payload} showTopPosts={false} />
    </div>
  );
}
