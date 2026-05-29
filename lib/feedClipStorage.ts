import type { Post } from '@/types';

const POST_MEDIA_BUCKET = 'post-media';

const PUBLIC_POST_MEDIA_MARKER = '/object/public/post-media/';

/** Best URL to trim for a feed clip (video media first, then thumbnail). */
export function resolveFeedClipSourceMediaUrl(
  post: Pick<Post, 'mediaUrl' | 'thumbnailUrl'>,
): string | null {
  return post.mediaUrl?.trim() || post.thumbnailUrl?.trim() || null;
}

/** Parse a Supabase public post-media URL into bucket-relative storage path. */
export function parsePostMediaStoragePath(
  publicUrl: string | null | undefined,
): { bucket: string; path: string } | null {
  const u = publicUrl?.trim();
  if (!u) return null;
  const idx = u.indexOf(PUBLIC_POST_MEDIA_MARKER);
  if (idx === -1) return null;
  const rawPath = u.slice(idx + PUBLIC_POST_MEDIA_MARKER.length).split('?')[0];
  const path = decodeURIComponent(rawPath);
  if (!path) return null;
  return { bucket: POST_MEDIA_BUCKET, path };
}

/** Server-side trim requires a post-media storage path (not external URLs). */
export function canProcessFeedClipStorage(
  post: Pick<Post, 'mediaUrl' | 'thumbnailUrl'>,
): boolean {
  const url = resolveFeedClipSourceMediaUrl(post);
  if (!url) return false;
  return parsePostMediaStoragePath(url) != null;
}

export const FEED_CLIP_STORAGE_UNAVAILABLE_MESSAGE =
  'This video cannot be clipped yet — only PulseVerse-hosted media can be trimmed.';
