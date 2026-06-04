import { supabase } from '@/lib/supabase';
import type {
  Community,
  CircleReply,
  CircleThread,
  CircleThreadKind,
  CreatorSummary,
  RecentCircleActivity,
  TrendingTopic24h,
} from '@/types';
import { escapePostgrestIlike } from '@/lib/searchQuery';
import {
  finalizeCircleRepliesForViewer,
  finalizeCircleThreadsForViewer,
  redactCircleReplyForViewer,
  redactCircleThreadForViewer,
} from '@/lib/circleViewerPrivacy';
import { circleContentIsPubliclyVisible } from '@/lib/circleModeration';
import {
  hydrateReplyRowsWithAuthors,
  hydrateThreadRowsWithRelations,
} from '@/lib/postgrestViewerSafeEmbeds';
import { isDemoCatalogMediaUrl } from '@/utils/postPreviewMedia';
import { ANONYMOUS_PUBLIC_CREATOR_ID } from '@/lib/postViewerPrivacy';
import { getBlockRelationship } from './blocks';
import { communitiesService, rowToCommunity } from './communities';
import { profileRowToCreatorSummary, PROFILE_SELECT_CREATOR_WITH_FRAME } from './profileRowMapper';

/**
 * Previously omitted `pulse_tier` / `pulse_score_current`, which is why
 * Circle thread authors never rendered the tier badge even though the
 * select included the columns. Delegating to the shared mapper fixes
 * that automatically and keeps circle / feed / live in lockstep.
 */
function authorFromRow(a: any): CreatorSummary | undefined {
  if (!a) return undefined;
  return profileRowToCreatorSummary(a);
}

function firstTaggedCommunityId(communities: unknown): string | null {
  if (!Array.isArray(communities) || communities.length === 0) return null;
  const raw = String(communities[0]).trim();
  return raw || null;
}

function postListPreviewThumb(row: {
  thumbnail_url?: string | null;
  cover_alt_url?: string | null;
  media_url?: string | null;
}): string | undefined {
  const t = row.thumbnail_url?.trim();
  if (t && !isDemoCatalogMediaUrl(t)) return t;
  const c = row.cover_alt_url?.trim();
  if (c && !isDemoCatalogMediaUrl(c)) return c;
  const m = row.media_url?.trim();
  if (m && !isDemoCatalogMediaUrl(m) && /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(m)) return m;
  return undefined;
}

function rowToThread(row: any): CircleThread {
  const c = row.communities;
  return {
    id: row.id,
    circleId: row.community_id,
    circleSlug: c?.slug ?? '',
    circleName: typeof c?.name === 'string' ? c.name : undefined,
    authorId: row.author_id,
    author: authorFromRow(row.author),
    kind: row.kind as CircleThreadKind,
    title: row.title,
    body: row.body ?? '',
    mediaThumbUrl: row.media_thumb_url ?? undefined,
    linkedPostId: row.linked_post_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
    replyCount: row.reply_count ?? 0,
    reactionCount: row.reaction_count ?? 0,
    shareCount: row.share_count ?? 0,
    moderationStatus: row.moderation_status ?? 'active',
  };
}

function rowToReply(row: any): CircleReply {
  const status = row.moderation_status ?? 'active';
  const removed = !circleContentIsPubliclyVisible(status);
  return {
    id: row.id,
    threadId: row.thread_id,
    authorId: row.author_id,
    author: authorFromRow(row.author),
    body: removed ? '' : row.body,
    createdAt: row.created_at,
    reactionCount: row.reaction_count ?? 0,
    moderationStatus: status,
    isModerationRemoved: removed,
  };
}

// Include denormalized `pulse_tier` / `pulse_score_current` so circle
// thread authors render the Pulse tier badge (the columns are added
// by migration 059 on `profiles`).
const THREAD_SELECT = `
  *,
  communities(id, slug, name),
  author:author_id(${PROFILE_SELECT_CREATOR_WITH_FRAME})
`;

/** Plain columns only — PostgREST embeds fail on definer views; hydrate after fetch. */
const THREAD_SELECT_VIEWER = '*';

/** Read path masks Confessions author_id (migration 218). Writes stay on base table. */
function fromCircleThreadsViewerSafe() {
  return supabase.from('circle_threads_viewer_safe');
}

function fromCircleRepliesViewerSafe() {
  return supabase.from('circle_replies_viewer_safe');
}

export const circleThreadsDb = {
  /**
   * Creates a Questions-tab discussion row (`circle_threads`). Wall-only composer
   * flows use {@link postsService.create} instead.
   */
  async createThread(params: {
    communityId: string;
    authorId: string;
    kind: CircleThreadKind;
    title: string;
    body: string;
    mediaThumbUrl?: string | null;
    linkedPostId?: string | null;
  }): Promise<CircleThread> {
    const cid = (params.communityId ?? '').trim();
    const aid = (params.authorId ?? '').trim();
    if (!cid || !aid) throw new Error('Missing community or author');
    const title = (params.title.trim() || 'Discussion').slice(0, 500);
    const body = params.body.trim().slice(0, 12000);
    const { data, error } = await supabase
      .from('circle_threads')
      .insert({
        community_id: cid,
        author_id: aid,
        kind: params.kind,
        title,
        body,
        media_thumb_url: params.mediaThumbUrl?.trim() || null,
        linked_post_id: params.linkedPostId ?? null,
      })
      .select(THREAD_SELECT)
      .single();
    if (error || !data) throw error ?? new Error('Failed to create discussion');
    return rowToThread(data);
  },

  async listByCommunityId(
    communityId: string,
    opts?: { limit?: number; cursor?: string | null; viewerId?: string | null },
  ): Promise<CircleThread[]> {
    const id = (communityId ?? '').trim();
    if (!id) return [];
    const limit = opts?.limit ?? 48;
    const cursor = opts?.cursor?.trim() || null;

    let q = fromCircleThreadsViewerSafe()
      .select(THREAD_SELECT_VIEWER)
      .eq('community_id', id)
      .eq('moderation_status', 'active')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (cursor) {
      q = q.lt('created_at', cursor);
    }

    const { data, error } = await q;

    if (error) throw error;
    const hydrated = await hydrateThreadRowsWithRelations(data ?? []);
    return finalizeCircleThreadsForViewer(hydrated.map(rowToThread), opts?.viewerId);
  },

  async listBySlug(slug: string, viewerId?: string | null): Promise<CircleThread[]> {
    const comm = await communitiesService.getBySlug(slug);
    if (!comm) return [];
    const { data, error } = await fromCircleThreadsViewerSafe()
      .select(THREAD_SELECT_VIEWER)
      .eq('community_id', comm.id)
      .eq('moderation_status', 'active')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    const hydrated = await hydrateThreadRowsWithRelations(data ?? []);
    return finalizeCircleThreadsForViewer(hydrated.map(rowToThread), viewerId);
  },

  async getById(id: string, viewerId?: string | null): Promise<CircleThread | null> {
    const { data, error } = await fromCircleThreadsViewerSafe()
      .select(THREAD_SELECT_VIEWER)
      .eq('id', id)
      .eq('moderation_status', 'active')
      .is('deleted_at', null)
      .maybeSingle();
    if (error || !data) return null;
    const [hydrated] = await hydrateThreadRowsWithRelations([data]);
    return redactCircleThreadForViewer(rowToThread(hydrated), viewerId);
  },

  async listReplies(
    threadId: string,
    opts?: {
      limit?: number;
      cursor?: string | null;
      viewerId?: string | null;
      thread?: CircleThread | null;
    },
  ): Promise<CircleReply[]> {
    const limit = opts?.limit ?? 40;
    const cursor = opts?.cursor?.trim() || null;
    const viewerId = opts?.viewerId ?? null;

    let q = fromCircleRepliesViewerSafe()
      .select('*')
      .eq('thread_id', threadId)
      .eq('moderation_status', 'active')
      .order('created_at', { ascending: true })
      .limit(limit);

    if (cursor) {
      q = q.gt('created_at', cursor);
    }

    const { data, error } = await q;

    if (error) throw error;
    const hydrated = await hydrateReplyRowsWithAuthors(data ?? []);
    const replies = hydrated.map(rowToReply);
    const ctx = opts?.thread ?? (await this.getById(threadId, viewerId));
    if (!ctx) return replies;
    return finalizeCircleRepliesForViewer(replies, ctx, viewerId);
  },

  /** @deprecated Use circleModerationService.removeThread */
  async softDeleteThread(threadId: string, moderatorId: string): Promise<void> {
    const { circleModerationService } = await import('./circleModeration');
    await circleModerationService.removeThread(threadId, 'legacy soft delete');
    void moderatorId;
  },

  /**
   * Threads the user started or replied to, **plus** circle wall posts they
   * commented on (or created) in a community — merged by recency.
   */
  async listRecentInvolvingUser(userId: string, limit = 5): Promise<RecentCircleActivity[]> {
    const uid = (userId ?? '').trim();
    if (!uid) return [];

    const [{ data: authored }, { data: threadReplies }, { data: commentRows }, { data: authoredPosts }] =
      await Promise.all([
        supabase.from('circle_threads').select('id, created_at, updated_at').eq('author_id', uid),
        supabase
          .from('circle_replies')
          .select('thread_id, created_at')
          .eq('author_id', uid)
          .order('created_at', { ascending: false })
          .limit(400),
        supabase
          .from('comments')
          .select(
            'post_id, created_at, posts!inner(id, caption, comment_count, communities, thumbnail_url, cover_alt_url, media_url)',
          )
          .eq('author_id', uid)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(400),
        supabase
          .from('posts')
          .select('id, caption, comment_count, communities, created_at, edited_at, thumbnail_url, cover_alt_url, media_url')
          .eq('creator_id', uid)
          .limit(200),
      ]);

    const threadLastMs = new Map<string, number>();
    for (const row of authored ?? []) {
      const id = String(row.id);
      const t = Math.max(
        new Date(row.created_at).getTime(),
        new Date(row.updated_at).getTime(),
      );
      threadLastMs.set(id, Math.max(threadLastMs.get(id) ?? 0, t));
    }
    for (const row of threadReplies ?? []) {
      const tid = String(row.thread_id);
      const t = new Date(row.created_at).getTime();
      threadLastMs.set(tid, Math.max(threadLastMs.get(tid) ?? 0, t));
    }

    type WallEv = {
      ms: number;
      communityId: string;
      title: string;
      commentCount: number;
      previewThumbUrl?: string;
    };
    const wallByPost = new Map<string, WallEv>();

    const touchWall = (postId: string, ms: number, ev: Omit<WallEv, 'ms'>) => {
      const prev = wallByPost.get(postId);
      if (!prev || ms > prev.ms) {
        wallByPost.set(postId, {
          ms,
          communityId: ev.communityId,
          title: ev.title,
          commentCount: ev.commentCount,
          previewThumbUrl: ev.previewThumbUrl ?? prev?.previewThumbUrl,
        });
      }
    };

    for (const row of commentRows ?? []) {
      const p = row.posts as {
        caption?: string | null;
        comment_count?: number;
        communities?: string[];
        thumbnail_url?: string | null;
        cover_alt_url?: string | null;
        media_url?: string | null;
      } | null;
      if (!p) continue;
      const cid = firstTaggedCommunityId(p.communities);
      if (!cid) continue;
      const pid = String(row.post_id);
      const ms = new Date(row.created_at).getTime();
      const title = (p.caption ?? '').trim() || 'Circle post';
      touchWall(pid, ms, {
        communityId: cid,
        title,
        commentCount: typeof p.comment_count === 'number' ? p.comment_count : 0,
        previewThumbUrl: postListPreviewThumb(p),
      });
    }

    for (const row of authoredPosts ?? []) {
      const cid = firstTaggedCommunityId(row.communities);
      if (!cid) continue;
      const ms = Math.max(
        new Date(row.created_at).getTime(),
        row.edited_at ? new Date(row.edited_at).getTime() : 0,
      );
      const pid = String(row.id);
      const title = (row.caption ?? '').trim() || 'Your circle post';
      touchWall(pid, ms, {
        communityId: cid,
        title,
        commentCount: typeof row.comment_count === 'number' ? row.comment_count : 0,
        previewThumbUrl: postListPreviewThumb(row),
      });
    }

    type MergeRow =
      | { kind: 'thread'; ms: number; threadId: string }
      | {
          kind: 'wall_post';
          ms: number;
          postId: string;
          communityId: string;
          title: string;
          commentCount: number;
          previewThumbUrl?: string;
        };

    const threadCandidates: MergeRow[] = [...threadLastMs.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 36)
      .map(([threadId, ms]) => ({ kind: 'thread' as const, threadId, ms }));

    const wallCandidates: MergeRow[] = [...wallByPost.entries()]
      .sort((a, b) => b[1].ms - a[1].ms)
      .slice(0, 36)
      .map(([postId, v]) => ({
        kind: 'wall_post' as const,
        postId,
        ms: v.ms,
        communityId: v.communityId,
        title: v.title,
        commentCount: v.commentCount,
        previewThumbUrl: v.previewThumbUrl,
      }));

    const merged = [...threadCandidates, ...wallCandidates].sort((a, b) => b.ms - a.ms).slice(0, limit);

    if (merged.length === 0) return [];

    const threadIdsToLoad = merged.filter((m): m is Extract<MergeRow, { kind: 'thread' }> => m.kind === 'thread').map(
      (m) => m.threadId,
    );
    const wallCommunityIds = [
      ...new Set(
        merged
          .filter((m): m is Extract<MergeRow, { kind: 'wall_post' }> => m.kind === 'wall_post')
          .map((m) => m.communityId),
      ),
    ];

    const [threadFetch, commFetch] = await Promise.all([
      threadIdsToLoad.length
        ? fromCircleThreadsViewerSafe().select(THREAD_SELECT_VIEWER).in('id', threadIdsToLoad)
        : Promise.resolve({ data: [] as unknown[], error: null as null }),
      wallCommunityIds.length
        ? supabase.from('communities').select('id, slug, name').in('id', wallCommunityIds)
        : Promise.resolve({ data: [] as unknown[], error: null as null }),
    ]);

    if (threadFetch.error) throw threadFetch.error;
    if (commFetch.error) throw commFetch.error;

    const threadById = new Map<string, CircleThread>();
    const hydratedThreads = await hydrateThreadRowsWithRelations((threadFetch.data ?? []) as any[]);
    for (const raw of hydratedThreads) {
      threadById.set(String(raw.id), rowToThread(raw));
    }

    const commById = new Map<string, { slug: string; name: string }>();
    for (const raw of commFetch.data ?? []) {
      const r = raw as { id: string; slug: string; name: string };
      commById.set(String(r.id), { slug: r.slug, name: r.name });
    }

    const out: RecentCircleActivity[] = [];
    for (const m of merged) {
      if (m.kind === 'thread') {
        const thread = threadById.get(m.threadId);
        if (!thread) continue;
        out.push({ kind: 'thread', thread, lastInvolvedAt: new Date(m.ms).toISOString() });
      } else {
        const comm = commById.get(m.communityId);
        if (!comm?.slug) continue;
        const preview = m.title.slice(0, 100);
        out.push({
          kind: 'wall_post',
          postId: m.postId,
          communitySlug: comm.slug,
          communityName: comm.name,
          title: m.title,
          preview: preview.length >= 100 ? `${preview}…` : preview,
          commentCount: m.commentCount,
          lastInvolvedAt: new Date(m.ms).toISOString(),
          previewThumbUrl: m.previewThumbUrl,
        });
      }
    }
    return out;
  },

  async getThreadReactionForUser(threadId: string, userId: string | null): Promise<boolean> {
    const uid = (userId ?? '').trim();
    if (!uid) return false;
    const { data, error } = await supabase
      .from('circle_thread_reactions')
      .select('id')
      .eq('thread_id', threadId)
      .eq('user_id', uid)
      .maybeSingle();
    if (error) {
      if (__DEV__) console.warn('[circleThreadsDb.getThreadReactionForUser]', error.message);
      return false;
    }
    return !!data;
  },

  async toggleThreadReaction(threadId: string): Promise<{ reacted: boolean }> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { data: existing, error: readErr } = await supabase
      .from('circle_thread_reactions')
      .select('id')
      .eq('thread_id', threadId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (readErr) throw readErr;
    if (existing?.id) {
      const { error } = await supabase.from('circle_thread_reactions').delete().eq('id', existing.id);
      if (error) throw error;
      return { reacted: false };
    }
    const { error } = await supabase.from('circle_thread_reactions').insert({
      thread_id: threadId,
      user_id: user.id,
      reaction: 'heart',
    });
    if (error) throw error;
    return { reacted: true };
  },

  async addReply(threadId: string, body: string): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Block guard: a block in either direction with the (non-anonymous) thread
    // author forbids replying. Confession authors are masked to the anonymous
    // sentinel by the viewer-safe view, so they're skipped (RLS still governs
    // membership/visibility for those rooms).
    const { data: threadRow } = await fromCircleThreadsViewerSafe()
      .select('author_id')
      .eq('id', threadId)
      .maybeSingle();
    const authorId = threadRow
      ? String((threadRow as { author_id?: string | null }).author_id ?? '')
      : '';
    if (authorId && authorId !== user.id && authorId !== ANONYMOUS_PUBLIC_CREATOR_ID) {
      const block = await getBlockRelationship(user.id, authorId);
      if (block === 'viewer_blocked' || block === 'blocked_by_viewer') {
        throw new Error('You cannot reply to this thread.');
      }
    }

    const { error } = await supabase.from('circle_replies').insert({
      thread_id: threadId,
      author_id: user.id,
      body: body.trim(),
    });
    if (error) throw error;
  },

  /** Communities whose circle threads match the keyword (title/body). */
  async searchCommunitiesByThreadKeyword(query: string): Promise<Community[]> {
    const raw = query.trim();
    if (!raw) return [];
    const s = escapePostgrestIlike(raw);
    const { data, error } = await fromCircleThreadsViewerSafe()
      .select('community_id')
      .eq('moderation_status', 'active')
      .is('deleted_at', null)
      .or(`title.ilike.%${s}%,body.ilike.%${s}%`)
      .limit(50);

    if (error) throw error;
    const communityIds = [
      ...new Set((data ?? []).map((row) => String((row as { community_id: string }).community_id)).filter(Boolean)),
    ];
    if (communityIds.length === 0) return [];

    const { data: communities, error: commErr } = await supabase
      .from('communities')
      .select('id, slug, name, icon, description, accent_color, banner_url, member_count, post_count, categories, trending_topics')
      .in('id', communityIds);
    if (commErr) throw commErr;

    const seen = new Set<string>();
    const out: Community[] = [];
    for (const c of communities ?? []) {
      if (!c?.id || seen.has(String(c.id))) continue;
      seen.add(String(c.id));
      out.push(rowToCommunity(c));
    }
    return out;
  },

  /**
   * Threads with activity in the last 24h (new thread or reply bumps `updated_at`),
   * across all communities. Caller merges with posts and takes top N by score.
   */
  async trendingThreadCandidates24h(maxFetch = 100): Promise<TrendingTopic24h[]> {
    return this.trendingThreadCandidatesSince(24 * 60 * 60 * 1000, maxFetch);
  },

  /**
   * Thread candidates within `windowMs` of now, or (when `windowMs <= 0`)
   * the most recently active threads overall. Used by the Circles landing
   * page to guarantee 3 trending topics even when the last 24 hours are
   * thin — the caller walks 24h → 7d → 30d → all-time until we have enough.
   */
  async trendingThreadCandidatesSince(
    windowMs: number,
    maxFetch = 100,
  ): Promise<TrendingTopic24h[]> {
    let q = fromCircleThreadsViewerSafe()
      .select(THREAD_SELECT_VIEWER)
      .eq('moderation_status', 'active')
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .limit(maxFetch);

    if (windowMs > 0) {
      const since = new Date(Date.now() - windowMs).toISOString();
      q = q.gte('updated_at', since);
    }

    const { data, error } = await q;
    if (error) throw error;
    const hydrated = await hydrateThreadRowsWithRelations(data ?? []);
    return hydrated.map((row: any) => {
      const t = rowToThread(row);
      return {
        id: `trend-thread-${t.id}`,
        threadId: t.id,
        circleId: t.circleId,
        circleSlug: t.circleSlug,
        circleName: row.communities?.name ?? t.circleSlug,
        title: t.title,
        preview: (t.body ?? '').slice(0, 140),
        replyCount: t.replyCount,
        reactionCount: t.reactionCount,
        shareCount: t.shareCount ?? 0,
        lastActiveAt: t.updatedAt ?? t.createdAt,
      };
    });
  },
};
