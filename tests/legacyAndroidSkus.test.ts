import { describe, expect, it } from 'vitest';
import {
  allAndroidStoreIdsForItem,
  androidStoreProductIdsEquivalent,
  applyLegacyAndroidStoreAliases,
} from '@/lib/shop/legacyAndroidSkus';

describe('legacyAndroidSkus', () => {
  it('includes current and legacy ids for spark packs', () => {
    const ids = allAndroidStoreIdsForItem('sparks_500');
    expect(ids).toContain('sparks_500');
    expect(ids).toContain('com.pulseverse.sparks.500.android');
  });

  it('maps legacy purchase product id to catalog row', () => {
    expect(androidStoreProductIdsEquivalent('com.pulseverse.sparks.500.android', 'sparks_500')).toBe(
      true,
    );
    expect(androidStoreProductIdsEquivalent('sparks_500', 'sparks_500')).toBe(true);
    expect(androidStoreProductIdsEquivalent('wrong', 'sparks_500')).toBe(false);
  });

  it('registers legacy aliases on store-id map', () => {
    const row = {
      slug: 'sparks-500',
      store_product_id_android: 'sparks_500',
    };
    const map = new Map<string, typeof row>();
    map.set('sparks_500', row);
    applyLegacyAndroidStoreAliases(map, [row]);
    expect(map.get('com.pulseverse.sparks.500.android')).toEqual(row);
  });
});
