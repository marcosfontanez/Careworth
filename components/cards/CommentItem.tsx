import React, { useCallback, useState } from 'react';
import { Alert, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { BorderedAvatar } from '@/components/borders/BorderedAvatar';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { colors } from '@/theme';
import { ProfileNeonPills } from '@/components/mypage/ProfileNeonPills';
import { buildNeonPillTags } from '@/lib/buildNeonPillTags';
import { PulseTierBadge } from '@/components/badges/PulseTierBadge';
import { timeAgo } from '@/utils/format';
import { anonymousNameOnPost } from '@/lib/anonymousCircle';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { COMMENT_DELETED_TOMBSTONE } from '@/constants';
import { analytics } from '@/lib/analytics';
import { CommentEditComposer } from '@/components/comments/CommentEditComposer';
import { CommentRichText } from '@/components/ui/CommentRichText';
import { CommentReactionStrip } from '@/components/comments/CommentReactionStrip';
import { commentKeys } from '@/lib/queryKeys';
import { emptyPostReactionCounts } from '@/lib/postReactions';
import { pickCommentReaction } from '@/lib/commentReactionPick';
import { pulseImageFeedHeroProps } from '@/lib/pulseImage';
import { avatarThumb } from '@/lib/storage';
import { commentService } from '@/services/comment';
import type { Comment , PostReactionKind } from '@/types';

interface Props {
  comment: Comment;
  depth?: number;
  /** Accent for reaction chips (circle teal, etc.). */
  accentColor?: string;
  /** When true, show stable pseudonyms and hide role / real avatars (anonymous circle posts). */
  anonymousMode?: boolean;
  /** Required when `anonymousMode` — same id as parent post for stable names. */
  saltPostId?: string;
  onReply?: (commentId: string, authorName: string) => void;
  /** Open moderation report for someone else's comment. */
  onReport?: (commentId: string) => void;
}

export function CommentItem({
  comment,
  depth = 0,
  accentColor = colors.primary.teal,
  anonymousMode,
  saltPostId,
  onReply,
  onReport,
}: Props) {
  const [showReplies, setShowReplies] = useState(depth === 0 && comment.replies.length > 0);
  /**
   * When `editing` is true we show {@link CommentEditComposer} as a
   * bottom-sheet modal (not inline — multiline fields inside scroll
   * parents often collapse when the keyboard opens).
   */
  const [editing, setEditing] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const router = useRouter();

  const displayName =
    anonymousMode && saltPostId
      ? anonymousNameOnPost(comment.author.id, saltPostId)
      : comment.author.displayName;

  const isDeleted = !!comment.isDeleted;
  /** We only want to expose the author-only delete in non-anonymous
   *  threads — surfacing it inside an anonymous circle would deanonymise
   *  the author (only they would see the affordance). */
  const isOwn =
    !anonymousMode && !!user?.id && comment.author.id === user.id;
  const isAuthor = !!user?.id && comment.author.id === user.id;
  const wasEdited = !!comment.editedAt;

  /**
   * Cache key used by both delete (tombstone patch) and edit (in-place
   * content/editedAt patch). Centralised here so the optimistic patch
   * helpers below stay consistent with the feed's `['comments', postId, viewerId]`
   * query contract.
   */
  const postCacheKey = comment.postId ? commentKeys.byPost(comment.postId, user?.id ?? null) : null;

  /** Recursive cache patch used by both delete and edit flows. */
  const patchTree = useCallback(
    (nodes: Comment[], next: (c: Comment) => Comment): Comment[] =>
      nodes.map((n) =>
        n.id === comment.id
          ? next(n)
          : { ...n, replies: patchTree(n.replies, next) },
      ),
    [comment.id],
  );

  const onReactionPick = useCallback(
    async (kind: PostReactionKind) => {
      if (!user?.id || !comment.postId) {
        Alert.alert('Sign in required', 'Log in to react to comments.');
        return;
      }
      try {
        await pickCommentReaction({
          postId: comment.postId,
          viewerId: user.id,
          comment,
          kind,
        });
      } catch {
        Alert.alert('Couldn’t update reaction', 'Try again in a moment.');
      }
    },
    [comment, user?.id],
  );

  /**
   * Author-only soft-delete. We patch the cache for THIS post's comment
   * tree optimistically — `saltPostId` doubles as the post id when the
   * caller passes it (anonymous mode), but it isn't always present, so
   * we fall back to refetching every comments query via a partial key
   * match if we don't know the post id locally.
   */
  const handleDelete = useCallback(() => {
    Alert.alert(
      'Remove comment?',
      'Your comment will be replaced with “User Removed Their Comment”. Replies underneath will stay visible.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const prev = postCacheKey
              ? queryClient.getQueryData<Comment[]>(postCacheKey)
              : undefined;

            if (postCacheKey && prev) {
              queryClient.setQueryData(
                postCacheKey,
                patchTree(prev, (n) => ({
                  ...n,
                  isDeleted: true,
                  content: COMMENT_DELETED_TOMBSTONE,
                })),
              );
            }

            try {
              await commentService.deleteComment(comment.id);
              analytics.track('comment_deleted', {
                postId: comment.postId,
                commentId: comment.id,
              });
              if (comment.postId) {
                await queryClient.invalidateQueries({
                  queryKey: commentKeys.byPostPrefix(comment.postId),
                });
              }
            } catch {
              if (postCacheKey && prev) queryClient.setQueryData(postCacheKey, prev);
              Alert.alert('Couldn’t remove comment', 'Try again in a moment.');
            }
          },
        },
      ],
    );
  }, [comment.id, comment.postId, postCacheKey, patchTree, queryClient]);

  /**
   * Saves an edited body. Mirrors the optimistic delete pattern: we
   * stamp the new content + a best-guess `editedAt` locally so the
   * "· edited" badge appears instantly, then reconcile from the
   * server response (which carries the authoritative `editedAt`
   * written by the trigger in migration 057). Throws on failure so
   * the composer shows the error inline and keeps the user's text.
   */
  const handleEditSave = useCallback(
    async (nextContent: string) => {
      const prev = postCacheKey
        ? queryClient.getQueryData<Comment[]>(postCacheKey)
        : undefined;

      if (postCacheKey && prev) {
        queryClient.setQueryData(
          postCacheKey,
          patchTree(prev, (n) => ({
            ...n,
            content: nextContent,
            editedAt: new Date().toISOString(),
          })),
        );
      }

      try {
        const updated = await commentService.updateComment(comment.id, nextContent);
        if (postCacheKey) {
          const fresh = queryClient.getQueryData<Comment[]>(postCacheKey);
          if (fresh) {
            queryClient.setQueryData(
              postCacheKey,
              patchTree(fresh, (n) => ({
                ...n,
                content: updated.content,
                editedAt: updated.edited_at ?? n.editedAt,
              })),
            );
          }
        }
        setEditing(false);
      } catch (e) {
        if (postCacheKey && prev) queryClient.setQueryData(postCacheKey, prev);
        Alert.alert('Couldn’t save edit', 'Check your connection and try again.');
        throw e;
      }
    },
    [comment.id, postCacheKey, patchTree, queryClient],
  );

  /**
   * Opens the author-only options menu: Edit, Remove, or Cancel. We
   * replaced the direct-to-delete ellipsis tap with this menu so
   * both affordances live in the same spot and stay discoverable.
   */
  const handleMenu = useCallback(() => {
    Alert.alert('Your comment', undefined, [
      { text: 'Edit', onPress: () => setEditing(true) },
      { text: 'Remove', style: 'destructive', onPress: handleDelete },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [handleDelete]);

  const showTextRow = isDeleted || !!comment.content.trim();

  return (
    <View style={[styles.container, depth > 0 && styles.reply]}>
      {anonymousMode && saltPostId ? (
        <View style={styles.anonAvatar}>
          <Text style={styles.anonGlyph}>?</Text>
        </View>
      ) : !isDeleted && comment.author.id ? (
        <BorderedAvatar
          size={36}
          avatarUrl={avatarThumb(comment.author.avatarUrl, 36)}
          ringColor={colors.dark.border}
          pulseAvatarFrame={comment.author.pulseAvatarFrame}
          ownerDisplayName={displayName}
          onPress={() => router.push(`/profile/${comment.author.id}` as never)}
        />
      ) : (
        <BorderedAvatar
          size={36}
          avatarUrl={avatarThumb(comment.author.avatarUrl, 36)}
          ringColor={colors.dark.border}
          pulseAvatarFrame={comment.author.pulseAvatarFrame}
          ownerDisplayName={displayName}
          disableLongPressInfo={!!anonymousMode}
        />
      )}
      <View style={styles.body}>
        <View style={styles.headerRow}>
          {!anonymousMode && !isDeleted && comment.author.id ? (
            <TouchableOpacity
              onPress={() => router.push(`/profile/${comment.author.id}` as never)}
              activeOpacity={0.7}
              hitSlop={{ top: 4, bottom: 4 }}
              accessibilityRole="button"
              accessibilityLabel={`Open ${displayName} profile`}
            >
              <Text style={styles.name}>{displayName}</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.name}>{isDeleted ? 'Removed' : displayName}</Text>
          )}
          {/*
            Pulse tier chip beside name. Hides for Murmur (0–19) so new
            accounts don't get a visual penalty, and stays invisible in
            anonymous mode so nothing can be used to deanonymise the
            author. Reads the denormalized column — no extra fetch.
          */}
          {!anonymousMode && !isDeleted ? (
            <PulseTierBadge
              tier={comment.author.pulseTier ?? null}
              size="xs"
              hideMurmur
              showIcon={false}
            />
          ) : null}
          {comment.isPinned && !isDeleted && (
            <View style={styles.pinnedBadge}>
              <Text style={styles.pinnedText}>Pinned</Text>
            </View>
          )}
          <View style={{ flex: 1 }} />
          {user && !isDeleted && !editing && !isAuthor && onReport ? (
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
              onPress={handleMenu}
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
        {!anonymousMode && !isDeleted && buildNeonPillTags(comment.author).length > 0 ? (
          <ProfileNeonPills tags={buildNeonPillTags(comment.author)} style={{ marginTop: 4 }} />
        ) : null}
        {editing && !isDeleted ? (
          <CommentEditComposer
            initialContent={comment.content}
            onSave={handleEditSave}
            onCancel={() => setEditing(false)}
          />
        ) : showTextRow ? (
          <CommentRichText
            text={comment.content}
            style={[styles.content, isDeleted && styles.contentDeleted]}
            mentionsInteractive={!anonymousMode}
            linksInteractive={!anonymousMode}
          />
        ) : null}

        {!isDeleted && !editing && comment.mediaUrl?.trim() ? (
          <TouchableOpacity
            onPress={() =>
              router.push(`/image-viewer?uri=${encodeURIComponent(comment.mediaUrl!.trim())}` as never)
            }
            activeOpacity={0.9}
            style={styles.imageTouch}
          >
            <Image
              source={{ uri: comment.mediaUrl!.trim() }}
              style={styles.attachedImage}
              contentFit="contain"
              {...pulseImageFeedHeroProps}
            />
          </TouchableOpacity>
        ) : null}

        {/* Suppress reaction / reply controls on tombstones — there's
            nothing to act on, and showing them would hint that the
            comment "really" still exists under the hood. Also hidden
            during edit so the composer can own the full action row. */}
        {!isDeleted && !editing ? (
          <View style={styles.footerBlock}>
            <Text style={styles.time}>
              {timeAgo(comment.createdAt)}
              {wasEdited ? <Text style={styles.editedTag}> · edited</Text> : null}
            </Text>
            <CommentReactionStrip
              counts={comment.reactionCounts ?? emptyPostReactionCounts()}
              viewerReaction={comment.viewerReaction ?? null}
              accentColor={accentColor}
              onPick={onReactionPick}
            />
            <View style={styles.replyRow}>
              <TouchableOpacity
                style={styles.replyBtn}
                activeOpacity={0.7}
                onPress={() => onReply?.(comment.id, displayName)}
              >
                <Text style={styles.replyText}>Reply</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : !editing ? (
          <Text style={styles.time}>{timeAgo(comment.createdAt)}</Text>
        ) : null}

        {comment.replies.length > 0 && depth === 0 && (
          <TouchableOpacity onPress={() => setShowReplies(!showReplies)} activeOpacity={0.7}>
            <Text style={styles.toggleReplies}>
              {showReplies ? 'Hide replies' : `View ${comment.replies.length} ${comment.replies.length === 1 ? 'reply' : 'replies'}`}
            </Text>
          </TouchableOpacity>
        )}

        {showReplies && comment.replies.map((reply) => (
          <CommentItem
            key={reply.id}
            comment={reply}
            depth={depth + 1}
            accentColor={accentColor}
            anonymousMode={anonymousMode}
            saltPostId={saltPostId}
            onReply={onReply}
            onReport={onReport}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', gap: 10, paddingVertical: 12 },
  reply: { paddingLeft: 0, paddingVertical: 8 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  anonAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dark.cardAlt,
    borderWidth: 1,
    borderColor: colors.primary.teal + '44',
  },
  anonGlyph: { fontSize: 12, fontWeight: '900', color: colors.dark.textSecondary },
  body: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  name: { fontSize: 13, fontWeight: '700', color: colors.dark.text },
  pinnedBadge: { flexDirection: 'row', alignItems: 'center' },
  pinnedText: { fontSize: 10, color: colors.primary.gold, fontWeight: '600' },
  content: { fontSize: 14, color: colors.dark.textSecondary, lineHeight: 20 },
  contentDeleted: {
    fontStyle: 'italic',
    color: colors.dark.textMuted,
  },
  imageTouch: { marginTop: 8, borderRadius: 10, overflow: 'hidden', backgroundColor: colors.dark.cardAlt },
  attachedImage: { width: '100%', height: 200, backgroundColor: colors.dark.cardAlt },
  footerBlock: { marginTop: 6, gap: 6 },
  time: { fontSize: 12, color: colors.dark.textMuted },
  editedTag: {
    fontSize: 11,
    fontStyle: 'italic',
    color: colors.dark.textMuted,
  },
  replyRow: { flexDirection: 'row', alignItems: 'center' },
  replyBtn: { alignSelf: 'flex-start' },
  replyText: { fontSize: 12, color: colors.primary.royal, fontWeight: '600' },
  toggleReplies: { fontSize: 12, color: colors.primary.royal, fontWeight: '600', marginTop: 8 },
});
