/**
 * Distinct palettes per featured circle. Curated slugs use fixed schemes; unknown slugs
 * cycle **primary → secondary → neon** by carousel index so adjacent cards stay visually
 * distinct, then the sequence repeats once every hue in the combined rotation is used.
 */
import { colors } from '@/theme/colors';

export type FeaturedCardScheme = {
  /** Primary neon (shadow + rim) */
  glow: string;
  /** Card gradient stops (top → mid → base) */
  gradient: [string, string, string];
  /** Icon bubble gradient */
  bubble: [string, string, string];
  /** Slightly thicker border treatment */
  borderEmphasis: number;
  /** “Online” count tint */
  onlineAccent: string;
};

function parseHex(hex: string): { r: number; g: number; b: number } {
  const h = hex.trim().replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return { r: 20, g: 184, b: 166 };
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function clamp255(n: number): number {
  return Math.max(0, Math.min(255, n));
}

function mixTowardsWhite(r: number, g: number, b: number, t: number) {
  return {
    r: clamp255(Math.round(r + (255 - r) * t)),
    g: clamp255(Math.round(g + (255 - g) * t)),
    b: clamp255(Math.round(b + (255 - b) * t)),
  };
}

/** Anchor hues → glass gradients (matches hand-tuned SLUG_SCHEMES weighting). */
function featuredPalette(glow: string, gradientMid: string, onlineAccent: string): FeaturedCardScheme {
  const { r, g, b } = parseHex(glow);
  const { r: r2, g: g2, b: b2 } = parseHex(gradientMid);
  const bub = mixTowardsWhite(r, g, b, 0.42);
  return {
    glow,
    gradient: [`rgba(${r},${g},${b},0.28)`, `rgba(${r2},${g2},${b2},0.2)`, colors.dark.bg],
    bubble: [`rgba(${bub.r},${bub.g},${bub.b},0.55)`, `rgba(${r2},${g2},${b2},0.4)`, 'rgba(15,28,48,0.5)'],
    borderEmphasis: 1.75,
    onlineAccent,
  };
}

/** Pulse `colors.primary` family — royal, teal, gold, lifted navy, emerald. */
const PRIMARY_ROTATION: FeaturedCardScheme[] = [
  featuredPalette(colors.primary.royal, '#1E40AF', '#93C5FD'),
  featuredPalette(colors.primary.teal, '#0F766E', '#5EEAD4'),
  featuredPalette(colors.primary.gold, '#B45309', '#FCD34D'),
  featuredPalette('#273F72', colors.primary.navy, '#93C5FD'),
  featuredPalette('#059669', '#047857', '#6EE7B7'),
];

/** Supporting hues — warm/cool balance without overlapping the primary set. */
const SECONDARY_ROTATION: FeaturedCardScheme[] = [
  featuredPalette('#F59E0B', '#B45309', '#FCD34D'),
  featuredPalette('#8B5CF6', '#6D28D9', '#C4B5FD'),
  featuredPalette('#EC4899', '#BE185D', '#F9A8D4'),
  featuredPalette('#64748B', '#475569', '#CBD5E1'),
  featuredPalette('#EA580C', '#C2410C', '#FDBA74'),
  featuredPalette('#06B6D4', '#0E7490', '#67E8F9'),
];

/** High-energy rims for the tail of the rotation. */
const NEON_ROTATION: FeaturedCardScheme[] = [
  featuredPalette('#22D3EE', '#155E75', '#A5F3FC'),
  featuredPalette('#F472B6', '#BE185D', '#FBCFE8'),
  featuredPalette('#C084FC', '#7E22CE', '#E9D5FF'),
  featuredPalette('#FACC15', '#A16207', '#FEF08A'),
  featuredPalette('#4ADE80', '#166534', '#BBF7D0'),
  featuredPalette('#FB923C', '#C2410C', '#FED7AA'),
  featuredPalette('#E879F9', '#A21CAF', '#F5D0FE'),
  featuredPalette('#2DD4BF', '#0F766E', '#99F6E4'),
];

const LIST_FALLBACK_ROTATION: FeaturedCardScheme[] = [
  ...PRIMARY_ROTATION,
  ...SECONDARY_ROTATION,
  ...NEON_ROTATION,
];

const SLUG_SCHEMES: Record<string, FeaturedCardScheme> = {
  /* Metallic flex-room — cool slate/silver (distinct from warm meme coral). */
  'border-envy': {
    glow: '#94A3B8',
    gradient: ['rgba(148,163,184,0.26)', 'rgba(71,85,105,0.18)', colors.dark.bg],
    bubble: ['rgba(226,232,240,0.45)', 'rgba(100,116,139,0.38)', 'rgba(15,28,48,0.55)'],
    borderEmphasis: 2,
    onlineAccent: '#E2E8F0',
  },
  /* Memes — coral/rose warmth (not gold — avoids Border Envy overlap). */
  memes: {
    glow: '#FB7185',
    gradient: ['rgba(251,113,133,0.3)', 'rgba(190,24,93,0.16)', colors.dark.bg],
    bubble: ['rgba(253,164,175,0.62)', 'rgba(225,29,72,0.35)', 'rgba(15,28,48,0.52)'],
    borderEmphasis: 2,
    onlineAccent: '#FECDD3',
  },
  'bug-reports': {
    glow: '#F59E0B',
    gradient: ['rgba(245,158,11,0.28)', 'rgba(180,83,9,0.18)', colors.dark.bg],
    bubble: ['rgba(252,211,77,0.55)', 'rgba(217,119,6,0.4)', 'rgba(15,28,48,0.5)'],
    borderEmphasis: 1.75,
    onlineAccent: '#FCD34D',
  },
  confessions: {
    glow: '#C026D3',
    gradient: ['rgba(192,38,211,0.28)', 'rgba(88,28,135,0.24)', colors.dark.bg],
    bubble: ['rgba(232,121,249,0.58)', 'rgba(147,51,234,0.42)', 'rgba(15,28,48,0.48)'],
    borderEmphasis: 2,
    onlineAccent: '#E879F9',
  },
  /* Broad nursing room — royal blue (matches circle banner identity; not red). */
  nurses: {
    glow: '#2563EB',
    gradient: ['rgba(37,99,235,0.3)', 'rgba(30,58,138,0.22)', colors.dark.bg],
    bubble: ['rgba(147,197,253,0.55)', 'rgba(29,78,216,0.42)', 'rgba(15,28,48,0.52)'],
    borderEmphasis: 1.75,
    onlineAccent: '#93C5FD',
  },
  /* Student lane — cyan/teal (distinct from royal Nurses blue). */
  'student-nurses': {
    glow: '#0891B2',
    gradient: ['rgba(8,145,178,0.32)', 'rgba(21,94,117,0.2)', colors.dark.bg],
    bubble: ['rgba(34,211,238,0.52)', 'rgba(14,116,144,0.4)', 'rgba(15,28,48,0.52)'],
    borderEmphasis: 1.75,
    onlineAccent: '#67E8F9',
  },
  'pct-cna': {
    glow: '#EA580C',
    gradient: ['rgba(234,88,12,0.3)', 'rgba(194,65,12,0.16)', colors.dark.bg],
    bubble: ['rgba(251,146,60,0.62)', 'rgba(234,88,12,0.38)', 'rgba(15,28,48,0.48)'],
    borderEmphasis: 1.75,
    onlineAccent: '#FDBA74',
  },
  doctors: {
    glow: '#6366F1',
    gradient: ['rgba(99,102,241,0.28)', 'rgba(55,48,163,0.32)', colors.dark.bg],
    bubble: ['rgba(129,140,248,0.55)', 'rgba(67,56,202,0.45)', 'rgba(15,28,48,0.52)'],
    borderEmphasis: 1.75,
    onlineAccent: '#A5B4FC',
  },
  'simple-medical-questions': {
    glow: '#14B8A6',
    gradient: ['rgba(13,148,136,0.3)', 'rgba(15,118,110,0.22)', colors.dark.bg],
    bubble: ['rgba(45,212,191,0.55)', 'rgba(13,148,136,0.42)', 'rgba(15,28,48,0.5)'],
    borderEmphasis: 1.75,
    onlineAccent: '#5EEAD4',
  },
  pharmacists: {
    glow: '#84CC16',
    gradient: ['rgba(132,204,22,0.26)', 'rgba(77,124,15,0.16)', colors.dark.bg],
    bubble: ['rgba(190,242,100,0.55)', 'rgba(101,163,13,0.38)', 'rgba(15,28,48,0.5)'],
    borderEmphasis: 1.75,
    onlineAccent: '#BEF264',
  },
  therapy: {
    glow: '#A855F7',
    gradient: ['rgba(168,85,247,0.28)', 'rgba(91,33,182,0.22)', colors.dark.bg],
    bubble: ['rgba(192,132,252,0.58)', 'rgba(124,58,237,0.4)', 'rgba(15,28,48,0.48)'],
    borderEmphasis: 1.75,
    onlineAccent: '#D8B4FE',
  },
  /* Gaming — electric violet (not red; avoids clash with meme coral / pct orange). */
  gaming: {
    glow: '#8B5CF6',
    gradient: ['rgba(139,92,246,0.3)', 'rgba(76,29,149,0.22)', colors.dark.bg],
    bubble: ['rgba(196,181,253,0.58)', 'rgba(124,58,237,0.42)', 'rgba(15,28,48,0.52)'],
    borderEmphasis: 1.75,
    onlineAccent: '#DDD6FE',
  },
};

export function featuredCardSchemeForSlug(
  slug: string,
  _accent: string,
  /** Carousel index: cycles primary → secondary → neon palettes, then repeats. */
  listIndex = 0,
): FeaturedCardScheme {
  const key = slug.trim().toLowerCase();
  const base = SLUG_SCHEMES[key];
  if (base) return base;
  const n = LIST_FALLBACK_ROTATION.length;
  if (n === 0) {
    return PRIMARY_ROTATION[0]!;
  }
  const idx = ((listIndex % n) + n) % n;
  return LIST_FALLBACK_ROTATION[idx]!;
}
