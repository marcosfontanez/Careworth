import { Platform } from 'react-native';
import { allAndroidStoreIdsForItem } from '@/lib/shop/legacyAndroidSkus';

/** Dedupe key for a store purchase record (transaction id preferred). */
export function purchaseProcessKey(purchase: {
  productId?: string;
  transactionId?: string | null;
  purchaseToken?: string | null;
}): string {
  const pid = purchase.productId?.trim() ?? '';
  const tid = purchase.transactionId?.trim() ?? '';
  const tok = purchase.purchaseToken?.trim() ?? '';
  return tid || tok || pid;
}

/** Match a StoreKit/Play product id to the catalog SKU (incl. legacy Android aliases). */
export function storeProductMatchesCatalogSku(productId: string, catalogSku: string): boolean {
  const pid = productId.trim();
  const sku = catalogSku.trim();
  if (!pid || !sku) return false;
  if (pid === sku) return true;
  if (Platform.OS === 'android') {
    return allAndroidStoreIdsForItem(sku).includes(pid);
  }
  return false;
}

/** True when a second purchaseSku call should reject with PURCHASE_IN_PROGRESS. */
export function isConcurrentPurchaseBlocked(
  activeSlot: { settled: boolean } | null | undefined,
): boolean {
  return Boolean(activeSlot && !activeSlot.settled);
}

/** Server already granted — safe to finish the store transaction without re-crediting. */
export function shouldTreatFulfillmentAsGranted(code: string, message: string): boolean {
  return code === 'DUPLICATE_PURCHASE' || /already|duplicate|fulfilled/i.test(message);
}
