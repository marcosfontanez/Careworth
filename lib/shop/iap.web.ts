/**
 * Web stub — do not import react-native-iap (pulls react-native-nitro-modules; breaks Metro web).
 */
import { Platform } from 'react-native';

export type PurchasePlatform = 'ios' | 'android';

export type IapPurchaseResult =
  | {
      ok: true;
      receiptPayload: string;
      productId: string;
      transactionId?: string;
      finalize: () => Promise<void>;
    }
  | { ok: false; code: string; message: string };

export type PendingStorePurchase = {
  productId: string;
  purchaseToken?: string | null;
  transactionId?: string | null;
  receiptIosBase64?: string | null;
};

export type ReconcileDecision = { outcome: 'granted' | 'leave'; isConsumable: boolean };

export type StoreProductPreview = {
  productId: string;
  title?: string;
  description?: string;
  displayPrice?: string;
};

export type PrefetchStoreProductsResult =
  | { ok: true; products: StoreProductPreview[]; missingProductIds: string[] }
  | { ok: false; message: string };

export type IapPurchaseStage =
  | 'requesting'
  | 'awaiting_store'
  | 'validating'
  | 'fulfilled'
  | 'cancelled'
  | 'failed'
  | 'pending';

export async function initIapConnection(): Promise<{ ok: true } | { ok: false; message: string }> {
  return { ok: false, message: 'Store purchases are only available on the iOS/Android app build.' };
}

export async function endIapConnection(): Promise<void> {}

export function platformPrefix(): PurchasePlatform {
  return Platform.OS === 'android' ? 'android' : 'ios';
}

export async function purchaseSku(_params: {
  sku: string;
  isConsumable?: boolean;
  onStage?: (stage: IapPurchaseStage) => void;
}): Promise<IapPurchaseResult> {
  return {
    ok: false,
    code: 'IAP_UNAVAILABLE',
    message: 'In-app purchases are not available on web. Use the PulseVerse app.',
  };
}

export async function restorePurchasesFromStore(): Promise<
  { ok: true; purchases: { productId: string; purchaseToken?: string | null }[] } | { ok: false; message: string }
> {
  return { ok: false, message: 'Restore purchases is only available in the iOS/Android app.' };
}

export async function getIosReceiptBase64(): Promise<string | null> {
  return null;
}

export async function prefetchStoreProducts(
  _skus?: string[],
): Promise<PrefetchStoreProductsResult> {
  return { ok: false, message: 'Store product prefetch is only available in the iOS/Android app.' };
}

export async function listAllPendingStorePurchasesAggressive(): Promise<
  Array<{ productId?: string; purchaseToken?: string | null }>
> {
  return [];
}

export async function reconcilePendingPurchases(
  _reFulfill: (p: PendingStorePurchase) => Promise<ReconcileDecision>,
  _opts?: { userInitiated?: boolean },
): Promise<{ finished: number; left: number }> {
  return { finished: 0, left: 0 };
}

export function abortActivePurchase(): void {}

export async function recoverPendingPurchaseForSku(_params: {
  sku: string;
  isConsumable?: boolean;
  aggressive?: boolean;
}): Promise<IapPurchaseResult | { ok: false; code: 'NO_PENDING'; message: string }> {
  return { ok: false, code: 'NO_PENDING', message: 'Not available on web.' };
}
