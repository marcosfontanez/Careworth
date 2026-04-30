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
import { loadAdminAuditLog } from "@/lib/admin/platform-queries";

export default async function AdminAuditPage() {
  const rows = await loadAdminAuditLog(120);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Audit log" }]}
        title="Staff audit log"
        description="Immutable-style append log for moderation and live ops actions (after migration 067)."
      />
      <AdminPanelCard>
        <CardHeader>
          <CardTitle>Recent events</CardTitle>
          <p className="text-xs text-muted-foreground">Newest first · capped at 120 rows.</p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Staff</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Id</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length ? (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(r.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs">{r.staffDisplayName}</TableCell>
                    <TableCell className="max-w-[180px] truncate font-mono text-xs">{r.action}</TableCell>
                    <TableCell className="text-xs">{r.entityType}</TableCell>
                    <TableCell className="max-w-[120px] truncate font-mono text-xs">{r.entityId ?? "—"}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    No audit rows yet. Run migration 067 and perform a moderation action.
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
