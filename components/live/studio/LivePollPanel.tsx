import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PollWidget } from '@/components/live/PollWidget';
import { colors, borderRadius, typography } from '@/theme';
import type { StreamPoll } from '@/types';

type Props = {
  poll: StreamPoll | null;
  hasVoted: boolean;
  votedOptionId?: string;
  onVote: (optionId: string) => void;
  onCreatePoll: () => void;
  onEndPoll: () => void;
  pollVoting?: boolean;
};

export function LivePollPanel({
  poll,
  hasVoted,
  votedOptionId,
  onVote,
  onCreatePoll,
  onEndPoll,
  pollVoting = false,
}: Props) {
  if (!poll) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyTitle}>No active poll</Text>
        <Text style={styles.emptyMeta}>Launch a poll to engage viewers in real time.</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={onCreatePoll}>
          <Ionicons name="add-circle-outline" size={18} color={colors.dark.bg} />
          <Text style={styles.primaryBtnTxt}>Create poll</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <PollWidget
        poll={poll}
        onVote={onVote}
        hasVoted={hasVoted}
        votedOptionId={votedOptionId}
        votingDisabled={pollVoting}
      />
      <TouchableOpacity onPress={onEndPoll} style={styles.endBtn} activeOpacity={0.8}>
        <Ionicons name="stop-outline" size={14} color={colors.dark.textSecondary} />
        <Text style={styles.endTxt}>End poll</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 16, paddingBottom: 8 },
  emptyWrap: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  emptyTitle: { ...typography.h3, fontSize: 16, color: colors.neutral.white },
  emptyMeta: { ...typography.bodySmall, color: colors.dark.textMuted, textAlign: 'center' },
  primaryBtn: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary.teal,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: borderRadius.md,
  },
  primaryBtnTxt: { ...typography.button, fontWeight: '800', color: colors.dark.bg },
  endBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  endTxt: { ...typography.caption, color: colors.dark.textSecondary, fontWeight: '700' },
});
