/** Clip window presets centered on a marker timestamp (seconds into recording). */

export type ClipDurationPreset = 15 | 30 | 60 | 'custom';

export function clipWindowForPreset(
  markerTimeSeconds: number,
  preset: ClipDurationPreset,
  custom?: { startSeconds: number; endSeconds: number },
): { startSeconds: number; endSeconds: number; durationSeconds: number } {
  if (preset === 'custom' && custom) {
    const startSeconds = Math.max(0, Math.floor(custom.startSeconds));
    const endSeconds = Math.max(startSeconds + 1, Math.floor(custom.endSeconds));
    return {
      startSeconds,
      endSeconds,
      durationSeconds: endSeconds - startSeconds,
    };
  }

  const marker = Math.max(0, Math.floor(markerTimeSeconds));
  const duration = preset === 'custom' ? 30 : preset;
  const lead = Math.floor(duration * 0.65);
  const startSeconds = Math.max(0, marker - lead);
  const endSeconds = startSeconds + duration;
  return { startSeconds, endSeconds, durationSeconds: duration };
}

export const CLIP_STUDIO_PHI_REMINDER =
  'Before publishing, confirm this clip does not contain protected health information or private patient details.';

export const LIVE_CLIP_CATEGORIES = [
  'education',
  'wellness',
  'community',
  'entertainment',
  'other',
] as const;

export type LiveClipCategory = (typeof LIVE_CLIP_CATEGORIES)[number];
