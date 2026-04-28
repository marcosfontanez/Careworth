import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Dimensions, Platform,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RecentMediaThumb } from '@/components/mypage/RecentMediaThumb';
import { Ionicons } from '@expo/vector-icons';
import { TopSegmentTabs } from '@/components/ui/TopSegmentTabs';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { StackScreenHeader } from '@/components/ui/StackScreenHeader';
import { useAuth } from '@/contexts/AuthContext';
import { postsService, jobsService } from '@/services/supabase';
import { useAppStore } from '@/store/useAppStore';
import { borderRadius, colors, iconSize, layout, spacing, typography } from '@/theme';
import { formatCount, formatPayRange } from '@/utils/format';
import type { Post, Job } from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { savedPostKeys } from '@/lib/queryKeys';

const TABS = [
  { key: 'posts', label: 'Posts' },
  { key: 'jobs', label: 'Jobs' },
];

const { width: SCREEN_W } = Dimensions.get('window');
const GRID_GAP = spacing.xs;
const GRID_SIZE = (SCREEN_W - layout.screenPadding * 2 - GRID_GAP * 2) / 3;

export default function SavedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [tab, setTab] = useState('posts');
  const toggleSavePost = useAppStore((s) => s.toggleSavePost);
  const toggleSaveJob = useAppStore((s) => s.toggleSaveJob);
  const queryClient = useQueryClient();

  /**
   * Backed by react-query so the same `['savedPosts', user.id]` invalidation
   * fired from feed.tsx / my-posts.tsx after a save automatically refreshes
   * this list when the user comes back to the screen. Previously this was a
   * one-shot useEffect, which is why a freshly favorited video never showed
   * up in Favorites until the app was restarted.
   */
  const postsQuery = useQuery<Post[]>({
    queryKey: savedPostKeys.forUser(user?.id),
    queryFn: () => (user ? postsService.getSavedPosts(user.id) : Promise.resolve([])),
    enabled: !!user,
    staleTime: 30_000,
  });

  const jobsQuery = useQuery<Job[]>({
    queryKey: ['savedJobs', user?.id ?? 'anon'],
    queryFn: () => (user ? jobsService.getSaved(user.id) : Promise.resolve([])),
    enabled: !!user,
    staleTime: 30_000,
  });

  /** Always refetch on screen focus so a save made elsewhere is picked up,
   *  even if the cached query is still considered fresh. */
  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      postsQuery.refetch();
      jobsQuery.refetch();
    }, [user, postsQuery, jobsQuery]),
  );

  const savedPosts = postsQuery.data ?? [];
  const savedJobs = jobsQuery.data ?? [];
  const loading = (postsQuery.isLoading && postsQuery.fetchStatus !== 'idle')
    || (jobsQuery.isLoading && jobsQuery.fetchStatus !== 'idle');

  /**
   * Optimistic remove: yank from the cache so the unsave feels instant, then
   * call the server. On failure we rollback by invalidating, which forces the
   * authoritative server state back in.
   */
  const unsavePostMut = useMutation({
    mutationFn: async (postId: string) => {
      if (!user) return;
      await postsService.toggleSave(user.id, postId);
    },
    onMutate: async (postId: string) => {
      const key = savedPostKeys.forUser(user?.id);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Post[]>(key);
      queryClient.setQueryData<Post[]>(key, (prev) => (prev ?? []).filter((p) => p.id !== postId));
      return { previous, key };
    },
    onError: (_err, _postId, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(ctx.key, ctx.previous);
    },
    onSettled: () => {
      if (user) queryClient.invalidateQueries({ queryKey: savedPostKeys.forUser(user.id) });
    },
  });

  const unsaveJobMut = useMutation({
    mutationFn: async (jobId: string) => {
      if (!user) return;
      await jobsService.toggleSave(user.id, jobId);
    },
    onMutate: async (jobId: string) => {
      const key = ['savedJobs', user?.id ?? 'anon'];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Job[]>(key);
      queryClient.setQueryData<Job[]>(key, (prev) => (prev ?? []).filter((j) => j.id !== jobId));
      return { previous, key };
    },
    onError: (_err, _jobId, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(ctx.key, ctx.previous);
    },
    onSettled: () => {
      if (user) queryClient.invalidateQueries({ queryKey: ['savedJobs', user.id] });
    },
  });

  const handleUnsavePost = (id: string) => {
    toggleSavePost(id);
    unsavePostMut.mutate(id);
  };

  const handleUnsaveJob = (id: string) => {
    toggleSaveJob(id);
    unsaveJobMut.mutate(id);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StackScreenHeader insetTop={insets.top} title="Saved" onPressLeft={() => router.back()} />
        <LoadingState />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StackScreenHeader insetTop={insets.top} title="Saved" onPressLeft={() => router.back()} />

      <TopSegmentTabs tabs={TABS} activeKey={tab} onSelect={setTab} light />

      {tab === 'posts' ? (
        savedPosts.length === 0 ? (
          <EmptyState icon="🔖" title="No saved posts" subtitle="Bookmark posts from the feed to see them here" />
        ) : (
          <FlatList
            data={savedPosts}
            keyExtractor={(item) => item.id}
            numColumns={3}
            /** Android virtualization win for power users with many saves. */
            removeClippedSubviews={Platform.OS === 'android'}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.gridItem}
                onPress={() => router.push(`/comments/${item.id}`)}
                activeOpacity={0.8}
              >
                <RecentMediaThumb post={item} style={styles.gridImage} />
                <View style={styles.gridOverlay}>
                  <View style={styles.gridStatRow}>
                    <Ionicons name="heart" size={10} color={colors.status.error} />
                    <Text style={styles.gridStat}>{formatCount(item.likeCount)}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.unsaveBtn}
                  onPress={() => handleUnsavePost(item.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="bookmark" size={14} color={colors.primary.gold} />
                </TouchableOpacity>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.grid}
            columnWrapperStyle={{ gap: GRID_GAP }}
          />
        )
      ) : savedJobs.length === 0 ? (
        <EmptyState icon="💼" title="No saved jobs" subtitle="Save job listings to review them later" />
      ) : (
        <FlatList
          data={savedJobs}
          keyExtractor={(item) => item.id}
          removeClippedSubviews={Platform.OS === 'android'}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.jobRow}
              onPress={() => router.push(`/jobs/${item.id}`)}
              activeOpacity={0.7}
            >
              <View style={styles.jobIcon}>
                <Ionicons name="business" size={iconSize.md} color={colors.primary.royal} />
              </View>
              <View style={styles.jobBody}>
                <Text style={styles.jobTitle}>{item.title}</Text>
                <Text style={styles.jobEmployer}>{item.employerName}</Text>
                <Text style={styles.jobMeta}>
                  {item.city}, {item.state} · {formatPayRange(item.payMin, item.payMax)}
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleUnsaveJob(item.id)} activeOpacity={0.7}>
                <Ionicons name="bookmark" size={iconSize.md} color={colors.primary.gold} />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.jobList}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  grid: { padding: layout.screenPadding, gap: GRID_GAP },
  gridItem: {
    width: GRID_SIZE,
    height: GRID_SIZE,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  gridImage: { width: '100%', height: '100%' },
  gridOverlay: {
    position: 'absolute',
    bottom: spacing.xs,
    left: spacing.xs,
    backgroundColor: colors.glass.mdStrong,
    paddingHorizontal: spacing.sm - 2,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  gridStatRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  gridStat: { ...typography.overlayMicro, color: colors.dark.text, fontWeight: '600' },
  unsaveBtn: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    backgroundColor: colors.glass.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jobList: { padding: layout.screenPadding, gap: spacing.xs },
  jobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md - 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dark.border,
  },
  jobIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary.royal + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  jobBody: { flex: 1 },
  jobTitle: { ...typography.creatorName, color: colors.dark.text },
  jobEmployer: { ...typography.bodySmall, color: colors.dark.textSecondary, marginTop: 1 },
  jobMeta: {
    ...typography.metadata,
    color: colors.primary.teal,
    fontWeight: '500',
    marginTop: 2,
  },
});
