/**
 * Metro resolves `iap.web.ts` (web) and `iap.native.ts` (iOS/Android) instead of this file.
 * This barrel exists so TypeScript can resolve `@/lib/shop/iap`.
 */
export type {
  PurchasePlatform,
  IapPurchaseResult,
  IapPurchaseStage,
  StoreProductPreview,
  PrefetchStoreProductsResult,
  PendingStorePurchase,
  ReconcileDecision,
} from './iap.native';
export {
  initIapConnection,
  endIapConnection,
  platformPrefix,
  purchaseSku,
  restorePurchasesFromStore,
  getIosReceiptBase64,
  prefetchStoreProducts,
  reconcilePendingPurchases,
} from './iap.native';
