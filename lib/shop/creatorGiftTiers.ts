/**
 * PulseVerse creator gift tiers — spark-priced gifts grouped for browsing.
 * Ladder spans small thanks → show-stopping moments (similar range shape to major short-video apps).
 * Prefer slug mapping for stability; price bands catch new catalog rows.
 */

import type { ShopItemRow } from '@/lib/shop/types';

export type IonGlyph =
  | 'heart'
  | 'cafe'
  | 'sparkles'
  | 'ribbon'
  | 'planet-outline'
  | 'rocket-outline'
  | 'diamond-outline';

export type CreatorGiftTierId =
  | 'gratitude'
  | 'boost'
  | 'radiance'
  | 'ovation'
  | 'constellation'
  | 'zenith'
  | 'supernova';

/** Browse / filter order — low Sparks → marquee tier */
export const CREATOR_GIFT_TIER_ORDER: readonly CreatorGiftTierId[] = [
  'gratitude',
  'boost',
  'radiance',
  'ovation',
  'constellation',
  'zenith',
  'supernova',
] as const;

export type CreatorGiftTierMeta = {
  label: string;
  tagline: string;
  icon: IonGlyph;
  orbGradient: [string, string];
  iconColor: string;
  cardAccent: string;
};

export const CREATOR_GIFT_TIER_META: Record<CreatorGiftTierId, CreatorGiftTierMeta> = {
  gratitude: {
    label: 'Gratitude',
    tagline: 'A quick spark of thanks',
    icon: 'heart',
    orbGradient: ['rgba(244,114,182,0.35)', 'rgba(249,168,212,0.12)'],
    iconColor: '#FBCFE8',
    cardAccent: 'rgba(244,114,182,0.55)',
  },
  boost: {
    label: 'Boost',
    tagline: 'Fuel their next win',
    icon: 'cafe',
    orbGradient: ['rgba(245,158,11,0.35)', 'rgba(252,211,77,0.12)'],
    iconColor: '#FDE68A',
    cardAccent: 'rgba(245,158,11,0.65)',
  },
  radiance: {
    label: 'Radiance',
    tagline: 'Light up their moment',
    icon: 'sparkles',
    orbGradient: ['rgba(167,139,250,0.45)', 'rgba(99,102,241,0.15)'],
    iconColor: '#E9D5FF',
    cardAccent: 'rgba(167,139,250,0.75)',
  },
  ovation: {
    label: 'Ovation',
    tagline: 'The room notices',
    icon: 'ribbon',
    orbGradient: ['rgba(34,211,238,0.35)', 'rgba(212,166,58,0.22)'],
    iconColor: '#A5F3FC',
    cardAccent: 'rgba(34,211,238,0.75)',
  },
  constellation: {
    label: 'Constellation',
    tagline: 'A whole community-sized thank-you',
    icon: 'planet-outline',
    orbGradient: ['rgba(99,102,241,0.45)', 'rgba(14,165,233,0.2)'],
    iconColor: '#C7D2FE',
    cardAccent: 'rgba(99,102,241,0.9)',
  },
  zenith: {
    label: 'Zenith',
    tagline: 'Career-highlight level support',
    icon: 'rocket-outline',
    orbGradient: ['rgba(212,166,58,0.42)', 'rgba(245,158,11,0.18)'],
    iconColor: '#FEF08A',
    cardAccent: 'rgba(212,166,58,0.95)',
  },
  supernova: {
    label: 'Supernova',
    tagline: 'The rare, full-story moment',
    icon: 'diamond-outline',
    orbGradient: ['rgba(251,113,133,0.4)', 'rgba(244,63,94,0.2)'],
    iconColor: '#FECDD3',
    cardAccent: 'rgba(251,113,133,0.95)',
  },
};

/**
 * Upper-bound (exclusive) Sparks price for each tier; last bucket is everything >= previous bound.
 * Tuned so low tiers stay approachable and top tier aligns with marquee gifts (~100k Sparks).
 */
const PRICE_MAX: Record<CreatorGiftTierId, number | null> = {
  gratitude: 100,
  boost: 400,
  radiance: 1500,
  ovation: 8000,
  constellation: 25000,
  zenith: 80000,
  supernova: null,
};

const SLUG_TIER: Partial<Record<string, CreatorGiftTierId>> = {
  pulse: 'gratitude',
  'coffee-drop': 'boost',
  halo: 'radiance',
  crown: 'ovation',
  'spotlight-moment': 'radiance',
  'standing-encore': 'ovation',
  'pulse-orbit': 'ovation',
  'night-residency': 'constellation',
  'healers-monument': 'zenith',
  'pulse-nova': 'supernova',
};

export function creatorGiftTierForItem(item: ShopItemRow): CreatorGiftTierId {
  const key = item.slug?.toLowerCase().trim() ?? '';
  const mapped = SLUG_TIER[key];
  if (mapped) return mapped;
  const p = Number(item.spark_price ?? 0);
  if (p < (PRICE_MAX.gratitude as number)) return 'gratitude';
  if (p < (PRICE_MAX.boost as number)) return 'boost';
  if (p < (PRICE_MAX.radiance as number)) return 'radiance';
  if (p < (PRICE_MAX.ovation as number)) return 'ovation';
  if (p < (PRICE_MAX.constellation as number)) return 'constellation';
  if (p < (PRICE_MAX.zenith as number)) return 'zenith';
  return 'supernova';
}

export function groupGiftsByTier(gifts: ShopItemRow[]): Map<CreatorGiftTierId, ShopItemRow[]> {
  const m = new Map<CreatorGiftTierId, ShopItemRow[]>();
  for (const t of CREATOR_GIFT_TIER_ORDER) m.set(t, []);
  for (const g of gifts) {
    m.get(creatorGiftTierForItem(g))!.push(g);
  }
  for (const arr of m.values()) {
    arr.sort((a, b) => (a.spark_price ?? 0) - (b.spark_price ?? 0));
  }
  return m;
}

export type GiftTierFilter = 'all' | CreatorGiftTierId;
