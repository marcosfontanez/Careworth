/**
 * Keep in sync with lib/shop/legacyAndroidSkus.ts (client reconcile + fulfillment).
 */

const LEGACY_BY_CATALOG_ANDROID: Record<string, readonly string[]> = {
  sparks_100: ["com.pulseverse.sparks.100.android"],
  sparks_500: ["com.pulseverse.sparks.500.android"],
  sparks_1200: ["com.pulseverse.sparks.1200.android"],
  sparks_2500: ["com.pulseverse.sparks.2500.android"],
  sparks_6500: ["com.pulseverse.sparks.6500.android"],
  border_neon_blue: ["com.pulseverse.border.neon_blue.android"],
  border_gold_pulse: ["com.pulseverse.border.gold_pulse.android"],
};

export function isAllowedAndroidStoreProductId(
  clientProductId: string,
  catalogAndroidId: string,
): boolean {
  const client = clientProductId.trim();
  const catalog = catalogAndroidId.trim();
  if (!client || !catalog) return false;
  if (client === catalog) return true;
  const legacy = LEGACY_BY_CATALOG_ANDROID[catalog];
  return legacy?.includes(client) ?? false;
}

/** Product id passed to Google purchases.products.get (must match the purchase). */
export function playProductIdForGoogleVerify(
  clientProductId: string,
  catalogAndroidId: string,
): string {
  const client = clientProductId.trim();
  const catalog = catalogAndroidId.trim();
  if (isAllowedAndroidStoreProductId(client, catalog)) {
    return client;
  }
  return catalog;
}
