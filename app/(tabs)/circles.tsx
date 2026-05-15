import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Keyboard,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, type ParamListBase } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useCirclesHome, useUnreadCount } from '@/hooks/useQueries';
import { usePersistedCommunityJoinToggle } from '@/hooks/usePersistedCommunityJoinToggle';
import { useAppStore } from '@/store/useAppStore';
import { circleContentService } from '@/services/circleContent';
import { communitiesService, circleThreadsDb } from '@/services/supabase';
import { CirclesTabHeading } from '@/components/circles/CirclesTabHeading';
import { CirclesCosmicBackdrop } from '@/components/circles/CirclesCosmicBackdrop';
import { JoinButton } from '@/components/circles/JoinButton';
import { CircleCardFeatured } from '@/components/circles/CircleCardFeatured';
import { RecentCircleConversationCard } from '@/components/circles/RecentCircleConversationCard';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { colors, touchTarget, spacing, pulseverse, pvKit, layout, tabBarScrollPaddingBottom } from '@/theme';
import { borderRadius } from '@/theme/spacing';
import { PVPageBackground } from '@/components/pv/PVPageBackground';
import { PVSegmentedTabs } from '@/components/pv/PVSegmentedTabs';
import { PVSearchBar } from '@/components/pv/PVSearchBar';
import { PVCircleCard } from '@/components/pv/PVCircleCard';
import { PVTrendingTopicCard } from '@/components/pv/PVTrendingTopicCard';
import { PVSectionHeader } from '@/components/pv/PVSectionHeader';
import { getCircleAccent } from '@/lib/circleAccents';
import {
  addRecentCircleSearch,
  clearRecentCircleSearches,
  getRecentCircleSearches,
} from '@/lib/circleExperience';
import { hrefCommunity, hrefCommunityThread, hrefCommunityWallPost, hrefPost } from '@/lib/communityRoutes';
import { prefetchCircleRoom } from '@/lib/communityCache';
import { useAuth } from '@/contexts/AuthContext';
import { addSearchQuery } from '@/lib/searchHistory';
import { FEATURED_CIRCLE_SLUGS_ORDER } from '@/constants/circleDiscovery';
import { formatCount, timeAgo } from '@/utils/format';
import type { Community } from '@/types';

type DiscoverScope = 'discover' | 'yours';

function compactDesc(s: string, max = 80) {
  const t = s.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).trim()}…`;
}

export default function CirclesScreen() {
  const router = useRouter();
  const { scope: scopeParam } = useLocalSearchParams<{ scope?: string }>();
  const navigation = useNavigation();
  const { width: windowWidth } = useWindowDimensions();
  const circlesTwinRowWidth = Math.max(240, Math.floor(windowWidth - spacing.lg * 2));
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data, isLoading, isError, refetch, isFetching } = useCirclesHome();
  const joinedIds = useAppStore((s) => s.joinedCommunityIds);
  const persistToggleJoin = usePersistedCommunityJoinToggle();
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

  const { data: recentInvolved = [], isLoading: recentInvolvedLoading } = useQuery({
    queryKey: ['circleThreads', 'recentInvolving', user?.id ?? ''],
    queryFn: () => circleThreadsDb.listRecentInvolvingUser(user!.id, 5),
    enabled: Boolean(user?.id),
    staleTime: 45_000,
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
    if (user?.id) {
      await queryClient.invalidateQueries({ queryKey: ['circleThreads', 'recentInvolving', user.id] });
    }
    setRefreshing(false);
  }, [refetch, queryClient, joinedIds.size, user?.id]);

  const onClearCircleSearchHistory = useCallback(() => {
    void clearRecentCircleSearches().then(() => setRecentCircleSearches([]));
  }, []);

  useFocusEffect(
    useCallback(() => {
      void queryClient.invalidateQueries({ queryKey: ['notifications', 'unread'] });
      void getRecentCircleSearches().then(setRecentCircleSearches);
      if (user?.id) {
        void queryClient.invalidateQueries({ queryKey: ['circleThreads', 'recentInvolving', user.id] });
      }
    }, [queryClient, user?.id]),
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
      prefetchCircleRoom(queryClient, c, user?.id ?? null);
      router.push(hrefCommunity(c.slug));
    },
    [queryClient, router, user?.id],
  );

  const featuredForScope = useMemo(() => {
    if (scope === 'yours') return featured.filter((c) => joinedIds.has(c.id));
    return featured;
  }, [featured, scope, joinedIds]);

  const newForScope = useMemo(() => {
    if (scope === 'yours') return newCircles.filter((c) => joinedIds.has(c.id));
    return newCircles;
  }, [newCircles, scope, joinedIds]);

  const newCirclesSpotlight = useMemo(() => newForScope.slice(0, 3), [newForScope]);

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
      const secondaryParts: string[] = [];
      if (typeof c.postCount === 'number' && c.postCount > 0) {
        secondaryParts.push(`${formatCount(c.postCount)} posts`);
      }
      if (typeof c.onlineCount === 'number' && c.onlineCount > 0) {
        secondaryParts.push(`${c.onlineCount} online`);
      }
      if (discovery) secondaryParts.push('explore');
      return (
        <PVCircleCard
          key={c.id}
          leading={<Text style={styles.compactEmoji}>{c.icon}</Text>}
          badge={
            discovery ? (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>New</Text>
              </View>
            ) : undefined
          }
          title={c.name}
          subtitle={compactDesc(c.description)}
          meta={`${formatCount(c.memberCount)} members`}
          metaSecondary={secondaryParts.length > 0 ? secondaryParts.join(' · ') : undefined}
          footerHint={hint ?? undefined}
          accent={accent}
          trailing={<JoinButton joined={isJoined} onToggle={() => void persistToggleJoin(c.id)} compact />}
          onPress={() => openCommunity(c)}
        />
      );
    });
  };

  return (
    <PVPageBackground>
      <View style={styles.pageInner}>
        <CirclesCosmicBackdrop />
        <View style={[styles.top, { paddingTop: insets.top + spacing.sm }]}>
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
          style={styles.mainScroll}
          contentContainerStyle={[
            styles.scroll,
            {
              paddingBottom: tabBarScrollPaddingBottom(insets.bottom),
              /** Scroll content shrink-wraps by default; without this, `%` widths on children collapse to intrinsic size. */
              minWidth: windowWidth,
            },
          ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || (!!isFetching && !refreshing)}
            onRefresh={onRefresh}
            tintColor={pulseverse.electric}
            title={refreshing || isFetching ? 'Updating Circles…' : undefined}
            titleColor={colors.dark.textMuted}
          />
        }
      >
        {showFullLanding ? (
          <View style={styles.scopeTabsShell}>
            <PVSegmentedTabs
              variant="twin"
              trackWidth={circlesTwinRowWidth}
              items={[
                { key: 'discover', label: 'Discover', icon: 'compass-outline' },
                { key: 'yours', label: 'Your circles', icon: 'people-outline' },
              ]}
              selected={scope}
              onSelect={(k) => setScope(k as DiscoverScope)}
            />
          </View>
        ) : (
          <TouchableOpacity
            style={styles.searchBackRow}
            onPress={resetCirclesHome}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Back to Circles home"
          >
            <Ionicons name="chevron-back" size={22} color={pulseverse.electric} />
            <Text style={styles.searchBackText}>Back to Circles</Text>
          </TouchableOpacity>
        )}

        <PVSearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search circles, circle posts, topics, keywords…"
          accessibilityLabel="Search circles and topics"
          style={styles.searchBar}
          endSlot={
            <>
              <View style={[styles.searchDivider, { backgroundColor: pvKit.circles.search.divider }]} />
              <TouchableOpacity
                onPress={() => router.push('/search')}
                hitSlop={12}
                style={styles.filterHit}
                accessibilityRole="button"
                accessibilityLabel="Search filters"
              >
                <Ionicons name="options-outline" size={22} color={pulseverse.electricSoft} />
              </TouchableOpacity>
            </>
          }
        />

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
            <PVSectionHeader
              title="Results"
              subtitle="Directory matches vs discussions that mention your keywords."
            />
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
              <PVSectionHeader title="Your circles" subtitle="Rooms you’ve joined — jump back in anytime." />
              {joinedCommunities.length === 0 ? (
                <View style={styles.emptyInline}>
                  <Ionicons name="people-outline" size={40} color={colors.dark.textMuted} />
                  <Text style={styles.emptyText}>You haven’t joined a circle yet. Switch to Discover to find your people.</Text>
                </View>
              ) : (
                renderCompactList(joinedCommunities, '', false, activityByCircleId)
              )}
            </View>
            {user?.id ? (
              <View style={styles.section}>
                <PVSectionHeader
                  title="Your conversations"
                  subtitle="Discussions you joined and circle wall posts you commented on — open returns you to that spot."
                />
                {recentInvolvedLoading && recentInvolved.length === 0 ? (
                  <View style={styles.emptyInline}>
                    <Text style={styles.emptyText}>Loading your conversations…</Text>
                  </View>
                ) : recentInvolved.length === 0 ? (
                  <View style={styles.emptyInline}>
                    <Ionicons name="chatbubbles-outline" size={40} color={colors.dark.textMuted} />
                    <Text style={styles.emptyText}>
                      No circle discussions yet. Join a room above and join a thread to see it here.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.trendStack}>
                    {recentInvolved.map((item) => {
                      const slug =
                        item.kind === 'thread' ? item.thread.circleSlug : item.communitySlug;
                      const accent = getCircleAccent(slug).color;
                      const key = item.kind === 'thread' ? `t-${item.thread.id}` : `p-${item.postId}`;
                      return (
                        <RecentCircleConversationCard
                          key={key}
                          item={item}
                          accent={accent}
                          onPress={() => {
                            if (item.kind === 'thread') {
                              if (item.thread.circleSlug) {
                                router.push(hrefCommunityThread(item.thread.circleSlug, item.thread.id));
                              }
                            } else {
                              router.push(hrefCommunityWallPost(item.communitySlug, item.postId));
                            }
                          }}
                        />
                      );
                    })}
                  </View>
                )}
              </View>
            ) : null}
          </>
        ) : (
          <>
            <View style={styles.section}>
              <PVSectionHeader
                title="Popular Circles"
                subtitle="Explore Circles that match your interests."
                rightSlot={
                  <TouchableOpacity
                    onPress={() => router.push('/circles-featured')}
                    hitSlop={8}
                    style={styles.seeAllHit}
                    accessibilityRole="button"
                    accessibilityLabel="See all circles, alphabetical list"
                  >
                    <Text style={styles.seeAll}>See all</Text>
                  </TouchableOpacity>
                }
              />
              {featuredForScope.length === 0 ? (
                <View style={styles.emptyInline}>
                  <Text style={styles.emptyText}>
                    No featured circles right now — try See all or New circles below.
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
                  {featuredForScope.map((c, carouselIndex_) => {
                    const accent = getCircleAccent(c.slug, c.accentColor).color;
                    return (
                      <CircleCardFeatured
                        key={c.id}
                        community={c}
                        accent={accent}
                        carouselIndex={carouselIndex_}
                        onPress={() => openCommunity(c)}
                      />
                    );
                  })}
                </ScrollView>
              )}
            </View>

            {trending.length > 0 ? (
              <View style={styles.section}>
                <PVSectionHeader
                  title="Trending topics"
                  subtitle="The top 3 most engaged conversations right now."
                />
                <View style={styles.trendStack}>
                  {trending.map((t, i) => {
                    const isPost = Boolean(t.postId);
                    const engagementLabel = isPost ? 'comments' : 'replies';
                    return (
                      <PVTrendingTopicCard
                        key={t.id}
                        topic={t.title}
                        topicMode="plain"
                        rank={(i + 1) as 1 | 2 | 3}
                        categoryLabel={t.circleName}
                        statLabel={`${formatCount(t.replyCount)} ${engagementLabel}`}
                        timeLabel={timeAgo(t.lastActiveAt)}
                        preview={t.preview}
                        accentColor={pulseverse.electric}
                        onPress={() => {
                          if (t.postId) router.push(hrefPost(t.postId, t.circleSlug));
                          else if (t.threadId) router.push(hrefCommunityThread(t.circleSlug, t.threadId));
                          else router.push(hrefCommunity(t.circleSlug));
                        }}
                      />
                    );
                  })}
                </View>
              </View>
            ) : null}

            <View style={styles.section}>
              <PVSectionHeader title="New circles" subtitle="The three newest spotlight rooms." />
              {renderCompactList(
                newCirclesSpotlight,
                'Nothing new here yet — try search or browse all circles.',
                true,
                activityByCircleId,
              )}
            </View>
          </>
        )}
        </ScrollView>
      </View>
    </PVPageBackground>
  );
}

const styles = StyleSheet.create({
  pageInner: { flex: 1, position: 'relative' },
  mainScroll: { flex: 1, zIndex: 1 },
  scroll: { paddingHorizontal: 0, alignItems: 'stretch', width: '100%' },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.sm + 2,
    gap: spacing.sm + 2,
    zIndex: 2,
  },
  headerBrand: {
    flex: 1,
    minHeight: 118,
    justifyContent: 'center',
    /** Stretch so the Circles lockup gets a real width (`width: '100%'` on the image). */
    alignItems: 'stretch',
    marginRight: spacing.sm,
    paddingRight: spacing.xs,
  },
  bellBtn: {
    width: touchTarget.min,
    height: touchTarget.min,
    borderRadius: 22,
    backgroundColor: pvKit.circles.chromeBell.fill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: pvKit.circles.chromeBell.border,
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
  bellDotText: { fontSize: 10, fontWeight: '800', color: pulseverse.onElectric },
  scopeTabsShell: {
    width: '100%',
    alignSelf: 'stretch',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    zIndex: 2,
  },
  searchBar: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },
  searchDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginVertical: 12,
    marginRight: 6,
  },
  filterHit: { padding: 6, borderRadius: 12 },
  compactEmoji: { fontSize: 28, lineHeight: 32 },
  newBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(34,211,238,0.55)',
    backgroundColor: 'rgba(34,211,238,0.12)',
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: pulseverse.electricSoft,
    letterSpacing: 1,
  },
  searchBackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
    minHeight: touchTarget.min,
  },
  searchBackText: { fontSize: 16, fontWeight: '600', color: pulseverse.electric },
  searchBlock: { marginBottom: spacing.lg },
  searchBlockLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.dark.textMuted,
    marginBottom: spacing.sm,
  },
  section: { marginBottom: pvKit.circles.sectionGap, paddingHorizontal: spacing.lg },
  seeAll: {
    fontSize: 14,
    fontWeight: '700',
    color: pulseverse.electric,
  },
  seeAllHit: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 4,
  },
  featuredScroll: {
    gap: pvKit.circles.carouselGap,
    paddingBottom: spacing.sm + 2,
    paddingLeft: spacing.xs / 2,
    paddingRight: spacing.xl,
  },
  trendStack: { gap: spacing.lg },
  recentsWrap: { paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  recentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  recentsTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.dark.textMuted,
  },
  recentsClear: { fontSize: 13, fontWeight: '700', color: pulseverse.electric, paddingVertical: 6 },
  chipRowScroll: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', paddingBottom: spacing.xs },
  searchChip: {
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm + 2,
    borderRadius: 20,
    backgroundColor: 'rgba(34,211,238,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.38)',
    maxWidth: 220,
  },
  searchChipText: { fontSize: 13, fontWeight: '600', color: pulseverse.electricSoft },
  didYouMeanBanner: {
    backgroundColor: 'rgba(34,211,238,0.08)',
    borderRadius: borderRadius.md + 2,
    padding: spacing.md + 2,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.22)',
  },
  didYouMeanText: { fontSize: 13, lineHeight: 18, color: colors.dark.textMuted },
  tryChipsLede: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.dark.textMuted,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    alignSelf: 'flex-start',
  },
  emptyInline: { alignItems: 'center', paddingVertical: spacing['3xl'], gap: spacing.sm },
  emptyText: { fontSize: 14, color: colors.dark.textMuted, textAlign: 'center' },
});
