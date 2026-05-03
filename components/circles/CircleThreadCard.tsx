import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { AvatarDisplay, pulseFrameFromUser } from '@/components/profile/AvatarBuilder';
import { colors, borderRadius } from '@/theme';
import { formatCount, timeAgo } from '@/utils/format';
import type { CircleThread, CreatorSummary } from '@/types';
import { ShareToMyPulseButton } from './ShareToMyPulseButton';
import { anonymousDisplayName, isAnonymousConfessionCircle } from '@/lib/anonymousCircle';

const KIND_SHORT: Record<CircleThread['kind'], string> = {
  question: 'Ask',
  story: 'Story',
  advice: 'Tips',
  meme: 'Humor',
  media: 'Clip',
};

type Props = {
  thread: CircleThread;
  circleName: string;
  accent: string;
  /** When set, avatar opens this (e.g. creator Pulse page) without opening the thread. */
  onProfile?: () => void;
  onPress: () => void;
  showShareToMyPulse?: boolean;
  /** When true, hides real name/photo and blocks Share to My Pulse. */
  isAnonymousRoom?: boolean;
  /** Reply count grew since user last opened thread (local). */
  hasNewActivity?: boolean;
};

export function CircleThreadCard({
  thread,
  circleName,
  accent,
  onPress,
  onProfile,
  showShareToMyPulse = true,
  isAnonymousRoom: isAnonymousRoomProp,
  hasNewActivity,
}: Props) {
  const isAnonymousRoom = isAnonymousRoomProp ?? isAnonymousConfessionCircle(thread.circleSlug);

  const author: CreatorSummary = useMemo(
    () =>
      thread.author ?? {
        id: thread.authorId,
        displayName: 'Member',
        avatarUrl: '',
        role: 'RN',
        specialty: 'General',
        city: '',
        state: '',
        isVerified: false,
      },
    [thread.author, thread.authorId],
  );

  const displayName = isAnonymousRoom
    ? anonymousDisplayName(thread.authorId, thread.id)
    : author.displayName;

  const showShare = showShareToMyPulse && !isAnonymousRoom;

  const cardShadow =
    Platform.OS === 'ios'
      ? {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.14,
          shadowRadius: 10,
        }
      : { elevation: 3 };

  return (
    <View style={[styles.wrap, cardShadow, hasNewActivity ? { borderLeftWidth: 3, borderLeftColor: accent } : null]}>
      <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
        <View style={[styles.accentHair, { backgroundColor: accent }]} />

        <View style={styles.discussionStripe}>
          <Ionicons name="chatbubbles-outline" size={12} color={accent} />
          <Text style={[styles.discussionStripeText, { color: accent }]}>Discussion</Text>
        </View>

        <View style={styles.top}>
          {isAnonymousRoom ? (
            <View style={[styles.avatar, styles.anonAvatar, { borderColor: accent + '99' }]}>
              <Text style={styles.anonGlyph}>?</Text>
            </View>
          ) : onProfile ? (
            <TouchableOpacity onPress={onProfile} activeOpacity={0.85} accessibilityLabel="Open profile">
              <AvatarDisplay
                size={34}
                avatarUrl={author.avatarUrl}
                prioritizeRemoteAvatar
                ringColor={colors.dark.border}
                pulseFrame={pulseFrameFromUser(author.pulseAvatarFrame)}
              />
            </TouchableOpacity>
          ) : (
            <AvatarDisplay
              size={34}
              avatarUrl={author.avatarUrl}
              prioritizeRemoteAvatar
              ringColor={colors.dark.border}
              pulseFrame={pulseFrameFromUser(author.pulseAvatarFrame)}
            />
          )}
          <View style={styles.topMid}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>
                {displayName}
              </Text>
              {!isAnonymousRoom && author.isVerified ? (
                <Ionicons name="checkmark-circle" size={14} color={colors.primary.teal} />
              ) : null}
            </View>
            <Text style={styles.subtle} numberOfLines={1}>
              {isAnonymousRoom ? 'Anonymous' : `${author.role}${author.specialty ? ` · ${author.specialty}` : ''}`}
            </Text>
          </View>
          <Text style={styles.time}>{timeAgo(thread.createdAt)}</Text>
        </View>

        <Text style={styles.circleLine} numberOfLines={1}>
          <Text style={[styles.circleName, { color: accent }]}>{circleName}</Text>
          <Text style={styles.sep}> · </Text>
          <Text style={styles.kindShort}>{KIND_SHORT[thread.kind]}</Text>
        </Text>

        <Text style={styles.title} numberOfLines={2}>
          {thread.title}
        </Text>
        <Text style={styles.body} numberOfLines={2}>
          {thread.body}
        </Text>

        {thread.mediaThumbUrl ? (
          <Image source={{ uri: thread.mediaThumbUrl }} style={styles.thumb} contentFit="cover" />
        ) : null}

        <View style={styles.footer}>
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Ionicons name="chatbubble-ellipses-outline" size={15} color={colors.dark.textMuted} />
              <Text style={styles.statText}>{formatCount(thread.replyCount)}</Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="heart-outline" size={15} color={colors.dark.textMuted} />
              <Text style={styles.statText}>{formatCount(thread.reactionCount)}</Text>
            </View>
          </View>
          {showShare ? (
            <ShareToMyPulseButton layout="compact" circleSlug={thread.circleSlug} thread={thread} />
          ) : null}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: borderRadius['2xl'],
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
  },
  card: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 12 },
  discussionStripe: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  discussionStripeText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.6, textTransform: 'uppercase' },
  accentHair: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    opacity: 0.55,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.dark.cardAlt },
  anonAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  anonGlyph: { fontSize: 15, fontWeight: '900', color: colors.dark.textSecondary },
  topMid: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { fontSize: 14, fontWeight: '800', color: colors.dark.text, flex: 1 },
  subtle: { fontSize: 11, fontWeight: '600', color: colors.dark.textMuted, marginTop: 2 },
  time: { fontSize: 11, fontWeight: '600', color: colors.dark.textMuted },
  circleLine: { fontSize: 11, fontWeight: '700', marginBottom: 6 },
  circleName: { fontWeight: '800' },
  sep: { color: colors.dark.textMuted },
  kindShort: { color: colors.dark.textSecondary, fontWeight: '700' },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.dark.text,
    letterSpacing: -0.25,
    lineHeight: 21,
    marginBottom: 4,
  },
  body: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.dark.textSecondary,
    fontWeight: '500',
  },
  thumb: {
    marginTop: 10,
    height: 118,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.dark.cardAlt,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.06)',
    gap: 8,
  },
  stats: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statText: { fontSize: 12, fontWeight: '800', color: colors.dark.text },
});
