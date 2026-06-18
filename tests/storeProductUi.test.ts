import { describe, expect, it } from 'vitest';
import { storeSkuForShopItem } from '@/lib/shop/storeProductUi';
import type { ShopItemRow } from '@/lib/shop/types';

function row(partial: Partial<ShopItemRow> & Pick<ShopItemRow, 'slug'>): ShopItemRow {
  const { slug, ...rest } = partial;
  return {
    id: 'id',
    slug,
    name: rest.name ?? slug,
    type: rest.type ?? 'spark_pack',
    is_active: true,
    store_product_id_ios: rest.store_product_id_ios ?? null,
    store_product_id_android: rest.store_product_id_android ?? null,
    ...rest,
  } as ShopItemRow;
}

describe('storeSkuForShopItem', () => {
  it('returns iOS App Store id from catalog row', () => {
    const item = row({
      slug: 'sparks-100',
      store_product_id_ios: 'com.pulseverse.sparks.100.ios',
      store_product_id_android: 'sparks_100',
    });
    expect(storeSkuForShopItem(item, 'ios')).toBe('com.pulseverse.sparks.100.ios');
    expect(storeSkuForShopItem(item, 'android')).toBe('sparks_100');
  });

  it('rejects Android-style sku on iOS catalog rows', () => {
    const item = row({
      slug: 'sparks-500',
      store_product_id_ios: 'sparks_500',
    });
    expect(storeSkuForShopItem(item, 'ios')).toBeNull();
  });
});
