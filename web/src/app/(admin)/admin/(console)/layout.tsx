import { AdminConsoleShell } from "@/components/admin/admin-console-shell";
import { loadAdminNotificationDigest, loadSystemHealthSnapshot } from "@/lib/admin/queries";
import { getAdminStaffHeader } from "@/lib/admin/session";
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
  const [notifications, staff, healthRows] = await Promise.all([
    loadAdminNotificationDigest(),
    getAdminStaffHeader(),
    loadSystemHealthSnapshot(),
  ]);
  return (
    <AdminConsoleShell
      notifications={notifications}
      staffName={staff.displayName}
      staffSubtitle={staff.subtitle}
      health={buildHealthStrip(healthRows)}
    >
      {children}
    </AdminConsoleShell>
  );
}
