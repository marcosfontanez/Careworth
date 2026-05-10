import { invokePulseShopFulfillment, type PulseShopRequest } from '@/lib/pulseShopFulfillment';
import { isFreeShopBorder } from '@/lib/shop/catalogUtils';
import type { ShopItemRow } from '@/lib/shop/types';
import { initIapConnection, platformPrefix, purchaseSku } from '@/lib/shop/iap';
import { supabase } from '@/lib/supabase';

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
      const { data, error } = await supabase.rpc('economy_claim_free_shop_border' as any, {
        p_shop_item_id: item.id,
      });
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
    const body: PulseShopRequest = {
      action: 'send_creator_gift',
      shop_item_id: giftItem.id,
      creator_gift: {
        creator_user_id: creatorUserId,
        context_type: contextType,
        context_id: contextId,
        idempotency_key: idempotencyKey,
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

  async equipBorder(inventoryItemId: string): Promise<PurchaseOutcome> {
    const { data, error } = await supabase.rpc('economy_equip_border' as any, {
      p_inventory_item_id: inventoryItemId,
    });
    if (error) {
      return mapEdgeError(error.code ?? 'RPC_ERROR', error.message);
    }
    return { ok: true, data: { result: data } };
  },

  async acceptPendingTeamBorderGift(borderGiftId: string): Promise<PurchaseOutcome> {
    const { data, error } = await supabase.rpc('economy_accept_pending_border_gift' as any, {
      p_border_gift_id: borderGiftId,
    });
    if (error) {
      return mapEdgeError(error.code ?? 'RPC_ERROR', error.message);
    }
    return { ok: true, data: (data ?? {}) as Record<string, unknown> };
  },
};
