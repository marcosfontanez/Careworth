import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from '@/lib/supabase';
import { signInWithOAuthNative } from '@/lib/oauthNative';
import { signInWithAppleAdaptive } from '@/lib/appleAuthNative';
import { normalizePhoneE164 } from '@/lib/phoneE164';
import { analytics } from '@/lib/analytics';
import type { Session, User } from '@supabase/supabase-js';
import type { UserProfile } from '@/types';
import { useProfileCustomization } from '@/store/useProfileCustomization';
import { useAppStore } from '@/store/useAppStore';
import { PROFILE_SELECT_WITH_AVATAR_FRAME } from '@/services/supabase/profiles';
import { mapPulseAvatarFrameEmbed } from '@/lib/pulseAvatarFrameMap';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (
    email: string,
    password: string,
    fullName: string,
    termsAcceptedAtIso: string,
    preferredUsername: string,
  ) => Promise<{ error: Error | null }>;
  signInWithPhone: (phone: string) => Promise<{ error: Error | null }>;
  verifyOtp: (phone: string, token: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInWithApple: () => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const fetchProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    /**
     * Cold-boot parallelization: the original code ran 5 sequential
     * round-trips (profile → badges → interests → communities → follows),
     * blocking auth state hydration on the slowest single query in the
     * chain. On a cold boot this serialized ~5 × 80–150ms = 400–750ms
     * before any UI could render.
     *
     * `Promise.all` here cuts that to one round-trip latency (the
     * slowest single query — typically the profile row itself), saving
     * ~300–500ms on cold boot on a typical mobile network.
     *
     * We still await the bundle before returning the `UserProfile`
     * because every consumer of `useAuth().profile` expects the
     * communities + follows + badges to be present, so the auth shell
     * can route correctly on first paint.
     */
    const [
      profileRes,
      badgeRes,
      interestRes,
      communityRes,
      followsRes,
    ] = await Promise.all([
      supabase.from('profiles').select(PROFILE_SELECT_WITH_AVATAR_FRAME).eq('id', userId).single(),
      supabase.from('user_badges').select('badge_id, badges(*)').eq('user_id', userId),
      supabase.from('user_interests').select('interest').eq('user_id', userId),
      supabase.from('community_members').select('community_id').eq('user_id', userId),
      supabase.from('follows').select('following_id').eq('follower_id', userId).limit(2000),
    ]);

    const { data, error } = profileRes;
    if (error || !data) return null;

    const row = data as Record<string, unknown> & {
      id: string;
      display_name: string;
      first_name: string;
      last_name: string | null;
      role: string;
      specialty: string;
      city: string;
      state: string;
      years_experience: number;
      bio: string;
      avatar_url: string | null;
      follower_count: number;
      following_count: number;
      like_count: number;
      post_count: number;
      privacy_mode: string;
      is_verified: boolean;
      shift_preference: string;
      profile_song_title?: string | null;
      profile_song_artist?: string | null;
      profile_song_url?: string | null;
    };

    const badgeRows = badgeRes.data;
    const interestRows = interestRes.data;
    const communityRows = communityRes.data;
    const followRows = followsRes.data;

    useAppStore.getState().setJoinedCommunityIdsFromServer(
      (communityRows ?? []).map((r: { community_id: string }) => String(r.community_id)),
    );

    /**
     * Hydrate the followed-creator set from `public.follows` so the UI shows the
     * correct following state across sessions. Errors here are non-fatal — we
     * leave whatever's already in the store rather than wiping it.
     */
    if (followRows) {
      useAppStore.getState().setFollowedCreatorIdsFromServer(
        followRows.map((r: { following_id: string }) => String(r.following_id)),
      );
    }

    const title = row.profile_song_title;
    const artist = row.profile_song_artist;
    const url = row.profile_song_url;
    const hasSong = Boolean((title?.trim() || '') || (artist?.trim() || '') || (url?.trim() || ''));
    useProfileCustomization.getState().setProfileSong(
      hasSong
        ? {
            title: title?.trim() ?? '',
            artist: artist?.trim() ?? '',
            url: url?.trim() || null,
          }
        : null,
    );

    const pr = data as any;

    return {
      id: row.id,
      displayName: row.display_name,
      username: (row as { username?: string | null }).username?.trim()
        ? String((row as { username?: string | null }).username).toLowerCase()
        : undefined,
      firstName: row.first_name,
      lastName: row.last_name ?? undefined,
      role: row.role as any,
      specialty: row.specialty as any,
      city: row.city,
      state: row.state,
      yearsExperience: row.years_experience,
      bio: row.bio,
      avatarUrl: row.avatar_url ?? '',
      bannerUrl: (row as { banner_url?: string | null }).banner_url ?? undefined,
      profileShareCount: (row as { total_shares?: number }).total_shares ?? 0,
      followerCount: row.follower_count,
      followingCount: row.following_count,
      likeCount: row.like_count,
      postCount: row.post_count,
      badges: (badgeRows ?? []).map((r: any) => ({
        id: r.badges.id,
        name: r.badges.name,
        description: r.badges.description,
        icon: r.badges.icon,
        color: r.badges.color,
        category: r.badges.category,
      })),
      communitiesJoined: (communityRows ?? []).map((r: any) => r.community_id),
      privacyMode: row.privacy_mode as any,
      interests: (interestRows ?? []).map((r: any) => r.interest),
      isVerified: row.is_verified,
      roleAdmin: Boolean((row as { role_admin?: boolean }).role_admin),
      shiftPreference: row.shift_preference as any,
      profileSongTitle: title ?? null,
      profileSongArtist: artist ?? null,
      profileSongUrl: url ?? null,
      identityTags: Array.isArray((row as { identity_tags?: string[] | null }).identity_tags)
        ? ((row as { identity_tags?: string[] }).identity_tags ?? [])
            .map((s) => String(s).trim())
            .filter(Boolean)
        : undefined,
      hideRecentPostsOnMyPage: Boolean((row as { hide_recent_posts_on_my_page?: boolean }).hide_recent_posts_on_my_page),
      pulseTier: typeof pr.pulse_tier === 'string' ? pr.pulse_tier : 'murmur',
      pulseScoreCurrent:
        typeof pr.pulse_score_current === 'number' ? pr.pulse_score_current : 0,
      profileSongArtworkUrl: pr.profile_song_artwork_url ?? null,
      selectedPulseAvatarFrameId: pr.selected_pulse_avatar_frame_id == null ? null : String(pr.selected_pulse_avatar_frame_id),
      pulseAvatarFrame:
        pr.pulse_avatar_frame === undefined
          ? undefined
          : mapPulseAvatarFrameEmbed(pr.pulse_avatar_frame) ?? null,
      termsPrivacyAcceptedAt:
        pr.terms_and_privacy_accepted_at != null
          ? String(pr.terms_and_privacy_accepted_at)
          : pr.terms_and_privacy_accepted_at === null
            ? null
            : undefined,
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!state.user) return;
    const profile = await fetchProfile(state.user.id);
    setState((prev) => ({ ...prev, profile }));
  }, [state.user, fetchProfile]);

  useEffect(() => {
    let cancelled = false;

    void supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (cancelled) return;
        const user = session?.user ?? null;
        if (!user) {
          useAppStore.getState().setJoinedCommunityIdsFromServer([]);
          useAppStore.getState().setFollowedCreatorIdsFromServer([]);
          setState((prev) => ({
            ...prev,
            session,
            user: null,
            profile: null,
            isAuthenticated: false,
            isLoading: false,
          }));
          return;
        }
        void fetchProfile(user.id)
          .then((profile) => {
            if (cancelled) return;
            setState((prev) => ({
              ...prev,
              session,
              user,
              profile,
              isAuthenticated: true,
              isLoading: false,
            }));
          })
          .catch((e) => {
            console.error('[auth] fetchProfile (initial session)', e);
            if (!cancelled) {
              setState((prev) => ({
                ...prev,
                session,
                user,
                profile: null,
                isAuthenticated: true,
                isLoading: false,
              }));
            }
          });
      })
      .catch((e) => {
        console.error('[auth] getSession failed', e);
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            session: null,
            user: null,
            profile: null,
            isAuthenticated: false,
            isLoading: false,
          }));
        }
      });

    /** Failsafe: never leave the app stuck on the index loading gate if Supabase hangs. */
    const failsafe = setTimeout(() => {
      setState((prev) => (prev.isLoading ? { ...prev, isLoading: false } : prev));
    }, 12_000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const user = session?.user ?? null;
        let profile: UserProfile | null = null;
        try {
          if (user) {
            profile = await fetchProfile(user.id);
          } else {
            useProfileCustomization.getState().setProfileSong(null);
            useAppStore.getState().setJoinedCommunityIdsFromServer([]);
            useAppStore.getState().setFollowedCreatorIdsFromServer([]);
          }
        } catch (e) {
          console.error('[auth] onAuthStateChange profile hydrate', e);
        }
        if (!cancelled) {
          setState({
            session,
            user,
            profile: user ? profile : null,
            isAuthenticated: !!session,
            isLoading: false,
          });
        }
      },
    );

    return () => {
      cancelled = true;
      clearTimeout(failsafe);
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? new Error(error.message) : null };
  };

  const signUpWithEmail = async (
    email: string,
    password: string,
    fullName: string,
    termsAcceptedAtIso: string,
    preferredUsername: string,
  ) => {
    const [firstName, ...rest] = fullName.trim().split(' ');
    const lastName = rest.join(' ') || null;

    /** Must be listed in Supabase → Auth → URL Configuration → Redirect URLs (e.g. `pulseverse://auth/callback`). */
    const emailRedirectTo = makeRedirectUri({ scheme: 'pulseverse', path: 'auth/callback' });

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
        data: {
          full_name: fullName,
          first_name: firstName,
          last_name: lastName,
          terms_accepted_at: termsAcceptedAtIso,
          preferred_username: preferredUsername.trim().toLowerCase(),
        },
      },
    });

    if (error) return { error: new Error(error.message) };
    return { error: null };
  };

  const signInWithPhone = async (phone: string) => {
    const e164 = normalizePhoneE164(phone);
    if (!e164 || e164.length < 8) {
      return { error: new Error('Enter a full number with country code (e.g. +1 for US).') };
    }
    const { error } = await supabase.auth.signInWithOtp({
      phone: e164,
      options: { channel: 'sms' },
    });
    return { error: error ? new Error(error.message) : null };
  };

  const verifyOtp = async (phone: string, token: string) => {
    const e164 = normalizePhoneE164(phone);
    const { error } = await supabase.auth.verifyOtp({ phone: e164, token, type: 'sms' });
    return { error: error ? new Error(error.message) : null };
  };

  const signInWithGoogle = async () => signInWithOAuthNative('google');

  const signInWithApple = async () => signInWithAppleAdaptive();

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'pulseverse://auth/reset-password',
    });
    return { error: error ? new Error(error.message) : null };
  };

  const signOut = async () => {
    try {
      analytics.track('sign_out');
      await analytics.flush();
    } catch {
      /* non-fatal */
    }
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) {
        console.warn('[auth] signOut:', error.message);
      }
    } catch (e) {
      console.warn('[auth] signOut failed', e);
    }
    useProfileCustomization.getState().setProfileSong(null);
    setState({
      session: null,
      user: null,
      profile: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signInWithEmail,
        signUpWithEmail,
        signInWithPhone,
        verifyOtp,
        signInWithGoogle,
        signInWithApple,
        resetPassword,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
