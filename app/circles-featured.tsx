import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { StackScreenHeader } from '@/components/ui/StackScreenHeader';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAppStore } from '@/store/useAppStore';
import { communitiesService } from '@/services/supabase';
import { communityKeys } from '@/lib/queryKeys';
import { colors, layout, spacing, typography } from '@/theme';
import { hrefCommunity } from '@/lib/communityRoutes';
import { prefetchCircleRoom } from '@/lib/communityCache';
import { useAuth } from '@/contexts/AuthContext';
import type { Community } from '@/types';

/**
 * Circles tab "See all" — complete directory sorted A–Z by URL slug
 * (same order as /communities/:slug paths).
 */
export default function CirclesDirectoryScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const joinedIds = useAppStore((s) => s.joinedCommunityIds);
  const [refreshing, setRefreshing] = useState(false);

  const { data: list = [], isPending, refetch } = useQuery({
    queryKey: communityKeys.circlesDirectoryAlpha(),
    queryFn: () => communitiesService.getAllAlphabeticalBySlug(),
    staleTime: 120_000,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const openCommunity = useCallback(
    (c: Community) => {
      prefetchCircleRoom(queryClient, c, user?.id ?? null);
      router.push(hrefCommunity(c.slug));
    },
    [queryClient, router, user?.id],
  );

  if (isPending && list.length === 0) return <LoadingState message="Loading circles…" />;

  const renderItem = ({ item: c }: { item: Community }) => {
    const joined = joinedIds.has(c.id);
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => openCommunity(c)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={`${c.name}, slug ${c.slug}`}
      >
        <View style={styles.rowText}>
          <View style={styles.rowTitleLine}>
            <Text style={styles.emoji} accessible={false}>
              {c.icon ?? '◯'}
            </Text>
            <Text style={styles.name} numberOfLines={1}>
              {c.name}
            </Text>
            {joined ? (
              <View style={styles.joinedPill}>
                <Text style={styles.joinedPillText}>Joined</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.slug} numberOfLines={1}>
            /{c.slug}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.dark.textMuted} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StackScreenHeader
        insetTop={insets.top}
        title="All circles"
        onPressLeft={() => router.back()}
      />
      <Text style={styles.lede}>
        Alphabetical by link slug — tap any room to open it. Popular picks stay on the Circles home
        carousel.
      </Text>
      <FlatList
        data={list}
        keyExtractor={(c) => c.id}
        initialNumToRender={16}
        maxToRenderPerBatch={20}
        windowSize={10}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews={Platform.OS === 'android'}
        keyboardShouldPersistTaps="handled"
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary.teal} />
        }
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListEmptyComponent={<Text style={styles.empty}>No circles in the directory yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  lede: {
    ...typography.bodySmall,
    color: colors.dark.textMuted,
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.sm,
    lineHeight: 18,
  },
  list: { paddingHorizontal: layout.screenPadding },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    minHeight: 56,
  },
  rowText: { flex: 1, minWidth: 0 },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 },
  emoji: { fontSize: 20 },
  name: {
    ...typography.body,
    fontWeight: '700',
    color: colors.dark.text,
    flex: 1,
    minWidth: 0,
  },
  joinedPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(20,184,166,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(20,184,166,0.35)',
  },
  joinedPillText: { fontSize: 10, fontWeight: '800', color: colors.primary.teal },
  slug: {
    ...typography.caption,
    color: colors.dark.textMuted,
    marginTop: 4,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    fontSize: 12,
  },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.dark.border, marginLeft: 36 },
  empty: { ...typography.body, color: colors.dark.textMuted, padding: layout.screenPadding, textAlign: 'center' },
});
