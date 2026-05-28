/**
 * Native in-app purchases (react-native-iap).
 * Requires a development build or release native app — not Expo Go (Nitro/IAP native code).
 */

import { Platform } from 'react-native';
import { isExpoGoClient } from '@/lib/compressorAvailability';
import { GOOGLE_PLAY_LAUNCH_PRODUCT_IDS } from '@/lib/shop/googlePlayProducts';

export type PurchasePlatform = 'ios' | 'android';

export type StoreProductPreview = {
  productId: string;
  title?: string;
  description?: string;
  displayPrice?: string;
};

export type PrefetchStoreProductsResult =
  | { ok: true; products: StoreProductPreview[]; missingProductIds: string[] }
  | { ok: false; message: string };

export type IapPurchaseResult =
  | {
      ok: true;
      /** iOS: base64 receipt; Android: purchaseToken */
      receiptPayload: string;
      productId: string;
      transactionId?: string;
    }
  | { ok: false; code: string; message: string };

type RNIap = typeof import('react-native-iap');

function loadModule(): RNIap | null {
  /** Loading `react-native-iap` pulls Nitro modules and throws in Expo Go before our try/catch helps reliably. */
  if (isExpoGoClient()) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-iap') as RNIap;
  } catch {
    return null;
  }
}

let connectionReady = false;

/**
 * Finish (acknowledge) any transactions that were left pending from a previous
 * app session. Apple's StoreKit and Google's Play Billing both require us to
 * `finishTransaction` on every successful purchase — if the app crashes or
 * Expo reloads between Apple payment auth and our acknowledgement, the old
 * transaction stays in the queue. On the **next** `requestPurchase` call, the
 * native side re-emits the old transaction, our `purchaseUpdatedListener`
 * filters it out (wrong SKU), and the new purchase appears to hang.
 *
 * This drains them defensively at init. Best-effort: any individual error is
 * swallowed (the user can still complete a new purchase even if drain fails).
 */
async function drainPendingTransactions(mod: RNIap): Promise<void> {
  try {
    const fn = mod.getAvailablePurchases as
      | ((opts?: { alsoPublishToEventListenerIOS?: boolean; onlyIncludeActiveItemsIOS?: boolean }) => Promise<
          Array<{ productId: string; purchaseToken?: string | null }>
        >)
      | undefined;
    if (typeof fn !== 'function') return;
    const stale = await fn({
      alsoPublishToEventListenerIOS: false,
      onlyIncludeActiveItemsIOS: false,
    }).catch(() => [] as Array<{ productId: string; purchaseToken?: string | null }>);
    if (!Array.isArray(stale) || stale.length === 0) return;
    for (const purchase of stale) {
      try {
        await mod.finishTransaction({ purchase: purchase as unknown as Parameters<RNIap['finishTransaction']>[0]['purchase'], isConsumable: false });
      } catch {
        /* best effort */
      }
    }
  } catch {
    /* best effort */
  }
}

export async function initIapConnection(): Promise<{ ok: true } | { ok: false; message: string }> {
  const mod = loadModule();
  if (!mod) {
    return {
      ok: false,
      message: isExpoGoClient()
        ? 'Expo Go does not support in-app purchases. Use a development build (e.g. eas build --profile development) or run npx expo run:ios.'
        : 'Store purchases are only available on the iOS/Android app build.',
    };
  }
  if (connectionReady) return { ok: true };
  try {
    await mod.initConnection();
    connectionReady = true;
    /** Drain BEFORE returning so the next requestPurchase isn't blocked by ghost transactions. */
    await drainPendingTransactions(mod);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}

export async function endIapConnection(): Promise<void> {
  const mod = loadModule();
  if (!mod || !connectionReady) return;
  try {
    await mod.endConnection();
  } catch {
    /* noop */
  }
  connectionReady = false;
}

export function platformPrefix(): PurchasePlatform {
  return Platform.OS === 'android' ? 'android' : 'ios';
}

/**
 * Warm Play Billing / App Store product cache for known SKUs (launch catalog + DB rows).
 * Safe to call on shop mount; no-ops on web / Expo Go.
 */
export async function prefetchStoreProducts(
  skus: string[] = GOOGLE_PLAY_LAUNCH_PRODUCT_IDS,
): Promise<PrefetchStoreProductsResult> {
  const mod = loadModule();
  const unique = [...new Set(skus.map((s) => s.trim()).filter(Boolean))];
  if (unique.length === 0) {
    return { ok: true, products: [], missingProductIds: [] };
  }
  if (!mod) {
    return {
      ok: false,
      message: isExpoGoClient()
        ? 'Expo Go does not support in-app purchases.'
        : 'Store purchases are only available on the iOS/Android app build.',
    };
  }
  const init = await initIapConnection();
  if (!init.ok) return { ok: false, message: init.message };

  try {
    const rows = await mod.fetchProducts({ skus: unique, type: 'in-app' });
    const list = Array.isArray(rows) ? rows : [];
    const foundIds = new Set(list.map((p: { id: string }) => p.id));
    const products: StoreProductPreview[] = list.map(
      (p: { id: string; title?: string; description?: string; displayPrice?: string }) => ({
        productId: p.id,
        title: p.title,
        description: p.description,
        displayPrice: p.displayPrice,
      }),
    );
    const missingProductIds = unique.filter((id) => !foundIds.has(id));
    return { ok: true, products, missingProductIds };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}

/**
 * Triggers platform restore (syncs with App Store / Play) and returns active entitlement purchases.
 * Non-consumables typically appear here; consumables may not.
 */
export async function restorePurchasesFromStore(): Promise<
  { ok: true; purchases: { productId: string; purchaseToken?: string | null }[] } | { ok: false; message: string }
> {
  const mod = loadModule();
  if (!mod) {
    return {
      ok: false,
      message: isExpoGoClient()
        ? 'Expo Go does not support in-app purchases. Use a development build or npx expo run:ios.'
        : 'Store purchases are only available on the iOS/Android app build.',
    };
  }
  const init = await initIapConnection();
  if (!init.ok) return { ok: false, message: init.message };
  try {
    await mod.restorePurchases();
    const list = await mod.getAvailablePurchases({
      alsoPublishToEventListenerIOS: false,
      onlyIncludeActiveItemsIOS: true,
    });
    const purchases = list.map((p: { productId: string; purchaseToken?: string | null }) => ({
      productId: p.productId,
      purchaseToken: p.purchaseToken ?? null,
    }));
    return { ok: true, purchases };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}

/** Full app receipt (iOS) for server validation — same receipt can justify multiple product IDs. */
export async function getIosReceiptBase64(): Promise<string | null> {
  if (Platform.OS !== 'ios') return null;
  const mod = loadModule();
  if (!mod) return null;
  const init = await initIapConnection();
  if (!init.ok) return null;
  try {
    const fn = mod.getReceiptIOS as (() => Promise<string>) | undefined;
    if (typeof fn !== 'function') return null;
    const r = await fn();
    const s = typeof r === 'string' ? r.trim() : '';
    return s.length > 0 ? r : null;
  } catch {
    return null;
  }
}

export type IapPurchaseStage =
  | 'requesting'
  | 'awaiting_store'
  | 'validating'
  | 'fulfilled'
  | 'cancelled'
  | 'failed'
  | 'pending';

/**
 * Request purchase for a single SKU; resolves when purchase update delivers matching productId.
 * For consumables (Spark packs), pass isConsumable so Android finishes correctly.
 *
 * `onStage` lets the calling UI render distinct states between Apple payment
 * authorization and our `finishTransaction` ack. Without this, the Shop button
 * appears to "hang" after the user enters their Apple password even though the
 * promise is still actively waiting on `purchaseUpdatedListener`.
 */
export async function purchaseSku(params: {
  sku: string;
  isConsumable?: boolean;
  onStage?: (stage: IapPurchaseStage) => void;
}): Promise<IapPurchaseResult> {
  const { sku, isConsumable = false, onStage } = params;
  const emit = (s: IapPurchaseStage) => {
    try { onStage?.(s); } catch { /* UI errors should never block the purchase */ }
  };
  const mod = loadModule();
  if (!mod) {
    return {
      ok: false,
      code: 'IAP_UNAVAILABLE',
      message: isExpoGoClient()
        ? 'Expo Go does not support in-app purchases. Use a development build or npx expo run:ios.'
        : 'In-app purchases are not available on this build.',
    };
  }

  const init = await initIapConnection();
  if (!init.ok) return { ok: false, code: 'IAP_INIT_FAILED', message: init.message };

  try {
    const products = await mod.fetchProducts({ skus: [sku], type: 'in-app' });
    const found = Array.isArray(products) && products.some((p: { id: string }) => p.id === sku);
    if (!found) {
      const storeLabel = Platform.OS === 'android' ? 'Google Play Console' : 'App Store Connect';
      return {
        ok: false,
        code: 'SKU_NOT_FOUND',
        message: `The store has no product for SKU "${sku}". Create a matching consumable IAP in ${storeLabel}, ensure agreements are active, and wait for propagation after changes.`,
      };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, code: 'FETCH_PRODUCTS_FAILED', message: msg };
  }

  return new Promise((resolve) => {
    let settled = false;
    /** Cleanup helper — must always remove BOTH subscriptions so the next
     * call gets a clean slate. Previous bug: success path called `sub.remove()`
     * but never `errSub.remove()` → native listener leaked every purchase. */
    let cleanup = () => {};

    const sub = mod.purchaseUpdatedListener(async (purchase) => {
      try {
        const pid = purchase.productId;
        if (pid !== sku || settled) return;
        settled = true;
        cleanup();
        emit('validating');

        if (Platform.OS === 'ios') {
          const p = purchase as {
            transactionReceipt?: string;
            transactionId?: string | null;
          };
          const receipt = p.transactionReceipt ?? (await mod.getReceiptIOS?.());
          if (!receipt) {
            emit('failed');
            resolve({ ok: false, code: 'MISSING_RECEIPT', message: 'Could not read App Store receipt.' });
            return;
          }
          resolve({
            ok: true,
            receiptPayload: receipt,
            productId: pid,
            transactionId: p.transactionId ?? undefined,
          });
          /** finishTransaction MUST succeed to free the StoreKit queue for the
           * next purchase. We still resolve first so the server fulfillment
           * call isn't blocked, but we await the ack to free the queue. */
          try {
            await mod.finishTransaction({ purchase, isConsumable });
          } catch {
            /* best effort */
          }
          emit('fulfilled');
          return;
        }

        const token = purchase.purchaseToken;
        if (!token) {
          emit('failed');
          resolve({ ok: false, code: 'MISSING_TOKEN', message: 'Missing Play purchase token.' });
          return;
        }
        resolve({
          ok: true,
          receiptPayload: token,
          productId: pid,
          transactionId: purchase.transactionId ?? undefined,
        });
        try {
          await mod.finishTransaction({ purchase, isConsumable });
        } catch {
          /* best effort */
        }
        emit('fulfilled');
      } catch (e) {
        if (!settled) {
          settled = true;
          cleanup();
          emit('failed');
          resolve({
            ok: false,
            code: 'IAP_ERROR',
            message: e instanceof Error ? e.message : String(e),
          });
        }
      }
    });

    const errSub = mod.purchaseErrorListener((e) => {
      if (settled) return;
      settled = true;
      cleanup();
      const rawCode = (e as { code?: string }).code ?? '';
      const msg = (e as { message?: string }).message ?? String(e);
      const cancelled =
        rawCode === 'E_USER_CANCELLED' ||
        rawCode === 'user-cancelled' ||
        /cancel/i.test(msg);
      if (cancelled) {
        emit('cancelled');
        resolve({ ok: false, code: 'USER_CANCELLED', message: 'Purchase cancelled.' });
        return;
      }
      const deferred =
        rawCode === 'E_DEFERRED_PAYMENT' ||
        /deferred|pending/i.test(msg);
      if (deferred) {
        emit('pending');
        resolve({
          ok: false,
          code: 'PURCHASE_PENDING',
          message: 'Purchase is pending approval (Ask to Buy / parental approval). It will unlock once approved.',
        });
        return;
      }
      const code =
        rawCode === 'sku-not-found' || /sku\s*not\s*found/i.test(msg) ? 'SKU_NOT_FOUND' : rawCode || 'IAP_ERROR';
      emit('failed');
      resolve({
        ok: false,
        code,
        message: msg,
      });
    });

    cleanup = () => {
      try { sub.remove(); } catch { /* noop */ }
      try { errSub.remove(); } catch { /* noop */ }
    };

    emit('requesting');
    mod
      .requestPurchase({
        type: 'in-app',
        request: {
          ios: { sku },
          android: { skus: [sku] },
        },
      } as Parameters<RNIap['requestPurchase']>[0])
      .then(() => {
        if (!settled) emit('awaiting_store');
      })
      .catch((e: unknown) => {
        if (settled) return;
        settled = true;
        cleanup();
        emit('failed');
        resolve({
          ok: false,
          code: 'REQUEST_FAILED',
          message: e instanceof Error ? e.message : String(e),
        });
      });

    /**
     * Safety timeout — after Apple/Play's payment sheet completes, the native
     * `purchaseUpdatedListener` should fire within seconds. 120s is generous
     * for slow networks but still bounded so the UI cannot spin forever (the
     * original beta-blocker symptom).
     */
    setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      emit('failed');
      resolve({ ok: false, code: 'IAP_TIMEOUT', message: 'Store did not complete the purchase in time. Try again — if your card was charged, use Restore Purchases.' });
    }, 120_000);
  });
}
