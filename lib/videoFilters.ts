/**
 * Shared visual presets for the camera capture screen and the post-capture
 * editor preview. Both surfaces apply the tint as an overlay <View>.
 *
 * The "filter" tints are color-grading style washes; the "effect" entries
 * are darker / vignette-style washes so they read distinctly. None of these
 * burn into the uploaded video file yet — they're preview-only and the
 * chosen `id` is persisted with the asset so the editor can keep showing
 * the same look.
 */

export type VideoLookKind = 'filter' | 'effect';

export type VideoLookId =
  | 'none'
  | 'warm'
  | 'cool'
  | 'bw'
  | 'vintage'
  | 'sepia'
  | 'noir'
  | 'glow'
  | 'vignette'
  | 'neon';

export interface VideoLook {
  id: VideoLookId;
  label: string;
  kind: VideoLookKind;
  /** RGBA overlay color, or null for the "no look" pass-through. */
  tint: string | null;
  /** Solid color shown in the chip swatch dot. */
  swatch: string;
}

export const VIDEO_LOOKS: VideoLook[] = [
  { id: 'none', label: 'Original', kind: 'filter', tint: null, swatch: '#1F2937' },
  { id: 'warm', label: 'Warm', kind: 'filter', tint: 'rgba(255, 165, 80, 0.18)', swatch: '#F59E0B' },
  { id: 'cool', label: 'Cool', kind: 'filter', tint: 'rgba(80, 160, 255, 0.18)', swatch: '#3B82F6' },
  { id: 'bw', label: 'B&W', kind: 'filter', tint: 'rgba(120, 120, 130, 0.28)', swatch: '#9CA3AF' },
  { id: 'vintage', label: 'Vintage', kind: 'filter', tint: 'rgba(193, 154, 107, 0.22)', swatch: '#C19A6B' },
  { id: 'sepia', label: 'Sepia', kind: 'filter', tint: 'rgba(112, 66, 20, 0.28)', swatch: '#A0522D' },

  { id: 'noir', label: 'Noir', kind: 'effect', tint: 'rgba(0, 0, 0, 0.32)', swatch: '#111827' },
  { id: 'glow', label: 'Glow', kind: 'effect', tint: 'rgba(255, 255, 255, 0.10)', swatch: '#F8FAFC' },
  { id: 'vignette', label: 'Vignette', kind: 'effect', tint: 'rgba(0, 0, 0, 0.22)', swatch: '#0F172A' },
  { id: 'neon', label: 'Neon', kind: 'effect', tint: 'rgba(80, 220, 255, 0.18)', swatch: '#22D3EE' },
];

export function tintForLook(id: VideoLookId): string | null {
  return VIDEO_LOOKS.find((f) => f.id === id)?.tint ?? null;
}

export function looksByKind(kind: VideoLookKind): VideoLook[] {
  return VIDEO_LOOKS.filter((f) => f.kind === kind);
}
