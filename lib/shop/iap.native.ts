/**
 * Native in-app purchases (react-native-iap).
 * Requires a development build or release native app — not Expo Go (Nitro/IAP native code).
 */

import { Platform } from 'react-native';
import { isExpoGoClient } from '@/lib/compressorAvailability';
import { GOOGLE_PLAY_PREFETCH_PRODUCT_IDS } from '@/lib/shop/googlePlayProducts';
import { allAndroidStoreIdsForItem } from '@/lib/shop/legacyAndroidSkus';
import {
  isConcurrentPurchaseBlocked,
  purchaseProcessKey,
  storeProductMatchesCatalogSku,
} from '@/lib/shop/iapPurchaseGuards';
import { iapDiag, IAP_EVENTS } from '@/lib/shop/iapDiagnostics';

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
      /** iOS: StoreKit 2 transaction JWS (`purchase.purchaseToken`); Android: purchaseToken */
      receiptPayload: string;
      productId: string;
      transactionId?: string;
      /**
       * Acknowledge (iOS) / consume (Android consumables) the store transaction.
       * Call this ONLY after the server grant has succeeded. Leaving a purchase
       * un-finalized when the grant fails is intentional: Apple re-delivers the
       * transaction on next launch and Google auto-refunds an unacknowledged
       * purchase (~3 days), so the user is never charged without receiving value.
       */
      finalize: () => Promise<void>;
    }
  | { ok: false; code: string; message: string };

/** A store purchase that has not yet been acknowledged/consumed. */
export type PendingStorePurchase = {
  productId: string;
  purchaseToken?: string | null;
  transactionId?: string | null;
  /** iOS StoreKit 2 transaction JWS for this specific purchase (server-verifiable). */
  iosJws?: string | null;
  /** Legacy iOS app receipt (base64). Unused on StoreKit 2 builds; kept for back-compat. */
  receiptIosBase64?: string | null;
};

/** What the caller's re-fulfillment decided for a pending purchase. */
export type ReconcileDecision = { outcome: 'granted' | 'leave'; isConsumable: boolean };

export type IapPurchaseStage =
  | 'requesting'
  | 'awaiting_store'
  | 'validating'
  | 'fulfilled'
  | 'cancelled'
  | 'failed'
  | 'pending';

type StorePurchaseRecord = {
  productId?: string;
  purchaseToken?: string | null;
  transactionId?: string | null;
  transactionReceipt?: string;
};

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
let globalListenersAttached = false;

/**
 * Max time we block the UI on a store acknowledge/consume. The server grant has
 * already succeeded by the time we call this, so the user has their Sparks/border
 * regardless. On Android, `finishTransaction({ isConsumable: true })` (Play
 * consume) can occasionally stall in react-native-iap v14; without a ceiling the
 * purchase modal hangs on "Crediting Sparks…" even though fulfillment is done.
 * If the consume hasn't finished in time we stop waiting and let it complete in
 * the background — any leftover unconsumed purchase is cleaned up by
 * `reconcilePendingPurchases` on the next Shop open (server fulfillment is
 * idempotent, so the user is never charged or granted twice).
 */
const FINALIZE_TIMEOUT_MS = 8_000;

/**
 * Run `finishTransaction` but never block the caller for more than
 * FINALIZE_TIMEOUT_MS. The finish promise carries its own catch so a late
 * rejection after the timeout can't surface as an unhandled rejection.
 */
async function finishTransactionBounded(
  mod: RNIap,
  purchase: StorePurchaseRecord,
  isConsumable: boolean,
  productIdForDiag: string,
): Promise<void> {
  iapDiag(IAP_EVENTS.IAP_FINISH_TRANSACTION_START, { productId: productIdForDiag, isConsumable });
  const finish = Promise.resolve()
    .then(() =>
      mod.finishTransaction({
        purchase: purchase as unknown as Parameters<RNIap['finishTransaction']>[0]['purchase'],
        isConsumable,
      }),
    )
    .then(() => iapDiag(IAP_EVENTS.IAP_FINISH_TRANSACTION_DONE, { productId: productIdForDiag }))
    .catch((e) =>
      iapDiag(IAP_EVENTS.IAP_FINISH_TRANSACTION_DONE, {
        productId: productIdForDiag,
        failed: true,
        message: e instanceof Error ? e.message.slice(0, 80) : 'unknown',
      }),
    );

  let timer: ReturnType<typeof setTimeout> | undefined;
  const ceiling = new Promise<void>((resolve) => {
    timer = setTimeout(() => {
      iapDiag('finishTransaction timeout — continuing, reconcile will finish it', {
        productId: productIdForDiag,
      });
      resolve();
    }, FINALIZE_TIMEOUT_MS);
  });

  await Promise.race([finish, ceiling]);
  if (timer) clearTimeout(timer);
}

type ActivePurchaseSlot = {
  sku: string;
  isConsumable: boolean;
  settled: boolean;
  emit: (stage: IapPurchaseStage) => void;
  resolve: (result: IapPurchaseResult) => void;
  timeoutId: ReturnType<typeof setTimeout>;
  cleanup: () => void;
};

let activePurchaseSlot: ActivePurchaseSlot | null = null;
const processedPurchaseKeys = new Set<string>();

/** v14 requestPurchase / listener payloads — normalize to our internal store record shape. */
function coerceStorePurchaseRecord(raw: unknown, expectedSku: string): StorePurchaseRecord | null {
  if (raw == null) return null;
  const items = Array.isArray(raw) ? raw : [raw];
  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const productId =
      typeof rec.productId === 'string'
        ? rec.productId.trim()
        : typeof rec.id === 'string'
          ? rec.id.trim()
          : '';
    if (!productId || !storeProductMatchesCatalogSku(productId, expectedSku)) continue;
    return {
      productId,
      transactionId:
        typeof rec.transactionId === 'string'
          ? rec.transactionId
          : typeof rec.transactionId === 'number'
            ? String(rec.transactionId)
            : null,
      purchaseToken: typeof rec.purchaseToken === 'string' ? rec.purchaseToken : null,
      transactionReceipt:
        typeof rec.transactionReceipt === 'string' ? rec.transactionReceipt : undefined,
    };
  }
  return null;
}

function attachGlobalPurchaseListeners(mod: RNIap): void {
  if (globalListenersAttached) return;

  mod.purchaseUpdatedListener(async (purchase) => {
    const slot = activePurchaseSlot;
    const pid = typeof purchase.productId === 'string' ? purchase.productId : '';
    const dedupeKey = purchaseProcessKey(purchase as StorePurchaseRecord);
    if (dedupeKey && processedPurchaseKeys.has(dedupeKey)) {
      iapDiag(IAP_EVENTS.IAP_PURCHASE_CALLBACK, { productId: pid, deduped: true });
      return;
    }
    iapDiag(IAP_EVENTS.IAP_PURCHASE_CALLBACK, {
      productId: pid || null,
      transactionId: purchase.transactionId ?? null,
      hasActiveSlot: Boolean(slot && !slot.settled),
    });
    if (!slot || slot.settled || !storeProductMatchesCatalogSku(pid, slot.sku)) {
      if (pid) {
        iapDiag('purchase update ignored (no active slot or sku mismatch)', {
          productId: pid,
          activeSku: slot?.sku ?? null,
        });
      }
      return;
    }
    await settleActivePurchaseFromStoreRecord(mod, purchase as StorePurchaseRecord);
  });

  mod.purchaseErrorListener((e) => {
    const slot = activePurchaseSlot;
    if (!slot || slot.settled) return;

    slot.settled = true;
    slot.cleanup();

    const rawCode = (e as { code?: string }).code ?? '';
    const msg = (e as { message?: string }).message ?? String(e);
    iapDiag(IAP_EVENTS.IAP_PURCHASE_ERROR, { code: rawCode || null, message: msg.slice(0, 120) });

    const cancelled =
      rawCode === 'E_USER_CANCELLED' ||
      rawCode === 'user-cancelled' ||
      /cancel/i.test(msg);
    if (cancelled) {
      slot.emit('cancelled');
      slot.resolve({ ok: false, code: 'USER_CANCELLED', message: 'Purchase cancelled.' });
      return;
    }
    const deferred =
      rawCode === 'E_DEFERRED_PAYMENT' ||
      /deferred|pending/i.test(msg);
    if (deferred) {
      slot.emit('pending');
      slot.resolve({
        ok: false,
        code: 'PURCHASE_PENDING',
        message: 'Purchase is pending approval (Ask to Buy / parental approval). It will unlock once approved.',
      });
      return;
    }
    const duplicatePending =
      /duplicate purchase update skipped/i.test(msg) ||
      /getAvailablePurchases to recover/i.test(msg);
    const alreadyOwned =
      rawCode === 'already-owned' ||
      rawCode === 'E_ALREADY_OWNED' ||
      /already.?owned/i.test(msg) ||
      /item.?already.?owned/i.test(msg);
    const code = duplicatePending
      ? 'PENDING_STORE_PURCHASE'
      : alreadyOwned
        ? 'ITEM_ALREADY_OWNED'
        : rawCode === 'sku-not-found' || /sku\s*not\s*found/i.test(msg)
          ? 'SKU_NOT_FOUND'
          : rawCode || 'IAP_ERROR';
    slot.emit('failed');
    slot.resolve({ ok: false, code, message: msg });
  });

  globalListenersAttached = true;
  iapDiag(IAP_EVENTS.IAP_LISTENERS_REGISTERED);
}

/** Resolve the active purchase slot from a StoreKit record (listener or iOS poll fallback). */
async function settleActivePurchaseFromStoreRecord(
  mod: RNIap,
  purchase: StorePurchaseRecord,
): Promise<boolean> {
  const slot = activePurchaseSlot;
  if (!slot || slot.settled) return false;

  const pid = typeof purchase.productId === 'string' ? purchase.productId : '';
  if (!storeProductMatchesCatalogSku(pid, slot.sku)) return false;

  const dedupeKey = purchaseProcessKey(purchase);
  if (dedupeKey && processedPurchaseKeys.has(dedupeKey)) return false;
  if (dedupeKey) processedPurchaseKeys.add(dedupeKey);

  slot.settled = true;
  slot.cleanup();

  try {
    slot.emit('validating');
    const built = await buildPurchaseResultFromStoreRecord(
      mod,
      purchase,
      slot.sku,
      slot.isConsumable,
    );
    if (!built.ok) slot.emit('failed');
    slot.resolve(built);
  } catch (e) {
    slot.emit('failed');
    slot.resolve({
      ok: false,
      code: 'IAP_ERROR',
      message: e instanceof Error ? e.message : String(e),
    });
  }
  return true;
}

function expectedStoreProductIds(catalogSku: string): Set<string> {
  const ids = Platform.OS === 'android' ? allAndroidStoreIdsForItem(catalogSku) : [catalogSku];
  return new Set(ids.filter(Boolean));
}

/** When purchaseUpdatedListener stays silent, poll the store queue (iOS + Android). */
async function pollStorePurchaseAfterRequest(mod: RNIap, sku: string): Promise<void> {
  const slot = activePurchaseSlot;
  if (!slot || slot.settled || slot.sku !== sku) return;

  const equivalent = expectedStoreProductIds(sku);
  const waitSchedule =
    Platform.OS === 'android'
      ? [400, 1000, 2000, 4000, 8000, 12_000]
      : [350, 900, 1800, 3500, 6000, 10_000];

  for (const waitMs of waitSchedule) {
    if (!activePurchaseSlot || activePurchaseSlot.settled) return;
    await new Promise((r) => setTimeout(r, waitMs));
    if (!activePurchaseSlot || activePurchaseSlot.settled) return;

    if (Platform.OS === 'android') {
      const listenerHits = await collectPurchaseUpdateEvents(mod, 900);
      for (const hit of listenerHits) {
        const pid = typeof hit.productId === 'string' ? hit.productId : '';
        if (!pid || !equivalent.has(pid)) continue;
        iapDiag('android purchase listener sweep matched transaction', { sku, productId: pid });
        const settled = await settleActivePurchaseFromStoreRecord(mod, hit);
        if (settled) return;
      }
    }

    const list = await queryAvailablePurchasesOnce(mod, { publishToListener: true });
    const match = list.find((p) => {
      const pid = typeof p.productId === 'string' ? p.productId : '';
      return pid && equivalent.has(pid);
    });
    if (!match) continue;

    iapDiag(`${Platform.OS} purchase poll matched pending transaction`, {
      sku,
      productId: match.productId ?? null,
    });
    const settled = await settleActivePurchaseFromStoreRecord(mod, match);
    if (settled) return;
  }

  if (Platform.OS === 'ios') {
    await tryIosAppReceiptFallback(mod, sku);
  }
}

/**
 * StoreKit 2 transaction JWS for a single product (iOS). Safe to call after a
 * purchase: it reads the already-completed transaction's signature without
 * triggering a receipt refresh / Apple ID prompt.
 */
async function getIosTransactionJws(mod: RNIap, sku: string): Promise<string | null> {
  if (Platform.OS !== 'ios') return null;
  try {
    const fn = (mod as { getTransactionJwsIOS?: (s: string) => Promise<string | null> })
      .getTransactionJwsIOS;
    if (typeof fn !== 'function') return null;
    const jws = await fn(sku);
    const s = typeof jws === 'string' ? jws.trim() : '';
    return s.length > 0 ? s : null;
  } catch {
    return null;
  }
}

/** Last resort when StoreKit paid but never delivered purchaseUpdatedListener / getAvailablePurchases. */
async function tryIosAppReceiptFallback(mod: RNIap, sku: string): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  const slot = activePurchaseSlot;
  if (!slot || slot.settled || slot.sku !== sku) return false;

  /** StoreKit 2: pull this transaction's JWS — never a receipt refresh (auth loop). */
  const jws = await getIosTransactionJws(mod, sku);
  if (!jws) return false;

  iapDiag('ios transaction jws fallback after store silence', { sku });
  return settleActivePurchaseFromStoreRecord(mod, {
    productId: sku,
    transactionId: null,
    purchaseToken: jws,
  });
}

/** Close the purchase modal without waiting for the 120s StoreKit timeout. */
export function abortActivePurchase(): void {
  const slot = activePurchaseSlot;
  if (!slot || slot.settled) return;
  slot.settled = true;
  slot.cleanup();
  slot.emit('cancelled');
  slot.resolve({
    ok: false,
    code: 'USER_CANCELLED',
    message: 'Purchase cancelled.',
  });
  iapDiag('purchase aborted from UI', { sku: slot.sku });
}

export async function initIapConnection(options?: {
  /** Shop prefetch only needs product metadata — defer listeners until user taps Purchase. */
  attachPurchaseListeners?: boolean;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  iapDiag(IAP_EVENTS.IAP_INIT_START, { attachListeners: options?.attachPurchaseListeners !== false });
  const mod = loadModule();
  if (!mod) {
    return {
      ok: false,
      message: isExpoGoClient()
        ? 'Expo Go does not support in-app purchases. Use a development build (e.g. eas build --profile development) or run npx expo run:ios.'
        : 'Store purchases are only available on the iOS/Android app build.',
    };
  }
  const wantListeners = options?.attachPurchaseListeners !== false;
  if (!connectionReady) {
    try {
      await mod.initConnection();
      connectionReady = true;
      iapDiag(IAP_EVENTS.IAP_INIT_DONE);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, message: msg };
    }
  }
  /**
   * Shop prefetch calls init with `attachPurchaseListeners: false`. A later purchase must
   * still register listeners — otherwise StoreKit completes payment but we hang forever
   * on "Waiting for Apple to confirm payment…".
   */
  if (wantListeners && !globalListenersAttached) {
    attachGlobalPurchaseListeners(mod);
  }
  return { ok: true };
}

/**
 * Re-validate purchases that are still sitting un-finalized in the store queue
 * (left over from a crash, an app reload, or — critically — a server grant that
 * failed earlier, e.g. when fulfillment secrets were missing). For each one the
 * caller maps the productId to a catalog item, re-runs server fulfillment, and
 * tells us whether the grant succeeded.
 *
 * We `finishTransaction` ONLY when the grant succeeded (or was already
 * fulfilled). A pending purchase we cannot grant is left untouched so the store
 * can refund it or we can retry later — it is never silently consumed. This
 * replaces the old blind "drain" that finished transactions without granting
 * (which is exactly how a charge could happen with nothing delivered).
 *
 * Best-effort: any individual error leaves that purchase pending. Returns counts
 * for diagnostics.
 */
export async function reconcilePendingPurchases(
  reFulfill: (p: PendingStorePurchase) => Promise<ReconcileDecision>,
  opts?: { userInitiated?: boolean },
): Promise<{ finished: number; left: number }> {
  const mod = loadModule();
  if (!mod) return { finished: 0, left: 0 };
  const init = await initIapConnection({ attachPurchaseListeners: false });
  if (!init.ok) return { finished: 0, left: 0 };

  iapDiag('reconcile start', {
    platform: Platform.OS,
    userInitiated: opts?.userInitiated === true,
  });

  let finished = 0;
  let left = 0;
  try {
    const fn = mod.getAvailablePurchases as
      | ((opts?: { alsoPublishToEventListenerIOS?: boolean; onlyIncludeActiveItemsIOS?: boolean }) => Promise<
          StorePurchaseRecord[]
        >)
      | undefined;
    if (typeof fn !== 'function') return { finished: 0, left: 0 };
    const list =
      Platform.OS === 'android'
        ? await listPendingStorePurchases(true)
        : await fn({
            alsoPublishToEventListenerIOS: false,
            onlyIncludeActiveItemsIOS: false,
          }).catch(() => [] as StorePurchaseRecord[]);
    if (!Array.isArray(list) || list.length === 0) {
      iapDiag('reconcile none pending');
      return { finished: 0, left: 0 };
    }

    iapDiag('reconcile pending count', { count: list.length });

    for (const purchase of list) {
      const productId = typeof purchase.productId === 'string' ? purchase.productId : '';
      if (!productId) {
        left += 1;
        continue;
      }

      /**
       * StoreKit 2: each pending purchase record already carries its transaction
       * JWS in `purchaseToken`. No getReceiptIOS()/refresh (which caused Apple ID loops).
       */
      const iosJws =
        Platform.OS === 'ios'
          ? (purchase.purchaseToken?.trim() || null) ??
            (opts?.userInitiated ? await getIosTransactionJws(mod, productId) : null)
          : null;

      try {
        const decision = await reFulfill({
          productId,
          purchaseToken: purchase.purchaseToken ?? null,
          transactionId: purchase.transactionId ?? null,
          iosJws,
          receiptIosBase64: null,
        });
        if (decision.outcome === 'granted') {
          await finishTransactionBounded(mod, purchase, decision.isConsumable, productId);
          finished += 1;
        } else {
          left += 1;
        }
      } catch {
        left += 1;
      }
    }
  } catch {
    /* best effort */
  }
  iapDiag('reconcile done', { finished, left });
  return { finished, left };
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
  skus: string[] = [...GOOGLE_PLAY_PREFETCH_PRODUCT_IDS],
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
  const init = await initIapConnection({ attachPurchaseListeners: false });
  if (!init.ok) return { ok: false, message: init.message };

  iapDiag(IAP_EVENTS.IAP_FETCH_PRODUCTS_START, { count: unique.length });

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
    iapDiag(IAP_EVENTS.IAP_FETCH_PRODUCTS_DONE, {
      requested: unique.length,
      returned: products.length,
      missing: missingProductIds.length,
    });
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
  const init = await initIapConnection({ attachPurchaseListeners: false });
  if (!init.ok) return { ok: false, message: init.message };
  try {
    iapDiag(IAP_EVENTS.IAP_RESTORE_START, { platform: Platform.OS });
    /** iOS: getAvailablePurchases only — restorePurchases() triggers Apple ID sync/auth loops. */
    if (Platform.OS === 'android') {
      await mod.restorePurchases();
    }
    const list =
      Platform.OS === 'android'
        ? await listPendingStorePurchases(true)
        : await mod.getAvailablePurchases({
            alsoPublishToEventListenerIOS: false,
            onlyIncludeActiveItemsIOS: true,
          });
    const purchases = (list as StorePurchaseRecord[])
      .map((p) => ({
        productId: typeof p.productId === 'string' ? p.productId : '',
        purchaseToken: p.purchaseToken ?? null,
      }))
      .filter((p) => p.productId.length > 0);
    iapDiag(IAP_EVENTS.IAP_RESTORE_DONE, { count: purchases.length });
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
  const init = await initIapConnection({ attachPurchaseListeners: false });
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

async function buildPurchaseResultFromStoreRecord(
  mod: RNIap,
  purchase: StorePurchaseRecord,
  sku: string,
  isConsumable: boolean,
): Promise<IapPurchaseResult> {
  const pid = typeof purchase.productId === 'string' ? purchase.productId : '';
  if (!storeProductMatchesCatalogSku(pid, sku)) {
    return {
      ok: false,
      code: 'PRODUCT_MISMATCH',
      message: `Store returned ${pid || 'unknown'} but expected ${sku}.`,
    };
  }

  const finalize = async () => {
    await finishTransactionBounded(mod, purchase, isConsumable, pid);
  };

  if (Platform.OS === 'ios') {
    /**
     * StoreKit 2 (react-native-iap v14): the unified `purchaseToken` IS the
     * transaction JWS. We send that to the server. We deliberately never call
     * getReceiptIOS()/requestReceiptRefreshIOS() here — a receipt refresh is what
     * triggered the repeated "Sign in to Apple Account" prompts (the purchase loop).
     */
    let jws = purchase.purchaseToken?.trim();
    if (!jws) {
      jws = (await getIosTransactionJws(mod, pid)) ?? undefined;
    }
    if (!jws) {
      return {
        ok: false,
        code: 'MISSING_RECEIPT',
        message: 'App Store did not return a transaction signature. Try Restore Purchases or contact support.',
      };
    }
    return {
      ok: true,
      receiptPayload: jws,
      productId: pid,
      transactionId: purchase.transactionId ?? undefined,
      finalize,
    };
  }

  const token = purchase.purchaseToken;
  if (!token) {
    return { ok: false, code: 'MISSING_TOKEN', message: 'Missing Play purchase token.' };
  }
  return {
    ok: true,
    receiptPayload: token,
    productId: pid,
    transactionId: purchase.transactionId ?? undefined,
    finalize,
  };
}

function purchaseDedupeKey(p: StorePurchaseRecord): string {
  return (p.purchaseToken ?? p.transactionId ?? p.productId ?? '').trim();
}

function mergePendingPurchases(...lists: StorePurchaseRecord[][]): StorePurchaseRecord[] {
  const seen = new Set<string>();
  const out: StorePurchaseRecord[] = [];
  for (const list of lists) {
    for (const p of list) {
      const key = purchaseDedupeKey(p);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(p);
    }
  }
  return out;
}

async function queryAvailablePurchasesOnce(
  mod: RNIap,
  opts?: { publishToListener?: boolean },
): Promise<StorePurchaseRecord[]> {
  const fn = mod.getAvailablePurchases as
    | ((opts?: { alsoPublishToEventListenerIOS?: boolean; onlyIncludeActiveItemsIOS?: boolean }) => Promise<
        StorePurchaseRecord[]
      >)
    | undefined;
  if (typeof fn !== 'function') return [];
  const list = await fn({
    alsoPublishToEventListenerIOS: opts?.publishToListener === true,
    onlyIncludeActiveItemsIOS: false,
  }).catch(() => [] as StorePurchaseRecord[]);
  return Array.isArray(list) ? list : [];
}

/** Brief listener sweep — Play sometimes only re-delivers purchases via the update stream. */
async function collectPurchaseUpdateEvents(mod: RNIap, timeoutMs: number): Promise<StorePurchaseRecord[]> {
  const collected: StorePurchaseRecord[] = [];
  const seen = new Set<string>();
  return new Promise((resolve) => {
    let sub: { remove: () => void } | null = null;
    try {
      sub = mod.purchaseUpdatedListener((purchase) => {
        const rec = purchase as StorePurchaseRecord;
        const key = purchaseDedupeKey(rec);
        if (!key || seen.has(key)) return;
        seen.add(key);
        collected.push(rec);
      });
    } catch {
      resolve([]);
      return;
    }
    setTimeout(() => {
      try {
        sub?.remove();
      } catch {
        /* noop */
      }
      resolve(collected);
    }, timeoutMs);
  });
}

async function listPendingStorePurchases(aggressive = false): Promise<StorePurchaseRecord[]> {
  const mod = loadModule();
  if (!mod) return [];
  const init = await initIapConnection({ attachPurchaseListeners: false });
  if (!init.ok) return [];
  try {
    if (!aggressive) {
      return queryAvailablePurchasesOnce(mod);
    }

    const listenerFirst = await collectPurchaseUpdateEvents(mod, 2200);
    const attempts = 3;
    const queried: StorePurchaseRecord[][] = [];
    for (let i = 0; i < attempts; i += 1) {
      if (i > 0) {
        await new Promise((r) => setTimeout(r, 900 + i * 400));
      }
      queried.push(await queryAvailablePurchasesOnce(mod));
    }
    const listenerLast = await collectPurchaseUpdateEvents(mod, 1200);
    return mergePendingPurchases(listenerFirst, ...queried, listenerLast);
  } catch {
    return [];
  }
}

/** Exported for stuck-pack recovery (retries + purchase update listener). */
export async function listAllPendingStorePurchasesAggressive(): Promise<StorePurchaseRecord[]> {
  return listPendingStorePurchases(true);
}

/**
 * If Apple/Google still hold an unfinished transaction for this SKU (charged but
 * not consumed because server grant failed earlier), return it for re-fulfillment
 * instead of opening a new purchase sheet (avoids "duplicate purchase update" errors).
 */
export async function recoverPendingPurchaseForSku(params: {
  sku: string;
  isConsumable?: boolean;
  /** iOS: keep false unless user tapped Restore / Recover (avoids StoreKit auth loops). */
  aggressive?: boolean;
}): Promise<IapPurchaseResult | { ok: false; code: 'NO_PENDING'; message: string }> {
  const { sku, isConsumable = false, aggressive = Platform.OS === 'android' } = params;
  const mod = loadModule();
  if (!mod) {
    return { ok: false, code: 'NO_PENDING', message: 'IAP unavailable.' };
  }
  const init = await initIapConnection({ attachPurchaseListeners: false });
  if (!init.ok) return { ok: false, code: 'NO_PENDING', message: init.message };

  iapDiag('recover pending for sku', { sku, aggressive });
  const pending = await listPendingStorePurchases(aggressive);
  const equivalent = new Set(allAndroidStoreIdsForItem(sku));
  equivalent.add(sku);
  const match = pending.find((p) => {
    const pid = typeof p.productId === 'string' ? p.productId : '';
    return pid && equivalent.has(pid);
  });
  if (!match) {
    return { ok: false, code: 'NO_PENDING', message: 'No pending store transaction for this product.' };
  }
  const resolvedSku = typeof match.productId === 'string' && match.productId ? match.productId : sku;
  return buildPurchaseResultFromStoreRecord(mod, match, resolvedSku, isConsumable);
}

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

  const init = await initIapConnection({ attachPurchaseListeners: true });
  if (!init.ok) return { ok: false, code: 'IAP_INIT_FAILED', message: init.message };

  iapDiag(IAP_EVENTS.IAP_PURCHASE_REQUEST_START, { productId: sku, isConsumable });

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

  if (isConcurrentPurchaseBlocked(activePurchaseSlot)) {
    return {
      ok: false,
      code: 'PURCHASE_IN_PROGRESS',
      message: 'A purchase is already in progress. Wait for it to finish.',
    };
  }

  return new Promise((resolve) => {
    let slotRef: ActivePurchaseSlot;
    const cleanup = () => {
      clearTimeout(slotRef.timeoutId);
      if (activePurchaseSlot === slotRef) {
        activePurchaseSlot = null;
        iapDiag(IAP_EVENTS.IAP_LOADING_CLEARED, { sku });
      }
    };

    const timeoutId = setTimeout(() => {
      if (slotRef.settled) return;
      slotRef.settled = true;
      cleanup();
      emit('failed');
      resolve({
        ok: false,
        code: 'IAP_TIMEOUT',
        message:
          'Store did not complete the purchase in time. Try again — if your card was charged, use Restore Purchases.',
      });
    }, 120_000);

    slotRef = {
      sku,
      isConsumable,
      settled: false,
      emit,
      resolve,
      timeoutId,
      cleanup,
    };
    activePurchaseSlot = slotRef;
    iapDiag('purchase slot active', { sku, isConsumable });

    emit('requesting');
    mod
      .requestPurchase({
        type: 'in-app',
        request: {
          ios: { sku },
          android: { skus: [sku] },
        },
      } as Parameters<RNIap['requestPurchase']>[0])
      .then(async (directResult) => {
        if (slotRef.settled) return;

        /** v14 often resolves with Purchase here even when purchaseUpdatedListener stays silent. */
        const direct = coerceStorePurchaseRecord(directResult, sku);
        if (direct) {
          iapDiag('requestPurchase returned purchase directly', { sku });
          await settleActivePurchaseFromStoreRecord(mod, direct);
          return;
        }

        if (!slotRef.settled) emit('awaiting_store');
        void pollStorePurchaseAfterRequest(mod, sku);
      })
      .catch((e: unknown) => {
        if (slotRef.settled) return;
        slotRef.settled = true;
        cleanup();
        const msg = e instanceof Error ? e.message : String(e);
        const alreadyOwned =
          /already.?owned/i.test(msg) ||
          /item.?already.?owned/i.test(msg) ||
          /E_ALREADY_OWNED/i.test(msg);
        emit('failed');
        resolve({
          ok: false,
          code: alreadyOwned ? 'ITEM_ALREADY_OWNED' : 'REQUEST_FAILED',
          message: msg,
        });
      });
  });
}
