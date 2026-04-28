import type { Comment } from '@/types';
import { commentsService as supaComments } from '@/services/supabase/comments';
import { COMMENT_DELETED_TOMBSTONE, COMMENT_MAX_LENGTH } from '@/constants';

function buildTree(flat: any[]): Comment[] {
  const map = new Map<string, Comment>();
  const roots: Comment[] = [];

  for (const raw of flat) {
    const isDeleted = !!raw.deleted_at;

    const c: Comment = {
      id: raw.id,
      postId: raw.post_id,
      author: {
        id: raw.author?.id ?? raw.author_id,
        displayName: raw.author?.display_name ?? 'User',
        avatarUrl: raw.author?.avatar_url ?? '',
        role: raw.author?.role ?? 'RN',
        specialty: raw.author?.specialty ?? 'General',
        city: '',
        state: '',
        isVerified: raw.author?.is_verified ?? false,
        /**
         * Denormalized Pulse tier + score (migration 059). Comment rows
         * render a `PulseTierBadge` next to the author when present so
         * every engagement surface carries identity. Nullable — brand
         * new accounts haven't been computed yet and just hide the chip.
         */
        pulseTier: raw.author?.pulse_tier ?? null,
        pulseScoreCurrent: raw.author?.pulse_score_current ?? null,
      },
      /**
       * For deleted comments we replace the body at the source of truth
       * — every comment surface in the app reads `comment.content` and
       * we don't want to leak the original wording even briefly. The
       * tombstone copy lives in `constants/index.ts` so it's identical
       * everywhere.
       */
      content: isDeleted ? COMMENT_DELETED_TOMBSTONE : raw.content,
      likeCount: raw.like_count ?? 0,
      replyCount: 0,
      createdAt: raw.created_at,
      /**
       * Server-stamped whenever the author edits the body (migration
       * 057 trigger). Passed through verbatim so UI can render
       * "· edited" without any client-side clock tricks. Deleted
       * comments suppress the badge — the tombstone body isn't a real
       * "edit" from the viewer's perspective.
       */
      editedAt: isDeleted ? undefined : raw.edited_at ?? undefined,
      isPinned: false,
      isLiked: false,
      isDeleted,
      replies: [],
    };
    map.set(c.id, c);
  }

  for (const raw of flat) {
    const node = map.get(raw.id)!;
    if (raw.parent_id && map.has(raw.parent_id)) {
      const parent = map.get(raw.parent_id)!;
      parent.replies.push(node);
      parent.replyCount++;
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export const commentService = {
  async getByPostId(postId: string): Promise<Comment[]> {
    try {
      const data = await supaComments.getByPostId(postId);
      return buildTree(data);
    } catch {
      return [];
    }
  },

  async addComment(postId: string, content: string, parentId?: string) {
    /**
     * Trim to the cap before we even hit the wire. Same defense-in-depth
     * pattern as the supabase service — keeps offline-queued comments
     * from getting silently rejected by the DB CHECK constraint when
     * they finally replay.
     */
    const safe = content.slice(0, COMMENT_MAX_LENGTH);
    return supaComments.create(postId, safe, parentId);
  },

  /**
   * Author-only soft delete. Replies are preserved; the body is replaced
   * with the shared tombstone copy on the next refetch. Surfaces should
   * also patch their local cache optimistically so the UX feels instant.
   */
  async deleteComment(commentId: string) {
    return supaComments.softDelete(commentId);
  },

  /**
   * Author-only edit. Returns the updated row so callers can reconcile
   * their local cache (including the fresh server-stamped `editedAt`).
   * The trim + length cap mirrors the create path to keep offline
   * replays safe if we ever queue edits.
   */
  async updateComment(commentId: string, content: string) {
    const safe = content.slice(0, COMMENT_MAX_LENGTH);
    return supaComments.update(commentId, safe);
  },

  async likeComment(commentId: string) {
    return supaComments.likeComment(commentId);
  },
};
