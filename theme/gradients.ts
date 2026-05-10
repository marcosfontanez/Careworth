/**
 * Canonical gradient tuples — use with `LinearGradient` / `expo-linear-gradient`.
 * Avoid duplicating these hex arrays in individual screens.
 */
import { colors } from './colors';
import { pulseverse } from './pulseverseUi';

export const gradients = {
  /** Root screen wash (top → settled) */
  screen: [...pulseverse.screenGradient] as string[],
  /** Primary commerce CTA (shop buy, prominent actions) */
  ctaCommerce: ['#2563EB', pulseverse.electric] as const,
  /** Brand-forward CTA (teal lane) */
  ctaBrand: [colors.primary.teal, '#0D9488'] as const,
  /** Sheet / modal primary button (softer than full commerce) */
  ctaSheet: [pulseverse.electricMuted, pulseverse.electric] as const,
  /** Shop featured border outer ring */
  featuredBorder: ['rgba(212,166,58,0.18)', 'rgba(99,102,241,0.07)'] as const,
  /** IAP / direct-purchase info banner */
  economyIap: ['rgba(212,166,58,0.26)', 'rgba(202,138,4,0.09)'] as const,
  /** Sparks / wallet context */
  economySparks: ['rgba(34,211,238,0.17)', 'rgba(99,102,241,0.08)'] as const,
  /** Creator gifts context */
  economyGift: ['rgba(167,139,250,0.15)', 'rgba(34,211,238,0.09)'] as const,
  /** Filter sheet Done button */
  sheetDone: [pulseverse.electric, '#6366F1'] as const,
  /** Creator Hub shop card ring (purple → cyan) */
  hubShopRing: ['#9333EA', '#6366F1', pulseverse.electric] as const,
  /** Pulse Champions / hub leaderboard card outer wash */
  leaderboardCard: ['rgba(32,26,52,0.94)', 'rgba(14,20,38,0.97)', '#0B1220'] as const,
  /** Trophy / header icon ring (gold → violet → teal, restrained) */
  leaderboardHeaderRing: [
    'rgba(251,191,36,0.34)',
    'rgba(168,85,247,0.26)',
    'rgba(20,184,166,0.26)',
  ] as const,
  /** Monthly prize preview panel wash */
  leaderboardPrizePreview: [
    'rgba(251,191,36,0.08)',
    'rgba(20,184,166,0.045)',
    'rgba(99,102,241,0.055)',
  ] as const,
  /** Compact ranked row / list item sheen */
  cardRowSheen: ['rgba(255,255,255,0.065)', 'rgba(255,255,255,0.02)'] as const,
} as const;
