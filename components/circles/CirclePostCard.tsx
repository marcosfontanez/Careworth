import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { BorderedAvatar } from '@/components/borders/BorderedAvatar';
import { colors, borderRadius, rhythm, spacing } from '@/theme';
import { formatCount, timeAgo } from '@/utils/format';
import { anonymousDisplayName } from '@/lib/anonymousCircle';
import { postHasDownloadableMedia, shareDownloadedPostMedia } from '@/lib/postMediaActions';
import { ProfileNeonPills } from '@/components/mypage/ProfileNeonPills';
import { buildNeonPillTags } from '@/lib/buildNeonPillTags';
import type { CircleAccent } from '@/lib/circleAccents';
import type { Post, PostReactionKind } from '@/types';
import { pulseImageCircleWallProps } from '@/lib/pulseImage';
import { emptyPostReactionCounts } from '@/lib/postReactions';
import { ReactionChainWithPicker } from '@/components/reactions/ReactionChainWithPicker';
import { FeedClipAttributionRow } from '@/components/feed/FeedClipAttributionChip';
import { useFeedClipAttribution } from '@/hooks/useFeedClipAttribution';

type Props = {
  post: Post;
  accent: CircleAccent;
  isAnonymousRoom: boolean;
  /** Viewer’s current reaction for this post, if any. */
  viewerReaction: PostReactionKind | null;
  onPress: () => void;
  /** Avatar-only: open creator Pulse page without changing the main card open gesture. */
  onProfile?: () => void;
  onReply: () => void;
  /** Tap again on the active emoji clears the reaction (handled in parent). */
  onPickReaction: (kind: PostReactionKind) => void;
  onShare: () => void;
  isOwner?: boolean;
  /** Owner ⋯ menu (edit / delete). */
  onOwnerMenu?: () => void;
  /** Non-owner ⋯ menu (report). */
  onGuestMenu?: () => void;
  /** Opens post detail with gift tray (circle room shortcut). */
  onGift?: () => void;
  /** Brief ring when user deep-links onto this card (e.g. from a My Pulse pin). */
  jumpHighlight?: boolean;
};

/**
 * Circle wall card: header, body, media, then a horizontal reaction strip
 * (heart / laugh / cry / anger / surprise) with per-type counts — one pick
 * per viewer, same row as `post_likes` + migration 115 counters.
 */
export const CirclePostCard = React.memo(function CirclePostCard({
  post,
  accent,
  isAnonymousRoom,
  viewerReaction,
  onPress,
  onProfile,
  onReply,
  onPickReaction,
  onShare,
  isOwner = false,
  onOwnerMenu,
  onGuestMenu,
  onGift,
  jumpHighlight = false,
}: Props) {
  const { width: winW, height: winH } = useWindowDimensions();
  const maxImagePreviewH = Math.min(560, winH * 0.58);
  const [photoLayoutW, setPhotoLayoutW] = useState(0);
  const [photoIntrinsic, setPhotoIntrinsic] = useState<{ w: number; h: number } | null>(null);

  const isVideoPost = post.type === 'video';
  const showFullPhoto = !!post.mediaUrl && !isVideoPost;

  useEffect(() => {
    setPhotoIntrinsic(null);
  }, [post.id, post.mediaUrl]);

  const photoPreviewHeight = useMemo(() => {
    if (!showFullPhoto) return 150;
    const contentW =
      photoLayoutW > 0 ? photoLayoutW : Math.max(200, winW - 48);
    if (!photoIntrinsic || photoIntrinsic.w <= 0 || photoIntrinsic.h <= 0) {
      return Math.min(240, maxImagePreviewH);
    }
    return Math.min((contentW * photoIntrinsic.h) / photoIntrinsic.w, maxImagePreviewH);
  }, [showFullPhoto, photoLayoutW, photoIntrinsic, winW, maxImagePreviewH]);

  const mediaUri = post.thumbnailUrl ?? post.mediaUrl ?? '';
  const imageRecyclingKey = `${post.id}:${mediaUri}`;

  const displayName = isAnonymousRoom
    ? anonymousDisplayName(post.creatorId, post.id)
    : post.creator?.displayName ?? 'Member';
  const caption = post.caption ?? '';
  const isTitled = caption.startsWith('**');
  const titleLine = isTitled ? caption.split('\n')[0].replace(/\*\*/g, '').trim() : '';
  const bodyLine = isTitled ? caption.split('\n\n').slice(1).join('\n\n').trim() : caption;
  const canDownloadMedia = postHasDownloadableMedia(post);
  const counts = post.reactionCounts ?? emptyPostReactionCounts();
  const clipAttribution = useFeedClipAttribution(post);

  const onDownloadPress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void shareDownloadedPostMedia(post);
  };

  const onReactionPress = (kind: PostReactionKind) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPickReaction(kind);
  };

  return (
    <View
      style={[
        styles.card,
        { borderLeftColor: accent.color },
        jumpHighlight ? [styles.cardJumpRing, { borderColor: accent.color, shadowColor: accent.color }] : null,
      ]}
    >
      <Pressable style={styles.cardMainPress} onPress={onPress}>
        <View style={styles.header}>
          <View style={styles.creatorRow}>
            {isAnonymousRoom ? (
              <View style={[styles.avatar, styles.anonAvatar, { borderColor: `${accent.color}88` }]}>
                <Text style={styles.anonGlyph}>?</Text>
              </View>
            ) : onProfile ? (
              <BorderedAvatar
                size={32}
                avatarUrl={post.creator?.avatarUrl}
                ringColor={colors.dark.border}
                pulseAvatarFrame={post.creator?.pulseAvatarFrame}
                ownerDisplayName={displayName}
                userId={post.creator?.id}
                priority="circle-list"
                onPress={() => onProfile()}
              />
            ) : (
              <BorderedAvatar
                size={32}
                avatarUrl={post.creator?.avatarUrl}
                ringColor={colors.dark.border}
                pulseAvatarFrame={post.creator?.pulseAvatarFrame}
                ownerDisplayName={displayName}
                userId={post.creator?.id}
                priority="circle-list"
                disableLongPressInfo={isAnonymousRoom}
              />
            )}
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={styles.nameRow}>
                <Text style={styles.name} numberOfLines={1}>
                  {displayName}
                </Text>
                {!isAnonymousRoom && post.creator?.isVerified && (
                  <Ionicons name="checkmark-circle" size={13} color={colors.primary.teal} />
                )}
              </View>
              {!isAnonymousRoom && post.creator ? (
                <ProfileNeonPills
                  tags={buildNeonPillTags(post.creator)}
                  style={styles.neonPillsInCard}
                />
              ) : null}
              <Text style={styles.metaLine} numberOfLines={1}>
                {timeAgo(post.createdAt)}
              </Text>
            </View>
          </View>
          {(isOwner && onOwnerMenu) || (!isOwner && onGuestMenu) ? (
            <TouchableOpacity
              hitSlop={8}
              style={styles.moreBtn}
              onPress={isOwner ? onOwnerMenu : onGuestMenu}
              accessibilityLabel={isOwner ? 'Post options' : 'Report post'}
            >
              <Ionicons name="ellipsis-horizontal" size={18} color={colors.dark.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {(clipAttribution.creatorChip || clipAttribution.liveChip) ? (
          <FeedClipAttributionRow
            attribution={clipAttribution}
            variant="inline"
            style={styles.clipAttributionRow}
          />
        ) : null}

        {(isTitled || bodyLine) && (
          <View style={styles.body}>
            {isTitled && titleLine ? (
              <Text style={styles.title} numberOfLines={2}>
                {titleLine}
              </Text>
            ) : null}
            {bodyLine ? (
              <Text
                style={styles.caption}
                numberOfLines={
                  post.mediaUrl ? (isVideoPost ? 1 : 2) : isTitled ? 2 : 3
                }
              >
                {bodyLine}
              </Text>
            ) : null}
          </View>
        )}

        {post.mediaUrl ? (
          isVideoPost ? (
            <View style={styles.mediaWrapVideo}>
              <Image
                recyclingKey={imageRecyclingKey}
                source={{ uri: mediaUri }}
                style={styles.media}
                contentFit="cover"
                transition={120}
                {...pulseImageCircleWallProps}
              />
              <View style={styles.playOverlay}>
                <Ionicons name="play-circle" size={38} color="#FFFFFFE6" />
              </View>
            </View>
          ) : (
            <View
              style={[styles.mediaWrapPhoto, { height: photoPreviewHeight }]}
              onLayout={
                showFullPhoto
                  ? (e) => setPhotoLayoutW(e.nativeEvent.layout.width)
                  : undefined
              }
            >
              <Image
                recyclingKey={imageRecyclingKey}
                source={{ uri: mediaUri }}
                style={styles.mediaPhotoContain}
                contentFit="contain"
                transition={120}
                {...pulseImageCircleWallProps}
                onLoad={
                  showFullPhoto
                    ? (e) => {
                        const src = (e as { source?: { width?: number; height?: number } }).source;
                        const w = src?.width;
                        const h = src?.height;
                        if (typeof w === 'number' && typeof h === 'number' && w > 0 && h > 0) {
                          setPhotoIntrinsic({ w, h });
                        }
                      }
                    : undefined
                }
              />
            </View>
          )
        ) : null}

        {post.hashtags?.length ? (
          <View style={styles.tagRow}>
            {post.hashtags.slice(0, 3).map((tag) => (
              <View key={tag} style={[styles.tagChip, { backgroundColor: `${accent.color}18` }]}>
                <Text style={[styles.tagText, { color: accent.color }]}>#{tag}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </Pressable>

      <View style={styles.reactionsSection}>
        <ReactionChainWithPicker
          counts={counts}
          viewerReaction={viewerReaction}
          accentColor={accent.color}
          onPick={onReactionPress}
        />
      </View>

      <View style={styles.actions}>
        <ActionButton
          icon="chatbubble-outline"
          tint={post.commentsDisabled ? 'rgba(148,163,184,0.65)' : colors.dark.textMuted}
          count={post.commentCount}
          onPress={onReply}
          muted={post.commentsDisabled === true}
          accessibilityLabel={post.commentsDisabled ? 'Comments off — view post' : 'Open comments'}
        />
        {canDownloadMedia ? (
          <ActionButton
            icon="download-outline"
            tint={colors.dark.textMuted}
            onPress={onDownloadPress}
            accessibilityLabel={post.type === 'video' ? 'Download video' : 'Download photo'}
          />
        ) : null}
        {onGift ? (
          <ActionButton
            icon="gift-outline"
            tint={colors.primary.teal}
            onPress={onGift}
            accessibilityLabel="Send creator gift"
          />
        ) : null}
        <ActionButton
          icon="paper-plane-outline"
          tint={colors.dark.textMuted}
          count={post.shareCount}
          onPress={isAnonymousRoom ? undefined : onShare}
          disabled={isAnonymousRoom}
        />
      </View>
    </View>
  );
});

function ActionButton({
  icon,
  tint,
  count,
  label,
  onPress,
  disabled,
  muted,
  accessibilityLabel: accessibilityLabelProp,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  tint: string;
  count?: number;
  label?: string;
  onPress?: () => void;
  disabled?: boolean;
  /** Dimmed cue (e.g. comments disabled). */
  muted?: boolean;
  accessibilityLabel?: string;
}) {
  const text =
    label ?? (typeof count === 'number' && count > 0 ? formatCount(count) : '');
  const accessibilityLabel =
    accessibilityLabelProp ?? (typeof label === 'string' ? label : undefined);
  const inner = (
    <View style={[styles.actionBtn, disabled && { opacity: 0.35 }, muted && !disabled && { opacity: 0.5 }]}>
      <Ionicons name={icon} size={16} color={tint} />
      {text ? <Text style={[styles.actionText, { color: tint }]}>{text}</Text> : null}
    </View>
  );
  if (!onPress || disabled) return inner;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{ flex: 1 }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {inner}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.dark.card,
    marginHorizontal: rhythm.circleRoomHorizontalInset,
    marginTop: rhythm.cardGap,
    borderRadius: rhythm.cardRadius,
    paddingHorizontal: rhythm.circlePanelPadding,
    paddingTop: rhythm.cardPaddingMedium,
    paddingBottom: rhythm.cardPaddingSmall / 2,
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderLeftWidth: 3.5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.28,
        shadowRadius: 7,
      },
      android: { elevation: 3 },
      default: {},
    }),
  },
  cardJumpRing: {
    borderWidth: 2,
    ...Platform.select({
      ios: { shadowOpacity: 0.55, shadowRadius: 14 },
      android: { elevation: 6 },
      default: {},
    }),
  },
  cardMainPress: { borderRadius: rhythm.cardRadius - 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: rhythm.cardGap },
  creatorRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: rhythm.cardGap,
    minWidth: 0,
  },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.dark.cardAlt },
  anonAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  anonGlyph: { fontSize: 15, fontWeight: '900', color: colors.dark.textSecondary },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2, flexWrap: 'wrap' },
  name: { fontSize: 13.5, fontWeight: '800', color: colors.dark.text, letterSpacing: -0.2 },
  neonPillsInCard: { marginTop: 0, marginBottom: 2, alignSelf: 'flex-start' },
  metaLine: { fontSize: 11, color: colors.dark.textMuted, marginTop: 1 },
  moreBtn: { padding: rhythm.cardPaddingSmall / 2 },

  body: { marginTop: spacing.xs + 1, gap: 2 },
  clipAttributionRow: { marginTop: spacing.xs + 2, marginBottom: 2 },
  title: { fontSize: 14.5, fontWeight: '800', color: colors.dark.text, lineHeight: 19 },
  caption: { fontSize: 13, color: colors.dark.textSecondary, lineHeight: 18 },

  mediaWrapVideo: {
    marginTop: spacing.xs + 3,
    borderRadius: borderRadius.md ?? 10,
    overflow: 'hidden',
    height: 168,
    backgroundColor: colors.dark.cardAlt,
  },
  mediaWrapPhoto: {
    marginTop: spacing.xs + 3,
    borderRadius: borderRadius.md ?? 10,
    overflow: 'hidden',
    width: '100%',
    backgroundColor: colors.dark.cardAlt,
  },
  media: { width: '100%', height: '100%' },
  mediaPhotoContain: { width: '100%', height: '100%' },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2, marginTop: spacing.xs + 1 },
  tagChip: { paddingHorizontal: rhythm.cardPaddingSmall, paddingVertical: 2, borderRadius: 999 },
  tagText: { fontSize: 11, fontWeight: '700' },

  reactionsSection: {
    marginTop: spacing.xs + 2,
    paddingTop: spacing.xs + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.dark.border,
  },

  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: rhythm.cardPaddingSmall / 2,
    paddingTop: spacing.xs + 2,
    paddingBottom: rhythm.cardPaddingSmall / 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.dark.border,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 1,
    paddingVertical: rhythm.cardPaddingSmall / 2,
  },
  actionText: { fontSize: 12, fontWeight: '700' },
});
