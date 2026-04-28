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
import { LoadingState } from '@/components/ui/LoadingState';
import { useLiveStreams } from '@/hooks/useQueries';
import { colors, borderRadius, layout, spacing, typography } from '@/theme';
import { FeaturedLiveCarousel } from '@/components/live/FeaturedLiveCarousel';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { LiveNowCard } from '@/components/live/LiveNowCard';
import { RisingLiveCard } from '@/components/live/RisingLiveCard';
import { LiveTopicChip, LIVE_TOPICS, type LiveTopic } from '@/components/live/LiveTopicChip';
import { LIVE_SEED_STREAMS, isSeedStream } from '@/lib/liveSeedStreams';
import { useToast } from '@/components/ui/Toast';
import { EmptyState } from '@/components/ui/EmptyState';
import { isFeatureEnabled } from '@/lib/featureFlags';
import type { LiveStream } from '@/types';

const FEATURED_COUNT = 5;
const TOP_LIVE_TAKE = 6;
const RISING_TAKE = 6;

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
            subtitle="Creator live streams will land here soon. Turn the feature on when you’re ready, or browse the feed for now."
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

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, refetch } = useLiveStreams();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const realLive = data?.live ?? [];

  /**
   * If no real streams are active, fall back to the seed catalog so the page
   * always demonstrates its premium layout (per spec: "Seed realistic
   * healthcare live examples"). Once real streams come online, seeds are
   * dropped automatically.
   */
  const liveAll = realLive.length > 0 ? realLive : LIVE_SEED_STREAMS;
  const usingSeedContent = realLive.length === 0;

  /**
   * Sections are derived from a single live list:
   * - Featured = top 5 by viewer count
   * - Top Live Now = next 6 (after Featured) by viewer count
   * - Rising Lives = next 6 (after Featured + Top Now), by viewer count
   *
   * If there aren't enough streams, sections gracefully thin out instead of
   * showing the same stream in multiple sections.
   */
  const { featured, topLiveNow, risingLives } = useMemo(() => {
    const sorted = [...liveAll].sort((a, b) => b.viewerCount - a.viewerCount);
    const f = sorted.slice(0, FEATURED_COUNT);
    const t = sorted.slice(FEATURED_COUNT, FEATURED_COUNT + TOP_LIVE_TAKE);
    const r = sorted.slice(
      FEATURED_COUNT + TOP_LIVE_TAKE,
      FEATURED_COUNT + TOP_LIVE_TAKE + RISING_TAKE,
    );
    return { featured: f, topLiveNow: t, risingLives: r };
  }, [liveAll]);

  const showToast = useToast((s) => s.show);
  const handleStreamPress = useCallback(
    (stream: LiveStream) => {
      if (isSeedStream(stream)) {
        showToast(
          'Demo preview — real streams will open here when creators go live.',
          'info',
        );
        return;
      }
      router.push(`/live/${stream.id}`);
    },
    [router, showToast],
  );
  const handleTopicPress = useCallback(
    (topic: LiveTopic) =>
      router.push(`/search?q=${encodeURIComponent(topic.label)}` as any),
    [router],
  );

  return (
    <SafeAreaView style={styles.safeRoot} edges={['top']}>
      <View style={styles.container}>
        <Header
          onMenuPress={() => router.push('/search')}
          onSearchPress={() => router.push('/search')}
          onGoLivePress={() => router.push('/live/go-live')}
        />

        {isLoading || !data ? (
          // Shared loader so Live lines up with Feed / Circles / Pulse
          // Page rather than showing a bare ActivityIndicator.
          <LoadingState />
        ) : isError ? (
          <ErrorState title="Couldn't load streams" onRetry={() => refetch()} />
        ) : (
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentInsetAdjustmentBehavior={Platform.OS === 'ios' ? 'never' : 'automatic'}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary.teal}
              />
            }
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + 120 },
            ]}
          >
            {/* Demo-content notice — only shown when we're falling back to seed streams */}
            {usingSeedContent ? (
              <View style={styles.demoBanner}>
                <Ionicons
                  name="sparkles-outline"
                  size={14}
                  color={colors.primary.gold}
                />
                <Text style={styles.demoBannerText}>
                  Showing preview content — your live tab will fill with real streams as
                  creators go live.
                </Text>
              </View>
            ) : null}

            {/* SECTION 1 — Featured Live carousel */}
            {featured.length > 0 ? (
              <View style={styles.section}>
                <SectionHeader
                  title="Featured Live"
                  variant="prominent"
                  icon="star"
                  iconColor={colors.primary.gold}
                  actionLabel="See All"
                  onActionPress={() => router.push('/search')}
                />
                <FeaturedLiveCarousel
                  streams={featured}
                  onPressStream={handleStreamPress}
                  maxCards={FEATURED_COUNT}
                />
              </View>
            ) : null}

            {/* SECTION 2 — Top Live Now */}
            {topLiveNow.length > 0 ? (
              <View style={styles.section}>
                <SectionHeader
                  title="Top Live Now"
                  variant="prominent"
                  actionLabel="See All"
                  onActionPress={() => router.push('/search')}
                />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.hRowScroll}
                >
                  {topLiveNow.map((stream) => (
                    <View key={stream.id} style={styles.hRowItem}>
                      <LiveNowCard
                        stream={stream}
                        onPress={() => handleStreamPress(stream)}
                      />
                    </View>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {/* SECTION 3 — Rising Lives */}
            {risingLives.length > 0 ? (
              <View style={styles.section}>
                <SectionHeader
                  title="Rising Lives"
                  variant="prominent"
                  icon="trending-up"
                  iconColor={colors.primary.gold}
                  actionLabel="See All"
                  onActionPress={() => router.push('/search')}
                />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.hRowScroll}
                >
                  {risingLives.map((stream) => (
                    <View key={stream.id} style={styles.hRowItem}>
                      <RisingLiveCard
                        stream={stream}
                        onPress={() => handleStreamPress(stream)}
                      />
                    </View>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {/* SECTION 4 — Browse by Topic */}
            <View style={styles.section}>
              <SectionHeader
                title="Browse by Topic"
                variant="prominent"
                actionLabel="See All"
                onActionPress={() => router.push('/search')}
              />
              <View style={styles.topicWrap}>
                {LIVE_TOPICS.map((topic) => (
                  <LiveTopicChip
                    key={topic.id}
                    topic={topic}
                    onPress={() => handleTopicPress(topic)}
                  />
                ))}
              </View>
            </View>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

function Header({
  onMenuPress,
  onSearchPress,
  onGoLivePress,
}: {
  onMenuPress: () => void;
  onSearchPress: () => void;
  onGoLivePress: () => void;
}) {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={onMenuPress}
        hitSlop={12}
        style={styles.headerSideBtn}
        accessibilityLabel="Menu"
      >
        <Ionicons name="menu-outline" size={22} color={colors.dark.textSecondary} />
      </TouchableOpacity>

      <View style={styles.headerCenter}>
        <View style={styles.liveHeaderDot} />
        <View>
          <Text style={styles.headerTitle}>Live</Text>
          <Text style={styles.headerSubtitle}>Real conversations. Real impact.</Text>
        </View>
      </View>

      <View style={styles.headerRight}>
        <TouchableOpacity onPress={onSearchPress} hitSlop={10} accessibilityLabel="Search">
          <Ionicons name="search-outline" size={20} color={colors.dark.textSecondary} />
        </TouchableOpacity>
        <Pressable
          style={({ pressed }) => [styles.goLiveBtn, pressed && styles.goLiveBtnPressed]}
          onPress={onGoLivePress}
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
  scrollView: { flex: 1, backgroundColor: colors.dark.bg },
  scrollContent: { paddingTop: spacing.sm },
  prelaunchBody: { flex: 1, justifyContent: 'center' },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dark.borderSubtle,
  },
  headerSideBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
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

  /* Sections */
  section: { marginTop: spacing.xl },

  /* Horizontal-scrolling rows (Top Live Now, Rising Lives) */
  hRowScroll: {
    paddingHorizontal: layout.screenPadding,
    gap: spacing.md,
  },
  hRowItem: {
    /** Spacer between cards is provided by `gap` on the contentContainerStyle */
  },

  /* Browse by Topic — wrap layout */
  topicWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm + 2,
    paddingHorizontal: layout.screenPadding,
  },

  /* Demo-content banner (shown only while we're using seed streams) */
  demoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginHorizontal: layout.screenPadding,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.button,
    backgroundColor: colors.primary.gold + '12',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.primary.gold + '40',
  },
  demoBannerText: {
    flex: 1,
    ...typography.caption,
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.primary.gold,
    letterSpacing: 0.1,
  },
});
