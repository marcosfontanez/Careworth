import { AdminConsoleShell } from "@/components/admin/admin-console-shell";
import { loadAdminNotificationDigest } from "@/lib/admin/queries";
import { getAdminStaffHeader } from "@/lib/admin/session";

export const dynamic = "force-dynamic";

export default async function AdminConsoleLayout({ children }: { children: React.ReactNode }) {
  const [notifications, staff] = await Promise.all([loadAdminNotificationDigest(), getAdminStaffHeader()]);
  return (
    <AdminConsoleShell
      notifications={notifications}
      staffName={staff.displayName}
      staffSubtitle={staff.subtitle}
    >
      {children}
    </AdminConsoleShell>
  );
}
