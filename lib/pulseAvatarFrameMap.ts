import type { PulseAvatarFrame } from '@/types';
import type { BorderRarityTier } from '@/lib/shop/borderCatalogTaxonomy';
import { coerceCssColor } from '@/lib/coerceCssColor';

export function mapPulseAvatarFrameEmbed(raw: unknown): PulseAvatarFrame | null | undefined {
  if (raw == null) return raw === null ? null : undefined;
  // PostgREST sometimes returns one-to-one embeds as a single-element array.
  if (Array.isArray(raw)) {
    if (raw.length === 0) return null;
    return mapPulseAvatarFrameEmbed(raw[0]);
  }
  if (typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : '';
  if (!id) return undefined;
  const tier = String(o.prize_tier ?? '');
  const prizeTier =
    tier === 'gold' ||
    tier === 'silver' ||
    tier === 'bronze' ||
    tier === 'exclusive' ||
    tier === 'legacy' ||
    tier === 'campaign'
      ? tier
      : 'gold';
  const rawTier = o.rarity_tier != null ? String(o.rarity_tier).toLowerCase().trim() : '';
  const rarityTier: BorderRarityTier =
    rawTier === 'mythic' ||
    rawTier === 'legendary' ||
    rawTier === 'epic' ||
    rawTier === 'rare' ||
    rawTier === 'common'
      ? rawTier
      : prizeTierFallbackRarity(tier);

  const acquisitionTag =
    o.acquisition_tag != null && String(o.acquisition_tag).trim()
      ? String(o.acquisition_tag).trim()
      : null;

  return {
    id,
    slug: String(o.slug ?? ''),
    label: String(o.label ?? ''),
    subtitle: o.subtitle != null ? String(o.subtitle) : null,
    ringCaption:
      o.ring_caption != null && String(o.ring_caption).trim()
        ? String(o.ring_caption).trim()
        : null,
    prizeTier,
    rarityTier,
    acquisitionTag,
    monthStart: String(o.month_start ?? ''),
    ringColor: coerceCssColor(o.ring_color, '#FFFFFF'),
    glowColor: coerceCssColor(o.glow_color, '#FFFFFF'),
  };
}

function prizeTierFallbackRarity(prizeTier: string): BorderRarityTier {
  if (prizeTier === 'gold' || prizeTier === 'silver' || prizeTier === 'bronze') return 'mythic';
  if (prizeTier === 'exclusive' || prizeTier === 'legacy') return 'legendary';
  if (prizeTier === 'campaign') return 'rare';
  return 'common';
}
