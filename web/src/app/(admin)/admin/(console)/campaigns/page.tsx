import Link from "next/link";

import { CampaignListCsvExport } from "@/components/admin/campaign-list-csv-export";
import { AdminOpsStrip } from "@/components/admin/dashboard-panels";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminPanelCard } from "@/components/admin/admin-panel-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { loadCampaigns } from "@/lib/admin/queries";

export default async function AdminCampaignsPage() {
  const campaigns = await loadCampaigns();
  const impressions = campaigns.reduce((a, c) => a + c.impressions, 0);
  const clicks = campaigns.reduce((a, c) => a + c.clicks, 0);
  const blendedCtr = impressions > 0 ? (clicks / impressions) * 100 : 0;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Partnerships", href: "/admin/advertisers" },
          { label: "Campaigns" },
        ]}
        title="Campaign reporting"
        description={`Portfolio view over ad_campaigns (${campaigns.length} rows loaded). Per-day delivery charts require additional warehousing — open a row for pacing + glossary.`}
        actions={
          <div className="flex flex-wrap gap-2 print:hidden">
            <CampaignListCsvExport rows={campaigns} />
            <Button size="sm" variant="outline" className="border-white/15" asChild>
              <Link href="/admin/inventory">Inventory & placements</Link>
            </Button>
            <Button size="sm" variant="outline" className="border-white/15" asChild>
              <Link href="/admin/insights?tab=campaigns">Insights tab</Link>
            </Button>
          </div>
        }
      />
      <AdminOpsStrip
        items={[
          { label: "Rows tracked", value: String(campaigns.length), hint: "latest start_date" },
          { label: "Impressions Σ", value: formatCount(impressions), hint: "list rollup" },
          { label: "Clicks Σ", value: formatCount(clicks), hint: "list rollup" },
          { label: "Blended CTR", value: `${blendedCtr.toFixed(3)}%`, hint: "Σ clicks ÷ Σ impr." },
        ]}
        className="xl:grid-cols-4"
      />
      <AdminPanelCard>
        <CardHeader>
          <CardTitle>Campaign list</CardTitle>
          <p className="text-xs text-muted-foreground">
            CTR uses row totals. Pacing compares spend vs linear flight when budgets + dates allow.
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Sponsor</TableHead>
                <TableHead>Placement</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead className="text-right">Impr.</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead className="text-right">CTR %</TableHead>
                <TableHead>Pacing</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.length ? (
                campaigns.map((c) => (
                  <TableRow key={c.id} className="border-border">
                    <TableCell className="font-medium">{c.sponsor}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">{c.placement}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-white/15 font-normal">
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                      {c.start} → {c.end}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatCount(c.impressions)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCount(c.clicks)}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.ctr.toFixed(3)}</TableCell>
                    <TableCell className="max-w-[220px] truncate text-xs text-muted-foreground">
                      {c.pacingNote ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/admin/campaigns/${c.id}`}>Detail</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-muted-foreground">
                    No campaigns in Supabase yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </AdminPanelCard>
    </div>
  );
}
