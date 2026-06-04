import type { CreatorMediaGreenScreenInput } from '@/services/supabase/creatorMediaJobs';

/**
 * Green Screen Studio V1 (B-roll Studio Phase 3) — pure client logic: product
 * limits, friendly control mapping, and the `video_composition` (greenScreen)
 * payload builder. The worker re-validates everything and keeps hard caps.
 */

export const GREEN_SCREEN_LIMITS = {
  /** Max foreground (subject) video length. */
  foregroundMaxSec: 180,
  /** Max background video length. */
  backgroundMaxSec: 180,
  /** Max final output length. */
  outputMaxSec: 180,
} as const;

export type GreenScreenBackgroundType = 'image' | 'video';
export type GreenScreenAudioMode = 'foreground' | 'background' | 'both';

/** Standard chroma-key green. */
export const GREEN_SCREEN_DEFAULT_KEY = '0x00ff00';

/** Optional friendly key-color presets (no technical jargon shown to the user). */
export const GREEN_SCREEN_KEY_PRESETS: { value: string; label: string; swatch: string }[] = [
  { value: '0x00ff00', label: 'Green', swatch: '#00d000' },
  { value: '0x0000ff', label: 'Blue', swatch: '#1e6bff' },
];

export const GREEN_SCREEN_AUDIO_OPTIONS: { mode: GreenScreenAudioMode; label: string; hint: string }[] = [
  { mode: 'foreground', label: 'My sound', hint: 'Keep your foreground audio. Background is silent.' },
  { mode: 'background', label: 'Background sound', hint: 'Play the background’s audio. Your clip is silent.' },
  { mode: 'both', label: 'Both', hint: 'Mix your sound and the background together.' },
];

export const GREEN_SCREEN_DEFAULTS = {
  /** Friendly 0..1 control values (mapped to chromakey similarity/blend on the server). */
  strength: 0.35,
  edgeSoftness: 0.08,
  audioMode: 'foreground' as GreenScreenAudioMode,
  keyColor: GREEN_SCREEN_DEFAULT_KEY,
} as const;

export interface GreenScreenState {
  /** Local foreground video uri (preview before upload). */
  foregroundUri: string;
  foregroundDurationSec: number;
  /** Local background uri (image or video). */
  backgroundUri: string;
  backgroundType: GreenScreenBackgroundType;
  keyColor: string;
  /** 0..1 friendly control. */
  strength: number;
  /** 0..1 friendly control. */
  edgeSoftness: number;
  audioMode: GreenScreenAudioMode;
}

export type ValidationResult = { ok: true } | { ok: false; error: string };

/** Validate against V1 limits. Durations of 0/unknown skip the length check (worker re-checks). */
export function validateGreenScreen(args: {
  hasForeground: boolean;
  hasBackground: boolean;
  foregroundDurationSec: number;
}): ValidationResult {
  if (!args.hasForeground) return { ok: false, error: 'Add a foreground video.' };
  if (!args.hasBackground) return { ok: false, error: 'Add a background image or video.' };
  if (
    args.foregroundDurationSec > 0 &&
    args.foregroundDurationSec > GREEN_SCREEN_LIMITS.foregroundMaxSec + 0.5
  ) {
    return { ok: false, error: `Foreground must be ${GREEN_SCREEN_LIMITS.foregroundMaxSec}s or shorter.` };
  }
  return { ok: true };
}

/**
 * Build the `video_composition` (greenScreen) job payload. Storage paths must
 * already be uploaded and scoped to the user (`<uid>/...`).
 */
export function buildGreenScreenPayload(args: {
  bucket: string;
  foregroundPath: string;
  backgroundPath: string;
  backgroundType: GreenScreenBackgroundType;
  keyColor: string;
  strength: number;
  edgeSoftness: number;
  audioMode: GreenScreenAudioMode;
  foregroundDurationSec?: number;
  targetPostId: string;
}): CreatorMediaGreenScreenInput {
  const fgVol = args.audioMode === 'background' ? 0 : 1;
  const bgVol = args.audioMode === 'foreground' ? 0 : args.audioMode === 'both' ? 0.45 : 1;
  return {
    bucket: args.bucket,
    canvas: { width: 1080, height: 1920, fps: 30 },
    greenScreen: {
      foregroundPath: args.foregroundPath,
      backgroundPath: args.backgroundPath,
      backgroundType: args.backgroundType,
      keyColor: args.keyColor || GREEN_SCREEN_DEFAULT_KEY,
      strength: clamp01(args.strength),
      edgeSoftness: clamp01(args.edgeSoftness),
      audioMode: args.audioMode,
      foregroundVolume: fgVol,
      backgroundVolume: bgVol,
      ...(args.foregroundDurationSec && args.foregroundDurationSec > 0
        ? { foregroundDurationSeconds: round3(args.foregroundDurationSec) }
        : {}),
    },
    target_post_id: args.targetPostId,
  };
}

/**
 * Map a failed `creator_media_jobs` row to a user-facing reason. The worker
 * prefixes failures (`PERMANENT_CORRUPT`, `PERMANENT_MISSING_MEDIA`,
 * `PERMANENT_DURATION_CAP`, `PERMANENT_UNSUPPORTED_BG`, `FFMPEG_TIMEOUT`, ...).
 * Never blames the connection unless the failure is upload/network related.
 */
export function greenScreenRenderFailureMessage(error?: string | null, code?: string | null): string {
  const s = `${code ?? ''} ${error ?? ''}`.toUpperCase();
  if (!s.trim()) return 'Green Screen render failed. Try a shorter clip or adjust the strength.';
  if (s.includes('UNSUPPORTED_BG') || s.includes('UNSUPPORTED BACKGROUND')) {
    return 'This background format is not supported. Try a different image or video.';
  }
  if (s.includes('DURATION_CAP') || s.includes('TOO LONG')) {
    return 'This video is too long. Keep it under 180 seconds.';
  }
  if (s.includes('MISSING_MEDIA')) {
    return 'An uploaded clip went missing. Re-add your videos and try again.';
  }
  if (s.includes('FOREGROUND') && (s.includes('CORRUPT') || s.includes('INVALID'))) {
    return 'Could not read this foreground video. Try a different clip.';
  }
  if (s.includes('BACKGROUND') && (s.includes('CORRUPT') || s.includes('INVALID'))) {
    return 'Could not read this background. Try a different file.';
  }
  if (s.includes('CORRUPT') || s.includes('INVALID DURATION')) {
    return 'We couldn’t read one of your files. Try a different clip.';
  }
  if (s.includes('TIMEOUT')) {
    return 'Rendering took too long. Try a shorter clip.';
  }
  if (s.includes('PAYLOAD')) {
    return 'Something was off with the edit. Re-add your files and try again.';
  }
  return 'Green Screen render failed. Try a shorter clip or adjust the strength.';
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, Math.round(n * 1000) / 1000));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
