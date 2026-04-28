import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { StackScreenHeader } from '@/components/ui/StackScreenHeader';
import { CircleCardCompact } from '@/components/circles/CircleCardCompact';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAppStore } from '@/store/useAppStore';
import { circleContentService } from '@/services/circleContent';
import { colors, layout, spacing, typography } from '@/theme';
import { getCircleAccent } from '@/lib/circleAccents';
import type { Community } from '@/types';

export default function CirclesFeaturedFullScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const joinedIds = useAppStore((s) => s.joinedCommunityIds);
  const toggleJoin = useAppStore((s) => s.toggleJoinCommunity);
  const [refreshing, setRefreshing] = useState(false);

  const { data: list = [], isPending, refetch } = useQuery({
    queryKey: ['circles', 'featured', 'full-grid'],
    queryFn: () => circleContentService.getFeaturedCircles(),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  if (isPending && !list.length) return <LoadingState />;

  const renderItem = ({ item: c }: { item: Community }) => {
    /** Same identity resolution as the main Circles tab so this surface
     *  matches the room banner once the user taps in. */
    const accent = getCircleAccent(c.slug, c.accentColor).color;
    const isJoined = joinedIds.has(c.id);
    return (
      <View style={styles.cell}>
        <CircleCardCompact
          community={c}
          accent={accent}
          joined={isJoined}
          onPress={() => router.push(`/communities/${c.slug}`)}
          onToggleJoin={() => toggleJoin(c.id)}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StackScreenHeader
        insetTop={insets.top}
        title="Featured Circles"
        onPressLeft={() => router.back()}
      />
      <Text style={styles.lede}>Explore Circles that match your interests.</Text>
      <FlatList
        data={list}
        keyExtractor={(c) => c.id}
        renderItem={renderItem}
        numColumns={1}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary.teal} />
        }
        ListEmptyComponent={<Text style={styles.empty}>No featured circles found. Run DB migrations / seed communities.</Text>}
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
  list: { paddingHorizontal: layout.screenPadding, gap: 4 },
  cell: { marginBottom: 4 },
  empty: { ...typography.body, color: colors.dark.textMuted, padding: layout.screenPadding, textAlign: 'center' },
});
