/**
 * Native in-app purchases (react-native-iap).
 * Requires a development build or release native app — not Expo Go (Nitro/IAP native code).
 */

import { Platform } from 'react-native';
import { isExpoGoClient } from '@/lib/compressorAvailability';

export type PurchasePlatform = 'ios' | 'android';

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

/**
 * Request purchase for a single SKU; resolves when purchase update delivers matching productId.
 * For consumables (Spark packs), pass isConsumable so Android finishes correctly.
 */
export async function purchaseSku(params: {
  sku: string;
  isConsumable?: boolean;
}): Promise<IapPurchaseResult> {
  const { sku, isConsumable = false } = params;
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
    const sub = mod.purchaseUpdatedListener(async (purchase) => {
      try {
        const pid = purchase.productId;
        if (pid !== sku || settled) return;
        settled = true;
        sub.remove();

        if (Platform.OS === 'ios') {
          const p = purchase as {
            transactionReceipt?: string;
            transactionId?: string | null;
          };
          const receipt = p.transactionReceipt ?? (await mod.getReceiptIOS?.());
          if (!receipt) {
            resolve({ ok: false, code: 'MISSING_RECEIPT', message: 'Could not read App Store receipt.' });
            return;
          }
          resolve({
            ok: true,
            receiptPayload: receipt,
            productId: pid,
            transactionId: p.transactionId ?? undefined,
          });
          try {
            await mod.finishTransaction({ purchase, isConsumable });
          } catch {
            /* best effort */
          }
          return;
        }

        const token = purchase.purchaseToken;
        if (!token) {
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
      } catch (e) {
        if (!settled) {
          settled = true;
          sub.remove();
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
      sub.remove();
      errSub.remove();
      const rawCode = (e as { code?: string }).code ?? '';
      const msg = (e as { message?: string }).message ?? String(e);
      const cancelled =
        rawCode === 'E_USER_CANCELLED' ||
        rawCode === 'user-cancelled' ||
        /cancel/i.test(msg);
      if (cancelled) {
        resolve({ ok: false, code: 'USER_CANCELLED', message: 'Purchase cancelled.' });
        return;
      }
      const code =
        rawCode === 'sku-not-found' || /sku\s*not\s*found/i.test(msg) ? 'SKU_NOT_FOUND' : rawCode || 'IAP_ERROR';
      resolve({
        ok: false,
        code,
        message: msg,
      });
    });

    mod
      .requestPurchase({
        type: 'in-app',
        request: {
          ios: { sku },
          android: { skus: [sku] },
        },
      } as Parameters<RNIap['requestPurchase']>[0])
      .catch((e: unknown) => {
        if (settled) return;
        settled = true;
        sub.remove();
        errSub.remove();
        resolve({
          ok: false,
          code: 'REQUEST_FAILED',
          message: e instanceof Error ? e.message : String(e),
        });
      });

    setTimeout(() => {
      if (settled) return;
      settled = true;
      sub.remove();
      errSub.remove();
      resolve({ ok: false, code: 'IAP_TIMEOUT', message: 'Store did not complete the purchase in time.' });
    }, 120_000);
  });
}
