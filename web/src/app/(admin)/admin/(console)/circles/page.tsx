import { AdminCirclesDirectory } from "@/components/admin/admin-circles-directory";
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
        description={`Communities from Supabase — ${circles.length} rows. Filter locally by name or slug; structural edits stay in Studio until a write API ships.`}
      />
      <AdminOpsStrip items={ops.length ? ops : [{ label: "Circles", value: "0", hint: "no data" }]} className="xl:grid-cols-3" />
      <AdminCirclesDirectory circles={circles} />
    </div>
  );
}
