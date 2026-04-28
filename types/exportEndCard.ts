/**
 * Data + theme models for PulseVerse Export End Card (share/download outro).
 * @see components/export-end-card/PulseVerseEndCard.tsx
 */

export type ExportEndCardBrandVariant = 'default' | 'live' | 'minimal';

export type ExportEndCardBackgroundStyle = 'navyGradient' | 'deepCanvas' | 'coolGrayWash';

export type ExportEndCardAnimationPreset = 'premium' | 'subtle' | 'none';

/**
 * Layout explorations (product spec):
 * - centered — primary: premium slate, best for 9:16 social export (DEFAULT)
 * - split — brand left / creator right; editorial, works on wide crops
 * - minimal — creator-forward stamp; subtle brand corner
 */
export type ExportEndCardLayoutVariant = 'centered' | 'split' | 'minimal';

export interface ExportEndCardData {
  creatorDisplayName: string;
  /** Without @; UI adds @ when appropriate */
  creatorHandle?: string;
  profession?: string;
  specialty?: string;
  avatarUrl?: string;
  brandVariant?: ExportEndCardBrandVariant;
  useTagline?: boolean;
  backgroundStyle?: ExportEndCardBackgroundStyle;
  animationPreset?: ExportEndCardAnimationPreset;
}

export interface EndCardTheme {
  backgroundGradient: readonly [string, string, string];
  logoVariant: 'default' | 'monochrome';
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  accentLine: string;
  accentGlow: string;
  animationPreset: ExportEndCardAnimationPreset;
}

export const defaultEndCardTheme: EndCardTheme = {
  backgroundGradient: ['#0B1F3A', '#0E2A52', '#15294A'],
  logoVariant: 'default',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(244, 247, 251, 0.92)',
  textTertiary: 'rgba(244, 247, 251, 0.58)',
  accentLine: '#19D3C5',
  accentGlow: 'rgba(37, 99, 235, 0.35)',
  animationPreset: 'premium',
};

export function resolveEndCardTheme(
  backgroundStyle: ExportEndCardBackgroundStyle | undefined,
  partial?: Partial<EndCardTheme>
): EndCardTheme {
  const base = { ...defaultEndCardTheme, ...partial };
  switch (backgroundStyle) {
    case 'deepCanvas':
      return {
        ...base,
        backgroundGradient: ['#060E1A', '#0B1F3A', '#0F2744'],
      };
    case 'coolGrayWash':
      return {
        ...base,
        backgroundGradient: ['#1a2c44', '#243B5C', '#2d4a6d'],
        textTertiary: 'rgba(244, 247, 251, 0.5)',
      };
    case 'navyGradient':
    default:
      return base;
  }
}
