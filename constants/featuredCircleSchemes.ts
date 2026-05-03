/**
 * Distinct palettes per featured circle — hues spread around the wheel (warm → cool)
 * so cards don’t cluster in teal / blue / emerald.
 */

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

function hashSlug(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i += 1) h = (Math.imul(31, h) + slug.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const SLUG_SCHEMES: Record<string, FeaturedCardScheme> = {
  'border-envy': {
    glow: '#EAB308',
    gradient: ['rgba(234,179,8,0.34)', 'rgba(202,138,4,0.22)', '#0F1C30'],
    bubble: ['rgba(253,224,71,0.58)', 'rgba(217,119,6,0.45)', 'rgba(15,28,48,0.5)'],
    borderEmphasis: 2,
    onlineAccent: '#FDE047',
  },
  memes: {
    glow: '#F59E0B',
    gradient: ['rgba(245,158,11,0.32)', 'rgba(249,115,22,0.18)', '#0F1C30'],
    bubble: ['rgba(251,191,36,0.7)', 'rgba(234,88,12,0.38)', 'rgba(15,28,48,0.5)'],
    borderEmphasis: 2,
    onlineAccent: '#FBBF24',
  },
  confessions: {
    glow: '#C026D3',
    gradient: ['rgba(192,38,211,0.28)', 'rgba(88,28,135,0.24)', '#0F1C30'],
    bubble: ['rgba(232,121,249,0.58)', 'rgba(147,51,234,0.42)', 'rgba(15,28,48,0.48)'],
    borderEmphasis: 2,
    onlineAccent: '#E879F9',
  },
  nurses: {
    glow: '#F43F5E',
    gradient: ['rgba(244,63,94,0.3)', 'rgba(159,18,57,0.2)', '#0F1C30'],
    bubble: ['rgba(251,113,133,0.62)', 'rgba(225,29,72,0.4)', 'rgba(15,28,48,0.5)'],
    borderEmphasis: 1.75,
    onlineAccent: '#FDA4AF',
  },
  'student-nurses': {
    glow: '#0284C7',
    gradient: ['rgba(2,132,199,0.32)', 'rgba(12,74,110,0.22)', '#0F1C30'],
    bubble: ['rgba(56,189,248,0.58)', 'rgba(3,105,161,0.42)', 'rgba(15,28,48,0.5)'],
    borderEmphasis: 1.75,
    onlineAccent: '#38BDF8',
  },
  'pct-cna': {
    glow: '#EA580C',
    gradient: ['rgba(234,88,12,0.3)', 'rgba(194,65,12,0.16)', '#0F1C30'],
    bubble: ['rgba(251,146,60,0.62)', 'rgba(234,88,12,0.38)', 'rgba(15,28,48,0.48)'],
    borderEmphasis: 1.75,
    onlineAccent: '#FDBA74',
  },
  doctors: {
    glow: '#6366F1',
    gradient: ['rgba(99,102,241,0.28)', 'rgba(55,48,163,0.32)', '#0F1C30'],
    bubble: ['rgba(129,140,248,0.55)', 'rgba(67,56,202,0.45)', 'rgba(15,28,48,0.52)'],
    borderEmphasis: 1.75,
    onlineAccent: '#A5B4FC',
  },
  'simple-medical-questions': {
    glow: '#14B8A6',
    gradient: ['rgba(13,148,136,0.3)', 'rgba(15,118,110,0.22)', '#0F1C30'],
    bubble: ['rgba(45,212,191,0.55)', 'rgba(13,148,136,0.42)', 'rgba(15,28,48,0.5)'],
    borderEmphasis: 1.75,
    onlineAccent: '#5EEAD4',
  },
  pharmacists: {
    glow: '#84CC16',
    gradient: ['rgba(132,204,22,0.26)', 'rgba(77,124,15,0.16)', '#0F1C30'],
    bubble: ['rgba(190,242,100,0.55)', 'rgba(101,163,13,0.38)', 'rgba(15,28,48,0.5)'],
    borderEmphasis: 1.75,
    onlineAccent: '#BEF264',
  },
  therapy: {
    glow: '#A855F7',
    gradient: ['rgba(168,85,247,0.28)', 'rgba(91,33,182,0.22)', '#0F1C30'],
    bubble: ['rgba(192,132,252,0.58)', 'rgba(124,58,237,0.4)', 'rgba(15,28,48,0.48)'],
    borderEmphasis: 1.75,
    onlineAccent: '#D8B4FE',
  },
  gaming: {
    glow: '#DC2626',
    gradient: ['rgba(220,38,38,0.3)', 'rgba(127,29,29,0.22)', '#0F1C30'],
    bubble: ['rgba(248,113,113,0.58)', 'rgba(185,28,28,0.42)', 'rgba(15,28,48,0.5)'],
    borderEmphasis: 1.75,
    onlineAccent: '#FCA5A5',
  },
};

/** Unknown slugs: deterministic hue rotation (no DB accent override — avoids “all teal” cards). */
const FALLBACK_ROTATION: FeaturedCardScheme[] = [
  {
    glow: '#EF4444',
    gradient: ['rgba(239,68,68,0.28)', 'rgba(153,27,27,0.2)', '#0F1C30'],
    bubble: ['rgba(252,165,165,0.55)', 'rgba(220,38,38,0.4)', 'rgba(15,28,48,0.5)'],
    borderEmphasis: 1.75,
    onlineAccent: '#FCA5A5',
  },
  {
    glow: '#F97316',
    gradient: ['rgba(249,115,22,0.28)', 'rgba(194,65,12,0.16)', '#0F1C30'],
    bubble: ['rgba(253,186,116,0.55)', 'rgba(234,88,12,0.35)', 'rgba(15,28,48,0.5)'],
    borderEmphasis: 1.75,
    onlineAccent: '#FDBA74',
  },
  {
    glow: '#EAB308',
    gradient: ['rgba(234,179,8,0.26)', 'rgba(161,98,7,0.14)', '#0F1C30'],
    bubble: ['rgba(253,224,71,0.5)', 'rgba(202,138,4,0.32)', 'rgba(15,28,48,0.5)'],
    borderEmphasis: 1.75,
    onlineAccent: '#FDE047',
  },
  {
    glow: '#14B8A6',
    gradient: ['rgba(20,184,166,0.26)', 'rgba(15,118,110,0.18)', '#0F1C30'],
    bubble: ['rgba(45,212,191,0.5)', 'rgba(13,148,136,0.38)', 'rgba(15,28,48,0.5)'],
    borderEmphasis: 1.75,
    onlineAccent: '#5EEAD4',
  },
  {
    glow: '#3B82F6',
    gradient: ['rgba(59,130,246,0.26)', 'rgba(30,64,175,0.22)', '#0F1C30'],
    bubble: ['rgba(147,197,253,0.52)', 'rgba(37,99,235,0.4)', 'rgba(15,28,48,0.52)'],
    borderEmphasis: 1.75,
    onlineAccent: '#93C5FD',
  },
  {
    glow: '#EC4899',
    gradient: ['rgba(236,72,153,0.24)', 'rgba(157,23,77,0.18)', '#0F1C30'],
    bubble: ['rgba(244,114,182,0.52)', 'rgba(219,39,119,0.36)', 'rgba(15,28,48,0.5)'],
    borderEmphasis: 1.75,
    onlineAccent: '#F9A8D4',
  },
];

export function featuredCardSchemeForSlug(slug: string, _accent: string): FeaturedCardScheme {
  const key = slug.trim().toLowerCase();
  const base = SLUG_SCHEMES[key];
  if (base) return base;
  return FALLBACK_ROTATION[hashSlug(key) % FALLBACK_ROTATION.length];
}
