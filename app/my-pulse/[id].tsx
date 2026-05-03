import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image as RNImage,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';
import { useAppStore } from '@/store/useAppStore';
import { profileUpdatesService } from '@/services/profileUpdates';
import { postsService } from '@/services/supabase';
import { userService } from '@/services/user';
import { withPulseVerseCta } from '@/lib/share';
import { postKeys, profileUpdateKeys, userKeys } from '@/lib/queryKeys';
import { useFeatureFlags } from '@/lib/featureFlags';
import { colors, borderRadius, typography, spacing } from '@/theme';
import { relativeMyPulse } from '@/utils/format';
import { resolvePicsUrls, getMyPulseDisplayType } from '@/utils/myPulseDisplayType';
import { CaptionWithMentions } from '@/components/ui/CaptionWithMentions';
import { CommentEditComposer } from '@/components/comments/CommentEditComposer';
import { EditPostCaptionModal } from '@/components/posts/EditPostCaptionModal';
import type { ProfileUpdateComment } from '@/types';
import { MY_PULSE_VISUALS } from '@/components/mypage/cards/MyPulseCardShell';
import { CirclesOrbitIcon } from '@/components/mypage/cards/icons/CirclesOrbitIcon';
import { AvatarDisplay, pulseFrameFromUser } from '@/components/profile/AvatarBuilder';

const SCREEN_W = Dimensions.get('window').width;

export default function MyPulseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { profile, user: authUser } = useAuth();
  const storeUser = useAppStore((s) => s.currentUser);
  const viewer = profile ?? storeUser;
  const viewerId = authUser?.id ?? viewer?.id ?? null;
  const liveStreaming = useFeatureFlags((s) => s.liveStreaming);

  /**
   * Load the profile_update with viewer-scoped `liked` hydration so the
   * heart button reflects the signed-in user's state on first render
   * instead of flashing outlined → filled.
   */
  const { data: update, isLoading, isSuccess } = useQuery({
    queryKey: profileUpdateKeys.detailForViewer(id!, viewerId),
    queryFn: () => profileUpdatesService.getById(id!, viewerId),
    enabled: !!id,
  });

  /**
   * Flat list of comments for this update, oldest-first so the thread
   * reads like a conversation top-down. Cached under the update id only
   * (comments are public-visibility) so different viewers share the
   * same cache entry and the author sees their own writes reflect.
   */
  const { data: comments = [] } = useQuery({
    queryKey: profileUpdateKeys.comments(id!),
    queryFn: () => profileUpdatesService.listComments(id!),
    enabled: !!id,
  });

  /**
   * Author profile — shared with `useUser` so we reuse the same cache
   * entry across profile / mentions / my-pulse detail instead of
   * spinning up a parallel `['profile', userId]` key.
   */
  const { data: author } = useQuery({
    queryKey: update?.userId ? userKeys.detail(update.userId) : userKeys.root(),
    queryFn: () => userService.getUserById(update!.userId),
    enabled: !!update?.userId,
  });

  /**
   * If this update pins a feed post, resolve it under the same
   * viewer-scoped key `usePost` uses so we reuse the feed cache entry
   * (no extra network, and any like/comment bumps anywhere else in
   * the app reflect here for free).
   */
  const { data: linkedPost } = useQuery({
    queryKey: update?.linkedPostId
      ? postKeys.detail(update.linkedPostId, viewerId)
      : postKeys.root(),
    queryFn: () => postsService.getById(update!.linkedPostId!, viewerId),
    enabled: !!update?.linkedPostId,
  });

  // Redirect when the row doesn't exist (e.g. deleted since pin). Never bare `router.back()` — deep links may have no history.
  useEffect(() => {
    if (!isSuccess || !id || update) return;
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/my-pulse');
  }, [isSuccess, id, update, router]);

  const isOwner = !!viewerId && !!update && update.userId === viewerId;
  const displayType = update ? getMyPulseDisplayType(update) : 'thought';
  const visuals = MY_PULSE_VISUALS[displayType];

  // ─── Like toggle ───────────────────────────────────────────────────
  const likeMut = useMutation({
    mutationFn: () => profileUpdatesService.toggleLike(id!),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: profileUpdateKeys.detailForViewer(id!, viewerId) });
      const prev = queryClient.getQueryData<any>(profileUpdateKeys.detailForViewer(id!, viewerId));
      if (prev) {
        const nextLiked = !prev.liked;
        queryClient.setQueryData(profileUpdateKeys.detailForViewer(id!, viewerId), {
          ...prev,
          liked: nextLiked,
          likeCount: Math.max((prev.likeCount ?? 0) + (nextLiked ? 1 : -1), 0),
        });
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(profileUpdateKeys.detailForViewer(id!, viewerId), ctx.prev);
      }
    },
    onSettled: () => {
      if (update?.userId) {
        queryClient.invalidateQueries({ queryKey: profileUpdateKeys.forUser(update.userId) });
      }
      queryClient.invalidateQueries({ queryKey: profileUpdateKeys.byId(id!) });
    },
  });

  // ─── Delete ────────────────────────────────────────────────────────
  const deleteMut = useMutation({
    mutationFn: () => {
      if (!viewerId) throw new Error('Not signed in');
      return profileUpdatesService.deleteForUser(id!, viewerId);
    },
    onSuccess: async () => {
      if (update?.userId) {
        await queryClient.invalidateQueries({ queryKey: profileUpdateKeys.forUser(update.userId) });
      }
      queryClient.removeQueries({ queryKey: profileUpdateKeys.byId(id!) });
      queryClient.removeQueries({ queryKey: profileUpdateKeys.comments(id!) });
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)/my-pulse');
    },
  });

  const confirmDelete = useCallback(() => {
    Alert.alert('Delete this update?', 'It will disappear from your My Pulse.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMut.mutate() },
    ]);
  }, [deleteMut]);

  // ─── Pin / unpin (owner) ───────────────────────────────────────────
  const togglePinMut = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('Missing update id');
      const row = queryClient.getQueryData<{ isPinned?: boolean } | undefined>(
        profileUpdateKeys.detailForViewer(id, viewerId),
      );
      const pinned = row?.isPinned === true;
      if (pinned) {
        await profileUpdatesService.unpin(id);
      } else {
        await profileUpdatesService.pin(id);
      }
    },
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      queryClient.invalidateQueries({ queryKey: profileUpdateKeys.detailForViewer(id!, viewerId) });
      if (update?.userId) {
        queryClient.invalidateQueries({ queryKey: profileUpdateKeys.forUser(update.userId) });
      }
    },
    onError: (e: any) => {
      Alert.alert('Could not update pin', e?.message ?? 'Try again in a moment.');
    },
  });

  const onTogglePinDetail = useCallback(() => {
    void togglePinMut.mutate();
  }, [togglePinMut]);

  // ─── Edit ─────────────────────────────────────────────────────────
  /**
   * Controls the body-edit modal. Kept as plain state so every open
   * re-seeds the input from the current `update.content` instead of
   * leaking a prior draft into the next session.
   */
  const [editOpen, setEditOpen] = useState(false);

  /**
   * Owner-only body update. We patch the single-pulse + owner feed
   * caches optimistically so the "· edited" tag shows immediately,
   * then reconcile on success using the server-authoritative
   * `editedAt` written by the migration 057 trigger.
   */
  const editMut = useMutation({
    mutationFn: (nextContent: string) => {
      if (!viewerId) throw new Error('Not signed in');
      return profileUpdatesService.updateForUser(
        id!,
        viewerId,
        { content: nextContent },
        viewerId,
      );
    },
    onMutate: async (nextContent) => {
      await queryClient.cancelQueries({ queryKey: profileUpdateKeys.detailForViewer(id!, viewerId) });
      const prev = queryClient.getQueryData<any>(profileUpdateKeys.detailForViewer(id!, viewerId));
      if (prev) {
        queryClient.setQueryData(profileUpdateKeys.detailForViewer(id!, viewerId), {
          ...prev,
          content: nextContent,
          editedAt: new Date().toISOString(),
        });
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(profileUpdateKeys.detailForViewer(id!, viewerId), ctx.prev);
      }
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(profileUpdateKeys.detailForViewer(id!, viewerId), (prev: any) =>
        prev ? { ...prev, ...updated } : updated,
      );
      if (update?.userId) {
        queryClient.invalidateQueries({ queryKey: profileUpdateKeys.forUser(update.userId) });
      }
    },
  });

  /**
   * Types whose body lives on `profile_updates.content` and makes sense
   * to revise in-place. Clips and Circle pins bookmark a foreign
   * resource, so editing their Pulse-side note isn't a meaningful
   * surface here (the source post is where the content lives).
   */
  const canEditBody =
    isOwner && (displayType === 'thought' || displayType === 'pics' || displayType === 'link');

  // ─── Comment composer ──────────────────────────────────────────────
  const [draft, setDraft] = useState('');
  const inputRef = useRef<TextInput>(null);
  const addCommentMut = useMutation({
    mutationFn: (text: string) => {
      if (!viewerId) throw new Error('Not signed in');
      return profileUpdatesService.addComment(id!, viewerId, text);
    },
    onSuccess: () => {
      setDraft('');
      inputRef.current?.blur();
      queryClient.invalidateQueries({ queryKey: profileUpdateKeys.comments(id!) });
      if (update?.userId) {
        queryClient.invalidateQueries({ queryKey: profileUpdateKeys.forUser(update.userId) });
      }
      queryClient.invalidateQueries({ queryKey: profileUpdateKeys.byId(id!) });
    },
    onError: (e: any) => Alert.alert('Could not post comment', e?.message ?? 'Try again'),
  });

  const deleteCommentMut = useMutation({
    mutationFn: (commentId: string) => profileUpdatesService.deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileUpdateKeys.comments(id!) });
      if (update?.userId) {
        queryClient.invalidateQueries({ queryKey: profileUpdateKeys.forUser(update.userId) });
      }
      queryClient.invalidateQueries({ queryKey: profileUpdateKeys.byId(id!) });
    },
  });

  /**
   * Author-only edit for a My Pulse comment. We patch the comment list
   * cache optimistically so the new body + "· edited" tag show up
   * immediately, then reconcile from the server response once
   * migration 057's trigger has stamped the authoritative `edited_at`.
   * On failure we roll back and re-raise so the inline composer can
   * surface a retry state without clearing the user's draft.
   */
  const editCommentMut = useMutation({
    mutationFn: ({ commentId, content }: { commentId: string; content: string }) => {
      if (!viewerId) throw new Error('Not signed in');
      return profileUpdatesService.updateComment(commentId, viewerId, content);
    },
    onMutate: ({ commentId, content }) => {
      const key = profileUpdateKeys.comments(id!);
      const prev = queryClient.getQueryData<ProfileUpdateComment[]>(key);
      if (prev) {
        queryClient.setQueryData<ProfileUpdateComment[]>(
          key,
          prev.map((c) =>
            c.id === commentId
              ? { ...c, content, editedAt: new Date().toISOString() }
              : c,
          ),
        );
      }
      return { prev };
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(profileUpdateKeys.comments(id!), ctx.prev);
      }
    },
    onSuccess: (updated) => {
      const key = profileUpdateKeys.comments(id!);
      const current = queryClient.getQueryData<ProfileUpdateComment[]>(key);
      if (current) {
        queryClient.setQueryData<ProfileUpdateComment[]>(
          key,
          current.map((c) =>
            c.id === updated.id ? { ...c, ...updated } : c,
          ),
        );
      }
    },
  });

  const postComment = useCallback(() => {
    const t = draft.trim();
    if (!t) return;
    if (!viewerId) {
      Alert.alert('Sign in to comment', 'You need to be signed in to leave a comment.');
      return;
    }
    addCommentMut.mutate(t);
  }, [draft, addCommentMut, viewerId]);

  // ─── Share ─────────────────────────────────────────────────────────
  const onShare = useCallback(async () => {
    const content = update?.content?.trim() || 'A PulseVerse update';
    try {
      /**
       * Append the "Get PulseVerse" CTA so an SMS / email / DM
       * recipient who doesn't have the app yet knows where to install
       * it. withPulseVerseCta is idempotent so a re-share never
       * double-appends the CTA.
       */
      await Share.share({
        message: withPulseVerseCta(`${content.slice(0, 160)} — via PulseVerse`),
      });
    } catch {
      /* user cancelled */
    }
  }, [update]);

  // ─── Open-source deep link ─────────────────────────────────────────
  const openSource = useCallback(() => {
    if (!update) return;
    if (update.linkedPostId) {
      /**
       * Feed / Circle-post pins always drop the viewer into the
       * fullscreen feed-style viewer so the original video plays and
       * the real engagement rail wires through — matches the behavior
       * on the Pulse clip card tap. The Circle slug rides along as a
       * query param so anonymous masking / accent stays correct.
       */
      const qs = update.linkedCircleSlug?.trim()
        ? `?circle=${encodeURIComponent(update.linkedCircleSlug.trim())}`
        : '';
      router.push(`/feed/${update.linkedPostId}${qs}` as any);
      return;
    }
    if (update.linkedThreadId && update.linkedCircleSlug) {
      router.push(`/communities/${update.linkedCircleSlug}/thread/${update.linkedThreadId}` as any);
      return;
    }
    if (update.linkedCircleSlug) {
      router.push(`/communities/${update.linkedCircleSlug}` as any);
      return;
    }
    if (update.linkedLiveId && liveStreaming) {
      router.push(`/live/${update.linkedLiveId}` as any);
      return;
    }
    if (update.linkedUrl?.trim()) {
      const raw = update.linkedUrl.trim();
      const href = raw.startsWith('http') ? raw : `https://${raw}`;
      Linking.openURL(href).catch(() => undefined);
    }
  }, [router, update, liveStreaming]);

  const sourceButtonLabel = useMemo(() => {
    if (!update) return null;
    if (update.linkedPostId) return 'Open original post';
    if (update.linkedThreadId) return 'Open Circle discussion';
    if (update.linkedCircleSlug) return 'View Circle';
    if (update.linkedLiveId) return liveStreaming ? 'Open live' : null;
    if (update.linkedUrl?.trim()) return 'Open link';
    return null;
  }, [update, liveStreaming]);

  // ─── Render ────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
        <Header onBack={() => router.back()} />
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary.teal} />
        </View>
      </View>
    );
  }

  if (!update) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
        <Header onBack={() => router.back()} />
        <Text style={styles.muted}>Update not found.</Text>
      </View>
    );
  }

  const liked = update.liked === true;
  const likeCount = update.likeCount ?? 0;
  const commentCount = comments.length;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 52 : 0}
    >
      <View style={{ paddingTop: insets.top + 6 }}>
        <Header
          onBack={() => router.back()}
          onShare={onShare}
          onDelete={isOwner ? confirmDelete : undefined}
          onEdit={canEditBody ? () => setEditOpen(true) : undefined}
          onTogglePin={isOwner ? onTogglePinDetail : undefined}
          isPinned={update.isPinned === true}
          pinBusy={togglePinMut.isPending}
        />
      </View>

      <FlatList
        style={styles.listFlex}
        data={comments}
        keyExtractor={(c) => c.id}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews={false}
        contentContainerStyle={{ paddingBottom: 16 }}
        ListHeaderComponent={
          <View style={styles.inner}>
            {/* Author row */}
            <Pressable
              onPress={() =>
                author?.id && router.push(`/profile/${author.id}` as any)
              }
              style={styles.authorRow}
            >
              {author?.avatarUrl ? (
                <AvatarDisplay
                  size={40}
                  avatarUrl={author.avatarUrl}
                  prioritizeRemoteAvatar
                  ringColor={colors.dark.border}
                  pulseFrame={pulseFrameFromUser(author.pulseAvatarFrame)}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Ionicons name="person" size={18} color={colors.dark.textMuted} />
                </View>
              )}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.authorName} numberOfLines={1}>
                  {author?.displayName || 'Someone'}
                </Text>
                <Text style={styles.authorMeta} numberOfLines={1}>
                  {author?.username ? `@${author.username} · ` : ''}
                  {relativeMyPulse(update.createdAt)}
                  {update.editedAt ? ' · edited' : ''}
                </Text>
              </View>
              {/* Type pill — mirrors the card accent so the detail view
                  feels like a zoomed-in version of the feed card */}
              <View
                style={[
                  styles.typePill,
                  { backgroundColor: visuals.fill, borderColor: visuals.ring },
                ]}
              >
                {visuals.glyph ? (
                  visuals.glyph({ size: 13, color: visuals.accent })
                ) : (
                  <Ionicons name={visuals.icon} size={11} color={visuals.accent} />
                )}
                <Text style={[styles.typePillLabel, { color: visuals.accent }]}>
                  {visuals.label}
                </Text>
              </View>
            </Pressable>

            {/* Mood pill (thought type) */}
            {update.mood ? (
              <View style={styles.moodPill}>
                <Text style={styles.moodText}>{update.mood}</Text>
              </View>
            ) : null}

            {/* Main body — type aware */}
            <TypedBody
              update={update}
              linkedPostTitle={linkedPost?.caption}
              linkedPostThumbUrl={linkedPost?.thumbnailUrl ?? linkedPost?.mediaUrl}
              onOpenSource={openSource}
            />

            {/* Source deep-link CTA (when the update references other content) */}
            {sourceButtonLabel ? (
              <TouchableOpacity
                style={[styles.sourceCta, { borderColor: visuals.ring }]}
                onPress={openSource}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-redo" size={14} color={visuals.accent} />
                <Text style={[styles.sourceCtaLabel, { color: visuals.accent }]}>
                  {sourceButtonLabel}
                </Text>
              </TouchableOpacity>
            ) : null}

            {/* Engagement row — always visible so visitors can Pulse / reply */}
            <View style={styles.engagementRow}>
              <TouchableOpacity
                onPress={() => {
                  if (!viewerId) {
                    Alert.alert('Sign in', 'You need an account to Pulse this post.');
                    return;
                  }
                  Haptics.selectionAsync().catch(() => {});
                  likeMut.mutate();
                }}
                style={[styles.engageBtn, liked && styles.engageBtnActive]}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={liked ? 'Un-Pulse' : 'Pulse'}
              >
                <Ionicons
                  name={liked ? 'heart' : 'heart-outline'}
                  size={17}
                  color={liked ? '#FF2D92' : colors.dark.textSecondary}
                />
                <Text style={[styles.engageLabel, liked && { color: '#FF2D92' }]}>
                  Pulse
                </Text>
                {likeCount > 0 ? (
                  <Text style={[styles.engageCount, liked && { color: '#FF2D92' }]}>
                    {likeCount}
                  </Text>
                ) : null}
              </TouchableOpacity>
              <View style={styles.engageDivider} />
              <TouchableOpacity
                onPress={() => inputRef.current?.focus()}
                style={styles.engageBtn}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Comment"
              >
                <Ionicons
                  name="chatbubble-outline"
                  size={16}
                  color={colors.dark.textSecondary}
                />
                <Text style={styles.engageLabel}>Comment</Text>
                {commentCount > 0 ? (
                  <Text style={styles.engageCount}>{commentCount}</Text>
                ) : null}
              </TouchableOpacity>
              <View style={styles.engageDivider} />
              <TouchableOpacity
                onPress={onShare}
                style={styles.engageBtn}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Share"
              >
                <Ionicons
                  name="share-outline"
                  size={16}
                  color={colors.dark.textSecondary}
                />
                <Text style={styles.engageLabel}>Share</Text>
              </TouchableOpacity>
            </View>

            {/* Comments section header */}
            <View style={styles.commentsHead}>
              <Text style={styles.commentsTitle}>
                {commentCount === 0
                  ? 'No comments yet'
                  : commentCount === 1
                    ? '1 comment'
                    : `${commentCount} comments`}
              </Text>
              {commentCount === 0 ? (
                <Text style={styles.commentsHint}>Be the first to reply.</Text>
              ) : null}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <CommentRow
            comment={item}
            canDelete={item.authorId === viewerId || update.userId === viewerId}
            /**
             * Only the author can edit their own comment — the Pulse
             * owner can remove it, but shouldn't be able to rewrite
             * someone else's words.
             */
            canEdit={item.authorId === viewerId}
            onDelete={() => deleteCommentMut.mutate(item.id)}
            onEdit={async (content) => {
              await editCommentMut.mutateAsync({ commentId: item.id, content });
            }}
            onPressAuthor={() =>
              router.push(`/profile/${item.authorId}` as any)
            }
          />
        )}
      />

      {/* Sticky composer */}
      <View
        style={[
          styles.composer,
          { paddingBottom: Math.max(insets.bottom, 10) },
        ]}
      >
        <TextInput
          ref={inputRef}
          value={draft}
          onChangeText={setDraft}
          placeholder={viewerId ? 'Add a comment…' : 'Sign in to comment'}
          placeholderTextColor={colors.dark.textMuted}
          style={styles.input}
          multiline
          editable={!!viewerId}
          maxLength={600}
        />
        <TouchableOpacity
          onPress={postComment}
          disabled={!draft.trim() || addCommentMut.isPending}
          style={[
            styles.sendBtn,
            (!draft.trim() || addCommentMut.isPending) && styles.sendBtnDisabled,
          ]}
          accessibilityLabel="Post comment"
        >
          {addCommentMut.isPending ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Ionicons name="arrow-up" size={18} color="#FFF" />
          )}
        </TouchableOpacity>
      </View>

      {canEditBody && update ? (
        <EditPostCaptionModal
          visible={editOpen}
          initialCaption={update.content ?? ''}
          title={
            displayType === 'pics'
              ? 'Edit caption'
              : displayType === 'link'
              ? 'Edit your take'
              : 'Edit thought'
          }
          placeholder={
            displayType === 'pics'
              ? 'Add a caption to your photos…'
              : displayType === 'link'
              ? 'Your personal take on this link…'
              : "What's on your mind?"
          }
          hint={
            displayType === 'pics'
              ? 'You can leave the caption blank.'
              : undefined
          }
          allowEmpty={displayType === 'pics'}
          onClose={() => setEditOpen(false)}
          onSave={async (next) => {
            await editMut.mutateAsync(next);
          }}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}

// ════════════════════════════════════════════════════════════════════
//  Header — back / share / delete
// ════════════════════════════════════════════════════════════════════

function Header({
  onBack,
  onShare,
  onDelete,
  onEdit,
  onTogglePin,
  isPinned,
  pinBusy,
}: {
  onBack: () => void;
  onShare?: () => void;
  onDelete?: () => void;
  /**
   * Owner-only edit. Present when the viewer authored this Pulse and
   * the current display type has a meaningful body to revise. We keep
   * this optional so the same Header component still works for
   * non-owners (no menu) and for display types where edit doesn't fit
   * (shared Circle discussions, etc.).
   */
  onEdit?: () => void;
  /** Owner-only: featured pin at top of My Pulse (one at a time server-side). */
  onTogglePin?: () => void;
  isPinned?: boolean;
  pinBusy?: boolean;
}) {
  const openOwnerMenu = useCallback(() => {
    const buttons: Array<{ text: string; style?: 'cancel' | 'destructive'; onPress?: () => void }> = [];
    if (onTogglePin) {
      buttons.push({
        text: isPinned ? 'Unpin from top' : 'Pin to top',
        onPress: onTogglePin,
      });
    }
    if (onEdit) buttons.push({ text: 'Edit', onPress: onEdit });
    if (onDelete) {
      buttons.push({ text: 'Delete', style: 'destructive', onPress: onDelete });
    }
    buttons.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Your update', undefined, buttons);
  }, [onEdit, onDelete, onTogglePin, isPinned]);

  const showMenu = !!onEdit || !!onDelete || !!onTogglePin;

  return (
    <View style={styles.topBar}>
      <TouchableOpacity onPress={onBack} hitSlop={12} style={styles.iconBtn}>
        <Ionicons name="chevron-back" size={26} color={colors.dark.text} />
      </TouchableOpacity>
      <Text style={styles.topTitle}>Pulse post</Text>
      <View style={styles.headerRight}>
        {onShare ? (
          <TouchableOpacity onPress={onShare} hitSlop={10} style={styles.iconBtn}>
            <Ionicons name="share-outline" size={20} color={colors.dark.text} />
          </TouchableOpacity>
        ) : null}
        {onTogglePin ? (
          <TouchableOpacity
            onPress={onTogglePin}
            hitSlop={10}
            style={styles.iconBtn}
            disabled={pinBusy}
            accessibilityLabel={isPinned ? 'Unpin from top of My Pulse' : 'Pin to top of My Pulse'}
          >
            <Ionicons
              name={isPinned ? 'pin' : 'pin-outline'}
              size={20}
              color={isPinned ? colors.primary.teal : colors.dark.textMuted}
            />
          </TouchableOpacity>
        ) : null}
        {showMenu ? (
          <TouchableOpacity
            onPress={openOwnerMenu}
            hitSlop={10}
            style={styles.iconBtn}
            accessibilityLabel="Post options"
          >
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.dark.text} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

// ════════════════════════════════════════════════════════════════════
//  TypedBody — type-aware rendering of the update body
// ════════════════════════════════════════════════════════════════════

function TypedBody({
  update: u,
  linkedPostTitle,
  linkedPostThumbUrl,
  onOpenSource,
}: {
  update: import('@/types').ProfileUpdate;
  linkedPostTitle?: string;
  linkedPostThumbUrl?: string;
  onOpenSource: () => void;
}) {
  const display = getMyPulseDisplayType(u);
  const caption = (u.content?.trim() || '').slice(0, 1000);
  const preview = (u.previewText?.trim() || '').slice(0, 600);

  // ── Pics: full-size grid ─────────────────────────────────────────
  if (display === 'pics') {
    const urls = resolvePicsUrls(u);
    return (
      <View>
        {caption ? (
          <CaptionWithMentions text={caption} style={styles.body} />
        ) : null}
        <PhotosGrid urls={urls} />
      </View>
    );
  }

  // ── Clip: thumb + title + tap-through ───────────────────────────
  if (display === 'clip') {
    const thumb = u.mediaThumb?.trim() || linkedPostThumbUrl;
    const title = linkedPostTitle?.trim() || caption || 'PulseVerse clip';
    return (
      <View>
        {caption && caption !== title ? (
          <CaptionWithMentions text={caption} style={styles.body} />
        ) : null}
        <Pressable onPress={onOpenSource} style={styles.clipHero}>
          {thumb ? (
            <ExpoImage source={{ uri: thumb }} style={styles.clipImage} contentFit="cover" />
          ) : (
            <LinearGradient
              colors={['rgba(96,165,250,0.22)', 'rgba(96,165,250,0.05)']}
              style={styles.clipImage}
            />
          )}
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.62)']}
            style={styles.clipScrim}
          />
          <View style={styles.clipPlayBtn}>
            <Ionicons name="play" size={22} color="#FFF" />
          </View>
          <View style={styles.clipTitleWrap}>
            <Text style={styles.clipTitle} numberOfLines={3}>
              {title}
            </Text>
          </View>
        </Pressable>
      </View>
    );
  }

  // ── Link: external URL card ──────────────────────────────────────
  if (display === 'link') {
    return (
      <View>
        {caption ? (
          <CaptionWithMentions text={caption} style={styles.body} />
        ) : null}
        {u.linkedUrl?.trim() ? (
          <Pressable onPress={onOpenSource} style={styles.linkCard}>
            <View style={styles.linkIconWrap}>
              <Ionicons name="link" size={18} color="#C084FC" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.linkHost} numberOfLines={1}>
                {tryExtractHost(u.linkedUrl)}
              </Text>
              <Text style={styles.linkUrl} numberOfLines={2}>
                {u.linkedUrl}
              </Text>
            </View>
            <Ionicons name="open-outline" size={18} color={colors.dark.textMuted} />
          </Pressable>
        ) : null}
      </View>
    );
  }

  // ── Circle Discussion: title + quote block ───────────────────────
  if (display === 'circle') {
    const title =
      u.linkedDiscussionTitle?.trim() ||
      u.content.split('—')[0]?.trim() ||
      u.content.trim();
    const circleSlug = u.linkedCircleSlug?.trim();
    const circleLabel = circleSlug
      ? circleSlug
          .split(/[-_]/g)
          .filter(Boolean)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ')
      : '';
    return (
      <View>
        {circleLabel ? (
          <View style={styles.circleSourceRow}>
            <CirclesOrbitIcon size={14} color="#F472B6" />
            <Text style={styles.circleSourceLabel}>from {circleLabel}</Text>
          </View>
        ) : null}
        <Text style={styles.circleTitle}>{title}</Text>
        {preview && preview !== title ? (
          <View style={styles.quoteBlock}>
            <View style={styles.quoteBar} />
            <CaptionWithMentions text={preview} style={styles.quoteText} />
          </View>
        ) : null}
      </View>
    );
  }

  // ── Thought / default: long-form text ────────────────────────────
  return (
    <View>
      {caption ? <CaptionWithMentions text={caption} style={styles.body} /> : null}
    </View>
  );
}

// ════════════════════════════════════════════════════════════════════
//  PhotosGrid — mirrors the card layout but at full detail size
// ════════════════════════════════════════════════════════════════════

function PhotosGrid({ urls }: { urls: string[] }) {
  if (urls.length === 0) return null;

  if (urls.length === 1) {
    return (
      <ExpoImage
        source={{ uri: urls[0] }}
        style={styles.gridSolo}
        contentFit="cover"
      />
    );
  }

  // 2+ → responsive grid. 2 per row, trailing single when count is odd.
  return (
    <View style={styles.gridWrap}>
      {urls.map((u, i) => (
        <ExpoImage
          key={`${u}-${i}`}
          source={{ uri: u }}
          style={styles.gridTile}
          contentFit="cover"
        />
      ))}
    </View>
  );
}

// ════════════════════════════════════════════════════════════════════
//  CommentRow
// ════════════════════════════════════════════════════════════════════

function CommentRow({
  comment,
  canDelete,
  canEdit,
  onDelete,
  onEdit,
  onPressAuthor,
}: {
  comment: import('@/types').ProfileUpdateComment;
  canDelete: boolean;
  canEdit: boolean;
  onDelete: () => void;
  onEdit: (nextContent: string) => Promise<void>;
  onPressAuthor: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const wasEdited = !!comment.editedAt;

  /**
   * When the viewer is both the comment author AND the Pulse owner
   * (they wrote a comment on their own post) we still want to offer
   * both affordances. Two-level Alert like the feed surfaces.
   */
  const confirmDelete = useCallback(() => {
    Alert.alert('Delete comment?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onDelete },
    ]);
  }, [onDelete]);

  const openMenu = useCallback(() => {
    const buttons: Array<{ text: string; style?: 'cancel' | 'destructive'; onPress?: () => void }> = [];
    if (canEdit) {
      buttons.push({ text: 'Edit', onPress: () => setEditing(true) });
    }
    if (canDelete) {
      buttons.push({ text: 'Delete', style: 'destructive', onPress: confirmDelete });
    }
    buttons.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Comment', undefined, buttons);
  }, [canEdit, canDelete, confirmDelete]);

  return (
    <View style={styles.comment}>
      <Pressable onPress={onPressAuthor}>
        {comment.authorAvatarUrl ? (
          <RNImage
            source={{ uri: comment.authorAvatarUrl }}
            style={styles.commentAvatar}
          />
        ) : (
          <View style={[styles.commentAvatar, styles.avatarFallback]}>
            <Ionicons name="person" size={14} color={colors.dark.textMuted} />
          </View>
        )}
      </Pressable>
      <View style={styles.commentBody}>
        <View style={styles.commentHeaderRow}>
          <Text
            style={styles.commentName}
            numberOfLines={1}
            onPress={onPressAuthor}
          >
            {comment.authorName || 'Someone'}
          </Text>
          <Text style={styles.commentTime}>
            · {relativeMyPulse(comment.createdAt)}
            {wasEdited ? <Text style={styles.commentEdited}> · edited</Text> : null}
          </Text>
          <View style={{ flex: 1 }} />
          {(canEdit || canDelete) && !editing ? (
            <TouchableOpacity
              onPress={openMenu}
              hitSlop={8}
              accessibilityLabel="Comment options"
            >
              <Ionicons
                name="ellipsis-horizontal"
                size={16}
                color={colors.dark.textMuted}
              />
            </TouchableOpacity>
          ) : null}
        </View>
        {editing ? (
          <CommentEditComposer
            initialContent={comment.content}
            onSave={async (next) => {
              await onEdit(next);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <CaptionWithMentions
            text={comment.content}
            style={styles.commentText}
          />
        )}
      </View>
    </View>
  );
}

// ════════════════════════════════════════════════════════════════════
//  Helpers
// ════════════════════════════════════════════════════════════════════

function tryExtractHost(url: string): string {
  try {
    const raw = url.startsWith('http') ? url : `https://${url}`;
    return new URL(raw).host.replace(/^www\./, '');
  } catch {
    return url;
  }
}

// ════════════════════════════════════════════════════════════════════
//  Styles
// ════════════════════════════════════════════════════════════════════

const GRID_GAP = 6;
const GRID_COL = Math.floor((SCREEN_W - spacing.md * 2 - GRID_GAP) / 2);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  /** Same as feed comments: bounded height inside KeyboardAvoidingView on iOS. */
  listFlex: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { fontSize: 15, color: colors.dark.textMuted, textAlign: 'center', marginTop: 40 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  topTitle: { ...typography.h4, color: colors.dark.text },
  iconBtn: { padding: 6 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  inner: { paddingHorizontal: spacing.md, paddingTop: spacing.md },

  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.dark.card,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.dark.text,
    letterSpacing: -0.2,
  },
  authorMeta: {
    marginTop: 1,
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.dark.textMuted,
  },

  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.chip,
    borderWidth: 1,
  },
  typePillLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  moodPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: borderRadius.chip,
    backgroundColor: 'rgba(20,184,166,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(20,184,166,0.4)',
    marginBottom: 10,
  },
  moodText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary.teal,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
    color: colors.dark.text,
    marginBottom: 12,
  },

  // Clip
  clipHero: {
    width: '100%',
    aspectRatio: 16 / 11,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.dark.cardAlt,
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.22)',
    marginBottom: 10,
  },
  clipImage: { ...StyleSheet.absoluteFillObject },
  clipScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
  },
  clipPlayBtn: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 52,
    height: 52,
    marginLeft: -26,
    marginTop: -26,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  clipTitleWrap: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 12,
  },
  clipTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: -0.2,
  },

  // Link
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.dark.cardAlt,
    borderWidth: 1,
    borderColor: 'rgba(192,132,252,0.32)',
    marginBottom: 10,
  },
  linkIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(192,132,252,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(192,132,252,0.32)',
  },
  linkHost: {
    fontSize: 13,
    fontWeight: '800',
    color: '#C084FC',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  linkUrl: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.dark.textSecondary,
    marginTop: 2,
  },

  // Circle
  circleSourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  circleSourceLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F472B6',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  circleTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.dark.text,
    letterSpacing: -0.3,
    lineHeight: 24,
    marginBottom: 8,
  },
  quoteBlock: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  quoteBar: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 2,
    backgroundColor: 'rgba(244,114,182,0.55)',
  },
  quoteText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
    fontStyle: 'italic',
    color: colors.dark.textSecondary,
  },

  // Photos grid
  gridSolo: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.dark.cardAlt,
    marginBottom: 10,
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    marginBottom: 10,
  },
  gridTile: {
    width: GRID_COL,
    height: GRID_COL,
    borderRadius: borderRadius.md,
    backgroundColor: colors.dark.cardAlt,
  },

  // Source CTA
  sourceCta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.chip,
    borderWidth: 1,
    marginBottom: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  sourceCtaLabel: {
    fontSize: 12.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  // Engagement row
  engagementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 8,
    marginBottom: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  engageBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  engageBtnActive: {},
  engageDivider: {
    width: StyleSheet.hairlineWidth,
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  engageLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.dark.textSecondary,
    letterSpacing: 0.1,
  },
  engageCount: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.dark.textMuted,
    fontVariant: ['tabular-nums'],
  },

  // Comments
  commentsHead: { marginBottom: 4 },
  commentsTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.dark.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  commentsHint: {
    marginTop: 4,
    fontSize: 12,
    color: colors.dark.textMuted,
  },
  comment: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.dark.card,
  },
  commentBody: { flex: 1, minWidth: 0 },
  commentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  commentName: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.dark.text,
  },
  commentTime: {
    fontSize: 11,
    color: colors.dark.textMuted,
  },
  commentEdited: {
    fontSize: 11,
    color: colors.dark.textMuted,
    fontStyle: 'italic',
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.dark.text,
  },

  // Composer
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
    backgroundColor: colors.dark.bg,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.dark.cardAlt,
    color: colors.dark.text,
    fontSize: 14,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.teal,
  },
  sendBtnDisabled: {
    backgroundColor: 'rgba(20,184,166,0.3)',
  },
});
