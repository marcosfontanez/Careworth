/**
 * Border catalog taxonomy — rarity, source, visual tier, availability.
 * DB is source of truth (migration 123); these types mirror check constraints.
 *
 * Rarity / acquisition policy (pulse prize rows + shop alignment; migration 132):
 * - Monthly global Top 5 (leaderboard medal): mythic
 * - Beta program, limited-time free events: rare
 * - Charity-priced shop borders (~$1.99): epic
 * - Flagship shop borders (~$4.99): legendary
 * - Brand promos / mass giveaways: common + promotional
 */

export type BorderRarityTier = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';

export type BorderSourceType =
  | 'shop'
  | 'beta_reward'
  | 'leaderboard_reward'
  | 'seasonal_drop'
  | 'event_reward'
  | 'sponsored'
  | 'promotional'
  | 'admin_grant';

export type BorderVisualTier = 'static' | 'enhanced' | 'reactive' | 'animated';

export type BorderAvailabilityStatus = 'active' | 'limited' | 'retired' | 'exclusive' | 'legacy';

export type BorderUnlockMethod =
  | 'direct_purchase'
  | 'leaderboard_rank'
  | 'beta_tester_grant'
  | 'seasonal_reward'
  | 'sponsored_reward'
  | 'event_unlock'
  | 'admin_grant';

export type BorderPriceType = 'direct_purchase' | 'sparks' | 'reward_only' | 'gifted_only';

export type BorderCollectionType =
  | 'beta'
  | 'monthly_leaderboard'
  | 'seasonal'
  | 'sponsored'
  | 'shop'
  | 'event'
  | 'founder';

export type BorderCollectionRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  collection_type: BorderCollectionType;
  season_code: string | null;
  release_at: string | null;
  expires_at: string | null;
  is_retired: boolean;
  created_at: string;
  updated_at: string;
};

export type BorderPricingRuleRow = {
  id: string;
  rarity_tier: BorderRarityTier;
  visual_tier: BorderVisualTier;
  default_price_band: string;
  recommended_display_label: string;
  notes: string | null;
  sort_order: number;
  created_at: string;
};

/** Human-readable labels for Pulse Shop / profile chips. */
export const borderCatalogLabels: {
  rarityTier: Record<BorderRarityTier, string>;
  sourceType: Record<BorderSourceType, string>;
  visualTier: Record<BorderVisualTier, string>;
  availabilityStatus: Record<BorderAvailabilityStatus, string>;
  collectionType: Record<BorderCollectionType, string>;
} = {
  rarityTier: {
    common: 'Common',
    rare: 'Rare',
    epic: 'Epic',
    legendary: 'Legendary',
    mythic: 'Mythic',
  },
  sourceType: {
    shop: 'Shop',
    beta_reward: 'Beta',
    leaderboard_reward: 'Leaderboard',
    seasonal_drop: 'Seasonal',
    event_reward: 'Event',
    sponsored: 'Sponsored',
    promotional: 'Promo giveaway',
    admin_grant: 'Award',
  },
  visualTier: {
    static: 'Static',
    enhanced: 'Enhanced',
    reactive: 'Reactive',
    animated: 'Animated',
  },
  availabilityStatus: {
    active: 'Active',
    limited: 'Limited',
    retired: 'Retired',
    exclusive: 'Exclusive',
    legacy: 'Legacy',
  },
  collectionType: {
    beta: 'Beta',
    monthly_leaderboard: 'Monthly champs',
    seasonal: 'Seasonal',
    sponsored: 'Sponsored',
    shop: 'Shop',
    event: 'Event',
    founder: 'Founder',
  },
};

export function formatBorderSourceLabel(source: string | null | undefined): string | null {
  if (!source) return null;
  const k = source as BorderSourceType;
  return borderCatalogLabels.sourceType[k] ?? source;
}

export function formatBorderAvailabilityLabel(status: string | null | undefined): string | null {
  if (!status) return null;
  const k = status as BorderAvailabilityStatus;
  return borderCatalogLabels.availabilityStatus[k] ?? status;
}
