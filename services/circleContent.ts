import type { AudienceRole, Community, CircleFlairTag, CircleThread, CircleThreadKind, ContentInterest, Post, TrendingTopic24h } from '@/types';
import { FEATURED_CIRCLE_SLUGS_ORDER, PROMOTED_NEW_CIRCLE_SLUGS } from '@/constants/circleDiscovery';
import { suggestOnboardingCircleSlugs } from '@/lib/onboarding/circleSuggestions';
import { communitiesService, postsService, circleThreadsDb } from './supabase';

function trendingScoreThread(t: TrendingTopic24h): number {
  return t.replyCount + t.reactionCount * 2 + (t.shareCount ?? 0);
}

function trendingScorePost(p: Post): number {
  return p.likeCount + p.commentCount * 2 + p.shareCount;
}

function postToTrending24h(
  p: Post,
  circleMeta: Map<string, { id: string; slug: string; name: string }>,
): TrendingTopic24h | null {
  const cid = p.communities?.[0];
  if (!cid) return null;
  const meta = circleMeta.get(cid);
  if (!meta) return null;
  const raw = p.caption?.trim() || '';
  const firstLine = raw.split('\n')[0].replace(/\*\*/g, '').trim();
  const title =
    firstLine.length > 0 ? (firstLine.length > 88 ? `${firstLine.slice(0, 85)}…` : firstLine) : 'Community post';
  const rest = raw.includes('\n') ? raw.split('\n').slice(1).join('\n').trim() : '';
  const previewFromCaption = rest.slice(0, 140);
  const preview =
    previewFromCaption ||
    (p.type === 'image' || p.type === 'video'
      ? `${p.type === 'video' ? 'Video' : 'Photo'} in ${meta.name}`
      : '');

  return {
    id: `trend-post-${p.id}`,
    postId: p.id,
    circleId: meta.id,
    circleSlug: meta.slug,
    circleName: meta.name,
    title,
    preview: preview || ' ',
    replyCount: p.commentCount,
    reactionCount: p.likeCount,
    shareCount: p.shareCount,
    lastActiveAt: p.createdAt,
  };
}

async function runGroupedSearch(query: string): Promise<{
  directory: Community[];
  fromDiscussions: Community[];
  failed?: boolean;
}> {
  const s = query.trim();
  if (!s) return { directory: [], fromDiscussions: [] };
  try {
    const [byMeta, byThreads] = await Promise.all([
      communitiesService.search(s),
      circleThreadsDb.searchCommunitiesByThreadKeyword(s).catch(() => [] as Community[]),
    ]);
    const metaIds = new Set(byMeta.map((c) => c.id));
    const fromDiscussions = byThreads.filter((c) => !metaIds.has(c.id));
    return { directory: byMeta, fromDiscussions };
  } catch {
    return { directory: [], fromDiscussions: [], failed: true };
  }
}

/**
 * Grouped circle + discussion search. If the exact phrase matches nothing,
 * tries token and light typo fallbacks and sets `didYouMean` when those hits
 * are returned (for “did you mean” UI).
 */
async function searchCirclesAndTopicsGroupedFn(query: string): Promise<{
  directory: Community[];
  fromDiscussions: Community[];
  didYouMean?: string;
  failed?: boolean;
}> {
  const raw = query.trim();
  if (!raw) return { directory: [], fromDiscussions: [] };

  const primary = await runGroupedSearch(raw);
  if (primary.directory.length > 0 || primary.fromDiscussions.length > 0) {
    return primary;
  }

  const tokens = raw
    .split(/\s+/)
    .map((t) => t.replace(/[^a-zA-Z0-9'-]/g, ''))
    .filter((t) => t.length >= 3)
    .sort((a, b) => b.length - a.length);

  const seenToken = new Set<string>();
  for (const token of tokens) {
    const key = token.toLowerCase();
    if (seenToken.has(key)) continue;
    seenToken.add(key);
    if (key === raw.toLowerCase()) continue;
    const fb = await runGroupedSearch(token);
    if (fb.directory.length > 0 || fb.fromDiscussions.length > 0) {
      return { ...fb, didYouMean: token };
    }
  }

  if (raw.length >= 4) {
    const chopped = raw.slice(0, -1).trim();
    if (chopped.length >= 2 && chopped.toLowerCase() !== raw.toLowerCase()) {
      const fb = await runGroupedSearch(chopped);
      if (fb.directory.length > 0 || fb.fromDiscussions.length > 0) {
        return { ...fb, didYouMean: chopped };
      }
    }
  }

  return primary;
}

const FEATURED_CAROUSEL_COUNT = 10;

function popularityScore(c: Community): number {
  const posts = Number(c.postCount ?? 0);
  const members = Number(c.memberCount ?? 0);
  const opens = Number(c.profileOpenCount ?? 0);
  return posts * 2 + members + opens * 5;
}

async function mergeCommunityCardStats(communities: Community[]): Promise<Community[]> {
  if (communities.length === 0) return [];
  const stats = await communitiesService.getCardStatsForIds(communities.map((c) => c.id));
  return communities.map((c) => {
    const s = stats.get(c.id);
    if (!s) return c;
    return {
      ...c,
      memberCount: s.memberCount,
      postCount: s.postCount,
      onlineCount: s.onlineCount,
      presenceAvatars: s.avatarUrls,
    };
  });
}

async function rankCommunitiesByPopularity(): Promise<Community[]> {
  const all = await communitiesService.getAll().catch(() => [] as Community[]);
  if (all.length === 0) return [];
  const merged = await mergeCommunityCardStats(all);
  // Admin-curated pins come first: any circle with a non-null `featured_order`
  // sorts ahead of the popularity-ranked rest (lower order = earlier). This is
  // how the "App Suggestions" circle stays pinned to the front of the strip
  // without faking inflated member/post counts. Circles without a pin fall
  // back to the pure popularity score.
  merged.sort((a, b) => {
    const ao = a.featuredOrder;
    const bo = b.featuredOrder;
    const aPinned = ao != null;
    const bPinned = bo != null;
    if (aPinned && bPinned) return ao - bo;
    if (aPinned) return -1;
    if (bPinned) return 1;
    return popularityScore(b) - popularityScore(a);
  });
  return merged;
}

async function featuredFallbackSlugOrder(): Promise<Community[]> {
  const all = await communitiesService.getAll().catch(() => [] as Community[]);
  const bySlug = new Map(all.map((c) => [c.slug, c]));
  const out: Community[] = [];
  for (const slug of FEATURED_CIRCLE_SLUGS_ORDER) {
    const c = bySlug.get(slug);
    if (c) out.push(c);
  }
  return mergeCommunityCardStats(out);
}

export const circleContentService = {
  /**
   * Top **10** Circles on the horizontal strip — **popularity** (posts, members, room opens).
   * Falls back to slug seed order only when ranking fails or the directory is empty.
   */
  async getFeaturedCircles(): Promise<Community[]> {
    try {
      const ranked = await rankCommunitiesByPopularity();
      if (ranked.length > 0) {
        return ranked.slice(0, FEATURED_CAROUSEL_COUNT);
      }
    } catch {
      /* fall through */
    }
    return featuredFallbackSlugOrder();
  },

  /**
   * Top 3 across all circles: hottest threads + community posts in the last
   * 24h. When the last 24 hours are thin (fewer than 3 eligible items) we
   * transparently backfill by walking wider windows — 7d → 30d → all-time —
   * so the landing page always shows three trending cards instead of one.
   *
   * Scoring favors reactions and reshares; the window used is purely a
   * recency filter, not part of the rank.
   */
  async getTrending24h(): Promise<TrendingTopic24h[]> {
    const WINDOW_LADDER_MS = [
      24 * 60 * 60 * 1000,         // last 24h (preferred)
      7 * 24 * 60 * 60 * 1000,     // last 7d
      30 * 24 * 60 * 60 * 1000,    // last 30d
      0,                            // all-time fallback
    ];

    type Row = { item: TrendingTopic24h; score: number };

    async function rank(windowMs: number): Promise<Row[]> {
      const [threadCandidates, postCandidates] = await Promise.all([
        circleThreadsDb.trendingThreadCandidatesSince(windowMs, 100),
        postsService.getCommunityPostCandidatesSince(windowMs, 100),
      ]);

      const communityIds = new Set<string>();
      for (const p of postCandidates) {
        const cid = p.communities?.[0];
        if (cid) communityIds.add(cid);
      }
      const idList = [...communityIds];
      const circleMeta = new Map<string, { id: string; slug: string; name: string }>();
      if (idList.length > 0) {
        const comms = await communitiesService.getByIds(idList);
        for (const c of comms) {
          circleMeta.set(c.id, { id: c.id, slug: c.slug, name: c.name });
        }
      }

      const rows: Row[] = [
        ...threadCandidates.map((t) => ({ item: t, score: trendingScoreThread(t) })),
        ...postCandidates
          .map((p) => {
            const item = postToTrending24h(p, circleMeta);
            return item ? { item, score: trendingScorePost(p) } : null;
          })
          .filter((x): x is Row => x != null),
      ];
      rows.sort((a, b) => b.score - a.score);
      return rows;
    }

    try {
      const seenIds = new Set<string>();
      const picked: TrendingTopic24h[] = [];

      for (const win of WINDOW_LADDER_MS) {
        if (picked.length >= 3) break;
        const rows = await rank(win);
        for (const r of rows) {
          if (picked.length >= 3) break;
          if (seenIds.has(r.item.id)) continue;
          seenIds.add(r.item.id);
          picked.push(r.item);
        }
      }

      /** When real thread/post activity is sparse, still show 3 cards using seeded rooms (opens circle hub). */
      if (picked.length < 3) {
        const usedCircle = new Set(picked.map((p) => p.circleId));
        const comms = await communitiesService.getBySlugsOrdered([...FEATURED_CIRCLE_SLUGS_ORDER]);
        for (const c of comms) {
          if (picked.length >= 3) break;
          if (usedCircle.has(c.id)) continue;
          usedCircle.add(c.id);
          const fid = `trend-room-${c.id}`;
          if (seenIds.has(fid)) continue;
          seenIds.add(fid);
          const rawTag = (c.trendingTopics?.[0] ?? '').trim().replace(/^#/, '');
          picked.push({
            id: fid,
            circleId: c.id,
            circleSlug: c.slug,
            circleName: c.name,
            title: rawTag ? `#${rawTag}` : `What’s new in ${c.name}`,
            preview: (c.description ?? '').slice(0, 140) || ' ',
            replyCount: 0,
            reactionCount: 0,
            shareCount: 0,
            lastActiveAt: new Date().toISOString(),
          });
        }
      }

      return picked;
    } catch {
      return [];
    }
  },

  /**
   * “New circles” row: actual newest-created Circles first (ordered by `created_at`
   * desc) so the spotlight always reflects the most recently created rooms. The
   * curated PROMOTED_NEW_CIRCLE_SLUGS list is only used as backfill if there aren’t
   * enough recent rooms to fill the longer “more new & recent” list.
   */
  async getNewCircles(): Promise<Community[]> {
    try {
      const recent = await communitiesService.getRecentlyAdded(32);
      const seen = new Set<string>(recent.map((c) => c.slug));
      const promoted = await communitiesService.getBySlugsOrdered([...PROMOTED_NEW_CIRCLE_SLUGS]);
      const backfill = promoted.filter((c) => !seen.has(c.slug));
      /** Newest-created spotlight (first 3); promoted rooms only backfill the tail. */
      return [...recent, ...backfill].slice(0, 28);
    } catch {
      return [];
    }
  },

  async getThreadsByCommunityId(
    communityId: string,
    opts?: { limit?: number; cursor?: string | null; viewerId?: string | null },
  ): Promise<CircleThread[]> {
    return circleThreadsDb.listByCommunityId(communityId, opts);
  },

  /** Questions / discussions tab — inserts into `circle_threads` (not circle wall posts). */
  async createThread(params: {
    communityId: string;
    authorId: string;
    kind: CircleThreadKind;
    title: string;
    body: string;
    flairTag?: CircleFlairTag | null;
    mediaThumbUrl?: string | null;
    linkedPostId?: string | null;
    /** Attribution to a Circle "This Week" prompt (migration 274). */
    weeklyPromptId?: string | null;
  }): Promise<CircleThread> {
    return circleThreadsDb.createThread(params);
  },

  async getThreadsByCircleSlug(slug: string, viewerId?: string | null): Promise<CircleThread[]> {
    return circleThreadsDb.listBySlug(slug, viewerId);
  },

  /** Use `null` when missing — TanStack Query must not settle `undefined` from `queryFn`. */
  async getThreadById(id: string, viewerId?: string | null): Promise<CircleThread | null> {
    const t = await circleThreadsDb.getById(id, viewerId);
    return t ?? null;
  },

  async getRepliesForThread(
    threadId: string,
    opts?: {
      limit?: number;
      cursor?: string | null;
      viewerId?: string | null;
      thread?: CircleThread | null;
    },
  ) {
    return circleThreadsDb.listReplies(threadId, opts);
  },

  async addReply(threadId: string, body: string) {
    return circleThreadsDb.addReply(threadId, body);
  },

  async getThreadReactionForUser(threadId: string, userId: string | null): Promise<boolean> {
    return circleThreadsDb.getThreadReactionForUser(threadId, userId);
  },

  async toggleThreadReaction(threadId: string): Promise<{ reacted: boolean }> {
    return circleThreadsDb.toggleThreadReaction(threadId);
  },

  async getReplyHelpfulForUser(replyIds: string[], userId: string | null): Promise<Set<string>> {
    return circleThreadsDb.getReplyHelpfulForUser(replyIds, userId);
  },

  async toggleReplyHelpful(replyId: string): Promise<{ reacted: boolean; helpfulCount: number }> {
    return circleThreadsDb.toggleReplyHelpful(replyId);
  },

  async getJoinedCircleActivityBadges(
    communityIds: string[],
    sinceByCommunityId: Record<string, string>,
  ) {
    return circleThreadsDb.getJoinedCircleActivityBadges(communityIds, sinceByCommunityId);
  },

  async getWelcomeThread(communityId: string, fallbackThreadId?: string | null) {
    return circleThreadsDb.getWelcomeThread(communityId, fallbackThreadId);
  },

  async getTopHelpers(communityId: string, limit = 3) {
    return circleThreadsDb.getTopHelpers(communityId, limit);
  },

  async updateThreadFlair(
    threadId: string,
    flairTag: CircleFlairTag | null,
    currentKind: CircleThreadKind,
    viewerId?: string | null,
  ) {
    return circleThreadsDb.updateThreadFlair(threadId, flairTag, currentKind, viewerId);
  },

  async searchCirclesAndTopics(query: string): Promise<Community[]> {
    const grouped = await searchCirclesAndTopicsGroupedFn(query);
    const seen = new Set<string>();
    const out: Community[] = [];
    for (const c of [...grouped.directory, ...grouped.fromDiscussions]) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      out.push(c);
    }
    return out;
  },

  searchCirclesAndTopicsGrouped: searchCirclesAndTopicsGroupedFn,

  /** Onboarding / discover: interest + audience aware Circle suggestions. */
  async getOnboardingSuggestedCircles(input: {
    audienceRole: AudienceRole | null;
    interests: ContentInterest[];
    limit?: number;
  }): Promise<Community[]> {
    const slugs = suggestOnboardingCircleSlugs(input);
    return communitiesService.getBySlugsOrdered(slugs);
  },
};
