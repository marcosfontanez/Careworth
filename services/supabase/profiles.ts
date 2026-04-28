import { supabase } from '@/lib/supabase';
import { escapePostgrestIlike } from '@/lib/searchQuery';
import type { UserProfile } from '@/types';

function rowToProfile(row: any): UserProfile {
  return {
    id: row.id,
    displayName: row.display_name,
    firstName: row.first_name,
    lastName: row.last_name ?? undefined,
    role: row.role,
    specialty: row.specialty,
    city: row.city,
    state: row.state,
    yearsExperience: row.years_experience,
    bio: row.bio,
    avatarUrl: row.avatar_url ?? '',
    bannerUrl: row.banner_url ?? undefined,
    profileShareCount: row.total_shares ?? 0,
    followerCount: row.follower_count,
    followingCount: row.following_count,
    likeCount: row.like_count,
    postCount: row.post_count,
    badges: [],
    communitiesJoined: [],
    privacyMode: row.privacy_mode,
    interests: [],
    isVerified: row.is_verified,
    shiftPreference: row.shift_preference,
    profileSongTitle: row.profile_song_title ?? null,
    profileSongArtist: row.profile_song_artist ?? null,
    profileSongUrl: row.profile_song_url ?? null,
    profileSongArtworkUrl: row.profile_song_artwork_url ?? null,
    username: row.username?.trim() ? String(row.username).toLowerCase() : undefined,
    identityTags: Array.isArray(row.identity_tags)
      ? (row.identity_tags as string[]).map((s) => String(s).trim()).filter(Boolean)
      : undefined,
    hideRecentPostsOnMyPage: Boolean(row.hide_recent_posts_on_my_page),
    /**
     * Denormalized Pulse Score v2 columns (see migration 059). Falls
     * back to `'murmur'` / 0 for rows written before the trigger
     * existed, so feed badges never render undefined.
     */
    pulseTier: typeof row.pulse_tier === 'string' ? row.pulse_tier : 'murmur',
    pulseScoreCurrent:
      typeof row.pulse_score_current === 'number' ? row.pulse_score_current : 0,
  };
}

export const profilesService = {
  async getByUsername(handle: string): Promise<UserProfile | null> {
    const h = handle.replace(/^@/, '').trim().toLowerCase();
    if (!h) return null;
    const { data, error } = await supabase.from('profiles').select('*').eq('username', h).maybeSingle();
    if (error || !data) return null;
    return rowToProfile(data);
  },

  async getById(id: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return rowToProfile(data);
  },

  async update(id: string, updates: Partial<{
    display_name: string;
    username: string | null;
    first_name: string;
    last_name: string;
    role: string;
    specialty: string;
    city: string;
    state: string;
    years_experience: number;
    bio: string;
    avatar_url: string;
    banner_url?: string | null;
    total_shares?: number;
    privacy_mode: string;
    shift_preference: string;
    profile_song_title: string | null;
    profile_song_artist: string | null;
    profile_song_url: string | null;
    profile_song_artwork_url: string | null;
    identity_tags?: string[] | null;
    hide_recent_posts_on_my_page?: boolean;
  }>) {
    const qb = supabase.from('profiles') as any;
    const { data, error } = await qb
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return rowToProfile(data);
  },

  async search(query: string): Promise<UserProfile[]> {
    const raw = query.trim();
    if (!raw) return [];
    const s = escapePostgrestIlike(raw);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`display_name.ilike.%${s}%,first_name.ilike.%${s}%,specialty.ilike.%${s}%,username.ilike.%${s}%`)
      .limit(20);

    if (error) throw error;
    return (data ?? []).map(rowToProfile);
  },

  /**
   * Lightweight @mention autocomplete query — returns up to `limit` profiles
   * whose username starts with the fragment (minus any leading @). Ordered
   * by follower count so higher-signal creators surface first.
   */
  async searchByHandle(fragment: string, limit = 8): Promise<UserProfile[]> {
    const raw = fragment.replace(/^@+/, '').trim().toLowerCase();
    if (!raw) return [];
    const s = escapePostgrestIlike(raw);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', `${s}%`)
      .order('follower_count', { ascending: false })
      .limit(Math.max(1, Math.min(limit, 20)));
    if (error) {
      if (__DEV__) console.warn('[searchByHandle]', error.message);
      return [];
    }
    return (data ?? []).map(rowToProfile);
  },

  /**
   * Asks the database whether `candidate` is both structurally valid AND not
   * taken. Uses the `check_username_available` RPC so the grammar rules
   * stay in sync with the DB CHECK constraint from migration 048.
   */
  async isUsernameAvailable(candidate: string): Promise<boolean> {
    const c = candidate.replace(/^@+/, '').trim().toLowerCase();
    if (!c) return false;
    // Cast to `any` — the generated Supabase types in lib/database.types.ts
    // don't yet include RPCs from migration 048. Regen will erase the cast.
    const { data, error } = await (supabase.rpc as any)(
      'check_username_available',
      { candidate: c },
    );
    if (error) {
      if (__DEV__) console.warn('[isUsernameAvailable]', error.message);
      return false;
    }
    return Boolean(data);
  },

  /** Top creators ranked by follower count — used as the default "browse" list on the search screen. */
  async getPopularCreators(limit = 20): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('follower_count', { ascending: false })
      .limit(Math.max(1, Math.min(limit, 100)));
    if (error) {
      if (__DEV__) console.warn('[getPopularCreators]', error.message);
      return [];
    }
    return (data ?? []).map(rowToProfile);
  },

  async toggleFollow(followerId: string, followingId: string): Promise<boolean> {
    if (!followerId || !followingId || followerId === followingId) return false;
    const follows = supabase.from('follows') as any;
    const { data: existing } = await follows
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .maybeSingle();

    if (existing) {
      await follows.delete().eq('id', existing.id);
      return false;
    }
    await follows.insert({ follower_id: followerId, following_id: followingId });
    return true;
  },

  /** Set of profile ids the user is currently following. Used to hydrate UI state on app start. */
  async getFollowedIdsForUser(userId: string): Promise<Set<string>> {
    if (!userId) return new Set();
    const { data, error } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId)
      .limit(2000);
    if (error) {
      if (__DEV__) console.warn('[getFollowedIdsForUser]', error.message);
      return new Set();
    }
    return new Set((data ?? []).map((r: { following_id: string }) => r.following_id));
  },
};
