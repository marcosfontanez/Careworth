import { AdminConsoleShell } from "@/components/admin/admin-console-shell";

export default function AdminConsoleLayout({ children }: { children: React.ReactNode }) {
  return <AdminConsoleShell>{children}</AdminConsoleShell>;
}
