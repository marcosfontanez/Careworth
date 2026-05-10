import type { OwnedBorderEntry } from '@/lib/borders/ownedTypes';
import type { BorderAvailabilityStatus } from '@/lib/shop/borderCatalogTaxonomy';
import { effectiveRarityKey } from '@/lib/shop/catalogUtils';
import { rarityTierSortKey } from '@/lib/shop/borderBadgeTheme';

export type OwnershipFilter = 'all' | 'equipped' | 'unequipped';

/** `null` = all collections; `__shop__` = shop-listed borders; `__uncat__` = no collection id */
export type CollectionFilterKey = string | null;

export type InventoryFilterState = {
  ownership: OwnershipFilter;
  collectionKey: CollectionFilterKey;
  rarity: string | null;
  source: string | null;
  availability: string | null;
  visualTier: string | null;
};

export const defaultInventoryFilterState = (): InventoryFilterState => ({
  ownership: 'all',
  collectionKey: null,
  rarity: null,
  source: null,
  availability: null,
  visualTier: null,
});

export type InventorySortKey =
  | 'recent'
  | 'rarity_desc'
  | 'collection_az'
  | 'equipped_first'
  | 'prestige_desc'
  | 'season_newest';

function matchesAvailability(entry: OwnedBorderEntry, key: string | null): boolean {
  if (!key) return true;
  const item = entry.item;
  const av = item.availability_status as BorderAvailabilityStatus | null | undefined;
  switch (key) {
    case 'active':
      return av === 'active' && !item.is_limited;
    case 'limited':
      return item.is_limited === true || av === 'limited';
    case 'legacy':
      return av === 'legacy';
    case 'retired':
      return item.is_retired === true || av === 'retired';
    case 'exclusive':
      return av === 'exclusive';
    default:
      return true;
  }
}

function matchesCollection(entry: OwnedBorderEntry, key: CollectionFilterKey): boolean {
  if (!key) return true;
  if (key === '__shop__') return entry.item.is_shop_item === true;
  if (key === '__uncat__') return !entry.item.collection_id;
  return entry.item.collection_id === key;
}

export function filterOwnedBorderEntries(
  entries: OwnedBorderEntry[],
  f: InventoryFilterState,
  equippedShopItemId: string | null,
): OwnedBorderEntry[] {
  return entries.filter((e) => {
    if (f.ownership === 'equipped' && equippedShopItemId !== e.item.id) return false;
    if (f.ownership === 'unequipped' && equippedShopItemId === e.item.id) return false;
    if (!matchesCollection(e, f.collectionKey)) return false;
    if (f.rarity) {
      const rk = effectiveRarityKey(e.item);
      if (!rk || rk !== f.rarity.toLowerCase()) return false;
    }
    if (f.source && (e.item.source_type ?? '') !== f.source) return false;
    if (!matchesAvailability(e, f.availability)) return false;
    if (f.visualTier && (e.item.visual_tier ?? '') !== f.visualTier) return false;
    return true;
  });
}

export function sortOwnedBorderEntries(
  entries: OwnedBorderEntry[],
  sort: InventorySortKey,
  equippedShopItemId: string | null,
): OwnedBorderEntry[] {
  const copy = [...entries];

  switch (sort) {
    case 'equipped_first':
      return copy.sort((a, b) => {
        const ae = equippedShopItemId === a.item.id ? 0 : 1;
        const be = equippedShopItemId === b.item.id ? 0 : 1;
        if (ae !== be) return ae - be;
        return new Date(b.inventory.acquired_at).getTime() - new Date(a.inventory.acquired_at).getTime();
      });
    case 'rarity_desc':
      return copy.sort(
        (a, b) =>
          rarityTierSortKey(effectiveRarityKey(b.item)) - rarityTierSortKey(effectiveRarityKey(a.item)),
      );
    case 'prestige_desc':
      return copy.sort((a, b) => (b.item.prestige_score ?? 0) - (a.item.prestige_score ?? 0));
    case 'collection_az': {
      return copy.sort((a, b) => {
        const ca = (a.collectionName ?? '\uffff').localeCompare(b.collectionName ?? '\uffff');
        if (ca !== 0) return ca;
        return a.item.name.localeCompare(b.item.name);
      });
    }
    case 'season_newest':
      return copy.sort((a, b) => {
        const sa = a.item.season_code ?? '';
        const sb = b.item.season_code ?? '';
        if (sa || sb) return sb.localeCompare(sa);
        return new Date(b.inventory.acquired_at).getTime() - new Date(a.inventory.acquired_at).getTime();
      });
    case 'recent':
    default:
      return copy.sort(
        (a, b) =>
          new Date(b.inventory.acquired_at).getTime() - new Date(a.inventory.acquired_at).getTime(),
      );
  }
}

export function countActiveAdvancedFilters(f: InventoryFilterState): number {
  let n = 0;
  if (f.collectionKey) n++;
  if (f.rarity) n++;
  if (f.source) n++;
  if (f.availability) n++;
  if (f.visualTier) n++;
  return n;
}

export function inventoryCollectionStats(entries: OwnedBorderEntry[]) {
  const collectionIds = new Set<string>();
  let animated = 0;
  let legacy = 0;
  for (const e of entries) {
    if (e.item.collection_id) collectionIds.add(e.item.collection_id);
    const motion =
      e.item.visual_tier === 'animated' ||
      e.item.visual_tier === 'reactive' ||
      e.item.is_animated === true;
    if (motion) animated++;
    if (e.item.availability_status === 'legacy' || e.item.is_retired) legacy++;
  }
  return {
    totalOwned: entries.length,
    collectionCount: collectionIds.size,
    animatedCount: animated,
    legacyCount: legacy,
  };
}
