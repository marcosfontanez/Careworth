/**
 * PulseVerse UI kit — shared primitives + design tokens.
 *
 * **Prefer this barrel for new UI:**
 * ```ts
 * import {
 *   PulseButton,
 *   PulseCard,
 *   PulseBottomSheet,
 *   PulseChip,
 *   pulseColors,
 *   pulseSpacing,
 * } from '@/components/ui/pulse';
 * ```
 *
 * **Tokens only** (no components):
 * ```ts
 * import { pulseColors, pulseRadius, pulseTypography } from '@/lib/theme/pulseTheme';
 * ```
 *
 * **Live bottom sheets** — `LiveBottomSheet` re-exports `PulseBottomSheet` for backward compatibility.
 * New code should import `PulseBottomSheet` from here.
 *
 * Guardrails: `docs/PULSEVERSE_UI_SYSTEM.md`
 */

export {
  pulseTheme,
  pulseColors,
  pulseGradients,
  pulseSpacing,
  pulseRadius,
  pulseTypography,
  pulseShadows,
  pulseZIndex,
  pulseStatus,
} from '@/lib/theme/pulseTheme';

export type {
  PulseTheme,
  PulseChipTone,
  PulseCardVariant,
  PulseButtonVariant,
} from '@/lib/theme/pulseTheme';

export { PulseScreen } from './PulseScreen';
export { PulseCard } from './PulseCard';
export { PulseGlassCard } from './PulseGlassCard';
export { PulseButton } from './PulseButton';
export { PulseIconButton } from './PulseIconButton';
export { PulseChip } from './PulseChip';
export { PulseTabs, type PulseTabItem } from './PulseTabs';
export { PulseActionTile } from './PulseActionTile';
export { PulseBottomSheet } from './PulseBottomSheet';
export { PulseEmptyState } from './PulseEmptyState';
export { PulseErrorState } from './PulseErrorState';
export { PulseLoadingSkeleton } from './PulseLoadingSkeleton';
export { PulseSectionHeader } from './PulseSectionHeader';
