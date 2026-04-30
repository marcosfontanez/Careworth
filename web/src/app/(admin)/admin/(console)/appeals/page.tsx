import { AppealRowActions } from "@/components/admin/appeal-row-actions";
import { AdminOpsStrip } from "@/components/admin/dashboard-panels";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminPanelCard } from "@/components/admin/admin-panel-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadAppealOpsStrip, loadAppeals } from "@/lib/admin/queries";

export default async function AdminAppealsPage() {
  const [appeals, ops] = await Promise.all([loadAppeals(), loadAppealOpsStrip()]);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Appeals" }]}
        title="Appeals"
        description={`Content appeals from Supabase — ${appeals.length} rows.`}
      />
      <AdminOpsStrip
        items={
          ops.length
            ? ops
            : [
                { label: "Open", value: "0", hint: "—" },
                { label: "Under review", value: "0", hint: "—" },
                { label: "Closed (30d)", value: "0", hint: "—" },
              ]
        }
        className="xl:grid-cols-3"
      />
      <div className="grid gap-4">
        {appeals.length ? (
          appeals.map((a) => (
            <AdminPanelCard key={a.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-lg">{a.userName}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">{a.actionTaken}</p>
                </div>
                <StatusBadge status={a.status} />
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>{a.notes}</p>
                <p className="text-xs">Requested {new Date(a.requestedAt).toLocaleString()}</p>
                <AppealRowActions appealId={a.id} status={a.status} />
              </CardContent>
            </AdminPanelCard>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No appeals in the database yet.</p>
        )}
      </div>
    </div>
  );
}
