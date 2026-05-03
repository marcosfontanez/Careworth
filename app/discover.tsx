import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, ScrollView, StyleSheet, TouchableOpacity,
  Dimensions, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { RecentMediaThumb } from '@/components/mypage/RecentMediaThumb';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQueryClient } from '@tanstack/react-query';
import { useFeed, useFeaturedCommunities, useFeaturedJobs } from '@/hooks/useQueries';
import { useAppStore } from '@/store/useAppStore';
import { colors, borderRadius, iconSize, layout, spacing, typography } from '@/theme';
import { StackScreenHeader } from '@/components/ui/StackScreenHeader';
import { formatCount } from '@/utils/format';
import { supabase } from '@/lib/supabase';
import { postsService } from '@/services/supabase';
import { primeCommunityDetailCache } from '@/lib/communityCache';
import type { UserProfile, Post } from '@/types';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = SCREEN_W * 0.42;

/**
 * Rotating per-tag accent colours. These are purely decorative —
 * they exist to give each trending-tag chip a recognisable personal
 * colour so the rail doesn't flatten into a single hue. We reuse
 * brand teal and the live/accent pink so the chips still feel at
 * home inside the app's palette.
 */
const TAG_COLORS = [
  colors.status.error,
  colors.status.warning,
  '#3B82F6',
  colors.status.invite,
  colors.primary.teal,
  '#EC4899',
];

const FALLBACK_TAGS = [
  { tag: 'NurseLife', posts: '24.1K', color: TAG_COLORS[0] },
  { tag: 'ShiftStories', posts: '18.3K', color: TAG_COLORS[1] },
  { tag: 'CodeBlue', posts: '12.7K', color: TAG_COLORS[2] },
  { tag: 'MedSchool', posts: '9.4K', color: TAG_COLORS[3] },
  { tag: 'NCLEX', posts: '7.1K', color: TAG_COLORS[4] },
  { tag: 'NightShift', posts: '5.8K', color: TAG_COLORS[5] },
];

export default function DiscoverScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { data: trendingPosts, refetch: refetchPosts } = useFeed('topToday');
  const { data: featuredCommunities } = useFeaturedCommunities();
  const { data: featuredJobs } = useFeaturedJobs();
  const joinedIds = useAppStore((s) => s.joinedCommunityIds);
  const toggleJoin = useAppStore((s) => s.toggleJoinCommunity);
  const [refreshing, setRefreshing] = useState(false);
  const [trendingTags, setTrendingTags] = useState(FALLBACK_TAGS);
  const [suggestedCreators, setSuggestedCreators] = useState<UserProfile[]>([]);
  const [learnShelf, setLearnShelf] = useState<Post[]>([]);
  const [nightShelf, setNightShelf] = useState<Post[]>([]);

  const loadDiscoverShelves = useCallback(async () => {
    try {
      const [learn, night] = await Promise.all([
        postsService.getDiscoverShelf('learn', 14),
        postsService.getDiscoverShelf('night', 14),
      ]);
      setLearnShelf(learn);
      setNightShelf(night);
    } catch {
      setLearnShelf([]);
      setNightShelf([]);
    }
  }, []);

  useEffect(() => {
    loadDiscoverShelves();
    (async () => {
      try {
        const { data: posts } = await supabase
          .from('posts')
          .select('hashtags')
          .not('hashtags', 'is', null)
          .order('created_at', { ascending: false })
          .limit(200) as { data: { hashtags: string[] }[] | null };

        if (posts && posts.length > 0) {
          const tagCounts = new Map<string, number>();
          for (const p of posts) {
            for (const tag of (p.hashtags ?? [])) {
              tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
            }
          }
          const sorted = [...tagCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([tag, count], i) => ({
              tag,
              posts: formatCount(count),
              color: TAG_COLORS[i % TAG_COLORS.length],
            }));
          if (sorted.length > 0) setTrendingTags(sorted);
        }
      } catch {}

      try {
        const { data: creators } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, role, specialty, city, state, is_verified, follower_count')
          .order('follower_count', { ascending: false })
          .limit(8);

        if (creators && creators.length > 0) {
          setSuggestedCreators((creators as any[]).map((c: any) => ({
            id: c.id,
            displayName: c.display_name,
            avatarUrl: c.avatar_url ?? '',
            role: c.role,
            specialty: c.specialty,
            city: c.city,
            state: c.state,
            isVerified: c.is_verified,
            followerCount: c.follower_count,
            followingCount: 0,
            likeCount: 0,
            postCount: 0,
            firstName: '',
            yearsExperience: 0,
            bio: '',
            badges: [],
            communitiesJoined: [],
            privacyMode: 'public' as const,
            interests: [],
            shiftPreference: 'Day' as const,
          })));
        }
      } catch {}
    })();
  }, [loadDiscoverShelves]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchPosts(), loadDiscoverShelves()]);
    setRefreshing(false);
  }, [refetchPosts, loadDiscoverShelves]);

  const topPosts = (trendingPosts ?? []).slice(0, 12);
  const topCommunities = (featuredCommunities ?? []).slice(0, 8);
  const topJobs = (featuredJobs ?? []).slice(0, 6);

  return (
    <View style={styles.container}>
      <StackScreenHeader
        insetTop={insets.top}
        title="Discover"
        onPressLeft={() => router.back()}
        right={
          <TouchableOpacity onPress={() => router.push('/search')} activeOpacity={0.7} hitSlop={12}>
            <Ionicons name="search" size={iconSize.md} color={colors.dark.text} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary.teal} />}
      >
        {/* For You Banner */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={{ paddingHorizontal: 16, marginTop: 16 }}
          onPress={() => router.push('/(tabs)/feed')}
        >
          <LinearGradient
            colors={[colors.primary.teal + '30', colors.primary.royal + '20', colors.dark.card]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.forYouBanner}
          >
            <View style={styles.forYouLeft}>
              <Ionicons name="sparkles" size={iconSize.xl} color={colors.primary.teal} />
              <View>
                <Text style={styles.forYouTitle}>For You</Text>
                <Text style={styles.forYouSub}>Curated based on your specialty</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={iconSize.md} color={colors.primary.teal} />
          </LinearGradient>
        </TouchableOpacity>

        {/* Trending Hashtags */}
        <Text style={styles.sectionTitle}>Trending Hashtags</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
          {trendingTags.map((t) => (
            <TouchableOpacity
              key={t.tag}
              style={[styles.tagCard, { borderColor: t.color + '40' }]}
              onPress={() => router.push(`/search?q=%23${encodeURIComponent(t.tag)}`)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tagHash, { color: t.color }]}>#</Text>
              <Text style={styles.tagName}>{t.tag}</Text>
              <Text style={styles.tagCount}>{t.posts} posts</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Suggested Creators */}
        <Text style={styles.sectionTitle}>Suggested Creators</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
          {suggestedCreators.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={styles.creatorCard}
              onPress={() => router.push(`/profile/${c.id}`)}
              activeOpacity={0.7}
            >
              <View style={styles.creatorAvatarWrap}>
                {c.avatarUrl ? (
                  <Image source={{ uri: c.avatarUrl }} style={styles.creatorAvatarImg} />
                ) : (
                  <Ionicons name="person" size={26} color={colors.primary.teal} />
                )}
              </View>
              <View style={styles.creatorNameRow}>
                <Text style={styles.creatorName} numberOfLines={1}>{c.displayName}</Text>
                {c.isVerified && <Ionicons name="checkmark-circle" size={12} color={colors.primary.teal} />}
              </View>
              <Text style={styles.creatorRole}>{c.role} · {c.specialty}</Text>
              <Text style={styles.creatorFollowers}>{formatCount(c.followerCount)} followers</Text>
              <TouchableOpacity style={styles.followBtn} activeOpacity={0.7}>
                <Text style={styles.followBtnText}>Follow</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {learnShelf.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Learn on Pulse</Text>
            <Text style={styles.shelfSubtitle}>Education-tagged clips &amp; carousels</Text>
            <FlatList
              data={learnShelf}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hScroll}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.postCard}
                  onPress={() => router.push(`/post/${item.id}`)}
                  activeOpacity={0.8}
                >
                  <RecentMediaThumb post={item} style={styles.postImage} />
                  <View style={styles.postOverlay}>
                    <Text style={styles.postCaption} numberOfLines={2}>{item.caption}</Text>
                    <View style={styles.postStats}>
                      <Ionicons name="heart" size={12} color={colors.dark.text} />
                      <Text style={styles.postStatText}>{formatCount(item.likeCount)}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
            />
          </>
        )}

        {nightShelf.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Night shift</Text>
            <Text style={styles.shelfSubtitle}>Stories from the late chart</Text>
            <FlatList
              data={nightShelf}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hScroll}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.postCard}
                  onPress={() => router.push(`/post/${item.id}`)}
                  activeOpacity={0.8}
                >
                  <RecentMediaThumb post={item} style={styles.postImage} />
                  <View style={styles.postOverlay}>
                    <Text style={styles.postCaption} numberOfLines={2}>{item.caption}</Text>
                    <View style={styles.postStats}>
                      <Ionicons name="heart" size={12} color={colors.dark.text} />
                      <Text style={styles.postStatText}>{formatCount(item.likeCount)}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
            />
          </>
        )}

        <Text style={styles.sectionTitle}>Trending Today</Text>
        <FlatList
          data={topPosts}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hScroll}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.postCard}
              onPress={() => router.push(`/post/${item.id}`)}
              activeOpacity={0.8}
            >
              <RecentMediaThumb post={item} style={styles.postImage} />
              <View style={styles.postOverlay}>
                <Text style={styles.postCaption} numberOfLines={2}>{item.caption}</Text>
                <View style={styles.postStats}>
                  <Ionicons name="heart" size={12} color={colors.dark.text} />
                  <Text style={styles.postStatText}>{formatCount(item.likeCount)}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />

        {topCommunities.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Popular Communities</Text>
            <FlatList
              data={topCommunities}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hScroll}
              renderItem={({ item }) => {
                const isJoined = joinedIds.has(item.id);
                return (
                  <TouchableOpacity
                    style={styles.communityCard}
                    onPress={() => {
                      primeCommunityDetailCache(queryClient, item);
                      router.push(`/communities/${item.slug}`);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.communityIcon, { backgroundColor: (item.accentColor ?? colors.primary.teal) + '20' }]}>
                      <Text style={styles.communityEmoji}>{item.icon}</Text>
                    </View>
                    <Text style={styles.communityName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.communityMembers}>{formatCount(item.memberCount)} members</Text>
                    <TouchableOpacity
                      style={[styles.joinBtn, isJoined && styles.joinedBtn]}
                      onPress={() => toggleJoin(item.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.joinText, isJoined && styles.joinedText]}>
                        {isJoined ? 'Joined' : 'Join'}
                      </Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              }}
            />
          </>
        )}

        {topJobs.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Hot Jobs</Text>
            {topJobs.map((job) => (
              <TouchableOpacity
                key={job.id}
                style={styles.jobRow}
                onPress={() => router.push(`/jobs/${job.id}`)}
                activeOpacity={0.7}
              >
                <View style={styles.jobIcon}>
                  <Ionicons name="briefcase" size={20} color={colors.primary.teal} />
                </View>
                <View style={styles.jobBody}>
                  <Text style={styles.jobTitle}>{job.title}</Text>
                  <Text style={styles.jobMeta}>{job.employerName} · {job.city}, {job.state}</Text>
                </View>
                <Ionicons name="chevron-forward" size={iconSize.sm} color={colors.dark.textMuted} />
              </TouchableOpacity>
            ))}
          </>
        )}

        <View style={styles.scrollBottomInset} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  forYouBannerWrap: { paddingHorizontal: layout.screenPadding, marginTop: spacing.lg },
  sectionTitle: {
    ...typography.h2,
    fontSize: 18,
    color: colors.dark.text,
    paddingHorizontal: layout.screenPadding,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  shelfSubtitle: {
    ...typography.metadata,
    color: colors.dark.textMuted,
    paddingHorizontal: layout.screenPadding,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
    fontSize: 12,
    fontWeight: '600',
  },
  hScroll: { paddingHorizontal: layout.screenPadding, gap: spacing.sm + 2 },

  postCard: {
    width: CARD_W,
    height: CARD_W * 1.4,
    borderRadius: borderRadius.button,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.dark.border,
  },
  postImage: { width: '100%', height: '100%' },
  postOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.sm + 2,
    backgroundColor: colors.glass.heavy,
    borderBottomLeftRadius: borderRadius.button,
    borderBottomRightRadius: borderRadius.button,
  },
  postCaption: {
    ...typography.metadata,
    fontSize: 12,
    color: colors.dark.text,
    fontWeight: '600',
    lineHeight: 16,
  },
  postStats: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  postStatText: { ...typography.overlayMicro, color: colors.dark.text, fontWeight: '600' },

  communityCard: {
    width: 140,
    alignItems: 'center',
    gap: spacing.sm - 2,
    padding: spacing.md + spacing.xs,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.dark.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.dark.border,
  },
  communityIcon: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  communityEmoji: { fontSize: 22 },
  communityName: { fontSize: 13, fontWeight: '700', color: colors.dark.text, textAlign: 'center' },
  communityMembers: { fontSize: 11, color: colors.dark.textMuted },
  joinBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm - 2,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary.teal,
  },
  joinedBtn: { backgroundColor: colors.dark.cardAlt },
  joinText: { fontSize: 12, fontWeight: '700', color: colors.dark.text },
  joinedText: { color: colors.dark.textMuted },

  jobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dark.border,
  },
  jobIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary.teal + '15',
    alignItems: 'center', justifyContent: 'center',
  },
  jobBody: { flex: 1 },
  jobTitle: { ...typography.creatorName, color: colors.dark.text },
  jobMeta: { ...typography.metadata, color: colors.dark.textMuted, marginTop: 2 },

  forYouBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: borderRadius.button,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.primary.teal + '30',
  },
  forYouLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  scrollBottomInset: { height: 100 },
  forYouEmoji: { fontSize: 28 },
  forYouTitle: { ...typography.sectionTitle, fontSize: 16, fontWeight: '800', color: colors.dark.text },
  forYouSub: { ...typography.metadata, marginTop: 2, color: colors.dark.textSecondary },

  tagCard: {
    width: 120,
    padding: spacing.md + spacing.xs,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
    backgroundColor: colors.dark.card,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  tagHash: { fontSize: 24, fontWeight: '900' },
  tagName: { fontSize: 13, fontWeight: '700', color: colors.dark.text },
  tagCount: { fontSize: 11, color: colors.dark.textMuted },

  creatorCard: {
    width: 130,
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.md + spacing.xs,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.dark.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.dark.border,
  },
  creatorAvatarWrap: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: colors.primary.teal + '15',
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  creatorAvatarImg: { width: 52, height: 52, borderRadius: 26 },
  creatorNameRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  creatorName: { fontSize: 13, fontWeight: '700', color: colors.dark.text },
  creatorRole: { fontSize: 11, color: colors.dark.textSecondary },
  creatorFollowers: { fontSize: 10, color: colors.dark.textMuted },
  followBtn: {
    marginTop: spacing.sm - 2,
    paddingHorizontal: spacing.lg + 2,
    paddingVertical: spacing.sm - 2,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary.royal,
  },
  followBtnText: { fontSize: 11, fontWeight: '700', color: colors.dark.text },
});
