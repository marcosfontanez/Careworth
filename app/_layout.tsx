import React, { useEffect, useRef } from 'react';
import { InteractionManager, AppState } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { colors } from '@/theme';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { queryClient, restoreQueryCache, persistQueryCache } from '@/lib/queryClient';
import { analytics } from '@/lib/analytics';
import { realtime } from '@/lib/realtime';
import { useThemeStore } from '@/lib/theme';
import { setupDeepLinkHandler } from '@/lib/deepLink';
import { postsService } from '@/services/supabase';
import { notificationService } from '@/services';
import { feedKeys, likedPostKeys } from '@/lib/queryKeys';
import { NetworkBanner } from '@/components/ui/NetworkBanner';
import { ToastContainer } from '@/components/ui/Toast';
import { MediaExportOverlay } from '@/components/export/MediaExportOverlay';
import { trackAppOpen, promptReview } from '@/lib/appReview';
import { useOfflineQueueProcessor } from '@/hooks/useOfflineQueueProcessor';
import { pruneCache } from '@/lib/imageCache';
import { initPushNotifications } from '@/lib/notifications';
import { initMonitoring } from '@/lib/monitoring';
import { PulseMonthCelebrationGate } from '@/components/mypage/PulseMonthCelebrationGate';
import { BetaTesterBorderGate } from '@/components/mypage/BetaTesterBorderGate';
import { PulseVerseTeamBorderGiftGate } from '@/components/mypage/PulseVerseTeamBorderGiftGate';
import { schedulePostSignInNavigation } from '@/lib/postSignInNavigation';
import { resetRootIndexRedirectDedupe } from '@/lib/rootIndexRedirect';
import { attachSupabaseAuthAutoRefreshToAppState } from '@/lib/supabaseAuthLifecycle';
import * as Updates from 'expo-updates';
import { attachAppResumeStaleDataRefresh } from '@/lib/appResumeQuerySync';

WebBrowser.maybeCompleteAuthSession();
initMonitoring();

function AppShell() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const hasRedirected = useRef(false);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  useEffect(() => {
    if (!isLoading) SplashScreen.hideAsync().catch(() => {});
  }, [isLoading]);

  useEffect(() => {
    /**
     * Cache restore is now deferred via `InteractionManager.runAfterInteractions`
     * inside `restoreQueryCache` itself, so it never blocks first paint.
     * (Previous code called `clearPersistedCache()` immediately before
     * `restoreQueryCache()` — both unawaited — which silently wiped the
     * disk cache before the restore could read it. Removed that bug.)
     */
    void restoreQueryCache();
    useThemeStore.getState().init();
    const cleanupDeepLinks = setupDeepLinkHandler();

    /**
     * Persist every 60s so a backgrounded → foregrounded session has a
     * recent snapshot to restore from. Cheap — `persistQueryCache` is
     * size-capped to ~1MB and bails on serialisation errors.
     */
    const interval = setInterval(persistQueryCache, 60000);
    return () => {
      clearInterval(interval);
      cleanupDeepLinks();
    };
  }, []);

  useEffect(() => {
    const inAuth = segments[0] === 'auth';

    if (!isAuthenticated) {
      hasRedirected.current = false;
    }

    /**
     * Cold boot: keep `isLoading true` + `isAuthenticated false` until `getSession` resolves.
     * Do not send the user to `/auth/login` during that window (avoid an ugly flash).
     *
     * Once we know there is a Supabase session (`isAuthenticated`), allow routing even while
     * `isLoading` is still true — profile hydration can take hundreds of ms and we must still
     * move off `/auth/login` (and let `app/index.tsx` gate on `isLoading`).
     */
    if (isLoading && !isAuthenticated) return;

    if (!isAuthenticated && !inAuth) {
      /**
       * User can be on `/(tabs)/*` when the session drops. Without clearing the index
       * redirect dedupe, `lastReplaceTarget` may still be `'/(tabs)/feed'` from the
       * prior session — then after the next sign-in, `app/index` skips `replace` and
       * the app sits on a blank shell until a hard restart.
       */
      resetRootIndexRedirectDedupe();
      queryClient.clear();
      router.replace('/auth/login');
      return;
    }

    if (isAuthenticated && inAuth && !hasRedirected.current) {
      const onLegalAck = segments[0] === 'auth' && segments.some((s) => s === 'legal-ack');
      if (!onLegalAck) {
        hasRedirected.current = true;
        schedulePostSignInNavigation(router);
      }
    }
  }, [isAuthenticated, isLoading, segments, router]);

  /**
   * Drives offline-queue replay on sign-in / foreground / network reconnect.
   * Replaces the one-shot processQueue() that used to live in the [user]
   * effect below — that only flushed at sign-in and missed every later
   * recovery moment.
   */
  useOfflineQueueProcessor(user?.id ?? null);

  /**
   * Background: persist React Query + analytics. Long resume: soft-refresh
   * notifications / live / Circles shell (see `attachAppResumeStaleDataRefresh`).
   */
  useEffect(
    () =>
      attachAppResumeStaleDataRefresh(queryClient, {
        onBackground: () => {
          void persistQueryCache();
          void analytics.flush();
        },
        /**
         * ~10+ minutes suspended (phone locked): reload the JS bundle when OTA is enabled
         * so expo-video / navigation recover from a stuck non-loading surface; dev builds
         * fall back to clearing feed queries + jumping to the Feed tab.
         */
        onLongIdleResume: () => {
          void (async () => {
            try {
              if (!__DEV__ && Updates.isEnabled) {
                await Updates.reloadAsync();
                return;
              }
            } catch {
              /* expo-updates reload unavailable */
            }
            try {
              queryClient.removeQueries({
                predicate: (q) => {
                  const k = q.queryKey;
                  return Array.isArray(k) && k[0] === 'feedInf';
                },
              });
              queryClient.invalidateQueries({ queryKey: feedKeys.root() });
              if (isAuthenticated) {
                router.replace('/(tabs)/feed');
              }
            } catch {
              /* noop */
            }
          })();
        },
      }),
    [isAuthenticated, router],
  );

  useEffect(() => {
    if (!user) {
      analytics.setUser(null);
      realtime.unsubscribeAll();
      return () => {
        analytics.flush();
      };
    }

    const uid = user.id;
    analytics.setUser(uid);
    analytics.track('app_open');
    trackAppOpen().then(() => promptReview());
    /**
     * Prune after first interactions so disk walks don’t contend with
     * feed + tab-bar paint (same idea as deferred `restoreQueryCache`).
     */
    InteractionManager.runAfterInteractions(() => {
      void pruneCache();
    });

    let cancelled = false;
    let pushCleanup: (() => void) | undefined;
    void initPushNotifications(uid).then((cleanup) => {
      if (cancelled) cleanup();
      else pushCleanup = cleanup;
    });

    /**
     * Debounce invalidation: a burst of notification inserts (e.g. batch
     * fan-out) becomes one refetch instead of N separate notification queries.
     */
    let notifInvalidateTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleNotificationCacheRefresh = () => {
      if (notifInvalidateTimer != null) clearTimeout(notifInvalidateTimer);
      notifInvalidateTimer = setTimeout(() => {
        notifInvalidateTimer = null;
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['notifications', 'unread'] });
      }, 350);
    };

    realtime.subscribeToNotifications(uid, scheduleNotificationCacheRefresh);

    /**
     * Cold-boot wave (parallel RTT with profile hydration): For You infinite
     * feed plus lightweight queries the tab bar / feed use (`useLikedPostIds`,
     * `useUnreadCount`). `allSettled` so one failed prefetch never blocks the
     * others. Each `prefetch*` no-ops when cache is already fresh.
     */
    void Promise.allSettled([
      queryClient.prefetchInfiniteQuery({
        queryKey: feedKeys.infinitePage('forYou', uid),
        initialPageParam: undefined as undefined | { cursor: string; seenIds: string[] },
        queryFn: async () => {
          const posts = await postsService.getFeed('forYou', uid);
          const last = posts[posts.length - 1];
          return {
            posts,
            nextCursor: posts.length ? last.createdAt : null,
            seenIds: posts.map((p) => p.id),
          };
        },
        staleTime: 60_000,
      }),
      queryClient.prefetchQuery({
        queryKey: likedPostKeys.forUser(uid),
        queryFn: async () => [...(await postsService.getLikedPostIdsForUser(uid))],
        staleTime: 60_000,
      }),
      queryClient.prefetchQuery({
        queryKey: ['notifications', 'unread', uid],
        queryFn: () => notificationService.getUnreadCount(uid),
        staleTime: 45_000,
      }),
    ]);

    /** Full notification list (50 rows + actor join) fights the feed for RTT on cold boot — warm after first interactions. */
    const notifListTask = InteractionManager.runAfterInteractions(() => {
      void queryClient.prefetchQuery({
        queryKey: ['notifications', uid],
        queryFn: () => notificationService.getAll(uid),
        staleTime: 45_000,
      });
    });

    return () => {
      cancelled = true;
      notifListTask.cancel?.();
      if (notifInvalidateTimer != null) {
        clearTimeout(notifInvalidateTimer);
        notifInvalidateTimer = null;
      }
      pushCleanup?.();
      realtime.unsubscribe(`notifications:${uid}`);
      analytics.flush();
    };
  }, [user]);

  return (
    <>
      <StatusBar style="light" />
      <NetworkBanner />
      <ToastContainer />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.dark.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="notifications" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="search" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="comments/[postId]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="admin" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="edit-profile" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="legal" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="messages" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="settings" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="saved" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="followers" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="post/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="image-viewer" options={{ presentation: 'modal', animation: 'fade' }} />
        <Stack.Screen name="discover" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="blocked-users" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="change-password" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="apply/[jobId]" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="my-posts" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="pulse-shop" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="my-borders" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="my-pulse-appearance" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="innovation" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="hashtag/[tag]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="sound/[postId]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="appeal/[postId]" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="circles-featured" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="design" options={{ animation: 'slide_from_right' }} />
      </Stack>
      <MediaExportOverlay />
      <BetaTesterBorderGate />
      <PulseMonthCelebrationGate />
      <PulseVerseTeamBorderGiftGate />
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    const detachAuthRefresh = attachSupabaseAuthAutoRefreshToAppState();
    return () => detachAuthRefresh();
  }, []);

  useEffect(() => {
    const hide = () => SplashScreen.hideAsync().catch(() => {});
    hide();
    let innerRaf = 0;
    const outerRaf = requestAnimationFrame(() => {
      hide();
      innerRaf = requestAnimationFrame(hide);
    });
    const t0 = setTimeout(hide, 0);
    const t1 = setTimeout(hide, 120);
    const task = InteractionManager.runAfterInteractions(hide);
    return () => {
      cancelAnimationFrame(outerRaf);
      cancelAnimationFrame(innerRaf);
      clearTimeout(t0);
      clearTimeout(t1);
      task.cancel?.();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.dark.bg }}>
      <ErrorBoundary>
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <AppShell />
          </QueryClientProvider>
        </AuthProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
