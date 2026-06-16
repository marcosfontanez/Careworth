import { AdminConsoleShell } from "@/components/admin/admin-console-shell";
import { loadAdminNotificationDigest, loadSystemHealthSnapshot } from "@/lib/admin/queries";
import { requireAdminSession } from "@/lib/admin/require-admin-session";
import { getAdminStaffHeader } from "@/lib/admin/session";
import { resolveStaffContext, type StaffPermission } from "@/lib/admin/staff-permissions";
import type { AdminHealthStrip } from "@/types/admin-health";

export const dynamic = "force-dynamic";

function buildHealthStrip(rows: Awaited<ReturnType<typeof loadSystemHealthSnapshot>>): AdminHealthStrip {
  const total = rows.length;
  const operationalCount = rows.filter((r) => r.status === "operational").length;
  const worst = rows.some((r) => r.status === "down")
    ? ("down" as const)
    : rows.some((r) => r.status === "degraded")
      ? ("degraded" as const)
      : ("operational" as const);
  return { operationalCount, total, worst };
}

export default async function AdminConsoleLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await requireAdminSession();

  const [notifications, staff, healthRows, staffCtx] = await Promise.all([
    loadAdminNotificationDigest(),
    getAdminStaffHeader(),
    loadSystemHealthSnapshot(),
    resolveStaffContext(supabase, user.id),
  ]);
  const allowedPermissions = staffCtx ? ([...staffCtx.permissions] as StaffPermission[]) : [];
  return (
    <AdminConsoleShell
      notifications={notifications}
      staffName={staff.displayName}
      staffSubtitle={staff.subtitle}
      health={buildHealthStrip(healthRows)}
      allowedPermissions={allowedPermissions}
      staffRoles={staffCtx?.roles ?? []}
    >
      {children}
    </AdminConsoleShell>
  );
}
