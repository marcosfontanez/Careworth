import { supabase } from '@/lib/supabase';
import { escapePostgrestIlike } from '@/lib/searchQuery';
import type { Community } from '@/types';

export function rowToCommunity(row: any): Community {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    icon: row.icon,
    accentColor: row.accent_color,
    bannerUrl: row.banner_url,
    memberCount: row.member_count,
    postCount: row.post_count,
    isJoined: false,
    categories: row.categories ?? [],
    trendingTopics: row.trending_topics ?? [],
    featuredOrder: row.featured_order ?? null,
    profileOpenCount: row.profile_open_count ?? 0,
  };
}

export const communitiesService = {
  async getAll(): Promise<Community[]> {
    const { data, error } = await supabase
      .from('communities')
      .select('*')
      .order('member_count', { ascending: false });

    if (error) throw error;
    return (data ?? []).map(rowToCommunity);
  },

  /** Every circle, A–Z by URL slug (for directory / browse-all). */
  async getAllAlphabeticalBySlug(): Promise<Community[]> {
    const { data, error } = await supabase
      .from('communities')
      .select('*')
      .order('slug', { ascending: true });

    if (error) throw error;
    return (data ?? []).map(rowToCommunity);
  },

  /** Search / Discover empty-query browse — capped for payload size. */
  async browseDirectory(limit = 30): Promise<Community[]> {
    const { data, error } = await supabase
      .from('communities')
      .select('*')
      .order('member_count', { ascending: false })
      .limit(Math.max(1, Math.min(limit, 60)));

    if (error) throw error;
    return (data ?? []).map(rowToCommunity);
  },

  /** Most recently added rooms (by `created_at`). */
  async getRecentlyAdded(limit = 3): Promise<Community[]> {
    const { data, error } = await supabase
      .from('communities')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data ?? []).map(rowToCommunity);
  },

  async getById(id: string): Promise<Community | null> {
    const { data, error } = await supabase.from('communities').select('*').eq('id', id).maybeSingle();
    if (error || !data) return null;
    return rowToCommunity(data);
  },

  async getByIds(ids: string[]): Promise<Community[]> {
    const uniq = [...new Set(ids.filter(Boolean))];
    if (uniq.length === 0) return [];
    const { data, error } = await supabase.from('communities').select('*').in('id', uniq);
    if (error) throw error;
    return (data ?? []).map(rowToCommunity);
  },

  async getBySlug(slug: string): Promise<Community | null> {
    const key = slug.trim().toLowerCase();
    if (!key) return null;
    const { data, error } = await supabase
      .from('communities')
      .select('*')
      .eq('slug', key)
      .maybeSingle();

    if (error || !data) return null;
    return rowToCommunity(data);
  },

  /** Fetch by slug list; order matches `slugs` (missing rows skipped). */
  async getBySlugsOrdered(slugs: string[]): Promise<Community[]> {
    const uniq = [...new Set(slugs.filter(Boolean))];
    if (uniq.length === 0) return [];
    const { data, error } = await supabase.from('communities').select('*').in('slug', uniq);
    if (error) throw error;
    const bySlug = new Map((data ?? []).map((row: any) => [row.slug, rowToCommunity(row)]));
    return uniq.map((s) => bySlug.get(s)).filter((c): c is Community => c != null);
  },

  async getJoined(userId: string): Promise<Community[]> {
    const { data, error } = await supabase
      .from('community_members')
      .select('community_id, communities(*)')
      .eq('user_id', userId);

    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      ...rowToCommunity(r.communities),
      isJoined: true,
    }));
  },

  async search(query: string): Promise<Community[]> {
    const raw = query.trim();
    if (!raw) return [];
    const s = escapePostgrestIlike(raw);
    const { data, error } = await supabase
      .from('communities')
      .select('*')
      .or(`name.ilike.%${s}%,description.ilike.%${s}%`)
      .limit(20);

    if (error) throw error;
    return (data ?? []).map(rowToCommunity);
  },

  /** Live counts + presence avatars for featured cards (RPC `get_community_card_stats`). */
  async getCardStatsForIds(communityIds: string[]): Promise<
    Map<
      string,
      {
        memberCount: number;
        postCount: number;
        onlineCount: number;
        avatarUrls: string[];
      }
    >
  > {
    const ids = communityIds.filter(Boolean);
    const out = new Map<
      string,
      { memberCount: number; postCount: number; onlineCount: number; avatarUrls: string[] }
    >();
    if (ids.length === 0) return out;

    const { data, error } = await supabase.rpc('get_community_card_stats', {
      p_ids: ids,
    } as never);

    if (error) {
      if (__DEV__) console.warn('[communitiesService.getCardStatsForIds]', error.message);
      return out;
    }

    for (const row of (data ?? []) as any[]) {
      const cid = String(row.community_id);
      const urls = Array.isArray(row.avatar_urls) ? row.avatar_urls.filter(Boolean) : [];
      out.set(cid, {
        memberCount: Number(row.member_count ?? 0),
        postCount: Number(row.post_count ?? 0),
        onlineCount: Number(row.online_count ?? 0),
        avatarUrls: urls,
      });
    }
    return out;
  },

  /**
   * Popularity signal for Circles featured ordering. Best-effort RPC;
   * fails silently when unauthenticated or offline.
   */
  async bumpProfileOpen(communityId: string): Promise<void> {
    const id = (communityId ?? '').trim();
    if (!id) return;
    const { error } = await supabase.rpc('bump_community_profile_open', { p_community_id: id });
    if (error && __DEV__) console.warn('[communitiesService.bumpProfileOpen]', error.message);
  },

  async toggleJoin(
    userId: string,
    communityId: string,
    options?: { notifyNewPosts?: boolean },
  ): Promise<boolean> {
    const notifyNewPosts = options?.notifyNewPosts ?? true;
    const { data: existing } = await supabase
      .from('community_members')
      .select('id')
      .eq('user_id', userId)
      .eq('community_id', communityId)
      .maybeSingle();

    if (existing) {
      await supabase.from('community_members').delete().eq('id', existing.id);
      return false;
    } else {
      await supabase.from('community_members').insert({
        user_id: userId,
        community_id: communityId,
        notify_new_posts: notifyNewPosts,
      });
      return true;
    }
  },

  /** null = not a member */
  async getMemberNotifyNewPosts(userId: string, communityId: string): Promise<boolean | null> {
    const { data, error } = await supabase
      .from('community_members')
      .select('notify_new_posts')
      .eq('user_id', userId)
      .eq('community_id', communityId)
      .maybeSingle();
    if (error || !data) return null;
    return data.notify_new_posts !== false;
  },

  async setMemberNotifyNewPosts(
    userId: string,
    communityId: string,
    notifyNewPosts: boolean,
  ): Promise<void> {
    const { error } = await supabase
      .from('community_members')
      .update({ notify_new_posts: notifyNewPosts })
      .eq('user_id', userId)
      .eq('community_id', communityId);
    if (error && __DEV__) console.warn('[communitiesService.setMemberNotifyNewPosts]', error.message);
  },

  /**
   * Curated circle highlights (`community_post_pins`). RLS allows inserts only for
   * `profiles.role_admin` — used when staff toggles “Pin to Circle Highlights” on create.
   */
  async pinPostToCommunityHighlights(communityId: string, postId: string, sortOrder = 0): Promise<boolean> {
    const cid = communityId.trim();
    const pid = postId.trim();
    if (!cid || !pid) return false;
    const { error } = await supabase.from('community_post_pins').insert({
      community_id: cid,
      post_id: pid,
      sort_order: sortOrder,
    });
    if (error) {
      if (__DEV__) console.warn('[communitiesService.pinPostToCommunityHighlights]', error.message);
      return false;
    }
    return true;
  },
};
