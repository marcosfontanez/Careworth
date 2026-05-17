/**
 * Reward Delivery Engine — client contract (server row lives in `reward_deliveries`).
 * Grants are authoritative server-side; this models celebration UX only.
 */

export type RewardDeliveryType =
  | 'purchase'
  | 'gift'
  | 'system_award'
  | 'monthly_claim'
  | 'leaderboard_reward';

export type RewardItemType = 'border' | 'sparks' | 'diamonds' | 'future_item';

export type RewardDeliveryStatus =
  | 'pending'
  | 'toast_shown'
  | 'opened'
  | 'acknowledged'
  | 'dismissed';

/** Row shape returned by `reward_deliveries_list_pending` RPC. */
export interface RewardDeliveryRecord {
  id: string;
  user_id: string;
  delivery_type: RewardDeliveryType;
  item_type: RewardItemType;
  item_id: string | null;
  quantity: number | null;
  source_user_id: string | null;
  source_display_name: string | null;
  metadata: Record<string, unknown>;
  status: RewardDeliveryStatus;
  idempotency_key: string;
  created_at: string;
  toast_shown_at: string | null;
  opened_at: string | null;
  acknowledged_at: string | null;
}

/** Serialized shop border snapshot stored in `metadata` for rich reveal without extra fetch. */
export interface BorderRewardMetadata {
  kind?: 'border';
  shop_item_id?: string;
  inventory_item_id?: string;
  border_name?: string;
  /** Display source: purchased | gifted | monthly_free | charity | sponsored | leaderboard | beta | system */
  border_source?: string;
  rarity_slug?: string | null;
  rarity_label?: string | null;
  preview_image_url?: string | null;
  ring_preview_hex?: string | null;
  gifted_by_username?: string | null;
  gifted_by_avatar_url?: string | null;
  partner_label?: string | null;
  charity_label?: string | null;
}

export interface SparksRewardMetadata {
  kind?: 'sparks';
  reason?: 'purchase' | 'reward' | 'promotion';
  /** Wallet balance after credit when known */
  balance_after?: number | null;
}

export interface DiamondsRewardMetadata {
  kind?: 'diamonds';
  reason?: 'gift_conversion' | 'creator_reward' | 'system_reward' | 'live_stream';
  /** Shop catalog name or live sticker label */
  gift_name?: string | null;
  balance_available_after?: number | null;
  /** Creator Sparks gift — shop slug when known */
  gift_slug?: string | null;
  creator_gift_id?: string | null;
  context_type?: string | null;
  context_id?: string | null;
  sender_username?: string | null;
  sparks_spent?: number | null;
  /** Live sticker gift — catalog key when known */
  gift_id?: string | null;
  gift_emoji?: string | null;
  stream_gift_id?: string | null;
  stream_id?: string | null;
}

export type RewardRevealPhase =
  | 'modal_intro'
  | 'awaiting_tap'
  | 'box_shake'
  | 'box_open'
  | 'burst'
  | 'item_emerge'
  | 'item_settle'
  | 'details_visible'
  | 'complete';
