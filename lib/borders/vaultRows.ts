import type { OwnedBorderEntry } from '@/lib/borders/ownedTypes';
import type { EarnedPulseAvatarFrame } from '@/services/supabase/pulseAvatarFrames';
import type { PulseAvatarFrame } from '@/types';
import {
  filterOwnedBorderEntries,
  inventoryCollectionStats,
  type InventoryFilterState,
  type InventorySortKey,
} from '@/lib/borders/inventoryFilters';
import { effectiveRarityKey } from '@/lib/shop/catalogUtils';
import { rarityTierSortKey } from '@/lib/shop/borderBadgeTheme';

export type VaultRow =
  | { kind: 'shop'; entry: OwnedBorderEntry }
  | { kind: 'pulse'; earned: EarnedPulseAvatarFrame };

function pulseFrameRarityKey(frame: EarnedPulseAvatarFrame['frame']): string | null {
  return frame.rarityTier ?? null;
}

/** Pulse rows only pass filters that make sense for catalog borders. */
function pulseMatchesAdvancedFilters(row: VaultRow, f: InventoryFilterState): boolean {
  if (row.kind !== 'pulse') return true;
  if (f.collectionKey === '__shop__' || f.collectionKey === '__uncat__') return false;
  if (f.collectionKey && f.collectionKey !== null) return false;
  if (f.rarity) {
    const rk = pulseFrameRarityKey(row.earned.frame);
    if (!rk || rk.toLowerCase() !== f.rarity.toLowerCase()) return false;
  }
  if (f.source) return false;
  if (f.availability) return false;
  if (f.visualTier) return false;
  return true;
}

function pulseMatchesOwnership(
  row: VaultRow,
  f: InventoryFilterState,
  selectedPulseFrameId: string | null,
): boolean {
  if (row.kind !== 'pulse') return true;
  const pid = row.earned.frame.id;
  const equipped = selectedPulseFrameId === pid;
  if (f.ownership === 'equipped' && !equipped) return false;
  if (f.ownership === 'unequipped' && equipped) return false;
  return true;
}

export function buildVaultRows(
  shopEntries: OwnedBorderEntry[],
  pulseEarned: EarnedPulseAvatarFrame[],
): VaultRow[] {
  const shop = shopEntries.map((entry) => ({ kind: 'shop' as const, entry }));
  const pulse = pulseEarned.map((earned) => ({ kind: 'pulse' as const, earned }));
  return [...shop, ...pulse];
}

/**
 * Matches `border_catalog_leaderboard_rank_defaults` / shop `prestige_score` scale so
 * prize rows sort with Shop borders under **Prestige**.
 */
function pulseEarnedPrestige(earned: EarnedPulseAvatarFrame): number {
  const r = earned.leaderboardRank;
  if (r === 1) return 100;
  if (r === 2 || r === 3) return 85;
  if (r === 4) return 60;
  if (r === 5) return 50;
  const t = earned.frame.prizeTier;
  if (t === 'gold') return 100;
  if (t === 'silver') return 85;
  if (t === 'bronze') return 55;
  if (t === 'exclusive' || t === 'legacy') return 45;
  if (t === 'campaign') return 40;
  return Math.max(0, rarityTierSortKey(earned.frame.rarityTier) * 12);
}

function vaultRowPrestigeScore(row: VaultRow): number {
  if (row.kind === 'shop') return row.entry.item.prestige_score ?? 0;
  return pulseEarnedPrestige(row.earned);
}

/** Podium / rank ordering for tie-breaks (gold > silver > bronze). */
function prizeTierOrder(t: PulseAvatarFrame['prizeTier'] | undefined): number {
  if (t === 'gold') return 4;
  if (t === 'silver') return 3;
  if (t === 'bronze') return 2;
  if (t === 'exclusive' || t === 'legacy') return 1;
  if (t === 'campaign') return 0;
  return 0;
}

function vaultRowPrizeTierOrder(row: VaultRow): number {
  if (row.kind === 'shop') {
    const rp = row.entry.item.rank_place;
    if (typeof rp === 'number' && rp >= 1 && rp <= 5) return 6 - rp;
    return prizeTierOrder(undefined);
  }
  const r = row.earned.leaderboardRank;
  if (r === 1) return 5;
  if (r === 2 || r === 3) return 4;
  if (r === 4) return 2;
  if (r === 5) return 1;
  return prizeTierOrder(row.earned.frame.prizeTier);
}

export function filterVaultRows(
  rows: VaultRow[],
  f: InventoryFilterState,
  equippedShopItemId: string | null,
  selectedPulseFrameId: string | null,
): VaultRow[] {
  const shopOnly = rows.filter((r): r is Extract<VaultRow, { kind: 'shop' }> => r.kind === 'shop');
  const passedShopIds = new Set(
    filterOwnedBorderEntries(
      shopOnly.map((r) => r.entry),
      f,
      equippedShopItemId,
    ).map((e) => e.inventory.id),
  );

  return rows.filter((row) => {
    if (!pulseMatchesOwnership(row, f, selectedPulseFrameId)) return false;
    if (!pulseMatchesAdvancedFilters(row, f)) return false;
    if (row.kind === 'shop') return passedShopIds.has(row.entry.inventory.id);
    return true;
  });
}

export function sortVaultRows(
  rows: VaultRow[],
  sort: InventorySortKey,
  equippedShopItemId: string | null,
  selectedPulseFrameId: string | null,
): VaultRow[] {
  const copy = [...rows];

  const equippedRank = (row: VaultRow): number => {
    if (row.kind === 'shop') return equippedShopItemId === row.entry.item.id ? 0 : 1;
    return selectedPulseFrameId === row.earned.frame.id ? 0 : 1;
  };

  const recentTs = (row: VaultRow): number =>
    row.kind === 'shop'
      ? new Date(row.entry.inventory.acquired_at).getTime()
      : new Date(row.earned.grantedAt).getTime();

  const rowRaritySortKey = (row: VaultRow): number => {
    if (row.kind === 'shop') return rarityTierSortKey(effectiveRarityKey(row.entry.item));
    return rarityTierSortKey(row.earned.frame.rarityTier);
  };

  switch (sort) {
    case 'equipped_first':
      return copy.sort((a, b) => {
        const ae = equippedRank(a);
        const be = equippedRank(b);
        if (ae !== be) return ae - be;
        return recentTs(b) - recentTs(a);
      });
    case 'rarity_desc':
      return copy.sort((a, b) => {
        const ra = rowRaritySortKey(a);
        const rb = rowRaritySortKey(b);
        if (ra !== rb) return rb - ra;
        const pa = vaultRowPrizeTierOrder(a);
        const pb = vaultRowPrizeTierOrder(b);
        if (pa !== pb) return pb - pa;
        return recentTs(b) - recentTs(a);
      });
    case 'prestige_desc':
      return copy.sort((a, b) => {
        const diff = vaultRowPrestigeScore(b) - vaultRowPrestigeScore(a);
        if (diff !== 0) return diff;
        const pa = vaultRowPrizeTierOrder(a);
        const pb = vaultRowPrizeTierOrder(b);
        if (pa !== pb) return pb - pa;
        return recentTs(b) - recentTs(a);
      });
    case 'collection_az': {
      return copy.sort((a, b) => {
        if (a.kind === 'shop' && b.kind === 'shop') {
          const ca = (a.entry.collectionName ?? '\uffff').localeCompare(b.entry.collectionName ?? '\uffff');
          if (ca !== 0) return ca;
          return a.entry.item.name.localeCompare(b.entry.item.name);
        }
        if (a.kind === 'pulse' && b.kind === 'pulse') {
          return a.earned.frame.label.localeCompare(b.earned.frame.label);
        }
        return a.kind === 'shop' ? -1 : 1;
      });
    }
    case 'season_newest':
      return copy.sort((a, b) => {
        if (a.kind === 'shop' && b.kind === 'shop') {
          const sa = a.entry.item.season_code ?? '';
          const sb = b.entry.item.season_code ?? '';
          if (sa || sb) return sb.localeCompare(sa);
        }
        return recentTs(b) - recentTs(a);
      });
    case 'recent':
    default:
      return copy.sort((a, b) => recentTs(b) - recentTs(a));
  }
}

export function vaultCollectionStats(
  shopEntries: OwnedBorderEntry[],
  pulseEarned: EarnedPulseAvatarFrame[],
) {
  const base = inventoryCollectionStats(shopEntries);
  return {
    ...base,
    totalOwned: base.totalOwned + pulseEarned.length,
  };
}
