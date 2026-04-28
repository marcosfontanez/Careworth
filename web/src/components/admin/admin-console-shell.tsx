"use client";

import { usePathname } from "next/navigation";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopbar } from "@/components/admin/admin-topbar";

export function AdminConsoleShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="flex min-h-screen bg-[#050a14] bg-[radial-gradient(ellipse_85%_60%_at_50%_-15%,rgba(45,127,249,0.1),transparent)]">
      <AdminSidebar currentPath={pathname} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar />
        <div className="flex-1 overflow-auto p-6 md:p-8">
          <div className="mx-auto w-full max-w-[1400px] space-y-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
