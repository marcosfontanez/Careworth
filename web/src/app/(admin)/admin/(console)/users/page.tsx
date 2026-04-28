import { UsersConsole } from "@/components/admin/users-console";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { mockUsers } from "@/mock/data";

export default function AdminUsersPage() {
  return (
    <div className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Users" }]}
        title="Users"
        description="Search, filter, suspend, ban — mock data for console review."
      />
      <UsersConsole users={mockUsers} />
    </div>
  );
}
