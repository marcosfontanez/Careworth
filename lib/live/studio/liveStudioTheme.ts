import { borderRadius, colors, pulseverse } from '@/theme';

/** Shared visual tokens for Live Studio / Stream Manager surfaces. */
export const liveStudioTheme = {
  screenGradient: ['#060E1A', '#0A1220', '#0C1628'] as const,
  panelBg: 'rgba(12,18,32,0.88)',
  panelBorder: pulseverse.cardRimAccent,
  cardBg: 'rgba(15,28,48,0.72)',
  cardBorder: 'rgba(255,255,255,0.08)',
  previewHeight: 168,
  previewRadius: borderRadius.xl,
  tabActiveGradient: [pulseverse.electric, '#6366F1'] as const,
  chipBg: 'rgba(12,18,32,0.82)',
  chipBorder: 'rgba(255,255,255,0.08)',
  chipActiveBorder: 'rgba(56,189,248,0.38)',
  chipWarnBorder: 'rgba(251,146,60,0.45)',
  chipPurpleBorder: 'rgba(167,139,250,0.45)',
  chipDangerBorder: 'rgba(248,113,113,0.4)',
} as const;

export type QuickActionVariant = 'default' | 'creator' | 'gold' | 'shield' | 'danger';

export const quickActionVariantStyles: Record<
  QuickActionVariant,
  { gradient: readonly [string, string]; iconColor: string; border: string }
> = {
  default: {
    gradient: ['rgba(15,28,48,0.92)', 'rgba(12,18,32,0.88)'],
    iconColor: pulseverse.electricSoft,
    border: 'rgba(56,189,248,0.22)',
  },
  creator: {
    gradient: ['rgba(46,16,101,0.55)', 'rgba(15,28,48,0.88)'],
    iconColor: '#C4B5FD',
    border: 'rgba(139,92,246,0.28)',
  },
  gold: {
    gradient: ['rgba(69,26,3,0.45)', 'rgba(15,28,48,0.88)'],
    iconColor: colors.primary.gold,
    border: 'rgba(250,204,21,0.28)',
  },
  shield: {
    gradient: ['rgba(12,32,48,0.92)', 'rgba(15,28,48,0.88)'],
    iconColor: pulseverse.electricSoft,
    border: 'rgba(34,211,238,0.3)',
  },
  danger: {
    gradient: ['rgba(69,10,10,0.72)', 'rgba(40,8,8,0.88)'],
    iconColor: '#FCA5A5',
    border: 'rgba(248,113,113,0.35)',
  },
};
