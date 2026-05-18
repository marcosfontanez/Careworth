import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminOpsStrip } from "@/components/admin/dashboard-panels";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminPanelCard } from "@/components/admin/admin-panel-card";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCount } from "@/lib/admin/format";
import { loadCampaignById } from "@/lib/admin/queries";

export default async function AdminCampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaign = await loadCampaignById(id);
  if (!campaign) notFound();

  const glossary = [
    {
      term: "Impressions",
      def: "Stored counter on the campaign row — sourcing depends on mobile/web instrumentation feeding ad_campaigns.impressions.",
    },
    {
      term: "Clicks",
      def: "Stored counter on the campaign row — verify server ingest matches creative surfaces.",
    },
    {
      term: "CTR",
      def: "Clicks ÷ impressions from the same row totals (0% when impressions = 0).",
    },
    {
      term: "Pacing note",
      def: "Compares budget_spent ÷ budget_total against elapsed schedule (linear expectation). Requires meaningful budgets + dates.",
    },
  ];

  return (
    <div className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Campaigns", href: "/admin/campaigns" },
          { label: campaign.placement },
        ]}
        title={campaign.placement}
        description={`Sponsor ${campaign.sponsor} · status ${campaign.status}. No per-day delivery table is wired in this console — export list CSV for portfolio rollups.`}
        actions={
          <Button size="sm" variant="outline" className="border-white/15" asChild>
            <Link href="/admin/campaigns">Back to list</Link>
          </Button>
        }
      />

      <AdminOpsStrip
        className="xl:grid-cols-4"
        items={[
          { label: "Impressions", value: formatCount(campaign.impressions), hint: "row total" },
          { label: "Clicks", value: formatCount(campaign.clicks), hint: "row total" },
          { label: "CTR", value: `${campaign.ctr.toFixed(3)}%`, hint: "clicks ÷ impressions" },
          {
            label: "Budget",
            value:
              campaign.budgetTotal > 0
                ? `${formatCount(campaign.budgetSpent)} / ${formatCount(campaign.budgetTotal)}`
                : "—",
            hint: "spent / total",
          },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminPanelCard>
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Start: <span className="tabular-nums text-foreground">{campaign.start}</span>
            </p>
            <p>
              End: <span className="tabular-nums text-foreground">{campaign.end}</span>
            </p>
            <p className="text-xs">
              Status changes are not historized here — rely on Supabase row history or external ops logs when needed.
            </p>
          </CardContent>
        </AdminPanelCard>

        <AdminPanelCard>
          <CardHeader>
            <CardTitle>Pacing</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {campaign.pacingNote ? (
              <p className="text-foreground/90">{campaign.pacingNote}</p>
            ) : (
              <p>No pacing note — budgets may be unset or dates invalid for a linear model.</p>
            )}
          </CardContent>
        </AdminPanelCard>
      </div>

      <AdminPanelCard>
        <CardHeader>
          <CardTitle>Time series performance</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Per-day impressions/clicks require a warehouse table or materialized rollup keyed by campaign_id + date —{" "}
          <span className="text-foreground/85">not available</span> in the web admin schema today.
        </CardContent>
      </AdminPanelCard>

      <AdminPanelCard>
        <CardHeader>
          <CardTitle>Metric glossary</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Term</TableHead>
                <TableHead>Definition</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {glossary.map((row) => (
                <TableRow key={row.term}>
                  <TableCell className="font-medium text-foreground/90">{row.term}</TableCell>
                  <TableCell className="text-muted-foreground">{row.def}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </AdminPanelCard>
    </div>
  );
}
