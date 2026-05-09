import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { supabase } from '@/lib/supabase';
import { signInWithOAuthNative } from '@/lib/oauthNative';
import { signInWithAppleAdaptive } from '@/lib/appleAuthNative';
import { analytics } from '@/lib/analytics';
import { LAUNCH_LINKS } from '@/constants/launch';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import type { UserProfile } from '@/types';
import { useProfileCustomization } from '@/store/useProfileCustomization';
import { useAppStore } from '@/store/useAppStore';
import { PROFILE_SELECT_WITH_AVATAR_FRAME } from '@/services/supabase/profiles';
import { mapPulseAvatarFrameEmbed } from '@/lib/pulseAvatarFrameMap';
import { validateServerAuthSession } from '@/lib/authSessionGuard';
import { resetRootIndexRedirectDedupe } from '@/lib/rootIndexRedirect';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /**
   * Incremented on each successful sign-in (`SIGNED_IN` + inline email hydrate) so consumers like
   * {@link BetaTesterBorderGate} can re-run idempotent post-login checks even when `user.id` is unchanged.
   */
  betaGiftCheckNonce: number;
}

interface AuthContextValue extends AuthState {
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (
    email: string,
    password: string,
    fullName: string,
    preferredUsername: string,
  ) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInWithApple: () => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  /** Merge fields into the cached profile (e.g. after legal-ack save) without waiting on a full hydrate. */
  applyProfilePatch: (patch: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * `app/index.tsx` stays on a blank shell while `isLoading` is true. Login uses
 * `onAuthStateChange`, which had no timeout — a stuck PostgREST call could leave
 * hydration pending forever. Cold boot only had a 12s failsafe on `getSession`.
 */
const PROFILE_HYDRATE_TIMEOUT_MS = 18_000;

async function fetchProfileWithTimeout(
  fetchProfile: (userId: string) => Promise<UserProfile | null>,
  userId: string,
): Promise<UserProfile | null> {
  try {
    return await Promise.race([
      fetchProfile(userId),
      new Promise<UserProfile | null>((resolve) => {
        setTimeout(() => {
          if (__DEV__) {
            console.warn(
              `[auth] Profile hydrate timed out after ${PROFILE_HYDRATE_TIMEOUT_MS}ms — clearing loading gate`,
            );
          }
          resolve(null);
        }, PROFILE_HYDRATE_TIMEOUT_MS);
      }),
    ]);
  } catch (e) {
    console.error('[auth] fetchProfileWithTimeout', e);
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null,
    isLoading: true,
    isAuthenticated: false,
    betaGiftCheckNonce: 0,
  });

  /**
   * Suppresses stale profile hydrates when `getSession` and `onAuthStateChange` overlap, or when
   * React Strict Mode tears down the listener while an async hydrate is in flight (otherwise `finally`
   * could be skipped and `isLoading` stays `true` — index never routes off the black shell until cold start).
   */
  const authHydrateGenerationRef = useRef(0);
  /**
   * While email/password sign-in runs (including `signInWithPassword`), ignore `onAuthStateChange` for
   * the signed-in branch. Otherwise the listener increments {@link authHydrateGenerationRef} and the
   * inline email hydrate’s generation check fails → `isLoading` never clears on fast logout→login in one session.
   */
  const emailPasswordHydrateLockRef = useRef(false);

  const fetchProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    /**
     * Cold-boot parallelization: the original code ran 5 sequential
     * round-trips (profile → badges → interests → communities → follows),
     * blocking auth state hydration on the slowest single query in the
     * chain. On a cold boot this serialized ~5 × 80–150ms = 400–750ms
     * before any UI could render.
     *
     * `Promise.all` (now six parallel reads including `saved_posts` ids)
     * cuts that to one round-trip latency (the slowest single query —
     * typically the profile row itself), saving ~300–500ms on cold boot
     * on a typical mobile network.
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
      savedRes,
    ] = await Promise.all([
      supabase.from('profiles').select(PROFILE_SELECT_WITH_AVATAR_FRAME).eq('id', userId).single(),
      supabase
        .from('user_badges')
        .select('badge_id, badges(id, name, description, icon, color, category)')
        .eq('user_id', userId),
      supabase.from('user_interests').select('interest').eq('user_id', userId),
      supabase.from('community_members').select('community_id').eq('user_id', userId),
      supabase.from('follows').select('following_id').eq('follower_id', userId).limit(2000),
      supabase.from('saved_posts').select('post_id').eq('user_id', userId).limit(2000),
    ]);

    const badgeRows = badgeRes.data;
    const interestRows = interestRes.data;
    const communityRows = communityRes.data;
    const followRows = followsRes.data;
    const savedRows = savedRes.data;

    useAppStore.getState().setJoinedCommunityIdsFromServer(
      (communityRows ?? []).map((r: { community_id: string }) => String(r.community_id)),
    );

    if (followRows) {
      useAppStore.getState().setFollowedCreatorIdsFromServer(
        followRows.map((r: { following_id: string }) => String(r.following_id)),
      );
    }

    useAppStore.getState().setSavedPostIdsFromServer(
      (savedRows ?? []).map((r: { post_id: string }) => String(r.post_id)),
    );

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

    const termsPrivacyAcceptedAt: UserProfile['termsPrivacyAcceptedAt'] =
      pr.terms_and_privacy_accepted_at != null
        ? String(pr.terms_and_privacy_accepted_at)
        : pr.terms_and_privacy_accepted_at === null
          ? null
          : undefined;

    const profile: UserProfile = {
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
      termsPrivacyAcceptedAt,
    };

    return profile;
  }, []);

  /**
   * Read the current Supabase session and materialize `user` + `profile` in React state with a
   * bounded `fetchProfileWithTimeout`. Used after email/password and OAuth/Apple completes so we
   * don’t depend solely on `onAuthStateChange` (races with `USER_UPDATED`, duplicate `SIGNED_IN`, or
   * generation mismatch can leave `isLoading` true → index black screen until cold start).
   */
  const hydrateAuthenticatedSession = useCallback(
    async (options?: { bumpBetaNonce?: boolean }): Promise<{ error: Error | null }> => {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (sessionError || !session?.user) {
        return { error: new Error(sessionError?.message ?? 'No session after sign-in. Try again.') };
      }

      const userId = session.user.id;
      const bumpBetaNonce = options?.bumpBetaNonce ?? false;

      setState((prev) => ({
        ...prev,
        session,
        user: session.user,
        profile: null,
        isAuthenticated: true,
        isLoading: true,
      }));

      let profile: UserProfile | null = null;
      try {
        profile = await fetchProfileWithTimeout(fetchProfile, userId);
      } catch (e) {
        console.error('[auth] hydrateAuthenticatedSession profile bundle', e);
      }

      setState((prev) => {
        if (!prev.session?.user || prev.session.user.id !== userId) {
          return { ...prev, isLoading: false };
        }
        return {
          ...prev,
          session,
          user: session.user,
          profile,
          isAuthenticated: true,
          isLoading: false,
          betaGiftCheckNonce: bumpBetaNonce ? prev.betaGiftCheckNonce + 1 : prev.betaGiftCheckNonce,
        };
      });

      return { error: null };
    },
    [fetchProfile],
  );

  const refreshProfile = useCallback(async () => {
    if (!state.user) return;
    try {
      const profile = await fetchProfileWithTimeout(fetchProfile, state.user.id);
      setState((prev) => ({
        ...prev,
        /** Resume / flaky cell: don’t wipe the shell if PostgREST hiccups (My Pulse tab stuck on spinner). */
        profile: profile ?? prev.profile,
      }));
    } catch (e) {
      if (__DEV__) console.warn('[auth] refreshProfile failed', e);
    }
  }, [state.user, fetchProfile]);

  const applyProfilePatch = useCallback((patch: Partial<UserProfile>) => {
    setState((prev) => {
      if (!prev.profile) return prev;
      return { ...prev, profile: { ...prev.profile, ...patch } };
    });
  }, []);

  const signOut = useCallback(async () => {
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
    try {
      useProfileCustomization.getState().setProfileSong(null);
      useAppStore.getState().setJoinedCommunityIdsFromServer([]);
      useAppStore.getState().setFollowedCreatorIdsFromServer([]);
      useAppStore.getState().setSavedPostIdsFromServer([]);
      useAppStore.getState().setBetaTesterBorderBlocking(false);
      useAppStore.getState().clearBetaTesterGiftPending();
    } catch {
      /* non-fatal */
    }
    emailPasswordHydrateLockRef.current = false;
    authHydrateGenerationRef.current = 0;
    resetRootIndexRedirectDedupe();
    setState({
      session: null,
      user: null,
      profile: null,
      isAuthenticated: false,
      isLoading: false,
      betaGiftCheckNonce: 0,
    });
  }, []);

  const isAuthenticatedRef = useRef(false);
  useEffect(() => {
    isAuthenticatedRef.current = state.isAuthenticated;
  }, [state.isAuthenticated]);

  const sessionGuardBusy = useRef(false);

  useEffect(() => {
    if (!state.isAuthenticated || state.isLoading) return;

    let cancelled = false;
    void (async () => {
      const r = await validateServerAuthSession();
      if (cancelled || r === 'ok') return;
      await signOut();
    })();
    return () => {
      cancelled = true;
    };
  }, [state.isAuthenticated, state.isLoading, signOut]);

  useEffect(() => {
    const runGuard = () => {
      if (!isAuthenticatedRef.current || sessionGuardBusy.current) return;
      sessionGuardBusy.current = true;
      void (async () => {
        try {
          const r = await validateServerAuthSession();
          if (r !== 'ok') await signOut();
        } finally {
          sessionGuardBusy.current = false;
        }
      })();
    };

    let foregroundGuardTimer: ReturnType<typeof setTimeout> | null = null;
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;
      /**
       * iOS/Android radios + TLS often need a beat after resume. Hitting Auth
       * `getUser` immediately can fail transiently and feel like a "stuck" app
       * if paired with other foreground work.
       */
      if (foregroundGuardTimer != null) clearTimeout(foregroundGuardTimer);
      foregroundGuardTimer = setTimeout(() => {
        foregroundGuardTimer = null;
        runGuard();
      }, 550);
    });
    const interval = setInterval(runGuard, 90_000);
    return () => {
      sub.remove();
      clearInterval(interval);
      if (foregroundGuardTimer != null) clearTimeout(foregroundGuardTimer);
    };
  }, [signOut]);

  useEffect(() => {
    let cancelled = false;

    void supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (cancelled) return;
        const user = session?.user ?? null;
        if (!user) {
          authHydrateGenerationRef.current = 0;
          emailPasswordHydrateLockRef.current = false;
          useAppStore.getState().setJoinedCommunityIdsFromServer([]);
          useAppStore.getState().setFollowedCreatorIdsFromServer([]);
          useAppStore.getState().setSavedPostIdsFromServer([]);
          useAppStore.getState().setBetaTesterBorderBlocking(false);
          useAppStore.getState().clearBetaTesterGiftPending();
          resetRootIndexRedirectDedupe();
          setState((prev) => ({
            ...prev,
            session,
            user: null,
            profile: null,
            isAuthenticated: false,
            isLoading: false,
            betaGiftCheckNonce: 0,
          }));
          return;
        }
        /**
         * Expose the Supabase session before `fetchProfile` finishes.
         * `login.tsx` navigates to `/` immediately after `signInWithPassword`; if we only
         * `setState` after the profile bundle returns, `AppShell` briefly sees
         * `isAuthenticated === false` + `isLoading === false` and fires
         * `router.replace('/auth/login')`, which ping-pongs with `/` and can blow the
         * React update depth limit.
         */
        const coldBootGeneration = ++authHydrateGenerationRef.current;
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            session,
            user,
            profile: user.id === prev.user?.id ? prev.profile : null,
            isAuthenticated: true,
            isLoading: true,
          }));
        }
        void (async () => {
          let profile: UserProfile | null = null;
          try {
            profile = await fetchProfileWithTimeout(fetchProfile, user.id);
          } catch (e) {
            console.error('[auth] fetchProfile (initial session)', e);
          }
          if (coldBootGeneration !== authHydrateGenerationRef.current) return;
          setState((prev) => ({
            ...prev,
            session,
            user,
            profile: profile ?? prev.profile,
            isAuthenticated: true,
            isLoading: false,
          }));
        })();
      })
      .catch((e) => {
        console.error('[auth] getSession failed', e);
        if (!cancelled) {
          authHydrateGenerationRef.current = 0;
          emailPasswordHydrateLockRef.current = false;
          resetRootIndexRedirectDedupe();
          useAppStore.getState().clearBetaTesterGiftPending();
          setState((prev) => ({
            ...prev,
            session: null,
            user: null,
            profile: null,
            isAuthenticated: false,
            isLoading: false,
            betaGiftCheckNonce: 0,
          }));
        }
      });

    /** Failsafe: never leave the app stuck on the index loading gate if Supabase hangs. */
    const failsafe = setTimeout(() => {
      setState((prev) => (prev.isLoading ? { ...prev, isLoading: false } : prev));
    }, 12_000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session) => {
        const user = session?.user ?? null;

        if (!user) {
          authHydrateGenerationRef.current = 0;
          emailPasswordHydrateLockRef.current = false;
          try {
            useProfileCustomization.getState().setProfileSong(null);
            useAppStore.getState().setJoinedCommunityIdsFromServer([]);
            useAppStore.getState().setFollowedCreatorIdsFromServer([]);
            useAppStore.getState().setSavedPostIdsFromServer([]);
            useAppStore.getState().setBetaTesterBorderBlocking(false);
            useAppStore.getState().clearBetaTesterGiftPending();
          } catch (e) {
            console.error('[auth] onAuthStateChange sign-out cleanup', e);
          }
          resetRootIndexRedirectDedupe();
          if (!cancelled) {
            setState({
              session: null,
              user: null,
              profile: null,
              isAuthenticated: false,
              isLoading: false,
              betaGiftCheckNonce: 0,
            });
          }
          return;
        }

        /**
         * Silent JWT rotation (common right after resume). Re-running the full
         * profile `Promise.all` set `isLoading: true`, blocks the index route,
         * and can leave video surfaces / stacks in a bad state — without
         * changing any user-visible auth data.
         */
        if (event === 'TOKEN_REFRESHED' && session) {
          if (emailPasswordHydrateLockRef.current) {
            return;
          }
          if (!cancelled) {
            setState((prev) => ({
              ...prev,
              session,
              user: session.user,
              isAuthenticated: true,
              isLoading: false,
            }));
          }
          return;
        }

        if (emailPasswordHydrateLockRef.current) {
          return;
        }

        const listenerGeneration = ++authHydrateGenerationRef.current;
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            session,
            user,
            profile: user.id === prev.user?.id ? prev.profile : null,
            isAuthenticated: true,
            isLoading: true,
            betaGiftCheckNonce: event === 'SIGNED_IN' ? prev.betaGiftCheckNonce + 1 : prev.betaGiftCheckNonce,
          }));
        }

        let profile: UserProfile | null = null;
        try {
          profile = await fetchProfileWithTimeout(fetchProfile, user.id);
        } catch (e) {
          console.error('[auth] onAuthStateChange profile hydrate', e);
        } finally {
          if (listenerGeneration !== authHydrateGenerationRef.current) return;
          setState((prev) => ({
            ...prev,
            session,
            user,
            profile: profile ?? prev.profile,
            isAuthenticated: true,
            isLoading: false,
          }));
        }
      },
    );

    return () => {
      cancelled = true;
      clearTimeout(failsafe);
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    emailPasswordHydrateLockRef.current = true;
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: new Error(error.message) };
      return await hydrateAuthenticatedSession({ bumpBetaNonce: true });
    } finally {
      emailPasswordHydrateLockRef.current = false;
    }
  }, [hydrateAuthenticatedSession]);

  const signUpWithEmail = async (
    email: string,
    password: string,
    fullName: string,
    preferredUsername: string,
  ) => {
    const [firstName, ...rest] = fullName.trim().split(' ');
    const lastName = rest.join(' ') || null;

    /**
     * Must be an https URL so the inbox “verify” link opens in a real browser.
     * Add this exact URL under Supabase → Auth → URL Configuration → Redirect URLs.
     * @see web/src/app/(marketing)/auth/confirm/page.tsx
     */
    const base = LAUNCH_LINKS.marketingBaseUrl.replace(/\/$/, '');
    const emailRedirectTo = `${base}/auth/confirm`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
        data: {
          full_name: fullName,
          first_name: firstName,
          last_name: lastName,
          preferred_username: preferredUsername.trim().toLowerCase(),
        },
      },
    });

    if (error) return { error: new Error(error.message) };
    return { error: null };
  };

  const signInWithGoogle = useCallback(async () => {
    emailPasswordHydrateLockRef.current = true;
    try {
      const { error } = await signInWithOAuthNative('google');
      if (error) return { error };
      return await hydrateAuthenticatedSession({ bumpBetaNonce: true });
    } finally {
      emailPasswordHydrateLockRef.current = false;
    }
  }, [hydrateAuthenticatedSession]);

  const signInWithApple = useCallback(async () => {
    emailPasswordHydrateLockRef.current = true;
    try {
      const { error } = await signInWithAppleAdaptive();
      if (error) return { error };
      return await hydrateAuthenticatedSession({ bumpBetaNonce: true });
    } finally {
      emailPasswordHydrateLockRef.current = false;
    }
  }, [hydrateAuthenticatedSession]);

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'pulseverse://auth/reset-password',
    });
    return { error: error ? new Error(error.message) : null };
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signInWithApple,
        resetPassword,
        signOut,
        refreshProfile,
        applyProfilePatch,
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
