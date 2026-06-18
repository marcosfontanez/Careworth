import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { prefetchStoreProducts, platformPrefix, type StoreProductPreview } from '@/lib/shop/iap';
import { APP_STORE_PREFETCH_PRODUCT_IDS } from '@/lib/shop/appStoreProducts';
import { GOOGLE_PLAY_LAUNCH_PRODUCT_IDS } from '@/lib/shop/googlePlayProducts';
import { storeSkuForShopItem } from '@/lib/shop/storeProductUi';
import {
  buildStoreKitDiagnosticPayload,
  logStoreKitDiagnostics,
} from '@/lib/shop/storeKitDiagnostics';
import type { ShopItemRow } from '@/lib/shop/types';

/**
 * Prefetch App Store / Play product metadata for active catalog SKUs.
 * `missingStoreProductIds` lists SKUs the current platform's store does not return
 * (not created in the console, wrong bundle, or agreements not active).
 */
export function useStoreProductAvailability(
  catalog: ShopItemRow[] | undefined,
  enabled: boolean,
  opts?: { staffDiagnostics?: boolean },
) {
  const lastKeyRef = useRef<string>('');
  const [missingStoreProductIds, setMissingStoreProductIds] = useState<ReadonlySet<string>>(new Set());
  const [storeProductsById, setStoreProductsById] = useState<ReadonlyMap<string, StoreProductPreview>>(
    new Map(),
  );
  const [storeCatalogReady, setStoreCatalogReady] = useState(false);
  const [lastRequestedProductIds, setLastRequestedProductIds] = useState<string[]>([]);
  const [lastReturnedProductIds, setLastReturnedProductIds] = useState<string[]>([]);

  const platform = platformPrefix();
  const staffDiagnostics = opts?.staffDiagnostics === true;

  const catalogSkus = useMemo(() => {
    if (!catalog?.length) return [] as string[];
    const ids: string[] = [];
    for (const row of catalog) {
      const id = storeSkuForShopItem(row, platform);
      if (id) ids.push(id);
    }
    return ids;
  }, [catalog, platform]);

  useEffect(() => {
    if (Platform.OS === 'web' || !enabled || catalogSkus.length === 0) {
      setMissingStoreProductIds(new Set());
      setStoreProductsById(new Map());
      setStoreCatalogReady(Platform.OS === 'web');
      setLastRequestedProductIds([]);
      setLastReturnedProductIds([]);
      return;
    }

    const skus = [
      ...new Set([
        ...(Platform.OS === 'android' ? GOOGLE_PLAY_LAUNCH_PRODUCT_IDS : APP_STORE_PREFETCH_PRODUCT_IDS),
        ...catalogSkus,
      ]),
    ];
    const key = `${platform}|${skus.join('|')}`;
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;
    setStoreCatalogReady(false);

    void prefetchStoreProducts(skus).then((res) => {
      setStoreCatalogReady(true);
      if (!res.ok) {
        if (__DEV__ || staffDiagnostics) {
          console.warn('[IAP] prefetchStoreProducts failed:', res.message);
        }
        setLastRequestedProductIds(skus);
        setLastReturnedProductIds([]);
        return;
      }
      setMissingStoreProductIds(new Set(res.missingProductIds));
      setStoreProductsById(new Map(res.products.map((p) => [p.productId, p])));
      setLastRequestedProductIds(skus);
      setLastReturnedProductIds(res.products.map((p) => p.productId));

      if (__DEV__ || staffDiagnostics) {
        logStoreKitDiagnostics(
          buildStoreKitDiagnosticPayload(skus, res.products, res.missingProductIds),
        );
      }
    });
  }, [catalogSkus, enabled, platform, staffDiagnostics]);

  const isStoreSkuMissing = useMemo(
    () => (sku: string | null | undefined) => {
      const id = sku?.trim();
      if (!id) return true;
      if (!storeCatalogReady) return true;
      return missingStoreProductIds.has(id);
    },
    [missingStoreProductIds, storeCatalogReady],
  );

  const getStoreProduct = useMemo(
    () => (sku: string | null | undefined) => {
      const id = sku?.trim();
      if (!id) return undefined;
      return storeProductsById.get(id);
    },
    [storeProductsById],
  );

  return {
    missingStoreProductIds,
    isStoreSkuMissing,
    getStoreProduct,
    storeCatalogReady,
    platform,
    lastRequestedProductIds,
    lastReturnedProductIds,
    storeProductsById,
  };
}
