import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { TopSegmentTabs } from '@/components/ui/TopSegmentTabs';
import { StackScreenHeader } from '@/components/ui/StackScreenHeader';
import { LoadingState } from '@/components/ui/LoadingState';
import { colors, layout, spacing, typography } from '@/theme';
import { supabase } from '@/lib/supabase';
import { formatCount } from '@/utils/format';

interface FollowUser {
  id: string;
  display_name: string;
  avatar_url: string | null;
  role: string;
  specialty: string;
  is_verified: boolean;
  follower_count: number;
}

const TABS = [
  { key: 'followers', label: 'Followers' },
  { key: 'following', label: 'Following' },
];

export default function FollowersScreen() {
  const { userId, tab: initialTab } = useLocalSearchParams<{ userId: string; tab?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState(initialTab ?? 'followers');
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    loadData();
  }, [userId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [followersRes, followingRes] = await Promise.all([
        supabase
          .from('follows')
          .select('follower:follower_id(id, display_name, avatar_url, role, specialty, is_verified, follower_count)')
          .eq('following_id', userId),
        supabase
          .from('follows')
          .select('following:following_id(id, display_name, avatar_url, role, specialty, is_verified, follower_count)')
          .eq('follower_id', userId),
      ]);

      setFollowers((followersRes.data ?? []).map((r: any) => r.follower));
      setFollowing((followingRes.data ?? []).map((r: any) => r.following));
    } catch {}
    setLoading(false);
  };

  const data = tab === 'followers' ? followers : following;
  const headerTitle = tab === 'followers' ? 'Followers' : 'Following';

  return (
    <View style={styles.container}>
      <StackScreenHeader insetTop={insets.top} title={headerTitle} onPressLeft={() => router.back()} />

      <TopSegmentTabs tabs={TABS} activeKey={tab} onSelect={setTab} light />

      {loading ? (
        <LoadingState />
      ) : data.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="people-outline" size={48} color={colors.dark.textMuted} />
          <Text style={styles.emptyText}>
            {tab === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          /**
           * Android-only: virtualizes off-screen rows by detaching them
           * from the native view hierarchy. Power users with thousands
           * of followers see noticeably smoother scroll. iOS already
           * handles this efficiently via UICollectionView, and enabling
           * it there can cause cells to flash blank on fast scroll.
           */
          removeClippedSubviews={Platform.OS === 'android'}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => router.push(`/profile/${item.id}`)}
              activeOpacity={0.7}
            >
              <Image source={{ uri: item.avatar_url ?? '' }} style={styles.avatar} />
              <View style={styles.body}>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>{item.display_name}</Text>
                  {item.is_verified && (
                    <Ionicons name="checkmark-circle" size={14} color={colors.primary.teal} />
                  )}
                </View>
                <Text style={styles.meta}>
                  {item.role} · {item.specialty} · {formatCount(item.follower_count)} followers
                </Text>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  list: { paddingBottom: 100 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dark.border,
  },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  body: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  name: { ...typography.creatorName, color: colors.dark.text },
  meta: { ...typography.metadata, color: colors.dark.textMuted, marginTop: 2 },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingTop: spacing['5xl'],
  },
  emptyText: { ...typography.body, color: colors.dark.textMuted },
});
