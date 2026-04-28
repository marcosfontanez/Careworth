import { AdminOpsStrip } from "@/components/admin/dashboard-panels";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminPanelCard } from "@/components/admin/admin-panel-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadAppeals } from "@/lib/admin/queries";
import { appealsOpsSummary } from "@/mock/data";

export default async function AdminAppealsPage() {
  const appeals = await loadAppeals();

  return (
    <div className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Appeals" }]}
        title="Appeals"
        description={`Content appeals from Supabase — ${appeals.length} rows.`}
      />
      <AdminOpsStrip items={appealsOpsSummary} className="xl:grid-cols-3" />
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
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button size="sm" variant="outline">
                    View bundle
                  </Button>
                  <Button size="sm" className="bg-primary text-primary-foreground">
                    Accept / restore
                  </Button>
                  <Button size="sm" variant="secondary">
                    Deny
                  </Button>
                </div>
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
