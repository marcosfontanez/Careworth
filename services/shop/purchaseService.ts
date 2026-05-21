import { invokePulseShopFulfillment, type PulseShopRequest } from '@/lib/pulseShopFulfillment';
import { buildBorderRewardMetadata } from '@/lib/rewardDelivery/buildBorderMetadata';
import { rewardDeliveryDebug } from '@/lib/rewardDelivery/debugLog';
import { isFreeShopBorder } from '@/lib/shop/catalogUtils';
import type { ShopItemRow } from '@/lib/shop/types';
import { initIapConnection, platformPrefix, purchaseSku, restorePurchasesFromStore, getIosReceiptBase64 } from '@/lib/shop/iap';
import { Platform } from 'react-native';
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

function mapEdgeError(code: string, message: string): PurchaseOutcome {
  return { ok: false, code, message };
}

export const purchaseService = {
  async purchaseSparkPack(item: ShopItemRow): Promise<PurchaseOutcome> {
    const platform = platformPrefix();
    const sku =
      platform === 'ios' ? item.store_product_id_ios : item.store_product_id_android;
    if (!sku?.trim()) {
      return { ok: false, code: 'MISSING_SKU', message: 'Product is not configured for this platform.' };
    }
    const init = await initIapConnection();
    if (!init.ok) {
      return { ok: false, code: 'IAP_INIT_FAILED', message: init.message };
    }
    const native = await purchaseSku({ sku: sku.trim(), isConsumable: true });
    if (!native.ok) {
      return { ok: false, code: native.code, message: native.message };
    }

    const body: PulseShopRequest = {
      action: 'fulfill_spark_pack',
      shop_item_id: item.id,
      platform,
      receipt:
        platform === 'ios'
          ? { ios: { receipt_data_base64: native.receiptPayload } }
          : { android: { purchase_token: native.receiptPayload, product_id: item.store_product_id_android ?? undefined } },
    };

    const res = await invokePulseShopFulfillment(body);
    if (!res.ok) {
      return {
        ok: false,
        code: res.error.code,
        message: res.error.message,
        details: res.error.details,
      };
    }
    return { ok: true, data: res.data as Record<string, unknown> };
  },

  async purchaseBorderForSelf(item: ShopItemRow): Promise<PurchaseOutcome> {
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
    const init = await initIapConnection();
    if (!init.ok) {
      return { ok: false, code: 'IAP_INIT_FAILED', message: init.message };
    }
    const native = await purchaseSku({ sku: sku.trim(), isConsumable: false });
    if (!native.ok) {
      return { ok: false, code: native.code, message: native.message };
    }

    const body: PulseShopRequest = {
      action: 'fulfill_border_self',
      shop_item_id: item.id,
      platform,
      receipt:
        platform === 'ios'
          ? { ios: { receipt_data_base64: native.receiptPayload } }
          : { android: { purchase_token: native.receiptPayload, product_id: item.store_product_id_android ?? undefined } },
    };

    const res = await invokePulseShopFulfillment(body);
    if (!res.ok) {
      return {
        ok: false,
        code: res.error.code,
        message: res.error.message,
        details: res.error.details,
      };
    }
    return { ok: true, data: res.data as Record<string, unknown> };
  },

  async purchaseBorderGift(params: {
    item: ShopItemRow;
    recipientHandle: string;
    note?: string | null;
  }): Promise<PurchaseOutcome> {
    const { item, recipientHandle, note } = params;
    const platform = platformPrefix();
    const sku =
      platform === 'ios' ? item.store_product_id_ios : item.store_product_id_android;
    if (!sku?.trim()) {
      return { ok: false, code: 'MISSING_SKU', message: 'Product is not configured for this platform.' };
    }
    const init = await initIapConnection();
    if (!init.ok) {
      return { ok: false, code: 'IAP_INIT_FAILED', message: init.message };
    }
    const native = await purchaseSku({ sku: sku.trim(), isConsumable: false });
    if (!native.ok) {
      return { ok: false, code: native.code, message: native.message };
    }

    const body: PulseShopRequest = {
      action: 'fulfill_border_gift',
      shop_item_id: item.id,
      platform,
      receipt:
        platform === 'ios'
          ? { ios: { receipt_data_base64: native.receiptPayload } }
          : { android: { purchase_token: native.receiptPayload, product_id: item.store_product_id_android ?? undefined } },
      border_gift: {
        recipient_handle: recipientHandle,
        note: note ?? null,
      },
    };

    const res = await invokePulseShopFulfillment(body);
    if (!res.ok) {
      return {
        ok: false,
        code: res.error.code,
        message: res.error.message,
        details: res.error.details,
      };
    }
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
      p_context_id: contextId,
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
      const code = lower.includes('insufficient_sparks')
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

    const iosReceipt =
      Platform.OS === 'ios' ? (await getIosReceiptBase64())?.trim() ?? null : null;

    for (const pr of restored.purchases) {
      const item = byStoreId.get(pr.productId);
      if (!item || item.type !== 'border' || isFreeShopBorder(item)) continue;
      if (triedBorderIds.has(item.id)) continue;
      triedBorderIds.add(item.id);

      if (Platform.OS === 'ios') {
        if (!iosReceipt) {
          notes.push('ios_receipt_unavailable');
          continue;
        }
        const res = await invokePulseShopFulfillment({
          action: 'fulfill_border_self',
          shop_item_id: item.id,
          platform: 'ios',
          receipt: { ios: { receipt_data_base64: iosReceipt } },
        });
        if (res.ok) entitlementsSynced += 1;
        else if (
          res.error.code === 'DUPLICATE_PURCHASE' ||
          /already|duplicate|fulfilled/i.test(res.error.message)
        ) {
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
              product_id: item.store_product_id_android ?? undefined,
            },
          },
        });
        if (res.ok) entitlementsSynced += 1;
        else if (
          res.error.code === 'DUPLICATE_PURCHASE' ||
          /already|duplicate|fulfilled/i.test(res.error.message)
        ) {
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

    return {
      ok: true,
      data: {
        store_purchases_found: restored.purchases.length,
        border_entitlements_synced: entitlementsSynced,
        border_reward_celebrations_enqueued: borderRewardCelebrationsEnqueued,
        detail_notes: notes.length ? notes : undefined,
      },
    };
  },
};
