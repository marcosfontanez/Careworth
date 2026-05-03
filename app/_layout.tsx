import React, { useEffect, useRef } from 'react';
import { InteractionManager } from 'react-native';
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
import { feedKeys } from '@/lib/queryKeys';
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
     * Persist every 30s so a backgrounded → foregrounded session has a
     * recent snapshot to restore from. Cheap — `persistQueryCache` is
     * size-capped to ~1MB and bails on serialisation errors.
     */
    const interval = setInterval(persistQueryCache, 30000);
    return () => {
      clearInterval(interval);
      cleanupDeepLinks();
    };
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuth = segments[0] === 'auth' || segments[0] === 'onboarding';

    if (!isAuthenticated) {
      hasRedirected.current = false;
    }

    if (!isAuthenticated && !inAuth) {
      queryClient.clear();
      router.replace('/auth/login');
      return;
    }

    if (isAuthenticated && inAuth && !hasRedirected.current) {
      const onLegalAck = segments[0] === 'auth' && segments.some((s) => s === 'legal-ack');
      if (!onLegalAck) {
        hasRedirected.current = true;
        router.replace('/');
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
    pruneCache().catch(() => {});

    let cancelled = false;
    let pushCleanup: (() => void) | undefined;
    void initPushNotifications(uid).then((cleanup) => {
      if (cancelled) cleanup();
      else pushCleanup = cleanup;
    });

    realtime.subscribeToNotifications(uid, () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread'] });
    });

    /**
     * Cold-boot speed: kick off the For You feed fetch the moment we
     * have an auth session — *in parallel with* profile hydration in
     * `AuthContext.fetchProfile`. The feed query in `app/(tabs)/feed.tsx`
     * keys off `useFeedInfinite('forYou', user.id)`, so when the tab
     * mounts a few hundred ms later it sees a hot cache entry and
     * skips the network entirely.
     *
     * Saves ~300–800ms of "blank feed" on first launch, depending on
     * RTT. `prefetchInfiniteQuery` is a no-op if the cache is already
     * fresh, so re-mounts of AppShell don't re-fetch.
     */
    void queryClient.prefetchInfiniteQuery({
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
      staleTime: 30_000,
    });

    return () => {
      cancelled = true;
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
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
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
    </>
  );
}

export default function RootLayout() {
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
