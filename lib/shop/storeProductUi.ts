import type { StoreProductPreview } from '@/lib/shop/iap';
import type { ShopItemRow } from '@/lib/shop/types';
import type { PurchasePlatform } from '@/lib/shop/iap';

/** Platform store SKU from a catalog row (never cross-platform). */
export function storeSkuForShopItem(item: ShopItemRow, platform: PurchasePlatform): string | null {
  const id =
    platform === 'ios'
      ? item.store_product_id_ios?.trim()
      : item.store_product_id_android?.trim();
  if (!id) return null;
  if (platform === 'ios' && /^sparks_\d+$/.test(id)) {
    if (__DEV__) {
      console.warn(
        `[IAP] Catalog row "${item.slug}" has Android-style SKU on iOS (${id}). Expected com.pulseverse.*.ios`,
      );
    }
    return null;
  }
  return id;
}

/** Prefer StoreKit/Play localized price; fall back to catalog hint. */
export function formatShopStorePrice(
  preview: StoreProductPreview | undefined,
  catalogFallback: string | null | undefined,
): string {
  const localized = preview?.displayPrice?.trim();
  if (localized) return localized;
  const hint = catalogFallback?.trim();
  if (hint) return `About ${hint}`;
  return 'Price from app store';
}

export function isSparkPackPurchasableInStore(
  pack: ShopItemRow,
  platform: PurchasePlatform,
  opts: {
    storeCatalogReady: boolean;
    isStoreSkuMissing: (sku: string | null | undefined) => boolean;
  },
): boolean {
  const sku = storeSkuForShopItem(pack, platform);
  if (!sku || !opts.storeCatalogReady) return false;
  return !opts.isStoreSkuMissing(sku);
}
