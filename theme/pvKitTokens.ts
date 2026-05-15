/**
 * PulseVerse UI kit — tokens aligned with `docs/UI_VISION.md` (Visual System).
 * Use from `components/pv/*`; extend here instead of scattering magic values.
 */
import type { TextStyle, ViewStyle } from 'react-native';
import { Platform } from 'react-native';
import { borderRadius, spacing } from '@/theme/spacing';
import { pulseverse } from '@/theme/pulseverseUi';
import { colors } from '@/theme/colors';

export const pvKit = {
  /** Major glass cards — deeper vertical read + legible rim */
  card: {
    fillTop: 'rgba(14,22,42,0.94)',
    fillMid: 'rgba(10,16,32,0.92)',
    fillBottom: 'rgba(4,8,18,0.97)',
    border: 'rgba(34,211,238,0.26)',
    borderSubtle: 'rgba(56,189,248,0.14)',
    specular: 'rgba(255,255,255,0.07)',
    vignette: 'rgba(1,4,12,0.55)',
    radius: borderRadius.card,
    radiusLarge: borderRadius['3xl'],
    padding: spacing.lg,
    paddingWide: spacing.xl,
  },

  hero: {
    border: 'rgba(34,211,238,0.36)',
    outerGlowOpacity: 0.22,
  },

  primaryCta: {
    colors: ['#0EA5E9', '#22D3EE', '#38BDF8', '#2563EB'] as const,
    locations: [0, 0.35, 0.65, 1] as const,
    border: 'rgba(255,255,255,0.42)',
    text: '#FFFFFF',
  },

  secondaryCta: {
    fill: pulseverse.surfaceShelf,
    border: pulseverse.cardRimAccent,
    text: pulseverse.electricSoft,
    textAlt: colors.dark.text,
  },

  pill: {
    radius: borderRadius.full,
    padH: spacing.md,
    padV: spacing.xs + 2,
  },

  page: {
    textureTop: 'rgba(34,211,238,0.05)',
    textureMid: 'transparent',
    textureBottom: 'rgba(15,23,42,0.55)',
  },

  search: {
    fill: 'rgba(6,12,26,0.94)',
    fillInner: 'rgba(8,14,30,0.88)',
    border: 'rgba(34,211,238,0.38)',
    radius: borderRadius.full,
    placeholder: colors.dark.textMuted,
    minHeight: 52,
  },

  segmented: {
    inactiveBorder: 'rgba(100,116,139,0.28)',
    activeBorder: 'rgba(34,211,238,0.72)',
    pillPadH: spacing.md,
    pillPadV: spacing.sm,
    insetBg: 'rgba(3,6,14,0.96)',
    insetBorder: 'rgba(34,211,238,0.24)',
    insetRadius: borderRadius.lg,
    insetPadding: 4,
    activeFillTop: 'rgba(34,211,238,0.26)',
    activeFillBottom: 'rgba(34,211,238,0.08)',
    idleFill: 'rgba(15,23,42,0.35)',
  },

  balancePill: {
    fill: pulseverse.sparksPillBg,
    border: pulseverse.sparksPillBorder,
  },

  tabBar: {
    fill: 'rgba(5,10,20,0.94)',
    border: 'rgba(34,211,238,0.14)',
    active: pulseverse.electric,
    inactive: colors.dark.textMuted,
  },

  sectionHeader: {
    kicker: {
      fontSize: 11,
      fontWeight: '900' as TextStyle['fontWeight'],
      letterSpacing: 2,
      color: colors.dark.textMuted,
      textTransform: 'uppercase' as const,
    },
    title: {
      fontSize: 24,
      fontWeight: '800' as TextStyle['fontWeight'],
      letterSpacing: -0.55,
      color: colors.dark.text,
      marginTop: spacing.sm,
    },
    subtitle: {
      fontSize: 15,
      fontWeight: '500' as TextStyle['fontWeight'],
      color: colors.dark.textSecondary,
      marginTop: spacing.md,
      lineHeight: 22,
    },
  },

  circles: {
    cosmicRing: 'rgba(34,211,238,0.16)',
    cosmicRingMid: 'rgba(56,189,248,0.1)',
    cosmicRingOuter: 'rgba(34,211,238,0.06)',
    glassList: {
      fillTop: 'rgba(14,22,42,0.94)',
      fillMid: 'rgba(9,14,28,0.92)',
      fillBottom: 'rgba(3,6,14,0.96)',
      border: 'rgba(34,211,238,0.28)',
    },
    scopeTrack: {
      bg: 'rgba(3,6,14,0.97)',
      border: 'rgba(34,211,238,0.22)',
      radius: borderRadius.lg,
      pad: 4,
    },
    scopeChipInactive: {
      border: 'rgba(100,116,139,0.22)',
    },
    scopeChipActive: {
      fillTop: 'rgba(34,211,238,0.26)',
      fillBottom: 'rgba(34,211,238,0.07)',
      border: 'rgba(34,211,238,0.62)',
    },
    search: {
      fill: 'rgba(6,12,26,0.94)',
      border: 'rgba(34,211,238,0.36)',
      divider: 'rgba(34,211,238,0.22)',
      radius: borderRadius.full,
    },
    chromeBell: {
      fill: 'rgba(8,14,28,0.94)',
      border: 'rgba(34,211,238,0.26)',
    },
    featured: {
      shadowOpacity: 0.28,
      shadowRadius: 18,
      shadowOffsetY: 10,
      borderAlpha: 'AA' as const,
      topWashOpacity: 0.28,
    },
    firstOnline: '#CABFFD',
    sectionGap: spacing['2xl'] + spacing.xs,
    carouselGap: 16,
  },

  cards: {
    topSheen: ['rgba(34,211,238,0.14)', 'rgba(34,211,238,0.04)', 'transparent'] as const,
    sideSheen: ['rgba(34,211,238,0.11)', 'transparent'] as const,
    bottomVignette: ['transparent', 'rgba(1,4,12,0.45)'] as const,
    innerHairline: 'rgba(255,255,255,0.1)',
    circle: {
      radius: borderRadius['2xl'],
      iconSize: 58,
      iconRadius: 29,
      iconBorder: 'rgba(34,211,238,0.38)',
      iconFillTop: 'rgba(34,211,238,0.2)',
      iconFillBottom: 'rgba(4,8,18,0.88)',
      auraOpacity: { ios: 0.48 as const },
      auraRadius: { ios: 14 as const },
    },
    trending: {
      radius: borderRadius['2xl'],
      rankSize: 32,
      iconTile: 50,
      iconTileRadius: borderRadius.md,
    },
    spotlight: {
      kicker: {
        fontSize: 10,
        fontWeight: '900' as TextStyle['fontWeight'],
        letterSpacing: 2,
        color: pulseverse.electricSoft,
        textTransform: 'uppercase' as const,
      },
    },
    meta: {
      category: pulseverse.electricSoft,
      engagement: colors.dark.textMuted,
      time: colors.primary.gold,
      uppercaseLabel: colors.dark.textQuiet,
    },
  },
} as const;

export const pvGlassDepthShadow = (): ViewStyle =>
  Platform.select({
    ios: {
      shadowColor: '#01050d',
      shadowOpacity: 0.55,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 12 },
    },
    android: { elevation: 10 },
    default: {},
  }) ?? {};

export const pvCardRimBloom = (tint: string = pulseverse.electric): ViewStyle =>
  Platform.select({
    ios: {
      shadowColor: tint,
      shadowOpacity: 0.26,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 0 },
    },
    default: {},
  }) ?? {};

export const pvPrimaryCtaGlow = (): ViewStyle =>
  Platform.select({
    ios: {
      shadowColor: pvKit.primaryCta.colors[1],
      shadowOpacity: 0.58,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 5 },
    },
    android: { elevation: 10 },
    default: {},
  }) ?? {};

export const pvHeroOuterGlow = (): ViewStyle =>
  Platform.select({
    ios: {
      shadowColor: pulseverse.electric,
      shadowOpacity: pvKit.hero.outerGlowOpacity,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 8 },
    },
    android: { elevation: 10 },
    default: {},
  }) ?? {};

export const pvRankGoldBloom = (): ViewStyle =>
  Platform.select({
    ios: {
      shadowColor: colors.primary.gold,
      shadowOpacity: 0.38,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 0 },
    },
    default: {},
  }) ?? {};
