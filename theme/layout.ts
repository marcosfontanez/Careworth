import { Platform } from 'react-native';
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

/**
 * `ScrollView` / `FlatList` `contentContainerStyle.paddingBottom` for screens inside the root tab bar.
 * Combines safe-area inset with an approximate tab bar height so the last item clears the bar.
 */
export function tabBarScrollPaddingBottom(safeAreaBottom: number): number {
  const tabBarBody = Platform.OS === 'ios' ? 86 : Platform.OS === 'android' ? 70 : 0;
  const gap = spacing.lg;
  return Math.max(120, safeAreaBottom + tabBarBody + gap);
}
