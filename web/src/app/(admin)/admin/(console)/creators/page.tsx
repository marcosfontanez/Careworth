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
import { mockCreators } from "@/mock/data";

export default function AdminCreatorsPage() {
  const verified = mockCreators.filter((c) => c.verified).length;
  const topScore = Math.max(...mockCreators.map((c) => c.score));

  return (
    <div className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Creators" }]}
        title="Creators"
        description="Verification, featuring, and partner readiness."
      />
      <AdminOpsStrip
        items={[
          { label: "In directory", value: String(mockCreators.length), hint: "mock cohort" },
          { label: "Verified", value: String(verified), hint: "badged accounts" },
          { label: "Top health score", value: String(topScore), hint: "internal ranking" },
        ]}
        className="xl:grid-cols-3"
      />
      <AdminPanelCard>
        <CardHeader>
          <CardTitle>Creator list</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Handle</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Followers</TableHead>
                <TableHead>Live hours</TableHead>
                <TableHead>Verified</TableHead>
                <TableHead>Score</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockCreators.map((c) => (
                <TableRow key={c.id} className="border-border">
                  <TableCell className="font-medium">@{c.handle}</TableCell>
                  <TableCell className="text-muted-foreground">{c.profession_display}</TableCell>
                  <TableCell className="tabular-nums">{c.followers.toLocaleString()}</TableCell>
                  <TableCell className="tabular-nums">{c.liveHours}</TableCell>
                  <TableCell>
                    {c.verified ? (
                      <Badge variant="outline" className="border-primary/40 text-primary">
                        Verified
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums">{c.score}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline">
                      Review
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
