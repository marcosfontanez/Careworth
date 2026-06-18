import { StyleSheet } from 'react-native';

import { colors, rhythm, spacing } from '@/theme';

/** Shared glass panel shell for Circle room identity cards (Start Here, prompt, rules, voices). */
export const circlePanelLayout = StyleSheet.create({
  panel: {
    marginHorizontal: rhythm.circleRoomHorizontalInset,
    marginBottom: rhythm.circlePanelMarginBottom,
    padding: rhythm.circlePanelPadding,
    borderRadius: rhythm.cardRadius,
    backgroundColor: 'rgba(12,18,32,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.22)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.dark.text,
  },
  body: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.dark.textSecondary,
  },
});
