/**
 * Pulse Shop — types aligned with Supabase economy schema (121–123).
 * Regenerate database.types when migrations are applied.
 */

import type {
  BorderAvailabilityStatus,
  BorderPriceType,
  BorderRarityTier,
  BorderSourceType,
  BorderUnlockMethod,
  BorderVisualTier,
} from '@/lib/shop/borderCatalogTaxonomy';

export type ShopItemType =
  | 'border'
  | 'spark_pack'
  | 'gift'
  | 'bundle'
  | 'seasonal_drop'
  | 'sponsored_drop';

export type GiftContext = 'live' | 'post' | 'profile';

export type ShopItemRow = {
  id: string;
  slug: string;
  type: ShopItemType;
  category: string | null;
  name: string;
  description: string;
  rarity: string | null;
  image_url: string | null;
  animation_url: string | null;
  spark_price: number | null;
  spark_amount: number | null;
  real_money_display_price: string | null;
  store_product_id_ios: string | null;
  store_product_id_android: string | null;
  is_active: boolean;
  is_giftable: boolean;
  is_limited: boolean;
  inventory_count: number | null;
  release_at: string | null;
  expires_at: string | null;
  sort_order: number;
  gift_contexts: GiftContext[] | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  /** @see migration 123 — border catalog */
  collection_id?: string | null;
  rarity_tier?: BorderRarityTier | null;
  source_type?: BorderSourceType | null;
  visual_tier?: BorderVisualTier | null;
  availability_status?: BorderAvailabilityStatus | null;
  unlock_method?: BorderUnlockMethod | null;
  is_animated?: boolean;
  is_tradable?: boolean;
  is_shop_item?: boolean;
  is_earned_only?: boolean;
  price_type?: BorderPriceType | null;
  season_code?: string | null;
  rank_place?: number | null;
  is_retired?: boolean;
  prestige_score?: number;
};

export type UserInventoryRow = {
  id: string;
  user_id: string;
  shop_item_id: string;
  item_kind: string;
  acquisition_source: string;
  acquisition_txn_id: string | null;
  gifted_by_user_id: string | null;
  gifted_to_user_id: string | null;
  is_equipped: boolean;
  is_transferable: boolean;
  acquired_at: string;
  metadata: Record<string, unknown>;
};

export type SparkWalletRow = {
  user_id: string;
  paid_sparks_balance: number;
  promo_sparks_balance: number;
  total_sparks_spent: number;
  total_sparks_purchased: number;
  updated_at: string;
};

export type PurchaseReceiptRow = {
  id: string;
  user_id: string;
  platform: 'ios' | 'android';
  store_product_id: string;
  external_transaction_id: string;
  shop_item_id: string | null;
  validation_status: string;
  processed_at: string | null;
  created_at: string;
};

/** Total spendable Sparks (paid + promo); server is source of truth. */
export function totalSparkBalance(w: SparkWalletRow | null | undefined): number {
  if (!w) return 0;
  return Number(w.paid_sparks_balance ?? 0) + Number(w.promo_sparks_balance ?? 0);
}
