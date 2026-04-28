import { Platform, ViewStyle } from 'react-native';
import { colors } from './colors';

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
      shadowOpacity: 0.18,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
    },
    android: { elevation: 4 },
    default: {},
  })!,
  lifted: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000',
      shadowOpacity: 0.28,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 12 },
    },
    android: { elevation: 8 },
    default: {},
  })!,
  sheet: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000',
      shadowOpacity: 0.35,
      shadowRadius: 28,
      shadowOffset: { width: 0, height: -10 },
    },
    android: { elevation: 12 },
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
      shadowOpacity: 0.35,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
    },
    android: { elevation: 6 },
    default: {},
  })!,
} as const;
