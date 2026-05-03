/**
 * Color helpers used by the photo composer. Without on-device pixel reading,
 * we generate a deterministic family-tint per slide URI from a curated
 * palette. Toggle "auto color match" on the carousel and every slide gets a
 * tint pulled from the same family so the carousel feels intentional.
 */

const PALETTES: Record<string, string[]> = {
  warm:   ['rgba(255,165,80,0.16)',  'rgba(255,120,90,0.14)',  'rgba(245,158,11,0.16)'],
  cool:   ['rgba(80,160,255,0.16)',  'rgba(56,189,248,0.14)',  'rgba(99,102,241,0.16)'],
  earth:  ['rgba(193,154,107,0.18)', 'rgba(180,140,100,0.16)', 'rgba(214,175,128,0.14)'],
  noir:   ['rgba(15,23,42,0.20)',    'rgba(30,30,40,0.18)',    'rgba(8,8,12,0.20)'],
  pastel: ['rgba(244,114,182,0.14)', 'rgba(167,139,250,0.14)', 'rgba(96,165,250,0.14)'],
  brand:  ['rgba(20,184,166,0.16)',  'rgba(168,85,247,0.16)',  'rgba(14,165,233,0.16)'],
};

export type PaletteKey = keyof typeof PALETTES;

export const PALETTE_KEYS: PaletteKey[] = ['brand', 'warm', 'cool', 'earth', 'pastel', 'noir'];

export function paletteLabel(key: PaletteKey): string {
  switch (key) {
    case 'brand':  return 'Brand';
    case 'warm':   return 'Warm';
    case 'cool':   return 'Cool';
    case 'earth':  return 'Earth';
    case 'pastel': return 'Pastel';
    case 'noir':   return 'Noir';
    default:
      return key;
  }
}

/** Stable per-URI tint within the chosen family. */
export function tintForUri(uri: string, palette: PaletteKey): string {
  const family = PALETTES[palette] ?? PALETTES.brand!;
  let h = 0;
  for (let i = 0; i < uri.length; i += 1) h = (h * 31 + uri.charCodeAt(i)) | 0;
  const idx = Math.abs(h) % family.length;
  return family[idx]!;
}

export function paletteSwatches(palette: PaletteKey): string[] {
  return PALETTES[palette] ?? PALETTES.brand!;
}
