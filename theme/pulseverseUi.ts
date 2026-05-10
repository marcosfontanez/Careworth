/**
 * PulseVerse mobile UI contract — electric cyan family + shared surfaces.
 * Prefer these tokens over ad-hoc hex strings so Shop, Hub, Pulse, and Vault
 * read as one product (calm premium dark, one primary chrome hue).
 */
import { colors } from './colors';

export const pulseverse = {
  /** Primary UI chrome (tabs, pills, outlines, links) */
  electric: '#22D3EE',
  /** Secondary icon / label on dark surfaces */
  electricSoft: '#67E8F9',
  /** Muted cyan for secondary emphasis */
  electricMuted: '#38BDF8',
  /** Text on electric-filled CTAs */
  onElectric: '#050A14',
  /** Standard screen vertical gradient (top → lower) */
  screenGradient: ['#050A14', colors.dark.bg, colors.dark.bg] as const,
  /** Hairline that reads on navy without heavy contrast */
  divider: colors.dark.borderSubtle,
  /** Inner card rim used across vault / shop cards */
  cardRim: 'rgba(255,255,255,0.08)',
  /** Cyan-tinted rim for premium lifted cards */
  cardRimAccent: 'rgba(34,211,238,0.11)',
  /** Sparks balance chrome */
  sparksPillBg: 'rgba(15,28,48,0.92)',
  sparksPillBorder: 'rgba(34,211,238,0.26)',
  /** Subtle press glow (tab icon, not full neon) */
  tabGlow: '#22D3EE',
  /** Creator Hub shop entry CTA fill */
  shopCtaFill: '#22D3EE',
  /** Gold lane reserved for IAP / direct purchase context (borders checkout) */
  storeAccent: '#E7C975',
  storeAccentSoft: '#FDE68A',
  /** Primary dark card fill — slightly cooler than flat `dark.card` for depth */
  surfaceDeep: 'rgba(8,15,32,0.96)',
  /** Secondary shelf (shop tiles, hub rows) */
  surfaceShelf: 'rgba(12,22,42,0.88)',
  /** Hero orb / vignette — keep ≤ 0.12 opacity for premium restraint */
  heroBloom: 'rgba(34,211,238,0.065)',
  /** Equipped / accent rim without neon */
  rimEquipped: 'rgba(34,211,238,0.30)',
} as const;
