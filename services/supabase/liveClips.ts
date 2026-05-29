import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type LiveClipStatus = 'draft' | 'processing' | 'ready' | 'failed' | 'published';
export type LiveClipPublishStatus = 'unpublished' | 'published';

export interface LiveClip {
  id: string;
  streamId: string;
  recordingId: string;
  markerId: string | null;
  createdBy: string;
  hostId: string;
  title: string;
  caption: string | null;
  hashtags: string[];
  category: string | null;
  startSeconds: number;
  endSeconds: number;
  durationSeconds: number | null;
  storagePath: string | null;
  thumbnailPath: string | null;
  status: LiveClipStatus;
  publishStatus: LiveClipPublishStatus;
  processingJobId: string | null;
  feedPostId: string | null;
  errorMessage: string | null;
  createdAt: string;
  publishedAt: string | null;
  streamTitle?: string;
}

interface LiveClipRow {
  id: string;
  stream_id: string;
  recording_id: string;
  marker_id: string | null;
  created_by: string;
  host_id: string;
  title: string;
  caption: string | null;
  hashtags: string[] | null;
  category: string | null;
  start_seconds: number;
  end_seconds: number;
  duration_seconds: number | null;
  storage_path: string | null;
  thumbnail_path: string | null;
  status: LiveClipStatus;
  publish_status: LiveClipPublishStatus;
  processing_job_id: string | null;
  feed_post_id: string | null;
  error_message: string | null;
  created_at: string;
  published_at: string | null;
  live_streams?: { title?: string | null } | null;
}

function rowToClip(row: LiveClipRow): LiveClip {
  return {
    id: row.id,
    streamId: row.stream_id,
    recordingId: row.recording_id,
    markerId: row.marker_id,
    createdBy: row.created_by,
    hostId: row.host_id,
    title: row.title,
    caption: row.caption,
    hashtags: row.hashtags ?? [],
    category: row.category,
    startSeconds: row.start_seconds,
    endSeconds: row.end_seconds,
    durationSeconds: row.duration_seconds,
    storagePath: row.storage_path,
    thumbnailPath: row.thumbnail_path,
    status: row.status,
    publishStatus: row.publish_status,
    processingJobId: row.processing_job_id,
    feedPostId: row.feed_post_id,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    publishedAt: row.published_at,
    streamTitle: row.live_streams?.title ?? undefined,
  };
}

function isMissingTableError(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes('live_clips') && (m.includes('does not exist') || m.includes('schema cache'));
}

type RpcResult = { ok?: boolean; code?: string; clip_id?: string; job_id?: string; storage_path?: string; bucket?: string };

export const liveClipsService = {
  async isBackendReady(): Promise<boolean> {
    try {
      const { error } = await supabase.from('live_clips')
        .select('id')
        .limit(1);
      if (error) return !isMissingTableError(error.message);
      return true;
    } catch {
      return false;
    }
  },

  async listForStream(streamId: string, limit = 40): Promise<LiveClip[]> {
    if (!streamId) return [];
    try {
      const { data, error } = await supabase
        .from('live_clips')
        .select('*, live_streams!live_clips_stream_id_fkey(title)')
        .eq('stream_id', streamId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        if (__DEV__ && !isMissingTableError(error.message)) {
          console.warn('[liveClips.listForStream]', error.message);
        }
        return [];
      }
      return (data ?? []).map((r) => rowToClip(r as LiveClipRow));
    } catch (err) {
      if (__DEV__) console.warn('[liveClips.listForStream]', err);
      return [];
    }
  },

  async createDraft(input: {
    streamId: string;
    markerId: string;
    title: string;
    caption?: string;
    hashtags?: string[];
    category?: string;
    startSeconds: number;
    endSeconds: number;
  }): Promise<{ ok: boolean; clipId?: string; code?: string }> {
    try {
      const { data, error } = await (supabase.rpc as (name: string, args: object) => ReturnType<typeof supabase.rpc>)(
        'create_live_clip_draft',
        {
          p_stream_id: input.streamId,
          p_marker_id: input.markerId,
          p_title: input.title,
          p_caption: input.caption ?? '',
          p_hashtags: input.hashtags ?? [],
          p_category: input.category ?? '',
          p_start_seconds: input.startSeconds,
          p_end_seconds: input.endSeconds,
        },
      );
      if (error) return { ok: false, code: 'rpc_failed' };
      const row = data as RpcResult | null;
      if (!row?.ok) return { ok: false, code: row?.code ?? 'unknown' };
      return { ok: true, clipId: row.clip_id };
    } catch {
      return { ok: false, code: 'unknown' };
    }
  },

  async generate(clipId: string): Promise<{ ok: boolean; jobId?: string; code?: string }> {
    try {
      const { data, error } = await (supabase.rpc as (name: string, args: object) => ReturnType<typeof supabase.rpc>)(
        'generate_live_clip',
        { p_clip_id: clipId },
      );
      if (error) return { ok: false, code: 'rpc_failed' };
      const row = data as RpcResult | null;
      if (!row?.ok) return { ok: false, code: row?.code ?? 'unknown' };
      return { ok: true, jobId: row.job_id };
    } catch {
      return { ok: false, code: 'unknown' };
    }
  },

  async deleteClip(clipId: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('live_clips')
        .delete()
        .eq('id', clipId);
      return !error;
    } catch {
      return false;
    }
  },

  async getDownloadSignedUrl(clipId: string): Promise<{ url: string | null; code?: string }> {
    try {
      const { data, error } = await (supabase.rpc as (name: string, args: object) => ReturnType<typeof supabase.rpc>)(
        'get_live_clip_download_url',
        { p_clip_id: clipId },
      );
      if (error) return { url: null, code: 'rpc_failed' };
      const row = data as RpcResult | null;
      if (!row?.ok || !row.storage_path) {
        return { url: null, code: row?.code ?? 'not_ready' };
      }

      const { data: signed, error: signErr } = await supabase.storage
        .from(row.bucket ?? 'post-media')
        .createSignedUrl(row.storage_path, 3600);
      if (signErr || !signed?.signedUrl) return { url: null, code: 'sign_failed' };
      return { url: signed.signedUrl };
    } catch {
      return { url: null, code: 'unknown' };
    }
  },

  getPublicMediaUrl(storagePath: string | null, bucket = 'post-media'): string | null {
    if (!storagePath) return null;
    const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
    return data?.publicUrl?.trim() || null;
  },

  getPublicThumbnailUrl(thumbnailPath: string | null): string | null {
    return liveClipsService.getPublicMediaUrl(thumbnailPath);
  },

  async publishToFeed(input: {
    clip: LiveClip;
    hostDisplayName: string;
    creatorId: string;
    phiAcknowledged: boolean;
  }): Promise<{ ok: boolean; postId?: string; code?: string }> {
    if (!input.phiAcknowledged) return { ok: false, code: 'phi_required' };
    if (input.clip.status !== 'ready' && input.clip.status !== 'published') {
      return { ok: false, code: 'not_ready' };
    }
    if (input.clip.publishStatus === 'published' && input.clip.feedPostId) {
      return { ok: true, postId: input.clip.feedPostId };
    }

    const mediaUrl = liveClipsService.getPublicMediaUrl(input.clip.storagePath);
    if (!mediaUrl) return { ok: false, code: 'missing_media' };

    const thumbUrl =
      liveClipsService.getPublicThumbnailUrl(input.clip.thumbnailPath) ?? mediaUrl;

    const attribution = `Clipped from ${input.hostDisplayName} Live.`;
    const captionBody = input.clip.caption?.trim() ?? '';
    const caption = captionBody ? `${attribution}\n\n${captionBody}` : attribution;

    try {
      const { data: postRow, error: postErr } = await supabase
        .from('posts')
        .insert({
          creator_id: input.creatorId,
          type: 'video',
          caption,
          media_url: mediaUrl,
          thumbnail_url: thumbUrl,
          hashtags: input.clip.hashtags,
          feed_type_eligible: ['forYou', 'following'],
          source_live_stream_id: input.clip.streamId,
        } as never)
        .select('id')
        .single();

      if (postErr || !postRow?.id) {
        if (__DEV__) console.warn('[liveClips.publishToFeed]', postErr?.message);
        return { ok: false, code: 'publish_failed' };
      }

      await supabase.from('live_clips')
        .update({
          status: 'published',
          publish_status: 'published',
          feed_post_id: postRow.id,
          published_at: new Date().toISOString(),
        })
        .eq('id', input.clip.id);

      return { ok: true, postId: postRow.id as string };
    } catch (err) {
      if (__DEV__) console.warn('[liveClips.publishToFeed]', err);
      return { ok: false, code: 'publish_failed' };
    }
  },

  subscribe(streamId: string, onChange: () => void, channelScope = 'default'): () => void {
    if (!streamId) return () => {};
    const channel: RealtimeChannel = supabase
      .channel(`live_clips:${channelScope}:${streamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_clips',
          filter: `stream_id=eq.${streamId}`,
        },
        () => onChange(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  },
};
