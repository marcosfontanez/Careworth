import type { Post } from '@/types';
import type { ExportEndCardData } from '@/types/exportEndCard';
import { buildExportEndCardDataFromCreator } from '@/components/export-end-card/attribution';

/**
 * End-card copy for FFmpeg / server export.
 *
 * **Anonymous policy:** never put real handles, display names, or role/specialty on exported files
 * when the post is anonymous — avoids re-identification from a screen recording–safe clip.
 */
export function buildExportEndCardForPost(post: Post): ExportEndCardData {
  if (post.isAnonymous === true) {
    return {
      creatorDisplayName: 'PulseVerse member',
      creatorHandle: undefined,
      profession: undefined,
      specialty: undefined,
      avatarUrl: undefined,
    };
  }
  return buildExportEndCardDataFromCreator(post.creator);
}
