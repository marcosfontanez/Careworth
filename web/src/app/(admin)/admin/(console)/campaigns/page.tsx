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
import { mockCampaigns } from "@/mock/data";

export default function AdminCampaignsPage() {
  const impressions = mockCampaigns.reduce((a, c) => a + c.impressions, 0);
  const avgCtr = mockCampaigns.reduce((a, c) => a + c.ctr, 0) / mockCampaigns.length;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Campaigns" }]}
        title="Campaigns"
        description="Advertiser placements and reporting hooks — mock schedule."
      />
      <AdminOpsStrip
        items={[
          { label: "Rows tracked", value: String(mockCampaigns.length), hint: "mock schedule" },
          { label: "Impressions", value: impressions.toLocaleString(), hint: "rolled up" },
          { label: "Avg CTR", value: `${avgCtr.toFixed(2)}%`, hint: "sponsored surfaces" },
        ]}
        className="xl:grid-cols-3"
      />
      <AdminPanelCard>
        <CardHeader>
          <CardTitle>Active & scheduled</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Sponsor</TableHead>
                <TableHead>Placement</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Impressions</TableHead>
                <TableHead>CTR %</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockCampaigns.map((c) => (
                <TableRow key={c.id} className="border-border">
                  <TableCell className="font-medium">{c.sponsor}</TableCell>
                  <TableCell className="text-muted-foreground">{c.placement}</TableCell>
                  <TableCell className="tabular-nums">{c.start}</TableCell>
                  <TableCell className="tabular-nums">{c.end}</TableCell>
                  <TableCell className="tabular-nums">{c.impressions.toLocaleString()}</TableCell>
                  <TableCell className="tabular-nums">{c.ctr.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline">
                      Report
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </AdminPanelCard>
    </div>
  );
}
