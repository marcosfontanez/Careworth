import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { SearchBar } from '@/components/ui/SearchBar';
import { LoadingState } from '@/components/ui/LoadingState';
import { FilterChips } from '@/components/ui/FilterChips';
import { CommunityCard } from '@/components/cards/CommunityCard';
import { SoundPreviewBadge } from '@/components/ui/SoundPreviewBadge';
import { audioPreview } from '@/lib/audioPreview';
import { colors, iconSize, layout, spacing, typography } from '@/theme';
import { useAppStore } from '@/store/useAppStore';
import { formatCount } from '@/utils/format';
import { profileHandleDisplay } from '@/utils/profileHandle';
import { RoleBadge } from '@/components/ui/RoleBadge';
import { PulseTierBadge } from '@/components/badges/PulseTierBadge';
import { profilesService, communitiesService, postsService } from '@/services/supabase';
import { analytics } from '@/lib/analytics';
import { getSearchHistory, addSearchQuery, removeSearchQuery, clearSearchHistory } from '@/lib/searchHistory';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { UserProfile, Community, SoundLibraryRow, ViralSoundRow } from '@/types';

const SEARCH_TABS = ['All', 'Creators', 'Communities', 'Hashtags', 'Sounds', 'Viral Songs'] as const;
type SearchTab = (typeof SEARCH_TABS)[number];

type ListItem =
  | { type: 'creator'; data: UserProfile }
  | { type: 'community'; data: Community }
  | { type: 'hashtag'; data: string }
  | { type: 'sound'; data: SoundLibraryRow }
  | { type: 'viral'; data: ViralSoundRow; rank: number };

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string }>();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState(params.q ?? '');
  const [tab, setTab] = useState<SearchTab>(() =>
    params.q?.startsWith('#') ? 'Hashtags' : 'All',
  );
  const toggleJoinCommunity = useAppStore((s) => s.toggleJoinCommunity);
  const joinedIds = useAppStore((s) => s.joinedCommunityIds);
  const followedCreatorIds = useAppStore((s) => s.followedCreatorIds);
  const debouncedQuery = useDebouncedValue(query, 400);

  const [liveCreators, setLiveCreators] = useState<UserProfile[]>([]);
  const [liveCommunities, setLiveCommunities] = useState<Community[]>([]);
  const [liveHashtags, setLiveHashtags] = useState<string[]>([]);
  const [liveSounds, setLiveSounds] = useState<SoundLibraryRow[]>([]);
  const [viralSounds, setViralSounds] = useState<ViralSoundRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    void getSearchHistory().then(setHistory);
    const raw = params.q;
    const q0 = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : '';
    if (q0?.trim()) setQuery(q0.trim());
  }, []);

  /**
   * Tear down any in-flight sound preview when the search modal closes,
   * otherwise audio would keep playing in the background while the user
   * scrolls the feed.
   */
  useEffect(() => {
    return () => {
      void audioPreview.stop();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (tab === 'Viral Songs') {
        setSearching(true);
        setHasSearched(true);
        try {
          const filter = query.trim().length >= 2 ? query.trim() : undefined;
          const v = await postsService.getViralSoundsThisWeek({ limit: 10, titleFilter: filter });
          if (!cancelled) {
            if (v.length === 0) {
              /**
               * No remixes exist yet (new app / quiet week). Fall back to the
               * sound library so the tab isn't empty — these are sounds users
               * could pick to remix today.
               */
              const fallback = await postsService.searchSoundLibrary('', 10);
              if (!cancelled) {
                setViralSounds(
                  fallback.map((s) => ({
                    postId: s.postId,
                    soundTitle: s.soundTitle,
                    remixCount7d: s.remixCount,
                    mediaUrl: s.mediaUrl,
                    thumbnailUrl: s.thumbnailUrl,
                    creatorId: s.creatorId,
                    creatorDisplayName: s.creatorDisplayName,
                    creatorAvatarUrl: s.creatorAvatarUrl,
                  })),
                );
              }
            } else {
              setViralSounds(v);
            }
          }
        } finally {
          if (!cancelled) setSearching(false);
        }
        return;
      }

      const t = debouncedQuery.trim();
      const browseAll = t.length === 0;

      /**
       * Browse-all default for tabs whose RPCs don't strictly require a query
       * (Sounds, Creators). The previous behaviour was to short-circuit and
       * show "Type at least 2 characters", which made the tabs feel broken.
       */
      if (browseAll) {
        setSearching(true);
        setHasSearched(true);
        try {
          if (tab === 'Creators' || tab === 'All') {
            const creators = await profilesService.getPopularCreators(20);
            if (!cancelled) setLiveCreators(creators);
          } else if (!cancelled) setLiveCreators([]);

          if (tab === 'Sounds' || tab === 'All') {
            const sounds = await postsService.searchSoundLibrary('', 25);
            if (!cancelled) setLiveSounds(sounds);
          } else if (!cancelled) setLiveSounds([]);

          if (!cancelled) {
            setLiveCommunities([]);
            setLiveHashtags([]);
            setHasSearched(false);
          }
        } finally {
          if (!cancelled) setSearching(false);
        }
        return;
      }

      if (t.length < 2) {
        if (!cancelled) {
          setLiveCreators([]);
          setLiveCommunities([]);
          setLiveHashtags([]);
          setLiveSounds([]);
          setSearching(false);
        }
        return;
      }

      setSearching(true);
      setHasSearched(true);
      try {
        const tasks: Promise<void>[] = [];

        if (tab === 'All' || tab === 'Creators') {
          tasks.push(
            profilesService.search(t).then((c) => {
              if (!cancelled) setLiveCreators(c);
            }),
          );
        } else if (!cancelled) setLiveCreators([]);

        if (tab === 'All' || tab === 'Communities') {
          tasks.push(
            communitiesService.search(t).then((c) => {
              if (!cancelled) setLiveCommunities(c);
            }),
          );
        } else if (!cancelled) setLiveCommunities([]);

        if (tab === 'All' || tab === 'Hashtags') {
          tasks.push(
            postsService.searchHashtags(t, 50).then((h) => {
              if (!cancelled) setLiveHashtags(h);
            }),
          );
        } else if (!cancelled) setLiveHashtags([]);

        if (tab === 'All' || tab === 'Sounds') {
          tasks.push(
            postsService.searchSoundLibrary(t, 25).then((s) => {
              if (!cancelled) setLiveSounds(s);
            }),
          );
        } else if (!cancelled) setLiveSounds([]);

        await Promise.all(tasks);
        if (!cancelled) {
          void addSearchQuery(t).then(() => getSearchHistory().then(setHistory));
          analytics.track('search_performed', { query: t, tab });
        }
      } catch {
        /* individual services already catch where needed */
      } finally {
        if (!cancelled) setSearching(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [tab, query, debouncedQuery]);

  const trimmed = query.trim();
  const showMinLengthHint = tab !== 'Viral Songs' && trimmed.length === 1;
  /** When browsing without a query, we still want to render the result list so the user sees the default content. */
  const showHistoryView = !trimmed && tab !== 'Viral Songs' && tab !== 'Sounds' && tab !== 'Creators' && tab !== 'All';

  const sortedCreators = useMemo(() => {
    const list = [...liveCreators];
    list.sort((a, b) => {
      const fa = followedCreatorIds.has(a.id);
      const fb = followedCreatorIds.has(b.id);
      if (fa === fb) return 0;
      return fa ? -1 : 1;
    });
    return list;
  }, [liveCreators, followedCreatorIds]);

  const listData: ListItem[] = useMemo(() => {
    if (tab === 'Viral Songs') {
      return viralSounds.map((v, i) => ({ type: 'viral' as const, data: v, rank: i + 1 }));
    }
    return [
      ...(tab === 'All' || tab === 'Creators' ? sortedCreators.map((c) => ({ type: 'creator' as const, data: c })) : []),
      ...(tab === 'All' || tab === 'Communities'
        ? liveCommunities.map((c) => ({ type: 'community' as const, data: c }))
        : []),
      ...(tab === 'All' || tab === 'Hashtags' ? liveHashtags.map((h) => ({ type: 'hashtag' as const, data: h })) : []),
      ...(tab === 'All' || tab === 'Sounds' ? liveSounds.map((s) => ({ type: 'sound' as const, data: s })) : []),
    ];
  }, [tab, sortedCreators, liveCommunities, liveHashtags, liveSounds, viralSounds]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/feed'))}
          activeOpacity={0.7}
          hitSlop={12}
        >
          <Ionicons name="arrow-back" size={iconSize.lg} color={colors.dark.text} />
        </TouchableOpacity>
        <View style={styles.searchWrap}>
          <SearchBar
            value={query}
            onChangeText={setQuery}
            placeholder={
              tab === 'Viral Songs'
                ? 'Filter chart by title (optional)…'
                : 'Search creators, circles, tags, sounds…'
            }
          />
        </View>
      </View>

      <View style={styles.filterWrap}>
        <FilterChips options={[...SEARCH_TABS]} selected={tab} onSelect={(v) => setTab(v as SearchTab)} />
      </View>

      {tab === 'Viral Songs' ? (
        <Text style={styles.chartHint}>
          Top sounds by new clips using them in the last 7 days (same idea as TikTok’s weekly velocity chart).
        </Text>
      ) : null}

      {showHistoryView ? (
        history.length > 0 ? (
          <View style={styles.historyWrap}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>Recent Searches</Text>
              <TouchableOpacity
                onPress={async () => {
                  await clearSearchHistory();
                  setHistory([]);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.clearText}>Clear All</Text>
              </TouchableOpacity>
            </View>
            {history.map((item) => (
              <View key={item} style={styles.historyRow}>
                <TouchableOpacity
                  style={styles.historyItem}
                  onPress={() => setQuery(item)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="time-outline" size={18} color={colors.dark.textMuted} />
                  <Text style={styles.historyText}>{item}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={async () => {
                    await removeSearchQuery(item);
                    setHistory((prev) => prev.filter((h) => h !== item));
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={iconSize.sm} color={colors.dark.textMuted} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyCenter}>
            <Ionicons name="search" size={48} color={colors.dark.textMuted} />
            <Text style={styles.emptyText}>
              Search creators, circles, hashtags, or sounds — or open Viral Songs for this week’s chart.
            </Text>
          </View>
        )
      ) : showMinLengthHint ? (
        <View style={styles.emptyCenter}>
          <Text style={styles.emptyText}>Type at least 2 characters to search.</Text>
        </View>
      ) : searching ? (
        <LoadingState />
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item, i) => {
            if (item.type === 'creator') return `c-${item.data.id}`;
            if (item.type === 'community') return `co-${item.data.id}`;
            if (item.type === 'hashtag') return `h-${item.data}-${i}`;
            if (item.type === 'sound') return `s-${item.data.postId}`;
            return `v-${item.data.postId}`;
          }}
          renderItem={({ item }) => {
            if (item.type === 'creator') {
              const user = item.data;
              return (
                <TouchableOpacity
                  style={styles.creatorRow}
                  onPress={() => router.push(`/profile/${user.id}`)}
                  activeOpacity={0.7}
                >
                  <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
                  <View style={styles.creatorBody}>
                    <View style={styles.creatorNameRow}>
                      <Text style={styles.creatorName} numberOfLines={1}>
                        {profileHandleDisplay(user)}
                      </Text>
                      {user.isVerified ? (
                        <Ionicons name="checkmark-circle" size={14} color={colors.primary.teal} />
                      ) : null}
                    </View>
                    <Text style={styles.creatorDisplay} numberOfLines={1}>
                      {user.displayName}
                    </Text>
                    <Text style={styles.creatorMeta}>
                      {user.role} · {user.specialty} · {formatCount(user.followerCount)} followers
                    </Text>
                    {user.pulseTier && user.pulseTier !== 'murmur' ? (
                      <View style={styles.creatorTierRow}>
                        <PulseTierBadge
                          tier={user.pulseTier}
                          score={user.pulseScoreCurrent}
                          size="xs"
                          hideMurmur
                        />
                      </View>
                    ) : null}
                  </View>
                  <RoleBadge role={user.role} />
                </TouchableOpacity>
              );
            }
            if (item.type === 'community') {
              const community = item.data;
              return (
                <View style={styles.cardWrap}>
                  <CommunityCard
                    community={{ ...community, isJoined: joinedIds.has(community.id) }}
                    onPress={() => router.push(`/communities/${community.slug}`)}
                    onJoin={() => toggleJoinCommunity(community.id)}
                  />
                </View>
              );
            }
            if (item.type === 'hashtag') {
              const tag = item.data;
              return (
                <TouchableOpacity
                  style={styles.hashtagRow}
                  activeOpacity={0.7}
                  onPress={() => router.push(`/hashtag/${encodeURIComponent(tag)}`)}
                >
                  <View style={styles.hashIcon}>
                    <Text style={styles.hashSymbol}>#</Text>
                  </View>
                  <View style={styles.hashTextCol}>
                    <Text style={styles.hashText}>{tag}</Text>
                    <Text style={styles.hashMeta}>Open posts with this tag</Text>
                  </View>
                  <Ionicons name="trending-up" size={iconSize.sm} color={colors.primary.teal} />
                </TouchableOpacity>
              );
            }
            if (item.type === 'sound') {
              const s = item.data;
              const thumb = s.thumbnailUrl || s.mediaUrl;
              return (
                <TouchableOpacity
                  style={styles.soundRow}
                  onPress={() => router.push(`/sound/${encodeURIComponent(s.postId)}`)}
                  activeOpacity={0.7}
                >
                  <View style={styles.soundThumbWrap}>
                    {thumb ? (
                      <Image source={{ uri: thumb }} style={styles.soundThumb} contentFit="cover" />
                    ) : (
                      <View style={[styles.soundThumb, styles.soundThumbPh]}>
                        <Ionicons name="musical-notes" size={22} color={colors.dark.textMuted} />
                      </View>
                    )}
                    <SoundPreviewBadge id={s.postId} url={s.mediaUrl} style={styles.previewBadgePos} />
                  </View>
                  <View style={styles.soundBody}>
                    <Text style={styles.soundTitle} numberOfLines={2}>
                      {s.soundTitle}
                    </Text>
                    <Text style={styles.soundMeta} numberOfLines={1}>
                      {s.creatorDisplayName}
                      {s.remixCount > 0 ? ` · ${formatCount(s.remixCount)} remixes` : ''}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.dark.textMuted} />
                </TouchableOpacity>
              );
            }
            const v = item.data;
            const thumb = v.thumbnailUrl || v.mediaUrl;
            return (
              <TouchableOpacity
                style={styles.soundRow}
                onPress={() => router.push(`/sound/${encodeURIComponent(v.postId)}`)}
                activeOpacity={0.7}
              >
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>{item.rank}</Text>
                </View>
                <View style={styles.soundThumbWrap}>
                  {thumb ? (
                    <Image source={{ uri: thumb }} style={styles.soundThumb} contentFit="cover" />
                  ) : (
                    <View style={[styles.soundThumb, styles.soundThumbPh]}>
                      <Ionicons name="flame" size={22} color={colors.primary.gold} />
                    </View>
                  )}
                  <SoundPreviewBadge id={v.postId} url={v.mediaUrl} style={styles.previewBadgePos} />
                </View>
                <View style={styles.soundBody}>
                  <Text style={styles.soundTitle} numberOfLines={2}>
                    {v.soundTitle}
                  </Text>
                  <Text style={styles.soundMeta} numberOfLines={1}>
                    {v.creatorDisplayName} · {formatCount(v.remixCount7d)} new clips this week
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.dark.textMuted} />
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyList}>
              <Ionicons name="musical-notes-outline" size={40} color={colors.dark.textMuted} />
              <Text style={styles.emptyText}>
                {tab === 'Viral Songs'
                  ? 'No trending sounds this week yet. Post a video and let others film with your audio.'
                  : 'No results. Try different keywords.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.sm + spacing.xs,
    paddingTop: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dark.border,
  },
  searchWrap: { flex: 1 },
  filterWrap: {
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dark.border,
  },
  chartHint: {
    ...typography.bodySmall,
    color: colors.dark.textMuted,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    lineHeight: 18,
  },
  list: { paddingHorizontal: layout.screenPadding, paddingBottom: 100 },
  emptyCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingTop: spacing['5xl'],
    paddingHorizontal: layout.screenPadding,
  },
  emptyList: {
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing['3xl'],
    paddingHorizontal: layout.screenPadding,
  },
  emptyText: {
    ...typography.body,
    color: colors.dark.textMuted,
    textAlign: 'center',
    fontWeight: '500',
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dark.border,
  },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  creatorBody: { flex: 1, minWidth: 0 },
  creatorNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  creatorName: { ...typography.body, fontWeight: '700', color: colors.dark.text },
  creatorDisplay: { ...typography.metadata, color: colors.dark.textSecondary, marginTop: 2 },
  creatorMeta: { ...typography.metadata, color: colors.dark.textMuted, marginTop: 2 },
  creatorTierRow: { flexDirection: 'row', marginTop: 6 },
  cardWrap: { marginVertical: spacing.sm - 2 },
  hashtagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dark.border,
  },
  hashIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.dark.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hashSymbol: { fontSize: 18, fontWeight: '700', color: colors.primary.teal },
  hashTextCol: { flex: 1 },
  hashText: { ...typography.body, fontWeight: '600', color: colors.dark.text },
  hashMeta: { ...typography.overlayMicro, color: colors.dark.textMuted, marginTop: 1 },
  soundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dark.border,
  },
  soundThumbWrap: { position: 'relative' },
  soundThumb: { width: 52, height: 52, borderRadius: 8, backgroundColor: colors.dark.card },
  soundThumbPh: { alignItems: 'center', justifyContent: 'center' },
  /** Anchors the play/pause preview button bottom-right of the thumbnail. */
  previewBadgePos: { position: 'absolute', bottom: -4, right: -4 },
  soundBody: { flex: 1, minWidth: 0 },
  soundTitle: { ...typography.body, fontWeight: '700', color: colors.dark.text },
  soundMeta: { ...typography.metadata, color: colors.dark.textMuted, marginTop: 4 },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.primary.teal + '22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { ...typography.sectionLabel, fontWeight: '800', color: colors.primary.teal },
  historyWrap: { paddingHorizontal: layout.screenPadding, paddingTop: spacing.sm },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  historyTitle: { ...typography.sectionTitle, color: colors.dark.text },
  clearText: { ...typography.bodySmall, fontWeight: '600', color: colors.primary.teal },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm + 2,
  },
  historyItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, flex: 1 },
  historyText: { ...typography.body, color: colors.dark.text },
});
