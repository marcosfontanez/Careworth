import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LoadingState } from '@/components/ui/LoadingState';
import { useCommunity, useCommunityPosts, useCircleThreads, useLikedPostIds } from '@/hooks/useQueries';
import { CircleThreadCard } from '@/components/circles/CircleThreadCard';
import { CircleRoomHeader } from '@/components/circles/CircleRoomHeader';
import { CircleHighlightsRow } from '@/components/circles/CircleHighlightsRow';
import { CircleModeChips, type CircleMode } from '@/components/circles/CircleModeChips';
import { CirclePostCard } from '@/components/circles/CirclePostCard';
import { useAppStore } from '@/store/useAppStore';
import { useAuth } from '@/contexts/AuthContext';
import { communityService } from '@/services/community';
import { communitiesService, postsService } from '@/services/supabase';
import { colors } from '@/theme';
import { shareCommunity, sharePostMenu } from '@/lib/share';
import { useToast } from '@/components/ui/Toast';
import { isAnonymousConfessionCircle } from '@/lib/anonymousCircle';
import { getCircleAccent } from '@/lib/circleAccents';
import { bumpPostCount } from '@/lib/postCacheUpdates';
import { enqueueAction } from '@/lib/offlineQueue';
import type { CircleThread, Post } from '@/types';

/** Hot score used to rank "Top" — same shape we used in the previous version. */
function hotScore(post: Post): number {
  const age = (Date.now() - new Date(post.createdAt).getTime()) / 3600000;
  return (post.likeCount + post.commentCount * 2 + post.shareCount * 3) / Math.pow(age + 2, 1.5);
}

export default function CommunityDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { user } = useAuth();
  const { data: community, isLoading, refetch } = useCommunity(slug);
  const joinedIds = useAppStore((s) => s.joinedCommunityIds);
  const setCommunityJoined = useAppStore((s) => s.setCommunityJoined);

  const [mode, setMode] = useState<CircleMode>('top');
  const [refreshing, setRefreshing] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  /** Local liked-set hydrated from the server query (mirrors feed.tsx so a
   *  user's existing likes show as filled hearts the moment the room opens). */
  const { data: likedIdsArr = [] } = useLikedPostIds(user?.id);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const likedSig = likedIdsArr.join('|');
  useEffect(() => {
    setLikedPosts(new Set(likedIdsArr));
  }, [likedSig, likedIdsArr]);

  const { data: allPosts, refetch: refetchPosts } = useCommunityPosts(community?.id ?? '');
  const { data: circleThreads = [], refetch: refetchThreads } = useCircleThreads(slug);

  const { data: liveStats } = useQuery({
    queryKey: ['communityCardStats', community?.id],
    queryFn: async () => {
      const m = await communitiesService.getCardStatsForIds([community!.id]);
      return m.get(community!.id) ?? null;
    },
    enabled: !!community?.id,
    staleTime: 30_000,
  });

  const threadsSorted = useMemo(() => {
    return [...circleThreads].sort(
      (a, b) =>
        b.reactionCount + b.replyCount * 2 - (a.reactionCount + a.replyCount * 2),
    );
  }, [circleThreads]);

  const postsList = useMemo(() => {
    const raw = [...(allPosts ?? [])];
    if (mode === 'video') {
      const posts = raw.filter((p) => p.type === 'video' || p.type === 'image');
      posts.sort((a, b) => hotScore(b) - hotScore(a));
      return posts;
    }
    if (mode === 'fresh') {
      return raw.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    if (mode === 'top') {
      return raw.sort((a, b) => hotScore(b) - hotScore(a));
    }
    return raw;
  }, [allPosts, mode]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchPosts(), refetchThreads()]);
    setRefreshing(false);
  }, [refetch, refetchPosts, refetchThreads]);

  const handleJoinPress = useCallback(async () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    const cid = community?.id;
    if (!cid) return;
    try {
      const joined = await communityService.toggleJoin(cid);
      setCommunityJoined(cid, joined);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['community', slug] }),
        queryClient.invalidateQueries({ queryKey: ['circles', 'home'] }),
        queryClient.invalidateQueries({ queryKey: ['communityCardStats', cid] }),
        queryClient.invalidateQueries({ queryKey: ['communities'] }),
      ]);
    } catch {
      /* keep optimistic UI */
    }
  }, [user, community?.id, slug, setCommunityJoined, queryClient, router]);

  const handleCreatePost = useCallback(
    (intent?: 'meme' | 'thread' | 'question' | 'video') => {
      if (!community) return;
      const params = new URLSearchParams({
        communityId: community.id,
        communityName: community.name,
        communitySlug: community.slug,
      });
      if (intent) params.set('intent', intent);
      router.push(`/communities/create-post?${params.toString()}`);
    },
    [community, router],
  );

  /* ---------- Per-card actions (reuse the same patterns as feed.tsx) ---------- */

  const handleReact = useCallback(
    async (post: Post) => {
      if (!user) return;
      const wasLiked = likedPosts.has(post.id);
      setLikedPosts((prev) => {
        const next = new Set(prev);
        if (wasLiked) next.delete(post.id);
        else next.add(post.id);
        return next;
      });
      bumpPostCount(post.id, 'likeCount', wasLiked ? -1 : 1);
      try {
        await postsService.toggleLike(user.id, post.id);
      } catch {
        enqueueAction({
          type: wasLiked ? 'unlike_post' : 'like_post',
          payload: { postId: post.id, userId: user.id },
        }).catch(() => {});
      }
    },
    [user, likedPosts],
  );

  const handleShare = useCallback(
    async (post: Post) => {
      /**
       * Bring the same two-option share chooser we use on the main feed
       * into the room so members can pin a great circle post to their My
       * Pulse with one tap. We carry the circle slug through so the pin
       * opens back into the room-scoped detail screen (preserving accent +
       * anonymous masking). Anonymous confession rooms opt out of the
       * Pulse option — pinning there would undo the whole point of the
       * room by attaching the poster's handle to a public profile card.
       */
      const anonymous = isAnonymousConfessionCircle(slug);
      await sharePostMenu(
        { ...post, isAnonymous: post.isAnonymous || anonymous },
        {
          toast: toast.show,
          queryClient,
          circleSlug: slug,
          allowPulseShare: !anonymous,
        },
      );
    },
    [slug, toast, queryClient],
  );

  if (isLoading || !community) return <LoadingState />;

  const isJoined = joinedIds.has(community.id);
  const isAnonCircle = isAnonymousConfessionCircle(slug);
  const accent = getCircleAccent(slug, community.accentColor);

  const memberCountLive = liveStats?.memberCount ?? community.memberCount;
  const onlineCount = liveStats?.onlineCount ?? 0;

  const flatData: (Post | CircleThread)[] = mode === 'questions' ? threadsSorted : postsList;

  const ListHeader = (
    <View>
      <CircleRoomHeader
        insetTop={insets.top}
        iconEmoji={community.icon}
        name={community.name}
        /** Prefer the curated brief description when the room has one, so
         *  the banner reads cleaner than the older free-form DB blurb. */
        description={accent.description ?? community.description}
        memberCount={memberCountLive}
        onlineCount={onlineCount}
        isJoined={isJoined}
        accent={accent}
        showShare={!isAnonCircle}
        onBack={() => router.back()}
        onShare={() => shareCommunity(community.slug, community.name)}
        onMore={() => setShowAbout((v) => !v)}
        onJoin={handleJoinPress}
        onCreatePost={() => handleCreatePost()}
      />

      {showAbout && (
        <AboutSheet
          accent={accent.color}
          description={community.description}
          categories={community.categories}
          onClose={() => setShowAbout(false)}
        />
      )}

      <CircleHighlightsRow
        posts={allPosts ?? []}
        threads={circleThreads}
        accent={accent}
        /** Anonymous rooms must never out a "Top Creator" — defeats the
         *  purpose of the room. Suppress the card entirely. */
        hideTopCreator={isAnonCircle}
        onSelectPost={(id) =>
          router.push(`/post/${id}?circle=${encodeURIComponent(community.slug)}` as any)
        }
        onSelectThread={(id) =>
          router.push(`/communities/${community.slug}/thread/${id}` as any)
        }
        onSelectCreator={(uid) => router.push(`/profile/${uid}`)}
      />

      <CircleModeChips
        active={mode}
        accent={accent}
        onSelect={setMode}
        /** Anonymous rooms are text-first; the Video tab would always be
         *  empty for these communities, so we hide it instead. */
        hideVideo={isAnonCircle}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={flatData}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) =>
          mode === 'questions' ? (
            <CircleThreadCard
              thread={item as CircleThread}
              circleName={community.name}
              accent={accent.color}
              isAnonymousRoom={isAnonCircle}
              onPress={() =>
                router.push(`/communities/${community.slug}/thread/${(item as CircleThread).id}` as any)
              }
            />
          ) : (
            <CirclePostCard
              post={item as Post}
              accent={accent}
              isAnonymousRoom={isAnonCircle}
              isLiked={likedPosts.has((item as Post).id)}
              onPress={() =>
                router.push(
                  `/post/${(item as Post).id}?circle=${encodeURIComponent(community.slug)}` as any,
                )
              }
              onProfile={() => router.push(`/profile/${(item as Post).creatorId}`)}
              onReply={() =>
                router.push(
                  `/comments/${(item as Post).id}?circle=${encodeURIComponent(community.slug)}` as any,
                )
              }
              onReact={() => handleReact(item as Post)}
              onShare={() => handleShare(item as Post)}
            />
          )
        }
        ListHeaderComponent={ListHeader}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent.color} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={40} color={colors.neutral.midGray} />
            <Text style={styles.emptyTitle}>
              {mode === 'questions' ? 'No threads yet' : 'No posts yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {mode === 'questions'
                ? 'Ask a question — your crew shows up fast.'
                : 'Be the first to start a conversation!'}
            </Text>
            <TouchableOpacity
              onPress={() => handleCreatePost()}
              activeOpacity={0.85}
              style={[styles.emptyCta, { backgroundColor: accent.color }]}
            >
              <Ionicons name="create" size={16} color="#FFFFFF" />
              <Text style={styles.emptyCtaText}>Create the first post</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

/**
 * Slim About sheet. Replaces the larger guidelines modal from the old
 * forum-style room with a lighter inline panel that stays consistent with
 * the new premium look. Triggered via the header's overflow button.
 */
function AboutSheet({
  accent,
  description,
  categories,
  onClose,
}: {
  accent: string;
  description: string;
  categories: string[];
  onClose: () => void;
}) {
  const RULES = [
    'Be respectful and supportive of fellow healthcare workers',
    'No patient information — protect HIPAA at all times',
    'Stay on topic — keep discussions relevant to the community',
    'No spam, self-promotion, or recruiting without approval',
  ];
  return (
    <View style={aboutStyles.card}>
      <View style={aboutStyles.header}>
        <Text style={aboutStyles.title}>About this circle</Text>
        <TouchableOpacity onPress={onClose} hitSlop={6}>
          <Ionicons name="close" size={20} color={colors.dark.textMuted} />
        </TouchableOpacity>
      </View>
      <Text style={aboutStyles.desc}>{description}</Text>
      <View style={aboutStyles.divider} />
      <Text style={aboutStyles.section}>Guidelines</Text>
      {RULES.map((rule, i) => (
        <View key={i} style={aboutStyles.ruleRow}>
          <View style={[aboutStyles.ruleNum, { backgroundColor: `${accent}20` }]}>
            <Text style={[aboutStyles.ruleNumText, { color: accent }]}>{i + 1}</Text>
          </View>
          <Text style={aboutStyles.ruleText}>{rule}</Text>
        </View>
      ))}
      {categories.length > 0 && (
        <>
          <View style={aboutStyles.divider} />
          <Text style={aboutStyles.section}>Categories</Text>
          <View style={aboutStyles.catRow}>
            {categories.map((cat, i) => (
              <View key={i} style={aboutStyles.catChip}>
                <Text style={aboutStyles.catText}>{cat}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const aboutStyles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginTop: 10,
    backgroundColor: colors.dark.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 15, fontWeight: '800', color: colors.dark.text },
  desc: { fontSize: 13.5, color: colors.dark.textSecondary, lineHeight: 19 },
  divider: { height: 1, backgroundColor: colors.dark.border, marginVertical: 12 },
  section: { fontSize: 13, fontWeight: '700', color: colors.dark.text, marginBottom: 8 },
  ruleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
  ruleNum: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  ruleNumText: { fontSize: 11, fontWeight: '800' },
  ruleText: { flex: 1, fontSize: 12.5, color: colors.dark.textSecondary, lineHeight: 17 },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  catChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: colors.dark.cardAlt },
  catText: { fontSize: 12, fontWeight: '600', color: colors.dark.textSecondary },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.dark.text },
  emptySubtitle: { fontSize: 14, color: colors.dark.textMuted, textAlign: 'center' },
  emptyCta: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  emptyCtaText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
});
