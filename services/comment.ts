import type { Comment, PostReactionCounts, PostReactionKind } from '@/types';
import { commentsService as supaComments } from '@/services/supabase/comments';
import { COMMENT_DELETED_TOMBSTONE, COMMENT_MAX_LENGTH } from '@/constants';
import { finalizeCommentsForViewer } from '@/lib/commentViewerPrivacy';
import { normalizePostReactionKind } from '@/lib/postReactions';
import { supabase } from '@/lib/supabase';
import { profileRowToCreatorSummary, unknownCreatorSummary } from '@/services/supabase/profileRowMapper';

function rowToCommentReactionCounts(row: any): PostReactionCounts {
  return {
    heart: row.reaction_heart_count ?? 0,
    haha: row.reaction_haha_count ?? 0,
    wow: row.reaction_wow_count ?? 0,
    sad: row.reaction_sad_count ?? 0,
    angry: row.reaction_angry_count ?? 0,
  };
}

function buildTree(
  flat: any[],
  viewerByComment: Partial<Record<string, PostReactionKind>>,
): Comment[] {
  const map = new Map<string, Comment>();
  const roots: Comment[] = [];

  for (const raw of flat) {
    const isDeleted = !!raw.deleted_at;
    const vr = normalizePostReactionKind(viewerByComment[raw.id]);

    const c: Comment = {
      id: raw.id,
      postId: raw.post_id,
      author: raw.author
        ? profileRowToCreatorSummary(raw.author)
        : unknownCreatorSummary(raw.author_id),
      /**
       * For deleted comments we replace the body at the source of truth
       * — every comment surface in the app reads `comment.content` and
       * we don't want to leak the original wording even briefly. The
       * tombstone copy lives in `constants/index.ts` so it's identical
       * everywhere.
       */
      content: isDeleted ? COMMENT_DELETED_TOMBSTONE : raw.content,
      mediaUrl: isDeleted ? undefined : raw.media_url?.trim() || undefined,
      likeCount: raw.like_count ?? 0,
      reactionCounts: rowToCommentReactionCounts(raw),
      viewerReaction: vr,
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
      isLiked: vr === 'heart',
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
  /**
   * Loads the thread for a post + the viewer's previously-picked reaction
   * per comment.
   *
   * Error handling — this matters because of a real bug:
   *   The previous implementation wrapped EVERYTHING in `try { ... } catch { return []; }`.
   *   That meant any failure in `getViewerReactionsForComments` (a non-essential
   *   side query) silently emptied the entire thread, AND React Query cached
   *   that `[]` as a "successful" result. Users would receive a comment
   *   notification, open the post, and see "No comments yet" forever.
   *
   * New behavior:
   *   - Comment fetch failure -> THROW. React Query will retry, surface the
   *     error, and never cache `[]` as a real success.
   *   - Viewer-reaction fetch failure -> log + degrade (return comments
   *     without picked-reaction state). Viewer can still see the thread.
   */
  async getByPostId(postId: string, viewerId?: string | null): Promise<Comment[]> {
    const [data, postMeta] = await Promise.all([
      supaComments.getByPostId(postId),
      supabase.from('posts_viewer_safe').select('is_anonymous').eq('id', postId).maybeSingle(),
    ]);
    const ids = data.map((r) => r.id);
    let viewerMap: Partial<Record<string, PostReactionKind>> = {};
    if (viewerId && ids.length > 0) {
      try {
        viewerMap = await supaComments.getViewerReactionsForComments(viewerId, ids);
      } catch (e) {
        if (__DEV__) {
          console.warn('[commentService.getByPostId] viewer reactions failed (degrading):', e);
        }
      }
    }
    const tree = buildTree(data, viewerMap);
    const isAnonymous = postMeta.data?.is_anonymous === true;
    return finalizeCommentsForViewer(tree, postId, { isAnonymous, viewerId });
  },

  async addComment(postId: string, content: string, parentId?: string, mediaUrl?: string | null) {
    /**
     * Trim to the cap before we even hit the wire. Same defense-in-depth
     * pattern as the supabase service — keeps offline-queued comments
     * from getting silently rejected by the DB CHECK constraint when
     * they finally replay.
     */
    const safe = content.slice(0, COMMENT_MAX_LENGTH).trim();
    return supaComments.create(postId, safe, parentId, mediaUrl);
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

  async setCommentReaction(commentId: string, kind: PostReactionKind | null) {
    return supaComments.setCommentReaction(commentId, kind);
  },
};
