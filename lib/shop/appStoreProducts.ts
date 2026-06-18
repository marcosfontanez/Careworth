/**
 * App Store Connect in-app purchase IDs for PulseVerse iOS.
 * Runtime catalog rows (`shop_items.store_product_id_ios`) are authoritative;
 * this module supports prefetch, staff checklists, and StoreKit diagnostics.
 */

export type AppStoreProductKind = 'consumable' | 'non_consumable';

export type AppStoreLaunchProduct = {
  productId: string;
  kind: AppStoreProductKind;
  catalogSlug: string;
  label: string;
};

/** Spark packs — consumables (must match App Store Connect exactly). */
export const APP_STORE_SPARK_PACK_PRODUCTS: readonly AppStoreLaunchProduct[] = [
  {
    productId: 'com.pulseverse.sparks.100.ios',
    kind: 'consumable',
    catalogSlug: 'sparks-100',
    label: '100 Sparks',
  },
  {
    productId: 'com.pulseverse.sparks.500.ios',
    kind: 'consumable',
    catalogSlug: 'sparks-500',
    label: '500 Sparks',
  },
  {
    productId: 'com.pulseverse.sparks.1200.ios',
    kind: 'consumable',
    catalogSlug: 'sparks-1200',
    label: '1,200 Sparks',
  },
  {
    productId: 'com.pulseverse.sparks.2500.ios',
    kind: 'consumable',
    catalogSlug: 'sparks-2500',
    label: '2,500 Sparks',
  },
  {
    productId: 'com.pulseverse.sparks.6500.ios',
    kind: 'consumable',
    catalogSlug: 'sparks-6500',
    label: '6,500 Sparks',
  },
] as const;

/** Borders currently listed in App Store Connect (non-consumable). */
export const APP_STORE_BORDER_PRODUCTS: readonly AppStoreLaunchProduct[] = [
  {
    productId: 'com.pulseverse.border.pride_month_2026.ios',
    kind: 'non_consumable',
    catalogSlug: 'border-pride-month-2026',
    label: 'Pride Month 2026 border',
  },
  {
    productId: 'com.pulseverse.border.juneteenth_2026.ios',
    kind: 'non_consumable',
    catalogSlug: 'border-juneteenth-2026-charity',
    label: 'Juneteenth 2026 border',
  },
  {
    productId: 'com.pulseverse.border.class_of_2026.ios',
    kind: 'non_consumable',
    catalogSlug: 'border-class-of-2026',
    label: 'Class of 2026 border',
  },
] as const;

export const APP_STORE_LAUNCH_PRODUCTS: readonly AppStoreLaunchProduct[] = [
  ...APP_STORE_SPARK_PACK_PRODUCTS,
  ...APP_STORE_BORDER_PRODUCTS,
] as const;

export const APP_STORE_PREFETCH_PRODUCT_IDS = APP_STORE_LAUNCH_PRODUCTS.map((p) => p.productId);

export const IOS_BUNDLE_ID = 'com.pulseverse.app';

export function isAppStoreSparkPackProductId(productId: string): boolean {
  return APP_STORE_SPARK_PACK_PRODUCTS.some((p) => p.productId === productId.trim());
}
