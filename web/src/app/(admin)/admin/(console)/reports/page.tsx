import { ReportsConsole } from "@/components/admin/reports-console";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { mockReports } from "@/mock/data";

export default function AdminReportsPage() {
  return (
    <div className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Reports" }]}
        title="Reports"
        description="Queue with filter chips — assignment and SLA wiring in a later phase."
      />
      <ReportsConsole reports={mockReports} />
    </div>
  );
}
