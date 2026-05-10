import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ShopCatalogConsole } from "@/components/admin/shop-catalog-console";
import {
  loadRecentShopAdminGrants,
  loadShopBorderAdminStats,
  loadShopItemsCatalog,
} from "@/lib/admin/shop-catalog-queries";

export const dynamic = "force-dynamic";

export default async function AdminShopCatalogPage() {
  const [items, recentGrants, borderStatsByItemId] = await Promise.all([
    loadShopItemsCatalog(),
    loadRecentShopAdminGrants(50),
    loadShopBorderAdminStats(),
  ]);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Shop catalog & grants" },
        ]}
        title="Pulse Shop catalog"
        description="Historical SKUs in shop_items, staff grants for Sparks packs and borders, and a running grant log."
      />
      <ShopCatalogConsole
        items={items}
        recentGrants={recentGrants}
        borderStatsByItemId={borderStatsByItemId}
      />
    </div>
  );
}
