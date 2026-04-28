import { ReportsConsole } from "@/components/admin/reports-console";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { loadReports } from "@/lib/admin/queries";

export default async function AdminReportsPage() {
  const reports = await loadReports();
  return (
    <div className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Reports" }]}
        title="Reports"
        description={`Trust & safety queue — ${reports.length} rows from Supabase.`}
      />
      <ReportsConsole reports={reports} />
    </div>
  );
}
