/**
 * Native in-app purchases (react-native-iap).
 * Requires Expo dev client / native build (not Expo Go for real IAP).
 */

import { Platform } from 'react-native';

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
    return { ok: false, message: 'Store purchases are only available on the iOS/Android app build.' };
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
    return { ok: false, code: 'IAP_UNAVAILABLE', message: 'In-app purchases are not available on this build.' };
  }

  const init = await initIapConnection();
  if (!init.ok) return { ok: false, code: 'IAP_INIT_FAILED', message: init.message };

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
      const code = (e as { code?: string }).code ?? 'USER_CANCELLED';
      if (code === 'E_USER_CANCELLED' || String(e).includes('cancel')) {
        resolve({ ok: false, code: 'USER_CANCELLED', message: 'Purchase cancelled.' });
        return;
      }
      resolve({
        ok: false,
        code,
        message: (e as { message?: string }).message ?? String(e),
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
