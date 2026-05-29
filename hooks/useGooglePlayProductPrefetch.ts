import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { prefetchStoreProducts } from '@/lib/shop/iap';
import { GOOGLE_PLAY_LAUNCH_PRODUCT_IDS } from '@/lib/shop/googlePlayProducts';
import type { ShopItemRow } from '@/lib/shop/types';

/**
 * On Android, prefetch Play Billing product metadata for launch SKUs + active catalog rows.
 * Helps surface SKU_NOT_FOUND early in dev logs; no UI side effects.
 */
export function useGooglePlayProductPrefetch(catalog: ShopItemRow[] | undefined, enabled: boolean) {
  const lastKeyRef = useRef<string>('');

  useEffect(() => {
    if (Platform.OS !== 'android' || !enabled || !catalog?.length) return;

    const fromCatalog = catalog
      .map((row) => row.store_product_id_android?.trim())
      .filter((id): id is string => Boolean(id));
    const skus = [...new Set([...GOOGLE_PLAY_LAUNCH_PRODUCT_IDS, ...fromCatalog])];
    const key = skus.join('|');
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;

    void prefetchStoreProducts(skus).then((res) => {
      if (!res.ok) {
        if (__DEV__) console.warn('[IAP] prefetchStoreProducts failed:', res.message);
        return;
      }
      if (__DEV__ && res.missingProductIds.length > 0) {
        console.warn('[IAP] Play Console missing products:', res.missingProductIds.join(', '));
      }
    });
  }, [catalog, enabled]);
}
