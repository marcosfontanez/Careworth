import { supabase } from '@/lib/supabase';
import type { Json } from '@/lib/database.types';

/**
 * Worker contract (implemented in `scripts/creator-media-worker.mjs` when `ffmpeg` is on PATH).
 * Storage paths are bucket-relative (e.g. `post-media`). Every path must start with `<user_id>/`.
 */

/** Concatenate clips in order → one MP4 (`kind: 'stitch'`). */
export interface CreatorMediaStitchInput {
  /** Defaults to `post-media` / `CREATOR_MEDIA_BUCKET`. */
  bucket?: string;
  clipPaths: string[];
  /** Defaults to `<user_id>/exports/<job_id>.mp4`. */
  outputPath?: string;
  /** When set, worker patches `posts.media_url` and clears processing columns on success. */
  target_post_id?: string;
}

/**
 * A-roll then cutaways concatenated back-to-back (`kind: 'broll'`).
 * Not PiP — same as stitch with main first. Interleaved edits need a future schema/worker.
 */
export interface CreatorMediaBrollInput {
  bucket?: string;
  mainPath: string;
  cutawayPaths: string[];
  outputPath?: string;
  target_post_id?: string;
}

/** Floating overlay (PiP) position preset on the 1080x1920 canvas. */
export type CreatorMediaOverlayPosition =
  | 'topRight'
  | 'topLeft'
  | 'bottomRight'
  | 'bottomLeft'
  | 'center';

/** Floating overlay (PiP) size preset (fraction of canvas width). */
export type CreatorMediaOverlaySize = 'small' | 'medium' | 'large';

/** Cutout crop region preset (rectangle of the source frame to keep). */
export type CreatorMediaCropPreset = 'full' | 'left' | 'right' | 'top' | 'bottom' | 'center';

/** Cutout crop spec. V1 uses `mode: 'preset'`; rect fields reserved for Phase 4.1. */
export interface CreatorMediaCrop {
  mode: 'preset' | 'rect';
  preset?: CreatorMediaCropPreset;
  x?: number | null;
  y?: number | null;
  width?: number | null;
  height?: number | null;
}

/**
 * Compositing (`kind: 'video_composition'`) — B-roll Studio.
 * - `type: 'cutaway'` (V1): the layer covers the main video full-screen for its
 *   [timelineStart, timelineEnd] window.
 * - `type: 'pip'` (Phase 2, gated by `creatorOverlayPip`): the main video stays
 *   full-screen and the layer floats on top, scaled to a size preset and placed
 *   at a position preset, only during its window.
 * Built with an ffmpeg filtergraph (NOT concat). The worker re-validates everything.
 */
export interface CreatorMediaCompositionLayer {
  type: 'cutaway' | 'pip' | 'cutout';
  path: string;
  /** Seconds into the source B-roll clip to start using. */
  trimStart: number;
  /** Seconds into the source B-roll clip to stop using. */
  trimEnd: number;
  /** Seconds into the MAIN video where this layer begins showing. */
  timelineStart: number;
  /** Seconds into the MAIN video where this layer stops showing. */
  timelineEnd: number;
  /** Scaling behavior for the canvas / overlay box. */
  fit?: 'cover';
  /** muted = main audio only; broll_only = main muted during segment; both = mixed during segment. */
  audioMode?: 'muted' | 'both' | 'broll_only';
  audioVolume?: number;
  /** PiP/cutout only — floating position preset (default `topRight`). */
  position?: CreatorMediaOverlayPosition;
  /** PiP/cutout only — floating size preset (default `medium`). */
  size?: CreatorMediaOverlaySize;
  /** Cutout only — which rectangle of the source frame to keep before overlaying. */
  crop?: CreatorMediaCrop;
  /** Reserved for future freeform placement. Null for preset-based layers. */
  x?: number | null;
  y?: number | null;
  width?: number | null;
  height?: number | null;
}

export interface CreatorMediaCompositionInput {
  bucket?: string;
  canvas?: { width: number; height: number; fps: number };
  main: { path: string; audioVolume?: number; durationSeconds?: number };
  layers: CreatorMediaCompositionLayer[];
  outputPath?: string;
  target_post_id?: string;
}

/**
 * Green Screen Studio (`kind: 'video_composition'`, Phase 3) — manual chroma key.
 * Detected by the worker when `input.greenScreen` is present (instead of `main`/`layers`).
 * Keys a foreground video and composites it over an image/video background.
 */
export interface CreatorMediaGreenScreen {
  /** Foreground video (the keyed subject). Must be `<uid>/...`. */
  foregroundPath: string;
  /** Background image or video. Must be `<uid>/...`. */
  backgroundPath: string;
  backgroundType: 'video' | 'image';
  /** Hex key color, e.g. `0x00ff00` (standard green). */
  keyColor?: string;
  /** 0..1 — how aggressively similar colors are removed (maps to chromakey similarity). */
  strength?: number;
  /** 0..1 — edge blend/softness (maps to chromakey blend). */
  edgeSoftness?: number;
  /** 0..1 — reserved for spill reduction (Phase 3 accepts but may not apply). */
  spillReduction?: number;
  /** foreground = my sound only; background = background sound only; both = mixed. */
  audioMode?: 'foreground' | 'background' | 'both';
  foregroundVolume?: number;
  backgroundVolume?: number;
  /** Best-effort foreground duration (seconds) for server bounds. */
  foregroundDurationSeconds?: number;
}

export interface CreatorMediaGreenScreenInput {
  bucket?: string;
  canvas?: { width: number; height: number; fps: number };
  greenScreen: CreatorMediaGreenScreen;
  outputPath?: string;
  target_post_id?: string;
}

export type CreatorMediaJobKind =
  | 'trim'
  | 'timelapse'
  | 'stitch'
  | 'broll'
  | 'video_composition'
  | 'pitch_shift'
  | 'background_matte'
  | 'face_blur'
  | 'silence_detect'
  | 'cinemagraph_export'
  | 'parallax_export';

export interface CreatorMediaJobRow {
  id: string;
  user_id: string;
  kind: CreatorMediaJobKind;
  status: 'queued' | 'running' | 'awaiting_post_patch' | 'succeeded' | 'failed' | 'cancelled';
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  error: string | null;
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  attempt_count?: number;
  max_attempts?: number;
  last_error_code?: string | null;
  next_retry_at?: string | null;
  encode_complete?: boolean;
}

/**
 * Enqueue work for an external ffmpeg / ML worker (poll `creator_media_jobs` where status=queued).
 *
 * Fully specified in-repo:
 * - **stitch** / **broll**: see {@link CreatorMediaStitchInput}, {@link CreatorMediaBrollInput} and `scripts/creator-media-worker.mjs`.
 *
 * Still roadmap in worker (rows fail with guidance until implemented):
 * - trim: { storagePathIn, trimStartSec, trimEndSec }
 * - timelapse: { imagePaths[], fps, crossfadeSec, audioPath? }
 * - face_blur: { storagePathIn, regions[] | "auto" }
 */
export async function enqueueCreatorMediaJob(input: {
  userId: string;
  kind: CreatorMediaJobKind;
  payload: Json;
  idempotencyKey?: string | null;
}): Promise<CreatorMediaJobRow> {
  const { data, error } = await supabase
    .from('creator_media_jobs')
    .insert({
      user_id: input.userId,
      kind: input.kind,
      input: input.payload,
      idempotency_key: input.idempotencyKey ?? null,
    })
    .select()
    .single();
  if (error || !data) throw error ?? new Error('enqueue failed');
  return data as CreatorMediaJobRow;
}

export async function getCreatorMediaJob(jobId: string): Promise<CreatorMediaJobRow | null> {
  const { data, error } = await supabase
    .from('creator_media_jobs')
    .select('*')
    .eq('id', jobId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as CreatorMediaJobRow | null;
}

export async function listMyCreatorMediaJobs(limit = 20): Promise<CreatorMediaJobRow[]> {
  const { data, error } = await supabase
    .from('creator_media_jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as CreatorMediaJobRow[];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Poll until job reaches a terminal status or timeout.
 * @throws Error with message `TIMEOUT` or `JOB_NOT_FOUND`
 */
export async function waitForCreatorMediaJob(
  jobId: string,
  opts?: { timeoutMs?: number; intervalMs?: number },
): Promise<CreatorMediaJobRow> {
  const timeoutMs = opts?.timeoutMs ?? 180_000;
  const intervalMs = opts?.intervalMs ?? 2000;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const row = await getCreatorMediaJob(jobId);
    if (!row) throw new Error('JOB_NOT_FOUND');
    if (
      row.status === 'succeeded' ||
      row.status === 'failed' ||
      row.status === 'cancelled'
    ) {
      return row;
    }
    await sleep(intervalMs);
  }
  throw new Error('TIMEOUT');
}
