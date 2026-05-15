import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { MerchandisingSectionFocus } from "@/components/admin/merchandising-section-focus";
import { PulseAvatarBordersConsole } from "@/components/admin/pulse-avatar-borders-console";
import { ShopCatalogConsole } from "@/components/admin/shop-catalog-console";
import {
  loadRecentShopAdminGrants,
  loadShopBorderAdminStats,
  loadShopItemsCatalog,
} from "@/lib/admin/shop-catalog-queries";
import { loadPulseAvatarFrameCatalog } from "@/lib/admin/pulse-avatar-frames-queries";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ section?: string }>;
};

export default async function AdminMerchandisingPage(props: Props) {
  const { section } = await props.searchParams;
  const focus = section === "frames" ? "frames" : "shop";

  const [items, recentGrants, borderStatsByItemId, frames] = await Promise.all([
    loadShopItemsCatalog(),
    loadRecentShopAdminGrants(50),
    loadShopBorderAdminStats(),
    loadPulseAvatarFrameCatalog(),
  ]);

  return (
    <div className="space-y-8">
      <MerchandisingSectionFocus section={focus} />
      <AdminPageHeader
        breadcrumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Shop & borders" }]}
        title="Pulse Shop & avatar borders"
        description="Shop SKUs, grant history, and staff avatar-frame unlocks — consolidated for cosmetics ops."
      />
      <section id="merch-pulse-shop" className="scroll-mt-28 space-y-4">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Pulse Shop catalog</h2>
        <ShopCatalogConsole items={items} recentGrants={recentGrants} borderStatsByItemId={borderStatsByItemId} />
      </section>
      <section id="merch-avatar-frames" className="scroll-mt-28 space-y-4">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Avatar frame grants</h2>
        <PulseAvatarBordersConsole frames={frames} />
      </section>
    </div>
  );
}
