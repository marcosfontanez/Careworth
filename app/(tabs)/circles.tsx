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
import { useJoinedCircleActivityBadges } from '@/hooks/useCircleQueries';
import { usePersistedCommunityJoinToggle } from '@/hooks/usePersistedCommunityJoinToggle';
import { useAppStore } from '@/store/useAppStore';
import { circleContentService } from '@/services/circleContent';
import { communitiesService, circleThreadsDb } from '@/services/supabase';
import { CirclesTabHeading } from '@/components/circles/CirclesTabHeading';
import { CirclesCosmicBackdrop } from '@/components/circles/CirclesCosmicBackdrop';
import { JoinButton } from '@/components/circles/JoinButton';
import { CircleCardFeatured } from '@/components/circles/CircleCardFeatured';
import { RecentCircleConversationCard } from '@/components/circles/RecentCircleConversationCard';
import { CircleJoinedSkeleton } from '@/components/circles/CircleJoinedSkeleton';
import { CircleActivityBadgePill } from '@/components/circles/CircleActivityBadgePill';
import { pickCircleActivityBadge } from '@/lib/circleActivityBadges';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useToast } from '@/components/ui/Toast';
import { colors, touchTarget, spacing, pulseverse, pvKit, layout, tabBarScrollPaddingBottom, rhythm } from '@/theme';
import { borderRadius } from '@/theme/spacing';
import { useBorderGovernorScreenFocus } from '@/hooks/useBorderGovernorScreenFocus';
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
import { hrefPost } from '@/lib/communityRoutes';
import { pushPostViewer } from '@/lib/postViewerRoute';
import { navigateToCircleRoom, navigateToCircleThread, navigateToCircleWallPost } from '@/lib/communityCache';
import { hydrateJoinedCommunitiesFromServer } from '@/lib/hydrateJoinedCommunities';
import { useAuth } from '@/contexts/AuthContext';
import { addSearchQuery } from '@/lib/searchHistory';
import { FEATURED_CIRCLE_SLUGS_ORDER } from '@/constants/circleDiscovery';
import { normalizeCommunitySlug } from '@/lib/communitySlug';
import { circleRoomDiag } from '@/lib/circleRoomDiag';
import { formatCount, timeAgo } from '@/utils/format';
import type { Community, CircleActivityBadgeRow } from '@/types';

type DiscoverScope = 'discover' | 'yours';

function compactDesc(s: string, max = 80) {
  const t = s.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).trim()}…`;
}

export default function CirclesScreen() {
  useBorderGovernorScreenFocus();
  const router = useRouter();
  const { scope: scopeParam } = useLocalSearchParams<{ scope?: string }>();
  const navigation = useNavigation();
  const { width: windowWidth } = useWindowDimensions();
  const circlesTwinRowWidth = Math.max(240, Math.floor(windowWidth - spacing.lg * 2));
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const toast = useToast();
  const { data, isLoading, isError, refetch, isFetching } = useCirclesHome();
  const joinedIds = useAppStore((s) => s.joinedCommunityIds);
  const persistToggleJoin = usePersistedCommunityJoinToggle();
  const [search, setSearch] = useState('');
  const [searchGrouped, setSearchGrouped] = useState<{
    directory: Community[];
    fromDiscussions: Community[];
  } | null>(null);
  const [searchDidYouMean, setSearchDidYouMean] = useState<string | null>(null);
  const [searchFailed, setSearchFailed] = useState(false);
  const [recentCircleSearches, setRecentCircleSearches] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [scope, setScope] = useState<DiscoverScope>('discover');
  const mainScrollRef = useRef<ScrollView>(null);
  const featuredScrollRef = useRef<ScrollView>(null);

  const joinedIdsKey = useMemo(() => [...joinedIds].sort().join(','), [joinedIds]);
  const joinedIdList = useMemo(() => [...joinedIds], [joinedIds]);

  const { data: joinedCommunities = [], isLoading: joinedLoading } = useQuery({
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
    queryFn: () => circleThreadsDb.listRecentInvolvingUser(user!.id, 6),
    enabled: Boolean(user?.id),
    staleTime: 45_000,
  });

  const { data: newRepliesOnYourThreads = [] } = useQuery({
    queryKey: ['circleThreads', 'newRepliesOnYours', user?.id ?? ''],
    queryFn: () => circleThreadsDb.listNewRepliesOnUserThreads(user!.id, 6),
    enabled: Boolean(user?.id),
    staleTime: 45_000,
  });

  const { data: unansweredQuestions = [] } = useQuery({
    queryKey: ['circleThreads', 'unanswered', joinedIdsKey],
    queryFn: () => circleThreadsDb.listUnansweredQuestionsInCommunities(joinedIdList, 8),
    enabled: joinedIdList.length > 0,
    staleTime: 60_000,
  });

  const forYouQueryKey = [
    'circles',
    'forYou',
    profile?.audienceRole ?? '',
    (profile?.interests ?? []).slice().sort().join(','),
  ] as const;

  const { data: forYouCircles = [] } = useQuery({
    queryKey: forYouQueryKey,
    queryFn: () =>
      circleContentService.getOnboardingSuggestedCircles({
        audienceRole: profile?.audienceRole ?? null,
        interests: profile?.interests ?? [],
        limit: 6,
      }),
    enabled: Boolean(profile?.audienceRole || (profile?.interests?.length ?? 0) > 0),
    staleTime: 120_000,
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
      try {
        await hydrateJoinedCommunitiesFromServer(user.id);
        await queryClient.invalidateQueries({ queryKey: ['communities', 'joinedDetail'] });
      } catch {
        /* pull-to-refresh still reloads catalog */
      }
    }
    if (user?.id) {
      await queryClient.invalidateQueries({ queryKey: ['circleThreads', 'recentInvolving', user.id] });
      await queryClient.invalidateQueries({ queryKey: ['circleThreads', 'newRepliesOnYours', user.id] });
    }
    if (joinedIds.size > 0) {
      await queryClient.invalidateQueries({ queryKey: ['circleThreads', 'unanswered'] });
      await queryClient.invalidateQueries({ queryKey: ['circles', 'joinedActivityBadges'] });
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
        void hydrateJoinedCommunitiesFromServer(user.id)
          .then(() => {
            void queryClient.invalidateQueries({ queryKey: ['communities', 'joinedDetail'] });
          })
          .catch(() => {
            /* non-fatal — list stays on last known server snapshot */
          });
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
      setSearchFailed(false);
      return;
    }
    let alive = true;
    const t = setTimeout(() => {
      void circleContentService
        .searchCirclesAndTopicsGrouped(q)
        .then((g) => {
          if (!alive) return;
          if (g.failed) {
            setSearchGrouped(null);
            setSearchDidYouMean(null);
            setSearchFailed(true);
            toast.show('Circle search is temporarily unavailable. Try again.', 'error');
            return;
          }
          setSearchFailed(false);
          setSearchGrouped({
            directory: g.directory,
            fromDiscussions: g.fromDiscussions,
          });
          setSearchDidYouMean(g.didYouMean ?? null);
          void addRecentCircleSearch(q);
          void addSearchQuery(q);
          void getRecentCircleSearches().then(setRecentCircleSearches);
        })
        .catch(() => {
          if (!alive) return;
          setSearchGrouped(null);
          setSearchDidYouMean(null);
          setSearchFailed(true);
          toast.show('Circle search failed. Check your connection.', 'error');
        });
    }, 420);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [search, toast]);

  const featured = data?.featured ?? [];
  const allTrending = data?.trending ?? [];
  const trending = allTrending.slice(0, 3);
  const newCircles = data?.newCircles ?? [];

  const showFullLanding = !search.trim();
  const { data: notificationUnread } = useUnreadCount();
  const bellCount = notificationUnread ?? 0;

  /** Must run before any conditional return — hooks cannot follow early returns. */
  const hotInJoinedCircles = useMemo(
    () => allTrending.filter((t) => joinedIds.has(t.circleId)).slice(0, 5),
    [allTrending, joinedIds],
  );

  const recentlyActiveJoined = useMemo(
    () =>
      [...joinedCommunities]
        .sort(
          (a, b) =>
            (b.onlineCount ?? 0) - (a.onlineCount ?? 0) ||
            (b.postCount ?? 0) - (a.postCount ?? 0),
        )
        .slice(0, 5),
    [joinedCommunities],
  );

  const joinedLoadingSkeleton = joinedIds.size > 0 && joinedLoading && joinedCommunities.length === 0;

  const hotCircleIdSet = useMemo(
    () => new Set(allTrending.filter((t) => joinedIds.has(t.circleId)).map((t) => t.circleId)),
    [allTrending, joinedIds],
  );

  const { data: activityBadgeMap } = useJoinedCircleActivityBadges(joinedIdList, hotCircleIdSet);

  const activityByCircleId = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of trending) {
      if (!m.has(t.circleId)) m.set(t.circleId, `Hot topic · ${timeAgo(t.lastActiveAt)}`);
    }
    return m;
  }, [trending]);

  const openCommunity = useCallback(
    (c: Community) => {
      circleRoomDiag('circlesTab:openCommunity', {
        slug: normalizeCommunitySlug(c.slug),
        id: c.id,
        name: c.name,
      });
      void navigateToCircleRoom(router, queryClient, c, user?.id ?? null, {
        source: 'circlesTab:card',
      });
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
    badgeMap?: Map<string, CircleActivityBadgeRow>,
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
      const badgeLabel = badgeMap?.get(c.id) ? pickCircleActivityBadge(badgeMap.get(c.id)!) : null;
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
            badgeLabel ? (
              <CircleActivityBadgePill label={badgeLabel} />
            ) : discovery ? (
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
                <Ionicons name="search-outline" size={36} color={colors.dark.textMuted} />
                <Text style={styles.emptyText}>
                  {searchFailed
                    ? 'Search failed — pull to refresh or try again.'
                    : 'Searching…'}
                </Text>
              </View>
            )}
          </View>
        ) : scope === 'yours' ? (
          <>
            {user?.id && recentInvolved.length > 0 ? (
              <View style={styles.section}>
                <PVSectionHeader
                  title="Continue conversations"
                  subtitle="Threads and wall posts you touched — pick up where you left off."
                />
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
                              void navigateToCircleThread(
                                router,
                                queryClient,
                                item.thread.circleSlug,
                                item.thread.id,
                                user?.id ?? null,
                                'circlesTab:recentThread',
                              );
                            }
                          } else {
                            void navigateToCircleWallPost(
                              router,
                              queryClient,
                              item.communitySlug,
                              item.postId,
                              user?.id ?? null,
                              'circlesTab:recentPost',
                            );
                          }
                        }}
                      />
                    );
                  })}
                </View>
              </View>
            ) : user?.id && recentInvolvedLoading ? (
              <View style={styles.section}>
                <PVSectionHeader title="Continue conversations" subtitle="Loading your activity…" />
                <CircleJoinedSkeleton count={2} />
              </View>
            ) : null}

            {user?.id && newRepliesOnYourThreads.length > 0 ? (
              <View style={styles.section}>
                <PVSectionHeader
                  title="New replies to you"
                  subtitle="Someone responded to your discussion."
                />
                <View style={styles.trendStack}>
                  {newRepliesOnYourThreads.map((r) => {
                    const accent = getCircleAccent(r.circleSlug).color;
                    return (
                      <TouchableOpacity
                        key={r.replyId}
                        style={[styles.replyCard, { borderLeftColor: accent }]}
                        onPress={() =>
                          void navigateToCircleThread(
                            router,
                            queryClient,
                            r.circleSlug,
                            r.threadId,
                            user.id,
                            'circlesTab:newReply',
                          )
                        }
                        activeOpacity={0.85}
                      >
                        <Text style={styles.replyCardTitle} numberOfLines={1}>
                          {r.threadTitle}
                        </Text>
                        <Text style={styles.replyCardPreview} numberOfLines={2}>
                          {r.bodyPreview}
                        </Text>
                        <Text style={styles.replyCardMeta}>
                          {r.circleName ?? r.circleSlug} · {timeAgo(r.createdAt)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {hotInJoinedCircles.length > 0 ? (
              <View style={styles.section}>
                <PVSectionHeader
                  title="Hot today in your circles"
                  subtitle="Trending discussions in rooms you’ve joined."
                />
                <View style={styles.trendStack}>
                  {hotInJoinedCircles.map((t) => (
                    <PVTrendingTopicCard
                      key={t.id}
                      topic={t.title}
                      topicMode="plain"
                      categoryLabel={t.circleName}
                      statLabel={`${formatCount(t.replyCount)} replies`}
                      timeLabel={timeAgo(t.lastActiveAt)}
                      preview={t.preview}
                      accentColor={getCircleAccent(t.circleSlug).color}
                      onPress={() => {
                        if (t.threadId) {
                          void navigateToCircleThread(
                            router,
                            queryClient,
                            t.circleSlug,
                            t.threadId,
                            user?.id ?? null,
                            'circlesTab:hotJoined',
                          );
                        } else if (t.postId) {
                          void pushPostViewer(router, t.postId, {
                            viewerId: user?.id ?? null,
                            circle: t.circleSlug,
                          });
                        } else {
                          void navigateToCircleRoom(
                            router,
                            queryClient,
                            { slug: t.circleSlug },
                            user?.id ?? null,
                            { source: 'circlesTab:hotJoined' },
                          );
                        }
                      }}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            {unansweredQuestions.length > 0 ? (
              <View style={styles.section}>
                <PVSectionHeader
                  title="Unanswered questions"
                  subtitle="Open questions in your circles — jump in and help."
                />
                <View style={styles.trendStack}>
                  {unansweredQuestions.slice(0, 6).map((t) => (
                    <TouchableOpacity
                      key={t.id}
                      style={[
                        styles.replyCard,
                        { borderLeftColor: getCircleAccent(t.circleSlug).color },
                      ]}
                      onPress={() =>
                        void navigateToCircleThread(
                          router,
                          queryClient,
                          t.circleSlug,
                          t.id,
                          user?.id ?? null,
                          'circlesTab:unanswered',
                        )
                      }
                      activeOpacity={0.85}
                    >
                      <Text style={styles.replyCardTitle} numberOfLines={2}>
                        {t.title}
                      </Text>
                      <Text style={styles.replyCardMeta}>
                        {t.circleName ?? t.circleSlug} · {timeAgo(t.createdAt)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null}

            {recentlyActiveJoined.length > 0 && joinedCommunities.length > 1 ? (
              <View style={styles.section}>
                <PVSectionHeader
                  title="Recently active circles"
                  subtitle="Rooms with members online or fresh posts."
                />
                {renderCompactList(recentlyActiveJoined, '', false, activityByCircleId, activityBadgeMap)}
              </View>
            ) : null}

            <View style={styles.section}>
              <PVSectionHeader title="Your joined circles" subtitle="All rooms you’re in — jump back anytime." />
              {joinedLoadingSkeleton ? (
                <CircleJoinedSkeleton count={3} />
              ) : joinedCommunities.length === 0 ? (
                <View style={styles.emptyInline}>
                  <Ionicons name="people-outline" size={40} color={colors.dark.textMuted} />
                  <Text style={styles.emptyText}>
                    You haven’t joined a circle yet. Switch to Discover to find your people.
                  </Text>
                </View>
              ) : (
                renderCompactList(joinedCommunities, '', false, activityByCircleId, activityBadgeMap)
              )}
            </View>
          </>
        ) : (
          <>
            {scope === 'discover' && forYouCircles.length > 0 ? (
              <View style={styles.section}>
                <PVSectionHeader
                  title="For you"
                  subtitle="Circles picked from your onboarding interests."
                />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  decelerationRate="normal"
                  contentContainerStyle={styles.featuredScroll}
                >
                  {forYouCircles.map((c, carouselIndex_) => {
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
              </View>
            ) : null}

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
                          if (t.postId) {
                            void pushPostViewer(router, t.postId, {
                              viewerId: user?.id ?? null,
                              circle: t.circleSlug,
                            });
                          } else if (t.threadId) {
                            void navigateToCircleThread(
                              router,
                              queryClient,
                              t.circleSlug,
                              t.threadId,
                              user?.id ?? null,
                              'circlesTab:trendingThread',
                            );
                          } else {
                            void navigateToCircleRoom(
                              router,
                              queryClient,
                              { slug: t.circleSlug },
                              user?.id ?? null,
                              { source: 'circlesTab:trendingCircle' },
                            );
                          }
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
    gap: rhythm.cardGap,
    paddingBottom: spacing.sm + 2,
    paddingLeft: spacing.xs / 2,
    paddingRight: spacing.xl,
  },
  trendStack: { gap: rhythm.cardGap },
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
  emptyInline: {
    alignItems: 'center',
    paddingVertical: rhythm.myPulseEmptyPaddingVertical,
    gap: spacing.sm,
    minHeight: rhythm.cardMinHeightLarge * 2,
  },
  emptyText: { fontSize: 14, color: colors.dark.textMuted, textAlign: 'center' },
  replyCard: {
    padding: rhythm.cardPaddingMedium,
    borderRadius: rhythm.cardRadius,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderLeftWidth: 3,
    gap: 4,
    minHeight: rhythm.circleConversationMinHeight,
  },
  replyCardTitle: { fontSize: 15, fontWeight: '700', color: colors.dark.text, lineHeight: 20, minHeight: 40 },
  replyCardPreview: { fontSize: 13, lineHeight: 18, color: colors.dark.textSecondary, minHeight: 18 },
  replyCardMeta: { fontSize: 12, color: colors.dark.textMuted, marginTop: 4, minHeight: 16 },
});
