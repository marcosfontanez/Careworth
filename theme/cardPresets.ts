/**
 * Premium card surface presets — radius, border, fill, shadow tiers.
 * Compose with screen-specific padding; do not duplicate raw rgba strings.
 */
import type { ViewStyle } from 'react-native';
import { borderRadius } from './spacing';
import { colors } from './colors';
import { pulseverse } from './pulseverseUi';
import { shadows } from './shadows';
import { layout } from './layout';

export const cardPresets = {
  /** Default list / settings rows */
  standard: {
    backgroundColor: colors.dark.card,
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: pulseverse.cardRim,
    padding: layout.cardPadding,
    ...shadows.premiumCard,
  } satisfies ViewStyle,
  /** Featured / hero merchandise */
  featured: {
    backgroundColor: colors.dark.card,
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: pulseverse.cardRimAccent,
    padding: layout.cardPadding + 6,
    ...shadows.premiumCard,
  } satisfies ViewStyle,
  /** Dense grid tiles (shop browse, inventory) */
  compact: {
    backgroundColor: pulseverse.surfaceShelf,
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: pulseverse.cardRim,
    padding: layout.cardPadding,
    ...shadows.premiumCard,
  } satisfies ViewStyle,
  /** Stat / metric mini cards */
  stat: {
    backgroundColor: 'rgba(15,23,42,0.65)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.dark.borderInner,
    paddingVertical: layout.cardPadding,
    paddingHorizontal: layout.cardPadding,
    ...shadows.subtle,
  } satisfies ViewStyle,
  /** Modal inner panel */
  modal: {
    backgroundColor: 'rgba(12,20,36,0.94)',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: pulseverse.cardRim,
    paddingVertical: layout.sectionGapLarge,
    paddingHorizontal: layout.sectionGapLarge,
  } satisfies ViewStyle,
} as const;
