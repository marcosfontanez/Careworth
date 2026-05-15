import type { ImageSourcePropType } from 'react-native';

import type { ShopItemRow } from '@/lib/shop/types';
import type { PulseAvatarFrame } from '@/types';

/**
 * Bundled podium / Solstice ring PNGs: the inner transparent opening diameter is ~52–57% of the
 * square canvas (alpha-tested). With `contentFit="contain"`, the outer view must be at least
 * `photoDiameter / RASTER_PODIUM_INNER_OPENING_FRAC` or the metal overlaps the face.
 */
export const RASTER_PODIUM_INNER_OPENING_FRAC = 0.5;

/** Outer square (px) that fits `photoDiameter` inside the ring’s inner hole + ornament padding. */
export function rasterRingOuterBoxSide(
  photoDiameter: number,
  innerOpeningFrac: number = RASTER_PODIUM_INNER_OPENING_FRAC,
): number {
  const pad = Math.max(12, Math.round(photoDiameter * 0.2));
  const fromPadOnly = photoDiameter + pad;
  const toFitInnerHole = Math.ceil(photoDiameter / innerOpeningFrac);
  return Math.max(fromPadOnly, toFitInnerHole);
}

/** Catalog slug for the bundled beta-tester raster ring (see migration 105). */
export const PULSE_BETA_FRAME_SLUG = 'beta-tester-border';

/** Matches `pulse_avatar_frames.slug` + `shop_items.metadata.pulse_frame_slug` (migration 128). */
export const PULSE_PRIDE_MONTH_2026_FRAME_SLUG = 'pride-month-2026-border';

/** Mother’s Day 2026 limited shop drop (migration 133). */
export const PULSE_MOTHERS_DAY_2026_FRAME_SLUG = 'mothers-day-2026-border';

/** Juneteenth 2026 charity IAP border (migration 135). */
export const PULSE_JUNETEENTH_2026_FRAME_SLUG = 'juneteenth-2026-border';

/** May 2026 flagship shop border — Emerald Renewal (migration 138). */
export const PULSE_EMERALD_RENEWAL_MAY_2026_FRAME_SLUG = 'emerald-renewal-may-2026-border';

const BETA_TESTER_BORDER =
  require('../assets/images/pulse-rings/beta-tester-border.png') as ImageSourcePropType;

const PRIDE_MONTH_2026_BORDER =
  require('../assets/images/pulse-rings/pride-month-2026-border.png') as ImageSourcePropType;

const MOTHERS_DAY_2026_BORDER =
  require('../assets/images/pulse-rings/mothers-day-2026-border.png') as ImageSourcePropType;

const JUNETEENTH_2026_BORDER =
  require('../assets/images/pulse-rings/juneteenth-2026-border.png') as ImageSourcePropType;

const EMERALD_RENEWAL_MAY_2026_BORDER =
  require('../assets/images/pulse-rings/emerald-renewal-may-2026-border.png') as ImageSourcePropType;

/**
 * Diameter of the transparent “hole” in the beta-tester PNG as a fraction of
 * the square canvas edge (same meaning as {@link RASTER_PODIUM_INNER_OPENING_FRAC}).
 *
 * The art file has a **wide** inner opening; using too small a value here makes
 * `rasterRingOuterBoxSide` inflate the wrapper so the photo looks tiny (large
 * dark gap). Tune against `assets/images/pulse-rings/beta-tester-border.png`.
 */
export const RASTER_BETA_TESTER_INNER_OPENING_FRAC = 0.71;

/** Measured from processed `pride-month-2026-border.png` (transparent hole / square edge). */
export const RASTER_PRIDE_MONTH_2026_INNER_OPENING_FRAC = 0.562;

/** Measured from matted `mothers-day-2026-border.png` (2026 art swap). */
export const RASTER_MOTHERS_DAY_2026_INNER_OPENING_FRAC = 0.699;

/** Measured from processed `juneteenth-2026-border.png` (transparent hole / square edge). */
export const RASTER_JUNETEENTH_2026_INNER_OPENING_FRAC = 0.582;

/** Measured from processed `emerald-renewal-may-2026-border.png` (transparent hole / square edge). */
export const RASTER_EMERALD_RENEWAL_MAY_2026_INNER_OPENING_FRAC = 0.535;

/** Shop slugs that use the bundled beta-tester PNG in listings (matches pulse_avatar_frames). */
const SHOP_SLUGS_BETA_RASTER = new Set(['border_beta_pioneer', 'beta-pioneer', 'beta_pioneer']);

const SHOP_SLUGS_PRIDE_2026 = new Set(['border-pride-month-2026', 'border_pride_month_2026']);

const SHOP_SLUGS_MOTHERS_DAY_2026 = new Set([
  'border-mothers-day-2026',
  'border_mothers_day_2026',
]);

const SHOP_SLUGS_JUNETEENTH_2026 = new Set([
  'border-juneteenth-2026-charity',
  'border_juneteenth_2026_charity',
]);

const SHOP_SLUGS_EMERALD_RENEWAL_MAY_2026 = new Set([
  'border-emerald-renewal-may-2026',
  'border_emerald_renewal_may_2026',
]);

/**
 * Bundled raster for Pulse Shop previews when the row has no remote image_url yet.
 */
export function shopItemBundledRasterPreview(
  item: ShopItemRow,
): { source: ImageSourcePropType; innerOpeningFrac: number } | null {
  if (item.type !== 'border') return null;
  const slug = String(item.slug ?? '').trim().toLowerCase();
  const slugNorm = slug.replace(/-/g, '_');
  if (SHOP_SLUGS_BETA_RASTER.has(slug) || SHOP_SLUGS_BETA_RASTER.has(slugNorm)) {
    return { source: BETA_TESTER_BORDER, innerOpeningFrac: RASTER_BETA_TESTER_INNER_OPENING_FRAC };
  }
  if (SHOP_SLUGS_PRIDE_2026.has(slug) || SHOP_SLUGS_PRIDE_2026.has(slugNorm)) {
    return { source: PRIDE_MONTH_2026_BORDER, innerOpeningFrac: RASTER_PRIDE_MONTH_2026_INNER_OPENING_FRAC };
  }
  if (SHOP_SLUGS_MOTHERS_DAY_2026.has(slug) || SHOP_SLUGS_MOTHERS_DAY_2026.has(slugNorm)) {
    return {
      source: MOTHERS_DAY_2026_BORDER,
      innerOpeningFrac: RASTER_MOTHERS_DAY_2026_INNER_OPENING_FRAC,
    };
  }
  if (SHOP_SLUGS_JUNETEENTH_2026.has(slug) || SHOP_SLUGS_JUNETEENTH_2026.has(slugNorm)) {
    return {
      source: JUNETEENTH_2026_BORDER,
      innerOpeningFrac: RASTER_JUNETEENTH_2026_INNER_OPENING_FRAC,
    };
  }
  if (SHOP_SLUGS_EMERALD_RENEWAL_MAY_2026.has(slug) || SHOP_SLUGS_EMERALD_RENEWAL_MAY_2026.has(slugNorm)) {
    return {
      source: EMERALD_RENEWAL_MAY_2026_BORDER,
      innerOpeningFrac: RASTER_EMERALD_RENEWAL_MAY_2026_INNER_OPENING_FRAC,
    };
  }
  const meta = item.metadata as { pulse_frame_slug?: string } | null | undefined;
  if (meta?.pulse_frame_slug === PULSE_BETA_FRAME_SLUG) {
    return { source: BETA_TESTER_BORDER, innerOpeningFrac: RASTER_BETA_TESTER_INNER_OPENING_FRAC };
  }
  if (meta?.pulse_frame_slug === PULSE_PRIDE_MONTH_2026_FRAME_SLUG) {
    return { source: PRIDE_MONTH_2026_BORDER, innerOpeningFrac: RASTER_PRIDE_MONTH_2026_INNER_OPENING_FRAC };
  }
  if (meta?.pulse_frame_slug === PULSE_MOTHERS_DAY_2026_FRAME_SLUG) {
    return {
      source: MOTHERS_DAY_2026_BORDER,
      innerOpeningFrac: RASTER_MOTHERS_DAY_2026_INNER_OPENING_FRAC,
    };
  }
  if (meta?.pulse_frame_slug === PULSE_JUNETEENTH_2026_FRAME_SLUG) {
    return {
      source: JUNETEENTH_2026_BORDER,
      innerOpeningFrac: RASTER_JUNETEENTH_2026_INNER_OPENING_FRAC,
    };
  }
  if (meta?.pulse_frame_slug === PULSE_EMERALD_RENEWAL_MAY_2026_FRAME_SLUG) {
    return {
      source: EMERALD_RENEWAL_MAY_2026_BORDER,
      innerOpeningFrac: RASTER_EMERALD_RENEWAL_MAY_2026_INNER_OPENING_FRAC,
    };
  }
  return null;
}

export function resolvePulseRingRaster(frame: {
  slug?: string | null;
  prizeTier?: PulseAvatarFrame['prizeTier'];
} | null | undefined): { source: ImageSourcePropType | null; innerOpeningFrac: number } {
  if (!frame) {
    return { source: null, innerOpeningFrac: RASTER_PODIUM_INNER_OPENING_FRAC };
  }
  if (frame.slug === PULSE_BETA_FRAME_SLUG) {
    return { source: BETA_TESTER_BORDER, innerOpeningFrac: RASTER_BETA_TESTER_INNER_OPENING_FRAC };
  }
  if (frame.slug === PULSE_PRIDE_MONTH_2026_FRAME_SLUG) {
    return { source: PRIDE_MONTH_2026_BORDER, innerOpeningFrac: RASTER_PRIDE_MONTH_2026_INNER_OPENING_FRAC };
  }
  if (frame.slug === PULSE_MOTHERS_DAY_2026_FRAME_SLUG) {
    return {
      source: MOTHERS_DAY_2026_BORDER,
      innerOpeningFrac: RASTER_MOTHERS_DAY_2026_INNER_OPENING_FRAC,
    };
  }
  if (frame.slug === PULSE_JUNETEENTH_2026_FRAME_SLUG) {
    return {
      source: JUNETEENTH_2026_BORDER,
      innerOpeningFrac: RASTER_JUNETEENTH_2026_INNER_OPENING_FRAC,
    };
  }
  if (frame.slug === PULSE_EMERALD_RENEWAL_MAY_2026_FRAME_SLUG) {
    return {
      source: EMERALD_RENEWAL_MAY_2026_BORDER,
      innerOpeningFrac: RASTER_EMERALD_RENEWAL_MAY_2026_INNER_OPENING_FRAC,
    };
  }
  return {
    source: podiumPulseRingSource(frame.prizeTier),
    innerOpeningFrac: RASTER_PODIUM_INNER_OPENING_FRAC,
  };
}

/** Equipped frame: procedural Emerald Renewal motion (EKG + sparkles). */
export function isEmeraldRenewalMay2026PulseFrameSlug(slug: string | null | undefined): boolean {
  return String(slug ?? '').trim().toLowerCase() === PULSE_EMERALD_RENEWAL_MAY_2026_FRAME_SLUG;
}

/** Pulse Shop row for Emerald Renewal flagship border. */
export function shopItemIsEmeraldRenewalMay2026(item: ShopItemRow | null | undefined): boolean {
  if (!item || item.type !== 'border') return false;
  const meta = item.metadata as { pulse_frame_slug?: string } | null | undefined;
  if (meta?.pulse_frame_slug === PULSE_EMERALD_RENEWAL_MAY_2026_FRAME_SLUG) return true;
  const s = String(item.slug ?? '').trim().toLowerCase();
  const n = s.replace(/-/g, '_');
  return SHOP_SLUGS_EMERALD_RENEWAL_MAY_2026.has(s) || SHOP_SLUGS_EMERALD_RENEWAL_MAY_2026.has(n);
}

/** Default podium rings (non–June 2026). */
const PODIUM_GOLD = require('../assets/images/pulse-rings/podium-gold.png') as ImageSourcePropType;
const PODIUM_SILVER = require('../assets/images/pulse-rings/podium-silver.png') as ImageSourcePropType;
const PODIUM_BRONZE = require('../assets/images/pulse-rings/podium-bronze.png') as ImageSourcePropType;

/** Summer Solstice Collection — June 2026 global monthly prizes (same gold / silver / bronze tiers). */
const SOLSTICE_GOLD =
  require('../assets/images/pulse-rings/summer-solstice-2026-gold.png') as ImageSourcePropType;
const SOLSTICE_SILVER =
  require('../assets/images/pulse-rings/summer-solstice-2026-silver.png') as ImageSourcePropType;
const SOLSTICE_BRONZE =
  require('../assets/images/pulse-rings/summer-solstice-2026-bronze.png') as ImageSourcePropType;

/**
 * When true, gold/silver/bronze `prizeTier` frames use the Summer Solstice raster set.
 * Uses the device-local calendar (June = month index 5).
 */
export function isSummerSolstice2026PulseCollectionActive(date: Date = new Date()): boolean {
  return date.getFullYear() === 2026 && date.getMonth() === 5;
}

/**
 * Raster ring overlay for global monthly top-5 tiers only.
 * Other `prizeTier` values keep the procedural neon ring from DB colors.
 */
export function podiumPulseRingSource(
  tier: PulseAvatarFrame['prizeTier'] | undefined,
  referenceDate: Date = new Date(),
): ImageSourcePropType | null {
  const solstice = isSummerSolstice2026PulseCollectionActive(referenceDate);
  if (tier === 'gold') return solstice ? SOLSTICE_GOLD : PODIUM_GOLD;
  if (tier === 'silver') return solstice ? SOLSTICE_SILVER : PODIUM_SILVER;
  if (tier === 'bronze') return solstice ? SOLSTICE_BRONZE : PODIUM_BRONZE;
  return null;
}
