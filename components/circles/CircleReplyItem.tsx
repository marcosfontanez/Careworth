import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { AvatarDisplay, pulseFrameFromUser } from '@/components/profile/AvatarBuilder';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius } from '@/theme';
import { timeAgo } from '@/utils/format';
import { anonymousDisplayName, isAnonymousConfessionCircle } from '@/lib/anonymousCircle';
import { CommentRichText } from '@/components/ui/CommentRichText';
import type { CircleReply, CreatorSummary } from '@/types';

type Props = {
  reply?: CircleReply | null;
  /** When set with `threadId` + anonymous circle slug, hides real identity and highlights OP replies. */
  circleSlug?: string;
  threadAuthorId?: string;
  threadId?: string;
};

export function CircleReplyItem({ reply, circleSlug, threadAuthorId, threadId }: Props) {
  const isAnonRoom = isAnonymousConfessionCircle(circleSlug);
  const router = useRouter();
  const author: CreatorSummary = useMemo(
    () =>
      reply?.author ?? {
        id: reply?.authorId ?? '',
        displayName: 'Member',
        avatarUrl: '',
        role: 'RN',
        specialty: 'General',
        city: '',
        state: '',
        isVerified: false,
      },
    [reply?.author, reply?.authorId],
  );

  const displayName = useMemo(() => {
    if (!reply) return 'Member';
    if (isAnonRoom && threadId) return anonymousDisplayName(reply.authorId, threadId);
    return author.displayName;
  }, [isAnonRoom, threadId, reply, reply?.authorId, author.displayName]);

  const isOp = Boolean(
    reply && isAnonRoom && threadAuthorId && threadId && reply.authorId === threadAuthorId,
  );

  if (!reply) {
    return null;
  }

  const bodyText = reply.body ?? '';

  return (
    <View style={styles.row}>
      {isAnonRoom ? (
        <View style={[styles.avatar, isOp && styles.opNeonRing]}>
          <Ionicons name="eye-off-outline" size={18} color={colors.dark.textMuted} />
        </View>
      ) : author.id ? (
        <TouchableOpacity
          onPress={() => router.push(`/profile/${author.id}` as never)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Open profile"
        >
          <AvatarDisplay
            size={32}
            avatarUrl={author.avatarUrl}
            prioritizeRemoteAvatar
            ringColor={colors.dark.border}
            pulseFrame={pulseFrameFromUser(author.pulseAvatarFrame)}
          />
        </TouchableOpacity>
      ) : (
        <AvatarDisplay
          size={32}
          avatarUrl={author.avatarUrl}
          prioritizeRemoteAvatar
          ringColor={colors.dark.border}
          pulseFrame={pulseFrameFromUser(author.pulseAvatarFrame)}
        />
      )}
      <View style={styles.main}>
        <View style={styles.head}>
          <Text style={styles.name} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={styles.time}>{timeAgo(reply.createdAt)}</Text>
        </View>
        <Text style={styles.role} numberOfLines={1}>
          {isAnonRoom ? (isOp ? 'Original poster' : 'Anonymous') : author.role}
        </Text>
        <CommentRichText
          text={bodyText}
          style={styles.body}
          mentionsInteractive={!isAnonRoom}
          linksInteractive={!isAnonRoom}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dark.border,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.dark.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  opNeonRing: {
    borderWidth: 2,
    borderColor: colors.primary.teal,
    shadowColor: colors.primary.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 10,
    elevation: 6,
  },
  main: { flex: 1, minWidth: 0 },
  head: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  name: { fontSize: 13, fontWeight: '800', color: colors.dark.text, flex: 1 },
  time: { fontSize: 11, color: colors.dark.textMuted },
  role: { fontSize: 10, fontWeight: '600', color: colors.primary.teal, marginTop: 2 },
  body: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: colors.dark.textSecondary,
  },
});
