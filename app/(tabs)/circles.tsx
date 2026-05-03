import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Keyboard,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, type ParamListBase } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useCirclesHome, useUnreadCount } from '@/hooks/useQueries';
import { useAppStore } from '@/store/useAppStore';
import { circleContentService } from '@/services/circleContent';
import { communitiesService } from '@/services/supabase';
import { CirclesTabHeading } from '@/components/circles/CirclesTabHeading';
import { CircleSearchBar } from '@/components/circles/CircleSearchBar';
import { CircleCardFeatured } from '@/components/circles/CircleCardFeatured';
import { CircleCardCompact } from '@/components/circles/CircleCardCompact';
import { TrendingTopicCard } from '@/components/circles/TrendingTopicCard';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { colors, typography, touchTarget, spacing } from '@/theme';
import { getCircleAccent } from '@/lib/circleAccents';
import {
  addRecentCircleSearch,
  clearRecentCircleSearches,
  getRecentCircleSearches,
} from '@/lib/circleExperience';
import { hrefCommunity, hrefCommunityThread, hrefPost } from '@/lib/communityRoutes';
import { primeCommunityDetailCache } from '@/lib/communityCache';
import { addSearchQuery } from '@/lib/searchHistory';
import { FEATURED_CIRCLE_SLUGS_ORDER } from '@/constants/circleDiscovery';
import { timeAgo } from '@/utils/format';
import type { Community } from '@/types';

type DiscoverScope = 'discover' | 'yours';

export default function CirclesScreen() {
  const router = useRouter();
  const { scope: scopeParam } = useLocalSearchParams<{ scope?: string }>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch, isFetching } = useCirclesHome();
  const joinedIds = useAppStore((s) => s.joinedCommunityIds);
  const toggleJoin = useAppStore((s) => s.toggleJoinCommunity);
  const [search, setSearch] = useState('');
  const [searchGrouped, setSearchGrouped] = useState<{
    directory: Community[];
    fromDiscussions: Community[];
  } | null>(null);
  const [searchDidYouMean, setSearchDidYouMean] = useState<string | null>(null);
  const [recentCircleSearches, setRecentCircleSearches] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [scope, setScope] = useState<DiscoverScope>('discover');
  const mainScrollRef = useRef<ScrollView>(null);
  const featuredScrollRef = useRef<ScrollView>(null);

  const joinedIdsKey = useMemo(() => [...joinedIds].sort().join(','), [joinedIds]);
  const joinedIdList = useMemo(() => [...joinedIds], [joinedIds]);

  const { data: joinedCommunities = [] } = useQuery({
    queryKey: ['communities', 'joinedDetail', joinedIdsKey],
    queryFn: async () => {
      if (joinedIdList.length === 0) return [] as Community[];
      const rows = await communitiesService.getByIds(joinedIdList);
      const stats = await communitiesService.getCardStatsForIds(joinedIdList);
      return rows.map((c) => {
        const s = stats.get(c.id);
        if (!s) return c;
        return {
          ...c,
          memberCount: s.memberCount,
          postCount: s.postCount,
          onlineCount: s.onlineCount,
          presenceAvatars: s.avatarUrls,
        };
      });
    },
    enabled: joinedIds.size > 0,
    staleTime: 60_000,
  });

  const resetCirclesHome = useCallback(() => {
    Keyboard.dismiss();
    setSearch('');
    setSearchGrouped(null);
    setSearchDidYouMean(null);
    featuredScrollRef.current?.scrollTo({ x: 0, animated: false });
    mainScrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  useEffect(() => {
    const tabNav = navigation.getParent() as BottomTabNavigationProp<ParamListBase> | undefined;
    if (!tabNav) return undefined;
    return tabNav.addListener('tabPress', () => {
      if (navigation.isFocused()) {
        resetCirclesHome();
      }
    });
  }, [navigation, resetCirclesHome]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    if (joinedIds.size > 0) {
      await queryClient.invalidateQueries({ queryKey: ['communities', 'joinedDetail'] });
    }
    setRefreshing(false);
  }, [refetch, queryClient, joinedIds.size]);

  const onClearCircleSearchHistory = useCallback(() => {
    void clearRecentCircleSearches().then(() => setRecentCircleSearches([]));
  }, []);

  useFocusEffect(
    useCallback(() => {
      void queryClient.invalidateQueries({ queryKey: ['notifications', 'unread'] });
      void getRecentCircleSearches().then(setRecentCircleSearches);
    }, [queryClient]),
  );

  useEffect(() => {
    if (scopeParam === 'yours' || scopeParam === 'discover') {
      setScope(scopeParam);
    }
  }, [scopeParam]);

  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) {
      setSearchGrouped(null);
      setSearchDidYouMean(null);
      return;
    }
    let alive = true;
    const t = setTimeout(() => {
      void circleContentService.searchCirclesAndTopicsGrouped(q).then((g) => {
        if (!alive) return;
        setSearchGrouped({
          directory: g.directory,
          fromDiscussions: g.fromDiscussions,
        });
        setSearchDidYouMean(g.didYouMean ?? null);
        void addRecentCircleSearch(q);
        void addSearchQuery(q);
        void getRecentCircleSearches().then(setRecentCircleSearches);
      });
    }, 420);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [search]);

  const featured = data?.featured ?? [];
  const trending = (data?.trending ?? []).slice(0, 3);
  const newCircles = data?.newCircles ?? [];

  const showFullLanding = !search.trim();
  const { data: notificationUnread } = useUnreadCount();
  const bellCount = notificationUnread ?? 0;

  /** Must run before any conditional return — hooks cannot follow early returns. */
  const activityByCircleId = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of trending) {
      if (!m.has(t.circleId)) m.set(t.circleId, `Hot topic · ${timeAgo(t.lastActiveAt)}`);
    }
    return m;
  }, [trending]);

  const openCommunity = useCallback(
    (c: Community) => {
      primeCommunityDetailCache(queryClient, c);
      router.push(hrefCommunity(c.slug));
    },
    [queryClient, router],
  );

  const featuredForScope = useMemo(() => {
    if (scope === 'yours') return featured.filter((c) => joinedIds.has(c.id));
    return featured;
  }, [featured, scope, joinedIds]);

  const newForScope = useMemo(() => {
    if (scope === 'yours') return newCircles.filter((c) => joinedIds.has(c.id));
    return newCircles;
  }, [newCircles, scope, joinedIds]);

  const discoveryFallbackChips = useMemo(() => {
    const feat = data?.featured ?? [];
    const fromFeatured = feat.slice(0, 3).map((c) => ({ label: c.name, value: c.name }));
    if (fromFeatured.length > 0) return fromFeatured;
    return FEATURED_CIRCLE_SLUGS_ORDER.slice(0, 5).map((slug) => {
      const label = slug
        .split('-')
        .map((w) => (w.length ? w.charAt(0).toUpperCase() + w.slice(1) : ''))
        .join(' ');
      return { label, value: label };
    });
  }, [data?.featured]);

  if (isLoading && !data) return <LoadingState message="Loading Circles…" />;
  if (isError || !data) {
    return <ErrorState title="Couldn't load circles" onRetry={() => refetch()} />;
  }

  const renderCompactList = (
    list: Community[],
    emptyHint: string,
    discovery = false,
    activityFromTopics?: Map<string, string>,
  ) => {
    if (list.length === 0) {
      return (
        <View style={styles.emptyInline}>
          <Ionicons name="planet-outline" size={36} color={colors.dark.textMuted} />
          <Text style={styles.emptyText}>{emptyHint}</Text>
        </View>
      );
    }
    return list.map((c) => {
      const accent = getCircleAccent(c.slug, c.accentColor).color;
      const isJoined = joinedIds.has(c.id);
      const hint = activityFromTopics?.get(c.id) ?? null;
      return (
        <CircleCardCompact
          key={c.id}
          community={c}
          accent={accent}
          joined={isJoined}
          discovery={discovery}
          activityHint={hint}
          onPress={() => openCommunity(c)}
          onToggleJoin={() => toggleJoin(c.id)}
        />
      );
    });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerBrand}>
          <CirclesTabHeading onPress={resetCirclesHome} />
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
        ref={mainScrollRef}
        contentContainerStyle={[styles.scroll, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || (!!isFetching && !refreshing)}
            onRefresh={onRefresh}
            tintColor={colors.primary.teal}
            title={refreshing || isFetching ? 'Updating Circles…' : undefined}
            titleColor={colors.dark.textMuted}
          />
        }
      >
        {showFullLanding ? (
          <View style={styles.scopeRow}>
            <TouchableOpacity
              style={[styles.scopeChip, scope === 'discover' && styles.scopeChipOn]}
              onPress={() => setScope('discover')}
              accessibilityRole="tab"
              accessibilityState={{ selected: scope === 'discover' }}
            >
              <Ionicons
                name="compass-outline"
                size={16}
                color={scope === 'discover' ? colors.primary.teal : colors.dark.textMuted}
              />
              <Text style={[styles.scopeChipText, scope === 'discover' && styles.scopeChipTextOn]}>Discover</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.scopeChip, scope === 'yours' && styles.scopeChipOn]}
              onPress={() => setScope('yours')}
              accessibilityRole="tab"
              accessibilityState={{ selected: scope === 'yours' }}
            >
              <Ionicons
                name="people-outline"
                size={16}
                color={scope === 'yours' ? colors.primary.teal : colors.dark.textMuted}
              />
              <Text style={[styles.scopeChipText, scope === 'yours' && styles.scopeChipTextOn]}>Your circles</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.searchBackRow}
            onPress={resetCirclesHome}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Back to Circles home"
          >
            <Ionicons name="chevron-back" size={22} color={colors.primary.teal} />
            <Text style={styles.searchBackText}>Back to Circles</Text>
          </TouchableOpacity>
        )}

        <CircleSearchBar value={search} onChangeText={setSearch} />

        {showFullLanding && recentCircleSearches.length > 0 ? (
          <View style={styles.recentsWrap}>
            <View style={styles.recentsHeader}>
              <Text style={styles.recentsTitle}>Recent searches</Text>
              <TouchableOpacity
                onPress={onClearCircleSearchHistory}
                accessibilityRole="button"
                accessibilityLabel="Clear recent circle searches"
              >
                <Text style={styles.recentsClear}>Clear</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRowScroll}
            >
              {recentCircleSearches.map((q) => (
                <TouchableOpacity
                  key={q}
                  style={styles.searchChip}
                  onPress={() => setSearch(q)}
                  accessibilityRole="button"
                  accessibilityLabel={`Search ${q}`}
                >
                  <Text style={styles.searchChipText} numberOfLines={1}>
                    {q}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {!showFullLanding ? (
          <View style={styles.section}>
            <Text style={styles.sectionKicker}>Results</Text>
            <Text style={styles.sectionLede}>Directory matches vs discussions that mention your keywords.</Text>
            {searchGrouped ? (
              <>
                {searchDidYouMean &&
                (searchGrouped.directory.length > 0 || searchGrouped.fromDiscussions.length > 0) ? (
                  <View style={styles.didYouMeanBanner}>
                    <Text style={styles.didYouMeanText}>
                      No exact match for "{search.trim()}". Showing results for "{searchDidYouMean}".
                    </Text>
                  </View>
                ) : null}
                {searchGrouped.directory.length > 0 ? (
                  <View style={styles.searchBlock}>
                    <Text style={styles.searchBlockLabel}>Circles</Text>
                    {renderCompactList(searchGrouped.directory, '', false, activityByCircleId)}
                  </View>
                ) : null}
                {searchGrouped.fromDiscussions.length > 0 ? (
                  <View style={styles.searchBlock}>
                    <Text style={styles.searchBlockLabel}>Mentioned in discussions</Text>
                    {renderCompactList(searchGrouped.fromDiscussions, '', false, activityByCircleId)}
                  </View>
                ) : null}
                {searchGrouped.directory.length === 0 && searchGrouped.fromDiscussions.length === 0 ? (
                  <View style={styles.emptyInline}>
                    <Ionicons name="search-outline" size={36} color={colors.dark.textMuted} />
                    <Text style={styles.emptyText}>No circles match — try another keyword.</Text>
                    <Text style={styles.tryChipsLede}>Popular searches</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.chipRowScroll}
                    >
                      {discoveryFallbackChips.map((chip) => (
                        <TouchableOpacity
                          key={chip.label}
                          style={styles.searchChip}
                          onPress={() => setSearch(chip.value)}
                          accessibilityRole="button"
                          accessibilityLabel={`Search ${chip.label}`}
                        >
                          <Text style={styles.searchChipText}>{chip.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                ) : null}
              </>
            ) : (
              <View style={styles.emptyInline}>
                <Text style={styles.emptyText}>Searching…</Text>
              </View>
            )}
          </View>
        ) : scope === 'yours' ? (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionKicker}>Your circles</Text>
              <Text style={styles.sectionLede}>Rooms you’ve joined — jump back in anytime.</Text>
              {joinedCommunities.length === 0 ? (
                <View style={styles.emptyInline}>
                  <Ionicons name="people-outline" size={40} color={colors.dark.textMuted} />
                  <Text style={styles.emptyText}>You haven’t joined a circle yet. Switch to Discover to find your people.</Text>
                </View>
              ) : (
                renderCompactList(joinedCommunities, '', false, activityByCircleId)
              )}
            </View>
            {trending.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionKicker}>Trending now</Text>
                <Text style={styles.sectionLede}>Still catching heat across PulseVerse.</Text>
                <View style={styles.trendStack}>
                  {trending.map((t, i) => (
                    <TrendingTopicCard
                      key={t.id}
                      topic={t}
                      rank={(i + 1) as 1 | 2 | 3}
                      accent={colors.primary.teal}
                      onPress={() => {
                        if (t.postId) router.push(hrefPost(t.postId, t.circleSlug));
                        else if (t.threadId) router.push(hrefCommunityThread(t.circleSlug, t.threadId));
                        else router.push(hrefCommunity(t.circleSlug));
                      }}
                    />
                  ))}
                </View>
              </View>
            ) : null}
          </>
        ) : (
          <>
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.featuredTitle}>Featured Circles</Text>
                <TouchableOpacity
                  onPress={() => router.push('/circles-featured')}
                  hitSlop={8}
                  style={styles.seeAllHit}
                  accessibilityRole="button"
                  accessibilityLabel="See all featured circles"
                >
                  <Text style={styles.seeAll}>See all</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.sectionLede}>Explore Circles that match your interests.</Text>
              {featuredForScope.length === 0 ? (
                <View style={styles.emptyInline}>
                  <Text style={styles.emptyText}>
                    No featured circles right now — check back soon or explore New circles below.
                  </Text>
                </View>
              ) : (
                <ScrollView
                  ref={featuredScrollRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  decelerationRate="normal"
                  contentContainerStyle={styles.featuredScroll}
                >
                  {featuredForScope.map((c) => {
                    const accent = getCircleAccent(c.slug, c.accentColor).color;
                    return (
                      <CircleCardFeatured
                        key={c.id}
                        community={c}
                        accent={accent}
                        onPress={() => openCommunity(c)}
                      />
                    );
                  })}
                </ScrollView>
              )}
            </View>

            {trending.length > 0 ? (
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
                      onPress={() => {
                        if (t.postId) router.push(hrefPost(t.postId, t.circleSlug));
                        else if (t.threadId) router.push(hrefCommunityThread(t.circleSlug, t.threadId));
                        else router.push(hrefCommunity(t.circleSlug));
                      }}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionKicker}>New circles</Text>
              </View>
              <Text style={styles.sectionLede}>Fresh circles, added regularly for new ways to connect.</Text>
              {renderCompactList(
                newForScope,
                'Nothing new here yet — try Discover or search for a circle.',
                true,
                activityByCircleId,
              )}
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
    /** Stretch so the Circles lockup gets a real width (`width: '100%'` on the image). */
    alignItems: 'stretch',
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
  scopeRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: spacing.lg,
    marginBottom: 8,
  },
  scopeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 44,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.dark.borderSubtle,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  scopeChipOn: {
    borderColor: 'rgba(20,184,166,0.45)',
    backgroundColor: 'rgba(20,184,166,0.12)',
  },
  scopeChipText: { fontSize: 13, fontWeight: '700', color: colors.dark.textMuted },
  scopeChipTextOn: { color: colors.primary.teal, fontWeight: '800' },
  searchBackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.lg,
    marginBottom: 4,
    minHeight: touchTarget.min,
  },
  searchBackText: { fontSize: 16, fontWeight: '600', color: colors.primary.teal },
  searchBlock: { marginBottom: 16 },
  searchBlockLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.dark.textMuted,
    marginBottom: 8,
  },
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
  seeAllHit: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 4,
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
  recentsWrap: { paddingHorizontal: spacing.lg, marginBottom: 8 },
  recentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  recentsTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.dark.textMuted,
  },
  recentsClear: { fontSize: 13, fontWeight: '700', color: colors.primary.teal, paddingVertical: 6 },
  chipRowScroll: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingBottom: 4 },
  searchChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(20,184,166,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(20,184,166,0.35)',
    maxWidth: 220,
  },
  searchChipText: { fontSize: 13, fontWeight: '600', color: colors.primary.teal },
  didYouMeanBanner: {
    backgroundColor: 'rgba(20,184,166,0.08)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(20,184,166,0.22)',
  },
  didYouMeanText: { fontSize: 13, lineHeight: 18, color: colors.dark.textMuted },
  tryChipsLede: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.dark.textMuted,
    marginTop: 8,
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  emptyInline: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyText: { fontSize: 14, color: colors.dark.textMuted, textAlign: 'center' },
});
