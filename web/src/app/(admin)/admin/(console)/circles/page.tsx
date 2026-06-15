import { AdminCirclesConsole } from "@/components/admin/admin-circles-console";
import { AdminOpsStrip } from "@/components/admin/dashboard-panels";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { loadCircles, loadCirclesOpsStrip } from "@/lib/admin/queries";

export default async function AdminCirclesPage() {
  const [circles, ops] = await Promise.all([loadCircles(), loadCirclesOpsStrip()]);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Circles" }]}
        title="Circles"
        description={`Community curation — ${circles.length} circles. Create, edit, feature, and archive from the web console.`}
      />
      <AdminOpsStrip items={ops.length ? ops : [{ label: "Circles", value: "0", hint: "no data" }]} className="xl:grid-cols-3" />
      <AdminCirclesConsole circles={circles} />
    </div>
  );
}
