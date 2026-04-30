import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { analytics } from '@/lib/analytics';
import type { Session, User } from '@supabase/supabase-js';
import type { UserProfile } from '@/types';
import { useProfileCustomization } from '@/store/useProfileCustomization';
import { useAppStore } from '@/store/useAppStore';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
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
      supabase.from('profiles').select('*').eq('id', userId).single(),
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
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!state.user) return;
    const profile = await fetchProfile(state.user.id);
    setState((prev) => ({ ...prev, profile }));
  }, [state.user, fetchProfile]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user ?? null;
      setState((prev) => ({
        ...prev,
        session,
        user,
        isAuthenticated: !!session,
        isLoading: false,
      }));
      if (user) {
        fetchProfile(user.id).then((profile) => {
          setState((prev) => ({ ...prev, profile }));
        });
      } else {
        useAppStore.getState().setJoinedCommunityIdsFromServer([]);
        useAppStore.getState().setFollowedCreatorIdsFromServer([]);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const user = session?.user ?? null;
        let profile: UserProfile | null = null;
        if (user) {
          profile = await fetchProfile(user.id);
        } else {
          useProfileCustomization.getState().setProfileSong(null);
          useAppStore.getState().setJoinedCommunityIdsFromServer([]);
          useAppStore.getState().setFollowedCreatorIdsFromServer([]);
        }
        setState({
          session,
          user,
          profile,
          isAuthenticated: !!session,
          isLoading: false,
        });
      },
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? new Error(error.message) : null };
  };

  const signUpWithEmail = async (email: string, password: string, fullName: string) => {
    const [firstName, ...rest] = fullName.trim().split(' ');
    const lastName = rest.join(' ') || null;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, first_name: firstName, last_name: lastName } },
    });

    if (error) return { error: new Error(error.message) };
    return { error: null };
  };

  const signInWithPhone = async (phone: string) => {
    const { error } = await supabase.auth.signInWithOtp({ phone });
    return { error: error ? new Error(error.message) : null };
  };

  const verifyOtp = async (phone: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
    return { error: error ? new Error(error.message) : null };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: 'pulseverse://auth/callback' },
    });
    return { error: error ? new Error(error.message) : null };
  };

  const signInWithApple = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: 'pulseverse://auth/callback' },
    });
    return { error: error ? new Error(error.message) : null };
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'pulseverse://auth/reset-password',
    });
    return { error: error ? new Error(error.message) : null };
  };

  const signOut = async () => {
    try { analytics.track('sign_out'); await analytics.flush(); } catch {}
    try { await supabase.auth.signOut(); } catch {}
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
