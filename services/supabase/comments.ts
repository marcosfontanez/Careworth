import { supabase } from '@/lib/supabase';
import { COMMENT_MAX_LENGTH } from '@/constants';
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
        author:author_id(${PROFILE_SELECT_CREATOR_WITH_FRAME})
      `,
      )
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data ?? []) as unknown as SupabaseComment[];
  },

  async create(postId: string, content: string, parentId?: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    /**
     * Belt-and-suspenders length enforcement. The DB has the same cap
     * (CHECK constraint `comments_content_length_300`) but trimming
     * here gives us a clean error message if a stale client somehow
     * tries to post a longer body — the server would otherwise reject
     * the row and the user would see a generic Postgres error.
     */
    const safeContent = content.slice(0, COMMENT_MAX_LENGTH);

    const { data, error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        author_id: user.id,
        content: safeContent,
        parent_id: parentId ?? null,
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
    if (!safe) throw new Error('Comment cannot be empty');

    const { data, error } = await supabase
      .from('comments')
      .update({ content: safe })
      .eq('id', commentId)
      .eq('author_id', user.id)
      .is('deleted_at', null)
      .select(
        `
        id, post_id, parent_id, author_id, content, like_count, created_at, deleted_at, edited_at,
        author:author_id(${PROFILE_SELECT_CREATOR_WITH_FRAME})
      `,
      )
      .single();

    if (error) throw error;
    return data as unknown as SupabaseComment;
  },

  async likeComment(commentId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('comment_likes')
      .upsert({ comment_id: commentId, user_id: user.id });

    if (!error) {
      await supabase.rpc('increment_comment_likes', { comment_id: commentId });
    }
  },

  async unlikeComment(commentId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    await supabase
      .from('comment_likes')
      .delete()
      .eq('comment_id', commentId)
      .eq('user_id', user.id);
  },
};
