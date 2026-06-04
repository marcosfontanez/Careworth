import { supabase } from '@/lib/supabase';
import { parsePostMediaStoragePath, resolveFeedClipSourceMediaUrl } from '@/lib/feedClipStorage';
import { buildFeedClipPublishPayload } from '@/lib/feedClipPublish';
import { STORAGE_BUCKETS } from '@/lib/storage';
import { postsService } from '@/services/supabase/posts';
import { enqueueCreatorMediaJob } from '@/services/supabase/creatorMediaJobs';
import type { Post } from '@/types';

export type FeedClipPublishResult =
  | { ok: true; postId: string; jobId: string; processing: true }
  | { ok: false; code: string; message?: string };

/**
 * Creates a queued feed clip post and enqueues a server-side trim job.
 * Worker patches `posts.media_url` when encoding completes (see creator-media-worker).
 */
export const feedClipsService = {
  async publish(input: {
    userId: string;
    sourcePost: Post;
    trimStartSec: number;
    trimEndSec: number;
    caption: string;
    hashtags?: string[];
    communityId?: string | null;
    phiAcknowledged: boolean;
  }): Promise<FeedClipPublishResult> {
    if (!input.phiAcknowledged) {
      return { ok: false, code: 'phi_required', message: 'Confirm PHI safety before publishing.' };
    }

    const mediaUrl = resolveFeedClipSourceMediaUrl(input.sourcePost);
    if (!mediaUrl) {
      return { ok: false, code: 'no_media', message: 'Source video has no media URL.' };
    }

    const storage = parsePostMediaStoragePath(mediaUrl);
    if (!storage) {
      return {
        ok: false,
        code: 'storage_path_unavailable',
        message: 'This video cannot be clipped — only PulseVerse-hosted media can be trimmed.',
      };
    }

    const payload = buildFeedClipPublishPayload({
      sourcePost: input.sourcePost,
      trimStartSec: input.trimStartSec,
      trimEndSec: input.trimEndSec,
      caption: input.caption,
      hashtags: input.hashtags ?? [],
      communityId: input.communityId,
      phiAcknowledged: input.phiAcknowledged,
    });

    let created: Post;
    try {
      created = await postsService.create({
        creator_id: input.userId,
        type: 'video',
        caption: payload.caption,
        media_url: mediaUrl,
        thumbnail_url: input.sourcePost.thumbnailUrl?.trim() || mediaUrl,
        hashtags: payload.hashtags.length ? payload.hashtags : undefined,
        communities: payload.communities,
        feed_type_eligible: payload.feed_type_eligible,
        privacy_mode: payload.privacy_mode,
        source_post_id: payload.source_post_id,
        source_creator_id: payload.source_creator_id,
        source_live_stream_id: payload.source_live_stream_id,
        clip_start_seconds: payload.clip_start_seconds,
        clip_end_seconds: payload.clip_end_seconds,
        media_processing_status: payload.media_processing_status,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, code: 'create_failed', message: msg };
    }

    const outputPath = `${input.userId}/feed-clips/${created.id}.mp4`;

    let job;
    try {
      job = await enqueueCreatorMediaJob({
        userId: input.userId,
        kind: 'trim',
        payload: {
          bucket: storage.bucket,
          storagePathIn: storage.path,
          trimStartSec: input.trimStartSec,
          trimEndSec: input.trimEndSec,
          target_post_id: created.id,
          outputBucket: STORAGE_BUCKETS.postMedia,
          outputPath,
        },
        idempotencyKey: `feed-clip:${created.id}`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await supabase
        .from('posts')
        .update({
          media_processing_status: 'failed',
          media_processing_error: msg.slice(0, 500),
        })
        .eq('id', created.id)
        .eq('creator_id', input.userId);
      return { ok: false, code: 'enqueue_failed', message: msg };
    }

    await supabase
      .from('posts')
      .update({ media_processing_job_id: job.id })
      .eq('id', created.id)
      .eq('creator_id', input.userId);

    return { ok: true, postId: created.id, jobId: job.id, processing: true };
  },
};
