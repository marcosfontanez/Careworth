import type { Community, CircleThread, Post, TrendingTopic24h } from '@/types';
import { FEATURED_CIRCLE_SLUGS_ORDER, PROMOTED_NEW_CIRCLE_SLUGS } from '@/constants/circleDiscovery';
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
    return { directory: [], fromDiscussions: [] };
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
  merged.sort((a, b) => popularityScore(b) - popularityScore(a));
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
   * “New circles” row: curated slugs first (so fresh rooms surface even when older
   * communities have newer `created_at` from admin edits), then recently created.
   */
  async getNewCircles(): Promise<Community[]> {
    try {
      const promoted = await communitiesService.getBySlugsOrdered([...PROMOTED_NEW_CIRCLE_SLUGS]);
      const recent = await communitiesService.getRecentlyAdded(32);
      const promotedSet = new Set<string>([...PROMOTED_NEW_CIRCLE_SLUGS]);
      const rest = recent.filter((c) => !promotedSet.has(c.slug));
      /** Extra rows feed the “More new & recent” list; the Circles tab only spotlights the first 3. */
      return [...promoted, ...rest].slice(0, 28);
    } catch {
      return [];
    }
  },

  async getThreadsByCommunityId(communityId: string): Promise<CircleThread[]> {
    return circleThreadsDb.listByCommunityId(communityId);
  },

  async getThreadsByCircleSlug(slug: string): Promise<CircleThread[]> {
    return circleThreadsDb.listBySlug(slug);
  },

  /** Use `null` when missing — TanStack Query must not settle `undefined` from `queryFn`. */
  async getThreadById(id: string): Promise<CircleThread | null> {
    const t = await circleThreadsDb.getById(id);
    return t ?? null;
  },

  async getRepliesForThread(threadId: string) {
    return circleThreadsDb.listReplies(threadId);
  },

  async addReply(threadId: string, body: string) {
    return circleThreadsDb.addReply(threadId, body);
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
};
