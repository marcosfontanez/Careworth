import { invokePulseShopFulfillment, type PulseShopRequest } from '@/lib/pulseShopFulfillment';
import { buildBorderRewardMetadata } from '@/lib/rewardDelivery/buildBorderMetadata';
import { rewardDeliveryDebug } from '@/lib/rewardDelivery/debugLog';
import { isFreeShopBorder } from '@/lib/shop/catalogUtils';
import type { ShopItemRow } from '@/lib/shop/types';
import {
  initIapConnection,
  platformPrefix,
  purchaseSku,
  recoverPendingPurchaseForSku,
  restorePurchasesFromStore,
  reconcilePendingPurchases,
  listAllPendingStorePurchasesAggressive,
  type IapPurchaseResult,
  type IapPurchaseStage,
} from '@/lib/shop/iap';
import {
  allAndroidStoreIdsForItem,
  applyLegacyAndroidStoreAliases,
} from '@/lib/shop/legacyAndroidSkus';
import { Platform } from 'react-native';
import { iapDiag, IAP_EVENTS } from '@/lib/shop/iapDiagnostics';
import { shouldTreatFulfillmentAsGranted } from '@/lib/shop/iapPurchaseGuards';
import { shopQueriesService } from '@/services/shop/shopQueries';
import { rewardDeliveriesService } from '@/services/supabase/rewardDeliveries';
import { supabase } from '@/lib/supabase';
import {
  rpcEconomyAcceptPendingBorderGift,
  rpcEconomyClaimFreeShopBorder,
  rpcEconomyEquipBorder,
  rpcEconomySendCreatorGift,
} from '@/services/shop/economyRpc';

export type PurchaseOutcome =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; code: string; message: string; details?: unknown };

/**
 * Optional progress callback shared by every paid flow. Callers (the Shop
 * confirmation modals) pass this so they can render the real purchase stage
 * (`requesting → awaiting_store → validating → fulfilled`) instead of relying
 * only on the modal-side watchdog timer. The watchdog stays as a safety net
 * in case the callback is somehow not invoked.
 */
export type PurchaseProgressOptions = {
  onStage?: (stage: IapPurchaseStage) => void;
};

function mapEdgeError(code: string, message: string): PurchaseOutcome {
  return { ok: false, code, message };
}

async function fulfillSparkPackFromStoreResult(
  item: ShopItemRow,
  native: Extract<IapPurchaseResult, { ok: true }>,
  emit: (s: IapPurchaseStage) => void,
): Promise<PurchaseOutcome> {
  const platform = platformPrefix();
  emit('validating');
  iapDiag(IAP_EVENTS.IAP_FULFILLMENT_START, { action: 'fulfill_spark_pack', shopItemId: item.id, productId: native.productId });

  const body: PulseShopRequest = {
    action: 'fulfill_spark_pack',
    shop_item_id: item.id,
    platform,
    receipt:
      platform === 'ios'
        ? { ios: { jws: native.receiptPayload } }
        : {
            android: {
              purchase_token: native.receiptPayload,
              product_id: native.productId || item.store_product_id_android || undefined,
            },
          },
  };

  const res = await invokePulseShopFulfillment(body);
  if (!res.ok) {
    emit('failed');
    iapDiag(IAP_EVENTS.IAP_FULFILLMENT_ERROR, { code: res.error.code, shopItemId: item.id });
    return {
      ok: false,
      code: res.error.code,
      message: res.error.message,
      details: res.error.details,
    };
  }
  /** Sparks are already credited by the server grant above — show success now,
      then acknowledge/consume the store transaction (bounded so a stalled Play
      consume can't freeze the modal). */
  emit('fulfilled');
  await native.finalize();
  iapDiag(IAP_EVENTS.IAP_FULFILLMENT_SUCCESS, { shopItemId: item.id, productId: native.productId });
  iapDiag(IAP_EVENTS.IAP_LOADING_CLEARED, { flow: 'fulfill_spark_pack', shopItemId: item.id });
  return { ok: true, data: res.data as Record<string, unknown> };
}

export const purchaseService = {
  async purchaseSparkPack(item: ShopItemRow, opts?: PurchaseProgressOptions): Promise<PurchaseOutcome> {
    const emit = (s: IapPurchaseStage) => {
      try { opts?.onStage?.(s); } catch { /* UI errors never block purchase */ }
    };
    const platform = platformPrefix();
    const sku =
      platform === 'ios' ? item.store_product_id_ios : item.store_product_id_android;
    if (!sku?.trim()) {
      return { ok: false, code: 'MISSING_SKU', message: 'Product is not configured for this platform.' };
    }

    const trimmedSku = sku.trim();

    const tryRecoverStuckPack = async (userInitiated: boolean): Promise<Extract<IapPurchaseResult, { ok: true }> | null> => {
      /** iOS: never probe StoreKit queue before requestPurchase — avoids password/auth loops on Shop load or tap. */
      if (platform === 'ios' && !userInitiated) return null;
      if (platform === 'android') {
        await new Promise((r) => setTimeout(r, 600));
      }
      try {
        await purchaseService.reconcilePendingStorePurchases([item], { userInitiated: true });
      } catch {
        /* best effort */
      }
      const skusToTry =
        platform === 'android' ? allAndroidStoreIdsForItem(trimmedSku) : [trimmedSku];
      for (const trySku of skusToTry) {
        const recovered = await recoverPendingPurchaseForSku({
          sku: trySku,
          isConsumable: true,
          aggressive: platform === 'android' || userInitiated,
        });
        if (recovered.ok === true) {
          return recovered;
        }
      }
      return null;
    };

    const stuck = await tryRecoverStuckPack(false);
    if (stuck) {
      return fulfillSparkPackFromStoreResult(item, stuck, emit);
    }

    const native = await purchaseSku({ sku: trimmedSku, isConsumable: true, onStage: emit });

    if (!native.ok) {
      const alreadyOwned =
        native.code === 'ITEM_ALREADY_OWNED' || /already.?owned/i.test(native.message);
      const code =
        native.code === 'PENDING_STORE_PURCHASE' ||
        /duplicate purchase update skipped/i.test(native.message)
          ? 'PENDING_STORE_PURCHASE'
          : alreadyOwned
            ? 'ITEM_ALREADY_OWNED'
            : native.code;
      if (code === 'PENDING_STORE_PURCHASE' || code === 'ITEM_ALREADY_OWNED') {
        const retry = await tryRecoverStuckPack(true);
        if (retry) {
          return fulfillSparkPackFromStoreResult(item, retry, emit);
        }
      }
      return { ok: false, code, message: native.message };
    }

    return fulfillSparkPackFromStoreResult(item, native, emit);
  },

  /**
   * Android-only deep recovery when Play says "already owned" but Restore/reconcile
   * did not credit Sparks (legacy product IDs, empty getAvailablePurchases cache).
   */
  async forceRecoverSparkPack(item: ShopItemRow): Promise<PurchaseOutcome> {
    const emit = (_s: IapPurchaseStage) => {};
    if (Platform.OS !== 'android') {
      try {
        const recon = await purchaseService.reconcilePendingStorePurchases([item], { userInitiated: true });
        if (recon.finished > 0) {
          return { ok: true, data: { sparks_recovered: recon.finished } };
        }
      } catch {
        /* noop */
      }
      const recovered = await recoverPendingPurchaseForSku({
        sku: item.store_product_id_ios?.trim() ?? '',
        isConsumable: true,
      });
      if (recovered.ok) {
        return fulfillSparkPackFromStoreResult(item, recovered, emit);
      }
      return {
        ok: false,
        code: 'NO_PENDING',
        message: 'No unfinished App Store purchase was found for this pack.',
      };
    }

    const init = await initIapConnection();
    if (!init.ok) {
      return { ok: false, code: 'IAP_INIT_FAILED', message: init.message };
    }

    await new Promise((r) => setTimeout(r, 1200));
    try {
      const recon = await purchaseService.reconcilePendingStorePurchases([item], { userInitiated: true });
      if (recon.finished > 0) {
        return { ok: true, data: { sparks_recovered: recon.finished } };
      }
    } catch {
      /* best effort */
    }

    const skus = allAndroidStoreIdsForItem(item.store_product_id_android);
    for (const sku of skus) {
      const recovered = await recoverPendingPurchaseForSku({ sku, isConsumable: true });
      if (recovered.ok) {
        return fulfillSparkPackFromStoreResult(item, recovered, emit);
      }
    }

    const pending = await listAllPendingStorePurchasesAggressive();
    const allowed = new Set(skus);
    for (const p of pending) {
      const pid = p.productId?.trim();
      if (!pid || !allowed.has(pid) || !p.purchaseToken) continue;
      const recovered = await recoverPendingPurchaseForSku({ sku: pid, isConsumable: true });
      if (recovered.ok) {
        return fulfillSparkPackFromStoreResult(item, recovered, emit);
      }
    }

    return {
      ok: false,
      code: 'NO_PENDING',
      message:
        'Google Play did not return your purchase token. Open Play Store → Profile → Payments & subscriptions → Budget & history, confirm the charge, then try again. If Sparks still do not appear, contact support with your order number (do not buy again).',
    };
  },

  async purchaseBorderForSelf(item: ShopItemRow, opts?: PurchaseProgressOptions): Promise<PurchaseOutcome> {
    const emit = (s: IapPurchaseStage) => {
      try { opts?.onStage?.(s); } catch { /* UI errors never block purchase */ }
    };
    if (isFreeShopBorder(item)) {
      const { data, error } = await rpcEconomyClaimFreeShopBorder(item.id);
      if (error) {
        const msg = error.message ?? '';
        const code =
          /duplicate_border/i.test(msg) || /You already own/i.test(msg)
            ? 'DUPLICATE_PURCHASE'
            : /free_claim_not_available/i.test(msg)
              ? 'FREE_CLAIM_NOT_AVAILABLE'
              : /item_not_active/i.test(msg)
                ? 'ITEM_NOT_ACTIVE'
                : /not_allowed/i.test(msg)
                  ? 'NOT_ALLOWED'
                  : 'FREE_CLAIM_FAILED';
        return { ok: false, code, message: msg || 'Could not claim this border.' };
      }
      return { ok: true, data: (data ?? {}) as Record<string, unknown> };
    }

    const platform = platformPrefix();
    const sku =
      platform === 'ios' ? item.store_product_id_ios : item.store_product_id_android;
    if (!sku?.trim()) {
      return { ok: false, code: 'MISSING_SKU', message: 'Product is not configured for this platform.' };
    }
    const native = await purchaseSku({ sku: sku.trim(), isConsumable: false, onStage: emit });
    if (!native.ok) {
      return { ok: false, code: native.code, message: native.message };
    }

    emit('validating');
    iapDiag(IAP_EVENTS.IAP_FULFILLMENT_START, { action: 'fulfill_border_self', shopItemId: item.id });

    const body: PulseShopRequest = {
      action: 'fulfill_border_self',
      shop_item_id: item.id,
      platform,
      receipt:
        platform === 'ios'
          ? { ios: { jws: native.receiptPayload } }
          : {
            android: {
              purchase_token: native.receiptPayload,
              product_id: native.productId || item.store_product_id_android || undefined,
            },
          },
    };

    const res = await invokePulseShopFulfillment(body);
    if (!res.ok) {
      /**
       * Grant failed — do NOT finalize the store transaction. Leaving it
       * un-acknowledged means Apple re-delivers it and Google auto-refunds it,
       * so the user is never charged without receiving Sparks/borders. Use
       * Settings → Restore Purchases or Recover Sparks to retry the grant.
       */
      emit('failed');
      iapDiag(IAP_EVENTS.IAP_FULFILLMENT_ERROR, { code: res.error.code, shopItemId: item.id });
      return {
        ok: false,
        code: res.error.code,
        message: res.error.message,
        details: res.error.details,
      };
    }
    /** Server granted (or it was already fulfilled) — show success, then ack
        the store transaction (bounded so a stalled ack can't freeze the modal). */
    emit('fulfilled');
    await native.finalize();
    iapDiag(IAP_EVENTS.IAP_FULFILLMENT_SUCCESS, { shopItemId: item.id });
    iapDiag(IAP_EVENTS.IAP_LOADING_CLEARED, { flow: 'fulfill_border_self', shopItemId: item.id });
    return { ok: true, data: res.data as Record<string, unknown> };
  },

  async purchaseBorderGift(params: {
    item: ShopItemRow;
    recipientHandle: string;
    note?: string | null;
    onStage?: (stage: IapPurchaseStage) => void;
  }): Promise<PurchaseOutcome> {
    const { item, recipientHandle, note, onStage } = params;
    const emit = (s: IapPurchaseStage) => {
      try { onStage?.(s); } catch { /* UI errors never block purchase */ }
    };
    const platform = platformPrefix();
    const sku =
      platform === 'ios' ? item.store_product_id_ios : item.store_product_id_android;
    if (!sku?.trim()) {
      return { ok: false, code: 'MISSING_SKU', message: 'Product is not configured for this platform.' };
    }
    const native = await purchaseSku({ sku: sku.trim(), isConsumable: false, onStage: emit });
    if (!native.ok) {
      return { ok: false, code: native.code, message: native.message };
    }

    emit('validating');

    const body: PulseShopRequest = {
      action: 'fulfill_border_gift',
      shop_item_id: item.id,
      platform,
      receipt:
        platform === 'ios'
          ? { ios: { jws: native.receiptPayload } }
          : {
            android: {
              purchase_token: native.receiptPayload,
              product_id: native.productId || item.store_product_id_android || undefined,
            },
          },
      border_gift: {
        recipient_handle: recipientHandle,
        note: note ?? null,
      },
    };

    const res = await invokePulseShopFulfillment(body);
    if (!res.ok) {
      /**
       * Grant failed — do NOT finalize the store transaction. Leaving it
       * un-acknowledged means Apple re-delivers it and Google auto-refunds it,
       * so the user is never charged without receiving Sparks/borders. Use
       * Settings → Restore Purchases or Recover Sparks to retry the grant.
       */
      emit('failed');
      return {
        ok: false,
        code: res.error.code,
        message: res.error.message,
        details: res.error.details,
      };
    }
    /** Server granted (or it was already fulfilled) — show success, then ack
        the store transaction (bounded so a stalled ack can't freeze the modal). */
    emit('fulfilled');
    await native.finalize();
    return { ok: true, data: res.data as Record<string, unknown> };
  },

  async sendCreatorGift(params: {
    giftItem: ShopItemRow;
    creatorUserId: string;
    contextType: 'live' | 'post' | 'profile';
    contextId: string | null;
    idempotencyKey: string;
  }): Promise<PurchaseOutcome> {
    const { giftItem, creatorUserId, contextType, contextId, idempotencyKey } = params;
    const key = idempotencyKey.trim();
    if (key.length < 8) {
      return { ok: false, code: 'INVALID_INPUT', message: 'Gift request invalid. Try again.' };
    }
    const { data, error } = await rpcEconomySendCreatorGift({
      p_creator_user_id: creatorUserId,
      p_gift_item_id: giftItem.id,
      p_context_type: contextType,
      p_context_id: contextId ?? null,
      p_idempotency_key: key,
    });
    if (error) {
      const msg = error.message ?? '';
      const lower = msg.toLowerCase();
      const pgCode = typeof (error as { code?: string }).code === 'string' ? (error as { code?: string }).code : '';
      const httpStatus =
        typeof (error as { status?: number }).status === 'number' ? (error as { status?: number }).status : undefined;
      const looksMissingRpc =
        httpStatus === 404 ||
        pgCode === 'PGRST202' ||
        lower.includes('could not find the function') ||
        lower.includes('economy_send_creator_gift');
      const code = lower.includes('gift_blocked')
        ? 'GIFT_BLOCKED'
        : lower.includes('insufficient_sparks')
        ? 'INSUFFICIENT_SPARKS'
        : lower.includes('self_gift')
          ? 'SELF_GIFT_NOT_ALLOWED'
          : lower.includes('invalid_recipient')
            ? 'INVALID_RECIPIENT'
            : lower.includes('invalid_gift_context')
              ? 'INVALID_GIFT_CONTEXT'
              : lower.includes('item_not_active') || lower.includes('gift_not_found')
              ? 'ITEM_INACTIVE'
              : lower.includes('not_allowed')
                ? 'NOT_ALLOWED'
                : looksMissingRpc
                  ? 'RPC_NOT_FOUND'
                  : 'RPC_ERROR';
      let message = msg || 'Could not send gift.';
      if (looksMissingRpc && code === 'RPC_NOT_FOUND') {
        message = `${message} Apply pending Supabase migrations (economy_send_creator_gift in migration 122+) so this RPC exists on your project.`;
      }
      return { ok: false, code, message };
    }
    return {
      ok: true,
      data: {
        creator_gift_id: data as string,
        sparks_spent: giftItem.spark_price,
      },
    };
  },

  async equipBorder(inventoryItemId: string): Promise<PurchaseOutcome> {
    const { data, error } = await rpcEconomyEquipBorder(inventoryItemId);
    if (error) {
      return mapEdgeError(error.code ?? 'RPC_ERROR', error.message);
    }
    return { ok: true, data: { result: data } };
  },

  async acceptPendingTeamBorderGift(borderGiftId: string): Promise<PurchaseOutcome> {
    const { data, error } = await rpcEconomyAcceptPendingBorderGift(borderGiftId);
    if (error) {
      return mapEdgeError(error.code ?? 'RPC_ERROR', error.message);
    }
    return { ok: true, data: (data ?? {}) as Record<string, unknown> };
  },

  /**
   * Recover purchases the store charged for but the server never granted — e.g.
   * a transient fulfillment failure or missing store secrets.
   *
   * **iOS:** only runs when `userInitiated` is true (Restore / Recover taps) so
   * Shop open does not call getAvailablePurchases and trigger Apple auth loops.
   * **Android:** may also run on Shop focus (see PulseShopScreen).
   */
  async reconcilePendingStorePurchases(
    catalogInput?: ShopItemRow[],
    opts?: { userInitiated?: boolean },
  ): Promise<{ finished: number; left: number }> {
    if (Platform.OS === 'web') return { finished: 0, left: 0 };

    /**
     * iOS: getAvailablePurchases / getReceiptIOS can trigger repeated Apple ID
     * password prompts when unfinished transactions exist. Only run on explicit
     * Restore / Recover — never when Pulse Shop opens.
     */
    if (Platform.OS === 'ios' && opts?.userInitiated !== true) {
      iapDiag('reconcile skipped on iOS (not user-initiated)');
      return { finished: 0, left: 0 };
    }

    const platform = platformPrefix();
    let mapPromise: Promise<Map<string, ShopItemRow>> | null = null;
    const getStoreIdMap = (): Promise<Map<string, ShopItemRow>> => {
      if (!mapPromise) {
        mapPromise = (async () => {
          const catalog =
            catalogInput ?? (await shopQueriesService.getActiveCatalog().catch(() => [] as ShopItemRow[]));
          const map = new Map<string, ShopItemRow>();
          for (const row of catalog) {
            const ios = row.store_product_id_ios?.trim();
            const android = row.store_product_id_android?.trim();
            if (ios) map.set(ios, row);
            if (android) map.set(android, row);
          }
          applyLegacyAndroidStoreAliases(map, catalog);
          return map;
        })();
      }
      return mapPromise;
    };

    return reconcilePendingPurchases(async (p) => {
      const map = await getStoreIdMap();
      const item = map.get(p.productId);
      if (!item || (item.type !== 'spark_pack' && item.type !== 'border')) {
        return { outcome: 'leave', isConsumable: false };
      }
      const isConsumable = item.type === 'spark_pack';
      // Free borders never came from the store; nothing to validate.
      if (isFreeShopBorder(item)) return { outcome: 'leave', isConsumable };

      const iosJws = p.iosJws?.trim() || p.purchaseToken?.trim() || null;
      const receipt =
        platform === 'ios'
          ? iosJws
            ? { ios: { jws: iosJws } }
            : p.receiptIosBase64
              ? { ios: { receipt_data_base64: p.receiptIosBase64 } }
              : null
          : p.purchaseToken
            ? {
                android: {
                  purchase_token: p.purchaseToken,
                  product_id: p.productId || item.store_product_id_android || undefined,
                },
              }
            : null;
      if (!receipt) return { outcome: 'leave', isConsumable };

      const res = await invokePulseShopFulfillment({
        action: isConsumable ? 'fulfill_spark_pack' : 'fulfill_border_self',
        shop_item_id: item.id,
        platform,
        receipt,
      });
      if (res.ok) return { outcome: 'granted', isConsumable };
      if (shouldTreatFulfillmentAsGranted(res.error.code, res.error.message)) {
        return { outcome: 'granted', isConsumable };
      }
      return { outcome: 'leave', isConsumable };
    }, opts);
  },

  /**
   * App Store / Play requirement: let users restore non-consumable entitlements (e.g. borders).
   * Re-validates the current iOS receipt or each Android purchase token against the server.
   * Consumable Spark packs are not re-granted by design.
   */
  async restoreStorePurchases(): Promise<PurchaseOutcome> {
    if (Platform.OS === 'web') {
      return {
        ok: false,
        code: 'IAP_UNAVAILABLE',
        message: 'Restore purchases is only available in the PulseVerse iOS or Android app.',
      };
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;
    if (!userId) {
      return { ok: false, code: 'UNAUTHORIZED', message: 'Sign in to restore purchases.' };
    }

    const restored = await restorePurchasesFromStore();
    if (!restored.ok) {
      iapDiag(IAP_EVENTS.IAP_RESTORE_DONE, { ok: false, message: restored.message.slice(0, 120) });
      return { ok: false, code: 'RESTORE_FAILED', message: restored.message };
    }

    let catalog: ShopItemRow[];
    try {
      catalog = await shopQueriesService.getActiveCatalog();
    } catch (e) {
      return {
        ok: false,
        code: 'CATALOG_FAILED',
        message: e instanceof Error ? e.message : 'Could not load shop catalog.',
      };
    }

    const byStoreId = new Map<string, ShopItemRow>();
    for (const row of catalog) {
      const ios = row.store_product_id_ios?.trim();
      const android = row.store_product_id_android?.trim();
      if (ios) byStoreId.set(ios, row);
      if (android) byStoreId.set(android, row);
    }
    applyLegacyAndroidStoreAliases(byStoreId, catalog);

    /** Unfinished Spark consumables (charged, not consumed in Play). */
    let sparksRecovered = 0;
    let sparkPurchasesSeen = 0;
    try {
      const recon = await purchaseService.reconcilePendingStorePurchases(catalog, { userInitiated: true });
      sparksRecovered = recon.finished;
    } catch {
      /* best effort */
    }

    const triedSparkIds = new Set<string>();
    for (const pr of restored.purchases) {
      const item = byStoreId.get(pr.productId);
      if (!item || item.type !== 'spark_pack') continue;
      sparkPurchasesSeen += 1;
      if (triedSparkIds.has(item.id)) continue;
      triedSparkIds.add(item.id);
      const platform = platformPrefix();
      /** StoreKit 2: each restored purchase carries its own transaction JWS. */
      const iosJws = pr.purchaseToken?.trim() || null;
      const receipt =
        platform === 'ios'
          ? iosJws
            ? { ios: { jws: iosJws } }
            : null
          : pr.purchaseToken?.trim()
            ? {
                android: {
                  purchase_token: pr.purchaseToken.trim(),
                  product_id: pr.productId,
                },
              }
            : null;
      if (!receipt) continue;
      const res = await invokePulseShopFulfillment({
        action: 'fulfill_spark_pack',
        shop_item_id: item.id,
        platform,
        receipt,
      });
      if (res.ok) sparksRecovered += 1;
      else if (shouldTreatFulfillmentAsGranted(res.error.code, res.error.message)) {
        sparksRecovered += 1;
      }
    }

    if (sparksRecovered === 0 && Platform.OS === 'android') {
      for (const pack of catalog.filter((r) => r.type === 'spark_pack' && r.is_active)) {
        try {
          const forced = await purchaseService.forceRecoverSparkPack(pack);
          if (forced.ok) {
            sparksRecovered += 1;
            break;
          }
        } catch {
          /* try next pack */
        }
      }
    }

    // Restore must also re-grant borders that have since been retired/delisted —
    // the user paid for them, so a valid receipt must still resolve even though
    // the item left the active shelf. Retired rows that still carry their store
    // SKU map here; rows whose SKUs were cleared on delist cannot be matched by
    // receipt and are a documented limitation (see supabase/BORDER_CATALOG.md).
    try {
      const retired = await shopQueriesService.getRetiredBorders();
      for (const row of retired) {
        const ios = row.store_product_id_ios?.trim();
        const android = row.store_product_id_android?.trim();
        if (ios && !byStoreId.has(ios)) byStoreId.set(ios, row);
        if (android && !byStoreId.has(android)) byStoreId.set(android, row);
      }
    } catch {
      /* retired-border merge is best-effort; active catalog still restores */
    }

    let entitlementsSynced = 0;
    const notes: string[] = [];
    const triedBorderIds = new Set<string>();
    let borderRewardCelebrationsEnqueued = 0;

    let ownedBorderShopIdsBefore = new Set<string>();
    try {
      const invBefore = await shopQueriesService.getUserInventory(userId);
      ownedBorderShopIdsBefore = new Set(
        invBefore.filter((r) => r.item_kind === 'border').map((r) => r.shop_item_id),
      );
    } catch {
      /* reward celebration enqueue is best-effort */
    }

    for (const pr of restored.purchases) {
      const item = byStoreId.get(pr.productId);
      if (!item || item.type !== 'border' || isFreeShopBorder(item)) continue;
      if (triedBorderIds.has(item.id)) continue;
      triedBorderIds.add(item.id);

      if (Platform.OS === 'ios') {
        /** StoreKit 2: use this purchase's transaction JWS (no receipt refresh / Apple ID loop). */
        const iosJws = pr.purchaseToken?.trim() || null;
        if (!iosJws) {
          notes.push('ios_jws_unavailable');
          continue;
        }
        const res = await invokePulseShopFulfillment({
          action: 'fulfill_border_self',
          shop_item_id: item.id,
          platform: 'ios',
          receipt: { ios: { jws: iosJws } },
        });
        if (res.ok) entitlementsSynced += 1;
        else if (shouldTreatFulfillmentAsGranted(res.error.code, res.error.message)) {
          entitlementsSynced += 1;
        } else {
          notes.push(res.error.code);
        }
      } else {
        const token = pr.purchaseToken?.trim();
        if (!token) {
          notes.push(`missing_token:${pr.productId}`);
          continue;
        }
        const res = await invokePulseShopFulfillment({
          action: 'fulfill_border_self',
          shop_item_id: item.id,
          platform: 'android',
          receipt: {
            android: {
              purchase_token: token,
              product_id: pr.productId || item.store_product_id_android || undefined,
            },
          },
        });
        if (res.ok) entitlementsSynced += 1;
        else if (shouldTreatFulfillmentAsGranted(res.error.code, res.error.message)) {
          entitlementsSynced += 1;
        } else {
          notes.push(res.error.code);
        }
      }
    }

    try {
      const invAfter = await shopQueriesService.getUserInventory(userId);
      const newBorderRows = invAfter.filter(
        (r) => r.item_kind === 'border' && !ownedBorderShopIdsBefore.has(r.shop_item_id),
      );
      if (newBorderRows.length > 0) {
        const shopIds = [...new Set(newBorderRows.map((r) => r.shop_item_id))];
        const catalogRows = await shopQueriesService.getShopItemsByIds(shopIds);
        const byShopId = new Map(catalogRows.map((it) => [it.id, it]));
        for (const row of newBorderRows) {
          const shopItem = byShopId.get(row.shop_item_id);
          if (!shopItem) continue;
          const meta = buildBorderRewardMetadata(shopItem, row.id, { border_source: 'purchased' });
          const id = await rewardDeliveriesService.enqueueBorderSelf(row.id, row.shop_item_id, meta);
          if (id) borderRewardCelebrationsEnqueued += 1;
          else
            rewardDeliveryDebug.warn('restorePurchases: enqueueBorderSelf returned null', {
              inventory_item_id: row.id,
              shop_item_id: row.shop_item_id,
            });
        }
      }
    } catch {
      /* best-effort — borders still synced */
    }

    iapDiag(IAP_EVENTS.IAP_RESTORE_DONE, {
      ok: true,
      storePurchases: restored.purchases.length,
      sparksRecovered,
      borderEntitlementsSynced: entitlementsSynced,
      notes: notes.length ? notes.join(',') : null,
    });

    return {
      ok: true,
      data: {
        store_purchases_found: restored.purchases.length,
        sparks_recovered: sparksRecovered,
        spark_purchases_seen: sparkPurchasesSeen,
        border_entitlements_synced: entitlementsSynced,
        border_reward_celebrations_enqueued: borderRewardCelebrationsEnqueued,
        detail_notes: notes.length ? notes : undefined,
      },
    };
  },
};
