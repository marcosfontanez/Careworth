import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ScrollView,
  Platform,
  type LayoutChangeEvent,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ErrorState } from '@/components/ui/ErrorState';
import { colors, borderRadius, layout, spacing, typography, pulseverse } from '@/theme';
import { FeaturedLiveCarousel } from '@/components/live/FeaturedLiveCarousel';
import { PVSectionHeader } from '@/components/pv/PVSectionHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/contexts/AuthContext';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { liveGoLiveHref, liveStreamHref } from '@/lib/navigation/liveRoutes';
import { normalizeLiveHubTabQueryParam } from '@/lib/liveHubTabParam';
import { normalizeLiveHubSectionQueryParam, type LiveHubSection } from '@/lib/liveHubSectionParam';
import { useLiveHubHome } from '@/hooks/useLiveHubHome';
import type { LiveHubCategoryTab, LiveHubStream } from '@/types/liveHub';
import {
  HubCircleLiveCard,
  HubShopLiveCard,
  HubTrendingCard,
  HubUpcomingSessionCard,
  LiveHubCategoryBar,
  StartLivePromoCard,
  liveModeLabel,
} from '@/components/live/hub/HubDiscoveryCards';
import { LiveHubHeader } from '@/components/live/hub/LiveHubHeader';
import { heroCategoryLabel } from '@/components/live/hub/liveHubHeroCategory';
import { LiveHubSkeleton } from '@/components/live/hub/LiveHubSkeleton';
import { HappeningNowEmptyState } from '@/components/live/hub/HappeningNowEmptyState';
import { filterActiveLiveStreams, useLiveDiscoveryStaleTick } from '@/lib/live/activeLiveStreams';
import { isDemoLiveStreamId } from '@/lib/liveDemoStreams';
import { useLiveHubRealtimeRefresh } from '@/hooks/useLiveHubRealtimeRefresh';
import { useToast } from '@/components/ui/Toast';
import type { LiveStream } from '@/types';
import { analytics } from '@/lib/analytics';
import { streamsLiveService } from '@/services/supabase';

/** Shown when the Live tab is visible but streaming is not enabled yet (e.g. pre–store launch). */
function LivePrelaunchPlaceholder() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.safeRoot} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.prelaunchHeader}>
          <View style={styles.headerSideBtn} />
          <View style={styles.headerCenter}>
            <View style={styles.headerTitleBlock}>
              <View style={styles.headerTitleRow}>
                <Text style={styles.prelaunchHeaderTitle}>Live</Text>
                <View style={styles.headerLivePill}>
                  <View style={styles.headerLivePulse} />
                  <Text style={styles.headerLivePillTxt}>LIVE</Text>
                </View>
              </View>
              <Text style={styles.headerSubtitle}>Real conversations. Real impact.</Text>
            </View>
          </View>
          <View style={styles.headerSideBtn} />
        </View>
        <View style={[styles.prelaunchBody, { paddingBottom: insets.bottom + spacing.xl }]}>
          <EmptyState
            icon="radio-outline"
            title="Live unavailable"
            subtitle="Live streaming isn&apos;t available in this build yet. Check back after the next app update."
            accent={colors.status.live}
            ctaLabel="Back to Feed"
            onCtaPress={() => router.replace('/(tabs)/feed')}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

export default function LiveScreen() {
  if (!isFeatureEnabled('liveStreaming')) {
    return <LivePrelaunchPlaceholder />;
  }
  return <LiveHubScreen />;
}

function LiveHubScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ tab?: string | string[]; section?: string | string[] }>();
  const insets = useSafeAreaInsets();
  const showToast = useToast((s) => s.show);
  const queryClient = useQueryClient();
  const hubScrollRef = useRef<ScrollView>(null);
  const shopDealsSectionY = useRef(0);
  const upcomingSectionY = useRef(0);
  const trendingSectionY = useRef(0);
  const pendingScrollToSection = useRef<LiveHubSection | null>(null);
  const featuredSectionY = useRef(0);
  const [headerCompact, setHeaderCompact] = useState(false);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const [tab, setTab] = useState<LiveHubCategoryTab>('for-you');
  const [refreshing, setRefreshing] = useState(false);
  const { data, isLoading, isError, refetch } = useLiveHubHome(tab);

  useLiveHubRealtimeRefresh(!isLoading && !isError);

  const staleTick = useLiveDiscoveryStaleTick();

  const happeningNow = useMemo(() => {
    const rows = filterActiveLiveStreams(data?.happeningNow ?? []).filter(
      (s) => !isDemoLiveStreamId(s.id),
    );
    return rows;
  }, [data?.happeningNow, staleTick]);

  const trendingLive = useMemo(() => {
    const rows = filterActiveLiveStreams(data?.trending ?? []).filter(
      (s) => !isDemoLiveStreamId(s.id),
    );
    return rows;
  }, [data?.trending, staleTick]);

  const shopLiveDeals = useMemo(() => {
    const rows = filterActiveLiveStreams(data?.shopLiveDeals ?? []).filter(
      (s) => !isDemoLiveStreamId(s.id),
    );
    return rows;
  }, [data?.shopLiveDeals, staleTick]);

  const circleLives = useMemo(() => {
    const rows = filterActiveLiveStreams(data?.circleLives ?? []).filter(
      (s) => !isDemoLiveStreamId(s.id),
    );
    return rows;
  }, [data?.circleLives, staleTick]);

  useFocusEffect(
    useCallback(() => {
      analytics.track('live_tab_viewed', { tab });
      void refetch();
      return undefined;
    }, [tab, refetch]),
  );

  useEffect(() => {
    const rawTab = params.tab;
    const tabStr = typeof rawTab === 'string' ? rawTab : Array.isArray(rawTab) ? rawTab[0] : undefined;
    const nextTab = normalizeLiveHubTabQueryParam(tabStr);

    const rawSec = params.section;
    const secStr = typeof rawSec === 'string' ? rawSec : Array.isArray(rawSec) ? rawSec[0] : undefined;
    const nextSec = normalizeLiveHubSectionQueryParam(secStr);

    if (!nextTab && !nextSec) return;

    if (nextTab) setTab(nextTab);
    if (nextSec) pendingScrollToSection.current = nextSec;

    router.replace('/(tabs)/live' as Href);

    if (!nextSec) return;
    const sectionForTimeout = nextSec;
    setTimeout(() => {
      if (pendingScrollToSection.current !== sectionForTimeout) return;
      pendingScrollToSection.current = null;
      let y = 0;
      const inset = sectionForTimeout === 'featured' ? spacing.sm : spacing.md;
      if (sectionForTimeout === 'featured' || sectionForTimeout === 'discover') {
        y = featuredSectionY.current;
      } else if (sectionForTimeout === 'trending') {
        y = trendingSectionY.current;
      } else if (sectionForTimeout === 'shop') {
        y = shopDealsSectionY.current;
      } else if (sectionForTimeout === 'upcoming') {
        y = upcomingSectionY.current;
      }
      hubScrollRef.current?.scrollTo({ y: Math.max(0, y - inset), animated: true });
    }, 480);
  }, [params.tab, params.section, router]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const openStream = useCallback(
    (s: LiveHubStream) => {
      router.push(liveStreamHref(s.id));
    },
    [router],
  );

  const featuredSubtitle = useCallback((s: LiveStream) => {
    const hub = s as LiveHubStream;
    if (hub.description?.trim()) return hub.description.trim();
    const mode = liveModeLabel(hub.liveType);
    return hub.promoTag ? `${mode} · ${hub.promoTag}` : mode;
  }, []);

  const featuredShopBadge = useCallback((s: LiveStream) => {
    const hub = s as LiveHubStream;
    if (!hub.hasProducts) return undefined;
    return hub.promoTag?.trim() || 'Live Deal';
  }, []);

  const upcomingPreview = useMemo(() => {
    const list = data?.upcoming ?? [];
    return showAllUpcoming ? list : list.slice(0, 12);
  }, [data?.upcoming, showAllUpcoming]);

  const emptyFollowing = tab === 'following' && (data?.allFiltered.length ?? 0) === 0;

  const scrollToSectionY = useCallback((y: number, inset: number) => {
    hubScrollRef.current?.scrollTo({
      y: Math.max(0, y - inset),
      animated: true,
    });
  }, []);

  const scrollToHubSection = useCallback(
    (section: LiveHubSection) => {
      pendingScrollToSection.current = section;
      const inset = section === 'featured' ? spacing.sm : spacing.md;
      let y = 0;
      if (section === 'featured' || section === 'discover') {
        y = featuredSectionY.current;
      } else if (section === 'trending') {
        y = trendingSectionY.current;
      } else if (section === 'shop') {
        y = shopDealsSectionY.current;
      } else if (section === 'upcoming') {
        y = upcomingSectionY.current;
      }
      if (y > 0) {
        pendingScrollToSection.current = null;
        scrollToSectionY(y, inset);
      }
    },
    [scrollToSectionY],
  );

  const tryConsumePendingScrollForSection = useCallback(
    (sec: LiveHubSection, layoutY: number) => {
      if (pendingScrollToSection.current !== sec) return;
      pendingScrollToSection.current = null;
      const inset = sec === 'featured' ? spacing.sm : spacing.md;
      requestAnimationFrame(() => scrollToSectionY(layoutY, inset));
    },
    [scrollToSectionY],
  );

  const onShopSectionLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const y = e.nativeEvent.layout.y;
      shopDealsSectionY.current = y;
      tryConsumePendingScrollForSection('shop', y);
    },
    [tryConsumePendingScrollForSection],
  );

  const onHubScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    setHeaderCompact(y > 48);
  }, []);

  const viewAllTrending = useCallback(() => {
    scrollToHubSection('trending');
  }, [scrollToHubSection]);

  const viewAllUpcoming = useCallback(() => {
    setShowAllUpcoming(true);
    scrollToHubSection('upcoming');
  }, [scrollToHubSection]);

  return (
    <SafeAreaView style={styles.safeRoot} edges={['top']}>
      <View style={styles.container}>
        <LiveHubHeader
          compact={headerCompact}
          onSearch={() => router.push('/search')}
          onBell={() => router.push('/notifications')}
          onGoLive={() => router.push(liveGoLiveHref())}
        />

        <LiveHubCategoryBar compact={headerCompact} active={tab} onChange={setTab} />

        {isLoading || !data ? (
          <LiveHubSkeleton />
        ) : isError ? (
          <ErrorState title="Couldn't load Live" onRetry={() => refetch()} />
        ) : (
          <ScrollView
            ref={hubScrollRef}
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            onScroll={onHubScroll}
            scrollEventThrottle={16}
            contentInsetAdjustmentBehavior={Platform.OS === 'ios' ? 'never' : 'automatic'}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary.teal} />
            }
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing['3xl'] }]}
          >
            {emptyFollowing ? (
              <View style={{ paddingHorizontal: layout.screenPadding, marginBottom: spacing.lg }}>
                <EmptyState
                  icon="heart-outline"
                  title="No live streams from people you follow"
                  subtitle="Follow creators to see their lives here first."
                  accent={pulseverse.electric}
                  ctaLabel="Discover"
                  onCtaPress={() => router.push('/discover')}
                />
              </View>
            ) : null}

            {/* 1. Happening Now — hero carousel */}
            <View
              style={styles.sectionTightTop}
              collapsable={false}
              onLayout={(e) => {
                const y = e.nativeEvent.layout.y;
                featuredSectionY.current = y;
                tryConsumePendingScrollForSection('featured', y);
                tryConsumePendingScrollForSection('discover', y);
              }}
            >
              <PVSectionHeader
                kicker="PulseVerse Live"
                title="Happening Now"
                subtitle={
                  happeningNow.length > 0
                    ? `${happeningNow.length} live ${happeningNow.length === 1 ? 'room' : 'rooms'} broadcasting now.`
                    : 'Spotlight streams picked for you.'
                }
                leading={<Ionicons name="radio" size={16} color={colors.status.live} />}
                style={[styles.pvSectionPad, styles.pvHeaderBreathing]}
                rightSlot={
                  happeningNow.length > 0 && trendingLive.length > 0 ? (
                    <Pressable onPress={viewAllTrending} hitSlop={8}>
                      <Text style={styles.viewAllLink}>View all</Text>
                    </Pressable>
                  ) : null
                }
              />
              {happeningNow.length > 0 ? (
                <FeaturedLiveCarousel
                  streams={happeningNow}
                  onPressStream={(s) => openStream(s as LiveHubStream)}
                  maxCards={6}
                  variant="hero"
                  getCategoryLabel={(s) => heroCategoryLabel(s as LiveHubStream)}
                  getSubtitle={featuredSubtitle}
                  getShopBadge={featuredShopBadge}
                />
              ) : !emptyFollowing ? (
                <HappeningNowEmptyState
                  onGoLive={() => router.push(liveGoLiveHref())}
                  showGoLive={Boolean(user?.id)}
                />
              ) : null}
            </View>

            {trendingLive.length > 0 ? (
              <View
                style={styles.section}
                collapsable={false}
                onLayout={(e) => {
                  const y = e.nativeEvent.layout.y;
                  trendingSectionY.current = y;
                  tryConsumePendingScrollForSection('trending', y);
                }}
              >
                <PVSectionHeader
                  kicker="Discover"
                  title="More Live Rooms"
                  subtitle="Browse other broadcasts happening right now."
                  leading={<Ionicons name="flame-outline" size={16} color={colors.primary.teal} />}
                  style={[styles.pvSectionPad, styles.pvHeaderBreathing]}
                />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.hubHorizScroll}
                  contentContainerStyle={styles.hubHorizScrollContent}
                >
                  {trendingLive.map((s) => (
                    <HubTrendingCard key={s.id} stream={s} onPress={() => openStream(s)} />
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {/* 2. Shop Live */}
            {shopLiveDeals.length > 0 ? (
              <View
                style={styles.section}
                collapsable={false}
                onLayout={onShopSectionLayout}
              >
                <PVSectionHeader
                  kicker="Pulse Shop"
                  title="Shop Live"
                  subtitle="Watch demos, ask questions, and buy in real time."
                  leading={<Ionicons name="bag-handle" size={16} color={colors.primary.gold} />}
                  style={[styles.pvSectionPad, styles.pvHeaderBreathing]}
                  rightSlot={
                    <Pressable onPress={() => setTab('shop')} hitSlop={8}>
                      <Text style={styles.viewAllLink}>View all</Text>
                    </Pressable>
                  }
                />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.hubHorizScroll}
                  contentContainerStyle={styles.hubHorizScrollContent}
                >
                  {shopLiveDeals.map((s) => (
                    <HubShopLiveCard key={s.id} stream={s} onPress={() => openStream(s)} />
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {/* 3. From Your Circles */}
            {circleLives.length > 0 ? (
              <View style={styles.section}>
                <PVSectionHeader
                  kicker="Circles"
                  title="From Your Circles"
                  subtitle="Live discussions tied to communities you're part of."
                  leading={<Ionicons name="people" size={16} color={pulseverse.electric} />}
                  style={[styles.pvSectionPad, styles.pvHeaderBreathing]}
                  rightSlot={
                    <Pressable onPress={() => router.push('/discover')} hitSlop={8}>
                      <Text style={styles.viewAllLink}>View all</Text>
                    </Pressable>
                  }
                />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.hubHorizScroll}
                  contentContainerStyle={styles.hubHorizScrollContent}
                >
                  {circleLives.map((s) => (
                    <HubCircleLiveCard key={s.id} stream={s} onPress={() => openStream(s)} />
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {/* 4. Upcoming — horizontal rail */}
            {upcomingPreview.length > 0 ? (
              <View
                style={styles.section}
                collapsable={false}
                onLayout={(e) => {
                  const y = e.nativeEvent.layout.y;
                  upcomingSectionY.current = y;
                  tryConsumePendingScrollForSection('upcoming', y);
                }}
              >
                <PVSectionHeader
                  kicker="Schedule"
                  title="Upcoming Sessions"
                  subtitle="Set reminders for lives you don't want to miss."
                  leading={<Ionicons name="calendar" size={16} color={pulseverse.electric} />}
                  style={[styles.pvSectionPad, styles.pvHeaderBreathing]}
                  rightSlot={
                    !showAllUpcoming && (data?.upcoming?.length ?? 0) > upcomingPreview.length ? (
                      <Pressable onPress={viewAllUpcoming} hitSlop={8}>
                        <Text style={styles.viewAllLink}>View all sessions</Text>
                      </Pressable>
                    ) : null
                  }
                />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.hubHorizScroll}
                  contentContainerStyle={styles.hubHorizScrollContentUpcoming}
                >
                  {upcomingPreview.map((ev) => (
                    <HubUpcomingSessionCard
                      key={ev.id}
                      ev={ev}
                      onOpenSession={() => router.push(liveStreamHref(ev.id))}
                      onRsvp={async () => {
                          if (!user?.id) {
                            showToast('Sign in to save reminders.', 'info');
                            return;
                          }
                          try {
                            const next = await streamsLiveService.toggleReminder(ev.id);
                            if (next === null) {
                              showToast('Couldn\u2019t update reminder.', 'error');
                              return;
                            }
                            analytics.track('reminder_clicked', { stream_id: ev.id, enabled: next });
                            await queryClient.invalidateQueries({ queryKey: ['liveHub'] });
                            showToast(
                              next
                                ? 'Reminder saved — we\u2019ll notify you when they go live.'
                                : 'Reminder removed.',
                              'success',
                            );
                          } catch {
                            showToast('Couldn\u2019t update reminder.', 'error');
                          }
                        }}
                      />
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {/* 5. Creator CTA */}
            <View style={styles.section}>
              <StartLivePromoCard onGoLive={() => router.push(liveGoLiveHref())} />
            </View>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeRoot: { flex: 1, backgroundColor: colors.dark.bg },
  container: { flex: 1, backgroundColor: colors.dark.bg, position: 'relative' },
  scrollView: { flex: 1 },
  scrollContent: { paddingTop: spacing.sm },
  prelaunchBody: { flex: 1, justifyContent: 'center' },

  prelaunchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dark.borderSubtle,
  },
  headerSideBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleBlock: { alignItems: 'center', maxWidth: '78%' },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  headerLivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(239,68,68,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(252,165,165,0.45)',
  },
  headerLivePulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FCA5A5',
  },
  headerLivePillTxt: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FEE2E2',
    letterSpacing: 1,
  },
  prelaunchHeaderTitle: {
    ...typography.h3,
    fontSize: 18,
    color: colors.dark.text,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  headerSubtitle: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
    color: colors.dark.textMuted,
    marginTop: 1,
    letterSpacing: 0.2,
    textAlign: 'center',
  },

  hubHorizScroll: { flexGrow: 0 },
  hubHorizScrollContent: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.xs,
    gap: 0,
  },
  hubHorizScrollContentUpcoming: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.xs,
    paddingRight: spacing.md,
  },

  section: { marginTop: spacing['2xl'] },
  sectionTightTop: { marginTop: spacing.md },
  pvSectionPad: { paddingHorizontal: layout.screenPadding },
  pvHeaderBreathing: { marginBottom: spacing.md },
  viewAllLink: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '700',
    color: pulseverse.electric,
  },
  mutedCenter: {
    ...typography.caption,
    color: colors.dark.textMuted,
    textAlign: 'center',
    marginVertical: spacing.md,
  },
});
