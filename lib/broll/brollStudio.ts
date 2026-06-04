import type { CreatorMediaCompositionInput, CreatorMediaCompositionLayer } from '@/services/supabase/creatorMediaJobs';

/**
 * B-roll Studio V1 (Cutaway Mode) — pure client logic: product limits, validation,
 * and the `video_composition` payload builder. The worker re-validates everything
 * and keeps its own hard caps as a safety fallback.
 */

export const BROLL_LIMITS = {
  /** Main video max length. */
  mainMaxSec: 180,
  /** Max number of cutaways. */
  maxCutaways: 3,
  /** Max selected (trimmed) duration of a single cutaway. */
  maxCutawaySec: 30,
  /** Max combined on-screen cutaway time across the whole composition. */
  maxTotalOverlaySec: 60,
  /** Minimum sensible cutaway length. */
  minCutawaySec: 0.5,
} as const;

export type BrollAudioMode = 'muted' | 'broll_only' | 'both';

/** Phase 2 — how a B-roll layer is composited over the main video. */
export type BrollLayerMode = 'cutaway' | 'overlay';

/** Top-level B-roll Studio composition mode (chosen once per session). */
export type StudioMode = 'cutaway' | 'overlay' | 'greenScreen' | 'cutout';

/** Layer modes that use the shared main+layers flow (excludes greenScreen). */
export type LayerStudioMode = 'cutaway' | 'overlay' | 'cutout';

export const STUDIO_MODE_CARDS: { mode: StudioMode; label: string; hint: string; icon: string }[] = [
  { mode: 'cutaway', label: 'Cutaway', hint: 'Replace part of your video with B-roll.', icon: 'film-outline' },
  { mode: 'overlay', label: 'Overlay', hint: 'Place a video on top of your main clip.', icon: 'albums-outline' },
  { mode: 'greenScreen', label: 'Green Screen', hint: 'Put yourself over a background.', icon: 'sparkles-outline' },
  { mode: 'cutout', label: 'Cutout', hint: 'Crop part of a clip and place it on your video.', icon: 'crop-outline' },
];

/** Cutout crop region preset (rectangle of the source frame to keep). */
export type CropPreset = 'full' | 'left' | 'right' | 'top' | 'bottom' | 'center';

export const CROP_DEFAULT: CropPreset = 'center';

export const CROP_PRESET_OPTIONS: { value: CropPreset; label: string }[] = [
  { value: 'full', label: 'Full frame' },
  { value: 'left', label: 'Left half' },
  { value: 'right', label: 'Right half' },
  { value: 'top', label: 'Top half' },
  { value: 'bottom', label: 'Bottom half' },
  { value: 'center', label: 'Center square' },
];

/** Phase 2 — floating overlay (PiP) position preset. */
export type OverlayPosition = 'topRight' | 'topLeft' | 'bottomRight' | 'bottomLeft' | 'center';

/** Phase 2 — floating overlay (PiP) size preset. */
export type OverlaySize = 'small' | 'medium' | 'large';

export const OVERLAY_DEFAULTS = {
  position: 'topRight' as OverlayPosition,
  size: 'medium' as OverlaySize,
  audioMode: 'muted' as BrollAudioMode,
} as const;

/** Fraction of canvas width for each size preset (mirrors worker). */
export const OVERLAY_SIZE_FRACTION: Record<OverlaySize, number> = {
  small: 0.25,
  medium: 0.35,
  large: 0.45,
};

export const OVERLAY_POSITION_OPTIONS: { value: OverlayPosition; label: string; icon: string }[] = [
  { value: 'topLeft', label: 'Top left', icon: 'arrow-up' },
  { value: 'topRight', label: 'Top right', icon: 'arrow-up' },
  { value: 'center', label: 'Center', icon: 'ellipse-outline' },
  { value: 'bottomLeft', label: 'Bottom left', icon: 'arrow-down' },
  { value: 'bottomRight', label: 'Bottom right', icon: 'arrow-down' },
];

export const OVERLAY_SIZE_OPTIONS: { value: OverlaySize; label: string }[] = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
];

export const BROLL_AUDIO_OPTIONS: { mode: BrollAudioMode; label: string; hint: string }[] = [
  { mode: 'muted', label: 'Main audio', hint: 'Keep your main video’s sound. The clip is silent.' },
  { mode: 'broll_only', label: 'Clip audio', hint: 'Hear the clip during its moment; main returns after.' },
  { mode: 'both', label: 'Both', hint: 'Mix main + clip sound during the moment.' },
];

export interface StudioCutaway {
  id: string;
  /** Local media uri for preview before upload. */
  uri: string;
  /** Full source clip duration (seconds), best-effort. */
  sourceDurationSec: number;
  /** Seconds into the source clip to start using. */
  trimStart: number;
  /** Seconds into the source clip to stop using. */
  trimEnd: number;
  /** Seconds into the MAIN video where this clip begins. */
  timelineStart: number;
  audioMode: BrollAudioMode;
  /** Phase 2 — cutaway (full-screen replace) or overlay (floating PiP). Defaults to cutaway. */
  mode?: BrollLayerMode;
  /** Overlay/cutout — floating position preset. */
  position?: OverlayPosition;
  /** Overlay/cutout — floating size preset. */
  size?: OverlaySize;
  /** Cutout only — which rectangle of the source frame to keep. */
  cropPreset?: CropPreset;
  /** Storage path after upload (set at post time). */
  storagePath?: string;
}

/** On-screen duration of a cutaway = its trimmed length. timelineEnd derives from this. */
export function cutawayWindowSec(c: Pick<StudioCutaway, 'trimStart' | 'trimEnd'>): number {
  return Math.max(0, c.trimEnd - c.trimStart);
}

export function cutawayTimelineEnd(c: Pick<StudioCutaway, 'trimStart' | 'trimEnd' | 'timelineStart'>): number {
  return c.timelineStart + cutawayWindowSec(c);
}

export type ValidationResult = { ok: true } | { ok: false; error: string };

/**
 * Validate a composition against V1 limits. Returns the first user-facing problem.
 * `mainDurationSec` may be 0/unknown on platforms without a probe — in that case we
 * skip main-length checks and rely on the worker's hard caps.
 */
export function validateComposition(mainDurationSec: number, cutaways: StudioCutaway[]): ValidationResult {
  if (cutaways.length === 0) return { ok: false, error: 'Add at least one B-roll clip.' };
  if (cutaways.length > BROLL_LIMITS.maxCutaways) {
    return { ok: false, error: `You can add up to ${BROLL_LIMITS.maxCutaways} clips.` };
  }
  if (mainDurationSec > 0 && mainDurationSec > BROLL_LIMITS.mainMaxSec + 0.5) {
    return { ok: false, error: `Main video must be ${BROLL_LIMITS.mainMaxSec}s or shorter.` };
  }

  let totalOverlay = 0;
  const windows: { start: number; end: number }[] = [];
  for (let i = 0; i < cutaways.length; i += 1) {
    const c = cutaways[i]!;
    const win = cutawayWindowSec(c);
    const label = `Clip ${i + 1}`;
    if (win < BROLL_LIMITS.minCutawaySec) return { ok: false, error: `${label} is too short.` };
    if (win > BROLL_LIMITS.maxCutawaySec + 0.05) {
      return { ok: false, error: `${label} is longer than ${BROLL_LIMITS.maxCutawaySec}s.` };
    }
    if (c.trimEnd > c.sourceDurationSec + 0.25 && c.sourceDurationSec > 0) {
      return { ok: false, error: `${label} trim is past the end of the clip.` };
    }
    const end = cutawayTimelineEnd(c);
    if (c.timelineStart < 0) return { ok: false, error: `${label} start is invalid.` };
    if (mainDurationSec > 0 && end > mainDurationSec + 0.25) {
      return { ok: false, error: `${label} runs past the end of your main video.` };
    }
    totalOverlay += win;
    windows.push({ start: c.timelineStart, end });
  }

  if (totalOverlay > BROLL_LIMITS.maxTotalOverlaySec + 0.05) {
    return { ok: false, error: `Total B-roll time can’t exceed ${BROLL_LIMITS.maxTotalOverlaySec}s.` };
  }

  // Clips must not overlap each other on the timeline (keeps preview + render simple,
  // and avoids two floating overlays stacking at once).
  const sorted = [...windows].sort((a, b) => a.start - b.start);
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i]!.start < sorted[i - 1]!.end - 0.05) {
      return { ok: false, error: 'Clips can’t overlap. Space them out on the timeline.' };
    }
  }

  return { ok: true };
}

/**
 * Build the `video_composition` job payload. Storage paths must already be uploaded
 * (each scoped to the user, e.g. `<uid>/...`). Cutaways missing a storagePath are skipped.
 */
export function buildCompositionPayload(args: {
  bucket: string;
  mainPath: string;
  mainDurationSec?: number;
  cutaways: StudioCutaway[];
  targetPostId: string;
  /** Composition mode chosen for the session — sets every layer's type. */
  layerMode: LayerStudioMode;
}): CreatorMediaCompositionInput {
  const layers: CreatorMediaCompositionLayer[] = args.cutaways
    .filter((c) => !!c.storagePath)
    .map((c) => {
      const base = {
        path: c.storagePath!,
        trimStart: round3(c.trimStart),
        trimEnd: round3(c.trimEnd),
        timelineStart: round3(c.timelineStart),
        timelineEnd: round3(cutawayTimelineEnd(c)),
        fit: 'cover' as const,
        audioMode: c.audioMode,
        audioVolume: c.audioMode === 'muted' ? 0 : 1,
      };
      if (args.layerMode === 'overlay') {
        return {
          ...base,
          type: 'pip' as const,
          position: c.position ?? OVERLAY_DEFAULTS.position,
          size: c.size ?? OVERLAY_DEFAULTS.size,
          x: null,
          y: null,
          width: null,
          height: null,
        };
      }
      if (args.layerMode === 'cutout') {
        return {
          ...base,
          type: 'cutout' as const,
          crop: { mode: 'preset' as const, preset: c.cropPreset ?? CROP_DEFAULT, x: null, y: null, width: null, height: null },
          position: c.position ?? OVERLAY_DEFAULTS.position,
          size: c.size ?? OVERLAY_DEFAULTS.size,
          x: null,
          y: null,
          width: null,
          height: null,
        };
      }
      return { ...base, type: 'cutaway' as const };
    });

  return {
    bucket: args.bucket,
    canvas: { width: 1080, height: 1920, fps: 30 },
    main: {
      path: args.mainPath,
      audioVolume: 1.0,
      ...(args.mainDurationSec && args.mainDurationSec > 0
        ? { durationSeconds: round3(args.mainDurationSec) }
        : {}),
    },
    layers,
    target_post_id: args.targetPostId,
  };
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * Map a failed `creator_media_jobs` row (`error` / `last_error_code`) to a user-facing reason.
 * The worker prefixes failures (e.g. `PERMANENT_DURATION_CAP`, `PERMANENT_CORRUPT`,
 * `PERMANENT_MISSING_MEDIA`, `FFMPEG_TIMEOUT`, `unsupported kind`). We surface an accurate
 * hint instead of always claiming the clip was "too long".
 */
export function brollRenderFailureMessage(error?: string | null, code?: string | null): string {
  const s = `${code ?? ''} ${error ?? ''}`.toUpperCase();
  if (!s.trim()) return 'B-roll render failed. Please try again.';
  if (s.includes('DURATION_CAP')) {
    return `That edit is too long. Keep the main video under ${BROLL_LIMITS.mainMaxSec}s and each cutaway under ${BROLL_LIMITS.maxCutawaySec}s.`;
  }
  if (s.includes('UNSUPPORTED KIND') || s.includes('NOT IMPLEMENTED')) {
    return 'B-roll rendering isn’t available on the server yet. Please try again later.';
  }
  if (s.includes('MISSING_MEDIA')) {
    return 'An uploaded clip went missing. Re-add your videos and try again.';
  }
  if (s.includes('OVERSIZED')) {
    return 'One of your videos is too large. Try a shorter or lower-resolution clip.';
  }
  if (s.includes('CORRUPT') || s.includes('INVALID DURATION')) {
    return 'We couldn’t read one of your videos. Try a different clip.';
  }
  if (s.includes('TIMEOUT')) {
    return 'Rendering took too long. Try shorter clips or fewer cutaways.';
  }
  if (s.includes('PAYLOAD')) {
    return 'Something was off with the edit. Re-add your clips and try again.';
  }
  return 'B-roll render failed. Please try again.';
}
