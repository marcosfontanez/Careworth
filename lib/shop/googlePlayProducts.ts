/**
 * Google Play in-app product IDs for PulseVerse launch SKUs.
 * Must match Play Console → Monetize → Products → In-app products exactly.
 *
 * Catalog rows (`shop_items.store_product_id_android`) are the runtime source of truth;
 * this module is used for prefetch, staff docs, and Play Console checklists.
 */

export type GooglePlayProductKind = 'consumable' | 'non_consumable';

export type GooglePlayLaunchProduct = {
  productId: string;
  kind: GooglePlayProductKind;
  /** Expected `shop_items.slug` in Supabase */
  catalogSlug: string;
  label: string;
};

/** Launch set — create these SKUs in Play Console before testing purchases. */
export const GOOGLE_PLAY_LAUNCH_PRODUCTS: readonly GooglePlayLaunchProduct[] = [
  { productId: 'sparks_100', kind: 'consumable', catalogSlug: 'sparks-100', label: '100 Sparks' },
  { productId: 'sparks_500', kind: 'consumable', catalogSlug: 'sparks-500', label: '500 Sparks' },
  { productId: 'sparks_1200', kind: 'consumable', catalogSlug: 'sparks-1200', label: '1,200 Sparks' },
] as const;

export const GOOGLE_PLAY_LAUNCH_PRODUCT_IDS = GOOGLE_PLAY_LAUNCH_PRODUCTS.map((p) => p.productId);

const consumableIds = new Set(
  GOOGLE_PLAY_LAUNCH_PRODUCTS.filter((p) => p.kind === 'consumable').map((p) => p.productId),
);

export function isGooglePlayConsumableProductId(productId: string): boolean {
  return consumableIds.has(productId.trim());
}

export function buildGooglePlayConsoleChecklist(): string {
  const lines: string[] = [
    'Google Play Console — In-app products (package com.pulseverse.app)',
    '',
    'Create each product under Monetize → Products → In-app products.',
    'Product ID must match exactly (case-sensitive).',
    '',
  ];
  for (const p of GOOGLE_PLAY_LAUNCH_PRODUCTS) {
    const playType = p.kind === 'consumable' ? 'Consumable' : 'One-time product (non-consumable)';
    lines.push(`${p.productId}`);
    lines.push(`  Type: ${playType}`);
    lines.push(`  Catalog slug: ${p.catalogSlug}`);
    lines.push(`  Label: ${p.label}`);
    lines.push('');
  }
  lines.push('After creating products, activate them and add to an internal testing release.');
  lines.push('Backend: set GOOGLE_PLAY_PACKAGE_NAME and GOOGLE_PLAY_SERVICE_ACCOUNT_JSON on pulse-shop-fulfillment.');
  return lines.join('\n');
}
