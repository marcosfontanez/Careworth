import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Pressable, StyleSheet, Dimensions, Alert, Platform,
  KeyboardAvoidingView, ActivityIndicator,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useEventListener } from 'expo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { AvatarDisplay, pulseFrameFromUser } from '@/components/profile/AvatarBuilder';
import { ProfileNeonPills } from '@/components/mypage/ProfileNeonPills';
import { buildNeonPillTags } from '@/lib/buildNeonPillTags';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LoadingState } from '@/components/ui/LoadingState';
import { usePost, useComments, useLikedPostIds } from '@/hooks/useQueries';
import { useAppStore } from '@/store/useAppStore';
import { useAuth } from '@/contexts/AuthContext';
import { sharePostMenu } from '@/lib/share';
import { canRemixVideoPost, openVideoRemixMenu } from '@/lib/videoRemixNavigation';
import { invalidatePostRelatedQueries } from '@/lib/invalidatePostQueries';
import { postKeys, commentKeys, likedPostKeys, profileUpdateKeys, savedPostKeys } from '@/lib/queryKeys';
import { looksLikeRlsPolicyDenial, postsService } from '@/services/supabase/posts';
import { profileUpdatesService } from '@/services/profileUpdates';
import { commentService } from '@/services/comment';
import { useToast } from '@/components/ui/Toast';
import { colors, borderRadius } from '@/theme';
import { pulseImageFeedHeroProps } from '@/lib/pulseImage';
import { resolveFeedGradeLookId } from '@/lib/moodPresets';
import { tintForLook, type VideoLookId } from '@/lib/videoFilters';
import { COMMENT_DELETED_TOMBSTONE, COMMENT_MAX_LENGTH } from '@/constants';
import { CaptionWithMentions } from '@/components/ui/CaptionWithMentions';
import { CommentRichText } from '@/components/ui/CommentRichText';
import { MentionAutocomplete, type MentionRef } from '@/components/ui/MentionAutocomplete';
import { AccentComposerFrame, AccentCharCount } from '@/components/ui/AccentComposerFrame';
import { CommentEditComposer } from '@/components/comments/CommentEditComposer';
import { EditPostCaptionModal } from '@/components/posts/EditPostCaptionModal';
import { ReportModal } from '@/components/ui/ReportModal';
import { SendCreatorGiftTray } from '@/components/shop/SendCreatorGiftTray';
import { formatCount, timeAgo } from '@/utils/format';
import {
  anonymousNameOnPost,
  isAnonymousConfessionCircle,
  postShouldMaskIdentity,
} from '@/lib/anonymousCircle';
import { getCircleAccent } from '@/lib/circleAccents';
import { bumpPostCount } from '@/lib/postCacheUpdates';
import { enqueueAction } from '@/lib/offlineQueue';
import { checkRateLimit } from '@/lib/rateLimit';
import { analytics } from '@/lib/analytics';
import { pickCoverForSession } from '@/lib/coverAbRotation';
import { trySignedUrlFromPostMediaPublicUrl, storageService, avatarThumb } from '@/lib/storage';
import type { Comment, PostReactionKind } from '@/types';
import * as ImagePicker from 'expo-image-picker';
import { CommentReactionStrip } from '@/components/comments/CommentReactionStrip';
import { emptyPostReactionCounts } from '@/lib/postReactions';
import { pickCommentReaction } from '@/lib/commentReactionPick';
import { PulseTierBadge } from '@/components/badges/PulseTierBadge';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
/** Max height for post media so full image/video fits on screen while comments stay reachable. */
const POST_DETAIL_MEDIA_MAX_H = Math.min(SCREEN_H * 0.82, SCREEN_W * 2.2);

/** Inline player for `/post/[id]` — feed uses `VideoFeedPost`; this screen previously showed a static cover + dead play icon. */
function PostDetailVideo({ publicUri, lookId }: { publicUri: string; lookId?: VideoLookId }) {
  const gradeTint = lookId ? tintForLook(lookId) : null;
  const isFocused = useIsFocused();
  const [userPaused, setUserPaused] = useState(false);
  const [fallbackUri, setFallbackUri] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [buffering, setBuffering] = useState(true);
  const sourcePhase = useRef<'public' | 'signed' | 'failed'>('public');
  const publicFallbackInFlight = useRef(false);

  useEffect(() => {
    sourcePhase.current = 'public';
    publicFallbackInFlight.current = false;
    setFallbackUri(null);
    setLoadError(false);
    setBuffering(true);
  }, [publicUri]);

  const resolvedUri = fallbackUri ?? publicUri;
  const source = useMemo(
    () => ({ uri: resolvedUri, contentType: 'auto' as const }),
    [resolvedUri],
  );

  const player = useVideoPlayer(source, (p: { loop?: boolean }) => {
    p.loop = true;
  });

  useEventListener(player, 'statusChange', ({ status, error }: { status?: string; error?: unknown }) => {
    if (status === 'readyToPlay') {
      setLoadError(false);
      setBuffering(false);
    }
    if (status !== 'error' || !error) return;
    if (sourcePhase.current === 'signed') {
      setLoadError(true);
      setBuffering(false);
      return;
    }
    if (sourcePhase.current === 'failed') return;
    if (publicFallbackInFlight.current) return;
    publicFallbackInFlight.current = true;
    void trySignedUrlFromPostMediaPublicUrl(publicUri).then((signed) => {
      publicFallbackInFlight.current = false;
      if (signed) {
        sourcePhase.current = 'signed';
        setFallbackUri(signed);
      } else {
        sourcePhase.current = 'failed';
        setLoadError(true);
        setBuffering(false);
      }
    });
  });

  const paused = userPaused || !isFocused;

  useEffect(() => {
    if (!player) return;
    if (!isFocused) {
      try {
        player.pause();
        player.muted = true;
      } catch { /* noop */ }
      return;
    }
    try {
      player.muted = false;
      player.volume = 1;
      if (userPaused) player.pause();
      else player.play();
    } catch { /* noop */ }
  }, [player, isFocused, userPaused]);

  return (
    <Pressable
      style={StyleSheet.absoluteFillObject}
      onPress={() => setUserPaused((p) => !p)}
      accessibilityRole="button"
      accessibilityLabel={userPaused ? 'Play video' : 'Pause video'}
    >
      <VideoView
        player={player}
        style={StyleSheet.absoluteFillObject}
        contentFit="contain"
        nativeControls={false}
        {...(Platform.OS === 'android' ? { surfaceType: 'textureView' as const } : {})}
      />
      {gradeTint ? (
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFillObject, { backgroundColor: gradeTint, zIndex: 2 }]}
        />
      ) : null}
      {buffering && isFocused && !paused && !loadError ? (
        <View style={styles.videoBuffering} pointerEvents="none">
          <ActivityIndicator size="large" color={colors.dark.textMuted} />
        </View>
      ) : null}
      {paused && isFocused ? (
        <View style={styles.playOverlay} pointerEvents="none">
          <Ionicons name="play" size={42} color={`${colors.dark.text}E6`} />
        </View>
      ) : null}
      {loadError ? (
        <View style={styles.videoErrorWrap} pointerEvents="none">
          <Ionicons name="alert-circle-outline" size={22} color={colors.dark.textMuted} />
          <Text style={styles.videoErrorText}>Could not load this video.</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function asParamString(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

export default function PostDetailScreen() {
  const raw = useLocalSearchParams<{
    id: string | string[];
    circle?: string | string[];
    focusComments?: string | string[];
  }>();
  const id = asParamString(raw.id);
  const circle = asParamString(raw.circle);
  const focusComments = asParamString(raw.focusComments);
  const shouldFocusComments =
    focusComments != null && ['1', 'true', 'yes'].includes(focusComments.toLowerCase());

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { user: authUser } = useAuth();

  const { data: post, isPending, refetch } = usePost(id ?? '', { enabled: !!id });
  const { data: comments = [] } = useComments(id ?? '');
  const { data: likedIdsArr = [] } = useLikedPostIds(authUser?.id);

  const savedPostIds = useAppStore((s) => s.savedPostIds);
  const toggleSavePost = useAppStore((s) => s.toggleSavePost);

  /**
   * Owned by the screen so the inline comment composer can ask us to scroll
   * itself above the keyboard when the input gains focus. The composer is
   * the last child in the ScrollView, so `scrollToEnd` reliably brings it
   * into view — we don't need the heavier `measureLayout` dance.
   *
   * Why this is needed: the composer lives INSIDE the ScrollView, and
   * `KeyboardAvoidingView` only shrinks the available area. Without an
   * explicit scroll the user's previous scroll position stays put and the
   * composer ends up under the keyboard.
   */
  const scrollRef = useRef<ScrollView>(null);

  const scrollComposerIntoView = useCallback(() => {
    /** A short delay lets the keyboard finish animating in before we
     *  scroll — otherwise iOS scrolls "to end" while end is still moving,
     *  and the input lands a few pixels short. 250ms matches the iOS
     *  keyboard spring; on Android the wait is harmless. */
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, Platform.OS === 'ios' ? 250 : 180);
  }, []);

  const [imageAspect, setImageAspect] = useState<number | null>(null);

  useEffect(() => {
    setImageAspect(null);
  }, [id]);

  /**
   * Comment-focused deep links (`focusComments=1`) — My Pulse linked clips,
   * notification taps, etc. When the owner turned comments off, we still
   * land on the post but explain why the composer did not auto-focus.
   */
  const focusCommentsLockedToastShown = useRef(false);
  useEffect(() => {
    focusCommentsLockedToastShown.current = false;
  }, [id]);

  useEffect(() => {
    if (!post || !shouldFocusComments || post.commentsDisabled !== true) return;
    if (focusCommentsLockedToastShown.current) return;
    focusCommentsLockedToastShown.current = true;
    toast.show('Comments are off — you can still read the thread.', 'info');
  }, [post, shouldFocusComments, toast]);

  const imageMediaHeight = useMemo(() => {
    if (imageAspect != null && imageAspect > 0) {
      return Math.min(SCREEN_W / imageAspect, POST_DETAIL_MEDIA_MAX_H);
    }
    return Math.min(SCREEN_W, POST_DETAIL_MEDIA_MAX_H * 0.85);
  }, [imageAspect]);

  const videoMediaHeight = useMemo(
    () => Math.min(POST_DETAIL_MEDIA_MAX_H, SCREEN_H * 0.75),
    [],
  );

  const detailGradeLookId = useMemo(() => {
    if (!post) return undefined;
    return resolveFeedGradeLookId({ videoLookId: post.videoLookId, moodPreset: post.moodPreset });
  }, [post]);

  const detailGradeTint = useMemo(
    () => (detailGradeLookId ? tintForLook(detailGradeLookId) : null),
    [detailGradeLookId],
  );

  const [liked, setLiked] = useState(false);
  const likedSig = likedIdsArr.join('|');
  useEffect(() => {
    /** Hydrate the heart from the user's authoritative liked-set so the
     *  state isn't stuck false on first open (which the old version did). */
    if (post) setLiked(likedIdsArr.includes(post.id));
  }, [likedSig, likedIdsArr, post]);

  const slugLabel = (circle ? String(circle) : '').toLowerCase();
  const accent = getCircleAccent(slugLabel || null);

  /** Share-to-My-Pulse mutation: mirrors the same `link_post` shape as the
   *  create flow toggle, so re-shares from the detail view land on the
   *  user's profile feed exactly the same way as opt-in shares from create. */
  const shareToPulse = useMutation({
    mutationFn: async () => {
      if (!authUser?.id || !post) throw new Error('Not signed in');
      return profileUpdatesService.add(authUser.id, {
        type: 'link_post',
        content: post.caption?.slice(0, 180) || 'Pinned post',
        previewText: post.caption?.slice(0, 140) ?? '',
        linkedPostId: post.id,
        linkedCircleSlug: slugLabel || undefined,
      });
    },
    onSuccess: async () => {
      if (authUser?.id) {
        await queryClient.invalidateQueries({ queryKey: profileUpdateKeys.forUser(authUser.id) });
      }
      toast.show('Pinned to My Pulse', 'success');
    },
    onError: () => toast.show('Couldn\u2019t pin to My Pulse — try again', 'error'),
  });

  const handleToggleLike = useCallback(async () => {
    if (!post || !authUser) return;
    const wasLiked = liked;
    setLiked(!wasLiked);
    bumpPostCount(post.id, 'likeCount', wasLiked ? -1 : 1);
    try {
      await postsService.toggleLike(authUser.id, post.id);
      queryClient.invalidateQueries({ queryKey: likedPostKeys.forUser(authUser.id) });
    } catch {
      enqueueAction({
        type: wasLiked ? 'unlike_post' : 'like_post',
        payload: { postId: post.id, userId: authUser.id },
      }).catch(() => {});
    }
  }, [post, authUser, liked, queryClient]);

  const handleToggleSave = useCallback(async () => {
    if (!post || !authUser) return;
    const wasSaved = savedPostIds.has(post.id);
    toggleSavePost(post.id);
    bumpPostCount(post.id, 'saveCount', wasSaved ? -1 : 1);
    try {
      await postsService.toggleSave(authUser.id, post.id);
      queryClient.invalidateQueries({ queryKey: savedPostKeys.forUser(authUser.id) });
    } catch {
      enqueueAction({
        type: wasSaved ? 'unsave_post' : 'save_post',
        payload: { postId: post.id, userId: authUser.id },
      }).catch(() => {});
    }
  }, [post, authUser, savedPostIds, toggleSavePost, queryClient]);

  const handleDelete = useCallback(() => {
    if (!authUser?.id || !post) return;
    Alert.alert('Delete Post', 'Are you sure you want to delete this post? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await postsService.deleteOwnPost(post.id, authUser.id);
            await invalidatePostRelatedQueries(queryClient, { creatorId: authUser.id });
            toast.show('Post deleted', 'success');
            router.back();
          } catch {
            toast.show('Failed to delete post', 'error');
          }
        },
      },
    ]);
  }, [authUser, post, queryClient, toast, router]);

  /**
   * Controls the caption edit modal. We keep it as plain state instead
   * of `useRef` so the opening/closing animation re-runs on every
   * invocation — otherwise a re-open after an initial cancel would
   * still show the last-typed draft instead of the current caption.
   */
  const [editCaptionOpen, setEditCaptionOpen] = useState(false);
  const [creatorGiftOpen, setCreatorGiftOpen] = useState(false);

  /**
   * Save handler passed into the modal. We optimistically patch the
   * single-post cache so the new caption appears without a flicker,
   * then let the server trigger (migration 057) produce the fresh
   * `editedAt`. If the network write fails we roll back and re-raise
   * so the modal can show the retry state.
   */
  const handleEditCaption = useCallback(
    async (nextCaption: string) => {
      if (!authUser?.id || !post) return;
      // Must match the viewer-scoped key that `usePost` writes to, or
      // the optimistic patch lands on a cache entry nothing is reading.
      const key = postKeys.detail(post.id, authUser.id);
      const prev = queryClient.getQueryData<typeof post>(key);
      if (prev) {
        queryClient.setQueryData(key, {
          ...prev,
          caption: nextCaption,
          editedAt: new Date().toISOString(),
        });
      }
      try {
        const updated = await postsService.updateOwnPost(post.id, authUser.id, {
          caption: nextCaption,
        });
        queryClient.setQueryData(key, updated);
        await invalidatePostRelatedQueries(queryClient, { creatorId: authUser.id });
        toast.show('Caption updated', 'success');
        analytics.track('post_edited', { postId: post.id });
      } catch (e) {
        if (prev) queryClient.setQueryData(key, prev);
        toast.show('Couldn’t save caption', 'error');
        throw e;
      }
    },
    [authUser, post, queryClient, toast],
  );

  const promptToggleComments = useCallback(() => {
    if (!authUser?.id || !post) return;
    const nextDisabled = !post.commentsDisabled;
    const apply = async () => {
      try {
        const updated = await postsService.updateOwnPost(post.id, authUser.id, {
          commentsDisabled: nextDisabled,
        });
        const key = postKeys.detail(post.id, authUser.id);
        queryClient.setQueryData(key, updated);
        await invalidatePostRelatedQueries(queryClient, { creatorId: authUser.id });
        toast.show(nextDisabled ? 'Comments are off' : 'Comments are on', 'success');
      } catch {
        toast.show('Could not update comments', 'error');
      }
    };
    if (nextDisabled) {
      Alert.alert(
        'Turn off comments?',
        'New comments will be blocked. Existing comments stay visible.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Turn off', style: 'destructive', onPress: () => void apply() },
        ],
      );
    } else {
      void apply();
    }
  }, [authUser, post, queryClient, toast]);

  /**
   * Opens the owner's action menu (Edit + Delete + Cancel). We swap the
   * always-visible trash icon for a single ellipsis so the header
   * doesn't render two destructive affordances side by side, and so
   * adding future owner-only actions (pin to top, archive, etc.) stays
   * a one-line change.
   */
  const openOwnerMenu = useCallback(() => {
    if (!post) return;
    Alert.alert('Your post', undefined, [
      { text: 'Edit caption', onPress: () => setEditCaptionOpen(true) },
      {
        text: post.commentsDisabled ? 'Turn comments on' : 'Turn comments off',
        onPress: promptToggleComments,
      },
      { text: 'Delete post', style: 'destructive', onPress: handleDelete },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [handleDelete, promptToggleComments, post]);

  if (!id) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 24, paddingHorizontal: 20 }]}>
        <Text style={{ color: colors.dark.text, fontSize: 16, fontWeight: '600' }}>
          This post could not be opened.
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }} accessibilityRole="button">
          <Text style={{ color: colors.primary.teal, fontWeight: '700' }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isPending) return <LoadingState />;

  if (post == null) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 24, paddingHorizontal: 20 }]}>
        <Text style={{ color: colors.dark.text, fontSize: 16, fontWeight: '600' }}>
          {`This post isn't available`}
        </Text>
        <Text style={{ color: colors.dark.textMuted, marginTop: 8, fontSize: 14 }}>
          {`It may have been removed, set to private, or you don't have access.`}
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }} accessibilityRole="button">
          <Text style={{ color: colors.primary.teal, fontWeight: '700' }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const maskIdentity = postShouldMaskIdentity(post, circle);
  const anonLabel = anonymousNameOnPost(post.creatorId, post.id);
  const isAnonRoom = isAnonymousConfessionCircle(slugLabel);
  /** Opened from Circles — omit Save; Share already offers My Pulse + system share. */
  const openedFromCircle = Boolean(slugLabel);
  const isSaved = savedPostIds.has(post.id);
  const isOwnPost = authUser?.id === post.creatorId;

  const previewUri =
    pickCoverForSession(post.id, post.thumbnailUrl, post.coverAltUrl) ||
    post.thumbnailUrl ||
    post.mediaUrl;

  const captionStrippedTitle = post.caption?.startsWith('**')
    ? post.caption.split('\n')[0].replace(/\*\*/g, '').trim()
    : '';
  const captionBody = post.caption?.startsWith('**')
    ? post.caption.split('\n\n').slice(1).join('\n\n').trim()
    : (post.caption ?? '');

  return (
    <KeyboardAvoidingView
      style={styles.container}
      /**
       * iOS responds best to `padding` (the view shrinks; ScrollView keeps
       * its content height and we can scroll the focused input into view).
       * Android handles `windowSoftInputMode=adjustResize` natively at the
       * window level, so we leave `behavior` undefined there to avoid
       * double-resizing the layout (which would clip the header).
       */
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* ============================ HEADER ============================ */}
      <LinearGradient
        colors={[`${accent.color}33`, `${accent.color}10`, 'transparent']}
        locations={[0, 0.7, 1]}
        style={[styles.header, { paddingTop: insets.top + 6 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} hitSlop={6}>
            <Ionicons name="arrow-back" size={22} color={colors.dark.text} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {maskIdentity ? 'Anonymous post' : 'Post'}
            </Text>
            {circle ? (
              <View style={styles.headerSubRow}>
                <View style={[styles.headerDot, { backgroundColor: accent.color }]} />
                <Text style={styles.headerSub} numberOfLines={1}>{prettyCircleName(slugLabel)}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.headerRight}>
            {isOwnPost && (
              <TouchableOpacity
                onPress={openOwnerMenu}
                activeOpacity={0.7}
                hitSlop={10}
                style={styles.iconBtn}
                accessibilityLabel="Post options"
              >
                <Ionicons name="ellipsis-horizontal" size={18} color={colors.dark.text} />
              </TouchableOpacity>
            )}
            {!isOwnPost && authUser && !maskIdentity ? (
              <TouchableOpacity
                onPress={() => setCreatorGiftOpen(true)}
                activeOpacity={0.7}
                hitSlop={10}
                style={styles.iconBtn}
                accessibilityLabel="Send creator gift"
              >
                <Ionicons name="gift-outline" size={18} color={colors.primary.teal} />
              </TouchableOpacity>
            ) : null}
            {!isAnonRoom && (
              <TouchableOpacity
                onPress={() => sharePostMenu(
                  { ...post, isAnonymous: maskIdentity },
                  {
                    toast: toast.show,
                    queryClient,
                    circleSlug: slugLabel || undefined,
                    allowPulseShare: !isAnonRoom,
                  },
                )}
                activeOpacity={0.7}
                hitSlop={10}
                style={styles.iconBtn}
              >
                <Ionicons name="share-outline" size={18} color={colors.dark.text} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={Platform.OS === 'android'}
        /** Swipe-down to dismiss the keyboard. We deliberately do NOT
         *  set `automaticallyAdjustKeyboardInsets` here — combined with
         *  the parent KeyboardAvoidingView's padding behavior it would
         *  double-pad the bottom and then our scroll-into-view would
         *  triple-push the composer off the top of the screen.
         *  KAV alone shrinks the scroll viewport → scrollToEnd then
         *  parks the composer right above the keyboard. */
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        onScrollEndDrag={() => refetch()}
      >
        {/* =========================== POST CARD =========================== */}
        <View style={[styles.postCard, { borderLeftColor: accent.color }]}>
          {/* Author */}
          {maskIdentity ? (
            <View style={styles.authorRow}>
              <View style={[styles.anonAvatar, { borderColor: `${accent.color}88` }]}>
                <Text style={styles.anonGlyph}>?</Text>
              </View>
              <View style={styles.authorBody}>
                <Text style={styles.authorName}>{anonLabel}</Text>
                <Text style={styles.authorMeta}>
                  Anonymous · {timeAgo(post.createdAt)}
                  {post.editedAt ? <Text style={styles.authorMetaEdited}> · edited</Text> : null}
                </Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.authorRow}
              onPress={() => router.push(`/profile/${post.creatorId}`)}
              activeOpacity={0.7}
            >
              <AvatarDisplay
                size={36}
                avatarUrl={post.creator.avatarUrl}
                prioritizeRemoteAvatar
                ringColor={colors.dark.border}
                pulseFrame={pulseFrameFromUser(post.creator.pulseAvatarFrame)}
              />
              <View style={styles.authorBody}>
                <View style={styles.authorNameRow}>
                  <Text style={styles.authorName}>{post.creator.displayName}</Text>
                  {post.creator.isVerified && (
                    <Ionicons name="checkmark-circle" size={14} color={colors.primary.teal} />
                  )}
                </View>
                <ProfileNeonPills tags={buildNeonPillTags(post.creator)} style={styles.authorNeonPills} />
                <Text style={styles.authorMeta}>
                  {timeAgo(post.createdAt)}
                  {post.editedAt ? <Text style={styles.authorMetaEdited}> · edited</Text> : null}
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Title (when post was created via "**Title**\n\n..." convention). */}
          {captionStrippedTitle ? (
            <Text style={styles.title}>{captionStrippedTitle}</Text>
          ) : null}

          {/* Media */}
          {post.type === 'video' && post.mediaUrl?.trim() ? (
            <View style={[styles.mediaWrapBase, { height: videoMediaHeight }]}>
              <PostDetailVideo publicUri={post.mediaUrl.trim()} lookId={detailGradeLookId} />
            </View>
          ) : post.type === 'image' && previewUri ? (
            <TouchableOpacity
              onPress={() => {
                if (post.mediaUrl) {
                  const q = [`uri=${encodeURIComponent(post.mediaUrl)}`];
                  if (detailGradeLookId) {
                    q.push(`grade=${encodeURIComponent(detailGradeLookId)}`);
                  }
                  router.push(`/image-viewer?${q.join('&')}`);
                }
              }}
              activeOpacity={0.92}
              style={[styles.mediaWrapBase, { height: imageMediaHeight }]}
            >
              <View style={styles.media}>
                <Image
                  source={{ uri: previewUri }}
                  style={StyleSheet.absoluteFillObject}
                  contentFit="contain"
                  transition={120}
                  onLoad={(e) => {
                    const s = e.source;
                    const w = typeof s?.width === 'number' ? s.width : 0;
                    const h = typeof s?.height === 'number' ? s.height : 0;
                    if (w > 0 && h > 0) setImageAspect(w / h);
                  }}
                  {...pulseImageFeedHeroProps}
                />
                {detailGradeTint ? (
                  <View
                    pointerEvents="none"
                    style={[StyleSheet.absoluteFillObject, { backgroundColor: detailGradeTint, zIndex: 2 }]}
                  />
                ) : null}
              </View>
            </TouchableOpacity>
          ) : null}

          {/* Caption body */}
          {captionBody ? (
            <CaptionWithMentions
              text={captionBody}
              style={styles.caption}
              mentionsInteractive={!maskIdentity}
            />
          ) : null}

          {/* Tags */}
          {post.hashtags.length > 0 && (
            <View style={styles.tagsRow}>
              {post.hashtags.map((tag) => (
                <View key={tag} style={[styles.tagChip, { backgroundColor: `${accent.color}18` }]}>
                  <Text style={[styles.tagText, { color: accent.color }]}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Stat row — comments opens full thread route (parity with feed / Saved). */}
          <View style={styles.statsRow}>
            <Text style={styles.statText}>{formatCount(post.likeCount)} likes</Text>
            <View style={styles.statDot} />
            <TouchableOpacity
              onPress={() => {
                if (post.commentsDisabled) {
                  toast.show('Comments are off — you can still read the thread.', 'info');
                }
                router.push(`/comments/${post.id}` as never);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
              accessibilityRole="button"
              accessibilityLabel={
                post.commentsDisabled
                  ? 'View comments. New comments are turned off.'
                  : 'Open comments'
              }
            >
              <Text style={styles.statText}>{formatCount(post.commentCount)} comments</Text>
            </TouchableOpacity>
            <View style={styles.statDot} />
            <Text style={styles.statText}>{formatCount(post.shareCount)} shares</Text>
          </View>

          {/* Action row — Reply button removed; the inline composer below
              is the canonical way to add a comment, so a duplicate Reply
              button was redundant. */}
          <View style={styles.actionsRow}>
            <ActionButton
              icon={liked ? 'heart' : 'heart-outline'}
              label="Like"
              tint={liked ? colors.status.error : colors.dark.textSecondary}
              onPress={handleToggleLike}
            />
            {!isOwnPost && authUser && !maskIdentity ? (
              <ActionButton
                icon="gift-outline"
                label="Gift"
                tint={colors.primary.teal}
                onPress={() => setCreatorGiftOpen(true)}
              />
            ) : null}
            {authUser && !maskIdentity && canRemixVideoPost(post) ? (
              <ActionButton
                icon="sparkles-outline"
                label="Remix"
                tint={colors.primary.teal}
                onPress={() => openVideoRemixMenu(post, router)}
              />
            ) : null}
            {!openedFromCircle ? (
              <ActionButton
                icon={isSaved ? 'bookmark' : 'bookmark-outline'}
                label={isSaved ? 'Saved' : 'Save'}
                tint={isSaved ? colors.primary.gold : colors.dark.textSecondary}
                onPress={handleToggleSave}
              />
            ) : null}
            {!isAnonRoom && (
              <ActionButton
                icon="paper-plane-outline"
                label="Share"
                tint={colors.dark.textSecondary}
                onPress={() => sharePostMenu(
                  { ...post, isAnonymous: maskIdentity },
                  {
                    toast: toast.show,
                    queryClient,
                    circleSlug: slugLabel || undefined,
                    allowPulseShare: !isAnonRoom,
                  },
                )}
              />
            )}
          </View>
        </View>

        {/* ====================== SHARE TO MY PULSE ===================== */}
        {!isAnonRoom && authUser ? (
          <TouchableOpacity
            style={[styles.pulseCard, { borderColor: `${colors.primary.teal}55` }]}
            onPress={() => shareToPulse.mutate()}
            disabled={shareToPulse.isPending}
            activeOpacity={0.88}
          >
            <View style={[styles.pulseIcon, { backgroundColor: `${colors.primary.teal}1F` }]}>
              <Ionicons name="pulse" size={20} color={colors.primary.teal} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.pulseTitle}>Share to My Pulse</Text>
              <Text style={styles.pulseSubtitle}>
                {shareToPulse.isPending ? 'Pinning…' : 'Expand your post beyond the circle'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.dark.textMuted} />
          </TouchableOpacity>
        ) : null}

        {/* ===================== COMMENTS — INLINE ===================== */}
        <CommentsCard
          postId={post.id}
          comments={comments}
          accent={accent.color}
          maskAuthors={maskIdentity}
          authUserId={authUser?.id}
          authorIsAnonymous={maskIdentity}
          onComposerFocus={scrollComposerIntoView}
          autoFocusComposer={shouldFocusComments && !post.commentsDisabled}
          commentsDisabled={post.commentsDisabled === true}
        />

        {isOwnPost ? (
          <TouchableOpacity
            style={styles.appealLink}
            onPress={() => router.push(`/appeal/${encodeURIComponent(post.id)}`)}
            activeOpacity={0.8}
          >
            <Ionicons name="shield-checkmark-outline" size={16} color={colors.primary.teal} />
            <Text style={styles.appealLinkText}>Request moderation review</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary.teal} />
          </TouchableOpacity>
        ) : null}

        <View style={{ height: 80 }} />
      </ScrollView>

      {/**
       * Owner-only caption editor. Rendered as a bottom sheet modal so
       * the keyboard pushes its content above the fold without
       * competing with the parent KAV. Mounted lazily — the modal
       * starts hidden and only gets its initial content on open.
       */}
      {isOwnPost ? (
        <EditPostCaptionModal
          visible={editCaptionOpen}
          initialCaption={post.caption ?? ''}
          accent={accent.color}
          onSave={handleEditCaption}
          onClose={() => setEditCaptionOpen(false)}
        />
      ) : null}
      {!isOwnPost && authUser && !maskIdentity ? (
        <SendCreatorGiftTray
          visible={creatorGiftOpen}
          onClose={() => setCreatorGiftOpen(false)}
          creatorUserId={post.creatorId}
          creatorDisplayName={post.creator.displayName}
          creatorHandle={post.creator.username}
          creatorAvatarUrl={post.creator.avatarUrl}
          contextType="post"
          contextId={post.id}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}

/** Quick action button used inside the card's bottom action row. */
function ActionButton({
  icon,
  label,
  tint,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  tint: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.actionBtn}>
      <Ionicons name={icon} size={19} color={tint} />
      <Text style={[styles.actionLabel, { color: tint }]}>{label}</Text>
    </TouchableOpacity>
  );
}

/* ============================================================================
 * Inline comments — replaces the old "preview + jump to /comments" pattern
 * with a real on-page conversation:
 *
 *   - Chronological order (server already returns ascending by created_at)
 *   - Inline composer at the bottom that's always tappable
 *   - Reply targets (`Replying to X`) without leaving the screen
 *   - Optimistic insert so a sent comment appears immediately
 *   - Falls back to the offline queue if the server insert fails
 * ========================================================================== */

function CommentsCard({
  postId,
  comments,
  accent,
  maskAuthors,
  authUserId,
  authorIsAnonymous,
  onComposerFocus,
  autoFocusComposer = false,
  commentsDisabled = false,
}: {
  postId: string;
  comments: Comment[];
  accent: string;
  maskAuthors: boolean;
  authUserId?: string;
  /**
   * When true the post itself is anonymous (confessions circle, etc.) so
   * we hide the author-only delete affordance — exposing it would leak
   * authorship by signalling "I wrote that".
   */
  authorIsAnonymous?: boolean;
  /**
   * Fired when the composer input gains focus. The parent screen owns
   * the ScrollView and uses this to scroll the composer above the
   * keyboard — without this hook the input gets buried under the
   * keyboard since it lives INSIDE the ScrollView.
   */
  onComposerFocus?: () => void;
  /** Opened from circle wall comment icon — scroll to composer and focus once. */
  autoFocusComposer?: boolean;
  /** When true, no new comments/replies (existing thread stays visible). */
  commentsDisabled?: boolean;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const inputRef = useRef<MentionRef>(null);

  const [text, setText] = useState('');
  const [pendingAttach, setPendingAttach] = useState<{ uri: string; mime?: string } | null>(null);
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [reportCommentId, setReportCommentId] = useState<string | null>(null);

  const focusComposer = useCallback(() => {
    /** Slight delay so the field is mounted before requesting focus on
     *  Android, where the system keyboard race-condition can swallow
     *  focus events fired in the same tick as a state update. */
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

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

  useEffect(() => {
    if (!autoFocusComposer) return;
    onComposerFocus?.();
    const t = setTimeout(() => inputRef.current?.focus(), Platform.OS === 'ios' ? 520 : 580);
    return () => clearTimeout(t);
  }, [autoFocusComposer, onComposerFocus]);

  /**
   * Optimistic soft-delete: walk the cached comment tree, flip
   * `isDeleted=true` and replace the body with the tombstone copy. Then
   * fire the network request — if it fails we roll back the cache. This
   * keeps the UX feeling instant while the request hits the wire and
   * matches how like/save are handled across the app.
   */
  const handleDelete = useCallback(
    async (commentId: string) => {
      const queryKey = commentKeys.byPost(postId, authUserId ?? null);
      const prev = queryClient.getQueryData<Comment[]>(queryKey);

      const tombstoneTree = (nodes: Comment[]): Comment[] =>
        nodes.map((n) =>
          n.id === commentId
            ? { ...n, isDeleted: true, content: COMMENT_DELETED_TOMBSTONE }
            : { ...n, replies: tombstoneTree(n.replies) },
        );

      if (prev) queryClient.setQueryData(queryKey, tombstoneTree(prev));

      try {
        await commentService.deleteComment(commentId);
        analytics.track('comment_deleted', { postId, commentId });
        await queryClient.invalidateQueries({ queryKey });
      } catch {
        if (prev) queryClient.setQueryData(queryKey, prev);
        toast.show('Couldn’t remove comment', 'error');
      }
    },
    [postId, queryClient, toast, authUserId],
  );

  /**
   * Saves an edited comment body. Mirrors the delete flow's optimistic
   * cache patch so the "· edited" badge appears immediately. Throws on
   * failure so the inline composer can hold onto the user's draft and
   * surface a retry hint instead of silently clearing.
   */
  const handleEdit = useCallback(
    async (commentId: string, nextContent: string) => {
      const queryKey = commentKeys.byPost(postId, authUserId ?? null);
      const prev = queryClient.getQueryData<Comment[]>(queryKey);

      const patchTree = (nodes: Comment[], next: (c: Comment) => Comment): Comment[] =>
        nodes.map((n) =>
          n.id === commentId ? next(n) : { ...n, replies: patchTree(n.replies, next) },
        );

      if (prev) {
        queryClient.setQueryData(
          queryKey,
          patchTree(prev, (n) => ({
            ...n,
            content: nextContent,
            editedAt: new Date().toISOString(),
          })),
        );
      }

      try {
        const updated = await commentService.updateComment(commentId, nextContent);
        const fresh = queryClient.getQueryData<Comment[]>(queryKey);
        if (fresh) {
          queryClient.setQueryData(
            queryKey,
            patchTree(fresh, (n) => ({
              ...n,
              content: updated.content,
              editedAt: updated.edited_at ?? n.editedAt,
            })),
          );
        }
        analytics.track('comment_edited', { postId, commentId });
      } catch (e) {
        if (prev) queryClient.setQueryData(queryKey, prev);
        toast.show('Couldn’t save edit', 'error');
        throw e;
      }
    },
    [postId, queryClient, toast, authUserId],
  );

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if ((!trimmed && !pendingAttach) || sending) return;
    if (commentsDisabled) return;
    if (!authUserId) {
      Alert.alert('Sign in required', 'Log in to post a comment.');
      return;
    }
    if (!checkRateLimit('comment')) return;

    /** Defensive cap. The TextInput already has maxLength, but the trim
     *  above could in theory push us over if a paste-then-trim race
     *  occurs — and offline-queued payloads also benefit from the cap
     *  being enforced at the call site so they never violate the DB
     *  CHECK constraint when they replay. */
    const safe = trimmed.slice(0, COMMENT_MAX_LENGTH);

    setSending(true);
    try {
      let mediaUrl: string | null = null;
      if (pendingAttach) {
        mediaUrl = await storageService.uploadPostMedia(authUserId, {
          uri: pendingAttach.uri,
          type: pendingAttach.mime ?? 'image/jpeg',
          name: `comment_${Date.now()}.jpg`,
        });
      }
      await commentService.addComment(postId, safe, replyTo?.id, mediaUrl);
      analytics.track('comment_created', {
        postId,
        isReply: !!replyTo,
        hasMedia: !!mediaUrl,
      });
      setText('');
      setPendingAttach(null);
      setReplyTo(null);
      /**
       * Optimistically bump every cached copy of this post's commentCount
       * (feed rail, single-post header, anywhere else rendering the same
       * Post object) so the counter ticks instantly. The DB trigger on
       * `comments` (migration 055) remains the source of truth.
       */
      bumpPostCount(postId, 'commentCount', 1);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: commentKeys.byPostPrefix(postId) }),
        queryClient.invalidateQueries({ queryKey: postKeys.byId(postId) }),
      ]);
    } catch (e: unknown) {
      try {
        if (pendingAttach) {
          toast.show('Photo comments need a connection. Try again when you’re online.', 'error');
          setSending(false);
          return;
        }
        if (looksLikeRlsPolicyDenial(e)) {
          const disabled = await postsService.getCommentsDisabledSnapshot(postId);
          if (disabled === true) {
            toast.show('Comments were turned off — your comment wasn’t saved.', 'info');
            setSending(false);
            return;
          }
        }
        await enqueueAction({
          type: 'create_comment',
          payload: {
            postId,
            userId: authUserId,
            content: safe,
            parentId: replyTo?.id ?? null,
          },
        });
        setText('');
        setReplyTo(null);
        toast.show('Saved — will post when you’re back online', 'success');
      } catch {
        toast.show('Couldn’t post comment', 'error');
      }
    }
    setSending(false);
  }, [text, sending, postId, replyTo, authUserId, queryClient, toast, pendingAttach, commentsDisabled]);

  const handleReplyTo = useCallback(
    (id: string, name: string) => {
      setReplyTo({ id, name });
      focusComposer();
    },
    [focusComposer],
  );

  return (
    <View style={styles.commentsCard}>
      <View style={styles.commentsHeader}>
        <Text style={styles.commentsTitle}>Comments</Text>
        <Text style={styles.commentsCount}>{formatCount(comments.length)}</Text>
      </View>

      {commentsDisabled ? (
        <View style={styles.commentsLockedBanner}>
          <Ionicons name="chatbox-outline" size={18} color={colors.dark.textMuted} />
          <Text style={styles.commentsLockedText}>Comments are turned off for this post.</Text>
        </View>
      ) : null}

      {comments.length === 0 ? (
        <Text style={styles.commentsEmpty}>
          {commentsDisabled
            ? 'No comments yet — new ones are disabled.'
            : 'Be the first to share your thoughts on this post.'}
        </Text>
      ) : (
        <View style={{ marginTop: 4 }}>
          {comments.map((c) => (
            <CommentNode
              key={c.id}
              comment={c}
              accent={accent}
              maskAuthors={maskAuthors}
              postId={postId}
              onReply={handleReplyTo}
              currentUserId={authUserId}
              canSeeOwnership={!authorIsAnonymous}
              commentsLocked={commentsDisabled}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onReport={(cid) => setReportCommentId(cid)}
            />
          ))}
        </View>
      )}

      {/* Reply context strip — slim, dismissible, only when replying. */}
      {!commentsDisabled && replyTo && (
        <View style={[styles.replyStrip, { backgroundColor: `${accent}14`, borderColor: `${accent}55` }]}>
          <Text style={[styles.replyStripText, { color: accent }]} numberOfLines={1}>
            Replying to {replyTo.name}
          </Text>
          <TouchableOpacity onPress={() => setReplyTo(null)} hitSlop={6}>
            <Ionicons name="close-circle" size={16} color={accent} />
          </TouchableOpacity>
        </View>
      )}

      {/* Inline composer — same accent card chrome as Circle create/replies. */}
      {!commentsDisabled ? (
      <AccentComposerFrame
        accentColor={accent}
        allowOverflow
        hint={
          replyTo
            ? 'Add your reply — @ to mention.'
            : 'Join the conversation — @ to mention.'
        }
        style={{ marginTop: 10 }}
        footer={
          <AccentCharCount
            length={text.length}
            max={COMMENT_MAX_LENGTH}
            accentColor={accent}
            warnWithin={30}
          />
        }
      >
        {pendingAttach ? (
          <View style={styles.composerAttachPreview}>
            <Image source={{ uri: pendingAttach.uri }} style={styles.composerAttachThumb} contentFit="cover" />
            <TouchableOpacity
              onPress={() => setPendingAttach(null)}
              style={styles.composerAttachClear}
              hitSlop={10}
              accessibilityLabel="Remove attachment"
            >
              <Ionicons name="close-circle" size={22} color={colors.dark.textMuted} />
            </TouchableOpacity>
          </View>
        ) : null}
        <View style={styles.composerRow}>
          <TouchableOpacity
            onPress={pickCommentAttach}
            disabled={sending}
            style={styles.composerAttachBtn}
            accessibilityLabel="Attach photo"
          >
            <Ionicons name="image-outline" size={22} color={accent} />
          </TouchableOpacity>
          <MentionAutocomplete
            ref={inputRef}
            wrapperStyle={styles.composerMentionWrap}
            style={styles.composerInputFramed}
            value={text}
            onChangeText={setText}
            placeholder={replyTo ? `Reply to ${replyTo.name}…` : 'Add a comment…'}
            placeholderTextColor={colors.dark.textMuted}
            multiline
            textAlignVertical="top"
            scrollEnabled
            editable={!sending}
            maxLength={COMMENT_MAX_LENGTH}
            /** Bring the composer above the keyboard the moment it gets
             *  focus. The parent screen (which owns the ScrollView) is
             *  the only thing that can scroll us into view, so we fan a
             *  callback up rather than try to do it from inside the card. */
            onFocus={onComposerFocus}
          />
          <TouchableOpacity
            style={[
              styles.composerSendBtn,
              {
                backgroundColor: text.trim() || pendingAttach ? accent : colors.dark.cardAlt,
              },
            ]}
            disabled={(!text.trim() && !pendingAttach) || sending}
            onPress={handleSend}
            activeOpacity={0.85}
          >
            <Ionicons
              name="send"
              size={16}
              color={text.trim() || pendingAttach ? colors.dark.text : colors.dark.textMuted}
            />
          </TouchableOpacity>
        </View>
      </AccentComposerFrame>
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

/**
 * Recursive comment row. Renders a single comment + its replies inline so
 * the user can hold a full conversation without ever leaving the post
 * detail screen. Reply nesting is capped at 1 level deep visually (replies
 * still render but stay flat under the parent) to avoid runaway indenting
 * on small screens — matches Instagram/X conventions.
 */
function CommentNode({
  comment,
  accent,
  maskAuthors,
  postId,
  onReply,
  currentUserId,
  canSeeOwnership,
  commentsLocked = false,
  onDelete,
  onEdit,
  onReport,
  depth = 0,
}: {
  comment: Comment;
  accent: string;
  maskAuthors: boolean;
  postId: string;
  onReply: (id: string, name: string) => void;
  /** Logged-in user — used to decide whether to render the delete affordance. */
  currentUserId?: string;
  /**
   * False when the parent post is anonymous; we suppress the author-only
   * delete control because rendering it would deanonymise the author
   * (only they would see the menu).
   */
  canSeeOwnership: boolean;
  /** Parent post has comments disabled — hide Reply affordances. */
  commentsLocked?: boolean;
  onDelete: (commentId: string) => void;
  /**
   * Author-only edit hook wired by the parent. Rejected promises surface
   * in the inline composer so the user can retry without retyping.
   */
  onEdit: (commentId: string, nextContent: string) => Promise<void>;
  /** Report someone else's comment (moderation queue). */
  onReport?: (commentId: string) => void;
  depth?: number;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const [showReplies, setShowReplies] = useState(false);
  /** Local edit mode. Comment body opens in CommentEditComposer modal. */
  const [editing, setEditing] = useState(false);
  const displayName = maskAuthors
    ? anonymousNameOnPost(comment.author.id, postId)
    : comment.author.displayName;

  const isOwn =
    canSeeOwnership && !!currentUserId && comment.author.id === currentUserId;
  const isAuthor = !!currentUserId && comment.author.id === currentUserId;
  const isDeleted = !!comment.isDeleted;
  const wasEdited = !!comment.editedAt;

  /** Author-only delete confirmation. Once confirmed we hand off to the
   *  parent's optimistic handler so the cache flips to a tombstone
   *  immediately and the network call runs in the background. */
  const confirmDelete = useCallback(() => {
    Alert.alert(
      'Remove comment?',
      'Your comment will be replaced with “User Removed Their Comment”. Replies underneath will stay visible.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => onDelete(comment.id),
        },
      ],
    );
  }, [comment.id, onDelete]);

  /**
   * Unified owner menu (Edit + Remove + Cancel). Same two-action shape
   * as the shared `CommentItem` so users get identical muscle memory
   * across every comment surface.
   */
  const openMenu = useCallback(() => {
    Alert.alert('Your comment', undefined, [
      { text: 'Edit', onPress: () => setEditing(true) },
      { text: 'Remove', style: 'destructive', onPress: confirmDelete },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [confirmDelete]);

  const onReactionPick = async (kind: PostReactionKind) => {
    if (!user?.id) {
      Alert.alert('Sign in required', 'Log in to react to comments.');
      return;
    }
    try {
      await pickCommentReaction({
        postId,
        viewerId: user.id,
        comment,
        kind,
      });
    } catch {
      Alert.alert('Couldn’t update reaction', 'Try again in a moment.');
    }
  };

  const showTextRow = isDeleted || !!comment.content.trim();

  return (
    <View style={[styles.commentRow, depth > 0 && styles.commentRowReply]}>
      {maskAuthors ? (
        <View style={[styles.commentAvatar, styles.commentAnonAvatar, { borderColor: `${accent}55` }]}>
          <Text style={styles.commentAnonGlyph}>?</Text>
        </View>
      ) : !isDeleted && comment.author.id ? (
        <TouchableOpacity
          onPress={() => router.push(`/profile/${comment.author.id}` as never)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Open ${displayName} profile`}
        >
          <AvatarDisplay
            size={36}
            avatarUrl={avatarThumb(comment.author.avatarUrl, 36)}
            prioritizeRemoteAvatar
            ringColor={colors.dark.border}
            pulseFrame={pulseFrameFromUser(comment.author.pulseAvatarFrame)}
          />
        </TouchableOpacity>
      ) : (
        <AvatarDisplay
          size={36}
          avatarUrl={avatarThumb(comment.author.avatarUrl, 36)}
          prioritizeRemoteAvatar
          ringColor={colors.dark.border}
          pulseFrame={pulseFrameFromUser(comment.author.pulseAvatarFrame)}
        />
      )}
      <View style={styles.commentBody}>
        <View style={styles.commentNameRow}>
          {!maskAuthors && !isDeleted && comment.author.id ? (
            <TouchableOpacity
              onPress={() => router.push(`/profile/${comment.author.id}` as never)}
              activeOpacity={0.7}
              style={styles.commentNameHit}
              hitSlop={{ top: 4, bottom: 4 }}
              accessibilityRole="button"
              accessibilityLabel={`Open ${displayName} profile`}
            >
              <Text style={styles.commentName} numberOfLines={1}>
                {displayName}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.commentName} numberOfLines={1}>
              {isDeleted ? 'Removed' : displayName}
            </Text>
          )}
          {!maskAuthors && !isDeleted && comment.author.isVerified ? (
            <Ionicons name="checkmark-circle" size={11} color={colors.primary.teal} />
          ) : null}
          {!maskAuthors && !isDeleted ? (
            <PulseTierBadge
              tier={comment.author.pulseTier ?? null}
              size="xs"
              hideMurmur
              showIcon={false}
            />
          ) : null}
          {comment.isPinned && !isDeleted && !maskAuthors ? (
            <View style={styles.commentPinnedBadge}>
              <Text style={styles.commentPinnedText}>Pinned</Text>
            </View>
          ) : null}

          <View style={{ flex: 1 }} />

          {currentUserId && onReport && !isDeleted && !editing && !isAuthor ? (
            <TouchableOpacity
              onPress={() => onReport(comment.id)}
              hitSlop={10}
              accessibilityLabel="Report comment"
              activeOpacity={0.7}
            >
              <Ionicons name="flag-outline" size={14} color={colors.dark.textMuted} />
            </TouchableOpacity>
          ) : null}

          {isOwn && !isDeleted && !editing ? (
            <TouchableOpacity
              onPress={openMenu}
              hitSlop={10}
              accessibilityLabel="Comment options"
              activeOpacity={0.7}
            >
              <Ionicons
                name="ellipsis-horizontal"
                size={14}
                color={colors.dark.textMuted}
              />
            </TouchableOpacity>
          ) : null}
        </View>
        {!maskAuthors && !isDeleted && buildNeonPillTags(comment.author).length > 0 ? (
          <ProfileNeonPills tags={buildNeonPillTags(comment.author)} style={{ marginTop: 4 }} />
        ) : null}
        {editing && !isDeleted ? (
          <CommentEditComposer
            initialContent={comment.content}
            onSave={async (next) => {
              await onEdit(comment.id, next);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
            accent={accent}
          />
        ) : showTextRow ? (
          <CommentRichText
            text={comment.content}
            style={[styles.commentText, isDeleted && styles.commentTextDeleted]}
            mentionsInteractive={!maskAuthors}
            linksInteractive={!maskAuthors}
          />
        ) : null}

        {!isDeleted && !editing && comment.mediaUrl?.trim() ? (
          <TouchableOpacity
            onPress={() =>
              router.push(`/image-viewer?uri=${encodeURIComponent(comment.mediaUrl!.trim())}` as never)
            }
            activeOpacity={0.9}
            style={styles.commentAttachedImageTouch}
          >
            <Image
              source={{ uri: comment.mediaUrl!.trim() }}
              style={styles.commentAttachedImage}
              contentFit="contain"
              {...pulseImageFeedHeroProps}
            />
          </TouchableOpacity>
        ) : null}

        {/* Action row is suppressed for tombstones — there's nothing to
            react to. Also hidden in edit mode so the
            composer owns the action row (save/cancel). */}
        {!isDeleted && !editing ? (
          <View style={styles.commentFooterCol}>
            <Text style={styles.commentFooterTime}>
              {timeAgo(comment.createdAt)}
              {wasEdited ? <Text style={styles.commentEditedTag}> · edited</Text> : null}
            </Text>
            <CommentReactionStrip
              counts={comment.reactionCounts ?? emptyPostReactionCounts()}
              viewerReaction={comment.viewerReaction ?? null}
              accentColor={accent}
              onPick={onReactionPick}
            />
            <View style={styles.commentActionRow}>
              {depth === 0 && !commentsLocked ? (
                <TouchableOpacity
                  onPress={() => onReply(comment.id, displayName)}
                  activeOpacity={0.7}
                  hitSlop={6}
                >
                  <Text style={styles.commentReplyText}>Reply</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ) : null}

        {isDeleted && !editing ? (
          <Text style={styles.commentFooterTime}>{timeAgo(comment.createdAt)}</Text>
        ) : null}

        {comment.replies.length > 0 && depth === 0 ? (
          <TouchableOpacity
            onPress={() => setShowReplies((v) => !v)}
            activeOpacity={0.7}
            style={styles.commentRepliesToggle}
          >
            <View style={[styles.commentRepliesLine, { backgroundColor: colors.dark.border }]} />
            <Text style={[styles.commentRepliesText, { color: accent }]}>
              {showReplies
                ? 'Hide replies'
                : `View ${comment.replies.length} ${comment.replies.length === 1 ? 'reply' : 'replies'}`}
            </Text>
          </TouchableOpacity>
        ) : null}

        {showReplies && comment.replies.length > 0 ? (
          <View style={{ marginTop: 4 }}>
            {comment.replies.map((r) => (
              <CommentNode
                key={r.id}
                comment={r}
                accent={accent}
                maskAuthors={maskAuthors}
                postId={postId}
                onReply={onReply}
                currentUserId={currentUserId}
                canSeeOwnership={canSeeOwnership}
                commentsLocked={commentsLocked}
                onDelete={onDelete}
                onEdit={onEdit}
                onReport={onReport}
                depth={depth + 1}
              />
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** Best-effort prettifier for circle slug used in the header sub-label. */
function prettyCircleName(slug: string): string {
  if (!slug) return '';
  return slug
    .split('-')
    .map((p) => (p ? p[0].toUpperCase() + p.slice(1) : ''))
    .join(' ');
}

const cardElevation = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.32,
    shadowRadius: 10,
  },
  android: { elevation: 5 },
  default: {},
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },

  /* Header */
  header: { paddingHorizontal: 14, paddingBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: colors.dark.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, minWidth: 0, alignItems: 'flex-start' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: colors.dark.text, letterSpacing: -0.2 },
  headerSubRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 },
  headerDot: { width: 6, height: 6, borderRadius: 3 },
  headerSub: { fontSize: 12, fontWeight: '600', color: colors.dark.textSecondary },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  content: { paddingHorizontal: 12, paddingTop: 12, gap: 12 },

  /* Post card — slimmer version. The previous detail card was much taller
   * than the room feed cards (paddings, oversized author block, ~288pt
   * media tile) which made the page feel front-loaded. Now the card reads
   * closer to its room-feed counterpart so the page flows past it into
   * the comments instead of dominating the viewport. */
  postCard: {
    backgroundColor: colors.dark.card,
    borderRadius: borderRadius.card ?? 16,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderLeftWidth: 3,
    ...cardElevation,
  },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.dark.cardAlt },
  anonAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  anonGlyph: { fontSize: 16, fontWeight: '900', color: colors.dark.textSecondary },
  authorBody: { flex: 1, minWidth: 0 },
  authorNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  authorName: { fontSize: 14, fontWeight: '800', color: colors.dark.text, letterSpacing: -0.2 },
  authorNeonPills: { marginTop: 2 },
  authorMeta: { fontSize: 11.5, color: colors.dark.textMuted, marginTop: 1 },
  authorMetaEdited: {
    fontSize: 11.5,
    color: colors.dark.textMuted,
    fontStyle: 'italic',
  },

  title: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.dark.text,
    letterSpacing: -0.2,
    lineHeight: 21,
    marginTop: 10,
  },

  mediaWrapBase: {
    marginTop: 10,
    borderRadius: borderRadius.md ?? 12,
    overflow: 'hidden',
    width: '100%',
    backgroundColor: colors.dark.cardAlt,
  },
  media: { width: '100%', height: '100%' },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.30)',
  },
  videoBuffering: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  videoErrorWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 16,
    gap: 8,
  },
  videoErrorText: {
    color: colors.dark.textMuted,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },

  caption: {
    fontSize: 14,
    color: colors.dark.text,
    lineHeight: 20,
    marginTop: 8,
  },

  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  tagChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  tagText: { fontSize: 11.5, fontWeight: '700' },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dark.border,
  },
  statText: { fontSize: 12, fontWeight: '600', color: colors.dark.textMuted },
  statDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.dark.textMuted },

  actionsRow: { flexDirection: 'row', gap: 4, paddingVertical: 6 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    borderRadius: 10,
  },
  actionLabel: { fontSize: 12.5, fontWeight: '700' },

  /* Share to My Pulse */
  pulseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: colors.dark.card,
    borderRadius: borderRadius.card ?? 14,
    borderWidth: 1,
    ...cardElevation,
  },
  pulseIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseTitle: { fontSize: 14.5, fontWeight: '800', color: colors.dark.text, letterSpacing: -0.2 },
  pulseSubtitle: { fontSize: 12, color: colors.dark.textMuted, marginTop: 2 },

  /* Comments — inline, on-page conversation */
  commentsCard: {
    backgroundColor: colors.dark.card,
    borderRadius: borderRadius.card ?? 14,
    borderWidth: 1,
    borderColor: colors.dark.border,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    ...cardElevation,
  },
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 6,
  },
  commentsTitle: { fontSize: 14, fontWeight: '800', color: colors.dark.text, letterSpacing: -0.2 },
  commentsCount: { fontSize: 12, fontWeight: '700', color: colors.dark.textMuted },
  commentsLockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(12,18,32,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.22)',
    marginBottom: 8,
  },
  commentsLockedText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.dark.textSecondary,
    lineHeight: 18,
  },
  commentsEmpty: {
    fontSize: 13,
    color: colors.dark.textMuted,
    paddingVertical: 8,
  },

  commentRow: { flexDirection: 'row', gap: 10, paddingVertical: 12 },
  /** Reply rows get a subtle left indent + a thin guide so the thread of a
   *  conversation reads visually without deep nesting. */
  commentRowReply: {
    paddingLeft: 16,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.08)',
    marginLeft: 6,
  },
  commentAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.dark.cardAlt },
  commentAnonAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  commentAnonGlyph: { fontSize: 14, fontWeight: '900', color: colors.dark.textSecondary },
  commentBody: { flex: 1, minWidth: 0 },
  commentNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  commentName: { fontSize: 13, fontWeight: '700', color: colors.dark.text },
  commentPinnedBadge: { flexDirection: 'row', alignItems: 'center' },
  commentPinnedText: { fontSize: 10, color: colors.primary.gold, fontWeight: '600' },
  commentNameHit: { flexShrink: 1, minWidth: 0 },
  commentFooterTime: { fontSize: 12, color: colors.dark.textMuted },
  commentEditedTag: {
    fontSize: 11,
    color: colors.dark.textMuted,
    fontStyle: 'italic',
  },
  commentText: {
    fontSize: 14,
    color: colors.dark.textSecondary,
    lineHeight: 20,
  },
  commentTextDeleted: {
    fontStyle: 'italic',
    color: colors.dark.textMuted,
  },
  commentAttachedImageTouch: {
    marginTop: 6,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.dark.cardAlt,
  },
  commentAttachedImage: { width: '100%', height: 180, backgroundColor: colors.dark.cardAlt },

  commentFooterCol: { marginTop: 6, gap: 6 },
  commentActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 5,
  },
  commentMetaCell: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  commentMetaText: { fontSize: 11, fontWeight: '700', color: colors.dark.textMuted },
  commentReplyText: { fontSize: 12, fontWeight: '600', color: colors.primary.royal },

  commentRepliesToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  commentRepliesLine: { width: 18, height: 1 },
  commentRepliesText: { fontSize: 12, fontWeight: '700' },

  /* Reply context strip and the inline composer at the bottom of the card. */
  replyStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 8,
  },
  replyStripText: { flex: 1, fontSize: 12, fontWeight: '700' },

  composerAttachPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  composerAttachThumb: { width: 56, height: 56, borderRadius: 8, backgroundColor: colors.dark.cardAlt },
  composerAttachClear: { padding: 2 },
  composerAttachBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dark.cardAlt,
    marginBottom: 2,
  },

  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  composerMentionWrap: {
    flex: 1,
    minWidth: 0,
  },
  composerInputFramed: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: Platform.OS === 'ios' ? 8 : 6,
    fontSize: 14,
    color: colors.dark.text,
    minHeight: 44,
    maxHeight: 120,
    textAlignVertical: 'top',
  },
  composerSendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Appeal */
  appealLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: borderRadius.card ?? 14,
    backgroundColor: colors.dark.cardAlt,
    borderWidth: 1,
    borderColor: `${colors.primary.teal}44`,
  },
  appealLinkText: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.primary.teal },
});
