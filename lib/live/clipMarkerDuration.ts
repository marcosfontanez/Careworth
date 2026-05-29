/** Allowed lookback presets when saving a live clip marker (seconds before tap). */

export const CLIP_MARKER_DURATION_PRESETS = [15, 30, 60] as const;

export type ClipMarkerDurationSeconds = (typeof CLIP_MARKER_DURATION_PRESETS)[number];

export const DEFAULT_CLIP_MARKER_DURATION: ClipMarkerDurationSeconds = 30;

export function isClipMarkerDuration(value: unknown): value is ClipMarkerDurationSeconds {
  return value === 15 || value === 30 || value === 60;
}

export function normalizeClipMarkerDuration(
  value: unknown,
  fallback: ClipMarkerDurationSeconds = DEFAULT_CLIP_MARKER_DURATION,
): ClipMarkerDurationSeconds {
  return isClipMarkerDuration(value) ? value : fallback;
}

/** Server-side lookback window ending at the tap moment. */
export function clipMarkerWindow(
  markerTimeSeconds: number,
  durationSeconds: ClipMarkerDurationSeconds,
): { markerTimeSeconds: number; startSeconds: number; endSeconds: number; durationSeconds: number } {
  const marker = Math.max(0, Math.floor(markerTimeSeconds));
  const duration = durationSeconds;
  const startSeconds = Math.max(0, marker - duration);
  const endSeconds = marker;
  return {
    markerTimeSeconds: marker,
    startSeconds,
    endSeconds,
    durationSeconds: endSeconds - startSeconds,
  };
}
