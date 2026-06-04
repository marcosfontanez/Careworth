/**
 * Shared visual presets for the camera capture screen, the post-capture
 * editor preview, and read-side feed tint ({@link tintForLook} on `VideoFeedPost`).
 * The feed tint comes solely from the persisted `posts.video_look_id` color grade.
 * Fullscreen stills (`app/image-viewer`) accept optional `grade=` (resolved look id) for parity when opened from post detail.
 *
 * Tints are color-grading style washes; effect entries are darker / vignette-style.
 * Overlays are **not** burned into uploaded MP4s — except that the chosen look id
 * is stored on `posts.video_look_id` (migration 162) so the feed can mirror the composer.
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

const LOOK_ID_SET = new Set<string>(VIDEO_LOOKS.map((l) => l.id));

/** Maps DB / API values to a persisted grade id (`none` → undefined). */
export function normalizeVideoLookId(raw: unknown): VideoLookId | undefined {
  if (raw == null) return undefined;
  const s = String(raw).trim().toLowerCase();
  if (!LOOK_ID_SET.has(s)) return undefined;
  if (s === 'none') return undefined;
  return s as VideoLookId;
}

export function looksByKind(kind: VideoLookKind): VideoLook[] {
  return VIDEO_LOOKS.filter((f) => f.kind === kind);
}

/**
 * Feed / detail tint: the persisted color grade id, or undefined when unset / `none`.
 */
export function resolveFeedGradeLookId(input: {
  videoLookId?: VideoLookId | null;
}): VideoLookId | undefined {
  const id = input.videoLookId;
  return id && id !== 'none' ? id : undefined;
}
