import { borderRadius, spacing } from './spacing';

/**
 * Shared vertical/horizontal rhythm for Circles + My Pulse scroll surfaces.
 * Prefer these over one-off padding/margin literals in card stacks.
 */
export const rhythm = {
  pageHorizontalPadding: spacing.lg,
  pageHorizontalPaddingWide: spacing.lg + 2,
  sectionGap: spacing.lg,
  sectionGapLarge: spacing['2xl'],
  cardGap: spacing.md,
  cardPaddingSmall: spacing.sm,
  cardPaddingMedium: spacing.md,
  cardPaddingLarge: spacing.lg,
  cardRadius: borderRadius['2xl'],
  cardMinHeightSmall: 72,
  cardMinHeightMedium: 88,
  cardMinHeightLarge: 96,
  chipHeight: 28,
  avatarSizeSmall: 34,
  avatarSizeMedium: 44,
  avatarSizeLarge: 58,
  carouselCardWidth: 180,
  carouselCardHeight: 322,
  mediaThumbAspectRatio: 16 / 9,
  /** Circles tab + circle room horizontal inset */
  circleRoomHorizontalInset: spacing.lg,
  circleListCardMinHeight: 96,
  circleConversationMinHeight: 76,
  circlePanelPadding: spacing.md,
  circlePanelMarginBottom: spacing.md,
  circleThreadThumbHeight: 118,
  /** My Pulse scroll modules */
  myPulseSectionGap: spacing.lg,
  myPulseHeaderGap: spacing.md,
  myPulsePanelPadding: spacing.md,
  myPulsePanelBlur: 34,
  myPulseEmptyPaddingVertical: spacing['2xl'],
  myPulseEmptyPaddingHorizontal: spacing.xl,
  myPulseItemStackGap: spacing.xs,
  myPulseEmptyIconGap: spacing.md,
  myPulseEmptyTitleGap: spacing.xs + 2,
} as const;
