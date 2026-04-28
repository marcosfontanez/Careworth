import { AdminOpsStrip } from "@/components/admin/dashboard-panels";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminPanelCard } from "@/components/admin/admin-panel-card";
import { StatusBadge } from "@/components/admin/status-badge";
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
import { loadLiveSessions } from "@/lib/admin/queries";
import { liveOpsSummary } from "@/mock/data";

export default async function AdminLivePage() {
  const sessions = await loadLiveSessions();

  return (
    <div className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Live" }]}
        title="Live"
        description={`Streams from Supabase — ${sessions.length} rows (includes ended for ops).`}
      />
      <AdminOpsStrip items={liveOpsSummary} className="xl:grid-cols-3" />
      <AdminPanelCard>
        <CardHeader>
          <CardTitle>Streams</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Title</TableHead>
                <TableHead>Host</TableHead>
                <TableHead>Viewers</TableHead>
                <TableHead>Peak</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Flags</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.length ? (
                sessions.map((s) => (
                  <TableRow key={s.id} className="border-border">
                    <TableCell className="max-w-xs font-medium">{s.title}</TableCell>
                    <TableCell>{s.host}</TableCell>
                    <TableCell className="tabular-nums">{s.viewers}</TableCell>
                    <TableCell className="tabular-nums">{s.peak}</TableCell>
                    <TableCell>
                      <StatusBadge status={s.status} />
                    </TableCell>
                    <TableCell className="tabular-nums">{s.flags}</TableCell>
                    <TableCell className="space-x-2 text-right">
                      <Button size="sm" variant="outline">
                        Review
                      </Button>
                      <Button size="sm" variant="destructive">
                        End
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground">
                    No streams returned.
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
