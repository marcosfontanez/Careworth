import { UsersConsole } from "@/components/admin/users-console";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { loadAdminUsers } from "@/lib/admin/queries";

export default async function AdminUsersPage() {
  const users = await loadAdminUsers();
  return (
    <div className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Users" }]}
        title="Users"
        description={`Directory from Supabase — ${users.length} profiles (bans when active).`}
      />
      <UsersConsole users={users} />
    </div>
  );
}
