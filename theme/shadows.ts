import { Platform, ViewStyle } from 'react-native';
import { colors } from './colors';
import { pulseverse } from './pulseverseUi';

/**
 * Reusable shadow presets so cards/sheets/buttons feel consistently elevated.
 * Designed for the PulseVerse dark theme — soft cool-tone shadow with depth,
 * not Material Design black-drop.
 *
 * Usage:
 *   <View style={[styles.card, shadows.card]}>
 *
 * Tiers
 * - subtle  — quiet rows / chips / badges (very soft)
 * - card    — standard surface card (most cards)
 * - lifted  — featured / hero card, "share to my pulse"
 * - sheet   — bottom sheets, modal containers
 * - cta     — primary CTA buttons, floating actions
 */
export const shadows = {
  subtle: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
    },
    android: { elevation: 1 },
    default: {},
  })!,
  card: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000',
      shadowOpacity: 0.13,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 5 },
    },
    android: { elevation: 3 },
    default: {},
  })!,
  lifted: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
    },
    android: { elevation: 6 },
    default: {},
  })!,
  sheet: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000',
      shadowOpacity: 0.28,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: -8 },
    },
    android: { elevation: 10 },
    default: {},
  })!,
  /**
   * Teal-tinted glow for primary CTAs. `shadowColor` was previously
   * drifted (`#0EA39A`) against `colors.primary.teal` (`#14B8A6`); now
   * sourced from the palette so any future brand-teal tweak ripples
   * through every CTA glow automatically.
   */
  cta: Platform.select<ViewStyle>({
    ios: {
      shadowColor: colors.primary.teal,
      shadowOpacity: 0.24,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
    },
    android: { elevation: 5 },
    default: {},
  })!,
  /** Primary CTA — softer bloom (luxury apps avoid heavy teal halos). */
  ctaSoft: Platform.select<ViewStyle>({
    ios: {
      shadowColor: colors.primary.teal,
      shadowOpacity: 0.15,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
    },
    android: { elevation: 3 },
    default: {},
  })!,
  /** Dark cards / tiles — lift without colored glow */
  premiumCard: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#030712',
      shadowOpacity: 0.4,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
    },
    android: { elevation: 4 },
    default: {},
  })!,
  /** Equipped / accent-highlighted card — single restrained cyan read */
  accentEdge: Platform.select<ViewStyle>({
    ios: {
      shadowColor: pulseverse.electric,
      shadowOpacity: 0.09,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
    },
    android: { elevation: 3 },
    default: {},
  })!,
} as const;
