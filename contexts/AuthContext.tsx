import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { signInWithOAuthNative } from '@/lib/oauthNative';
import { signInWithAppleAdaptive } from '@/lib/appleAuthNative';
import { analytics } from '@/lib/analytics';
import { LAUNCH_LINKS } from '@/constants/launch';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import type { UserProfile } from '@/types';
import { useProfileCustomization } from '@/store/useProfileCustomization';
import { useAppStore } from '@/store/useAppStore';
import {
  enrichProfileEquippedFrame,
  getByIdWithAccessToken,
  PROFILE_COLUMNS,
  PROFILE_SELECT_WITH_AVATAR_FRAME,
  profilesService,
  withProfileTimeout,
} from '@/services/supabase/profiles';
import { mapPulseAvatarFrameEmbed } from '@/lib/pulseAvatarFrameMap';
import { tryRecoverStoredSession, validateServerAuthSession } from '@/lib/authSessionGuard';
import { resetRootIndexRedirectDedupe } from '@/lib/rootIndexRedirect';
import { queryClient } from '@/lib/queryClient';
import { hydrateJoinedCommunitiesFromServer } from '@/lib/hydrateJoinedCommunities';

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
 * hydration pending forever. Cold boot failsafe must not drop the loading gate while a
 * signed-in profile hydrate is still in flight (see effect below).
 */
const PROFILE_HYDRATE_TIMEOUT_MS = 18_000;

/** Satellites (follows, communities, …) defer until after the profile row unlocks the UI. */
const PROFILE_SATELLITE_DEFER_MS = 2_000;
const PROFILE_SATELLITE_BUDGET_MS = 8_000;

/** Never show the index "profile unavailable" card while a hydrate pass is still running. */
const PROFILE_HYDRATE_FAILSAFE_MS = 22_000;

async function fetchProfileWithTimeout(
  fetchProfile: (userId: string) => Promise<UserProfile | null>,
  userId: string,
): Promise<UserProfile | null> {
  const inFlight = fetchProfile(userId);
  /** If the timeout wins the race, the fetch keeps running — swallow late rejections (RN "Network request failed"). */
  void inFlight.catch(() => {});
  try {
    return await Promise.race([
      inFlight,
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

/**
 * Full hydrate with a lightweight self-healing fallback.
 *
 * If the bounded hydrate (profile row only — satellites run in the background) times out,
 * {@link profilesService.getById}. That single read almost always succeeds even
 * when the satellite bundle is slow, so the app lands on a usable profile (with
 * empty side lists until the next refresh) instead of a stuck loading gate or
 * the manual "Try again" card. Used by every hydrate entry point.
 */
async function hydrateProfileWithFallback(
  fetchProfile: (userId: string) => Promise<UserProfile | null>,
  userId: string,
  accessToken?: string | null,
): Promise<UserProfile | null> {
  if (accessToken) {
    const boot = await getByIdWithAccessToken(userId, accessToken);
    if (boot) {
      if (__DEV__) console.log('[auth] profile loaded via access-token bootstrap (skipped auth lock)');
      return boot;
    }
  }
  const full = await fetchProfileWithTimeout(fetchProfile, userId);
  if (full) return full;
  if (accessToken) {
    const boot = await getByIdWithAccessToken(userId, accessToken);
    if (boot) {
      if (__DEV__) console.warn('[auth] hydrate used access-token bootstrap after timeout');
      return boot;
    }
  }
  try {
    const lite = await profilesService.getById(userId);
    if (lite) {
      if (__DEV__) console.warn('[auth] hydrate used lite profiles-only fallback');
      return lite;
    }
  } catch {
    /* non-fatal — caller keeps any cached profile */
  }
  return null;
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
  /** When true, skip `tryRecoverStoredSession` on SIGNED_OUT — user tapped Sign out. */
  const intentionalSignOutRef = useRef(false);

  /** Set in {@link fetchProfile} when satellite queries hit {@link PROFILE_SATELLITE_BUDGET_MS}; hydrate retries lists once. */
  const profileSatelliteMissRef = useRef(false);

  /**
   * Cold boot runs `getSession().then(hydrate)` and `onAuthStateChange` back-to-back.
   * Without this guard both start `fetchProfile`, bump {@link authHydrateGenerationRef},
   * and queue ~10 Supabase calls on the single auth-token lock — profile times out at 18s
   * and feed prefetch (also ungated) finishes ~18s later (~36s total).
   */
  const profileHydrateInFlightForUserRef = useRef<string | null>(null);

  const fetchProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    profileSatelliteMissRef.current = false;
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
     * Load `profiles` first, then parallel “satellite” reads with a bounded wait so one slow
     * list query cannot force the outer {@link PROFILE_HYDRATE_TIMEOUT_MS} timeout.
     */
    /**
     * Bound the profile row read and fall back if the avatar-frame embed stalls.
     * Native / Expo Go: load plain columns first (one round-trip) — the embed often
     * wastes 7s on timeout over tunnel/LAN before the row arrives. Web keeps embed-first
     * because that path was tuned for browser PostgREST quirks.
     */
    const loadPlainRow = async () => {
      const plainRes = await withProfileTimeout(
        supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', userId).single(),
      );
      if (!plainRes.error) return plainRes.data;
      return null;
    };
    const loadEmbedRow = async () => {
      const embedRes = await withProfileTimeout(
        supabase.from('profiles').select(PROFILE_SELECT_WITH_AVATAR_FRAME).eq('id', userId).single(),
      );
      if (!embedRes.error) return embedRes.data;
      return null;
    };

    let data: any = null;
    const preferPlainFirst = Platform.OS !== 'web';
    try {
      if (preferPlainFirst) {
        data = await loadPlainRow();
        if (!data) data = await loadEmbedRow();
      } else {
        data = await loadEmbedRow();
        if (!data) data = await loadPlainRow();
      }
    } catch {
      /* timed out — both attempts failed */
    }
    if (!data) return null;

    const badgeRows: any[] | null = null;
    const interestRows: any[] | null = null;
    const communityRows: any[] | null = null;
    const followRows: any[] | null = null;
    const savedRows: any[] | null = null;
    const communityRes = { error: { message: 'satellite_deferred' } as any };

    void (async () => {
      await new Promise((resolve) => setTimeout(resolve, PROFILE_SATELLITE_DEFER_MS));
      try {
        const satellitesPromise = Promise.all([
          supabase
            .from('user_badges')
            .select('badge_id, badges(id, name, description, icon, color, category)')
            .eq('user_id', userId),
          supabase.from('user_interests').select('interest').eq('user_id', userId),
          supabase.from('follows').select('following_id').eq('follower_id', userId).limit(2000),
          supabase.from('saved_posts').select('post_id').eq('user_id', userId).limit(2000),
        ]);

        const satelliteRace = await Promise.race([
          satellitesPromise.then((r) => ({ ok: true as const, r })),
          new Promise<{ ok: false }>((resolve) =>
            setTimeout(() => resolve({ ok: false }), PROFILE_SATELLITE_BUDGET_MS),
          ),
        ]);

        if (!satelliteRace.ok) {
          if (__DEV__) {
            console.warn(
              `[auth] Profile satellite queries exceeded ${PROFILE_SATELLITE_BUDGET_MS}ms — side lists unchanged until refresh.`,
            );
          }
          profileSatelliteMissRef.current = true;
          return;
        }

        const [badgeRes, interestRes, followsRes, savedRes] = satelliteRace.r;

        const deferredFollowRows = followsRes.data;
        if (deferredFollowRows) {
          useAppStore.getState().setFollowedCreatorIdsFromServer(
            deferredFollowRows.map((r: { following_id: string }) => String(r.following_id)),
          );
        }

        useAppStore.getState().setSavedPostIdsFromServer(
          (savedRes.data ?? []).map((r: { post_id: string }) => String(r.post_id)),
        );

        setState((prev) => {
          if (prev.user?.id !== userId || !prev.profile) return prev;
          return {
            ...prev,
            profile: {
              ...prev.profile,
              badges: (badgeRes.data ?? []).map((r: any) => ({
                id: r.badges.id,
                name: r.badges.name,
                description: r.badges.description,
                icon: r.badges.icon,
                color: r.badges.color,
                category: r.badges.category,
              })),
              communitiesJoined: prev.profile.communitiesJoined,
              interests: (interestRes.data ?? []).map((r: any) => r.interest),
            },
          };
        });
      } catch (e) {
        if (__DEV__) console.warn('[auth] deferred profile satellites failed', e);
        profileSatelliteMissRef.current = true;
      }
    })();

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

    let roleAdmin = false;
    try {
      const { data: isStaff } = await supabase.rpc('current_user_role_admin');
      roleAdmin = isStaff === true;
    } catch {
      roleAdmin = false;
    }

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
      communitiesJoined: communityRes.error
        ? [...useAppStore.getState().joinedCommunityIds]
        : (communityRows ?? []).map((r: any) => r.community_id),
      privacyMode: row.privacy_mode as any,
      interests: (interestRows ?? []).map((r: any) => r.interest),
      isVerified: row.is_verified,
      roleAdmin,
      shiftPreference: row.shift_preference as any,
      profileSongTitle: title ?? null,
      profileSongArtist: artist ?? null,
      profileSongUrl: url ?? null,
      identityTags: Array.isArray((row as { identity_tags?: string[] | null }).identity_tags)
        ? ((row as { identity_tags?: string[] }).identity_tags ?? [])
            .map((s) => String(s).trim())
            .filter(Boolean)
        : undefined,
      hidePulseMusicPlayerOnMyPage: Boolean(
        (row as { hide_pulse_music_player_on_my_page?: boolean }).hide_pulse_music_player_on_my_page,
      ),
      defaultAllowViewerClips:
        (row as { default_allow_viewer_clips?: boolean }).default_allow_viewer_clips !== false,
      defaultAllowRemix: (row as { default_allow_remix?: boolean }).default_allow_remix !== false,
      defaultAllowClipDownloads:
        (row as { default_allow_clip_downloads?: boolean }).default_allow_clip_downloads === true,
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
      audienceRole: pr.audience_role ?? null,
      onboardingCompletedAt:
        pr.onboarding_completed_at != null ? String(pr.onboarding_completed_at) : null,
      medicalSafetyAcknowledgedAt:
        pr.medical_safety_acknowledged_at != null
          ? String(pr.medical_safety_acknowledged_at)
          : null,
      creatorAudienceTags: Array.isArray(pr.creator_audience_tags)
        ? pr.creator_audience_tags.filter(Boolean)
        : [],
      isCreator: Boolean(pr.is_creator),
    };

    void hydrateJoinedCommunitiesFromServer(userId)
      .then((ids) => {
        setState((prev) => {
          if (prev.user?.id !== userId || !prev.profile) return prev;
          return { ...prev, profile: { ...prev.profile, communitiesJoined: ids } };
        });
      })
      .catch((e) => {
        if (__DEV__) console.warn('[auth] community_members eager hydrate failed', e);
      });

    return enrichProfileEquippedFrame(profile);
  }, [setState]);

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

      profileHydrateInFlightForUserRef.current = userId;
      let profile: UserProfile | null = null;
      try {
          profile = await hydrateProfileWithFallback(fetchProfile, userId, session.access_token);
      } catch (e) {
        console.error('[auth] hydrateAuthenticatedSession profile bundle', e);
      } finally {
        if (profileHydrateInFlightForUserRef.current === userId) {
          profileHydrateInFlightForUserRef.current = null;
        }
      }
      if (!profile) {
        profileSatelliteMissRef.current = false;
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

      if (profile && profileSatelliteMissRef.current) {
        profileSatelliteMissRef.current = false;
        setTimeout(() => {
          void (async () => {
            try {
              const p = await fetchProfileWithTimeout(fetchProfile, userId);
              if (!p) return;
              setState((prev) => {
                if (!prev.session?.user || prev.session.user.id !== userId) return prev;
                return { ...prev, profile: p };
              });
            } catch {
              /* non-fatal */
            }
          })();
        }, 750);
      }

      return { error: null };
    },
    [fetchProfile],
  );

  const refreshInFlightRef = useRef<Promise<void> | null>(null);

  const refreshProfile = useCallback(async () => {
    if (!state.user) return;
    if (refreshInFlightRef.current) {
      await refreshInFlightRef.current;
      return;
    }
    const job = (async () => {
      try {
        const profile = await hydrateProfileWithFallback(
          fetchProfile,
          state.user!.id,
          state.session?.access_token,
        );
        setState((prev) => ({
          ...prev,
          /** Resume / flaky cell: don’t wipe the shell if PostgREST hiccups (My Pulse tab stuck on spinner). */
          profile: profile ?? prev.profile,
        }));
        if (state.user?.id) {
          try {
            const ids = await hydrateJoinedCommunitiesFromServer(state.user.id);
            setState((prev) => {
              if (!prev.profile || prev.user?.id !== state.user!.id) return prev;
              return { ...prev, profile: { ...prev.profile, communitiesJoined: ids } };
            });
          } catch (e) {
            if (__DEV__) console.warn('[auth] refreshProfile joined communities', e);
          }
        }
      } catch (e) {
        if (__DEV__) console.warn('[auth] refreshProfile failed', e);
      } finally {
        refreshInFlightRef.current = null;
      }
    })();
    refreshInFlightRef.current = job;
    await job;
  }, [state.user, state.session?.access_token, fetchProfile]);

  const applyProfilePatch = useCallback((patch: Partial<UserProfile>) => {
    setState((prev) => {
      if (!prev.profile) return prev;
      return { ...prev, profile: { ...prev.profile, ...patch } };
    });
  }, []);

  const signOut = useCallback(async () => {
    intentionalSignOutRef.current = true;
    try {
      analytics.track('sign_out');
      await Promise.race([
        analytics.flush(),
        new Promise<void>((resolve) => setTimeout(resolve, 2500)),
      ]);
    } catch {
      /* non-fatal */
    }
    try {
      if (Platform.OS !== 'web') {
        void supabase.auth.stopAutoRefresh();
      }
      const { error: globalErr } = await supabase.auth.signOut({ scope: 'global' });
      if (globalErr) {
        const { error: localErr } = await supabase.auth.signOut({ scope: 'local' });
        if (localErr) {
          console.warn('[auth] signOut:', localErr.message);
        }
      }
    } catch (e) {
      console.warn('[auth] signOut failed', e);
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch {
        /* last resort — local state cleared below */
      }
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
    try {
      queryClient.clear();
    } catch {
      /* non-fatal */
    }
    emailPasswordHydrateLockRef.current = false;
    authHydrateGenerationRef.current = 0;
    profileHydrateInFlightForUserRef.current = null;
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

  /** Keep JWT refresh alive whenever we have a session (not only after profile hydrate). */
  useEffect(() => {
    if (Platform.OS === 'web' || !state.isAuthenticated) return;
    void supabase.auth.startAutoRefresh();
    return () => {
      void supabase.auth.stopAutoRefresh();
    };
  }, [state.isAuthenticated]);

  useEffect(() => {
    if (!state.isAuthenticated || state.isLoading) return;

    let cancelled = false;
    /** Defer first server check until auto-refresh has had time to run after cold boot. */
    const t = setTimeout(() => {
      void (async () => {
        const r = await validateServerAuthSession({ strict: true });
        if (cancelled || r === 'ok') return;
        await signOut();
      })();
    }, 4000);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [state.isAuthenticated, state.isLoading, signOut]);

  useEffect(() => {
    const runGuard = (strict: boolean) => {
      if (!isAuthenticatedRef.current || sessionGuardBusy.current) return;
      sessionGuardBusy.current = true;
      void (async () => {
        try {
          const r = await validateServerAuthSession({ strict });
          if (r !== 'ok') await signOut();
        } finally {
          sessionGuardBusy.current = false;
        }
      })();
    };

    let foregroundGuardTimer: ReturnType<typeof setTimeout> | null = null;
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;
      if (Platform.OS !== 'web') {
        void supabase.auth.startAutoRefresh();
      }
      /**
       * Resume: refresh the session before any strict validation so we do not
       * treat a briefly stale access token as "signed out".
       */
      if (foregroundGuardTimer != null) clearTimeout(foregroundGuardTimer);
      foregroundGuardTimer = setTimeout(() => {
        foregroundGuardTimer = null;
        runGuard(true);
      }, 1600);
    });
    /** Light periodic check — only refreshes JWT when near expiry; does not call getUser(). */
    const interval = setInterval(() => runGuard(false), 120_000);
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
        if (profileHydrateInFlightForUserRef.current === user.id) {
          if (!cancelled) {
            setState((prev) => ({
              ...prev,
              session,
              user,
              isAuthenticated: true,
            }));
          }
          return;
        }

        const coldBootGeneration = ++authHydrateGenerationRef.current;
        profileHydrateInFlightForUserRef.current = user.id;
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
            profile = await hydrateProfileWithFallback(fetchProfile, user.id, session.access_token);
            if (profile) {
              void fetchProfile(user.id).then((full) => {
                if (!full || coldBootGeneration !== authHydrateGenerationRef.current) return;
                setState((prev) => {
                  if (prev.user?.id !== user.id) return prev;
                  return { ...prev, profile: full };
                });
              });
            }
          } catch (e) {
            console.error('[auth] fetchProfile (initial session)', e);
          } finally {
            if (profileHydrateInFlightForUserRef.current === user.id) {
              profileHydrateInFlightForUserRef.current = null;
            }
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

    /**
     * Failsafe: never leave the app stuck on the index loading gate if Supabase hangs.
     * Do NOT clear `isLoading` while signed-in profile hydrate may still succeed — that
     * briefly showed "Could not load your profile" on slow Expo Go / tunnel cold starts.
     */
    const failsafe = setTimeout(() => {
      setState((prev) => {
        if (!prev.isLoading) return prev;
        if (prev.isAuthenticated && !prev.profile) return prev;
        return { ...prev, isLoading: false };
      });
    }, PROFILE_HYDRATE_FAILSAFE_MS);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session) => {
        const user = session?.user ?? null;

        if (!user) {
          if (event === 'SIGNED_OUT' && intentionalSignOutRef.current) {
            intentionalSignOutRef.current = false;
          } else {
            const recovered =
              event === 'SIGNED_OUT' ? await tryRecoverStoredSession() : null;
            if (recovered?.user && !cancelled) {
              setState((prev) => ({
                ...prev,
                session: recovered,
                user: recovered.user,
                isAuthenticated: true,
                isLoading: prev.profile ? false : prev.isLoading,
              }));
              return;
            }
          }

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

        /**
         * `getSession().then` already started hydrate for this user; only merge session
         * so we do not double-fetch profile + satellites on the auth lock queue.
         */
        if (profileHydrateInFlightForUserRef.current === user.id) {
          if (!cancelled) {
            setState((prev) => ({
              ...prev,
              session,
              user,
              isAuthenticated: true,
              betaGiftCheckNonce: event === 'SIGNED_IN' ? prev.betaGiftCheckNonce + 1 : prev.betaGiftCheckNonce,
            }));
          }
          return;
        }

        const listenerGeneration = ++authHydrateGenerationRef.current;
        profileHydrateInFlightForUserRef.current = user.id;
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
          profile = await hydrateProfileWithFallback(fetchProfile, user.id, session.access_token);
        } catch (e) {
          console.error('[auth] onAuthStateChange profile hydrate', e);
        } finally {
          if (profileHydrateInFlightForUserRef.current === user.id) {
            profileHydrateInFlightForUserRef.current = null;
          }
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
