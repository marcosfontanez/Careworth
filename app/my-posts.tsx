import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Alert,
  Platform,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { colors, borderRadius, typography } from '@/theme';
import { formatCount } from '@/utils/format';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPosts, useUser } from '@/hooks/useQueries';
import { postsService } from '@/services/supabase/posts';
import { invalidatePostRelatedQueries } from '@/lib/invalidatePostQueries';
import { feedKeys, savedPostKeys } from '@/lib/queryKeys';
import { LoadingState } from '@/components/ui/LoadingState';
import type { Post } from '@/types';
import { postHasDemoCatalogMedia } from '@/utils/postPreviewMedia';
import { RecentMediaThumb } from '@/components/mypage/RecentMediaThumb';
import { TopSegmentTabs } from '@/components/ui/TopSegmentTabs';
import { sharePostLink, shareDownloadedPostMedia } from '@/lib/postMediaActions';

const { width: SCREEN_W } = Dimensions.get('window');
const PAD = 16;
const GAP = 10;
const COL_W = (SCREEN_W - PAD * 2 - GAP) / 2;

type Section = 'uploads' | 'favorites';

function filterVisual(list: Post[]) {
  return list.filter(
    (p) => !postHasDemoCatalogMedia(p) && (p.thumbnailUrl || p.mediaUrl || p.type === 'video'),
  );
}

export default function MyPostsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const params = useLocalSearchParams<{ userId?: string | string[] }>();
  const paramId = params.userId;
  const fromQuery = Array.isArray(paramId) ? paramId[0] : paramId;
  const uid = fromQuery?.trim() || authUser?.id;

  const [section, setSection] = useState<Section>('uploads');
  const [refreshing, setRefreshing] = useState(false);

  const { data: posts, isLoading } = useUserPosts(uid ?? '');
  const isOwner = !!authUser?.id && uid === authUser.id;
  const profileLookupId = !isOwner && uid ? uid : '';
  const { data: viewedProfile } = useUser(profileLookupId);

  const {
    data: savedPosts = [],
    isLoading: savedLoading,
    isError: savedError,
    refetch: refetchSaved,
  } = useQuery({
    queryKey: savedPostKeys.forUser(uid),
    queryFn: () => postsService.getSavedPosts(uid!),
    /** Prefetch whenever owner opens this screen so Favorites is populated before switching tabs. */
    enabled: !!uid && isOwner,
  });

  const postsVisibleToViewer = useMemo(() => {
    const list = posts ?? [];
    if (isOwner) return list.filter((p) => !postHasDemoCatalogMedia(p));
    if (!viewedProfile || viewedProfile.privacyMode === 'private') return [];
    return list.filter((p) => !postHasDemoCatalogMedia(p));
  }, [posts, isOwner, viewedProfile]);
  const visualUploads = useMemo(() => filterVisual(postsVisibleToViewer), [postsVisibleToViewer]);
  const visualFavorites = useMemo(
    () => (savedPosts ?? []).filter((p) => !postHasDemoCatalogMedia(p)),
    [savedPosts],
  );

  const listData = section === 'uploads' ? visualUploads : visualFavorites;
  const listLoading = section === 'uploads' ? isLoading : savedLoading;

  const deletePostMut = useMutation({
    mutationFn: ({ postId, creatorId }: { postId: string; creatorId: string }) =>
      postsService.deleteOwnPost(postId, creatorId),
    onSuccess: async (_void, { creatorId }) => {
      await invalidatePostRelatedQueries(queryClient, { creatorId });
    },
    onError: () => {
      Alert.alert('Delete failed', 'Could not remove this post. Pull to refresh and try again.');
    },
  });

  const unsaveMut = useMutation({
    mutationFn: async (postId: string) => {
      if (!authUser?.id) return;
      await postsService.toggleSave(authUser.id, postId);
    },
    onSuccess: async () => {
      if (authUser?.id) {
        await queryClient.invalidateQueries({ queryKey: savedPostKeys.forUser(authUser.id) });
      }
      queryClient.invalidateQueries({ queryKey: feedKeys.root() });
    },
    onError: () => {
      Alert.alert('Remove failed', 'Could not remove this from favorites.');
    },
  });

  const confirmDelete = useCallback(
    (p: Post) => {
      Alert.alert('Delete post', 'Remove this from your profile?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deletePostMut.mutate({ postId: p.id, creatorId: p.creatorId }),
        },
      ]);
    },
    [deletePostMut],
  );

  const onPullRefresh = useCallback(async () => {
    if (!uid) return;
    setRefreshing(true);
    try {
      if (section === 'uploads') {
        await queryClient.invalidateQueries({ queryKey: ['userPosts', uid] });
      } else {
        await refetchSaved();
      }
    } finally {
      setRefreshing(false);
    }
  }, [uid, section, queryClient, refetchSaved]);

  const openPostMenu = useCallback(
    (p: Post) => {
      if (!isOwner || !authUser?.id) return;

      if (section === 'uploads') {
        if (p.creatorId !== authUser.id) return;
        Alert.alert('Your post', (p.caption?.trim() || 'Post').slice(0, 80), [
          { text: 'Share', onPress: () => void sharePostLink(p) },
          { text: 'Download', onPress: () => void shareDownloadedPostMedia(p) },
          { text: 'Delete', style: 'destructive', onPress: () => confirmDelete(p) },
          { text: 'Cancel', style: 'cancel' },
        ]);
        return;
      }

      Alert.alert('Favorite', (p.caption?.trim() || 'Post').slice(0, 80), [
        { text: 'Share', onPress: () => void sharePostLink(p) },
        { text: 'Download', onPress: () => void shareDownloadedPostMedia(p) },
        {
          text: 'Remove from favorites',
          style: 'destructive',
          onPress: () => unsaveMut.mutate(p.id),
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    },
    [authUser?.id, confirmDelete, isOwner, section, unsaveMut],
  );

  if (!uid) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.muted}>Could not load posts.</Text>
      </View>
    );
  }

  const showTabs = isOwner;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={26} color={colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isOwner ? 'Your posts' : 'Posts'}</Text>
        <View style={{ width: 34 }} />
      </View>

      {showTabs ? (
        <View style={styles.tabWrap}>
          <TopSegmentTabs
            tabs={[
              { key: 'uploads', label: 'Uploads' },
              { key: 'favorites', label: 'Favorites' },
            ]}
            activeKey={section}
            onSelect={(k) => setSection(k as Section)}
            light
          />
        </View>
      ) : null}

      <Text style={styles.blurb}>
        {isOwner ? (
          section === 'uploads' ? (
            <>Your published posts with media ({visualUploads.length}).</>
          ) : (
            <>Posts you bookmarked ({visualFavorites.length}).</>
          )
        ) : viewedProfile?.privacyMode === 'private' ? (
          <>This account has a private profile — posts are hidden.</>
        ) : (
          <>Posts with media on this profile ({visualUploads.length}).</>
        )}
      </Text>

      {savedError && isOwner ? (
        <Text style={styles.errorHint}>
          Could not load saved posts. Pull down to retry or check your connection.
        </Text>
      ) : null}

      {listLoading ? (
        <LoadingState />
      ) : listData.length === 0 ? (
        <Text style={styles.empty}>
          {section === 'uploads'
            ? !isOwner && viewedProfile?.privacyMode === 'private'
              ? 'This profile is private.'
              : 'No published clips or images yet.'
            : 'No favorites yet — tap the bookmark on a post to save it here.'}
        </Text>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ gap: GAP, paddingHorizontal: PAD }}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24, gap: GAP }}
          /** Android virtualization win — see app/followers.tsx for rationale. */
          removeClippedSubviews={Platform.OS === 'android'}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onPullRefresh} tintColor={colors.primary.teal} />
          }
          renderItem={({ item: p }) => {
            const showMenu =
              isOwner &&
              authUser?.id &&
              (section === 'favorites' || (section === 'uploads' && p.creatorId === authUser.id));
            return (
              <View style={styles.cell}>
                <TouchableOpacity
                  style={styles.thumbTouch}
                  onPress={() => router.push(`/feed/${p.id}`)}
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
                      {p.caption?.trim() || 'Post'}
                    </Text>
                    <View style={styles.thumbMeta}>
                      <Ionicons name="play-outline" size={12} color="rgba(255,255,255,0.9)" />
                      <Text style={styles.thumbViews}>{formatCount(p.viewCount)}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
                {showMenu ? (
                  <TouchableOpacity
                    style={styles.menuBtn}
                    onPress={() => openPostMenu(p)}
                    hitSlop={8}
                  >
                    <Ionicons name="ellipsis-vertical" size={16} color="#FFF" />
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          }}
        />
      )}
      {deletePostMut.isPending || unsaveMut.isPending ? (
        <ActivityIndicator color={colors.primary.teal} style={{ marginTop: 8 }} />
      ) : null}
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
  headerTitle: { ...typography.screenTitle, fontSize: 17, flex: 1, textAlign: 'center' },
  tabWrap: {
    paddingTop: 4,
    paddingBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dark.border,
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
  errorHint: {
    fontSize: 13,
    color: colors.status.error,
    paddingHorizontal: 16,
    marginBottom: 8,
    fontWeight: '600',
  },
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
  menuBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
});
