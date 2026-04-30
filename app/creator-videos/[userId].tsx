import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  Platform,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useQueryClient } from '@tanstack/react-query';
import { colors, borderRadius, typography, spacing } from '@/theme';
import { formatCount } from '@/utils/format';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPosts, useUser } from '@/hooks/useQueries';
import { LoadingState } from '@/components/ui/LoadingState';
import { TopSegmentTabs } from '@/components/ui/TopSegmentTabs';
import { PulseHistorySheet } from '@/components/mypage/PulseHistorySheet';
import { PulseScorePill } from '@/components/mypage/PulseScorePill';
import type { Post, UserProfile } from '@/types';
import { postHasDemoCatalogMedia } from '@/utils/postPreviewMedia';
import { RecentMediaThumb } from '@/components/mypage/RecentMediaThumb';
import { avatarThumb } from '@/lib/storage';
import { usePulseScorePillModel } from '@/hooks/usePulseScorePillModel';
import { userKeys } from '@/lib/queryKeys';

const { width: SCREEN_W } = Dimensions.get('window');
const PAD = 16;
const GAP = 10;
const COL_W = (SCREEN_W - PAD * 2 - GAP) / 2;
/** Row height: square-ish thumb (aspect 1 / 1.45) + row gap from list contentContainerStyle. */
const THUMB_H = COL_W * 1.45;
const ROW_H = THUMB_H + GAP;
const AVATAR_SIZE = 88;

type VideoSort = 'newest' | 'popular';

function filterCreatorVideos(posts: Post[] | undefined, isOwner: boolean, viewedProfile: UserProfile | undefined) {
  const list = posts ?? [];
  if (isOwner) {
    return list.filter(
      (p) =>
        !postHasDemoCatalogMedia(p) &&
        p.type === 'video' &&
        Boolean(p.mediaUrl?.trim() || p.thumbnailUrl?.trim()),
    );
  }
  if (!viewedProfile || viewedProfile.privacyMode === 'private') return [];
  return list.filter(
    (p) =>
      !postHasDemoCatalogMedia(p) &&
      p.type === 'video' &&
      Boolean(p.mediaUrl?.trim() || p.thumbnailUrl?.trim()),
  );
}

/**
 * Full grid of a creator’s videos (TikTok-style “swipe left from feed”).
 * Optional `fromPost` opens a prompt to scroll to the clip the viewer came from.
 */
export default function CreatorVideosGridScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const params = useLocalSearchParams<{ userId: string | string[]; fromPost?: string | string[] }>();
  const rawId = params.userId;
  const creatorId = (Array.isArray(rawId) ? rawId[0] : rawId)?.trim() ?? '';
  const rawFrom = params.fromPost;
  const fromPostId = (Array.isArray(rawFrom) ? rawFrom[0] : rawFrom)?.trim() ?? '';

  const [refreshing, setRefreshing] = useState(false);
  const [sort, setSort] = useState<VideoSort>('newest');
  const [pulseHistoryOpen, setPulseHistoryOpen] = useState(false);
  const listRef = useRef<FlatList<Post>>(null);
  const jumpPromptShown = useRef(false);

  const isOwner = !!authUser?.id && creatorId === authUser.id;
  const { data: profile, isPending: profilePending } = useUser(creatorId);

  const { data: posts, isLoading: postsLoading } = useUserPosts(creatorId);

  const privateBlocked = !isOwner && profile?.privacyMode === 'private';
  const privacyGateLoading = !isOwner && profilePending;

  const { overall, tier } = usePulseScorePillModel(
    creatorId || null,
    profile?.pulseScoreCurrent,
    profile?.pulseTier,
  );

  const openPulseHistory = useCallback(() => {
    Haptics.selectionAsync().catch(() => undefined);
    setPulseHistoryOpen(true);
  }, []);

  const videos = useMemo(
    () => filterCreatorVideos(posts, isOwner, profile),
    [posts, isOwner, profile],
  );

  const sortedVideos = useMemo(() => {
    const v = [...videos];
    if (sort === 'newest') {
      v.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
    } else {
      v.sort((a, b) => {
        if (b.viewCount !== a.viewCount) return b.viewCount - a.viewCount;
        if (b.likeCount !== a.likeCount) return b.likeCount - a.likeCount;
        return a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0;
      });
    }
    return v;
  }, [videos, sort]);

  const headerTitle = 'Videos';

  const scrollGridToPostIndex = useCallback((index: number) => {
    const row = Math.floor(index / 2);
    const offset = Math.max(0, row * ROW_H - 12);
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset, animated: true });
    });
  }, []);

  useEffect(() => {
    if (!fromPostId || jumpPromptShown.current || postsLoading || privacyGateLoading) return;
    if (privateBlocked) return;
    const idx = sortedVideos.findIndex((p) => p.id === fromPostId);
    if (idx < 0) return;
    jumpPromptShown.current = true;
    const t = setTimeout(() => {
      Alert.alert(
        'Jump to this video?',
        'Scroll the grid to the clip you were watching.',
        [
          { text: 'Not now', style: 'cancel' },
          {
            text: 'Jump',
            onPress: () => scrollGridToPostIndex(idx),
          },
        ],
      );
    }, 350);
    return () => clearTimeout(t);
  }, [fromPostId, postsLoading, privacyGateLoading, privateBlocked, sortedVideos, scrollGridToPostIndex]);

  const onPullRefresh = useCallback(async () => {
    if (!creatorId) return;
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['userPosts', creatorId] });
      await queryClient.invalidateQueries({ queryKey: userKeys.detail(creatorId) });
    } finally {
      setRefreshing(false);
    }
  }, [creatorId, queryClient]);

  if (!creatorId) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.muted}>Could not load videos.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={26} color={colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {headerTitle}
        </Text>
        <View style={{ width: 34 }} />
      </View>

      {privateBlocked ? (
        <Text style={styles.blurb}>
          This account has a private profile — videos are hidden.
        </Text>
      ) : null}

      {!privateBlocked && creatorId ? (
        <View style={styles.hero}>
          {profilePending && !profile ? (
            <View style={styles.heroLoading}>
              <ActivityIndicator color={colors.primary.teal} />
            </View>
          ) : (
            <>
              <TouchableOpacity
                onPress={() => router.push(`/profile/${creatorId}` as any)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`Open ${profile?.displayName?.trim() ?? 'profile'} on My Pulse`}
                style={styles.avatarWrap}
              >
                <View style={styles.avatarInner}>
                  <Image
                    source={{ uri: avatarThumb(profile?.avatarUrl, AVATAR_SIZE) }}
                    style={styles.avatar}
                    contentFit="cover"
                    transition={120}
                  />
                  <View style={styles.avatarRing} pointerEvents="none" />
                </View>
              </TouchableOpacity>
              <Text style={styles.displayName} numberOfLines={1}>
                {profile?.displayName?.trim() ||
                  (profile?.username ? `@${profile.username}` : 'Creator')}
              </Text>
              <View style={styles.pulsePillWrap}>
                <PulseScorePill
                  value={String(overall)}
                  tierLabel={tier.label}
                  tierAccent={tier.accent}
                  tierGlow={tier.glow}
                  onPress={openPulseHistory}
                />
              </View>
              <View style={styles.sortRow}>
                <TopSegmentTabs
                  light
                  tabs={[
                    { key: 'newest', label: 'Newest' },
                    { key: 'popular', label: 'Most popular' },
                  ]}
                  activeKey={sort}
                  onSelect={(k) => setSort(k as VideoSort)}
                />
              </View>
            </>
          )}
        </View>
      ) : null}

      {postsLoading || privacyGateLoading ? (
        <LoadingState />
      ) : videos.length === 0 ? (
        <Text style={styles.empty}>
          {privateBlocked ? 'This profile is private.' : 'No videos on this profile yet.'}
        </Text>
      ) : (
        <FlatList
          ref={listRef}
          data={sortedVideos}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ gap: GAP, paddingHorizontal: PAD }}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24, gap: GAP }}
          removeClippedSubviews={Platform.OS === 'android'}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onPullRefresh} tintColor={colors.primary.teal} />
          }
          onScrollToIndexFailed={({ index }) => {
            scrollGridToPostIndex(index);
          }}
          renderItem={({ item: p }) => (
            <View style={styles.cell}>
              <TouchableOpacity
                style={styles.thumbTouch}
                onPress={() => router.push(`/feed/${p.id}` as any)}
                activeOpacity={0.85}
              >
                <RecentMediaThumb post={p} style={styles.thumb} />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.9)']}
                  style={styles.thumbGrad}
                />
                <View style={styles.playCenter}>
                  <Ionicons name="play" size={22} color="#FFF" />
                </View>
                <View style={styles.thumbCaption}>
                  <Text style={styles.thumbTitle} numberOfLines={2}>
                    {p.caption?.trim() || 'Video'}
                  </Text>
                  <View style={styles.thumbMeta}>
                    <Ionicons name="play-outline" size={12} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.thumbViews}>{formatCount(p.viewCount)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
      <PulseHistorySheet
        visible={pulseHistoryOpen}
        userId={creatorId}
        displayName={profile?.displayName}
        isOwner={isOwner}
        onClose={() => setPulseHistoryOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  centered: { justifyContent: 'center', alignItems: 'center' },
  muted: { color: colors.dark.textMuted },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  headerTitle: {
    ...typography.screenTitle,
    fontSize: 17,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  hero: {
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    paddingHorizontal: PAD,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dark.border,
  },
  heroLoading: {
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarWrap: {
    marginBottom: 10,
  },
  avatarInner: {
    position: 'relative',
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.dark.cardAlt,
  },
  avatarRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 2,
    borderColor: 'rgba(20,184,166,0.45)',
  },
  displayName: {
    ...typography.screenTitle,
    fontSize: 18,
    textAlign: 'center',
    maxWidth: '92%',
    marginBottom: 10,
  },
  pulsePillWrap: {
    alignItems: 'center',
    marginBottom: 6,
  },
  sortRow: {
    alignSelf: 'stretch',
  },
  blurb: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.dark.textMuted,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  empty: { fontSize: 14, color: colors.dark.textMuted, paddingHorizontal: 16, marginTop: 12 },
  cell: { width: COL_W, position: 'relative' },
  thumbTouch: { borderRadius: borderRadius.xl, overflow: 'hidden' },
  thumb: {
    width: '100%',
    aspectRatio: 1 / 1.45,
    backgroundColor: colors.dark.cardAlt,
  },
  thumbGrad: { ...StyleSheet.absoluteFillObject },
  playCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbCaption: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 8,
  },
  thumbTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFF',
    lineHeight: 15,
    marginBottom: 4,
  },
  thumbMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  thumbViews: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.92)' },
});
