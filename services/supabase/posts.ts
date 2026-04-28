import { supabase } from '@/lib/supabase';
import { finalizePostsForViewer } from '@/lib/postViewerPrivacy';
import { mergePinnedCommunityPosts, type CommunityPostPinRow } from '@/lib/communityPostPins';
import type { Post, FeedType, PostType, SoundLibraryRow, ViralSoundRow } from '@/types';
import { escapePostgrestIlike } from '@/lib/searchQuery';
import { feedSignalsService } from '@/services/supabase/feedSignals';
import { profileRowToCreatorSummary, unknownCreatorSummary } from '@/services/supabase/profileRowMapper';

function normalizePostType(raw: unknown): PostType {
  const s = String(raw ?? 'text').toLowerCase();
  if (s === 'video' || s === 'image' || s === 'text' || s === 'discussion' || s === 'confession') return s;
  return 'text';
}

/** @deprecated Use `profileRowToCreatorSummary` from `./profileRowMapper`. */
const rowToCreator = profileRowToCreatorSummary;

function normalizeMediaUrl(raw: unknown): string | undefined {
  if (raw == null) return undefined;
  let s = String(raw).trim();
  if (s.length === 0) return undefined;
  if (s.startsWith('http://')) s = `https://${s.slice(7)}`;
  return s;
}

/** DB + RPC expect exact tokens: forYou, following, topToday, friends — not "For You". */
function normalizeFeedTypeEligibleTags(raw: unknown): string[] {
  const arr = Array.isArray(raw) ? raw : [];
  const mapped = arr.map((s) => {
    const t = String(s).trim();
    if (/^for\s*you$/i.test(t) || t.replace(/\s/g, '').toLowerCase() === 'foryou') return 'forYou';
    if (t.toLowerCase() === 'following') return 'following';
    if (t.toLowerCase() === 'toptoday' || t === 'topToday') return 'topToday';
    if (t.toLowerCase() === 'friends') return 'friends';
    if (t.toLowerCase() === 'community') return 'community';
    return t;
  });
  return [...new Set(mapped)];
}

/** Posts tagged only for circles must not appear in For You, Following, Friends, or Top Today (incl. author prepended slice). */
function postAppearsInMainFeeds(p: Post): boolean {
  const tags = p.feedTypeEligible ?? [];
  return tags.some((x) => x === 'forYou' || x === 'following' || x === 'friends' || x === 'topToday');
}

function rowToPost(row: any): Post {
  const creator = row.profiles
    ? rowToCreator(row.profiles)
    : unknownCreatorSummary(row.creator_id);

  return {
    id: row.id,
    creatorId: row.creator_id,
    creator,
    type: normalizePostType(row.type),
    caption: row.caption,
    mediaUrl: normalizeMediaUrl(row.media_url),
    thumbnailUrl: normalizeMediaUrl(row.thumbnail_url),
    hashtags: row.hashtags ?? [],
    communities: row.communities ?? [],
    isAnonymous: row.is_anonymous,
    privacyMode: row.privacy_mode,
    likeCount: row.like_count,
    commentCount: row.comment_count,
    shareCount: row.share_count,
    viewCount: row.view_count,
    saveCount: row.save_count,
    createdAt: row.created_at,
    rankingScore: row.ranking_score,
    feedTypeEligible: normalizeFeedTypeEligibleTags(row.feed_type_eligible ?? []),
    roleContext: row.role_context,
    specialtyContext: row.specialty_context,
    locationContext: row.location_context,
    soundTitle: row.sound_title?.trim() || undefined,
    soundSourcePostId: row.sound_source_post_id ?? undefined,
    soundSourceMediaUrl: normalizeMediaUrl(row.sound_source_media_url),
    duetParentId: row.duet_parent_id ? String(row.duet_parent_id) : undefined,
    evidenceUrl: row.evidence_url?.trim() || undefined,
    evidenceLabel: row.evidence_label?.trim() || undefined,
    shiftContext: row.shift_context?.trim() || undefined,
    /**
     * Server-stamped by the trigger installed in migration 057
     * whenever the author edits `caption` or `hashtags`. The post
     * detail screen uses this to render "· edited" next to the time
     * so viewers know the caption has changed.
     */
    editedAt: row.edited_at ?? undefined,
  };
}

/**
 * Explicit column list for every `posts` SELECT.
 *
 * We deliberately enumerate every column `rowToPost` reads (rather than
 * using `select *`) for three reasons:
 *
 *   1. **Wire-size discipline.** `*` ships every column on the row,
 *      including any future internal columns we never render (analytics
 *      metadata, soft-delete timestamps, moderation flags, etc.). At
 *      feed scale every byte multiplies — a 16-row first page that's
 *      10% smaller is 10% less to parse on the JS thread before the
 *      first cell mounts.
 *   2. **Explicit contract.** When someone adds a column to `posts`,
 *      they must also decide whether the client needs it. That keeps
 *      the feed payload from quietly growing.
 *   3. **Easier to split list-vs-detail later.** Today every callsite
 *      below uses the same shape because `rowToPost` is the single
 *      mapper. If we later need a slimmer "feed cell" projection that
 *      drops, say, `evidence_*` and `shift_context` (post-detail-only
 *      fields), we can introduce `POST_SELECT_LIST` without touching
 *      `rowToPost` — just feed it a partial row.
 *
 * Profile join columns are also explicit for the same reasons —
 * `profiles.*` would also pull `email`, `push_token`, etc. that the
 * client never needs.
 */
const POST_SELECT = [
  // Core identity
  'id',
  'creator_id',
  'type',
  'caption',
  'created_at',
  'edited_at',
  // Media
  'media_url',
  'thumbnail_url',
  // Taxonomy / discovery
  'hashtags',
  'communities',
  'feed_type_eligible',
  'role_context',
  'specialty_context',
  'location_context',
  // Privacy
  'is_anonymous',
  'privacy_mode',
  // Engagement counters (denormalized for fast cell render)
  'like_count',
  'comment_count',
  'share_count',
  'view_count',
  'save_count',
  // Ranking
  'ranking_score',
  // Sound attribution (TikTok-style original-sound credit)
  'sound_title',
  'sound_source_post_id',
  'sound_source_media_url',
  // Duet / evidence / shift context (Innovation feed)
  'duet_parent_id',
  'evidence_url',
  'evidence_label',
  'shift_context',
  // Joined creator profile — explicit columns to avoid shipping email,
  // push tokens, role_admin flag, identity_tags, etc. to the client.
  'profiles(id, display_name, first_name, last_name, username, avatar_url, role, specialty, city, state, is_verified, pulse_tier, pulse_score_current)',
].join(', ');

/** Loads posts and preserves caller id order (PostgREST `.in()` order is undefined). */
async function fetchPostsByIdsOrdered(ids: string[]): Promise<Post[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from('posts').select(POST_SELECT).in('id', ids);
  if (error) throw error;
  const byId = new Map<string, Post>((data ?? []).map((row: any) => [row.id, rowToPost(row)]));
  const out: Post[] = [];
  for (const id of ids) {
    const p = byId.get(id);
    if (p) out.push(p);
  }
  return out;
}

/** Chronological For You slice via RPC `get_for_you_post_ids` (correct filter semantics). Falls back to REST if RPC missing. */
async function fetchForYouPostsChronological(viewerId: string, limit: number): Promise<Post[]> {
  const { data: idRows, error: rpcErr } = await supabase.rpc('get_for_you_post_ids', {
    viewer_uuid: viewerId,
    result_limit: limit,
  });

  if (!rpcErr && idRows != null && (idRows as { id: string }[]).length > 0) {
    const ids = (idRows as { id: string }[]).map((r) => r.id);
    return fetchPostsByIdsOrdered(ids);
  }

  if (__DEV__ && rpcErr) {
    console.warn('get_for_you_post_ids unavailable, using REST fallback:', rpcErr.message);
  }

  let q = supabase.from('posts').select(POST_SELECT).contains('feed_type_eligible', ['forYou']);
  q = withFeedPrivacy(q, viewerId);
  const { data, error } = await q.order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []).map(rowToPost);
}

/**
 * Viewer’s own posts (newest first). Prepended to For You so uploads are not buried by global ranking
 * or missing `forYou` in `feed_type_eligible` (still shown to the author here).
 */
async function fetchOwnRecentPosts(viewerId: string, limit: number): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select(POST_SELECT)
    .eq('creator_id', viewerId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    if (__DEV__) console.warn('fetchOwnRecentPosts:', error.message);
    return [];
  }
  return (data ?? []).map(rowToPost);
}

function mergeOwnPostsFirst(own: Post[], rest: Post[], maxLen: number): Post[] {
  const seen = new Set<string>();
  const out: Post[] = [];
  for (const p of own) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(p);
    if (out.length >= maxLen) return out;
  }
  for (const p of rest) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(p);
    if (out.length >= maxLen) break;
  }
  return out;
}

/** Limit how many slots a single creator can take in the first band (TikTok-style diversity). */
function diversifyByCreator(posts: Post[], maxTotal: number, maxPerCreator = 3): Post[] {
  const count = new Map<string, number>();
  const primary: Post[] = [];
  for (const p of posts) {
    const n = count.get(p.creatorId) ?? 0;
    if (n >= maxPerCreator) continue;
    count.set(p.creatorId, n + 1);
    primary.push(p);
    if (primary.length >= maxTotal) return primary;
  }
  for (const p of posts) {
    if (primary.length >= maxTotal) break;
    if (!primary.some((x) => x.id === p.id)) primary.push(p);
  }
  return primary.slice(0, maxTotal);
}

async function applyViewerFeedFilters(posts: Post[], viewerId?: string): Promise<Post[]> {
  if (!viewerId?.trim()) return posts;
  try {
    const { hiddenPostIds, hiddenCreatorIds } = await feedSignalsService.listExclusions(viewerId);
    return posts.filter((p) => !hiddenPostIds.has(p.id) && !hiddenCreatorIds.has(p.creatorId));
  } catch {
    return posts;
  }
}

async function fetchMutualFollowCreatorIds(viewerId: string): Promise<string[]> {
  const { data, error } = await supabase.rpc('get_mutual_follow_ids', { viewer: viewerId } as never);
  if (error || !data?.length) return [];
  return (data as { creator_id: string }[]).map((r) => r.creator_id);
}

async function runFriendsFeed(viewerId: string): Promise<Post[]> {
  const mutual = await fetchMutualFollowCreatorIds(viewerId);
  if (!mutual.length) return [];
  let q = supabase
    .from('posts')
    .select(POST_SELECT)
    .in('creator_id', mutual)
    .order('created_at', { ascending: false })
    .limit(60);
  q = withFeedPrivacy(q, viewerId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(rowToPost).filter(postAppearsInMainFeeds);
}

/** Feed queries only `public` by default; signed-in users also see their own posts (covers privacy "Followers"). */
function withFeedPrivacy(query: any, viewerId?: string) {
  if (viewerId) {
    return query.or(`privacy_mode.eq.public,creator_id.eq.${viewerId}`);
  }
  return query.eq('privacy_mode', 'public');
}

/**
 * Try the Tier 1 personalized ranker (042) first, then fall back to the
 * baseline ranker (006/023) if v2 isn't deployed yet. This lets us ship the
 * client and the migration independently.
 */
async function callRankedRpc(
  viewerId: string,
  feedLimit: number,
): Promise<{ post_id: string; score: number }[]> {
  const v2 = await supabase.rpc('get_ranked_feed_v2', {
    viewer_id: viewerId,
    feed_limit: feedLimit,
  });
  if (!v2.error && v2.data?.length) return v2.data as { post_id: string; score: number }[];
  if (__DEV__ && v2.error) {
    console.warn('get_ranked_feed_v2 unavailable, falling back to v1:', v2.error.message);
  }

  const v1 = await supabase.rpc('get_ranked_feed', {
    viewer_id: viewerId,
    feed_limit: feedLimit,
  });
  if (v1.error) throw v1.error;
  return (v1.data ?? []) as { post_id: string; score: number }[];
}

/** Lightweight Top-Today fetch for stitching trending posts into the For You stream. */
async function fetchTrendingForInjection(maxCount: number): Promise<Post[]> {
  try {
    const { data: ranked, error: rpcError } = await supabase
      .rpc('get_top_today', { feed_limit: maxCount });
    if (rpcError || !ranked?.length) return [];
    const ids = (ranked as { post_id: string }[]).map((r) => r.post_id);
    const { data } = await supabase.from('posts').select(POST_SELECT).in('id', ids);
    if (!data?.length) return [];
    const scoreMap = new Map(
      (ranked as { post_id: string; score: number }[]).map((r) => [r.post_id, r.score]),
    );
    return data
      .map(rowToPost)
      .filter(postAppearsInMainFeeds)
      .sort((a, b) => ((scoreMap.get(b.id) ?? 0) as number) - ((scoreMap.get(a.id) ?? 0) as number));
  } catch {
    return [];
  }
}

/**
 * Splice trending posts into a personalized list every `every` slots. Trending
 * items already in the personalized stream are skipped so users never see the
 * same post twice in one session.
 */
function stitchTrending(personal: Post[], trending: Post[], every = 7): Post[] {
  if (!trending.length) return personal;
  const seen = new Set(personal.map((p) => p.id));
  const queue = trending.filter((t) => !seen.has(t.id));
  if (!queue.length) return personal;
  const out: Post[] = [];
  let qi = 0;
  for (let i = 0; i < personal.length; i++) {
    out.push(personal[i]);
    if ((i + 1) % every === 0 && qi < queue.length) out.push(queue[qi++]);
  }
  return out;
}

/**
 * Module-level (no `this`) so Hermes never sees unresolved identifiers if `getFeed` is called unbound
 * or Metro Fast Refresh leaves a stale query closure after refactors.
 *
 * Tier 1 feed pipeline:
 *   1. Fetch own / recent / ranked / trending in parallel (each lane is independent).
 *   2. Hydrate ranked rows by id (RPC returns ids+scores only).
 *   3. Cap creator concentration in the personalized band (max 2 per creator).
 *   4. Stitch one trending post every 7 personalized slots.
 *   5. Prepend the viewer's own recent posts (privacy=Followers safety net).
 */
async function runRankedForYouFeed(viewerId: string): Promise<Post[]> {
  const RECENT_FIRST = 15;
  const MAX_FEED = 50;
  const OWN_FIRST = 20;
  const RPC_LIMIT = 60;          // small headroom so the diversity cap has alternates to swap in
  const TRENDING_BUDGET = 12;    // worst case ~7 injections at every:7 across 50 slots

  const [ownRecent, recentPosts, rankedRpc, trendingPosts] = await Promise.all([
    fetchOwnRecentPosts(viewerId, OWN_FIRST)
      .then((p) => p.filter(postAppearsInMainFeeds))
      .catch((e: any) => {
        if (__DEV__) console.warn('getRankedFeed own slice failed:', e?.message);
        return [] as Post[];
      }),
    fetchForYouPostsChronological(viewerId, RECENT_FIRST).catch((e: any) => {
      if (__DEV__) console.warn('getRankedFeed recent slice failed:', e?.message);
      return [] as Post[];
    }),
    callRankedRpc(viewerId, RPC_LIMIT).catch((e: any) => {
      if (__DEV__) console.warn('get_ranked_feed RPC failed, falling back:', e?.message);
      return [] as { post_id: string; score: number }[];
    }),
    fetchTrendingForInjection(TRENDING_BUDGET),
  ]);

  let rankedPosts: Post[] = [];
  if (rankedRpc.length) {
    try {
      const ids = rankedRpc.map((r) => r.post_id);
      const { data } = await supabase.from('posts').select(POST_SELECT).in('id', ids);
      if (data?.length) {
        const scoreMap = new Map(rankedRpc.map((r) => [r.post_id, r.score]));
        rankedPosts = data
          .map(rowToPost)
          .sort((a, b) => ((scoreMap.get(b.id) ?? 0) as number) - ((scoreMap.get(a.id) ?? 0) as number));
      }
    } catch (e: any) {
      if (__DEV__) console.warn('getRankedFeed hydrate failed:', e?.message);
    }
  }

  /* Last-ditch fallback: ranker dead AND fresh chronological dead -> try a wider chronological pull. */
  if (!rankedPosts.length && !recentPosts.length) {
    try {
      const chronological = await fetchForYouPostsChronological(viewerId, MAX_FEED);
      return mergeOwnPostsFirst(ownRecent, chronological, MAX_FEED);
    } catch (e: any) {
      if (ownRecent.length) {
        if (__DEV__) console.warn('getRankedFeed chronological failed, returning own only:', e?.message);
        return ownRecent.slice(0, MAX_FEED);
      }
      throw e;
    }
  }

  const seen = new Set<string>();
  const merged: Post[] = [];
  for (const p of recentPosts) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    merged.push(p);
  }
  for (const p of rankedPosts) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    merged.push(p);
  }

  /* Cap any single creator to 2 slots in the personalized band -- avoids "all five
     posts from the one creator I follow" steamrolling everyone else. Own posts are
     prepended after, so they're not affected by this cap. */
  const diversified = diversifyByCreator(merged, MAX_FEED, 2);

  /* Inject trending every 7 slots so users always see fresh breakout content,
     even when the personalization layer hasn't warmed up yet. */
  const stitched = stitchTrending(diversified, trendingPosts, 7);

  return mergeOwnPostsFirst(ownRecent, stitched, MAX_FEED);
}

async function runTopTodayFeed(): Promise<Post[]> {
  const dayAgoIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  /** Mirrors `get_top_today` in supabase/migrations/006_feed_algorithm.sql (RPC path). */
  const topTodayScore = (p: Post) =>
    p.likeCount * 1.0 +
    p.commentCount * 2.0 +
    p.shareCount * 3.0 +
    p.saveCount * 2.5 +
    Math.log(Math.max(p.viewCount, 1) + 1) * 2.0;

  try {
    const { data: ranked, error: rpcError } = await supabase
      .rpc('get_top_today', { feed_limit: 50 });

    if (!rpcError && ranked?.length) {
      const ids = ranked.map((r: any) => r.post_id);
      const { data, error } = await supabase
        .from('posts')
        .select(POST_SELECT)
        .in('id', ids);

      if (!error && data?.length) {
        const scoreMap = new Map(ranked.map((r: any) => [r.post_id, r.score]));
        const sorted = data
          .map(rowToPost)
          .filter(postAppearsInMainFeeds)
          .sort((a, b) => ((scoreMap.get(b.id) ?? 0) as number) - ((scoreMap.get(a.id) ?? 0) as number));
        return diversifyByCreator(sorted, 50, 3);
      }
    }
  } catch {}

  const { data, error } = await supabase
    .from('posts')
    .select(POST_SELECT)
    .eq('privacy_mode', 'public')
    .gte('created_at', dayAgoIso)
    .order('created_at', { ascending: false })
    .limit(120);
  if (error) throw error;
  const mapped = (data ?? []).map(rowToPost).filter(postAppearsInMainFeeds);
  mapped.sort((a, b) => topTodayScore(b) - topTodayScore(a));
  return diversifyByCreator(mapped, 50, 3);
}

export const postsService = {
  async getFeed(type: FeedType, userId?: string): Promise<Post[]> {
    if (type === 'community') return [];

    let posts: Post[];

    if (type === 'forYou' && userId) {
      posts = await runRankedForYouFeed(userId);
    } else if (type === 'topToday') {
      posts = await runTopTodayFeed();
    } else if (type === 'friends' && userId) {
      posts = await runFriendsFeed(userId);
    } else {
      let query = supabase.from('posts').select(POST_SELECT);
      query = withFeedPrivacy(query, userId);
      query = query.order('created_at', { ascending: false }).limit(50);

      if (type === 'forYou' && !userId) {
        query = query.contains('feed_type_eligible', ['forYou']);
      }

      if (type === 'following') {
        query = query.contains('feed_type_eligible', ['following']);
      }

      const { data, error } = await query;
      if (error) {
        console.error('getFeed error:', error);
        throw error;
      }
      posts = (data ?? []).map(rowToPost).filter(postAppearsInMainFeeds);
    }

    return finalizePostsForViewer(await applyViewerFeedFilters(posts, userId), userId);
  },

  async getLikedPostIdsForUser(userId: string): Promise<Set<string>> {
    const { data, error } = await supabase.from('post_likes').select('post_id').eq('user_id', userId).limit(2000);
    if (error) {
      if (__DEV__) console.warn('[getLikedPostIdsForUser]', error.message);
      return new Set();
    }
    return new Set((data ?? []).map((r: { post_id: string }) => r.post_id));
  },

  async getFeedContinuation(args: {
    type: FeedType;
    viewerId?: string;
    cursor: string;
    excludeIds: string[];
    limit?: number;
  }): Promise<{ posts: Post[]; nextCursor: string | null }> {
    const { type, viewerId, cursor, excludeIds } = args;
    const limit = args.limit ?? 18;
    const exclude = new Set(excludeIds);

    if (type === 'community') return { posts: [], nextCursor: null };

    if (type === 'friends' && viewerId) {
      const mutual = await fetchMutualFollowCreatorIds(viewerId);
      if (!mutual.length) return { posts: [], nextCursor: null };
      let q = supabase
        .from('posts')
        .select(POST_SELECT)
        .in('creator_id', mutual)
        .lt('created_at', cursor)
        .order('created_at', { ascending: false })
        .limit(limit * 2);
      q = withFeedPrivacy(q, viewerId);
      const { data, error } = await q;
      if (error) throw error;
      let posts = (data ?? [])
        .map(rowToPost)
        .filter((p) => !exclude.has(p.id) && postAppearsInMainFeeds(p));
      posts = finalizePostsForViewer(await applyViewerFeedFilters(posts, viewerId), viewerId);
      posts = posts.slice(0, limit);
      const nextCursor = posts.length ? posts[posts.length - 1].createdAt : null;
      return { posts, nextCursor };
    }

    let query = supabase.from('posts').select(POST_SELECT).lt('created_at', cursor).order('created_at', { ascending: false }).limit(limit * 2);

    query = withFeedPrivacy(query, viewerId);

    if (type === 'forYou') {
      query = query.contains('feed_type_eligible', ['forYou']);
    } else if (type === 'following') {
      query = query.contains('feed_type_eligible', ['following']);
    } else if (type === 'topToday') {
      const dayAgoIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      query = query.gte('created_at', dayAgoIso);
    }

    const { data, error } = await query;
    if (error) throw error;
    let posts = (data ?? [])
      .map(rowToPost)
      .filter((p) => !exclude.has(p.id) && postAppearsInMainFeeds(p));
    posts = finalizePostsForViewer(await applyViewerFeedFilters(posts, viewerId), viewerId);
    posts = posts.slice(0, limit);
    const nextCursor = posts.length === limit ? posts[posts.length - 1].createdAt : null;
    return { posts, nextCursor };
  },

  async getPostsByHashtag(tag: string, limit = 40, viewerId?: string | null): Promise<Post[]> {
    const raw = tag.replace(/^#/, '').trim().toLowerCase();
    if (!raw) return [];
    const { data, error } = await supabase
      .from('posts')
      .select(POST_SELECT)
      .not('hashtags', 'eq', '{}')
      .eq('privacy_mode', 'public')
      .order('created_at', { ascending: false })
      .limit(180);
    if (error) throw error;
    const rows = (data ?? []).map(rowToPost);
    const filtered = rows.filter((p) => (p.hashtags ?? []).some((h) => String(h).toLowerCase() === raw));
    return finalizePostsForViewer(filtered.slice(0, limit), viewerId);
  },

  async getPostsUsingSoundSource(sourcePostId: string, limit = 30, viewerId?: string | null): Promise<Post[]> {
    const { data, error } = await supabase
      .from('posts')
      .select(POST_SELECT)
      .eq('sound_source_post_id', sourcePostId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return finalizePostsForViewer((data ?? []).map(rowToPost), viewerId);
  },

  getRankedFeed: runRankedForYouFeed,
  getTopToday: runTopTodayFeed,

  async trackView(postId: string, viewerId: string, durationMs: number): Promise<void> {
    await supabase.from('post_views').insert({
      post_id: postId,
      viewer_id: viewerId,
      view_duration_ms: durationMs,
    }).then(() => {});
  },

  async getFeedPaginated(
    type: FeedType,
    cursor?: string,
    limit = 20,
    viewerId?: string,
  ): Promise<{ posts: Post[]; nextCursor: string | null }> {
    let query = supabase
      .from('posts')
      .select(POST_SELECT)
      .contains('feed_type_eligible', [type])
      .order('created_at', { ascending: false })
      .limit(limit);

    query = withFeedPrivacy(query, viewerId);

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data, error } = await query;
    if (error) throw error;

    const posts = finalizePostsForViewer((data ?? []).map(rowToPost), viewerId);
    const nextCursor = posts.length === limit ? posts[posts.length - 1].createdAt : null;
    return { posts, nextCursor };
  },

  async getById(id: string, viewerId?: string | null): Promise<Post | null> {
    const { data, error } = await supabase
      .from('posts')
      .select(POST_SELECT)
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return finalizePostsForViewer([rowToPost(data)], viewerId)[0] ?? null;
  },

  /**
   * Batch fetch posts by id, preserving caller order and applying viewer
   * privacy filters in one round-trip. Designed for prefetching feed
   * sub-resources (sound sources, duet parents, linked-post pins) in a
   * single query instead of N parallel `getById` calls.
   *
   * Returns a `Map<id, Post>` so callers can resolve by id without
   * caring about ordering. Missing ids (deleted, blocked, RLS-filtered)
   * are simply absent from the map.
   */
  async getByIds(
    ids: ReadonlyArray<string>,
    viewerId?: string | null,
  ): Promise<Map<string, Post>> {
    const unique = Array.from(new Set(ids.filter((x) => !!x && x.trim().length > 0)));
    if (unique.length === 0) return new Map();

    const ordered = await fetchPostsByIdsOrdered(unique);
    const finalized = finalizePostsForViewer(ordered, viewerId);

    const map = new Map<string, Post>();
    for (const p of finalized) map.set(p.id, p);
    return map;
  },

  async getByUser(profileUserId: string, viewerId?: string | null): Promise<Post[]> {
    const { data, error } = await supabase
      .from('posts')
      .select(POST_SELECT)
      .eq('creator_id', profileUserId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    let posts = (data ?? []).map(rowToPost);
    if (viewerId && viewerId !== profileUserId) {
      posts = posts.filter((p) => !p.isAnonymous);
    }
    return finalizePostsForViewer(posts, viewerId);
  },

  async getByCommunity(communityId: string, viewerId?: string | null): Promise<Post[]> {
    const [{ data, error }, pinsResult] = await Promise.all([
      supabase
        .from('posts')
        .select(POST_SELECT)
        .contains('communities', [communityId])
        .order('created_at', { ascending: false }),
      supabase
        .from('community_post_pins')
        .select('post_id, sort_order')
        .eq('community_id', communityId),
    ]);

    if (error) throw error;

    let pins: CommunityPostPinRow[] = [];
    if (!pinsResult.error && pinsResult.data) {
      pins = pinsResult.data as CommunityPostPinRow[];
    } else if (pinsResult.error && __DEV__) {
      console.warn('[postsService.getByCommunity] community_post_pins:', pinsResult.error.message);
    }

    let posts = finalizePostsForViewer((data ?? []).map(rowToPost), viewerId);
    posts = mergePinnedCommunityPosts(posts, pins);
    return posts;
  },

  /** Circle-tagged posts from the last 24h (for Circles home trending merge). */
  async getCommunityPostCandidates24h(maxFetch = 100): Promise<Post[]> {
    return this.getCommunityPostCandidatesSince(24 * 60 * 60 * 1000, maxFetch);
  },

  /**
   * Community posts within `windowMs` of now, or (when `windowMs <= 0`)
   * the most recent community posts overall. Companion to
   * `circleThreadsDb.trendingThreadCandidatesSince` — used to backfill
   * trending topics when the 24h window is too sparse.
   */
  async getCommunityPostCandidatesSince(
    windowMs: number,
    maxFetch = 100,
  ): Promise<Post[]> {
    let q = supabase
      .from('posts')
      .select(POST_SELECT)
      .eq('privacy_mode', 'public')
      .order('created_at', { ascending: false })
      .limit(maxFetch);

    if (windowMs > 0) {
      const since = new Date(Date.now() - windowMs).toISOString();
      q = q.gte('created_at', since);
    }

    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map(rowToPost).filter((p) => (p.communities ?? []).length > 0);
  },

  /**
   * Search original video sounds (posts with their own audio, not borrowing another clip).
   * Prefer RPC `search_sound_library`; falls back to REST if the migration is not applied yet.
   */
  async searchSoundLibrary(query: string, limit = 25): Promise<SoundLibraryRow[]> {
    const q = query.trim();
    const { data, error } = await supabase.rpc('search_sound_library', {
      p_query: q,
      p_limit: limit,
    } as never);

    if (!error && data != null) {
      return (data as any[]).map((r) => ({
        postId: String(r.post_id),
        soundTitle: String(r.sound_title ?? 'Original sound'),
        mediaUrl: normalizeMediaUrl(r.media_url),
        thumbnailUrl: normalizeMediaUrl(r.thumbnail_url),
        creatorId: String(r.creator_id),
        creatorDisplayName: String(r.creator_display_name ?? ''),
        creatorAvatarUrl: r.creator_avatar_url ? String(r.creator_avatar_url) : undefined,
        remixCount: Number(r.remix_count ?? 0),
      }));
    }

    if (__DEV__ && error) {
      console.warn('[postsService.searchSoundLibrary] RPC failed, using REST fallback:', error.message);
    }

    const esc = escapePostgrestIlike(q);
    let qb = supabase
      .from('posts')
      .select(POST_SELECT)
      .eq('type', 'video')
      .not('media_url', 'is', null)
      .is('sound_source_post_id', null)
      .eq('is_anonymous', false)
      .order('created_at', { ascending: false })
      .limit(Math.min(Math.max(limit, 1), 50));

    if (q.length >= 2) {
      qb = qb.or(`sound_title.ilike.%${esc}%,caption.ilike.%${esc}%`);
    }

    const { data: rows, error: restErr } = await qb;
    if (restErr) throw restErr;
    return (rows ?? []).map((row: any) => {
      const p = rowToPost(row);
      return {
        postId: p.id,
        soundTitle: p.soundTitle ?? (p.caption?.trim() ? p.caption.trim().slice(0, 120) : 'Original sound'),
        mediaUrl: p.mediaUrl,
        thumbnailUrl: p.thumbnailUrl,
        creatorId: p.creatorId,
        creatorDisplayName: p.creator.displayName,
        creatorAvatarUrl: p.creator.avatarUrl,
        remixCount: 0,
      };
    });
  },

  /**
   * Weekly viral chart: source posts ranked by new remix clips in the last 7 days.
   * Optional `titleFilter` narrows the chart (search while on Viral Songs tab).
   */
  async getViralSoundsThisWeek(opts?: { limit?: number; titleFilter?: string }): Promise<ViralSoundRow[]> {
    const limit = opts?.limit ?? 10;
    const titleFilter = opts?.titleFilter?.trim() || null;
    const { data, error } = await supabase.rpc('get_viral_sounds_this_week', {
      p_limit: limit,
      p_title_filter: titleFilter,
    } as never);

    if (error) {
      if (__DEV__) console.warn('[postsService.getViralSoundsThisWeek]', error.message);
      return [];
    }

    return (data as any[] | null)?.map((r) => ({
      postId: String(r.source_post_id),
      soundTitle: String(r.sound_title ?? 'Original sound'),
      remixCount7d: Number(r.remix_count_7d ?? 0),
      lastRemixAt: r.last_remix_at ? String(r.last_remix_at) : undefined,
      mediaUrl: normalizeMediaUrl(r.media_url),
      thumbnailUrl: normalizeMediaUrl(r.thumbnail_url),
      creatorId: String(r.creator_id),
      creatorDisplayName: String(r.creator_display_name ?? ''),
      creatorAvatarUrl: r.creator_avatar_url ? String(r.creator_avatar_url) : undefined,
    })) ?? [];
  },

  /** Distinct hashtag tokens containing the search substring (server-side). */
  async searchHashtags(term: string, limit = 40): Promise<string[]> {
    const t = term.trim();
    if (!t) return [];
    const { data, error } = await supabase.rpc('search_hashtags', {
      p_term: t,
      p_limit: limit,
    } as never);
    if (error) {
      if (__DEV__) console.warn('[postsService.searchHashtags]', error.message);
      return [];
    }
    return ((data as { tag: string }[] | null) ?? []).map((r) => r.tag).filter(Boolean);
  },

  async create(post: {
    creator_id: string;
    type: string;
    caption: string;
    media_url?: string;
    thumbnail_url?: string;
    hashtags?: string[];
    communities?: string[];
    is_anonymous?: boolean;
    privacy_mode?: string;
    feed_type_eligible?: string[];
    role_context?: string;
    specialty_context?: string;
    location_context?: string;
    sound_title?: string | null;
    sound_source_post_id?: string | null;
    sound_source_media_url?: string | null;
    duet_parent_id?: string | null;
    evidence_url?: string | null;
    evidence_label?: string | null;
    shift_context?: string | null;
  }): Promise<Post> {
    let roleCtx = post.role_context;
    let specCtx = post.specialty_context;
    let locCtx = post.location_context;

    if (!roleCtx || !specCtx) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, specialty, state')
          .eq('id', post.creator_id)
          .single();
        if (profile) {
          roleCtx = roleCtx || profile.role;
          specCtx = specCtx || profile.specialty;
          locCtx = locCtx || profile.state;
        }
      } catch {}
    }

    const {
      sound_title: soundTitleIn,
      sound_source_post_id: soundSourceIn,
      sound_source_media_url: soundMediaIn,
      duet_parent_id: duetParentIn,
      evidence_url: evidenceUrlIn,
      evidence_label: evidenceLabelIn,
      shift_context: shiftCtxIn,
      ...postRest
    } = post;

    const insertPayload: Record<string, unknown> = {
      ...postRest,
      media_url: post.media_url ?? null,
      thumbnail_url: post.thumbnail_url ?? null,
      feed_type_eligible: normalizeFeedTypeEligibleTags(
        post.feed_type_eligible?.length ? post.feed_type_eligible : ['forYou', 'following'],
      ),
      role_context: roleCtx,
      specialty_context: specCtx,
      location_context: locCtx,
    };

    const st = soundTitleIn != null ? String(soundTitleIn).trim() : '';
    const sid = soundSourceIn != null ? String(soundSourceIn).trim() : '';
    const sm = soundMediaIn != null ? String(soundMediaIn).trim() : '';
    if (st) insertPayload.sound_title = st;
    if (sid) insertPayload.sound_source_post_id = sid;
    if (sm) {
      const normalizedSound = normalizeMediaUrl(sm);
      if (normalizedSound) insertPayload.sound_source_media_url = normalizedSound;
    }

    const dp = duetParentIn != null ? String(duetParentIn).trim() : '';
    if (dp) insertPayload.duet_parent_id = dp;

    const evu = evidenceUrlIn != null ? String(evidenceUrlIn).trim() : '';
    if (evu) insertPayload.evidence_url = evu;
    const evl = evidenceLabelIn != null ? String(evidenceLabelIn).trim() : '';
    if (evl) insertPayload.evidence_label = evl;
    const sh = shiftCtxIn != null ? String(shiftCtxIn).trim().toLowerCase() : '';
    if (sh && ['day', 'night', 'weekend', 'any'].includes(sh)) insertPayload.shift_context = sh;

    const { data, error } = await supabase
      .from('posts')
      .insert(insertPayload as any)
      .select(POST_SELECT)
      .single();

    if (error) throw error;
    return finalizePostsForViewer([rowToPost(data)], post.creator_id)[0]!;
  },

  async toggleLike(userId: string, postId: string): Promise<boolean> {
    const { data: existing } = await supabase
      .from('post_likes')
      .select('id')
      .eq('user_id', userId)
      .eq('post_id', postId)
      .single();

    if (existing) {
      await supabase.from('post_likes').delete().eq('id', existing.id);
      return false;
    } else {
      await supabase.from('post_likes').insert({ user_id: userId, post_id: postId });
      return true;
    }
  },

  async getSavedPosts(userId: string): Promise<Post[]> {
    const { data, error } = await supabase
      .from('saved_posts')
      .select('post_id, posts(*, profiles(id, display_name, avatar_url, role, specialty, city, state, is_verified, pulse_tier, pulse_score_current))')
      .eq('user_id', userId)
      .order('saved_at', { ascending: false });

    if (error) throw error;
    return finalizePostsForViewer(
      (data ?? [])
        .filter((r: any) => r.posts)
        .map((r: any) => rowToPost(r.posts)),
      userId,
    );
  },

  async getLikedPosts(userId: string): Promise<Post[]> {
    const { data, error } = await supabase
      .from('post_likes')
      .select('created_at, posts(*, profiles(id, display_name, avatar_url, role, specialty, city, state, is_verified, pulse_tier, pulse_score_current))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return finalizePostsForViewer(
      (data ?? [])
        .filter((r: any) => r.posts)
        .map((r: any) => rowToPost(r.posts)),
      userId,
    );
  },

  /**
   * IMPORTANT: insert/delete errors must throw -- otherwise a failed save
   * leaves the optimistic UI in a "saved" state forever (gold bookmark, +1
   * count) while the row never lands in saved_posts, so the post never
   * appears in the user's Saved screen. Throwing lets feed.tsx's catch
   * block enqueue an offline retry and surface a toast.
   *
   * Uses upsert(ignoreDuplicates) for the save path so a second tap (or a
   * replayed offline action) doesn't error on the unique(user_id,post_id)
   * constraint -- making the operation idempotent end-to-end.
   */
  async toggleSave(userId: string, postId: string): Promise<boolean> {
    const { data: existing, error: existsErr } = await supabase
      .from('saved_posts')
      .select('id')
      .eq('user_id', userId)
      .eq('post_id', postId)
      .maybeSingle();

    if (existsErr) throw existsErr;

    if (existing) {
      const { error } = await supabase.from('saved_posts').delete().eq('id', existing.id);
      if (error) throw error;
      return false;
    }

    const { error } = await supabase
      .from('saved_posts')
      .upsert(
        { user_id: userId, post_id: postId },
        { onConflict: 'user_id,post_id', ignoreDuplicates: true },
      );
    if (error) throw error;
    return true;
  },

  /**
   * Persist a share so posts.share_count and the user's My Pulse total
   * actually tally. The DB trigger in 040 bumps share_count automatically.
   * Throws on failure so callers can fall through to the offline queue.
   */
  async recordShare(userId: string | null, postId: string, channel?: string): Promise<void> {
    const { error } = await supabase.from('post_shares').insert({
      user_id: userId,
      post_id: postId,
      channel: channel ?? null,
    } as never);
    if (error) throw error;
  },

  /** Delete own post (My Pulse recent videos). */
  async deleteOwnPost(postId: string, creatorId: string): Promise<void> {
    const { error } = await supabase.from('posts').delete().eq('id', postId).eq('creator_id', creatorId);
    if (error) throw error;
  },

  /**
   * Author-only edit for a feed post's caption and/or hashtags. The
   * BEFORE-UPDATE trigger installed in migration 057 stamps
   * `edited_at = now()` for us any time either field drifts, so the
   * returned row comes back with a fresh timestamp the post detail
   * screen can render as "· edited".
   *
   * Scope is intentionally narrow — media, post type, circle
   * attribution, and privacy stay immutable. Larger changes should
   * delete + repost so viewers don't get confused by a caption that
   * no longer matches the underlying video.
   */
  async updateOwnPost(
    postId: string,
    creatorId: string,
    patch: { caption?: string; hashtags?: string[] },
  ): Promise<Post> {
    const updates: Record<string, string | string[] | null> = {};
    if (Object.prototype.hasOwnProperty.call(patch, 'caption')) {
      /**
       * We allow empty captions (some posts are pure media) but trim
       * whitespace so the UI doesn't render a stray line. Length cap
       * is enforced DB-side; no need to duplicate it here.
       */
      updates.caption = (patch.caption ?? '').trim();
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'hashtags')) {
      updates.hashtags = Array.isArray(patch.hashtags)
        ? patch.hashtags.map((t) => t.trim()).filter(Boolean)
        : [];
    }

    if (Object.keys(updates).length === 0) {
      const current = await this.getById(postId);
      if (!current) throw new Error('Post not found');
      return current;
    }

    const { data, error } = await supabase
      .from('posts')
      .update(updates as never)
      .eq('id', postId)
      .eq('creator_id', creatorId)
      .select(POST_SELECT)
      .single();
    if (error || !data) throw error ?? new Error('Update failed');
    return rowToPost(data);
  },
};
