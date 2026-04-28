import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { StackScreenHeader } from '@/components/ui/StackScreenHeader';
import { LoadingState } from '@/components/ui/LoadingState';
import { postsService } from '@/services/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { colors, layout, spacing, typography } from '@/theme';
import type { Post } from '@/types';

export default function HashtagPostsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const viewerId = user?.id ?? null;
  const { tag: tagRaw } = useLocalSearchParams<{ tag: string }>();
  const tagParam = Array.isArray(tagRaw) ? tagRaw[0] : tagRaw;
  const tag = decodeURIComponent(tagParam ?? '').trim();

  const { data: posts = [], isPending } = useQuery({
    queryKey: ['hashtagPosts', tag, viewerId ?? ''],
    queryFn: () => postsService.getPostsByHashtag(tag, 50, viewerId),
    enabled: tag.length > 0,
  });

  const renderItem = ({ item }: { item: Post }) => {
    const thumb = item.thumbnailUrl?.trim() || item.mediaUrl?.trim();
    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.85}
        onPress={() => router.push(`/post/${item.id}`)}
      >
        {thumb ? (
          <Image source={{ uri: thumb }} style={styles.thumb} contentFit="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbPh]}>
            <Text style={styles.thumbPhText}>{item.type}</Text>
          </View>
        )}
        <View style={styles.rowBody}>
          <Text style={styles.caption} numberOfLines={2}>
            {item.caption || 'No caption'}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {item.creator.displayName}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StackScreenHeader
        insetTop={insets.top}
        title={tag ? `#${tag}` : 'Hashtag'}
        onPressLeft={() => router.back()}
      />
      {!tag ? (
        <Text style={styles.empty}>Invalid tag.</Text>
      ) : isPending ? (
        <LoadingState />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(p) => p.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          /** Trending hashtags can return hundreds of posts. */
          removeClippedSubviews={Platform.OS === 'android'}
          ListEmptyComponent={<Text style={styles.empty}>No public posts with this tag yet.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  list: { paddingHorizontal: layout.screenPadding, paddingTop: spacing.md, gap: 4 },
  row: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dark.border,
    alignItems: 'center',
  },
  thumb: { width: 56, height: 56, borderRadius: 10, backgroundColor: colors.dark.cardAlt },
  thumbPh: { alignItems: 'center', justifyContent: 'center' },
  thumbPhText: { fontSize: 10, fontWeight: '700', color: colors.dark.textMuted, textTransform: 'uppercase' },
  rowBody: { flex: 1, minWidth: 0, gap: 4 },
  caption: { ...typography.body, color: colors.dark.text },
  meta: { ...typography.caption, color: colors.dark.textMuted },
  empty: { ...typography.body, color: colors.dark.textMuted, padding: layout.screenPadding, marginTop: spacing.lg },
});
