import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform, Pressable, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  FadeInDown,
  FadeOutDown,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { AvatarDisplay, pulseFrameFromUser } from '@/components/profile/AvatarBuilder';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { formatCount } from '@/utils/format';
import { pulseColors, pulseSpacing, pulseTypography } from '@/lib/theme/pulseTheme';
import { useFeatureFlags } from '@/lib/featureFlags';
import { useFeedActionRailStore } from '@/lib/feedActionRailStore';
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

export function FeedActionRail(props: Props) {
  const compactEnabled = useFeatureFlags((s) => s.feedCompactActionRail);
  if (!compactEnabled) {
    return <ClassicRail {...props} />;
  }
  return <CompactRail {...props} />;
}

/* -------------------------------------------------------------------------- */
/* Compact / expandable rail (new premium behavior)                            */
/* -------------------------------------------------------------------------- */

function CompactRail({
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
  const expanded = useFeedActionRailStore((s) => s.expanded);
  const hasExpandedOnce = useFeedActionRailStore((s) => s.hasExpandedOnce);
  const setExpanded = useFeedActionRailStore((s) => s.setExpanded);
  const hydrate = useFeedActionRailStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const action = (fn: () => void) => () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fn();
  };

  const toggleExpanded = (next: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded(next);
  };

  const commentsLocked = post.commentsDisabled === true;

  // Chevron rotation: 0 (up = expand) → 180 (down = collapse).
  const rot = useSharedValue(expanded ? 1 : 0);
  useEffect(() => {
    rot.value = withTiming(expanded ? 1 : 0, { duration: 220, easing: Easing.out(Easing.cubic) });
  }, [expanded, rot]);
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rot.value * 180}deg` }],
  }));

  // First-time hint: gentle pulsing glow on the chevron until the first expand.
  const showHint = !hasExpandedOnce && !expanded;
  const hint = useSharedValue(0);
  useEffect(() => {
    if (showHint) {
      hint.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.25, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    } else {
      cancelAnimation(hint);
      hint.value = withTiming(0, { duration: 200 });
    }
    return () => cancelAnimation(hint);
  }, [showHint, hint]);
  const hintStyle = useAnimatedStyle(() => ({
    opacity: hint.value,
    transform: [{ scale: 1 + hint.value * 0.35 }],
  }));

  return (
    <View style={[styles.railHost, bottomInset != null && { bottom: bottomInset }]}>
      {/* Frosted glass pill — only when expanded so collapsed stays minimal. */}
      {expanded ? (
        <View style={styles.glassPill} pointerEvents="none">
          <BlurView
            intensity={Platform.OS === 'ios' ? 24 : 0}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.glassPillTint} />
          <View style={styles.glassPillBorder} />
        </View>
      ) : null}

      <View style={styles.railColumn}>
        {/* Actions appear ABOVE the avatar, growing up into empty video space. */}
        {expanded ? (
          <Animated.View
            entering={FadeInDown.duration(220).springify().damping(18)}
            exiting={FadeOutDown.duration(150)}
            style={styles.actionsGroup}
          >
            {videoSoundSlot ? <View style={styles.soundSlot}>{videoSoundSlot}</View> : null}
            {onReport ? (
              <ActionButton
                icon="ellipsis-horizontal"
                count={-1}
                onPress={action(onReport)}
                accessibilityLabel="More options and report"
              />
            ) : null}
            <ActionButton
              icon="paper-plane-outline"
              count={post.shareCount}
              onPress={action(onShare)}
              accessibilityLabel="Share video"
            />
            {onGift ? (
              <ActionButton
                icon="gift-outline"
                color={pulseColors.gift}
                count={-1}
                onPress={action(onGift)}
                accessibilityLabel={`Send a gift to ${post.creator.displayName}`}
              />
            ) : null}
            <ActionButton
              icon={isSaved ? 'bookmark' : 'bookmark-outline'}
              color={isSaved ? pulseColors.gift : pulseColors.text}
              count={post.saveCount}
              onPress={action(onSave)}
              accessibilityLabel={isSaved ? 'Remove from saved' : 'Save video'}
            />
            <ActionButton
              icon="chatbubble-ellipses-outline"
              color={commentsLocked ? pulseColors.textQuiet : pulseColors.text}
              count={post.commentCount}
              onPress={action(onComment)}
              accessibilityLabel={commentsLocked ? 'Comments off — view thread' : 'Open comments'}
              muted={commentsLocked}
            />
            <ActionButton
              icon={isLiked ? 'heart' : 'heart-outline'}
              color={isLiked ? pulseColors.live : pulseColors.text}
              count={post.likeCount}
              onPress={action(onLike)}
              accessibilityLabel={isLiked ? 'Unlike video' : 'Like video'}
            />
          </Animated.View>
        ) : null}

        {/* Chevron toggle — expand (up) when collapsed, collapse (down) when expanded. */}
        <Pressable
          onPress={() => toggleExpanded(!expanded)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Collapse video actions' : 'Expand video actions'}
          style={styles.chevronBadge}
        >
          {showHint ? <Animated.View style={[styles.chevronHint, hintStyle]} pointerEvents="none" /> : null}
          <BlurView
            intensity={Platform.OS === 'ios' ? 18 : 0}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.chevronBadgeTint} pointerEvents="none" />
          <Animated.View style={chevronStyle}>
            <Ionicons name="chevron-up" size={16} color={pulseColors.text} />
          </Animated.View>
        </Pressable>

        {/* Avatar — always visible, bottom-anchored so it never jumps. */}
        <View style={styles.avatarWrap}>
          <Pressable
            onPress={expanded ? onProfile : () => toggleExpanded(true)}
            accessibilityRole="button"
            accessibilityLabel={
              expanded
                ? `Open creator profile for ${post.creator.displayName}`
                : 'Expand video actions'
            }
            style={styles.avatarRing}
          >
            <AvatarDisplay
              size={40}
              avatarUrl={post.creator.avatarUrl}
              prioritizeRemoteAvatar
              ringColor="rgba(255,255,255,0.92)"
              pulseFrame={pulseFrameFromUser(post.creator.pulseAvatarFrame)}
            />
          </Pressable>
          {expanded && !isFollowing ? (
            <Pressable
              style={styles.followBubble}
              onPress={action(onFollow)}
              accessibilityRole="button"
              accessibilityLabel={`Follow ${post.creator.displayName}`}
            >
              <Ionicons name="add" size={14} color={pulseColors.onAccent} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Classic rail (flag OFF — legacy always-expanded behavior, unchanged)        */
/* -------------------------------------------------------------------------- */

function ClassicRail({
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
    <View style={[styles.railHost, bottomInset != null && { bottom: bottomInset }]}>
      <View style={styles.glassVeil} pointerEvents="none" />
      <View style={styles.rail}>
        <View style={styles.avatarWrap}>
          <Pressable
            onPress={onProfile}
            accessibilityRole="button"
            accessibilityLabel={`Open profile for ${post.creator.displayName}`}
            style={styles.avatarRing}
          >
            <AvatarDisplay
              size={40}
              avatarUrl={post.creator.avatarUrl}
              prioritizeRemoteAvatar
              ringColor="rgba(255,255,255,0.92)"
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
              <Ionicons name="add" size={14} color={pulseColors.onAccent} />
            </Pressable>
          )}
        </View>

        <ActionButton
          icon={isLiked ? 'heart' : 'heart-outline'}
          color={isLiked ? pulseColors.live : pulseColors.text}
          count={post.likeCount}
          onPress={action(onLike)}
          accessibilityLabel={isLiked ? 'Unlike' : 'Like'}
        />
        <ActionButton
          icon="chatbubble-ellipses-outline"
          color={commentsLocked ? pulseColors.textQuiet : pulseColors.text}
          count={post.commentCount}
          onPress={action(onComment)}
          accessibilityLabel={commentsLocked ? 'Comments off — view thread' : 'Comments'}
          muted={commentsLocked}
        />
        <ActionButton
          icon={isSaved ? 'bookmark' : 'bookmark-outline'}
          color={isSaved ? pulseColors.gift : pulseColors.text}
          count={post.saveCount}
          onPress={action(onSave)}
          accessibilityLabel={isSaved ? 'Remove from saved' : 'Save'}
        />
        {onGift ? (
          <ActionButton
            icon="gift-outline"
            color={pulseColors.gift}
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
    </View>
  );
}

function ActionButton({
  icon, count, color = pulseColors.text, onPress, accessibilityLabel, muted = false,
}: {
  icon: string;
  count: number;
  color?: string;
  onPress: () => void;
  accessibilityLabel: string;
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
      <View style={styles.iconHalo}>
        <Ionicons name={icon as any} size={26} color={color} style={muted ? styles.actionIconMuted : undefined} />
      </View>
      {count >= 0 && (
        <Text style={[styles.actionCount, muted && styles.actionCountMuted]}>{formatCount(count)}</Text>
      )}
    </TouchableOpacity>
  );
}

const textShadow = Platform.select({
  web: { textShadowColor: 'rgba(0,0,0,0.65)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  default: { textShadowColor: 'rgba(0,0,0,0.65)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
});

const styles = StyleSheet.create({
  railHost: {
    position: 'absolute',
    right: 8,
    bottom: 112,
    zIndex: 10,
    alignItems: 'center',
  },

  /* ---- Compact rail ---- */
  railColumn: {
    alignItems: 'center',
    gap: 14,
    paddingVertical: pulseSpacing.sm,
    paddingHorizontal: 6,
  },
  actionsGroup: {
    alignItems: 'center',
    gap: 16,
  },
  soundSlot: { alignItems: 'center', marginBottom: 2 },
  glassPill: {
    position: 'absolute',
    top: -6,
    bottom: -6,
    left: -2,
    right: -2,
    borderRadius: 30,
    overflow: 'hidden',
  },
  glassPillTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13, 22, 40, 0.42)',
  },
  glassPillBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.28)',
    // Soft neon edge glow.
    shadowColor: pulseColors.teal,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  chevronBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.35)',
  },
  chevronBadgeTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13, 22, 40, 0.5)',
  },
  chevronHint: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(25, 211, 197, 0.45)',
    shadowColor: pulseColors.teal,
    shadowOpacity: 0.8,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },

  /* ---- Classic rail ---- */
  glassVeil: {
    position: 'absolute',
    top: -8,
    bottom: -8,
    left: -6,
    right: -6,
    borderRadius: 28,
    backgroundColor: 'rgba(7, 17, 31, 0.22)',
    borderWidth: 1,
    borderColor: pulseColors.border,
  },
  rail: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: pulseSpacing.xs,
  },

  /* ---- Shared ---- */
  avatarWrap: { alignItems: 'center', marginBottom: 2 },
  avatarRing: {
    borderRadius: 24,
    padding: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  followBubble: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: pulseColors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -11,
    borderWidth: 2,
    borderColor: pulseColors.background,
    shadowColor: pulseColors.teal,
    shadowOpacity: 0.45,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  actionBtn: { alignItems: 'center', gap: 2, minWidth: 38, minHeight: 44 },
  actionBtnMuted: { opacity: 0.88 },
  iconHalo: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
  },
  actionIconMuted: { opacity: 0.72 },
  actionCount: {
    color: pulseColors.textSecondary,
    ...pulseTypography.caption,
    fontSize: 11,
    fontWeight: '700',
    ...textShadow,
  },
  actionCountMuted: { opacity: 0.72 },
});
