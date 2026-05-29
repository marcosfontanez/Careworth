import { Platform, type TextStyle, type ViewStyle } from 'react-native';

/**
 * PulseVerse centralized design tokens — single source of truth for the Pulse UI kit.
 * Use via `@/lib/theme/pulseTheme` or `@/components/ui/pulse`.
 * Does not replace legacy `@/theme` until screens migrate intentionally.
 */

export const pulseColors = {
  background: '#07111F',
  surface: '#0D1B2E',
  surfaceElevated: '#122038',
  glass: 'rgba(15, 28, 48, 0.82)',
  glassStrong: 'rgba(18, 26, 44, 0.92)',
  overlay: 'rgba(7, 17, 31, 0.72)',
  backdrop: 'rgba(4, 10, 18, 0.55)',

  text: '#F8FAFC',
  textSecondary: 'rgba(248, 250, 252, 0.88)',
  mutedText: '#93A4B8',
  textQuiet: 'rgba(147, 164, 184, 0.72)',

  border: 'rgba(255, 255, 255, 0.08)',
  borderStrong: 'rgba(56, 189, 248, 0.22)',
  borderAccent: 'rgba(25, 211, 197, 0.35)',

  teal: '#19D3C5',
  tealDeep: '#0D9488',
  purple: '#8B5CF6',
  purpleDeep: '#6D28D9',
  pink: '#FF4FD8',
  live: '#FF3B5C',
  gift: '#F6C453',
  success: '#2EE59D',
  warning: '#F59E0B',
  danger: '#F87171',
  dangerDeep: '#DC2626',

  /** Text on saturated fills */
  onAccent: '#07111F',
  onDanger: '#FFFFFF',
  onGift: '#1A1204',
} as const;

export const pulseGradients = {
  screen: ['#07111F', '#0A1628', '#0D1B2E'] as const,
  screenVeil: ['rgba(25, 211, 197, 0.06)', 'rgba(139, 92, 246, 0.04)', 'transparent'] as const,
  primaryCta: ['#19D3C5', '#2563EB'] as const,
  secondaryVeil: ['rgba(15, 28, 48, 0.92)', 'rgba(12, 18, 32, 0.88)'] as const,
  glassTop: ['rgba(56, 189, 248, 0.12)', 'transparent'] as const,
  gift: ['rgba(246, 196, 83, 0.28)', 'rgba(246, 196, 83, 0.08)'] as const,
  live: ['rgba(255, 59, 92, 0.22)', 'rgba(255, 59, 92, 0.06)'] as const,
  premium: ['rgba(139, 92, 246, 0.18)', 'rgba(25, 211, 197, 0.1)'] as const,
} as const;

export const pulseSpacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
} as const;

export const pulseRadius = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 18,
  '2xl': 22,
  '3xl': 28,
  card: 22,
  chip: 14,
  button: 16,
  sheet: 28,
  full: 9999,
} as const;

export const pulseTypography: Record<string, TextStyle> = {
  screenTitle: { fontSize: 26, fontWeight: '900', letterSpacing: -0.45, color: pulseColors.text },
  sectionTitle: { fontSize: 16, fontWeight: '800', letterSpacing: -0.25, color: pulseColors.text },
  cardTitle: { fontSize: 15, fontWeight: '700', letterSpacing: -0.1, color: pulseColors.text },
  body: { fontSize: 15, fontWeight: '400', lineHeight: 22, color: pulseColors.textSecondary },
  bodySmall: { fontSize: 13, fontWeight: '400', lineHeight: 18, color: pulseColors.mutedText },
  caption: { fontSize: 12, fontWeight: '500', lineHeight: 16, color: pulseColors.mutedText },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: pulseColors.mutedText,
  },
  button: { fontSize: 15, fontWeight: '800', letterSpacing: 0.1, color: pulseColors.onAccent },
  stat: { fontSize: 20, fontWeight: '800', color: pulseColors.text },
};

export const pulseZIndex = {
  base: 0,
  raised: 10,
  dock: 20,
  sheet: 30,
  overlay: 40,
  toast: 50,
} as const;

export const pulseStatus = {
  live: { bg: 'rgba(255, 59, 92, 0.14)', border: 'rgba(255, 59, 92, 0.35)', text: pulseColors.live },
  success: { bg: 'rgba(46, 229, 157, 0.12)', border: 'rgba(46, 229, 157, 0.32)', text: pulseColors.success },
  warning: { bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.32)', text: pulseColors.warning },
  danger: { bg: 'rgba(248, 113, 113, 0.12)', border: 'rgba(248, 113, 113, 0.32)', text: pulseColors.danger },
  muted: { bg: 'rgba(147, 164, 184, 0.1)', border: pulseColors.border, text: pulseColors.mutedText },
  premium: { bg: 'rgba(246, 196, 83, 0.12)', border: 'rgba(246, 196, 83, 0.32)', text: pulseColors.gift },
} as const;

function glow(color: string, opacity: number, radius: number, height: number): ViewStyle {
  return Platform.select<ViewStyle>({
    ios: {
      shadowColor: color,
      shadowOpacity: opacity,
      shadowRadius: radius,
      shadowOffset: { width: 0, height },
    },
    android: { elevation: Math.max(2, Math.round(radius / 4)) },
    default: {},
  })!;
}

export const pulseShadows = {
  subtle: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
    },
    android: { elevation: 1 },
    default: {},
  })!,
  card: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000',
      shadowOpacity: 0.16,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
    },
    android: { elevation: 4 },
    default: {},
  })!,
  elevated: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000',
      shadowOpacity: 0.24,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
    },
    android: { elevation: 8 },
    default: {},
  })!,
  sheet: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000',
      shadowOpacity: 0.32,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: -10 },
    },
    android: { elevation: 12 },
    default: {},
  })!,
  glowTeal: glow(pulseColors.teal, 0.22, 12, 6),
  glowGift: glow(pulseColors.gift, 0.2, 10, 4),
  glowLive: glow(pulseColors.live, 0.18, 10, 4),
} as const;

export const pulseTheme = {
  colors: pulseColors,
  gradients: pulseGradients,
  spacing: pulseSpacing,
  radius: pulseRadius,
  typography: pulseTypography,
  shadows: pulseShadows,
  zIndex: pulseZIndex,
  status: pulseStatus,
} as const;

export type PulseTheme = typeof pulseTheme;
export type PulseChipTone = keyof typeof pulseStatus;
export type PulseCardVariant = 'default' | 'glass' | 'elevated' | 'danger' | 'gift';
export type PulseButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gift';
