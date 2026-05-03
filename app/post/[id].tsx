import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, Alert, Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { AvatarDisplay, pulseFrameFromUser } from '@/components/profile/AvatarBuilder';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LoadingState } from '@/components/ui/LoadingState';
import { usePost, useComments, useLikedPostIds } from '@/hooks/useQueries';
import { useAppStore } from '@/store/useAppStore';
import { useAuth } from '@/contexts/AuthContext';
import { sharePostMenu } from '@/lib/share';
import { invalidatePostRelatedQueries } from '@/lib/invalidatePostQueries';
import { postKeys, commentKeys, likedPostKeys, profileUpdateKeys, savedPostKeys } from '@/lib/queryKeys';
import { postsService } from '@/services/supabase/posts';
import { profileUpdatesService } from '@/services/profileUpdates';
import { commentService } from '@/services/comment';
import { useToast } from '@/components/ui/Toast';
import { colors, borderRadius } from '@/theme';
import { COMMENT_DELETED_TOMBSTONE, COMMENT_MAX_LENGTH } from '@/constants';
import { CaptionWithMentions } from '@/components/ui/CaptionWithMentions';
import { CommentRichText } from '@/components/ui/CommentRichText';
import { MentionAutocomplete, type MentionRef } from '@/components/ui/MentionAutocomplete';
import { CommentEditComposer } from '@/components/comments/CommentEditComposer';
import { EditPostCaptionModal } from '@/components/posts/EditPostCaptionModal';
import { ReportModal } from '@/components/ui/ReportModal';
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
import type { Comment } from '@/types';

const { width: SCREEN_W } = Dimensions.get('window');

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

  /**
   * Opens the owner's action menu (Edit + Delete + Cancel). We swap the
   * always-visible trash icon for a single ellipsis so the header
   * doesn't render two destructive affordances side by side, and so
   * adding future owner-only actions (pin to top, archive, etc.) stays
   * a one-line change.
   */
  const openOwnerMenu = useCallback(() => {
    Alert.alert('Your post', undefined, [
      { text: 'Edit caption', onPress: () => setEditCaptionOpen(true) },
      { text: 'Delete post', style: 'destructive', onPress: handleDelete },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [handleDelete]);

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
  const commentQs = circle ? `?circle=${encodeURIComponent(String(circle))}` : '';
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
                  {post.creator.role && (
                    <View style={[styles.rolePill, { backgroundColor: `${accent.color}1F`, borderColor: `${accent.color}55` }]}>
                      <Text style={[styles.rolePillText, { color: accent.color }]}>{post.creator.role}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.authorMeta}>
                  {post.creator.specialty ? `${post.creator.specialty} · ` : ''}{timeAgo(post.createdAt)}
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
          {(post.type === 'image' || post.type === 'video') && previewUri ? (
            <TouchableOpacity
              onPress={() => {
                if (post.type === 'image' && post.mediaUrl) {
                  router.push(`/image-viewer?uri=${encodeURIComponent(post.mediaUrl)}`);
                }
              }}
              activeOpacity={0.92}
              style={styles.mediaWrap}
            >
              <Image
                source={{ uri: previewUri }}
                style={styles.media}
                contentFit="cover"
                transition={120}
              />
              {post.type === 'video' && (
                <View style={styles.playOverlay}>
                  <Ionicons name="play" size={42} color="#FFFFFFE6" />
                </View>
              )}
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

          {/* Stat row */}
          <View style={styles.statsRow}>
            <Text style={styles.statText}>{formatCount(post.likeCount)} likes</Text>
            <View style={styles.statDot} />
            <Text style={styles.statText}>{formatCount(post.commentCount)} comments</Text>
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
              tint={liked ? '#EF4444' : colors.dark.textSecondary}
              onPress={handleToggleLike}
            />
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
          autoFocusComposer={shouldFocusComments}
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
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const inputRef = useRef<MentionRef>(null);

  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [reportCommentId, setReportCommentId] = useState<string | null>(null);

  /** Live char-count derived from the current draft — drives both the
   *  inline counter and the "near limit" colour swap so the user has
   *  warning before the maxLength prop hard-stops their input. */
  const remaining = COMMENT_MAX_LENGTH - text.length;
  const nearLimit = remaining <= 30;

  const focusComposer = useCallback(() => {
    /** Slight delay so the field is mounted before requesting focus on
     *  Android, where the system keyboard race-condition can swallow
     *  focus events fired in the same tick as a state update. */
    setTimeout(() => inputRef.current?.focus(), 50);
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
      const queryKey = commentKeys.byPost(postId);
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
    [postId, queryClient, toast],
  );

  /**
   * Saves an edited comment body. Mirrors the delete flow's optimistic
   * cache patch so the "· edited" badge appears immediately. Throws on
   * failure so the inline composer can hold onto the user's draft and
   * surface a retry hint instead of silently clearing.
   */
  const handleEdit = useCallback(
    async (commentId: string, nextContent: string) => {
      const queryKey = commentKeys.byPost(postId);
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
    [postId, queryClient, toast],
  );

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
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
      await commentService.addComment(postId, safe, replyTo?.id);
      analytics.track('comment_created', { postId, isReply: !!replyTo });
      setText('');
      setReplyTo(null);
      /**
       * Optimistically bump every cached copy of this post's commentCount
       * (feed rail, single-post header, anywhere else rendering the same
       * Post object) so the counter ticks instantly. The DB trigger on
       * `comments` (migration 055) remains the source of truth.
       */
      bumpPostCount(postId, 'commentCount', 1);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: commentKeys.byPost(postId) }),
        queryClient.invalidateQueries({ queryKey: postKeys.byId(postId) }),
      ]);
    } catch {
      try {
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
  }, [text, sending, postId, replyTo, authUserId, queryClient, toast]);

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

      {comments.length === 0 ? (
        <Text style={styles.commentsEmpty}>
          Be the first to share your thoughts on this post.
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
              onDelete={handleDelete}
              onEdit={handleEdit}
              onReport={(cid) => setReportCommentId(cid)}
            />
          ))}
        </View>
      )}

      {/* Reply context strip — slim, dismissible, only when replying. */}
      {replyTo && (
        <View style={[styles.replyStrip, { backgroundColor: `${accent}14`, borderColor: `${accent}55` }]}>
          <Text style={[styles.replyStripText, { color: accent }]} numberOfLines={1}>
            Replying to {replyTo.name}
          </Text>
          <TouchableOpacity onPress={() => setReplyTo(null)} hitSlop={6}>
            <Ionicons name="close-circle" size={16} color={accent} />
          </TouchableOpacity>
        </View>
      )}

      {/* Inline composer — taps directly to type, no modal navigation. */}
      <View style={styles.composerRow}>
        <MentionAutocomplete
          ref={inputRef}
          style={styles.composerInput}
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
            { backgroundColor: text.trim() ? accent : colors.dark.cardAlt },
          ]}
          disabled={!text.trim() || sending}
          onPress={handleSend}
          activeOpacity={0.85}
        >
          <Ionicons
            name="send"
            size={16}
            color={text.trim() ? '#FFFFFF' : colors.dark.textMuted}
          />
        </TouchableOpacity>
      </View>

      {/* Char-count footer — only surfaces once the user starts typing so
          the composer doesn't feel form-like at rest. Colour swaps to the
          room accent when the user is within 30 chars of the cap. */}
      {text.length > 0 ? (
        <Text
          style={[
            styles.composerCount,
            nearLimit && { color: accent, fontWeight: '700' },
          ]}
          accessibilityLiveRegion="polite"
        >
          {text.length}/{COMMENT_MAX_LENGTH}
        </Text>
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
            size={32}
            avatarUrl={comment.author.avatarUrl}
            prioritizeRemoteAvatar
            ringColor={colors.dark.border}
            pulseFrame={pulseFrameFromUser(comment.author.pulseAvatarFrame)}
          />
        </TouchableOpacity>
      ) : (
        <AvatarDisplay
          size={32}
          avatarUrl={comment.author.avatarUrl}
          prioritizeRemoteAvatar
          ringColor={colors.dark.border}
          pulseFrame={pulseFrameFromUser(comment.author.pulseAvatarFrame)}
        />
      )}
      <View style={styles.commentBody}>
        <View style={styles.commentNameRow}>
          <Text style={styles.commentName} numberOfLines={1}>
            {isDeleted ? 'Removed' : displayName}
          </Text>
          {!maskAuthors && !isDeleted && comment.author.isVerified ? (
            <Ionicons name="checkmark-circle" size={11} color={colors.primary.teal} />
          ) : null}
          <Text style={styles.commentTime}>
            · {timeAgo(comment.createdAt)}
            {wasEdited && !isDeleted ? (
              <Text style={styles.commentEditedTag}> · edited</Text>
            ) : null}
          </Text>

          {/* Spacer pushes the overflow icon to the far right of the row. */}
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

          {/** Author-only overflow. Taps open an action-sheet with
           *   Edit + Remove (see `openMenu`) so both affordances share
           *   one entry point. Hidden on tombstones (nothing to act on)
           *   and anonymous posts (would leak authorship). */}
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
        ) : (
          <CommentRichText
            text={comment.content}
            style={[styles.commentText, isDeleted && styles.commentTextDeleted]}
            mentionsInteractive={!maskAuthors}
            linksInteractive={!maskAuthors}
          />
        )}

        {/* Action row is suppressed for tombstones — there's nothing to
            like, no one to reply to. Also hidden in edit mode so the
            composer owns the action row (save/cancel). */}
        {!isDeleted && !editing ? (
          <View style={styles.commentActionRow}>
            {comment.likeCount > 0 ? (
              <View style={styles.commentMetaCell}>
                <Ionicons name="heart" size={11} color={colors.dark.textMuted} />
                <Text style={styles.commentMetaText}>{formatCount(comment.likeCount)}</Text>
              </View>
            ) : null}
            {/** Only the top-level row exposes "Reply" — nested replies don't,
             *  so we don't grow conversations into deep reply chains that
             *  break readability on a phone-sized card. */}
            {depth === 0 && (
              <TouchableOpacity
                onPress={() => onReply(comment.id, displayName)}
                activeOpacity={0.7}
                hitSlop={6}
              >
                <Text style={styles.commentReplyText}>Reply</Text>
              </TouchableOpacity>
            )}
          </View>
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
  rolePill: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, borderWidth: 1 },
  rolePillText: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.4 },
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

  mediaWrap: {
    marginTop: 10,
    borderRadius: borderRadius.md ?? 12,
    overflow: 'hidden',
    /** Cap media at a sensible portrait-friendly height. Old value
     *  (`SCREEN_W * 0.7` ~ 288pt) made the post tile dominate the page;
     *  the new ~55% width keeps memes legible while leaving room for the
     *  caption + actions + comments to sit in the same viewport. Also
     *  capped to 240pt on extra-large devices. */
    height: Math.min(SCREEN_W * 0.55, 240),
    backgroundColor: colors.dark.cardAlt,
  },
  media: { width: '100%', height: '100%' },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.30)',
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
  commentsEmpty: {
    fontSize: 13,
    color: colors.dark.textMuted,
    paddingVertical: 8,
  },

  commentRow: { flexDirection: 'row', gap: 10, paddingVertical: 8 },
  /** Reply rows get a subtle left indent + a thin guide so the thread of a
   *  conversation reads visually without deep nesting. */
  commentRowReply: {
    paddingLeft: 16,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.08)',
    marginLeft: 6,
  },
  commentAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.dark.cardAlt },
  commentAnonAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  commentAnonGlyph: { fontSize: 14, fontWeight: '900', color: colors.dark.textSecondary },
  commentBody: { flex: 1, minWidth: 0 },
  commentNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  commentName: { fontSize: 13, fontWeight: '800', color: colors.dark.text },
  commentTime: { fontSize: 11.5, color: colors.dark.textMuted },
  commentEditedTag: {
    fontSize: 11,
    color: colors.dark.textMuted,
    fontStyle: 'italic',
  },
  commentText: { fontSize: 13.5, color: colors.dark.text, lineHeight: 19, marginTop: 2 },
  commentTextDeleted: {
    fontStyle: 'italic',
    color: colors.dark.textMuted,
  },

  commentActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 5,
  },
  commentMetaCell: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  commentMetaText: { fontSize: 11, fontWeight: '700', color: colors.dark.textMuted },
  commentReplyText: { fontSize: 12, fontWeight: '800', color: colors.dark.textMuted },

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

  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: 10,
  },
  composerInput: {
    flex: 1,
    backgroundColor: colors.dark.cardAlt,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 14,
    color: colors.dark.text,
    minHeight: 44,
    maxHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  composerSendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerCount: {
    alignSelf: 'flex-end',
    marginTop: 6,
    marginRight: 4,
    fontSize: 11,
    color: colors.dark.textMuted,
    fontVariant: ['tabular-nums'],
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
