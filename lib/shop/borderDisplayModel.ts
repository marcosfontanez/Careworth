import type { ShopItemRow } from '@/lib/shop/types';
import {
  borderCatalogLabels,
  type BorderAvailabilityStatus,
} from '@/lib/shop/borderCatalogTaxonomy';
import { effectiveRarityKey, isFreeShopBorder } from '@/lib/shop/catalogUtils';
import { rarityTierSortKey } from '@/lib/shop/borderBadgeTheme';

export type BorderOwnership = {
  owned: boolean;
  equipped: boolean;
  inventoryRowId?: string;
};

/** Compact source pill — secondary to rarity */
export function compactSourceLabel(source: string | null | undefined): string | null {
  if (!source) return null;
  const map: Record<string, string> = {
    shop: 'Shop',
    beta_reward: 'Beta',
    leaderboard_reward: 'Leaderboard',
    seasonal_drop: 'Seasonal',
    event_reward: 'Event',
    sponsored: 'Sponsored',
    promotional: 'Promo giveaway',
    admin_grant: 'Granted',
  };
  return map[source] ?? null;
}

/** Availability labels for compact row — only when decision-relevant */
export function compactAvailabilityLabel(
  status: string | null | undefined,
  opts?: { isRetired?: boolean; isLimited?: boolean },
): string | null {
  if (opts?.isRetired) return 'Retired';
  if (opts?.isLimited || status === 'limited') return 'Limited';
  if (status === 'legacy') return 'Legacy';
  if (status === 'retired') return 'Retired';
  if (status === 'exclusive') return 'Exclusive';
  return null;
}

export type BorderUiLockReason =
  | 'none'
  | 'equipped'
  | 'earned_only'
  | 'retired'
  | 'legacy'
  | 'exclusive'
  | 'unavailable'
  | 'web_store';

export function resolveBorderLockReason(
  item: ShopItemRow,
  ownership: BorderOwnership,
  isWeb: boolean,
): BorderUiLockReason {
  if (item.type !== 'border') return 'none';
  if (ownership.equipped) return 'equipped';
  if (ownership.owned) return 'none';

  const freeInShop =
    (item.metadata as { free_in_shop?: boolean } | null | undefined)?.free_in_shop === true;

  if (item.is_earned_only && !freeInShop) return 'earned_only';

  const av = item.availability_status as BorderAvailabilityStatus | null | undefined;
  if (av === 'legacy' && !item.is_shop_item && !freeInShop) return 'legacy';
  if (av === 'exclusive' && !item.is_shop_item && !item.is_earned_only && !freeInShop) return 'exclusive';
  if (item.is_retired || av === 'retired') {
    if (!item.is_shop_item || !item.is_active) return 'retired';
  }
  if (!item.is_shop_item && !item.is_active && !item.is_earned_only && !freeInShop) return 'unavailable';

  if (isWeb && item.is_shop_item && !freeInShop) return 'web_store';

  if (!item.is_active && !ownership.owned) return 'unavailable';

  return 'none';
}

export type BorderPrimaryCta =
  | { kind: 'equipped' }
  | { kind: 'owned_equip'; inventoryRowId: string }
  /** Free-in-shop border (metadata.free_in_shop); self-claim only */
  | { kind: 'free_claim' }
  /** Paid shop border on native: user picks self vs gift before checkout */
  | { kind: 'iap_choose_recipient' }
  | { kind: 'gift_only' }
  | { kind: 'locked'; reason: BorderUiLockReason };

export function resolveBorderPrimaryCta(
  item: ShopItemRow,
  ownership: BorderOwnership,
  isWeb: boolean,
): BorderPrimaryCta {
  if (item.type !== 'border') return { kind: 'locked', reason: 'unavailable' };

  if (ownership.equipped) return { kind: 'equipped' };

  if (ownership.owned) {
    if (ownership.inventoryRowId) return { kind: 'owned_equip', inventoryRowId: ownership.inventoryRowId };
    return { kind: 'locked', reason: 'unavailable' };
  }

  const lock = resolveBorderLockReason(item, ownership, isWeb);
  if (lock === 'earned_only' || lock === 'retired' || lock === 'legacy' || lock === 'exclusive') {
    return { kind: 'locked', reason: lock };
  }
  if (lock === 'web_store') return { kind: 'locked', reason: 'web_store' };
  if (lock === 'unavailable') return { kind: 'locked', reason: 'unavailable' };

  if (item.is_shop_item && item.is_active) {
    if (isFreeShopBorder(item)) return { kind: 'free_claim' };
    return { kind: 'iap_choose_recipient' };
  }

  if (item.is_giftable && !ownership.owned) {
    return { kind: 'gift_only' };
  }

  return { kind: 'locked', reason: 'unavailable' };
}

export function shouldShowOwnedGiftAction(item: ShopItemRow, ownership: BorderOwnership): boolean {
  return item.type === 'border' && item.is_giftable === true && ownership.owned;
}

export function lockReasonDisplay(reason: BorderUiLockReason): string {
  switch (reason) {
    case 'earned_only':
      return 'Earned only';
    case 'retired':
      return 'Retired';
    case 'legacy':
      return 'Legacy';
    case 'exclusive':
      return 'Exclusive';
    case 'web_store':
      return 'App store';
    case 'unavailable':
      return 'Unavailable';
    default:
      return '';
  }
}

/** One-line story for detail modal */
export function borderFlavorLine(item: ShopItemRow, collectionName: string | null | undefined): string | null {
  if (item.type !== 'border') return null;
  if (item.source_type === 'leaderboard_reward' && item.rank_place && collectionName) {
    const ord =
      item.rank_place === 1
        ? '1st'
        : item.rank_place === 2
          ? '2nd'
          : item.rank_place === 3
            ? '3rd'
            : `${item.rank_place}th`;
    return `Awarded to Top ${ord} creator in ${collectionName.replace(/ champions$/i, '').trim()}.`;
  }
  if (item.source_type === 'beta_reward' && collectionName) {
    return `Granted to PulseVerse beta testers — ${collectionName}.`;
  }
  if (item.source_type === 'seasonal_drop' && collectionName) {
    return `Part of the ${collectionName} collection.`;
  }
  if (collectionName) {
    return `Part of ${collectionName}.`;
  }
  return null;
}

export type CompactMetaChip = { key: string; label: string; variant: 'source' | 'motion' | 'availability' };

/** Secondary metadata row: source + animated/reactive + important availability */
export function buildCompactMetaChips(item: ShopItemRow, maxChips?: number): CompactMetaChip[] {
  if (item.type !== 'border') return [];
  const out: CompactMetaChip[] = [];
  const src = compactSourceLabel(item.source_type);
  if (src) out.push({ key: 'src', label: src, variant: 'source' });
  if (item.visual_tier === 'animated' || item.visual_tier === 'reactive' || item.is_animated) {
    out.push({
      key: 'motion',
      label: item.visual_tier === 'reactive' ? 'Reactive' : 'Animated',
      variant: 'motion',
    });
  }
  const av = compactAvailabilityLabel(item.availability_status, {
    isRetired: item.is_retired,
    isLimited: item.is_limited,
  });
  if (av) out.push({ key: 'av', label: av, variant: 'availability' });
  if (maxChips != null && out.length > maxChips) {
    const rank = (k: string) => (k === 'av' ? 0 : k === 'motion' ? 1 : 2);
    out.sort((a, b) => rank(a.key) - rank(b.key));
    out.length = maxChips;
  }
  return out;
}

export type BorderSortKey = 'default' | 'rarity_desc' | 'prestige_desc' | 'name';

export function detailAvailabilityLabel(item: ShopItemRow): string | null {
  if (item.type !== 'border') return null;
  const s = item.availability_status as BorderAvailabilityStatus | null | undefined;
  if (!s || s === 'active') {
    if (item.is_limited) return 'Limited';
    return 'Available';
  }
  const key = s as keyof typeof borderCatalogLabels.availabilityStatus;
  return borderCatalogLabels.availabilityStatus[key] ?? s;
}

export function detailVisualTierLabel(item: ShopItemRow): string | null {
  if (item.type !== 'border' || !item.visual_tier) return null;
  const key = item.visual_tier as keyof typeof borderCatalogLabels.visualTier;
  return borderCatalogLabels.visualTier[key] ?? item.visual_tier;
}

export function detailUnlockMethodLabel(item: ShopItemRow): string | null {
  if (item.type !== 'border' || !item.unlock_method) return null;
  const map: Record<string, string> = {
    direct_purchase: 'Direct purchase',
    leaderboard_rank: 'Leaderboard rank',
    beta_tester_grant: 'Beta tester grant',
    seasonal_reward: 'Seasonal reward',
    sponsored_reward: 'Sponsored reward',
    event_unlock: 'Event unlock',
    admin_grant: 'Granted',
  };
  return map[item.unlock_method] ?? item.unlock_method;
}

export function sortBorderItems(items: ShopItemRow[], sort: BorderSortKey): ShopItemRow[] {
  const copy = [...items];
  switch (sort) {
    case 'rarity_desc':
      return copy.sort(
        (a, b) => rarityTierSortKey(effectiveRarityKey(b)) - rarityTierSortKey(effectiveRarityKey(a)),
      );
    case 'prestige_desc':
      return copy.sort((a, b) => (b.prestige_score ?? 0) - (a.prestige_score ?? 0));
    case 'name':
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    default:
      return copy.sort((a, b) => a.sort_order - b.sort_order);
  }
}

export type BorderFilterState = {
  ownedOnly: boolean;
  /** shop | earned paths */
  acquisition: 'all' | 'shop' | 'earned';
};

export function filterBorderItems(
  items: ShopItemRow[],
  filter: BorderFilterState,
  ownsBorder: (id: string) => boolean,
): ShopItemRow[] {
  return items.filter((b) => {
    if (filter.ownedOnly && !ownsBorder(b.id)) return false;
    if (filter.acquisition === 'shop') {
      if (b.is_shop_item !== true) return false;
    }
    if (filter.acquisition === 'earned') {
      const earnedPath = b.is_earned_only === true || b.is_shop_item === false;
      if (!earnedPath) return false;
    }
    return true;
  });
}
