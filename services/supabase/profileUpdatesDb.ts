import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';
import type {
  EligibleCircleDiscussion,
  Post,
  ProfileUpdate,
  ProfileUpdateComment,
  ProfileUpdateType,
} from '@/types';
import { postsService } from './posts';
import {
  PROFILE_SELECT_MY_PULSE_COMMENT_AUTHOR,
  profileRowToCreatorSummary,
} from './profileRowMapper';

const PROFILE_UPDATE_COMMENT_SELECT = `id, update_id, author_id, parent_id, content, media_url, created_at, edited_at, profiles(${PROFILE_SELECT_MY_PULSE_COMMENT_AUTHOR})`;

function isProfileSurfaceAccessDenied(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  if (code === '42501' || code === 'PGRST301') return true;
  const msg = String((error as { message?: string })?.message ?? '').toLowerCase();
  return msg.includes('row-level security') || msg.includes('permission denied');
}

function rowToProfileUpdateComment(row: any): ProfileUpdateComment {
  const p = row.profiles;
  const s = p ? profileRowToCreatorSummary(p) : null;
  return {
    id: row.id,
    updateId: row.update_id,
    authorId: row.author_id,
    parentId: row.parent_id ?? undefined,
    content: row.content,
    mediaUrl: row.media_url ?? undefined,
    createdAt: row.created_at,
    editedAt: row.edited_at ?? undefined,
    authorName: s?.displayName,
    authorUsername: s?.username,
    authorAvatarUrl: s?.avatarUrl,
    authorPulseTier: s?.pulseTier,
    authorPulseScoreCurrent: s?.pulseScoreCurrent,
    authorPulseAvatarFrame: s?.pulseAvatarFrame ?? null,
  };
}

function rowToProfileUpdate(row: any, liked?: boolean): ProfileUpdate {
  const picsFromArray = Array.isArray(row.pics_urls)
    ? row.pics_urls.filter((v: unknown): v is string => typeof v === 'string' && v.length > 0)
    : [];
  const picsUrls = picsFromArray.length > 0 ? picsFromArray : undefined;

  return {
    id: row.id,
    userId: row.user_id,
    type: row.type as ProfileUpdateType,
    content: row.content,
    previewText: row.preview_text ?? undefined,
    mood: row.mood ?? undefined,
    linkedPostId: row.linked_post_id ?? undefined,
    linkedCircleId: row.linked_circle_id ?? undefined,
    linkedCircleSlug: row.linked_circle_slug ?? undefined,
    linkedDiscussionTitle: row.linked_discussion_title ?? undefined,
    linkedThreadId: row.linked_thread_id ?? undefined,
    linkedLiveId: row.linked_live_id ?? undefined,
    mediaThumb: row.media_thumb ?? undefined,
    linkedUrl: row.linked_url ?? undefined,
    picsUrls,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
    /**
     * `edited_at` is server-stamped by the trigger installed in
     * migration 057 whenever the author changes the body. Separate
     * from `updatedAt` so engagement / pin updates don't flag a post
     * as edited in the UI.
     */
    editedAt: row.edited_at ?? undefined,
    likeCount: row.like_count ?? 0,
    commentCount: row.comment_count ?? 0,
    shareCount: row.share_count ?? 0,
    liked,
    isPinned: row.is_pinned === true,
  };
}

/**
 * Fetch the set of update IDs that `viewerId` has already liked, scoped
 * to the `updateIds` passed in. Returns an empty Set when there's no
 * viewer (anonymous visit) or zero IDs — callers use this to hydrate the
 * viewer-specific `liked` flag on each ProfileUpdate without N+1 queries.
 */
async function fetchLikedSet(
  viewerId: string | null | undefined,
  updateIds: string[],
): Promise<Set<string>> {
  if (!viewerId || updateIds.length === 0) return new Set();
  const { data, error } = await supabase
    .from('profile_update_likes')
    .select('update_id')
    .eq('user_id', viewerId)
    .in('update_id', updateIds);
  if (error) return new Set();
  return new Set((data ?? []).map((r: any) => r.update_id as string));
}

export type AddProfileUpdateRow = {
  type: ProfileUpdateType;
  content: string;
  preview_text?: string | null;
  mood?: string | null;
  linked_post_id?: string | null;
  linked_circle_id?: string | null;
  linked_circle_slug?: string | null;
  linked_discussion_title?: string | null;
  linked_thread_id?: string | null;
  linked_live_id?: string | null;
  media_thumb?: string | null;
  linked_url?: string | null;
  pics_urls?: string[] | null;
};

export const profileUpdatesDb = {
  /**
   * Returns up to `limit` of a user's most recent profile updates, with
   * the pinned row (if any) always first. The partial unique index on
   * `is_pinned` guarantees at most one pinned row per user, so this
   * ordering is deterministic. The pinned row counts against `limit` —
   * the remaining `limit - 1` slots are the newest unpinned rows, which
   * matches the product rule: "if one is pinned the other four still
   * follow the newest-wins eviction".
   */
  async listForUser(
    userId: string,
    limit = 5,
    viewerId?: string | null,
  ): Promise<ProfileUpdate[]> {
    const { data, error } = await supabase
      .from('profile_updates')
      .select('*')
      .eq('user_id', userId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      if (isProfileSurfaceAccessDenied(error)) return [];
      throw error;
    }
    const rows = data ?? [];
    const likedSet = await fetchLikedSet(
      viewerId ?? null,
      rows.map((r: any) => r.id as string),
    );
    return rows.map((r: any) => rowToProfileUpdate(r, likedSet.has(r.id)));
  },

  /**
   * Pics-bearing profile updates for Media Hub — not capped at five like the
   * My Pulse activity rail. Viewer-scoped `liked` hydration included.
   */
  async listPicsForMediaHub(
    userId: string,
    limit = 40,
    viewerId?: string | null,
  ): Promise<ProfileUpdate[]> {
    const { data, error } = await supabase
      .from('profile_updates')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(Math.min(limit * 3, 120));

    if (error) {
      if (isProfileSurfaceAccessDenied(error)) return [];
      throw error;
    }

    const rows = (data ?? []).filter((r: any) => {
      const urls = r.pics_urls;
      if (Array.isArray(urls) && urls.some((u: unknown) => String(u ?? '').trim())) {
        return true;
      }
      const t = String(r.type ?? '').trim();
      return t === 'pics';
    });

    const trimmed = rows.slice(0, limit);
    const likedSet = await fetchLikedSet(
      viewerId ?? null,
      trimmed.map((r: any) => r.id as string),
    );
    return trimmed.map((r: any) => rowToProfileUpdate(r, likedSet.has(r.id)));
  },

  /**
   * Pin a single profile update to the top of its owner's My Pulse.
   * Delegates to the `pin_profile_update` RPC which (a) verifies the
   * caller owns the row, (b) clears any existing pin for that user, and
   * (c) sets the new pin — all inside one server-side transaction so we
   * never violate the partial unique index mid-flight.
   */
  async pin(updateId: string): Promise<void> {
    // `as never` matches the pattern used elsewhere in this codebase for
    // RPCs that aren't in the generated Supabase types yet
    // (see `services/supabase/posts.ts` for the same cast). The RPC itself
    // is defined in migration 050 and runs with SECURITY DEFINER to
    // enforce ownership on the server.
    const { error } = await supabase.rpc('pin_profile_update', { p_update_id: updateId });
    if (error) throw error;
  },

  /** Inverse of {@link pin}. Clears the pin for a row the caller owns. */
  async unpin(updateId: string): Promise<void> {
    const { error } = await supabase.rpc('unpin_profile_update', { p_update_id: updateId });
    if (error) throw error;
  },

  async getById(id: string, viewerId?: string | null): Promise<ProfileUpdate | null> {
    const { data, error } = await supabase.from('profile_updates').select('*').eq('id', id).maybeSingle();
    if (error) {
      if (isProfileSurfaceAccessDenied(error)) return null;
      return null;
    }
    if (!data) return null;
    const likedSet = await fetchLikedSet(viewerId ?? null, [data.id]);
    return rowToProfileUpdate(data, likedSet.has(data.id));
  },

  /**
   * Flip the viewer's "Pulsed" state on a profile_update. Delegates to
   * the `toggle_profile_update_like` RPC so the insert / delete and
   * unique-violation handling happen atomically on the server — the
   * same pattern `postsService.toggleLike` uses, but behind a single
   * round-trip so the client doesn't have to read-then-write. Returns
   * the new liked state.
   */
  async toggleLike(updateId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('toggle_profile_update_like', {
      p_update_id: updateId,
    });
    if (error) throw error;
    return Boolean(data);
  },

  /**
   * Load the flat comment list for a profile_update, newest last so the
   * client can render top-down like a conversation (oldest-at-top is the
   * convention the rest of the app uses for comment threads). Author
   * profile fields come along in the same query so we don't have to
   * chase N more round-trips to render avatars / names.
   */
  async listComments(updateId: string): Promise<ProfileUpdateComment[]> {
    const { data, error } = await supabase
      .from('profile_update_comments')
      .select(PROFILE_UPDATE_COMMENT_SELECT)
      .eq('update_id', updateId)
      .order('created_at', { ascending: true });

    if (error) {
      if (isProfileSurfaceAccessDenied(error)) return [];
      throw error;
    }
    return (data ?? []).map(rowToProfileUpdateComment);
  },

  async addComment(
    updateId: string,
    authorId: string,
    content: string,
    parentId?: string | null,
    mediaUrl?: string | null,
  ): Promise<ProfileUpdateComment> {
    const trimmed = content.trim();
    const media = mediaUrl?.trim() ?? null;
    if (!trimmed && !media) throw new Error('Comment cannot be empty');

    const { data, error } = await supabase
      .from('profile_update_comments')
      .insert({
        update_id: updateId,
        author_id: authorId,
        content: trimmed,
        parent_id: parentId ?? null,
        media_url: media,
      })
      .select(PROFILE_UPDATE_COMMENT_SELECT)
      .single();

    if (error || !data) throw error ?? new Error('Failed to post comment');

    return rowToProfileUpdateComment(data as any);
  },

  async deleteComment(commentId: string): Promise<void> {
    const { error } = await supabase
      .from('profile_update_comments')
      .delete()
      .eq('id', commentId);
    if (error) throw error;
  },

  /**
   * Author-only edit for a My Pulse comment. Relies on migration 057
   * for two things: (1) the missing UPDATE RLS policy so this call
   * doesn't get rejected, and (2) the BEFORE-UPDATE trigger that
   * stamps `edited_at = now()` whenever `content` drifts. We return
   * the updated row so the caller can reconcile its cache without an
   * extra round-trip.
   */
  async updateComment(
    commentId: string,
    authorId: string,
    content: string,
  ): Promise<ProfileUpdateComment> {
    const trimmed = content.trim();

    const { data: existing, error: loadErr } = await supabase
      .from('profile_update_comments')
      .select('media_url')
      .eq('id', commentId)
      .eq('author_id', authorId)
      .maybeSingle();

    if (loadErr) throw loadErr;
    if (!existing) throw new Error('Comment not found');

    const hasMedia = !!(existing as { media_url?: string | null }).media_url?.trim();
    if (!trimmed && !hasMedia) throw new Error('Comment cannot be empty');

    const { data, error } = await supabase
      .from('profile_update_comments')
      .update({ content: trimmed })
      .eq('id', commentId)
      .eq('author_id', authorId)
      .select(PROFILE_UPDATE_COMMENT_SELECT)
      .single();

    if (error || !data) throw error ?? new Error('Failed to edit comment');

    return rowToProfileUpdateComment(data as any);
  },

  async insert(userId: string, payload: AddProfileUpdateRow): Promise<ProfileUpdate> {
    const { data, error } = await supabase
      .from('profile_updates')
      .insert({
        user_id: userId,
        type: payload.type,
        content: payload.content,
        preview_text: payload.preview_text ?? null,
        mood: payload.mood ?? null,
        linked_post_id: payload.linked_post_id ?? null,
        linked_circle_id: payload.linked_circle_id ?? null,
        linked_circle_slug: payload.linked_circle_slug ?? null,
        linked_discussion_title: payload.linked_discussion_title ?? null,
        linked_thread_id: payload.linked_thread_id ?? null,
        linked_live_id: payload.linked_live_id ?? null,
        media_thumb: payload.media_thumb ?? null,
        linked_url: payload.linked_url ?? null,
        pics_urls:
          payload.pics_urls && payload.pics_urls.length > 0
            ? payload.pics_urls
            : null,
      })
      .select('*')
      .single();

    if (error || !data) throw error ?? new Error('Insert failed');
    return rowToProfileUpdate(data);
  },

  async deleteForUser(updateId: string, userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('profile_updates')
      .delete()
      .eq('id', updateId)
      .eq('user_id', userId)
      .select('id');
    if (error) throw error;
    return (data?.length ?? 0) > 0;
  },

  /**
   * Author-only edit for a My Pulse row. We scope the update to the
   * owner (via `.eq('user_id', userId)`) so the RLS policy on
   * profile_updates never receives a cross-user write. The caller
   * hands us a partial body patch (content / mood / linked URL /
   * preview / title) — non-body fields stay immutable here.
   *
   * `edited_at` is written by the BEFORE-UPDATE trigger installed in
   * migration 057 whenever any tracked body field drifts, so the
   * returned row comes back with a fresh timestamp and the viewer's
   * liked flag re-hydrated.
   */
  async updateForUser(
    updateId: string,
    userId: string,
    patch: {
      content?: string;
      previewText?: string;
      linkedUrl?: string;
      linkedDiscussionTitle?: string;
      mood?: string;
    },
    viewerId?: string | null,
  ): Promise<ProfileUpdate> {
    /**
     * Only forward fields the caller explicitly provided. A missing
     * key means "don't touch that column" — we must NOT null it out
     * just because the caller omitted it (that would erase the mood
     * or linked URL on a plain text edit, for example).
     */
    const updates: Record<string, string | null> = {};
    if (Object.prototype.hasOwnProperty.call(patch, 'content')) {
      const content = (patch.content ?? '').trim();
      if (!content) throw new Error('Content cannot be empty');
      updates.content = content;
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'previewText')) {
      updates.preview_text = patch.previewText?.trim() || null;
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'linkedUrl')) {
      updates.linked_url = patch.linkedUrl?.trim() || null;
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'linkedDiscussionTitle')) {
      updates.linked_discussion_title = patch.linkedDiscussionTitle?.trim() || null;
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'mood')) {
      updates.mood = patch.mood?.trim() || null;
    }

    if (Object.keys(updates).length === 0) {
      /**
       * Nothing to write; just re-hydrate and return the existing row
       * so callers still get a consistent `ProfileUpdate` shape back
       * (same pattern as `getById` with a viewer).
       */
      const existing = await this.getById(updateId, viewerId);
      if (!existing) throw new Error('Update not found');
      return existing;
    }

    const { data, error } = await supabase
      .from('profile_updates')
      .update(updates as Database['public']['Tables']['profile_updates']['Update'])
      .eq('id', updateId)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error || !data) throw error ?? new Error('Update failed');

    const liked = viewerId
      ? (await fetchLikedSet(viewerId, [updateId])).has(updateId)
      : undefined;
    return rowToProfileUpdate(data, liked);
  },

  async eligiblePosts(userId: string): Promise<Post[]> {
    return postsService.getByUser(userId, userId).then((list) =>
      list
        .filter((p) => p.type === 'video' || p.type === 'image' || !!p.mediaUrl?.trim())
        .slice(0, 24),
    );
  },

  async eligibleCircleDiscussions(userId: string): Promise<EligibleCircleDiscussion[]> {
    const uid = (userId ?? '').trim();
    if (!uid) return [];

    const { data: memberships, error: memErr } = await supabase
      .from('community_members')
      .select('community_id')
      .eq('user_id', uid);
    if (memErr) throw memErr;

    const communityIds = [...new Set((memberships ?? []).map((m) => String((m as { community_id: string }).community_id)).filter(Boolean))];
    if (communityIds.length === 0) return [];

    const { data, error } = await supabase
      .from('circle_threads_viewer_safe')
      .select('id, title, reply_count, updated_at, created_at, community_id')
      .in('community_id', communityIds)
      .eq('moderation_status', 'active')
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .limit(24);

    if (error) throw error;
    const rows = data ?? [];
    if (rows.length === 0) return [];

    const { data: communities, error: commErr } = await supabase
      .from('communities')
      .select('id, slug, name')
      .in('id', communityIds);
    if (commErr) throw commErr;

    const commById = new Map((communities ?? []).map((c: { id: string; slug: string; name: string }) => [c.id, c]));

    return rows.map((row: any) => {
      const c = commById.get(row.community_id);
      return {
        id: row.id,
        circleSlug: c?.slug ?? '',
        circleName: c?.name ?? 'Circle',
        title: row.title,
        replyCount: row.reply_count ?? 0,
        lastActiveAt: row.updated_at ?? row.created_at,
      };
    });
  },
};
