import type { ImageSourcePropType } from 'react-native';

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

const BETA_TESTER_BORDER =
  require('../assets/images/pulse-rings/beta-tester-border.png') as ImageSourcePropType;

/** Inner hole fraction for the beta border PNG (tune if face clips). */
export const RASTER_BETA_TESTER_INNER_OPENING_FRAC = 0.48;

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
  return {
    source: podiumPulseRingSource(frame.prizeTier),
    innerOpeningFrac: RASTER_PODIUM_INNER_OPENING_FRAC,
  };
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
