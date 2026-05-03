import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { AvatarDisplay, pulseFrameFromUser } from '@/components/profile/AvatarBuilder';
import { colors, borderRadius } from '@/theme';
import { formatCount, timeAgo } from '@/utils/format';
import { anonymousDisplayName } from '@/lib/anonymousCircle';
import { postHasDownloadableMedia, shareDownloadedPostMedia } from '@/lib/postMediaActions';
import { PulseTierBadge } from '@/components/badges/PulseTierBadge';
import type { CircleAccent } from '@/lib/circleAccents';
import type { Post } from '@/types';

type Props = {
  post: Post;
  accent: CircleAccent;
  isAnonymousRoom: boolean;
  isLiked: boolean;
  onPress: () => void;
  /** Avatar-only: open creator Pulse page without changing the main card open gesture. */
  onProfile?: () => void;
  onReply: () => void;
  onReact: () => void;
  onShare: () => void;
  /** When set with `isOwner`, the ⋯ menu opens owner actions (edit / delete) from the parent. */
  isOwner?: boolean;
  onOwnerMenu?: () => void;
};

/**
 * Replacement for the previous Reddit-style RedditPostCard. Differences:
 *
 *  - No left vote rail (removed per redesign brief).
 *  - Avatar + name + role + (optional) specialty pill in a clean top row,
 *    so the card reads like a social post, not a forum row.
 *  - Caption / media / hashtags flow under the header.
 *  - Bottom action row: Like / Reply / (Download when photo or video) / Share.
 *
 * The cell stays on the room's accent color via thin tinted borders + a
 * left-edge stripe so different rooms still feel visually distinct without
 * leaning on a colored side rail with arrows.
 */
export const CirclePostCard = React.memo(function CirclePostCard({
  post,
  accent,
  isAnonymousRoom,
  isLiked,
  onPress,
  onProfile,
  onReply,
  onReact,
  onShare,
  isOwner = false,
  onOwnerMenu,
}: Props) {
  const displayName = isAnonymousRoom
    ? anonymousDisplayName(post.creatorId, post.id)
    : post.creator?.displayName ?? 'Member';
  const role = post.creator?.role;
  const specialty = post.creator?.specialty;
  const caption = post.caption ?? '';
  const isTitled = caption.startsWith('**');
  const titleLine = isTitled ? caption.split('\n')[0].replace(/\*\*/g, '').trim() : '';
  const bodyLine = isTitled ? caption.split('\n\n').slice(1).join('\n\n').trim() : caption;
  const canDownloadMedia = postHasDownloadableMedia(post);

  const onDownloadPress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void shareDownloadedPostMedia(post);
  };

  return (
    <View style={[styles.card, { borderLeftColor: accent.color }]}>
      {/**
       * Main story (header + body + media) is its own press target. The
       * action row is a sibling — not nested inside a parent Touchable —
       * so Reply / Like / Share never fight the "open post" gesture (which
       * caused missed taps and confusing navigation on some devices).
       */}
      <Pressable style={styles.cardMainPress} onPress={onPress}>
        {/**
         * The header (avatar + name + role + meta): tapping the body still
         * opens the post via the outer Pressable; the avatar is a nested
         * press target that opens the creator's Pulse page when `onProfile`
         * is provided (non-anonymous rooms).
         */}
        <View style={styles.header}>
          <View style={styles.creatorRow}>
            {isAnonymousRoom ? (
              <View style={[styles.avatar, styles.anonAvatar, { borderColor: `${accent.color}88` }]}>
                <Text style={styles.anonGlyph}>?</Text>
              </View>
            ) : onProfile ? (
              <Pressable
                onPress={() => onProfile()}
                hitSlop={4}
                accessibilityRole="button"
                accessibilityLabel="Open profile"
              >
                <AvatarDisplay
                  size={32}
                  avatarUrl={post.creator?.avatarUrl}
                  prioritizeRemoteAvatar
                  ringColor={colors.dark.border}
                  pulseFrame={pulseFrameFromUser(post.creator?.pulseAvatarFrame)}
                />
              </Pressable>
            ) : (
              <AvatarDisplay
                size={32}
                avatarUrl={post.creator?.avatarUrl}
                prioritizeRemoteAvatar
                ringColor={colors.dark.border}
                pulseFrame={pulseFrameFromUser(post.creator?.pulseAvatarFrame)}
              />
            )}
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={styles.nameRow}>
                <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
                {!isAnonymousRoom && post.creator?.isVerified && (
                  <Ionicons name="checkmark-circle" size={13} color={colors.primary.teal} />
                )}
                {role && (
                  <View style={[styles.rolePill, { backgroundColor: `${accent.color}20`, borderColor: `${accent.color}55` }]}>
                    <Text style={[styles.rolePillText, { color: accent.color }]}>{role}</Text>
                  </View>
                )}
                {/*
                Pulse tier chip next to role. Suppressed in anonymous
                rooms (would partially deanonymise high-tier creators)
                and for Murmur (new accounts get no visual penalty).
              */}
                {!isAnonymousRoom ? (
                  <PulseTierBadge
                    tier={post.creator?.pulseTier ?? null}
                    size="xs"
                    hideMurmur
                    showIcon={false}
                  />
                ) : null}
              </View>
              <Text style={styles.metaLine} numberOfLines={1}>
                {timeAgo(post.createdAt)}
                {specialty ? ` · ${specialty}` : ''}
              </Text>
            </View>
          </View>
          {isOwner && onOwnerMenu ? (
            <TouchableOpacity
              hitSlop={8}
              style={styles.moreBtn}
              onPress={onOwnerMenu}
              accessibilityLabel="Post options"
            >
              <Ionicons name="ellipsis-horizontal" size={18} color={colors.dark.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {(isTitled || bodyLine) && (
          <View style={styles.body}>
            {isTitled && titleLine ? (
              <Text style={styles.title} numberOfLines={2}>{titleLine}</Text>
            ) : null}
            {bodyLine ? (
              /** Stay tight when there's media (1 line) so the card height
               *  stays predictable; allow 3 lines for pure-text posts so
               *  they still carry meaningful content. */
              <Text
                style={styles.caption}
                numberOfLines={post.mediaUrl ? 1 : isTitled ? 2 : 3}
              >
                {bodyLine}
              </Text>
            ) : null}
          </View>
        )}

        {post.mediaUrl ? (
          <View style={styles.mediaWrap}>
            <Image
              source={{ uri: post.thumbnailUrl ?? post.mediaUrl }}
              style={styles.media}
              contentFit="cover"
              transition={120}
            />
            {post.type === 'video' && (
              <View style={styles.playOverlay}>
                <Ionicons name="play-circle" size={38} color="#FFFFFFE6" />
              </View>
            )}
          </View>
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

      {/**
       * Action row — Like / Comment / Share. The previous Views
       * (eye) button was removed: it had no interaction, it duplicated
       * a counter that doesn't matter at the card level, and it crowded
       * the row. View counts still live inside the post detail / creator
       * analytics where they're actually actionable.
       */}
      <View style={styles.actions}>
        <ActionButton
          icon={isLiked ? 'heart' : 'heart-outline'}
          tint={isLiked ? '#EF4444' : colors.dark.textMuted}
          count={post.likeCount}
          onPress={onReact}
        />
        <ActionButton
          icon="chatbubble-outline"
          tint={colors.dark.textMuted}
          count={post.commentCount}
          onPress={onReply}
        />
        {canDownloadMedia ? (
          <ActionButton
            icon="download-outline"
            tint={colors.dark.textMuted}
            onPress={onDownloadPress}
            accessibilityLabel={post.type === 'video' ? 'Download video' : 'Download photo'}
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
  accessibilityLabel: accessibilityLabelProp,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  tint: string;
  count?: number;
  label?: string;
  onPress?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const text =
    label ??
    (typeof count === 'number' && count > 0 ? formatCount(count) : '');
  const accessibilityLabel =
    accessibilityLabelProp ?? (typeof label === 'string' ? label : undefined);
  const inner = (
    <View style={[styles.actionBtn, disabled && { opacity: 0.35 }]}>
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
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: borderRadius.card ?? 16,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 2,
    borderWidth: 1,
    borderColor: colors.dark.border,
    /** Accent stripe on the leading edge — slightly thicker (3 → 3.5)
     *  so the room identity reads more confidently without reintroducing
     *  a Reddit-style vote rail. */
    borderLeftWidth: 3.5,
    /** Premium elevation so cards feel lifted off the dark background. */
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
  /** Tappable post body — sibling to `actions`, not wrapping it. */
  cardMainPress: { borderRadius: (borderRadius.card ?? 16) - 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  creatorRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.dark.cardAlt },
  anonAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  anonGlyph: { fontSize: 15, fontWeight: '900', color: colors.dark.textSecondary },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name: { fontSize: 13.5, fontWeight: '800', color: colors.dark.text, letterSpacing: -0.2 },
  rolePill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
  },
  rolePillText: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.4 },
  metaLine: { fontSize: 11, color: colors.dark.textMuted, marginTop: 1 },
  moreBtn: { padding: 4 },

  body: { marginTop: 5, gap: 2 },
  title: { fontSize: 14.5, fontWeight: '800', color: colors.dark.text, lineHeight: 19 },
  caption: { fontSize: 13, color: colors.dark.textSecondary, lineHeight: 18 },

  mediaWrap: {
    marginTop: 7,
    borderRadius: borderRadius.md ?? 10,
    overflow: 'hidden',
    /** Slimmer fixed height for feed scannability — the previous 200pt
     *  fixed height was the biggest contributor to "tall" cards; 150pt
     *  still gives memes room to read but lets two cards fit comfortably
     *  in a typical viewport. */
    height: 150,
    backgroundColor: colors.dark.cardAlt,
  },
  media: { width: '100%', height: '100%' },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 5 },
  tagChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  tagText: { fontSize: 11, fontWeight: '700' },

  /** Social action row — Like / Comment / Share. Spread evenly
   *  with `space-between` so the card feels like a balanced social UI
   *  bar rather than a forum control strip. */
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.dark.border,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 4,
  },
  actionText: { fontSize: 12, fontWeight: '700' },
});
