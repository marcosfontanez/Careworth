/**
 * Per-circle visual identity. The Circles brief calls for each room to feel
 * like its own themed space (Memes = warm/playful, ICU = sharper/cool,
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
  /* Bug reports — warm amber; matches DB seed #D97706. */
  'bug-reports': {
    color: '#D97706',
    colorAlt: '#B45309',
    gradient: ['#D97706', '#B45309', '#451A0330'] as const,
    vibe: 'focused',
    composerPrompt:
      'What broke? Share a screenshot if you can, or describe the crash — what you tapped, what you expected, device (iPhone / Android / web).',
    etiquette: 'Be specific. No shaming — we’re here to squash bugs.',
    description:
      'Report glitches and crashes: screenshots plus steps to reproduce help us fix things faster.',
    motif: ['⚙', '·', '✓', '·'] as const,
  },

  /* Border Envy — cool platinum/silver glass (featured carousel uses same identity). */
  'border-envy': {
    color: '#94A3B8',
    colorAlt: '#64748B',
    gradient: ['#CBD5E1', '#64748B', '#1E293B70'] as const,
    vibe: 'playful',
    composerPrompt:
      'Got a fire border equipped? Post a screenshot of your profile (with your border visible) and tell us where it came from — monthly top 5, beta gift, campaign, or classic ring.',
    etiquette: 'Celebrate the glow-up. No shaming someone else’s frame — this room is hype, not hierarchy.',
    description:
      'Show off your Pulse profile snapshot with the avatar border you’re wearing — rare unlocks, seasonal prizes, or clean classics.',
    motif: ['◇', '✦', '◇', '·'] as const,
  },

  /* Memes — coral/rose (distinct from Border Envy silver). */
  'funny-medical-memes': {
    color: '#FB7185',
    colorAlt: '#BE185D',
    gradient: ['#FB7185', '#9D174D', '#1F0A0570'] as const,
    vibe: 'playful',
    composerPrompt: 'What’s worth sharing today?',
    etiquette: 'Keep it funny. Keep it kind.',
    description: 'Healthcare humor, memes, reactions, and light-hearted shift culture.',
    motif: ['+', '✦', '+', '·'] as const,
  },
  /* Legacy / shorter slugs that point at the same room. */
  'memes': {
    color: '#FB7185',
    colorAlt: '#BE185D',
    gradient: ['#FB7185', '#9D174D', '#1F0A0570'] as const,
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

  /* Nurses — royal blue aligned with featured carousel (`featuredCircleSchemes`). */
  'nurses': {
    color: '#2563EB',
    colorAlt: '#1E40AF',
    gradient: ['#2563EB', '#1E3A8A', '#0B1F4E70'] as const,
    vibe: 'welcoming',
    composerPrompt: 'What’s worth sharing today?',
    etiquette: 'We’re all in scrubs. Lift each other up.',
  },

  /* Student Nurses — cyan sky (distinct from royal Nurses blue). */
  'student-nurses': {
    color: '#0891B2',
    colorAlt: '#0E7490',
    gradient: ['#0891B2', '#0E7490', '#164E6370'] as const,
    vibe: 'welcoming',
    composerPrompt: 'What are you learning this week?',
    etiquette: 'We were all new once. Be encouraging.',
  },

  /* Simple Medical Questions — clinical teal; matches DB seed #0D9488. */
  'simple-medical-questions': {
    color: '#0D9488',
    colorAlt: '#0F766E',
    gradient: ['#0D9488', '#0F766E', '#134E4A70'] as const,
    vibe: 'clinical',
    composerPrompt: 'What simple question can peers help clarify?',
    etiquette:
      'Not a substitute for in-person care or your own clinician. No PHI—keep it general. Share experience, not directives.',
    description:
      'Quick, general questions for healthcare peers—not medical advice and not a replacement for seeing a professional.',
    motif: ['?', '·', '💬', '·'] as const,
  },

  /* Gaming — electric violet (featured cards use same hue). */
  'gaming': {
    color: '#8B5CF6',
    colorAlt: '#5B21B6',
    gradient: ['#8B5CF6', '#5B21B6', '#2E106570'] as const,
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
 *  1. If the slug has a **curated** entry in {@link ACCENT_TABLE}, always use that
 *     palette (banner gradient, chips, copy). This keeps Circles landing cards and
 *     the room interior visually aligned regardless of stale `communities.accent_color`
 *     in the database.
 *  2. If there is no curated entry, derive tokens from `accent_color` when present.
 *  3. Otherwise fall back to {@link DEFAULTS}.
 */
export function getCircleAccent(slug?: string | null, fallbackColor?: string | null): CircleAccent {
  const dbHex = (() => {
    if (!fallbackColor || !/^#?[0-9a-f]{3,8}$/i.test(fallbackColor)) return null;
    return fallbackColor.startsWith('#') ? fallbackColor : `#${fallbackColor}`;
  })();

  const curated = slug ? ACCENT_TABLE[slug.toLowerCase()] : undefined;

  if (curated) {
    return curated;
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
