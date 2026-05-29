import { supabase } from '@/lib/supabase';
import type { Json } from '@/lib/database.types';
import { rewardDeliveryDebug } from '@/lib/rewardDelivery/debugLog';
import type {
  BorderRewardMetadata,
  RewardDeliveryRecord,
  RewardDeliveryStatus,
  RewardDeliveryType,
  RewardItemType,
} from '@/lib/rewardDelivery/types';

function mapRow(raw: Record<string, unknown>): RewardDeliveryRecord {
  return {
    id: String(raw.id),
    user_id: String(raw.user_id),
    delivery_type: raw.delivery_type as RewardDeliveryType,
    item_type: raw.item_type as RewardItemType,
    item_id: raw.item_id != null ? String(raw.item_id) : null,
    quantity: typeof raw.quantity === 'number' ? raw.quantity : raw.quantity != null ? Number(raw.quantity) : null,
    source_user_id: raw.source_user_id != null ? String(raw.source_user_id) : null,
    source_display_name: raw.source_display_name != null ? String(raw.source_display_name) : null,
    metadata: (typeof raw.metadata === 'object' && raw.metadata != null ? raw.metadata : {}) as Record<
      string,
      unknown
    >,
    status: raw.status as RewardDeliveryRecord['status'],
    idempotency_key: String(raw.idempotency_key),
    created_at: String(raw.created_at),
    toast_shown_at: raw.toast_shown_at != null ? String(raw.toast_shown_at) : null,
    opened_at: raw.opened_at != null ? String(raw.opened_at) : null,
    acknowledged_at: raw.acknowledged_at != null ? String(raw.acknowledged_at) : null,
  };
}

export const rewardDeliveriesService = {
  async listPending(): Promise<RewardDeliveryRecord[]> {
    const { data, error } = await supabase.rpc('reward_deliveries_list_pending');
    if (error) {
      rewardDeliveryDebug.listPendingError(error);
      throw error;
    }
    const rows = (data ?? []) as Record<string, unknown>[];
    return rows.map(mapRow);
  },

  async setStatus(id: string, status: RewardDeliveryStatus): Promise<boolean> {
    const { data, error } = await supabase.rpc('reward_delivery_set_status', {
      p_id: id,
      p_next: status,
    });
    if (error) throw error;
    return Boolean(data);
  },

  async enqueueBorderSelf(
    inventoryItemId: string,
    shopItemId: string,
    metadata: BorderRewardMetadata,
  ): Promise<string | null> {
    rewardDeliveryDebug.enqueueAttempt('enqueueBorderSelf', {
      item_type: 'border',
      inventory_item_id: inventoryItemId,
      shop_item_id: shopItemId,
      metadata,
    });
    const { data, error } = await supabase.rpc('reward_delivery_enqueue_border_self', {
      p_inventory_item_id: inventoryItemId,
      p_shop_item_id: shopItemId,
      p_metadata: metadata as Json,
    });
    const id = data != null ? String(data) : null;
    if (error) {
      rewardDeliveryDebug.enqueueResult('enqueueBorderSelf', null, error);
      return null;
    }
    rewardDeliveryDebug.enqueueResult('enqueueBorderSelf', id);
    return id;
  },

  async enqueueSparksPack(
    purchaseReceiptId: string,
    shopItemId: string,
    quantity: number,
    metadata: Record<string, unknown>,
  ): Promise<string | null> {
    rewardDeliveryDebug.enqueueAttempt('enqueueSparksPack', {
      item_type: 'sparks',
      purchase_receipt_id: purchaseReceiptId,
      shop_item_id: shopItemId,
      quantity,
      metadata,
    });
    const { data, error } = await supabase.rpc('reward_delivery_enqueue_sparks_pack', {
      p_purchase_receipt_id: purchaseReceiptId,
      p_shop_item_id: shopItemId,
      p_quantity: quantity,
      p_metadata: metadata as Json,
    });
    const id = data != null ? String(data) : null;
    if (error) {
      rewardDeliveryDebug.enqueueResult('enqueueSparksPack', null, error);
      return null;
    }
    rewardDeliveryDebug.enqueueResult('enqueueSparksPack', id);
    return id;
  },

  async enqueueClient(opts: {
    deliveryType: RewardDeliveryType;
    itemType: RewardItemType;
    idempotencyKey: string;
    metadata?: Record<string, unknown>;
    quantity?: number | null;
    itemId?: string | null;
    sourceUserId?: string | null;
    sourceDisplayName?: string | null;
  }): Promise<string | null> {
    rewardDeliveryDebug.enqueueAttempt('enqueueClient', {
      delivery_type: opts.deliveryType,
      item_type: opts.itemType,
      item_id: opts.itemId ?? null,
      idempotency_key: opts.idempotencyKey,
      quantity: opts.quantity ?? null,
      metadata: opts.metadata ?? {},
    });
    const { data, error } = await supabase.rpc('reward_delivery_enqueue_client', {
      p_delivery_type: opts.deliveryType,
      p_item_type: opts.itemType,
      p_idempotency_key: opts.idempotencyKey,
      p_metadata: (opts.metadata ?? {}) as Json,
      p_quantity: opts.quantity ?? undefined,
      p_item_id: opts.itemId ?? undefined,
      p_source_user_id: opts.sourceUserId ?? undefined,
      p_source_display_name: opts.sourceDisplayName ?? undefined,
    });
    const id = data != null ? String(data) : null;
    if (error) {
      rewardDeliveryDebug.enqueueResult('enqueueClient', null, error);
      return null;
    }
    rewardDeliveryDebug.enqueueResult('enqueueClient', id);
    return id;
  },
};
