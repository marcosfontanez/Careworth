import type { GiftContext, ShopItemRow } from '@/lib/shop/types';

/** Source of truth: active `shop_items` rows where `type === 'gift'`. */
export function filterGiftsForContext(
  catalog: ShopItemRow[] | null | undefined,
  context: GiftContext,
): ShopItemRow[] {
  const rows = catalog ?? [];
  return rows
    .filter((row) => row.type === 'gift' && row.is_active)
    .filter((row) => {
      const contexts = row.gift_contexts ?? [];
      return contexts.length === 0 || contexts.includes(context);
    })
    .sort((a, b) => (a.spark_price ?? 0) - (b.spark_price ?? 0));
}

export function giftCatalogById(catalog: ShopItemRow[] | null | undefined): Map<string, ShopItemRow> {
  const map = new Map<string, ShopItemRow>();
  for (const row of catalog ?? []) {
    if (row.type === 'gift') map.set(row.id, row);
  }
  return map;
}

export function resolveGiftFromCatalog(
  giftItemId: string,
  catalogById: Map<string, ShopItemRow>,
): ShopItemRow | null {
  return catalogById.get(giftItemId) ?? null;
}
