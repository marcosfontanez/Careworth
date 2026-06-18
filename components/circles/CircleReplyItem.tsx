import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { openPulsePage } from '@/lib/navigation/pulsePageRoutes';
import { BorderedAvatar } from '@/components/borders/BorderedAvatar';
import { Ionicons } from '@expo/vector-icons';
import { colors, rhythm } from '@/theme';
import { timeAgo } from '@/utils/format';
import { isAnonymousConfessionCircle, anonymousDisplayName } from '@/lib/anonymousCircle';
import { CIRCLE_REPLY_REMOVED_TOMBSTONE } from '@/lib/circleModeration';
import { buildNeonPillTags } from '@/lib/buildNeonPillTags';
import { CommentRichText } from '@/components/ui/CommentRichText';
import { CircleReplyHelpfulButton } from '@/components/circles/CircleReplyHelpfulButton';
import type { CircleReply, CreatorSummary } from '@/types';

type Props = {
  reply?: CircleReply | null;
  /** When set with anonymous circle slug, hides real identity. */
  circleSlug?: string;
  threadId?: string;
  onReport?: () => void;
  canModerate?: boolean;
  onModerate?: () => void;
  helpfulCount?: number;
  markedHelpful?: boolean;
  onToggleHelpful?: () => void;
  helpfulDisabled?: boolean;
  accent?: string;
};

export function CircleReplyItem({
  reply,
  circleSlug,
  threadId,
  onReport,
  canModerate,
  onModerate,
  helpfulCount,
  markedHelpful = false,
  onToggleHelpful,
  helpfulDisabled,
  accent,
}: Props) {
  const isAnonRoom = isAnonymousConfessionCircle(circleSlug);
  const router = useRouter();
  const author: CreatorSummary = useMemo(
    () =>
      reply?.author ?? {
        id: reply?.authorId ?? '',
        displayName: 'Member',
        avatarUrl: '',
        role: '',
        specialty: '',
        city: '',
        state: '',
        isVerified: false,
      },
    [reply?.author, reply?.authorId],
  );

  const displayName = useMemo(() => {
    if (!reply) return 'Member';
    // Anonymous rooms NEVER expose the real name — stable per-thread pseudonym.
    if (isAnonRoom) {
      return anonymousDisplayName(reply.authorId ?? author.id ?? '', threadId ?? '');
    }
    return author.displayName;
  }, [isAnonRoom, reply, author.id, author.displayName, threadId]);

  if (!reply) {
    return null;
  }

  const bodyText = reply.isModerationRemoved ? CIRCLE_REPLY_REMOVED_TOMBSTONE : (reply.body ?? '');

  return (
    <View style={styles.row}>
      {isAnonRoom ? (
        <View style={styles.avatar}>
          <Ionicons name="eye-off-outline" size={18} color={colors.dark.textMuted} />
        </View>
      ) : author.id ? (
        <BorderedAvatar
          size={32}
          avatarUrl={author.avatarUrl}
          ringColor={colors.dark.border}
          pulseAvatarFrame={author.pulseAvatarFrame}
          ownerDisplayName={displayName}
          userId={author.id}
          priority="reply"
          onPress={() => openPulsePage(router, author.id)}
        />
      ) : (
        <BorderedAvatar
          size={32}
          avatarUrl={author.avatarUrl}
          ringColor={colors.dark.border}
          pulseAvatarFrame={author.pulseAvatarFrame}
          ownerDisplayName={displayName}
          userId={author.id}
          priority="reply"
          disableLongPressInfo={isAnonRoom}
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
          {isAnonRoom ? 'Anonymous' : buildNeonPillTags(author).join(' · ') || '\u00a0'}
        </Text>
        <CommentRichText
          text={bodyText}
          style={[styles.body, reply.isModerationRemoved ? styles.removedBody : null]}
          mentionsInteractive={!isAnonRoom && !reply.isModerationRemoved}
          linksInteractive={!isAnonRoom && !reply.isModerationRemoved}
        />
        {!reply.isModerationRemoved && onToggleHelpful ? (
          <CircleReplyHelpfulButton
            count={helpfulCount ?? reply.helpfulCount ?? 0}
            marked={markedHelpful}
            accent={accent}
            disabled={helpfulDisabled}
            onPress={onToggleHelpful}
          />
        ) : null}
        {onReport && !reply.isModerationRemoved ? (
          <TouchableOpacity onPress={onReport} hitSlop={8} style={styles.reportBtn}>
            <Text style={styles.reportBtnText}>Report</Text>
          </TouchableOpacity>
        ) : null}
        {canModerate && onModerate && !reply.isModerationRemoved ? (
          <TouchableOpacity onPress={onModerate} hitSlop={8} style={styles.modBtn}>
            <Ionicons name="shield-outline" size={14} color={colors.primary.teal} />
            <Text style={styles.modBtnText}>Moderate</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: rhythm.cardPaddingMedium,
    paddingVertical: rhythm.cardPaddingMedium,
    paddingHorizontal: rhythm.cardPaddingSmall,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dark.border,
    minHeight: rhythm.cardMinHeightMedium,
  },
  avatar: {
    width: rhythm.avatarSizeSmall,
    height: rhythm.avatarSizeSmall,
    borderRadius: rhythm.avatarSizeSmall / 2,
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
  removedBody: { fontStyle: 'italic', color: colors.dark.textMuted },
  reportBtn: { marginTop: 8, alignSelf: 'flex-start' },
  reportBtnText: { fontSize: 11, fontWeight: '700', color: colors.dark.textMuted },
  modBtn: { marginTop: 8, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4 },
  modBtnText: { fontSize: 11, fontWeight: '700', color: colors.primary.teal },
});
