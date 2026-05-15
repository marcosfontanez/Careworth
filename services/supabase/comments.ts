import { supabase } from '@/lib/supabase';
import { COMMENT_MAX_LENGTH } from '@/constants';
import { normalizePostReactionKind } from '@/lib/postReactions';
import type { PostReactionKind } from '@/types';
import { PROFILE_SELECT_CREATOR_WITH_FRAME } from '@/services/supabase/profileRowMapper';

export interface SupabaseComment {
  id: string;
  post_id: string;
  parent_id: string | null;
  author_id: string;
  content: string;
  like_count: number;
  created_at: string;
  /**
   * Soft-delete timestamp. Present on the wire so clients can render a
   * tombstone (`COMMENT_DELETED_TOMBSTONE`) in place of the original body
   * while still resolving the reply tree underneath. See migration
   * `043_comments_soft_delete_and_length_cap.sql`.
   */
  deleted_at: string | null;
  /**
   * Last-edited timestamp. Set by the BEFORE UPDATE trigger
   * `trg_comments_stamp_edited_at` (migration 057) whenever the author
   * saves a new `content`. `null` means "never edited"; the UI surfaces
   * this as an "· edited" tag next to the created-at time.
   */
  edited_at: string | null;
  media_url?: string | null;
  reaction_heart_count?: number | null;
  reaction_haha_count?: number | null;
  reaction_wow_count?: number | null;
  reaction_sad_count?: number | null;
  reaction_angry_count?: number | null;
  author: {
    id: string;
    display_name: string;
    username?: string | null;
    avatar_url: string | null;
    role: string;
    specialty: string;
    city?: string | null;
    state?: string | null;
    is_verified: boolean;
    /**
     * Denormalized current-month Pulse state (migration 059). Ships
     * alongside every comment so comment rows can render the tier chip
     * next to the author without a per-row RPC.
     */
    pulse_tier: string | null;
    pulse_score_current: number | null;
    selected_pulse_avatar_frame_id?: string | null;
    pulse_avatar_frame?: unknown;
  };
}

export const commentsService = {
  async getByPostId(postId: string): Promise<SupabaseComment[]> {
    const { data, error } = await supabase
      .from('comments')
      .select(
        `
        id, post_id, parent_id, author_id, content, like_count, created_at, deleted_at, edited_at,
        media_url,
        reaction_heart_count, reaction_haha_count, reaction_wow_count, reaction_sad_count, reaction_angry_count,
        author:author_id(${PROFILE_SELECT_CREATOR_WITH_FRAME})
      `,
      )
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data ?? []) as unknown as SupabaseComment[];
  },

  async create(postId: string, content: string, parentId?: string, mediaUrl?: string | null) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    /**
     * Belt-and-suspenders length enforcement. The DB has the same cap
     * (CHECK constraint `comments_content_length_300`) but trimming
     * here gives us a clean error message if a stale client somehow
     * tries to post a longer body — the server would otherwise reject
     * the row and the user would see a generic Postgres error.
     */
    const safeContent = content.slice(0, COMMENT_MAX_LENGTH).trim();
    const url = mediaUrl?.trim() || null;
    if (!safeContent && !url) throw new Error('Comment cannot be empty');

    const { data, error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        author_id: user.id,
        content: safeContent,
        parent_id: parentId ?? null,
        media_url: url,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Soft-delete a comment authored by the current user.
   *
   * Why soft delete instead of `DELETE`:
   *   - The `comments` table cascades on `parent_id`, so a hard delete
   *     would silently remove every reply under the deleted comment and
   *     leave a confusing hole in the conversation.
   *   - Soft delete keeps the row + its children intact; clients render
   *     a tombstone for the body and replies remain navigable.
   *
   * RLS:
   *   - The existing "Users can update own comments" policy
   *     (`auth.uid() = author_id`) is what gates this. No new policy
   *     needed — non-authors literally can't flip the `deleted_at`
   *     timestamp on someone else's row.
   */
  async softDelete(commentId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('comments')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', commentId)
      .eq('author_id', user.id);

    if (error) throw error;
  },

  /**
   * Author-only content edit. Refuses to flip the body on deleted rows
   * (we don't want a tombstoned comment silently un-tombstoning on
   * edit) and enforces the same `COMMENT_MAX_LENGTH` cap the create
   * path uses. The `trg_comments_stamp_edited_at` trigger (migration
   * 057) writes `edited_at = now()` for us whenever `content` drifts,
   * so callers don't need to pass a timestamp.
   *
   * RLS: the existing "Users can update own comments" policy gates
   * this by author_id — non-authors literally can't flip the body.
   */
  async update(commentId: string, content: string): Promise<SupabaseComment> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const safe = content.slice(0, COMMENT_MAX_LENGTH).trim();

    const { data: rowMeta, error: metaErr } = await supabase
      .from('comments')
      .select('media_url')
      .eq('id', commentId)
      .eq('author_id', user.id)
      .is('deleted_at', null)
      .maybeSingle();
    if (metaErr) throw metaErr;
    const hasMedia = !!(rowMeta as { media_url?: string | null } | null)?.media_url?.trim();
    if (!safe && !hasMedia) throw new Error('Comment cannot be empty');

    const { data, error } = await supabase
      .from('comments')
      .update({ content: safe })
      .eq('id', commentId)
      .eq('author_id', user.id)
      .is('deleted_at', null)
      .select(
        `
        id, post_id, parent_id, author_id, content, like_count, created_at, deleted_at, edited_at,
        media_url,
        reaction_heart_count, reaction_haha_count, reaction_wow_count, reaction_sad_count, reaction_angry_count,
        author:author_id(${PROFILE_SELECT_CREATOR_WITH_FRAME})
      `,
      )
      .single();

    if (error) throw error;
    return data as unknown as SupabaseComment;
  },

  /** Viewer’s reaction rows for this post’s comments (batch). */
  async getViewerReactionsForComments(
    userId: string,
    commentIds: string[],
  ): Promise<Partial<Record<string, PostReactionKind>>> {
    if (commentIds.length === 0) return {};
    const { data, error } = await supabase
      .from('comment_likes')
      .select('comment_id, reaction')
      .eq('user_id', userId)
      .in('comment_id', commentIds);
    if (error) throw error;
    const out: Partial<Record<string, PostReactionKind>> = {};
    for (const row of data ?? []) {
      const r = row as { comment_id: string; reaction: string };
      const k = normalizePostReactionKind(r.reaction);
      if (k) out[r.comment_id] = k;
    }
    return out;
  },

  /**
   * One reaction row per viewer per comment; `null` removes. Counts are maintained by trigger
   * {@code trg_comment_likes_sync_counts} (migration 144).
   */
  async setCommentReaction(commentId: string, kind: PostReactionKind | null): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    if (!kind) {
      const { error } = await supabase.from('comment_likes').delete().eq('user_id', user.id).eq('comment_id', commentId);
      if (error) throw error;
      return;
    }
    const { data: existing, error: exErr } = await supabase
      .from('comment_likes')
      .select('id')
      .eq('user_id', user.id)
      .eq('comment_id', commentId)
      .maybeSingle();
    if (exErr) throw exErr;
    if (existing) {
      const { error } = await supabase
        .from('comment_likes')
        .update({ reaction: kind })
        .eq('id', (existing as { id: string }).id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('comment_likes')
        .insert({ user_id: user.id, comment_id: commentId, reaction: kind });
      if (error) throw error;
    }
  },
};
