import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ErrorState } from '@/components/ui/ErrorState';
import { colors, borderRadius, layout, spacing, typography, pulseverse } from '@/theme';
import { FeaturedLiveCarousel } from '@/components/live/FeaturedLiveCarousel';
import { PVSectionHeader } from '@/components/pv/PVSectionHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { liveGoLiveHref, liveHostControlsHref, liveStreamHref } from '@/lib/navigation/liveRoutes';
import { useLiveHubHome } from '@/hooks/useLiveHubHome';
import type { LiveHubCategoryTab, LiveHubStream } from '@/types/liveHub';
import {
  HubCircleLiveCard,
  HubShopLiveCard,
  HubTrendingCard,
  HubUpcomingCard,
  LiveHubCategoryBar,
  StartLivePromoCard,
  liveModeLabel,
} from '@/components/live/hub/HubDiscoveryCards';
import { LiveHubSkeleton } from '@/components/live/hub/LiveHubSkeleton';
import { useToast } from '@/components/ui/Toast';
import type { LiveStream } from '@/types';

function chunkPairs<T>(arr: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += 2) out.push(arr.slice(i, i + 2));
  return out;
}

/** Shown when the Live tab is visible but streaming is not enabled yet (e.g. pre–store launch). */
function LivePrelaunchPlaceholder() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.safeRoot} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerSideBtn} />
          <View style={styles.headerCenter}>
            <View style={styles.liveHeaderDot} />
            <View>
              <Text style={styles.headerTitle}>Live</Text>
              <Text style={styles.headerSubtitle}>Real conversations. Real impact.</Text>
            </View>
          </View>
          <View style={styles.headerSideBtn} />
        </View>
        <View style={[styles.prelaunchBody, { paddingBottom: insets.bottom + spacing.xl }]}>
          <EmptyState
            icon="radio-outline"
            title="Coming after launch"
            subtitle="Turn on Live streaming in Admin → Feature flags when you’re ready."
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
  const insets = useSafeAreaInsets();
  const showToast = useToast((s) => s.show);
  const [tab, setTab] = useState<LiveHubCategoryTab>('for-you');
  const [refreshing, setRefreshing] = useState(false);
  const { data, isLoading, isError, refetch } = useLiveHubHome(tab);

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
    const mode = liveModeLabel(hub.liveType);
    return hub.promoTag ? `${mode} · ${hub.promoTag}` : mode;
  }, []);

  const featuredShopBadge = useCallback((s: LiveStream) => {
    const hub = s as LiveHubStream;
    if (!hub.hasProducts) return undefined;
    if (hub.promoTag?.trim()) return hub.promoTag.trim();
    const t = hub.products?.[0]?.title?.trim();
    if (!t) return 'Shop Live';
    return t.length > 32 ? `${t.slice(0, 31)}…` : t;
  }, []);

  const upcoming = data?.upcoming ?? [];
  const [rsvp, setRsvp] = useState<Record<string, 'none' | 'going' | 'reminder'>>({});

  const emptyFollowing = tab === 'following' && (data?.allFiltered.length ?? 0) === 0;

  const trendingRows = useMemo(() => chunkPairs(data?.trending ?? []), [data?.trending]);

  return (
    <SafeAreaView style={styles.safeRoot} edges={['top']}>
      <View style={styles.container}>
        <HubHeader
          onSearch={() => router.push('/search')}
          onBell={() => router.push('/notifications')}
          onGoLive={() => router.push(liveGoLiveHref())}
        />

        <LiveHubCategoryBar active={tab} onChange={setTab} />

        {isLoading || !data ? (
          <LiveHubSkeleton />
        ) : isError ? (
          <ErrorState title="Couldn't load Live" onRetry={() => refetch()} />
        ) : (
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentInsetAdjustmentBehavior={Platform.OS === 'ios' ? 'never' : 'automatic'}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary.teal} />
            }
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
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

            {/* Featured Live Now */}
            {data.featured.length > 0 ? (
              <View style={styles.section}>
                <PVSectionHeader
                  title="Featured Live Now"
                  leading={<Ionicons name="radio" size={16} color={colors.status.live} />}
                  style={styles.pvSectionPad}
                />
                <FeaturedLiveCarousel
                  streams={data.featured}
                  onPressStream={(s) => openStream(s as LiveHubStream)}
                  maxCards={5}
                  getSubtitle={featuredSubtitle}
                  getShopBadge={featuredShopBadge}
                />
              </View>
            ) : (
              !emptyFollowing && (
                <View style={{ paddingHorizontal: layout.screenPadding }}>
                  <Text style={styles.mutedCenter}>No featured streams in this filter — pull to refresh.</Text>
                </View>
              )
            )}

            {/* Trending */}
            {data.trending.length > 0 ? (
              <View style={styles.section}>
                <PVSectionHeader
                  title="Trending Live"
                  leading={<Ionicons name="flame" size={16} color={colors.primary.gold} />}
                  style={styles.pvSectionPad}
                />
                <View style={{ paddingHorizontal: layout.screenPadding, gap: spacing.md }}>
                  {trendingRows.map((row, ri) => (
                    <View key={ri} style={styles.trendRow}>
                      {row.map((s) => (
                        <HubTrendingCard key={s.id} stream={s} onPress={() => openStream(s)} />
                      ))}
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Shop Live Deals */}
            {data.shopLiveDeals.length > 0 ? (
              <View style={styles.section}>
                <PVSectionHeader
                  title="Shop Live Deals"
                  leading={<Ionicons name="bag-handle" size={16} color={colors.primary.gold} />}
                  style={styles.pvSectionPad}
                />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: layout.screenPadding }}
                >
                  {data.shopLiveDeals.map((s) => (
                    <HubShopLiveCard key={s.id} stream={s} onPress={() => openStream(s)} />
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {/* Upcoming */}
            {upcoming.length > 0 ? (
              <View style={styles.section}>
                <PVSectionHeader
                  title="Upcoming Live Sessions"
                  leading={<Ionicons name="calendar" size={16} color={pulseverse.electric} />}
                  style={styles.pvSectionPad}
                />
                {upcoming.map((ev) => (
                  <HubUpcomingCard
                    key={ev.id}
                    ev={{
                      ...ev,
                      rsvpState: rsvp[ev.id] ?? ev.rsvpState ?? 'none',
                    }}
                    onRsvp={() => {
                      setRsvp((prev) => {
                        const cur = prev[ev.id] ?? 'none';
                        const next: 'none' | 'going' = cur === 'going' ? 'none' : 'going';
                        return { ...prev, [ev.id]: next };
                      });
                      showToast('Reminder updated (demo)', 'success');
                    }}
                  />
                ))}
              </View>
            ) : null}

            {/* Circles */}
            {data.circleLives.length > 0 ? (
              <View style={styles.section}>
                <PVSectionHeader
                  title="From Your Circles"
                  leading={<Ionicons name="people" size={16} color={pulseverse.electric} />}
                  style={styles.pvSectionPad}
                />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: layout.screenPadding }}
                >
                  {data.circleLives.map((s) => (
                    <HubCircleLiveCard key={s.id} stream={s} onPress={() => openStream(s)} />
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {/* Host tools (preview) */}
            <View style={[styles.section, { paddingHorizontal: layout.screenPadding }]}>
              <Pressable
                style={styles.hostToolsRow}
                onPress={() => router.push(liveHostControlsHref({ demo: true }))}
              >
                <Ionicons name="construct" size={18} color={pulseverse.electric} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.hostToolsTitle}>Seller control panel (preview)</Text>
                  <Text style={styles.hostToolsSub}>Pin products, flash deals, metrics — demo UI</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.dark.textMuted} />
              </Pressable>
            </View>

            <StartLivePromoCard onGoLive={() => router.push(liveGoLiveHref())} />
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

function HubHeader({
  onSearch,
  onBell,
  onGoLive,
}: {
  onSearch: () => void;
  onBell: () => void;
  onGoLive: () => void;
}) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onSearch} hitSlop={12} style={styles.headerSideBtn} accessibilityLabel="Search">
        <Ionicons name="search-outline" size={22} color={colors.dark.textSecondary} />
      </TouchableOpacity>

      <View style={styles.headerCenter}>
        <View style={styles.liveHeaderDot} />
        <View>
          <Text style={styles.headerTitle}>Live</Text>
          <Text style={styles.headerSubtitle}>Discover · Learn · Shop · Go Live</Text>
        </View>
      </View>

      <View style={styles.headerRight}>
        <TouchableOpacity onPress={onBell} hitSlop={10} accessibilityLabel="Notifications">
          <Ionicons name="notifications-outline" size={21} color={colors.dark.textSecondary} />
        </TouchableOpacity>
        <Pressable
          style={({ pressed }) => [styles.goLiveBtn, pressed && styles.goLiveBtnPressed]}
          onPress={onGoLive}
        >
          <Ionicons name="videocam-outline" size={14} color={colors.primary.teal} />
          <Text style={styles.goLiveText}>Go Live</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeRoot: { flex: 1, backgroundColor: colors.dark.bg },
  container: { flex: 1, backgroundColor: colors.dark.bg },
  scrollView: { flex: 1 },
  scrollContent: { paddingTop: spacing.sm },
  prelaunchBody: { flex: 1, justifyContent: 'center' },

  header: {
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
    gap: spacing.sm,
  },
  liveHeaderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.status.live,
    borderWidth: 1,
    borderColor: colors.primary.gold + 'AA',
  },
  headerTitle: {
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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  goLiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: borderRadius.button,
    borderWidth: 1,
    borderColor: colors.primary.teal + '44',
    backgroundColor: colors.primary.teal + '12',
  },
  goLiveBtnPressed: { opacity: 0.85, backgroundColor: colors.primary.teal + '24' },
  goLiveText: {
    ...typography.button,
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary.teal,
  },

  section: { marginTop: spacing.xl },
  pvSectionPad: { paddingHorizontal: layout.screenPadding },
  trendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  mutedCenter: {
    ...typography.caption,
    color: colors.dark.textMuted,
    textAlign: 'center',
    marginVertical: spacing.md,
  },
  hostToolsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.16)',
    backgroundColor: 'rgba(15,23,42,0.65)',
  },
  hostToolsTitle: { ...typography.h3, fontSize: 15, color: colors.dark.text },
  hostToolsSub: { ...typography.caption, color: colors.dark.textMuted, marginTop: 2 },
});
