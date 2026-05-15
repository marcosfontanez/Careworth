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
}

export type CreatorMediaJobKind =
  | 'trim'
  | 'timelapse'
  | 'stitch'
  | 'broll'
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
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  error: string | null;
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
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
