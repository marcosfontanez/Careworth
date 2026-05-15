import type { ShopItemRow } from './types';

const DEFAULT = '#94A3B8';

const MAP: Record<string, string> = {
  common: '#94A3B8',
  uncommon: '#22C55E',
  rare: '#38BDF8',
  epic: '#A855F7',
  legendary: '#D4A63A',
  exclusive: '#F472B6',
  mythic: '#F43F5E',
};

export function effectiveRarityKey(item: ShopItemRow): string | null {
  const t = item.rarity_tier ?? item.rarity;
  return t ? String(t).toLowerCase() : null;
}

export function rarityColor(rarity: string | null | undefined): string {
  if (!rarity) return DEFAULT;
  return MAP[rarity.toLowerCase()] ?? DEFAULT;
}

/** Featured = explicit metadata or lowest sort_order among borders. */
export function pickFeaturedBorder(borders: ShopItemRow[]): ShopItemRow | null {
  if (borders.length === 0) return null;
  const flagged = borders.filter((b) => (b.metadata as { featured?: boolean } | null)?.featured === true);
  if (flagged.length) {
    return [...flagged].sort((a, b) => a.sort_order - b.sort_order)[0]!;
  }
  return [...borders].sort((a, b) => a.sort_order - b.sort_order)[0]!;
}

/** Preview ring stroke for shop UI — prefers `metadata.ring_color` / `preview_ring_color`. */
export function ringPreviewColor(item: ShopItemRow): string {
  const meta = item.metadata as { ring_color?: string; preview_ring_color?: string } | null;
  const c = meta?.ring_color ?? meta?.preview_ring_color;
  if (c && typeof c === 'string' && c.trim()) return c.trim();
  return rarityColor(effectiveRarityKey(item));
}

export function giftIconFromItem(item: ShopItemRow): string {
  const meta = item.metadata as { icon?: string } | null;
  const raw = meta?.icon?.trim();
  return raw && raw.length ? raw : 'gift';
}

/** Border listed in Pulse Shop with one-tap claim (no IAP); see migration 125 / metadata. */
export function isFreeShopBorder(item: ShopItemRow): boolean {
  if (item.type !== 'border') return false;
  const m = item.metadata as { free_in_shop?: boolean } | null | undefined;
  return m?.free_in_shop === true;
}

export function sparkPackLabel(sparkAmount: number, index: number, total: number): string | undefined {
  if (sparkAmount === 6500 || index === total - 1) return 'Best Value';
  if (sparkAmount === 2500 || index === Math.floor(total / 2)) return 'Most Popular';
  return undefined;
}
