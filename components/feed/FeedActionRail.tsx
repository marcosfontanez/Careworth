import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
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
  onReport?: () => void;
  /** TikTok-style rotating sound disc — shown below actions for video */
  videoSoundSlot?: React.ReactNode;
}

export function FeedActionRail({
  post, bottomInset, isLiked, isSaved, isFollowing, onLike, onComment, onSave, onShare, onFollow, onProfile, onReport,
  videoSoundSlot,
}: Props) {
  const action = (fn: () => void) => () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fn();
  };

  return (
    <View style={[styles.rail, bottomInset != null && { bottom: bottomInset }]}>
      <TouchableOpacity
        style={styles.avatarWrap}
        onPress={onProfile}
        activeOpacity={0.8}
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
        {!isFollowing && (
          <TouchableOpacity
            style={styles.followBubble}
            onPress={action(onFollow)}
            accessibilityRole="button"
            accessibilityLabel={`Follow ${post.creator.displayName}`}
          >
            <Ionicons name="add" size={14} color="#FFF" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      <ActionButton
        icon={isLiked ? 'heart' : 'heart-outline'}
        color={isLiked ? colors.status.error : '#FFF'}
        count={post.likeCount}
        onPress={action(onLike)}
        accessibilityLabel={isLiked ? 'Unlike' : 'Like'}
      />
      <ActionButton
        icon="chatbubble-ellipses-outline"
        count={post.commentCount}
        onPress={action(onComment)}
        accessibilityLabel="Comments"
      />
      <ActionButton
        icon={isSaved ? 'bookmark' : 'bookmark-outline'}
        color={isSaved ? colors.primary.gold : '#FFF'}
        count={post.saveCount}
        onPress={action(onSave)}
        accessibilityLabel={isSaved ? 'Remove from saved' : 'Save'}
      />
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
  icon, count, color = '#FFF', onPress, accessibilityLabel,
}: { icon: string; count: number; color?: string; onPress: () => void; accessibilityLabel: string }) {
  return (
    <TouchableOpacity
      style={styles.actionBtn}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Ionicons name={icon as any} size={25} color={color} />
      {count >= 0 && <Text style={styles.actionCount}>{formatCount(count)}</Text>}
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
  actionCount: {
    color: 'rgba(255,255,255,0.88)',
    ...typography.count,
    ...textShadow,
  },
});
