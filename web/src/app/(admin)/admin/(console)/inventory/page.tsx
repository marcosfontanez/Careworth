import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminPanelCard } from "@/components/admin/admin-panel-card";
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
import { loadPlacementInventorySummary } from "@/lib/admin/queries";

export default async function AdminInventoryPage() {
  const rows = await loadPlacementInventorySummary();

  return (
    <div className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Partnerships", href: "/admin/advertisers" },
          { label: "Inventory & placements" },
        ]}
        title="Inventory & placements"
        description={
          "PulseVerse does not yet expose a dedicated ad_inventory table — placement labels map to ad_campaigns.title " +
          "rows. Active counts use schedule + status heuristics, not a bookings ledger."
        }
      />

      <AdminPanelCard>
        <CardHeader>
          <CardTitle>Distinct placement titles</CardTitle>
          <p className="text-xs text-muted-foreground">
            Occupancy is inferred from sponsor campaigns — unused theoretical inventory is{" "}
            <span className="text-foreground/85">not modeled</span>.
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Placement / surface label</TableHead>
                <TableHead className="text-right">Campaign rows</TableHead>
                <TableHead className="text-right">Active heuristic</TableHead>
                <TableHead className="text-right">Impressions Σ</TableHead>
                <TableHead className="text-right">Clicks Σ</TableHead>
                <TableHead className="text-right">CTR %</TableHead>
                <TableHead>Statuses seen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length ? (
                rows.map((r) => (
                  <TableRow key={r.placement}>
                    <TableCell className="max-w-[220px] font-medium">{r.placement}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.campaignCount}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.activeCampaignCount}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCount(r.impressionsSum)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCount(r.clicksSum)}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.ctrPct}</TableCell>
                    <TableCell className="max-w-[240px] truncate text-xs text-muted-foreground">{r.statuses}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground">
                    No ad_campaigns rows returned.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </AdminPanelCard>

      <p className="text-xs text-muted-foreground">
        Tie campaigns back to sponsors via{" "}
        <Link href="/admin/campaigns" className="text-primary underline-offset-4 hover:underline">
          Campaigns
        </Link>
        .
      </p>
    </div>
  );
}
