import type { Post, UserProfile } from '@/types';
import { postHasDemoCatalogMedia } from '@/utils/postPreviewMedia';

/**
 * Visitors may see this user’s posts on My Pulse / profile only when the account is not set to private
 * (Settings → private profile). Per-post audience is not used for this surface.
 */
export function canVisitorSeeProfilePosts(user: UserProfile, isOwner: boolean): boolean {
  if (isOwner) return true;
  return user.privacyMode !== 'private';
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
