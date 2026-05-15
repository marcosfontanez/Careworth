/**
 * Border product category — single, stable taxonomy used by every border
 * surface (shop hero rail, card, detail modal, vault filters, info sheet).
 *
 * The DB does not have a single `border_category` column today, so we
 * derive it from existing signals on `ShopItemRow` + the optional
 * `BorderCollectionRow` it belongs to. When a real column lands, swap the
 * body of {@link deriveBorderCategory} for a direct read — call sites stay
 * unchanged.
 */

import type { ShopItemRow } from '@/lib/shop/types';
import type { BorderCollectionType } from '@/lib/shop/borderCatalogTaxonomy';
import { isFreeShopBorder } from '@/lib/shop/catalogUtils';

/**
 * Minimum shape `deriveBorderCategory` needs from a collection row.
 * Compatible with both `BorderCollectionRow` and `BorderCollectionSummary`.
 */
export type BorderCollectionLike = {
  collection_type?: BorderCollectionType | null;
};

export type BorderCategory =
  | 'holiday'
  | 'premium'
  | 'charity'
  | 'advertiser'
  | 'reward'
  | 'beta'
  | 'leaderboard'
  | 'legacy';

export const BORDER_CATEGORY_LABELS: Record<BorderCategory, string> = {
  holiday: 'Free monthly',
  premium: 'Premium drop',
  charity: 'Charity',
  advertiser: 'Partner drop',
  reward: 'Event reward',
  beta: 'Beta reward',
  leaderboard: 'Leaderboard',
  legacy: 'Legacy',
};

/**
 * Display tone per category — drives chip color, hero accent, and badge ring.
 * `cyan` = neutral premium, `gold` = featured / charity meaningful, `violet`
 * = partner drop, `green` = free / reward, `slate` = legacy / muted.
 */
export type BorderCategoryTone = 'cyan' | 'gold' | 'violet' | 'green' | 'slate';

export const BORDER_CATEGORY_TONE: Record<BorderCategory, BorderCategoryTone> = {
  holiday: 'green',
  premium: 'cyan',
  charity: 'gold',
  advertiser: 'violet',
  reward: 'cyan',
  beta: 'cyan',
  leaderboard: 'gold',
  legacy: 'slate',
};

/**
 * Resolve a border row to its product category.
 *
 * Signal precedence (most specific first):
 *   1. Charity metadata (`metadata.charity_name` / category text contains "charity")
 *   2. Sponsored source / collection → advertiser
 *   3. Beta source → beta
 *   4. Leaderboard source / collection → leaderboard
 *   5. Event source → reward
 *   6. Free claim + (seasonal collection or season_code) → holiday
 *   7. Retired → legacy
 *   8. Default → premium (any other shop SKU)
 */
export function deriveBorderCategory(
  item: ShopItemRow,
  collection?: BorderCollectionLike | null,
): BorderCategory {
  const meta = item.metadata as
    | { charity_name?: string; charity_url?: string; sponsor_name?: string }
    | null
    | undefined;
  const categoryText = (item.category ?? '').toLowerCase();

  if (meta?.charity_name || /charity/.test(categoryText)) return 'charity';

  if (
    item.source_type === 'sponsored' ||
    collection?.collection_type === 'sponsored' ||
    Boolean(meta?.sponsor_name)
  ) {
    return 'advertiser';
  }

  if (item.source_type === 'beta_reward' || collection?.collection_type === 'beta') {
    return 'beta';
  }

  if (
    item.source_type === 'leaderboard_reward' ||
    collection?.collection_type === 'monthly_leaderboard'
  ) {
    return 'leaderboard';
  }

  if (item.source_type === 'event_reward' || collection?.collection_type === 'event') {
    return 'reward';
  }

  if (
    isFreeShopBorder(item) &&
    (item.season_code || collection?.collection_type === 'seasonal' || item.source_type === 'seasonal_drop')
  ) {
    return 'holiday';
  }

  if (item.is_retired) return 'legacy';

  return 'premium';
}

/**
 * Optional charity metadata exposed cleanly to UI. Reads from jsonb today;
 * upgrade to first-class columns later without touching call sites.
 */
export type BorderCharityMeta = {
  partnerName: string;
  proceedsDescription?: string;
  donationUrl?: string;
};

export function readCharityMeta(item: ShopItemRow): BorderCharityMeta | null {
  const meta = item.metadata as
    | {
        charity_name?: string;
        charity_partner_name?: string;
        charity_url?: string;
        charity_donation_url?: string;
        charity_proceeds_description?: string;
        charity_proceeds?: string;
      }
    | null
    | undefined;
  if (!meta) return null;
  const partnerName = (meta.charity_partner_name ?? meta.charity_name ?? '').trim();
  if (!partnerName) return null;
  return {
    partnerName,
    proceedsDescription: (meta.charity_proceeds_description ?? meta.charity_proceeds ?? '').trim() || undefined,
    donationUrl: (meta.charity_donation_url ?? meta.charity_url ?? '').trim() || undefined,
  };
}

/**
 * Optional sponsor metadata exposed cleanly to UI.
 */
export type BorderSponsorMeta = {
  brandName: string;
  campaignLabel?: string;
  campaignUrl?: string;
};

export function readSponsorMeta(item: ShopItemRow): BorderSponsorMeta | null {
  const meta = item.metadata as
    | {
        sponsor_name?: string;
        sponsor_brand_name?: string;
        sponsor_campaign_label?: string;
        sponsor_campaign_url?: string;
        sponsor_url?: string;
      }
    | null
    | undefined;
  if (!meta) return null;
  const brandName = (meta.sponsor_brand_name ?? meta.sponsor_name ?? '').trim();
  if (!brandName) return null;
  return {
    brandName,
    campaignLabel: (meta.sponsor_campaign_label ?? '').trim() || undefined,
    campaignUrl: (meta.sponsor_campaign_url ?? meta.sponsor_url ?? '').trim() || undefined,
  };
}
