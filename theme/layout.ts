import { spacing } from './spacing';

/** Common horizontal gutters — prefer over magic 16/18/20 */
export const layout = {
  screenPadding: spacing.lg,
  /** My Pulse main content band (historically ~18px) */
  screenPaddingWide: spacing.lg + 2,
  /** Space between labeled sections inside a scroll (headers, cards groups). */
  sectionGap: spacing.lg,
  /** Breathing room between major vertical blocks (hub cards → leaderboard). */
  sectionGapLarge: spacing['2xl'],
  cardPadding: spacing.md,
} as const;
