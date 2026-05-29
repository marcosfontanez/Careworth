import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { PulseChip } from '@/components/ui/pulse';
import { pulseColors, pulseRadius, pulseSpacing, pulseTypography } from '@/lib/theme/pulseTheme';
import type { StreamPoll } from '@/types';

interface Props {
  poll: StreamPoll | null;
  onVote: (optionId: string) => void;
  hasVoted: boolean;
  votedOptionId?: string;
  /** Slimmer padding and type for overlay / live room */
  compact?: boolean;
  votingDisabled?: boolean;
}

export function PollWidget({ poll, onVote, hasVoted, votedOptionId, compact, votingDisabled }: Props) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!poll) return;
    const interval = setInterval(() => {
      const remaining = new Date(poll.endsAt).getTime() - Date.now();
      if (remaining <= 0) {
        setTimeLeft('Ended');
        return;
      }
      const secs = Math.floor(remaining / 1000);
      setTimeLeft(`${secs}s left`);
    }, 1000);
    return () => clearInterval(interval);
  }, [poll]);

  if (!poll || !poll.isActive) return null;

  const totalVotes = poll.options.reduce((sum, o) => sum + o.votes, 0);

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <View style={[styles.header, compact && styles.headerCompact]}>
        <Ionicons name="bar-chart" size={compact ? 14 : 16} color={pulseColors.teal} />
        <Text style={[styles.question, compact && styles.questionCompact]} numberOfLines={2}>
          {poll.question}
        </Text>
        <PulseChip label={timeLeft} tone="muted" />
      </View>

      <View style={[styles.options, compact && styles.optionsCompact]}>
        {poll.options.map((opt) => {
          const pct = totalVotes > 0 ? (opt.votes / totalVotes) * 100 : 0;
          const isMyVote = votedOptionId === opt.id;

          return (
            <TouchableOpacity
              key={opt.id}
              style={[styles.option, compact && styles.optionCompact, isMyVote && styles.optionVoted]}
              onPress={() => {
                if (hasVoted || votingDisabled) return;
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onVote(opt.id);
              }}
              disabled={hasVoted || votingDisabled}
              activeOpacity={hasVoted || votingDisabled ? 1 : 0.7}
            >
              {hasVoted && (
                <View style={[styles.optionFill, { width: `${pct}%` }]} />
              )}
              <View style={[styles.optionContent, compact && styles.optionContentCompact]}>
                <Text style={[styles.optionText, compact && styles.optionTextCompact]} numberOfLines={1}>
                  {opt.text}
                </Text>
                {hasVoted && (
                  <Text style={styles.optionPct}>{Math.round(pct)}%</Text>
                )}
                {isMyVote && (
                  <Ionicons name="checkmark-circle" size={14} color={pulseColors.teal} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.totalVotes, compact && styles.totalVotesCompact]}>
        {totalVotes.toLocaleString()} votes
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: pulseColors.glass,
    borderRadius: pulseRadius.lg,
    padding: pulseSpacing.lg,
    borderWidth: 1,
    borderColor: pulseColors.borderStrong,
  },
  containerCompact: {
    padding: pulseSpacing.sm,
    borderRadius: pulseRadius.md,
    backgroundColor: pulseColors.glassStrong,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: pulseSpacing.sm, marginBottom: 10,
  },
  headerCompact: { marginBottom: pulseSpacing.sm, gap: 6 },
  question: { flex: 1, ...pulseTypography.bodySmall, fontWeight: '700', color: pulseColors.text },
  questionCompact: { fontSize: 13, fontWeight: '700' },
  options: { gap: 6 },
  optionsCompact: { gap: 5 },
  option: {
    borderRadius: pulseRadius.md,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: pulseColors.border,
  },
  optionCompact: { borderRadius: pulseRadius.md },
  optionVoted: { borderColor: pulseColors.borderAccent },
  optionFill: {
    position: 'absolute', top: 0, left: 0, bottom: 0,
    backgroundColor: 'rgba(25, 211, 197, 0.2)',
    borderRadius: pulseRadius.md,
  },
  optionContent: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  optionContentCompact: { paddingHorizontal: 12, paddingVertical: 8 },
  optionText: { flex: 1, fontSize: 13, fontWeight: '600', color: pulseColors.text },
  optionTextCompact: { fontSize: 12 },
  optionPct: { fontSize: 13, fontWeight: '800', color: pulseColors.teal },

  totalVotes: {
    fontSize: 11, color: pulseColors.mutedText, textAlign: 'center', marginTop: pulseSpacing.sm,
  },
  totalVotesCompact: { marginTop: 6, fontSize: 10 },
});
