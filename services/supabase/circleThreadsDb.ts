import { supabase } from '@/lib/supabase';
import type { Community, CircleReply, CircleThread, CircleThreadKind, CreatorSummary, TrendingTopic24h } from '@/types';
import { escapePostgrestIlike } from '@/lib/searchQuery';
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

function rowToThread(row: any): CircleThread {
  const c = row.communities;
  return {
    id: row.id,
    circleId: row.community_id,
    circleSlug: c?.slug ?? '',
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
  };
}

function rowToReply(row: any): CircleReply {
  return {
    id: row.id,
    threadId: row.thread_id,
    authorId: row.author_id,
    author: authorFromRow(row.author),
    body: row.body,
    createdAt: row.created_at,
    reactionCount: row.reaction_count ?? 0,
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

export const circleThreadsDb = {
  async listBySlug(slug: string): Promise<CircleThread[]> {
    const comm = await communitiesService.getBySlug(slug);
    if (!comm) return [];
    const { data, error } = await supabase
      .from('circle_threads')
      .select(THREAD_SELECT)
      .eq('community_id', comm.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map(rowToThread);
  },

  async getById(id: string): Promise<CircleThread | null> {
    const { data, error } = await supabase.from('circle_threads').select(THREAD_SELECT).eq('id', id).maybeSingle();
    if (error || !data) return null;
    return rowToThread(data);
  },

  async listReplies(threadId: string): Promise<CircleReply[]> {
    const { data, error } = await supabase
      .from('circle_replies')
      .select(
        `
        *,
        author:author_id(${PROFILE_SELECT_CREATOR_WITH_FRAME})
      `,
      )
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data ?? []).map(rowToReply);
  },

  async addReply(threadId: string, body: string): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
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
    const { data, error } = await supabase
      .from('circle_threads')
      .select(
        `
        community_id,
        communities(id, slug, name, icon, description, accent_color, banner_url, member_count, post_count, categories, trending_topics)
      `,
      )
      .or(`title.ilike.%${s}%,body.ilike.%${s}%`)
      .limit(50);

    if (error) throw error;
    const seen = new Set<string>();
    const out: Community[] = [];
    for (const row of data ?? []) {
      const c = (row as { communities?: Record<string, unknown> }).communities;
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
    let q = supabase
      .from('circle_threads')
      .select(THREAD_SELECT)
      .order('updated_at', { ascending: false })
      .limit(maxFetch);

    if (windowMs > 0) {
      const since = new Date(Date.now() - windowMs).toISOString();
      q = q.gte('updated_at', since);
    }

    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map((row: any) => {
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
