import React from 'react';
import { View, Text, StyleSheet, Platform, Pressable, TouchableOpacity } from 'react-native';
import { AvatarDisplay, pulseFrameFromUser } from '@/components/profile/AvatarBuilder';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { formatCount } from '@/utils/format';
import { colors, typography } from '@/theme';
import type { Post } from '@/types';

interface Props {
  post: Post;
  /** Distance from bottom of feed cell (tab feed uses a smaller value than full-screen). */
  bottomInset?: number;
  isLiked: boolean;
  isSaved: boolean;
  isFollowing: boolean;
  onLike: () => void;
  onComment: () => void;
  onSave: () => void;
  onShare: () => void;
  onFollow: () => void;
  onProfile: () => void;
  /** Feed Phase 2 — opens `SendCreatorGiftTray` when `feedCreatorGifting` is on */
  onGift?: () => void;
  onReport?: () => void;
  /** TikTok-style rotating sound disc — shown below actions for video */
  videoSoundSlot?: React.ReactNode;
}

export function FeedActionRail({
  post,
  bottomInset,
  isLiked,
  isSaved,
  isFollowing,
  onLike,
  onComment,
  onSave,
  onShare,
  onFollow,
  onProfile,
  onGift,
  onReport,
  videoSoundSlot,
}: Props) {
  const action = (fn: () => void) => () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fn();
  };

  const commentsLocked = post.commentsDisabled === true;

  return (
    <View style={[styles.rail, bottomInset != null && { bottom: bottomInset }]}>
      <View style={styles.avatarWrap}>
        <Pressable
          onPress={onProfile}
          accessibilityRole="button"
          accessibilityLabel={`Open profile for ${post.creator.displayName}`}
        >
          <AvatarDisplay
            size={38}
            avatarUrl={post.creator.avatarUrl}
            prioritizeRemoteAvatar
            ringColor="rgba(255,255,255,0.88)"
            pulseFrame={pulseFrameFromUser(post.creator.pulseAvatarFrame)}
          />
        </Pressable>
        {!isFollowing && (
          <Pressable
            style={styles.followBubble}
            onPress={action(onFollow)}
            accessibilityRole="button"
            accessibilityLabel={`Follow ${post.creator.displayName}`}
          >
            <Ionicons name="add" size={14} color="#FFF" />
          </Pressable>
        )}
      </View>

      <ActionButton
        icon={isLiked ? 'heart' : 'heart-outline'}
        color={isLiked ? colors.status.error : '#FFF'}
        count={post.likeCount}
        onPress={action(onLike)}
        accessibilityLabel={isLiked ? 'Unlike' : 'Like'}
      />
      <ActionButton
        icon="chatbubble-ellipses-outline"
        color={commentsLocked ? 'rgba(255,255,255,0.42)' : '#FFF'}
        count={post.commentCount}
        onPress={action(onComment)}
        accessibilityLabel={commentsLocked ? 'Comments off — view thread' : 'Comments'}
        muted={commentsLocked}
      />
      <ActionButton
        icon={isSaved ? 'bookmark' : 'bookmark-outline'}
        color={isSaved ? colors.primary.gold : '#FFF'}
        count={post.saveCount}
        onPress={action(onSave)}
        accessibilityLabel={isSaved ? 'Remove from saved' : 'Save'}
      />
      {onGift ? (
        <ActionButton
          icon="gift-outline"
          color="rgba(253,230,138,0.95)"
          count={-1}
          onPress={action(onGift)}
          accessibilityLabel={`Send a gift to ${post.creator.displayName}`}
        />
      ) : null}
      <ActionButton
        icon="paper-plane-outline"
        count={post.shareCount}
        onPress={action(onShare)}
        accessibilityLabel="Share"
      />
      {onReport && (
        <ActionButton
          icon="ellipsis-horizontal"
          count={-1}
          onPress={action(onReport)}
          accessibilityLabel="More options and report"
        />
      )}
      {videoSoundSlot}
    </View>
  );
}

function ActionButton({
  icon, count, color = '#FFF', onPress, accessibilityLabel, muted = false,
}: {
  icon: string;
  count: number;
  color?: string;
  onPress: () => void;
  accessibilityLabel: string;
  /** Softer rail cue (e.g. comments disabled — thread is view-only). */
  muted?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.actionBtn, muted && styles.actionBtnMuted]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Ionicons name={icon as any} size={25} color={color} style={muted ? styles.actionIconMuted : undefined} />
      {count >= 0 && (
        <Text style={[styles.actionCount, muted && styles.actionCountMuted]}>{formatCount(count)}</Text>
      )}
    </TouchableOpacity>
  );
}

const textShadow = Platform.select({
  web: { textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  default: { textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
});

const styles = StyleSheet.create({
  rail: {
    position: 'absolute',
    right: 12,
    bottom: 112,
    alignItems: 'center',
    gap: 18,
    zIndex: 10,
  },
  avatarWrap: { alignItems: 'center', marginBottom: 2 },
  followBubble: {
    width: 21,
    height: 21,
    borderRadius: 11,
    backgroundColor: colors.primary.teal,
    alignItems: 'center', justifyContent: 'center',
    marginTop: -10,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.85)',
  },
  actionBtn: { alignItems: 'center', gap: 3, minWidth: 34 },
  actionBtnMuted: { opacity: 0.92 },
  actionIconMuted: { opacity: 0.72 },
  actionCount: {
    color: 'rgba(255,255,255,0.88)',
    ...typography.count,
    ...textShadow,
  },
  actionCountMuted: { opacity: 0.72 },
});
