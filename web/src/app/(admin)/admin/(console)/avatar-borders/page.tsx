import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { PulseAvatarBordersConsole } from "@/components/admin/pulse-avatar-borders-console";
import { loadPulseAvatarFrameCatalog } from "@/lib/admin/pulse-avatar-frames-queries";

export default async function AdminAvatarBordersPage() {
  const frames = await loadPulseAvatarFrameCatalog();

  return (
    <div className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Pulse avatar borders" },
        ]}
        title="Pulse avatar borders"
        description="Browse every catalog border and grant unlocks to any user (staff only). Catalog rows are versioned in Supabase migrations."
      />
      <PulseAvatarBordersConsole frames={frames} />
    </div>
  );
}
