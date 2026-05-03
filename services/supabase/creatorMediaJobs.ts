import { supabase } from '@/lib/supabase';
import type { Json } from '@/lib/database.types';

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
 * `input` contract (examples):
 * - trim: { storagePathIn, trimStartSec, trimEndSec }
 * - timelapse: { imagePaths[], fps, crossfadeSec, audioPath? }
 * - stitch: { clipPaths[] }
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
