import type { Community, CircleThread, Post, TrendingTopic24h } from '@/types';
import { FEATURED_CIRCLE_SLUGS_ORDER } from '@/constants/circleDiscovery';
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

export const circleContentService = {
  async getFeaturedCircles(): Promise<Community[]> {
    const all = await communitiesService.getAll().catch(() => [] as Community[]);
    const curated = all
      .filter((c) => c.featuredOrder != null)
      .sort((a, b) => Number(a.featuredOrder) - Number(b.featuredOrder));
    let out: Community[];
    if (curated.length > 0) {
      out = curated;
    } else {
      const bySlug = new Map(all.map((c) => [c.slug, c]));
      out = [];
      for (const slug of FEATURED_CIRCLE_SLUGS_ORDER) {
        const c = bySlug.get(slug);
        if (c) out.push(c);
      }
    }
    if (out.length === 0) return out;
    const stats = await communitiesService.getCardStatsForIds(out.map((c) => c.id));
    return out.map((c) => {
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

      return picked;
    } catch {
      return [];
    }
  },

  /** Three most recently created communities (new rooms). */
  async getNewCircles(): Promise<Community[]> {
    try {
      return await communitiesService.getRecentlyAdded(3);
    } catch {
      return [];
    }
  },

  async getThreadsByCircleSlug(slug: string): Promise<CircleThread[]> {
    return circleThreadsDb.listBySlug(slug);
  },

  async getThreadById(id: string): Promise<CircleThread | undefined> {
    const t = await circleThreadsDb.getById(id);
    return t ?? undefined;
  },

  async getRepliesForThread(threadId: string) {
    return circleThreadsDb.listReplies(threadId);
  },

  async addReply(threadId: string, body: string) {
    return circleThreadsDb.addReply(threadId, body);
  },

  async searchCirclesAndTopics(query: string): Promise<Community[]> {
    const s = query.trim();
    if (!s) return [];
    try {
      const [byMeta, byThreads] = await Promise.all([
        communitiesService.search(s),
        circleThreadsDb.searchCommunitiesByThreadKeyword(s).catch(() => [] as Community[]),
      ]);
      const seen = new Set<string>();
      const out: Community[] = [];
      for (const c of [...byMeta, ...byThreads]) {
        if (seen.has(c.id)) continue;
        seen.add(c.id);
        out.push(c);
      }
      return out;
    } catch {
      return [];
    }
  },
};
