import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useCirclesHome, useUnreadCount } from '@/hooks/useQueries';
import { useAppStore } from '@/store/useAppStore';
import { circleContentService } from '@/services/circleContent';
import { CirclesTabHeading } from '@/components/circles/CirclesTabHeading';
import { CircleSearchBar } from '@/components/circles/CircleSearchBar';
import { CircleCardFeatured } from '@/components/circles/CircleCardFeatured';
import { CircleCardCompact } from '@/components/circles/CircleCardCompact';
import { TrendingTopicCard } from '@/components/circles/TrendingTopicCard';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { colors, typography, touchTarget, spacing } from '@/theme';
import { getCircleAccent } from '@/lib/circleAccents';
import type { Community } from '@/types';

export default function CirclesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch, isFetching } = useCirclesHome();
  const joinedIds = useAppStore((s) => s.joinedCommunityIds);
  const toggleJoin = useAppStore((s) => s.toggleJoinCommunity);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Community[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  useFocusEffect(
    useCallback(() => {
      void queryClient.invalidateQueries({ queryKey: ['notifications', 'unread'] });
    }, [queryClient]),
  );

  useEffect(() => {
    let cancelled = false;
    const q = search.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }
    void circleContentService.searchCirclesAndTopics(q).then((r) => {
      if (!cancelled) setSearchResults(r);
    });
    return () => {
      cancelled = true;
    };
  }, [search]);

  const featured = data?.featured ?? [];
  const trending = (data?.trending ?? []).slice(0, 3);
  const newCircles = data?.newCircles ?? [];

  const showFullLanding = !search.trim();
  const { data: notificationUnread } = useUnreadCount();
  const bellCount = notificationUnread ?? 0;

  if (isLoading && !data) return <LoadingState />;
  if (isError || !data) {
    return <ErrorState title="Couldn't load circles" onRetry={() => refetch()} />;
  }

  const renderCompactList = (list: Community[], emptyHint: string, discovery = false) => {
    if (list.length === 0) {
      return (
        <View style={styles.emptyInline}>
          <Ionicons name="planet-outline" size={36} color={colors.dark.textMuted} />
          <Text style={styles.emptyText}>{emptyHint}</Text>
        </View>
      );
    }
    return list.map((c) => {
      /** Single source of truth for room identity — keeps the landing card
       *  hue in lockstep with the room banner hue (curated table wins,
       *  DB color wins when no curated entry, default teal otherwise). */
      const accent = getCircleAccent(c.slug, c.accentColor).color;
      const isJoined = joinedIds.has(c.id);
      return (
        <CircleCardCompact
          key={c.id}
          community={c}
          accent={accent}
          joined={isJoined}
          discovery={discovery}
          onPress={() => router.push(`/communities/${c.slug}`)}
          onToggleJoin={() => toggleJoin(c.id)}
        />
      );
    });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerBrand}>
          <CirclesTabHeading />
        </View>
        <TouchableOpacity
          onPress={() => router.push('/notifications')}
          style={styles.bellBtn}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel={`Notifications${bellCount > 0 ? `, ${bellCount} unread` : ''}`}
        >
          <Ionicons name="notifications-outline" size={22} color={colors.dark.text} />
          {bellCount > 0 ? (
            <View style={styles.bellDot}>
              <Text style={styles.bellDotText}>{bellCount > 9 ? '9+' : bellCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || (!!isFetching && !refreshing)}
            onRefresh={onRefresh}
            tintColor={colors.primary.teal}
          />
        }
      >
        <CircleSearchBar value={search} onChangeText={setSearch} />

        {!showFullLanding ? (
          <View style={styles.section}>
            <Text style={styles.sectionKicker}>Results</Text>
            <Text style={styles.sectionLede}>Circles and topics matching your search.</Text>
            {renderCompactList(searchResults, 'No circles match — try another keyword.')}
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.featuredTitle}>Featured Circles</Text>
                <TouchableOpacity onPress={() => router.push('/circles-featured')} hitSlop={8} accessibilityRole="button" accessibilityLabel="See all featured circles">
                  <Text style={styles.seeAll}>See all</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.sectionLede}>Explore Circles that match your interests.</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                snapToInterval={186}
                snapToAlignment="start"
                disableIntervalMomentum
                contentContainerStyle={styles.featuredScroll}
              >
                {featured.map((c) => {
                  const accent = getCircleAccent(c.slug, c.accentColor).color;
                  return (
                    <CircleCardFeatured
                      key={c.id}
                      community={c}
                      accent={accent}
                      onPress={() => router.push(`/communities/${c.slug}`)}
                    />
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionKicker}>Trending topics</Text>
              </View>
              <Text style={styles.sectionLede}>The top 3 most engaged conversations right now.</Text>
              <View style={styles.trendStack}>
                {trending.map((t, i) => (
                  <TrendingTopicCard
                    key={t.id}
                    topic={t}
                    rank={(i + 1) as 1 | 2 | 3}
                    accent={colors.primary.teal}
                    onPress={() =>
                      t.postId
                        ? router.push(`/post/${t.postId}` as any)
                        : router.push(`/communities/${t.circleSlug}/thread/${t.threadId}` as any)
                    }
                  />
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionKicker}>New circles</Text>
              </View>
              <Text style={styles.sectionLede}>Fresh circles, added regularly for new ways to connect.</Text>
              {renderCompactList(newCircles, 'New circles coming soon.', true)}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  scroll: { paddingHorizontal: 0, paddingBottom: 24 },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  headerBrand: {
    flex: 1,
    minHeight: 118,
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginRight: 6,
    paddingRight: 4,
  },
  bellBtn: {
    width: touchTarget.min,
    height: touchTarget.min,
    borderRadius: 22,
    backgroundColor: colors.dark.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  bellDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.status.warning,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.dark.bg,
  },
  bellDotText: { fontSize: 10, fontWeight: '800', color: '#0A0C10' },
  section: { marginBottom: spacing.sm, paddingHorizontal: spacing.lg },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  featuredTitle: {
    ...typography.sectionTitle,
    fontSize: 15,
    fontWeight: '800',
    color: colors.dark.text,
    letterSpacing: -0.3,
  },
  sectionKicker: {
    ...typography.sectionTitle,
    fontSize: 15,
    fontWeight: '800',
    color: colors.dark.text,
    letterSpacing: -0.3,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary.teal,
  },
  hotNow: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.status.warning,
    letterSpacing: 0.35,
    textTransform: 'uppercase',
  },
  sectionLede: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.dark.textMuted,
    marginTop: 6,
    marginBottom: 14,
  },
  featuredScroll: {
    gap: 12,
    paddingBottom: 8,
    paddingLeft: 2,
    paddingRight: 20,
  },
  trendStack: { gap: 8 },
  emptyInline: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyText: { fontSize: 14, color: colors.dark.textMuted, textAlign: 'center' },
});
