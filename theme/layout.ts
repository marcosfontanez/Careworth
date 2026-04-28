import { spacing } from './spacing';

/** Common horizontal gutters — prefer over magic 16/18/20 */
export const layout = {
  screenPadding: spacing.lg,
  /** My Pulse main content band (historically ~18px) */
  screenPaddingWide: spacing.lg + 2,
  sectionGap: spacing.md,
  cardPadding: spacing.md,
} as const;
