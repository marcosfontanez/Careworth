/**
 * Per-circle visual identity. The Circles brief calls for each room to feel
 * like its own themed space (Funny Memes = warm/playful, ICU = sharper/cool,
 * Night Shift = darker/neon, Pharmacy = clinical, Nursing = welcoming).
 *
 * Centralizing this lets every Circle UI surface (room header, highlights,
 * post cards, create flow) read the same identity from a single source. A
 * default is returned for slugs that don't have a hand-tuned identity yet,
 * so the rest of the app stays safe.
 */

export type CircleVibe = 'playful' | 'focused' | 'neon' | 'clinical' | 'welcoming' | 'reflective';

export interface CircleAccent {
  /** Primary accent hex (used for chips, icons, joins). */
  color: string;
  /** Secondary tone for gradients (slightly desaturated/darker partner). */
  colorAlt: string;
  /** Three-stop gradient stops used by the room banner. */
  gradient: readonly [string, string, string];
  /** Tone of voice — drives copy variants in composer / etiquette. */
  vibe: CircleVibe;
  /** Composer prompt placeholder (shown above the post feed). */
  composerPrompt: string;
  /** Short etiquette line shown in the create-post footer. */
  etiquette: string;
  /**
   * Optional curated description override. When present, takes precedence
   * over `community.description` so brief-spec copy ("Healthcare humor,
   * memes, reactions, and light-hearted shift culture.") wins the banner.
   */
  description?: string;
  /** Soft glyph(s) for the decorative motif row in the banner. */
  motif?: readonly string[];
}

const DEFAULTS: CircleAccent = {
  color: '#14B8A6',           // teal
  colorAlt: '#0E8C82',
  gradient: ['#14B8A6', '#0E8C82', '#0E8C8230'] as const,
  vibe: 'welcoming',
  composerPrompt: 'What’s worth sharing today?',
  etiquette: 'Be kind. Stay on topic. Lift each other up.',
};

/**
 * Hand-tuned identities for the rooms that have explicit visual direction.
 * Keys are lower-cased Circle slugs. Add new entries as rooms get curated.
 */
const ACCENT_TABLE: Record<string, CircleAccent> = {
  /* Funny Medical Memes — warm amber/orange/gold (matches mockup). */
  'funny-medical-memes': {
    color: '#F97316',
    colorAlt: '#7C2D12',
    gradient: ['#F97316', '#9A3412', '#1F0A0570'] as const,
    vibe: 'playful',
    composerPrompt: 'What’s worth sharing today?',
    etiquette: 'Keep it funny. Keep it kind.',
    description: 'Healthcare humor, memes, reactions, and light-hearted shift culture.',
    motif: ['+', '✦', '+', '·'] as const,
  },
  /* Legacy / shorter slugs that point at the same room. */
  'memes': {
    color: '#F97316',
    colorAlt: '#7C2D12',
    gradient: ['#F97316', '#9A3412', '#1F0A0570'] as const,
    vibe: 'playful',
    composerPrompt: 'What’s worth sharing today?',
    etiquette: 'Keep it funny. Keep it kind.',
    description: 'Healthcare humor, memes, reactions, and light-hearted shift culture.',
    motif: ['+', '✦', '+', '·'] as const,
  },

  /* ICU — sharper, cooler, focused. */
  'icu': {
    color: '#06B6D4',
    colorAlt: '#0E7490',
    gradient: ['#06B6D4', '#0E7490', '#082F4930'] as const,
    vibe: 'focused',
    composerPrompt: 'Share a case, a save, or a hard moment.',
    etiquette: 'Protect HIPAA. No identifiers. Be precise.',
  },

  /* Night Shift — darker, moodier, neon. */
  'night-shift': {
    color: '#A78BFA',
    colorAlt: '#6D28D9',
    gradient: ['#A78BFA', '#6D28D9', '#1E1B4B30'] as const,
    vibe: 'neon',
    composerPrompt: 'How is your shift going?',
    etiquette: 'Vent freely. Watch each other’s six.',
  },

  /* Pharmacy — precise, clean, slightly clinical. */
  'pharmacy': {
    color: '#10B981',
    colorAlt: '#047857',
    gradient: ['#10B981', '#047857', '#064E3B30'] as const,
    vibe: 'clinical',
    composerPrompt: 'Share a tip, a question, or a workflow.',
    etiquette: 'Cite sources where you can. No PHI.',
  },

  /* Nursing — broad, welcoming, energetic. */
  'nursing': {
    color: '#14B8A6',
    colorAlt: '#0F766E',
    gradient: ['#14B8A6', '#0F766E', '#134E4A30'] as const,
    vibe: 'welcoming',
    composerPrompt: 'What’s worth sharing today?',
    etiquette: 'We’re all in scrubs. Lift each other up.',
  },

  /* Nurses — DB-stored slug. Royal blue from the seed (`#1E4ED8`) so the
   *  landing card and the room banner read as the same room. */
  'nurses': {
    color: '#1E4ED8',
    colorAlt: '#1E3A8A',
    gradient: ['#1E4ED8', '#1E3A8A', '#0B1F4E70'] as const,
    vibe: 'welcoming',
    composerPrompt: 'What’s worth sharing today?',
    etiquette: 'We’re all in scrubs. Lift each other up.',
  },

  /* Student Nurses — sky blue (distinct from royal Nurses, teal PCT, ICU cyan). */
  'student-nurses': {
    color: '#0369A1',
    colorAlt: '#0C4A6E',
    gradient: ['#0369A1', '#0C4A6E', '#082F4970'] as const,
    vibe: 'welcoming',
    composerPrompt: 'What are you learning this week?',
    etiquette: 'We were all new once. Be encouraging.',
  },

  /* Gaming — deep red (distinct from meme orange / nurse card rose). */
  'gaming': {
    color: '#B91C1C',
    colorAlt: '#7F1D1D',
    gradient: ['#B91C1C', '#7F1D1D', '#450A0A70'] as const,
    vibe: 'playful',
    composerPrompt: 'What are you playing — or looking for teammates?',
    etiquette: 'Respect differences in platforms, skill, and spare time.',
  },

  /* Confessions — reflective, anonymous-friendly. Color matches DB seed
   *  `#6B21A8` so the room banner reads as the same identity as the
   *  landing card. */
  'confessions': {
    color: '#6B21A8',
    colorAlt: '#4C1D95',
    gradient: ['#6B21A8', '#4C1D95', '#1E0B4530'] as const,
    vibe: 'reflective',
    composerPrompt: 'Speak your mind. You’re anonymous here.',
    etiquette: 'No names. No identifiers. Hold space, not judgment.',
  },
};

/**
 * Resolve a circle's accent identity. Strategy:
 *
 *  1. If the slug has a curated entry whose `color` matches the DB color,
 *     use the curated entry verbatim — the gradient was hand-tuned for
 *     that hue.
 *  2. If the slug has a curated entry but the DB color *disagrees*, keep
 *     the curated copy/motif/vibe but rebuild color tokens from the DB
 *     color so the room banner matches the landing card.
 *  3. If the slug has no curated entry, derive everything from the DB
 *     color (or fall back to the teal default if no color is supplied).
 *
 * This guarantees the landing-card hue and the room banner hue stay in
 * lockstep without losing the curated copy/motif for rooms that have it.
 */
export function getCircleAccent(slug?: string | null, fallbackColor?: string | null): CircleAccent {
  const dbHex = (() => {
    if (!fallbackColor || !/^#?[0-9a-f]{3,8}$/i.test(fallbackColor)) return null;
    return fallbackColor.startsWith('#') ? fallbackColor : `#${fallbackColor}`;
  })();

  const curated = slug ? ACCENT_TABLE[slug.toLowerCase()] : undefined;

  if (curated) {
    /* DB color absent OR matches curated → trust the curated identity. */
    if (!dbHex || dbHex.toLowerCase() === curated.color.toLowerCase()) {
      return curated;
    }
    /* DB color overrides — keep curated copy/motif/vibe but recolor. */
    return {
      ...curated,
      color: dbHex,
      colorAlt: dbHex,
      gradient: [dbHex, `${dbHex}AA`, `${dbHex}30`] as const,
    };
  }

  if (dbHex) {
    return {
      ...DEFAULTS,
      color: dbHex,
      colorAlt: dbHex,
      gradient: [dbHex, `${dbHex}AA`, `${dbHex}30`] as const,
    };
  }

  return DEFAULTS;
}
