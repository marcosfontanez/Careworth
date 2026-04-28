import { AdminOpsStrip } from "@/components/admin/dashboard-panels";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminPanelCard } from "@/components/admin/admin-panel-card";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { circlesOpsSummary, mockCircles } from "@/mock/data";

export default function AdminCirclesPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <AdminPageHeader
          breadcrumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Circles" }]}
          title="Circles"
          description="Create, edit, featured order — connect to Supabase when ready."
        />
        <div className="flex shrink-0 gap-2">
          <Input placeholder="Search circle…" className="w-56 bg-secondary/40" />
          <Button className="bg-primary text-primary-foreground">New circle</Button>
        </div>
      </div>
      <AdminOpsStrip items={circlesOpsSummary} className="xl:grid-cols-3" />
      <AdminPanelCard>
        <CardHeader>
          <CardTitle>All circles</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>24h posts</TableHead>
                <TableHead>Featured</TableHead>
                <TableHead>Trend</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockCircles.map((c) => (
                <TableRow key={c.id} className="border-border">
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground">/{c.slug}</TableCell>
                  <TableCell className="tabular-nums">{c.members.toLocaleString()}</TableCell>
                  <TableCell className="tabular-nums">{c.posts24h}</TableCell>
                  <TableCell className="tabular-nums">{c.featuredOrder ?? "—"}</TableCell>
                  <TableCell className="tabular-nums">{c.trendScore}</TableCell>
                  <TableCell className="space-x-2 text-right">
                    <Button size="sm" variant="outline">
                      Edit
                    </Button>
                    <Button size="sm" variant="secondary">
                      Moderate
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
