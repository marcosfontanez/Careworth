/**
 * Premium visual tokens for border rarity (compact cards — short labels).
 * Single source for fills: `rarity` from `@/theme/designTokens`.
 */

import type { BorderRarityTier } from '@/lib/shop/borderCatalogTaxonomy';
import { rarity as rarityTokens } from '@/theme/designTokens';

export type RarityBadgeVisual = {
  label: string;
  textColor: string;
  borderColor: string;
  backgroundColor: string;
  /** When true, wrap label in LinearGradient border */
  useGradientBorder: boolean;
  gradientColors?: readonly [string, string, ...string[]];
};

const TIER_ORDER: Record<string, number> = {
  common: 0,
  rare: 1,
  epic: 2,
  legendary: 3,
  mythic: 4,
};

export function rarityTierSortKey(tier: string | null | undefined): number {
  if (!tier) return -1;
  return TIER_ORDER[tier.toLowerCase()] ?? -1;
}

export function getRarityBadgeVisual(tierRaw: string | null | undefined): RarityBadgeVisual {
  const t = (tierRaw ?? 'common').toLowerCase();
  switch (t) {
    case 'mythic':
      return {
        label: 'MYTHIC',
        textColor: rarityTokens.mythic.text,
        borderColor: rarityTokens.mythic.border,
        backgroundColor: rarityTokens.mythic.background,
        useGradientBorder: true,
        gradientColors: [...rarityTokens.mythic.gradientRing],
      };
    case 'legendary':
      return {
        label: 'LEGENDARY',
        textColor: rarityTokens.legendary.text,
        borderColor: rarityTokens.legendary.border,
        backgroundColor: rarityTokens.legendary.background,
        useGradientBorder: false,
      };
    case 'epic':
      return {
        label: 'EPIC',
        textColor: rarityTokens.epic.text,
        borderColor: rarityTokens.epic.border,
        backgroundColor: rarityTokens.epic.background,
        useGradientBorder: false,
      };
    case 'rare':
      return {
        label: 'RARE',
        textColor: rarityTokens.rare.text,
        borderColor: rarityTokens.rare.border,
        backgroundColor: rarityTokens.rare.background,
        useGradientBorder: false,
      };
    case 'common':
    default:
      return {
        label: 'COMMON',
        textColor: rarityTokens.common.text,
        borderColor: rarityTokens.common.border,
        backgroundColor: rarityTokens.common.background,
        useGradientBorder: false,
      };
  }
}

/** Map DB tier to BorderRarityTier for typing */
export function normalizeRarityTier(tier: string | null | undefined): BorderRarityTier {
  const t = (tier ?? 'common').toLowerCase();
  if (t === 'mythic' || t === 'legendary' || t === 'epic' || t === 'rare' || t === 'common') {
    return t;
  }
  return 'common';
}
