import { notFound } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { UserAdminDetailPanels } from "@/components/admin/user-admin-detail-panels";
import { UserEconomyAuditPanel } from "@/components/admin/user-economy-audit-panel";
import { requireAdminSession } from "@/lib/admin/require-admin-session";
import { loadAdminUserDetail } from "@/lib/admin/user-admin-mutations";
import { isUuidLike, loadUserEconomyAudit } from "@/lib/admin/user-economy-queries";

type Props = { params: Promise<{ userId: string }> };

export default async function AdminUserDetailPage({ params }: Props) {
  const { userId } = await params;
  if (!isUuidLike(userId)) notFound();

  const [{ user }, detail, audit] = await Promise.all([
    requireAdminSession(),
    loadAdminUserDetail(userId),
    loadUserEconomyAudit(userId),
  ]);

  if (!detail?.profile) notFound();

  const titleBits = [
    detail.profile.displayName,
    detail.profile.username ? `@${detail.profile.username}` : null,
  ].filter(Boolean);
  const title = titleBits.length > 0 ? titleBits.join(" · ") : detail.profile.id;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Users", href: "/admin/users" },
          { label: title },
        ]}
        title={title}
        description={`Staff user detail — enforcement, admin controls, moderation history, and economy audit for ${detail.profile.id}.`}
      />
      <UserAdminDetailPanels detail={detail} currentStaffUserId={user.id} />
      {audit?.profile ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Economy audit</h2>
          <p className="text-sm text-muted-foreground">Pulse Shop ledger, IAP receipts, and inventory.</p>
          <UserEconomyAuditPanel audit={audit} />
        </div>
      ) : null}
    </div>
  );
}
