import { notFound } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { UserEconomyAuditPanel } from "@/components/admin/user-economy-audit-panel";
import {
  isUuidLike,
  loadUserEconomyAudit,
} from "@/lib/admin/user-economy-queries";

type Props = { params: Promise<{ userId: string }> };

export default async function AdminUserEconomyPage({ params }: Props) {
  const { userId } = await params;
  if (!isUuidLike(userId)) notFound();

  const audit = await loadUserEconomyAudit(userId);
  if (!audit?.profile) notFound();

  const titleBits = [
    audit.profile.displayName ?? audit.profile.username ?? null,
    audit.profile.username ? `@${audit.profile.username}` : null,
  ].filter(Boolean);

  const title = titleBits.length > 0 ? titleBits.join(" · ") : audit.profile.id;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Users", href: "/admin/users" },
          { label: "Economy audit" },
        ]}
        title={title}
        description={`Pulse Shop & economy audit trail — Sparks/Diamonds ledger, IAP receipts, and inventory for user ${audit.profile.id}.`}
      />
      <UserEconomyAuditPanel audit={audit} />
    </div>
  );
}
