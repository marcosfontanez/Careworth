/**
 * PulseVerse design tokens — semantic layer on top of `colors` + `pulseverse`.
 *
 * Global rules (product voice):
 * - Premium dark base; hierarchy and spacing do the work, not decoration.
 * - One primary chromatic accent family (cyan / electric) for chrome + links.
 * - Teal remains the brand CTA / success-adjacent fill; royal blue = secondary accent.
 * - Gold is reserved for IAP / “store” context — do not sprinkle elsewhere.
 * - Glow: use `shadows.*` presets; avoid stacking colored glows on one surface.
 *
 * Prefer importing `semantic`, `rarity`, `gradients`, `motion` from `@/theme`.
 */
import { colors } from './colors';
import { pulseverse } from './pulseverseUi';

/** Screen backgrounds, surfaces, text, and semantic accents */
export const semantic = {
  background: colors.dark.bg,
  surface: colors.dark.card,
  surfaceElevated: colors.dark.cardAlt,
  surfaceSecondary: colors.dark.elevated,
  card: colors.dark.card,
  modalScrim: 'rgba(2,6,23,0.72)',
  sheetBackground: '#070F1C',
  border: colors.dark.border,
  borderSubtle: colors.dark.borderSubtle,
  borderInner: colors.dark.borderInner,
  divider: pulseverse.divider,
  textPrimary: colors.dark.text,
  textSecondary: colors.dark.textSecondary,
  textMuted: colors.dark.textMuted,
  textQuiet: colors.dark.textQuiet,
  accentBlue: colors.status.accent,
  accentCyan: pulseverse.electric,
  accentCyanSoft: pulseverse.electricSoft,
  accentCyanMuted: pulseverse.electricMuted,
  accentTeal: colors.primary.teal,
  premiumGold: pulseverse.storeAccent,
  premiumGoldSoft: pulseverse.storeAccentSoft,
  onAccentDark: pulseverse.onElectric,
  success: colors.status.success,
  warning: colors.status.warning,
  danger: colors.status.error,
  invite: colors.status.invite,
} as const;

/**
 * Rarity palette for badges / catalog (single source; `borderBadgeTheme` consumes this).
 * Strongest visual weight: mythic → common.
 */
export const rarity = {
  common: {
    text: '#CBD5E1',
    border: 'rgba(148,163,184,0.45)',
    background: 'rgba(51,65,85,0.35)',
  },
  rare: {
    text: '#7DD3FC',
    border: 'rgba(56,189,248,0.5)',
    background: 'rgba(56,189,248,0.1)',
  },
  epic: {
    text: '#E9D5FF',
    border: 'rgba(168,85,247,0.55)',
    background: 'rgba(168,85,247,0.12)',
  },
  legendary: {
    text: '#FDE68A',
    border: 'rgba(212,166,58,0.55)',
    background: 'rgba(212,166,58,0.14)',
  },
  mythic: {
    text: '#FDE68A',
    border: 'rgba(250,204,21,0.5)',
    background: 'rgba(15,23,42,0.85)',
    gradientRing: ['#F59E0B', pulseverse.electric, '#A78BFA', '#F59E0B'] as const,
  },
} as const;
