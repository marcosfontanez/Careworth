/** Feed clip duration bounds (seconds). */
export const FEED_CLIP_MIN_SECONDS = 3;
export const FEED_CLIP_MAX_SECONDS = 60;

export type FeedClipRangeValidation =
  | { ok: true; durationSec: number }
  | { ok: false; code: 'invalid_range' | 'too_short' | 'too_long' | 'exceeds_source'; message: string };

export function validateFeedClipRange(
  trimStartSec: number,
  trimEndSec: number,
  sourceDurationSec?: number | null,
): FeedClipRangeValidation {
  if (!Number.isFinite(trimStartSec) || !Number.isFinite(trimEndSec) || trimEndSec <= trimStartSec) {
    return { ok: false, code: 'invalid_range', message: 'Choose a valid start and end time.' };
  }

  const durationSec = trimEndSec - trimStartSec;
  if (durationSec < FEED_CLIP_MIN_SECONDS) {
    return {
      ok: false,
      code: 'too_short',
      message: `Clips must be at least ${FEED_CLIP_MIN_SECONDS} seconds.`,
    };
  }
  if (durationSec > FEED_CLIP_MAX_SECONDS) {
    return {
      ok: false,
      code: 'too_long',
      message: `Clips can be up to ${FEED_CLIP_MAX_SECONDS} seconds.`,
    };
  }

  if (sourceDurationSec != null && Number.isFinite(sourceDurationSec) && sourceDurationSec > 0) {
    if (trimStartSec < 0 || trimEndSec > sourceDurationSec + 0.05) {
      return {
        ok: false,
        code: 'exceeds_source',
        message: 'Clip range must stay within the source video.',
      };
    }
  }

  return { ok: true, durationSec };
}
