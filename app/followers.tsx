import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { TopSegmentTabs } from '@/components/ui/TopSegmentTabs';
import { StackScreenHeader } from '@/components/ui/StackScreenHeader';
import { LoadingState } from '@/components/ui/LoadingState';
import { ProfileNeonPills } from '@/components/mypage/ProfileNeonPills';
import { colors, layout, spacing, typography } from '@/theme';
import { supabase } from '@/lib/supabase';
import { formatCount } from '@/utils/format';
import { MY_PULSE_MAX_IDENTITY_TAGS, MY_PULSE_TAGS_CHAR_BUDGET } from '@/constants';

/** Matches My Pulse header trimming — keep list rows from overflowing. */
const NEON_PILL_MAX_LEN = 14;

interface FollowUser {
  id: string;
  display_name: string;
  avatar_url: string | null;
  banner_url: string | null;
  identity_tags: string[];
  is_verified: boolean;
  follower_count: number;
}

function trimTagsForRow(identityTags: string[] | null | undefined): string[] {
  const raw = (Array.isArray(identityTags) ? identityTags : [])
    .map((t) => String(t).trim())
    .filter(Boolean);
  const kept: string[] = [];
  let used = 0;
  for (const t of raw) {
    if (kept.length >= MY_PULSE_MAX_IDENTITY_TAGS) break;
    const trimmed =
      t.length > NEON_PILL_MAX_LEN ? `${t.slice(0, NEON_PILL_MAX_LEN - 1)}…` : t;
    if (used + trimmed.length > MY_PULSE_TAGS_CHAR_BUDGET) break;
    kept.push(trimmed);
    used += trimmed.length;
  }
  return kept;
}

function mapEmbedRow(r: Record<string, unknown>): FollowUser | null {
  const p = (r.follower ?? r.following) as Record<string, unknown> | undefined;
  if (!p || typeof p.id !== 'string') return null;
  const tagsRaw = p.identity_tags;
  const identity_tags = Array.isArray(tagsRaw)
    ? tagsRaw.map((x) => String(x))
    : [];
  return {
    id: p.id,
    display_name: String(p.display_name ?? 'Member'),
    avatar_url: typeof p.avatar_url === 'string' ? p.avatar_url : null,
    banner_url: typeof p.banner_url === 'string' ? p.banner_url : null,
    identity_tags,
    is_verified: Boolean(p.is_verified),
    follower_count:
      typeof p.follower_count === 'number'
        ? p.follower_count
        : Number(p.follower_count) || 0,
  };
}

const FOLLOW_PROFILE_SELECT =
  'id, display_name, avatar_url, banner_url, identity_tags, is_verified, follower_count';

const TABS = [
  { key: 'followers', label: 'Followers' },
  { key: 'following', label: 'Following' },
];

function FollowListMedia({
  avatarUrl,
  bannerUrl,
}: {
  avatarUrl: string | null;
  bannerUrl: string | null;
}) {
  const COL_W = 64;
  const BANNER_H = 38;
  const AVATAR_SZ = 46;
  const banner = bannerUrl?.trim();
  const avatar = avatarUrl?.trim();

  return (
    <View style={[styles.mediaCol, { width: COL_W }]}>
      <View style={[styles.bannerThumb, { height: BANNER_H }]}>
        {banner ? (
          <Image
            source={{ uri: banner }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={120}
          />
        ) : (
          <LinearGradient
            colors={[colors.dark.bg, `${colors.primary.teal}30`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}
      </View>
      <View
        style={[
          styles.avatarRing,
          {
            width: AVATAR_SZ,
            height: AVATAR_SZ,
            borderRadius: AVATAR_SZ / 2,
            marginTop: -(AVATAR_SZ / 2),
          },
        ]}
      >
        {avatar ? (
          <Image
            source={{ uri: avatar }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={120}
          />
        ) : (
          <View style={styles.avatarPlaceholderInner}>
            <Ionicons name="person" size={22} color={colors.dark.textMuted} />
          </View>
        )}
      </View>
    </View>
  );
}

export default function FollowersScreen() {
  const { userId, tab: initialTab } = useLocalSearchParams<{ userId: string; tab?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState(initialTab ?? 'followers');
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [followersRes, followingRes] = await Promise.all([
        supabase
          .from('follows')
          .select(`follower:follower_id(${FOLLOW_PROFILE_SELECT})`)
          .eq('following_id', userId),
        supabase
          .from('follows')
          .select(`following:following_id(${FOLLOW_PROFILE_SELECT})`)
          .eq('follower_id', userId),
      ]);

      if (followersRes.error && __DEV__) {
        console.warn('[FollowersScreen] followers', followersRes.error.message);
      }
      if (followingRes.error && __DEV__) {
        console.warn('[FollowersScreen] following', followingRes.error.message);
      }

      setFollowers(
        (followersRes.data ?? [])
          .map((r) => mapEmbedRow(r as Record<string, unknown>))
          .filter((x): x is FollowUser => x != null),
      );
      setFollowing(
        (followingRes.data ?? [])
          .map((r) => mapEmbedRow(r as Record<string, unknown>))
          .filter((x): x is FollowUser => x != null),
      );
    } catch (e) {
      if (__DEV__) console.warn('[FollowersScreen]', e);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

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
          renderItem={({ item }) => {
            const neonTags = trimTagsForRow(item.identity_tags);
            return (
              <TouchableOpacity
                style={styles.row}
                onPress={() => router.push(`/profile/${item.id}`)}
                activeOpacity={0.7}
              >
                <FollowListMedia avatarUrl={item.avatar_url} bannerUrl={item.banner_url} />
                <View style={styles.body}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name} numberOfLines={1}>
                      {item.display_name}
                    </Text>
                    {item.is_verified ? (
                      <Ionicons name="checkmark-circle" size={14} color={colors.primary.teal} />
                    ) : null}
                  </View>
                  {neonTags.length > 0 ? (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.pillsScroll}
                    >
                      <ProfileNeonPills tags={neonTags} style={styles.pillsInList} />
                    </ScrollView>
                  ) : null}
                  <Text style={styles.followerMeta}>
                    {formatCount(item.follower_count)} followers
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
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
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dark.border,
  },
  mediaCol: {
    alignItems: 'center',
  },
  bannerThumb: {
    width: '100%',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.dark.cardAlt,
  },
  avatarRing: {
    borderWidth: 2,
    borderColor: colors.dark.bg,
    backgroundColor: colors.dark.cardAlt,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderInner: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  name: { ...typography.creatorName, color: colors.dark.text, flexShrink: 1 },
  pillsScroll: {
    flexGrow: 0,
    paddingRight: spacing.sm,
    marginTop: 2,
  },
  pillsInList: { marginTop: 4 },
  followerMeta: {
    ...typography.metadata,
    color: colors.dark.textMuted,
    marginTop: 6,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingTop: spacing['5xl'],
  },
  emptyText: { ...typography.body, color: colors.dark.textMuted },
});
