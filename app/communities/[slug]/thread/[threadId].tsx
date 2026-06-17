import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { EquippedBorderRenderer } from '@/components/borders/EquippedBorderRenderer';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { openPulsePage } from '@/lib/navigation/pulsePageRoutes';
import { hrefCommunity } from '@/lib/communityRoutes';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCircleThread, useCircleThreadReplies, useCommunity, useCanModerateCircle, useCircleThreadReaction } from '@/hooks/useQueries';
import { useCircleReplyHelpfulMap } from '@/hooks/useCircleQueries';
import { circleModerationService } from '@/services/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { CircleReplyItem } from '@/components/circles/CircleReplyItem';
import { CircleReplySortBar, type CircleReplySort } from '@/components/circles/CircleReplySortBar';
import { CircleEditFlairSheet } from '@/components/circles/CircleEditFlairSheet';
import { ShareToMyPulseButton } from '@/components/circles/ShareToMyPulseButton';
import { ReportModal } from '@/components/ui/ReportModal';
import { useAuth } from '@/contexts/AuthContext';
import { useAppStore } from '@/store/useAppStore';
import { communityService } from '@/services';
import { colors, borderRadius } from '@/theme';
import { formatCount, timeAgo } from '@/utils/format';
import type { CircleReply, CreatorSummary } from '@/types';
import { circleContentService } from '@/services/circleContent';
import { sortCircleReplies } from '@/lib/circleReplySort';
import { circleContentKeys } from '@/lib/queryKeys';
import { looksLikeRlsPolicyDenial } from '@/services/supabase/posts';
import { shareCircleThread } from '@/lib/share';
import { setThreadReadReplyCount } from '@/lib/circleExperience';
import { pulseImageListThumbProps } from '@/lib/pulseImage';
import { enqueueAction } from '@/lib/offlineQueue';
import { MentionAutocomplete } from '@/components/ui/MentionAutocomplete';
import { AccentComposerFrame, AccentCharCount } from '@/components/ui/AccentComposerFrame';
import { KeyboardAwareRoot } from '@/components/ui/KeyboardAwareRoot';
import { useKeyboardBottomInset } from '@/hooks/useKeyboardBottomInset';
import { composerDockPadding } from '@/lib/keyboardAware';
import { CommentRichText } from '@/components/ui/CommentRichText';
import { isAnonymousConfessionCircle, anonymousDisplayName } from '@/lib/anonymousCircle';
import { CIRCLE_THREAD_REMOVED_MESSAGE, CIRCLE_PENDING_REVIEW_MESSAGE, circleContentIsPubliclyVisible } from '@/lib/circleModeration';
import { flairLabelForThread, type CircleFlairTag } from '@/lib/circleFlairs';
import { getCircleAccent } from '@/lib/circleAccents';
import { invalidateCircleThreadFlairCaches, patchCircleThreadInCaches } from '@/lib/circleThreadCache';
import { ProfileNeonPills } from '@/components/mypage/ProfileNeonPills';
import { buildNeonPillTags } from '@/lib/buildNeonPillTags';

const EMPTY_HELPFUL_SET = new Set<string>();

export default function CircleThreadDetailScreen() {
  const { slug: slugRaw, threadId: threadIdRaw } = useLocalSearchParams<{ slug: string; threadId: string }>();
  const slug = Array.isArray(slugRaw) ? slugRaw[0] : slugRaw;
  const threadId = Array.isArray(threadIdRaw) ? threadIdRaw[0] : threadIdRaw;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const keyboardInset = useKeyboardBottomInset();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const joinedIds = useAppStore((s) => s.joinedCommunityIds);
  const setCommunityJoined = useAppStore((s) => s.setCommunityJoined);
  const { data: thread, isLoading, isError: threadError, refetch } = useCircleThread(threadId);
  const { data: community } = useCommunity(slug);
  const modCommunityId = community?.id ?? '';
  const { data: canModerate = false } = useCanModerateCircle(modCommunityId);
  const { data: viewerReacted = false } = useCircleThreadReaction(threadId, user?.id);
  const [localReacted, setLocalReacted] = useState<boolean | null>(null);
  const [localReactionCount, setLocalReactionCount] = useState<number | null>(null);
  const reacted = localReacted ?? viewerReacted;
  const reactionCount = localReactionCount ?? thread?.reactionCount ?? 0;
  const {
    data: replies = [],
    refetch: refetchReplies,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useCircleThreadReplies(threadId, thread ?? null);
  const [refreshing, setRefreshing] = useState(false);
  const [draft, setDraft] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReplyId, setReportReplyId] = useState<string | null>(null);
  const [replySort, setReplySort] = useState<CircleReplySort>('new');
  const [helpfulOverrides, setHelpfulOverrides] = useState<
    Record<string, { marked: boolean; count: number }>
  >({});
  const [helpfulTogglingId, setHelpfulTogglingId] = useState<string | null>(null);
  const [showEditFlair, setShowEditFlair] = useState(false);
  const [savingFlair, setSavingFlair] = useState(false);

  const replyIds = useMemo(() => replies.map((r) => r.id), [replies]);
  const replyIdsSig = useMemo(() => [...replyIds].sort().join(','), [replyIds]);
  const { data: helpfulMarkedIds } = useCircleReplyHelpfulMap(threadId, replyIds);
  const helpfulMarkedSet = helpfulMarkedIds ?? EMPTY_HELPFUL_SET;

  const sortedReplies = useMemo(() => {
    const merged = replies.map((r) => {
      const o = helpfulOverrides[r.id];
      if (!o) return r;
      return { ...r, helpfulCount: o.count };
    });
    return sortCircleReplies(merged, replySort);
  }, [replies, replySort, helpfulOverrides]);

  useEffect(() => {
    setHelpfulOverrides({});
  }, [replyIdsSig]);

  const threadReplyMax = 2000;

  useFocusEffect(
    useCallback(() => {
      if (!threadId || !thread) return;
      void setThreadReadReplyCount(threadId, thread.replyCount);
    }, [threadId, thread?.replyCount, thread?.id]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchReplies()]);
    setRefreshing(false);
  }, [refetch, refetchReplies]);

  const openModeratorActions = useCallback(() => {
    if (!threadId) return;
    Alert.alert('Moderate discussion', 'Choose an action for this thread.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Edit flair',
        onPress: () => setShowEditFlair(true),
      },
      {
        text: 'Queue for review',
        onPress: () => {
          void circleModerationService
            .markThreadPendingReview(threadId)
            .then(() => {
              Alert.alert('Queued', 'This discussion is hidden pending review.');
              router.back();
            })
            .catch((e: Error) => Alert.alert('Could not queue', e.message));
        },
      },
      {
        text: 'Hide',
        onPress: () => {
          void circleModerationService
            .hideThread(threadId)
            .then(() => {
              Alert.alert('Hidden', 'This discussion is hidden from the circle room.');
              void refetch();
            })
            .catch((e: Error) => Alert.alert('Could not hide', e.message));
        },
      },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          void circleModerationService
            .removeThread(threadId)
            .then(() => {
              router.back();
            })
            .catch((e: Error) => Alert.alert('Could not remove', e.message));
        },
      },
    ]);
  }, [threadId, refetch, router]);

  const openReplyModeratorActions = useCallback(
    (replyId: string) => {
      Alert.alert('Moderate reply', 'Choose an action for this reply.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Queue for review',
          onPress: () => {
            void circleModerationService
              .markReplyPendingReview(replyId)
              .then(() => {
                void refetchReplies();
              })
              .catch((e: Error) => Alert.alert('Could not queue', e.message));
          },
        },
        {
          text: 'Hide',
          onPress: () => {
            void circleModerationService
              .hideReply(replyId)
              .then(() => void refetchReplies())
              .catch((e: Error) => Alert.alert('Could not hide', e.message));
          },
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void circleModerationService
              .removeReply(replyId)
              .then(() => void refetchReplies())
              .catch((e: Error) => Alert.alert('Could not remove', e.message));
          },
        },
      ]);
    },
    [refetchReplies],
  );

  const toggleReaction = useCallback(async () => {
    if (!threadId) return;
    if (!user) {
      Alert.alert('Sign in required', 'Sign in to react to this discussion.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign in', onPress: () => router.push('/auth/login') },
      ]);
      return;
    }
    const nextReacted = !reacted;
    setLocalReacted(nextReacted);
    setLocalReactionCount(Math.max(0, reactionCount + (nextReacted ? 1 : -1)));
    try {
      await circleContentService.toggleThreadReaction(threadId);
      void queryClient.invalidateQueries({ queryKey: ['circleThreadReaction', threadId, user.id] });
      void refetch();
    } catch (e: unknown) {
      setLocalReacted(null);
      setLocalReactionCount(null);
      const msg = e instanceof Error ? e.message : 'Could not update reaction.';
      Alert.alert('Reaction failed', msg);
    }
  }, [threadId, user, reacted, reactionCount, queryClient, refetch, router]);

  const toggleReplyHelpful = useCallback(
    async (reply: CircleReply) => {
      if (!user) {
        Alert.alert('Sign in required', 'Sign in to mark replies as Helpful.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign in', onPress: () => router.push('/auth/login') },
        ]);
        return;
      }
      if (reply.isModerationRemoved || helpfulTogglingId === reply.id) return;

      const prevMarked = helpfulOverrides[reply.id]?.marked ?? helpfulMarkedSet.has(reply.id);
      const prevCount = helpfulOverrides[reply.id]?.count ?? reply.helpfulCount ?? 0;
      const nextMarked = !prevMarked;
      const nextCount = Math.max(0, prevCount + (nextMarked ? 1 : -1));

      setHelpfulTogglingId(reply.id);
      setHelpfulOverrides((m) => ({
        ...m,
        [reply.id]: { marked: nextMarked, count: nextCount },
      }));

      try {
        const result = await circleContentService.toggleReplyHelpful(reply.id);
        setHelpfulOverrides((m) => ({
          ...m,
          [reply.id]: { marked: result.reacted, count: result.helpfulCount },
        }));
        void queryClient.invalidateQueries({
          queryKey: circleContentKeys.viewerReplyHelpful(threadId!, user.id, replyIdsSig),
        });
        void refetchReplies();
      } catch (e: unknown) {
        setHelpfulOverrides((m) => {
          const next = { ...m };
          delete next[reply.id];
          return next;
        });
        const msg = e instanceof Error ? e.message : 'Could not update Helpful mark.';
        Alert.alert('Helpful failed', msg);
      } finally {
        setHelpfulTogglingId(null);
      }
    },
    [
      user,
      helpfulOverrides,
      helpfulMarkedSet,
      helpfulTogglingId,
      queryClient,
      threadId,
      replyIdsSig,
      refetchReplies,
      router,
    ],
  );

  if (isLoading) return <LoadingState message="Loading thread…" />;
  if (threadError) {
    return (
      <View style={[styles.flex, { paddingTop: insets.top }]}>
        <ErrorState
          title="Couldn’t load this thread"
          subtitle="Check your connection and try again."
          onRetry={() => void refetch()}
        />
        <TouchableOpacity
          onPress={() => router.replace(hrefCommunity(slug))}
          style={styles.backLink}
          accessibilityRole="button"
        >
          <Text style={styles.backLinkText}>Back to Circle</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (!thread) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ErrorState
          title="Thread not found"
          subtitle={CIRCLE_PENDING_REVIEW_MESSAGE}
          icon="document-text-outline"
        />
        <TouchableOpacity
          onPress={() => router.replace(hrefCommunity(slug))}
          style={styles.backLink}
          accessibilityRole="button"
        >
          <Text style={styles.backLinkText}>Back to Circle</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => void refetch()} style={styles.backLink}>
          <Text style={[styles.backLinkText, { color: colors.primary.teal }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }
  const author: CreatorSummary =
    thread.author ?? {
      id: thread.authorId,
      displayName: 'Member',
      avatarUrl: '',
      role: '',
      specialty: '',
      city: '',
      state: '',
      isVerified: false,
    };

  const isAnonRoom = isAnonymousConfessionCircle(slug);
  // Anonymous rooms NEVER expose the real name — stable per-thread pseudonym.
  const threadDisplayName = isAnonRoom
    ? anonymousDisplayName(thread.authorId, thread.id)
    : author.displayName;

  const accent = community?.accentColor ?? colors.primary.teal;
  const composerAccent = useMemo(
    () => getCircleAccent(slug, community?.accentColor ?? null),
    [slug, community?.accentColor],
  );
  const circleName = community?.name ?? thread.circleSlug;
  const circleId = thread.circleId ?? community?.id ?? '';
  const isJoined = circleId ? joinedIds.has(circleId) : false;
  const isAuthor = !!user?.id && thread.authorId === user.id;
  const canEditFlair =
    !!user &&
    (canModerate ||
      (isAuthor && circleContentIsPubliclyVisible(thread.moderationStatus ?? 'active')));

  const handleSaveFlair = async (flairTag: CircleFlairTag | null) => {
    if (!threadId || !user) return;
    setSavingFlair(true);
    try {
      const updated = await circleContentService.updateThreadFlair(
        threadId,
        flairTag,
        thread.kind,
        user.id,
      );
      patchCircleThreadInCaches(queryClient, updated);
      invalidateCircleThreadFlairCaches(queryClient, updated);
      setShowEditFlair(false);
    } catch (e: unknown) {
      if (looksLikeRlsPolicyDenial(e)) {
        Alert.alert('Cannot edit flair', 'You do not have permission to change this flair.');
        return;
      }
      Alert.alert('Could not save flair', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setSavingFlair(false);
    }
  };

  const promptJoinToReply = useCallback(() => {
    if (!circleId) return;
    Alert.alert(
      'Join to reply',
      'Join this Circle to post or reply.',
      [
        { text: 'Not now', style: 'cancel' },
        {
          text: 'Join for updates and posting',
          onPress: () => {
            if (!user) {
              router.push('/auth/login');
              return;
            }
            void (async () => {
              try {
                const joined = await communityService.toggleJoin(circleId, { notifyNewPosts: true });
                setCommunityJoined(circleId, joined);
              } catch {
                Alert.alert('Could not join', 'Try again from the Circle room.');
              }
            })();
          },
        },
      ],
    );
  }, [circleId, user, router, setCommunityJoined]);

  return (
    <KeyboardAwareRoot style={styles.flex} keyboardVerticalOffset={insets.top + 8}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color={colors.dark.text} />
        </TouchableOpacity>
        <View style={styles.headerMid}>
          <Text style={styles.headerCircle} numberOfLines={1}>
            {circleName}
          </Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            Thread · {formatCount(thread.replyCount)} replies
          </Text>
        </View>
        <View style={styles.headerActions}>
          {!isAnonRoom ? (
            <TouchableOpacity
              onPress={() => shareCircleThread(slug, threadId, thread.title)}
              style={styles.iconBtn}
              hitSlop={8}
              accessibilityLabel="Share discussion"
            >
              <Ionicons name="share-outline" size={22} color={colors.dark.text} />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            onPress={() => setReportOpen(true)}
            style={styles.iconBtn}
            hitSlop={8}
            accessibilityLabel="Report discussion"
          >
            <Ionicons name="flag-outline" size={22} color={colors.dark.textMuted} />
          </TouchableOpacity>
          {canModerate ? (
            <TouchableOpacity
              onPress={openModeratorActions}
              style={styles.iconBtn}
              hitSlop={8}
              accessibilityLabel="Moderate discussion"
            >
              <Ionicons name="shield-outline" size={22} color={colors.primary.teal} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent} />
        }
      >
        <View style={[styles.hero, { borderLeftColor: accent + 'CC' }]}>
          <View style={styles.authorRow}>
            {isAnonRoom ? (
              <View style={[styles.avatar, styles.anonAvatar]}>
                <Ionicons name="eye-off-outline" size={22} color={colors.dark.textMuted} />
              </View>
            ) : (
              author.id ? (
                <TouchableOpacity
                  onPress={() => openPulsePage(router, author.id)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Open profile"
                >
                  <EquippedBorderRenderer
                    size={40}
                    avatarUrl={author.avatarUrl}
                    prioritizeRemoteAvatar
                    ringColor={colors.dark.border}
                    pulseAvatarFrame={author.pulseAvatarFrame}
                    userId={author.id}
                    priority="circle-thread-header"
                  />
                </TouchableOpacity>
              ) : (
                <EquippedBorderRenderer
                  size={40}
                  avatarUrl={author.avatarUrl}
                  prioritizeRemoteAvatar
                  ringColor={colors.dark.border}
                  pulseAvatarFrame={author.pulseAvatarFrame}
                  userId={author.id}
                  priority="circle-thread-header"
                />
              )
            )}
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={styles.nameRow}>
                <Text style={styles.displayName}>{threadDisplayName}</Text>
                {!isAnonRoom && author.isVerified ? (
                  <Ionicons name="checkmark-circle" size={14} color={colors.primary.teal} />
                ) : null}
              </View>
              <Text style={styles.meta}>
                {isAnonRoom
                  ? `Anonymous · thread starter · ${timeAgo(thread.createdAt)}`
                  : timeAgo(thread.createdAt)}
              </Text>
              {!isAnonRoom && buildNeonPillTags(author).length > 0 ? (
                <ProfileNeonPills tags={buildNeonPillTags(author)} style={{ marginTop: 6 }} />
              ) : null}
            </View>
          </View>

          <View style={styles.pillRow}>
            {canEditFlair ? (
              <TouchableOpacity
                style={[styles.kindPill, styles.kindPillEditable, { borderColor: accent + '55' }]}
                onPress={() => setShowEditFlair(true)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`Edit flair: ${flairLabelForThread(thread)}`}
              >
                <Text style={[styles.kindText, { color: accent }]}>{flairLabelForThread(thread)}</Text>
                <Ionicons name="create-outline" size={12} color={accent} />
              </TouchableOpacity>
            ) : (
              <View style={[styles.kindPill, { borderColor: accent + '55' }]}>
                <Text style={[styles.kindText, { color: accent }]}>{flairLabelForThread(thread)}</Text>
              </View>
            )}
          </View>

          <Text style={styles.title}>{thread.title}</Text>
          <CommentRichText
            text={thread.body}
            style={styles.body}
            mentionsInteractive={!isAnonRoom}
            linksInteractive={!isAnonRoom}
          />

          {thread.mediaThumbUrl ? (
            <Image
              source={{ uri: thread.mediaThumbUrl }}
              style={styles.heroThumb}
              contentFit="cover"
              {...pulseImageListThumbProps}
            />
          ) : null}

          <View style={styles.statRow}>
            <TouchableOpacity style={styles.stat} onPress={() => void toggleReaction()} activeOpacity={0.85}>
              <Ionicons
                name={reacted ? 'heart' : 'heart-outline'}
                size={16}
                color={reacted ? colors.primary.teal : colors.dark.textMuted}
              />
              <Text style={[styles.statTxt, reacted ? styles.statTxtActive : null]}>
                {formatCount(reactionCount)}
              </Text>
            </TouchableOpacity>
            <View style={styles.stat}>
              <Ionicons name="chatbubbles-outline" size={16} color={colors.dark.textMuted} />
              <Text style={styles.statTxt}>{formatCount(thread.replyCount)} replies</Text>
            </View>
          </View>

          {!isAnonRoom ? (
            <View style={styles.my5Banner}>
              <ShareToMyPulseButton circleSlug={thread.circleSlug} thread={thread} layout="full" />
            </View>
          ) : null}
        </View>

        <CircleReplySortBar active={replySort} accent={String(accent)} onSelect={setReplySort} />

        <Text style={styles.repliesHead}>
          Replies ({formatCount(thread.replyCount)})
        </Text>
        {sortedReplies
          .filter(
            (r): r is CircleReply =>
              r != null && typeof r === 'object' && typeof r.id === 'string',
          )
          .map((r) => (
            <CircleReplyItem
              key={r.id}
              reply={r}
              circleSlug={slug}
              threadId={thread.id}
              accent={String(accent)}
              helpfulCount={helpfulOverrides[r.id]?.count ?? r.helpfulCount ?? 0}
              markedHelpful={helpfulOverrides[r.id]?.marked ?? helpfulMarkedSet.has(r.id)}
              onToggleHelpful={() => void toggleReplyHelpful(r)}
              helpfulDisabled={helpfulTogglingId === r.id}
              onReport={() => setReportReplyId(r.id)}
              canModerate={canModerate}
              onModerate={canModerate ? () => openReplyModeratorActions(r.id) : undefined}
            />
          ))}
        {hasNextPage ? (
          <TouchableOpacity
            style={styles.loadMoreReplies}
            onPress={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
            activeOpacity={0.85}
          >
            <Text style={styles.loadMoreRepliesText}>
              {isFetchingNextPage ? 'Loading…' : 'Load more replies'}
            </Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      <View style={[styles.composerBar, { paddingBottom: composerDockPadding(insets.bottom, keyboardInset, 12) }]}>
        <AccentComposerFrame
          accentColor={composerAccent.color}
          allowOverflow
          hint="Reply in this thread — @ mentions whoever you pick."
          style={{ marginHorizontal: 12 }}
          footer={
            <AccentCharCount
              length={draft.length}
              max={threadReplyMax}
              accentColor={composerAccent.color}
              warnWithin={80}
            />
          }
        >
          <View style={styles.composerRow}>
            <MentionAutocomplete
              wrapperStyle={styles.composerMentionWrap}
              style={styles.threadComposerInput}
              placeholder="Add a reply…"
              placeholderTextColor={colors.dark.textMuted}
              value={draft}
              onChangeText={setDraft}
              multiline
              textAlignVertical="top"
              scrollEnabled
              maxLength={threadReplyMax}
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                !draft.trim() && styles.sendOff,
                draft.trim() && { backgroundColor: composerAccent.color },
              ]}
              disabled={!draft.trim()}
              onPress={async () => {
                const text = draft.trim();
                if (!text) return;
                if (!user) {
                  Alert.alert('Sign in required', 'Sign in to reply in this thread.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Sign in', onPress: () => router.push('/auth/login') },
                  ]);
                  return;
                }
                if (!isJoined) {
                  promptJoinToReply();
                  return;
                }
                try {
                  await circleContentService.addReply(thread.id, text);
                  setDraft('');
                  await Promise.all([refetchReplies(), refetch()]);
                  await setThreadReadReplyCount(thread.id, thread.replyCount + 1);
                } catch (e: unknown) {
                  if (looksLikeRlsPolicyDenial(e)) {
                    promptJoinToReply();
                    return;
                  }
                  try {
                    await enqueueAction({
                      type: 'circle_thread_reply',
                      payload: { threadId: thread.id, userId: user.id, body: text },
                    });
                    setDraft('');
                    Alert.alert(
                      'Reply queued',
                      'Network hiccup — your reply will post automatically once you’re back online.',
                    );
                  } catch {
                    const msg = e instanceof Error ? e.message : 'Could not send your reply.';
                    Alert.alert('Reply failed', msg);
                  }
                }
              }}
            >
              <Ionicons name="send" size={18} color={draft.trim() ? '#FFF' : colors.dark.textMuted} />
            </TouchableOpacity>
          </View>
        </AccentComposerFrame>
      </View>

      <ReportModal
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="circle_thread"
        targetId={threadId}
      />
      <ReportModal
        visible={reportReplyId != null}
        onClose={() => setReportReplyId(null)}
        targetType="circle_reply"
        targetId={reportReplyId ?? ''}
      />

      <CircleEditFlairSheet
        visible={showEditFlair}
        onClose={() => !savingFlair && setShowEditFlair(false)}
        accent={composerAccent}
        slug={slug}
        categories={community?.categories}
        initialFlairTag={thread.flairTag ?? null}
        isConfessions={isAnonRoom}
        saving={savingFlair}
        onSave={handleSaveFlair}
      />
    </KeyboardAwareRoot>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.dark.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errTitle: { fontSize: 17, fontWeight: '700', color: colors.dark.text, textAlign: 'center' },
  errSub: { fontSize: 13, color: colors.dark.textMuted, marginTop: 8, textAlign: 'center' },
  backLink: { marginTop: 12 },
  backLinkText: { fontSize: 15, fontWeight: '700', color: colors.primary.teal },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dark.border,
    backgroundColor: colors.dark.bg,
  },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  headerMid: { flex: 1, alignItems: 'center' },
  headerCircle: { fontSize: 13, fontWeight: '800', color: colors.primary.teal },
  headerSub: { fontSize: 11, color: colors.dark.textMuted, marginTop: 2 },
  scroll: { flex: 1 },
  hero: {
    margin: 12,
    padding: 16,
    borderRadius: borderRadius.card,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderLeftWidth: 4,
  },
  authorRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.dark.cardAlt },
  anonAvatar: { alignItems: 'center', justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  displayName: { fontSize: 16, fontWeight: '800', color: colors.dark.text },
  meta: { fontSize: 12, color: colors.dark.textMuted, marginTop: 4 },
  pillRow: { flexDirection: 'row', marginBottom: 10 },
  kindPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.chip,
    borderWidth: 1,
    backgroundColor: colors.dark.bg,
  },
  kindPillEditable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  kindText: { fontSize: 11, fontWeight: '800' },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.dark.text,
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  body: { fontSize: 15, lineHeight: 22, color: colors.dark.textSecondary },
  heroThumb: {
    marginTop: 14,
    height: 200,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.dark.cardAlt,
  },
  statRow: { flexDirection: 'row', gap: 20, marginTop: 16 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statTxt: { fontSize: 14, fontWeight: '700', color: colors.dark.text },
  statTxtActive: { color: colors.primary.teal },
  my5Banner: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.dark.border,
  },
  repliesHead: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.dark.text,
    paddingHorizontal: 16,
    marginBottom: 4,
    marginTop: 8,
  },
  loadMoreReplies: {
    marginHorizontal: 16,
    marginVertical: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: borderRadius.chip,
    borderWidth: 1,
    borderColor: colors.dark.border,
    backgroundColor: colors.dark.card,
  },
  loadMoreRepliesText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary.teal,
  },
  composerBar: {
    paddingTop: 10,
    backgroundColor: colors.dark.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.dark.border,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  composerMentionWrap: {
    flex: 1,
    minWidth: 0,
  },
  threadComposerInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingVertical: 8,
    paddingHorizontal: 4,
    color: colors.dark.text,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.dark.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendOff: { backgroundColor: colors.dark.cardAlt },
});
