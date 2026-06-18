/**
 * Play Console may still hold purchases under pre-launch product IDs (migration 122).
 * Catalog rows use short IDs from migration 227 (e.g. sparks_500).
 */
export const LEGACY_ANDROID_SPARK_STORE_IDS: Record<string, readonly string[]> = {
  sparks_100: ['com.pulseverse.sparks.100.android'],
  sparks_500: ['com.pulseverse.sparks.500.android'],
  sparks_1200: ['com.pulseverse.sparks.1200.android'],
  sparks_2500: ['com.pulseverse.sparks.2500.android'],
  sparks_6500: ['com.pulseverse.sparks.6500.android'],
};

/** Legacy border IAP ids (migration 122) → still owned on some devices. */
export const LEGACY_ANDROID_BORDER_STORE_IDS: Record<string, readonly string[]> = {
  border_neon_blue: ['com.pulseverse.border.neon_blue.android'],
  border_gold_pulse: ['com.pulseverse.border.gold_pulse.android'],
};

export function legacyAndroidIdsForCatalogSku(catalogAndroidId: string | null | undefined): string[] {
  const key = catalogAndroidId?.trim();
  if (!key) return [];
  const spark = LEGACY_ANDROID_SPARK_STORE_IDS[key];
  if (spark?.length) return [...spark];
  const border = LEGACY_ANDROID_BORDER_STORE_IDS[key];
  return border?.length ? [...border] : [];
}

export function allAndroidStoreIdsForItem(
  catalogAndroidId: string | null | undefined,
): string[] {
  const current = catalogAndroidId?.trim();
  if (!current) return [];
  return [current, ...legacyAndroidIdsForCatalogSku(current)];
}

/** Register legacy Play product IDs on a store-id → catalog row map. */
export function applyLegacyAndroidStoreAliases<T extends { slug: string; store_product_id_android?: string | null }>(
  map: Map<string, T>,
  rows: T[],
): void {
  for (const row of rows) {
    const android = row.store_product_id_android?.trim();
    if (!android) continue;
    for (const legacy of legacyAndroidIdsForCatalogSku(android)) {
      if (!map.has(legacy)) map.set(legacy, row);
    }
  }
}

export function androidStoreProductIdsEquivalent(
  purchaseProductId: string,
  catalogAndroidId: string | null | undefined,
): boolean {
  const pid = purchaseProductId.trim();
  const catalog = catalogAndroidId?.trim();
  if (!pid || !catalog) return false;
  if (pid === catalog) return true;
  return legacyAndroidIdsForCatalogSku(catalog).includes(pid);
}
