import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  Dimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { CommentItem } from '@/components/cards/CommentItem';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { ReportModal } from '@/components/ui/ReportModal';
import { useComments, usePost } from '@/hooks/useQueries';
import { commentService } from '@/services/comment';
import { looksLikeRlsPolicyDenial, postsService } from '@/services/supabase/posts';
import { queryClient } from '@/lib/queryClient';
import { commentKeys, postKeys } from '@/lib/queryKeys';
import { checkRateLimit } from '@/lib/rateLimit';
import { analytics } from '@/lib/analytics';
import { enqueueAction } from '@/lib/offlineQueue';
import { bumpPostCount } from '@/lib/postCacheUpdates';
import { colors, iconSize, layout, spacing, typography } from '@/theme';
import { useAuth } from '@/contexts/AuthContext';
import { postShouldMaskIdentity } from '@/lib/anonymousCircle';
import { MentionAutocomplete } from '@/components/ui/MentionAutocomplete';
import { AccentComposerFrame, AccentCharCount } from '@/components/ui/AccentComposerFrame';
import { useKeyboardBottomInset } from '@/hooks/useKeyboardBottomInset';
import { composerDockPadding } from '@/lib/keyboardAware';
import { getCircleAccent } from '@/lib/circleAccents';
import { COMMENT_MAX_LENGTH } from '@/constants';
import { pickCoverForSession } from '@/lib/coverAbRotation';
import { resolveFeedGradeLookId } from '@/lib/moodPresets';
import { pulseImageFeedHeroProps } from '@/lib/pulseImage';
import { tintForLook } from '@/lib/videoFilters';
import { storageService } from '@/lib/storage';
import { resolvePostViewerHref } from '@/lib/postViewerRoute';
import { getThreadListWindow } from '@/lib/feedVideoListWindow';
import type { Post } from '@/types';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const COMMENT_THREAD_LIST_WINDOW = getThreadListWindow('comments');
const SCREEN_W = Dimensions.get('window').width;
const SCREEN_H = Dimensions.get('window').height;
const COMMENTS_MEDIA_MAX_H = Math.min(SCREEN_H * 0.82, SCREEN_W * 2.2);

function CommentsMediaHeader({
  post,
  postId,
  circleSlug,
}: {
  post: Post;
  postId: string;
  circleSlug: string | null;
}) {
  const router = useRouter();
  const [imageAspect, setImageAspect] = useState<number | null>(null);

  const previewUri =
    pickCoverForSession(post.id, post.thumbnailUrl, post.coverAltUrl) ||
    post.thumbnailUrl ||
    post.mediaUrl;

  const imageHeight = useMemo(() => {
    if (imageAspect != null && imageAspect > 0) {
      return Math.min(SCREEN_W / imageAspect, COMMENTS_MEDIA_MAX_H);
    }
    return Math.min(SCREEN_W, COMMENTS_MEDIA_MAX_H * 0.85);
  }, [imageAspect]);

  const videoThumbHeight = useMemo(
    () => Math.min(COMMENTS_MEDIA_MAX_H, SCREEN_H * 0.72),
    [],
  );

  const gradeLookId = useMemo(
    () => resolveFeedGradeLookId({ videoLookId: post.videoLookId, moodPreset: post.moodPreset }),
    [post.videoLookId, post.moodPreset],
  );
  const gradeTint = useMemo(
    () => (gradeLookId ? tintForLook(gradeLookId) : null),
    [gradeLookId],
  );

  const openFullPost = () => {
    router.push(resolvePostViewerHref(post, { circle: circleSlug }) as any);
  };

  if (post.type === 'image' && previewUri?.trim()) {
    const uri = previewUri.trim();
    const full = post.mediaUrl?.trim() || uri;
    return (
      <View style={mediaStyles.wrap}>
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={() => {
            const q = [`uri=${encodeURIComponent(full)}`];
            if (gradeLookId) q.push(`grade=${encodeURIComponent(gradeLookId)}`);
            router.push(`/image-viewer?${q.join('&')}` as any);
          }}
        >
          <View style={[mediaStyles.media, { height: imageHeight }]}>
            <Image
              source={{ uri }}
              style={StyleSheet.absoluteFillObject}
              contentFit="contain"
              onLoad={(e) => {
                const w = e.source?.width;
                const h = e.source?.height;
                if (typeof w === 'number' && typeof h === 'number' && h > 0) {
                  setImageAspect(w / h);
                }
              }}
              {...pulseImageFeedHeroProps}
            />
            {gradeTint ? (
              <View
                pointerEvents="none"
                style={[StyleSheet.absoluteFillObject, { backgroundColor: gradeTint, zIndex: 2 }]}
              />
            ) : null}
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  if (post.type === 'video' && post.mediaUrl?.trim()) {
    const thumb = previewUri?.trim();
    return (
      <View style={mediaStyles.wrap}>
        <TouchableOpacity activeOpacity={0.9} onPress={openFullPost}>
          <View style={[mediaStyles.videoBox, { height: videoThumbHeight }]}>
            {thumb ? (
              <Image
                source={{ uri: thumb }}
                style={StyleSheet.absoluteFillObject}
                contentFit="contain"
                {...pulseImageFeedHeroProps}
              />
            ) : (
              <View style={[StyleSheet.absoluteFillObject, mediaStyles.videoFallback]} />
            )}
            {gradeTint ? (
              <View
                pointerEvents="none"
                style={[StyleSheet.absoluteFillObject, { backgroundColor: gradeTint, zIndex: 1 }]}
              />
            ) : null}
            <View style={mediaStyles.playBadge} pointerEvents="none">
              <Ionicons name="play-circle" size={48} color="#FFFFFFD0" />
            </View>
            <Text style={mediaStyles.videoHint} pointerEvents="none">
              Tap for full video
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  return null;
}

const mediaStyles = StyleSheet.create({
  wrap: {
    marginHorizontal: -layout.screenPadding,
    marginBottom: spacing.lg,
    backgroundColor: colors.dark.cardAlt,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dark.border,
  },
  media: { width: SCREEN_W, alignSelf: 'center', backgroundColor: colors.dark.cardAlt },
  videoBox: {
    width: '100%',
    backgroundColor: colors.dark.cardAlt,
    overflow: 'hidden',
  },
  videoFallback: { backgroundColor: 'rgba(0,0,0,0.35)' },
  playBadge: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  videoHint: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    zIndex: 2,
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.92)',
  },
});

export type PostCommentThreadProps = {
  postId: string;
  /** When omitted, loaded via `usePost`. */
  post?: Post | null;
  circleSlug?: string | null;
  /** Full-screen route shows media preview; feed sheet hides it (video visible behind). */
  showMediaHeader?: boolean;
  onCommentAdded?: () => void;
  style?: StyleProp<ViewStyle>;
  /** Tighter padding for in-feed sheet. */
  compact?: boolean;
};

export function PostCommentThread({
  postId,
  post: postProp,
  circleSlug = null,
  showMediaHeader = false,
  onCommentAdded,
  style,
  compact = false,
}: PostCommentThreadProps) {
  const insets = useSafeAreaInsets();
  const keyboardInset = useKeyboardBottomInset();
  const { user } = useAuth();
  const { data: comments = [], isPending, isError, refetch } = useComments(postId);
  const { data: fetchedPost } = usePost(postId, { enabled: !postProp && !!postId });
  const post = postProp ?? fetchedPost;

  const maskAuthors = postShouldMaskIdentity(
    { isAnonymous: post?.isAnonymous === true },
    circleSlug ?? undefined,
  );
  const [text, setText] = useState('');
  const [pendingAttach, setPendingAttach] = useState<{ uri: string; mime?: string } | null>(null);
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [reportCommentId, setReportCommentId] = useState<string | null>(null);

  const accentColor = useMemo(() => getCircleAccent(circleSlug).color, [circleSlug]);
  const commentsLocked = post?.commentsDisabled === true;

  const pickCommentAttach = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.[0]) {
      const a = result.assets[0];
      setPendingAttach({ uri: a.uri, mime: a.mimeType ?? 'image/jpeg' });
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleSend = async () => {
    if (!postId) return;
    if (commentsLocked) return;
    const trimmed = text.trim();
    if ((!trimmed && !pendingAttach) || sending) return;
    if (!user) {
      Alert.alert('Sign in required', 'Log in to post a comment.');
      return;
    }
    if (!checkRateLimit('comment')) return;

    const safe = trimmed.slice(0, COMMENT_MAX_LENGTH);
    setSending(true);
    try {
      let mediaUrl: string | null = null;
      if (pendingAttach) {
        mediaUrl = await storageService.uploadPostMedia(user.id, {
          uri: pendingAttach.uri,
          type: pendingAttach.mime ?? 'image/jpeg',
          name: `comment_${Date.now()}.jpg`,
        });
      }
      await commentService.addComment(postId, safe, replyTo?.id, mediaUrl);
      analytics.track('comment_created', { postId, isReply: !!replyTo, hasMedia: !!mediaUrl });
      setText('');
      setPendingAttach(null);
      setReplyTo(null);
      bumpPostCount(postId, 'commentCount', 1);
      onCommentAdded?.();
      queryClient.invalidateQueries({ queryKey: commentKeys.byPostPrefix(postId) });
      queryClient.invalidateQueries({ queryKey: postKeys.byId(postId) });
    } catch (e: unknown) {
      try {
        if (pendingAttach) {
          Alert.alert(
            'Connection needed',
            'Photo comments can’t be saved offline. Connect to the internet and try again.',
          );
          return;
        }
        if (looksLikeRlsPolicyDenial(e)) {
          const disabled = await postsService.getCommentsDisabledSnapshot(postId);
          if (disabled === true) {
            Alert.alert(
              'Comments turned off',
              'Comments were turned off for this post, so your message wasn’t saved.',
            );
            return;
          }
        }
        await enqueueAction({
          type: 'create_comment',
          payload: {
            postId,
            userId: user.id,
            content: safe,
            parentId: replyTo?.id ?? null,
          },
        });
        setText('');
        setReplyTo(null);
        Alert.alert('Saved', 'Network hiccup — your comment will post automatically once you’re back online.');
      } catch {
        const msg = e instanceof Error ? e.message : 'Could not post your comment.';
        Alert.alert('Comment failed', msg);
      }
    } finally {
      setSending(false);
    }
  };

  const handleReply = (commentId: string, authorName: string) => {
    setReplyTo({ id: commentId, name: authorName });
  };

  const commentHint = replyTo
    ? 'Add your reply — @ to mention.'
    : 'Comment on this post — @ to mention.';

  const listPadding = compact ? spacing.md : layout.screenPadding;

  return (
    <View style={[styles.root, style]}>
      {isPending ? (
        <LoadingState />
      ) : isError ? (
        <EmptyState
          icon="⚠️"
          title="Couldn&apos;t load comments"
          subtitle="Pull to refresh or try again in a moment."
        />
      ) : (
        <FlatList
          style={styles.listFlex}
          data={comments}
          keyExtractor={(item) => item.id}
          initialNumToRender={COMMENT_THREAD_LIST_WINDOW.initialNumToRender}
          maxToRenderPerBatch={COMMENT_THREAD_LIST_WINDOW.maxToRenderPerBatch}
          windowSize={COMMENT_THREAD_LIST_WINDOW.windowSize}
          updateCellsBatchingPeriod={50}
          removeClippedSubviews={false}
          renderItem={({ item }) => (
            <CommentItem
              comment={item}
              accentColor={accentColor}
              anonymousMode={maskAuthors}
              saltPostId={postId}
              commentsLocked={commentsLocked}
              onReply={(cid, name) => handleReply(cid, name)}
              onReport={(cid) => setReportCommentId(cid)}
            />
          )}
          contentContainerStyle={[styles.list, { paddingHorizontal: listPadding }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            commentsLocked ? (
              <EmptyState
                icon="💬"
                title="No comments yet"
                subtitle="New comments are disabled for this post."
              />
            ) : (
              <EmptyState icon="💬" title="No comments yet" subtitle="Be the first to share your thoughts!" />
            )
          }
          ListHeaderComponent={
            <>
              {commentsLocked ? (
                <View style={styles.threadLockedBanner}>
                  <Ionicons name="lock-closed-outline" size={18} color={colors.dark.textMuted} />
                  <Text style={styles.threadLockedText}>
                    Comments are off — you can read what&apos;s already here, but new replies are blocked.
                  </Text>
                </View>
              ) : null}
              {showMediaHeader && post ? (
                <CommentsMediaHeader post={post} postId={postId} circleSlug={circleSlug} />
              ) : null}
            </>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary.teal} />
          }
        />
      )}

      {!commentsLocked && replyTo ? (
        <View
          style={[
            styles.replyBar,
            {
              backgroundColor: `${accentColor}12`,
              borderTopColor: `${accentColor}35`,
              paddingHorizontal: listPadding,
            },
          ]}
        >
          <Text style={[styles.replyText, { color: accentColor }]}>Replying to {replyTo.name}</Text>
          <TouchableOpacity onPress={() => setReplyTo(null)} activeOpacity={0.7}>
            <Ionicons name="close-circle" size={18} color={colors.dark.textMuted} />
          </TouchableOpacity>
        </View>
      ) : null}

      {!commentsLocked ? (
        <View
          style={[
            styles.inputBar,
            {
              paddingHorizontal: listPadding,
              paddingBottom: composerDockPadding(insets.bottom, keyboardInset, spacing.sm),
            },
          ]}
        >
          <AccentComposerFrame
            accentColor={accentColor}
            hint={commentHint}
            allowOverflow
            style={{ flex: 1 }}
            innerStyle={{ paddingTop: 10, paddingBottom: 8 }}
            footer={
              <AccentCharCount
                length={text.length}
                max={COMMENT_MAX_LENGTH}
                accentColor={accentColor}
                warnWithin={30}
              />
            }
          >
            {pendingAttach ? (
              <View style={styles.attachPreview}>
                <Image source={{ uri: pendingAttach.uri }} style={styles.attachThumb} contentFit="cover" />
                <TouchableOpacity
                  onPress={() => setPendingAttach(null)}
                  hitSlop={10}
                  accessibilityLabel="Remove attachment"
                >
                  <Ionicons name="close-circle" size={22} color={colors.dark.textMuted} />
                </TouchableOpacity>
              </View>
            ) : null}
            <View style={styles.inputRow}>
              <TouchableOpacity
                onPress={pickCommentAttach}
                disabled={sending}
                style={styles.attachBtn}
                accessibilityLabel="Attach photo"
              >
                <Ionicons name="image-outline" size={22} color={accentColor} />
              </TouchableOpacity>
              <MentionAutocomplete
                wrapperStyle={styles.composerMentionWrap}
                style={styles.inputFramed}
                value={text}
                onChangeText={setText}
                placeholder={replyTo ? `Reply to ${replyTo.name}...` : 'Add a comment...'}
                placeholderTextColor={colors.dark.textMuted}
                multiline
                textAlignVertical="top"
                scrollEnabled
                maxLength={COMMENT_MAX_LENGTH}
              />
              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  ((!text.trim() && !pendingAttach) || sending) && styles.sendDisabled,
                ]}
                disabled={(!text.trim() && !pendingAttach) || sending}
                onPress={handleSend}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="send"
                  size={iconSize.md}
                  color={(text.trim() || pendingAttach) && !sending ? accentColor : colors.dark.textMuted}
                />
              </TouchableOpacity>
            </View>
          </AccentComposerFrame>
        </View>
      ) : null}

      <ReportModal
        visible={!!reportCommentId}
        onClose={() => setReportCommentId(null)}
        targetType="comment"
        targetId={reportCommentId ?? ''}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
  threadLockedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: spacing.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(12,18,32,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.22)',
  },
  threadLockedText: {
    flex: 1,
    ...typography.bodySmall,
    color: colors.dark.textSecondary,
    lineHeight: 18,
    fontWeight: '600',
  },
  listFlex: { flex: 1 },
  list: { paddingBottom: spacing.lg },
  replyBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  replyText: { ...typography.bodySmall, fontWeight: '600' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(148,163,184,0.18)',
    backgroundColor: 'transparent',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  composerMentionWrap: {
    flex: 1,
    minWidth: 0,
  },
  inputFramed: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    paddingHorizontal: 6,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.dark.text,
    textAlignVertical: 'top',
  },
  sendBtn: { padding: spacing.sm },
  sendDisabled: { opacity: 0.4 },
  attachPreview: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.sm },
  attachThumb: { width: 56, height: 56, borderRadius: 8, backgroundColor: colors.dark.cardAlt },
  attachBtn: {
    padding: spacing.sm,
    marginBottom: 2,
    borderRadius: 20,
    backgroundColor: 'rgba(15,23,42,0.55)',
  },
});
