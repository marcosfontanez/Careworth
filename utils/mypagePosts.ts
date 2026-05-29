import type { Post, UserProfile } from '@/types';
import type { BlockRelationship } from '@/services/supabase/blocks';
import { postHasDemoCatalogMedia } from '@/utils/postPreviewMedia';

export type ProfileContentBlockState = BlockRelationship | 'unknown';

/**
 * Whether a visitor may read profile **content surfaces** (My Pulse, Media Hub,
 * Current Vibe, pulse history detail). Public profile shell (avatar, name, bio)
 * may still render when this is false.
 *
 * Followers-only and alias modes are deferred — only `private` restricts content.
 */
export function canVisitorSeeProfileContent(
  user: Pick<UserProfile, 'privacyMode'>,
  isOwner: boolean,
  options?: {
    blockRelationship?: ProfileContentBlockState;
    viewerIsStaff?: boolean;
  },
): boolean {
  if (isOwner) return true;
  if (options?.viewerIsStaff) return true;

  const block = options?.blockRelationship ?? 'none';
  if (block === 'unknown' || block === 'viewer_blocked' || block === 'blocked_by_viewer') {
    return false;
  }

  return user.privacyMode !== 'private';
}

/**
 * Visitors may see this user’s posts on My Pulse / profile only when profile
 * content is visible (not private, not blocked, staff/owner exempt).
 */
export function canVisitorSeeProfilePosts(
  user: UserProfile,
  isOwner: boolean,
  options?: {
    blockRelationship?: ProfileContentBlockState;
    viewerIsStaff?: boolean;
  },
): boolean {
  return canVisitorSeeProfileContent(user, isOwner, options);
}

/** Post can appear in the horizontal “recent” strip (media or text with a caption). */
export function postHasProfilePreviewSurface(p: Post): boolean {
  if (postHasDemoCatalogMedia(p)) return false;
  if (p.type === 'video') return Boolean(p.mediaUrl?.trim());
  if (p.type === 'image') return Boolean(p.mediaUrl?.trim() || p.thumbnailUrl?.trim());
  if (p.type === 'text' || p.type === 'discussion' || p.type === 'confession') {
    return Boolean(p.caption?.trim());
  }
  return false;
}
