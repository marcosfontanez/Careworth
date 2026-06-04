import { Platform } from 'react-native';
import { usernamePassesContentPolicy } from '@/lib/handleContentPolicy';
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabase } from '@/lib/supabase';
import { escapePostgrestIlike } from '@/lib/searchQuery';
import { mapPulseAvatarFrameEmbed } from '@/lib/pulseAvatarFrameMap';
import type { PulseAvatarFrame, UserProfile } from '@/types';
/**
 * Explicit profile column list. We select columns by name (never `*`) so that
 * `role_admin` is NEVER returned to normal authenticated/anon profile reads —
 * migration 247 revokes the column grant, so a `*` read would now error.
 * push_token / push_token_updated_at were removed in migration 243.
 * Keep this in sync with public.profiles.
 */
export const PROFILE_COLUMNS =
  'avatar_url, banner_url, bio, brand_kit, city, created_at, default_allow_clip_downloads, default_allow_remix, default_allow_viewer_clips, display_name, first_name, follower_count, following_count, hide_pulse_music_player_on_my_page, id, identity_tags, is_creator, is_verified, last_name, like_count, post_count, preferred_locale, privacy_mode, product_digest_email, profile_song_artist, profile_song_artwork_url, profile_song_title, profile_song_url, pulse_score_current, pulse_tier, role, selected_pulse_avatar_frame_id, shift_preference, specialty, state, terms_and_privacy_accepted_at, total_shares, updated_at, username, years_experience';

export const PROFILE_SELECT_WITH_AVATAR_FRAME =
  `${PROFILE_COLUMNS}, pulse_avatar_frame:pulse_avatar_frames!profiles_selected_pulse_avatar_frame_id_fkey(id, slug, label, subtitle, prize_tier, rarity_tier, acquisition_tag, month_start, ring_color, glow_color, ring_caption)`;

/** Public catalog columns for a single equipped-frame lookup (no admin fields). */
export const PULSE_FRAME_PUBLIC_COLUMNS =
  'id, slug, label, subtitle, prize_tier, rarity_tier, acquisition_tag, month_start, ring_color, glow_color, ring_caption';

/** Per-attempt ceiling for a single profile row fetch (embeds / tunnel can stall). */
const PROFILE_FETCH_TIMEOUT_MS = 12_000;

/**
 * Race a Supabase query builder against a timeout so a single hung request
 * can't block profile hydration indefinitely. Rejects on timeout so callers
 * can fall back to a cheaper query.
 */
export function withProfileTimeout<T>(builder: PromiseLike<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('profile fetch timed out')),
      PROFILE_FETCH_TIMEOUT_MS,
    );
    Promise.resolve(builder).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

function rowToProfile(row: any): UserProfile {
  const dn =
    (typeof row.display_name === 'string' && row.display_name.trim()) ||
    (typeof row.first_name === 'string' && row.first_name.trim()) ||
    (typeof row.username === 'string' && row.username.trim()) ||
    '';
  return {
    id: row.id,
    displayName: dn || 'Someone',
    firstName:
      (typeof row.first_name === 'string' && row.first_name.trim()) ||
      (typeof row.username === 'string' && row.username.trim()) ||
      '',
    lastName: row.last_name ?? undefined,
    role: (String(row.role ?? '').trim() || '') as UserProfile['role'],
    specialty: (String(row.specialty ?? '').trim() || '') as UserProfile['specialty'],
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
    hidePulseMusicPlayerOnMyPage: Boolean(row.hide_pulse_music_player_on_my_page),
    defaultAllowViewerClips: row.default_allow_viewer_clips !== false,
    defaultAllowRemix: row.default_allow_remix !== false,
    defaultAllowClipDownloads: row.default_allow_clip_downloads === true,
    /**
     * Denormalized Pulse Score v2 columns (see migration 059). Falls
     * back to `'murmur'` / 0 for rows written before the trigger
     * existed, so feed badges never render undefined.
     */
    pulseTier: typeof row.pulse_tier === 'string' ? row.pulse_tier : 'murmur',
    pulseScoreCurrent:
      typeof row.pulse_score_current === 'number' ? row.pulse_score_current : 0,
    selectedPulseAvatarFrameId:
      row.selected_pulse_avatar_frame_id != null
        ? String(row.selected_pulse_avatar_frame_id)
        : row.selected_pulse_avatar_frame_id === null
          ? null
          : undefined,
    pulseAvatarFrame:
      row.pulse_avatar_frame === undefined
        ? undefined
        : mapPulseAvatarFrameEmbed(row.pulse_avatar_frame) ?? null,
    termsPrivacyAcceptedAt:
      row.terms_and_privacy_accepted_at != null
        ? String(row.terms_and_privacy_accepted_at)
        : row.terms_and_privacy_accepted_at === null
          ? null
          : undefined,
  };
}

async function fetchPulseFrameById(frameId: string): Promise<PulseAvatarFrame | null | undefined> {
  const { data, error } = await withProfileTimeout(
    supabase.from('pulse_avatar_frames').select(PULSE_FRAME_PUBLIC_COLUMNS).eq('id', frameId).maybeSingle(),
  );
  if (error || !data) return undefined;
  return mapPulseAvatarFrameEmbed(data) ?? null;
}

async function fetchPulseFrameByIdWithAccessToken(
  frameId: string,
  accessToken: string,
): Promise<PulseAvatarFrame | null | undefined> {
  const token = accessToken.trim();
  if (!token || !SUPABASE_URL || SUPABASE_URL.includes('invalid.localhost')) return undefined;

  const select = encodeURIComponent(PULSE_FRAME_PUBLIC_COLUMNS);
  const url =
    `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/pulse_avatar_frames` +
    `?id=eq.${encodeURIComponent(frameId)}&select=${select}`;

  const fetchRow = fetch(url, {
    method: 'GET',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.pgrst.object+json',
    },
  }).then(async (res) => {
    if (!res.ok) return undefined;
    return mapPulseAvatarFrameEmbed(await res.json()) ?? null;
  });

  try {
    return await withProfileTimeout(fetchRow);
  } catch {
    return undefined;
  }
}

/**
 * Plain profile reads (native perf path) omit the PostgREST embed. When
 * `selected_pulse_avatar_frame_id` is set, load the catalog row so My Pulse /
 * feed avatars can render shop borders like Class of 2026.
 */
export async function enrichProfileEquippedFrame(
  profile: UserProfile,
  accessToken?: string | null,
): Promise<UserProfile> {
  if (profile.pulseAvatarFrame !== undefined) return profile;
  const frameId = profile.selectedPulseAvatarFrameId;
  if (!frameId) return { ...profile, pulseAvatarFrame: null };

  const frame = accessToken
    ? await fetchPulseFrameByIdWithAccessToken(frameId, accessToken)
    : await fetchPulseFrameById(frameId);
  if (frame === undefined) return profile;
  return { ...profile, pulseAvatarFrame: frame };
}

/**
 * Read the signed-in user's profile row using an access token we already hold from
 * `getSession()` — bypasses Supabase Auth's exclusive token lock, which on cold boot
 * can block `supabase.from('profiles')` for 15–20s while JWT refresh runs.
 */
export async function getByIdWithAccessToken(
  id: string,
  accessToken: string,
): Promise<UserProfile | null> {
  const token = accessToken.trim();
  if (!token || !SUPABASE_URL || SUPABASE_URL.includes('invalid.localhost')) return null;

  const select = encodeURIComponent(PROFILE_COLUMNS);
  const url =
    `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/profiles` +
    `?id=eq.${encodeURIComponent(id)}&select=${select}`;

  const fetchRow = fetch(url, {
    method: 'GET',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.pgrst.object+json',
    },
  }).then(async (res) => {
    if (!res.ok) {
      if (__DEV__) {
        console.warn('[profiles] bootstrap row fetch failed', res.status, await res.text().catch(() => ''));
      }
      return null;
    }
    return rowToProfile(await res.json());
  });

  try {
    const profile = await withProfileTimeout(fetchRow);
    if (!profile) return null;
    return enrichProfileEquippedFrame(profile, token);
  } catch {
    return null;
  }
}

export const profilesService = {
  async getByUsername(handle: string): Promise<UserProfile | null> {
    const h = handle.replace(/^@/, '').trim().toLowerCase();
    if (!h) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select(PROFILE_SELECT_WITH_AVATAR_FRAME)
      .eq('username', h)
      .maybeSingle();
    if (error || !data) return null;
    return rowToProfile(data);
  },

  async getById(id: string): Promise<UserProfile | null> {
    const fetchWith = async (select: string): Promise<UserProfile | null> => {
      const { data, error } = await withProfileTimeout(
        supabase.from('profiles').select(select).eq('id', id).single(),
      );
      if (error || !data) return null;
      return rowToProfile(data);
    };

    const preferPlainFirst = Platform.OS !== 'web';
    const tryOrder = preferPlainFirst
      ? [PROFILE_COLUMNS, PROFILE_SELECT_WITH_AVATAR_FRAME]
      : [PROFILE_SELECT_WITH_AVATAR_FRAME, PROFILE_COLUMNS];

    for (const select of tryOrder) {
      try {
        const profile = await fetchWith(select);
        if (profile) return enrichProfileEquippedFrame(profile);
      } catch {
        /* timed out — try next select shape */
      }
    }
    return null;
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
    hide_pulse_music_player_on_my_page?: boolean;
    default_allow_viewer_clips?: boolean;
    default_allow_remix?: boolean;
    default_allow_clip_downloads?: boolean;
    terms_and_privacy_accepted_at?: string | null;
  }>) {
    const qb = supabase.from('profiles') as any;
    const { data, error } = await qb
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      // Explicit columns (never `*`): role_admin is not client-readable (migration 247).
      .select(PROFILE_COLUMNS)
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
      .select(PROFILE_SELECT_WITH_AVATAR_FRAME)
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
      .select(PROFILE_SELECT_WITH_AVATAR_FRAME)
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
    if (!usernamePassesContentPolicy(c)) return false;
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
      .select(PROFILE_SELECT_WITH_AVATAR_FRAME)
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

  /** Opt-in notifications when `creatorId` publishes a new live post. */
  async isSubscribedToCreatorPosts(subscriberId: string, creatorId: string): Promise<boolean> {
    if (!subscriberId || !creatorId || subscriberId === creatorId) return false;
    const { data, error } = await supabase
      .from('creator_post_subscribers')
      .select('subscriber_id')
      .eq('subscriber_id', subscriberId)
      .eq('creator_id', creatorId)
      .maybeSingle();
    if (error) {
      if (__DEV__) console.warn('[isSubscribedToCreatorPosts]', error.message);
      return false;
    }
    return !!data;
  },

  async setCreatorPostNotifications(
    subscriberId: string,
    creatorId: string,
    enabled: boolean,
  ): Promise<void> {
    if (!subscriberId || !creatorId || subscriberId === creatorId) {
      throw new Error('Invalid subscription');
    }
    if (enabled) {
      const { error } = await supabase.from('creator_post_subscribers').upsert(
        { subscriber_id: subscriberId, creator_id: creatorId },
        { onConflict: 'subscriber_id,creator_id' },
      );
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('creator_post_subscribers')
        .delete()
        .eq('subscriber_id', subscriberId)
        .eq('creator_id', creatorId);
      if (error) throw error;
    }
  },
};
