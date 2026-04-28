import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '@/theme';
import type { StreamPoll } from '@/types';

const USE_NATIVE = Platform.OS !== 'web';

interface Props {
  poll: StreamPoll | null;
  onVote: (optionId: string) => void;
  hasVoted: boolean;
  votedOptionId?: string;
  /** Slimmer padding and type for overlay / live room */
  compact?: boolean;
}

export function PollWidget({ poll, onVote, hasVoted, votedOptionId, compact }: Props) {
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
        <Ionicons name="bar-chart" size={compact ? 14 : 16} color={colors.primary.teal} />
        <Text style={[styles.question, compact && styles.questionCompact]} numberOfLines={2}>
          {poll.question}
        </Text>
        <View style={styles.timeBadge}>
          <Text style={styles.timeText}>{timeLeft}</Text>
        </View>
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
                if (hasVoted) return;
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onVote(opt.id);
              }}
              disabled={hasVoted}
              activeOpacity={hasVoted ? 1 : 0.7}
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
                  <Ionicons name="checkmark-circle" size={14} color={colors.primary.teal} />
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
    backgroundColor: 'rgba(11,31,58,0.82)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  containerCompact: {
    padding: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(15,28,48,0.92)',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10,
  },
  headerCompact: { marginBottom: 8, gap: 6 },
  question: { flex: 1, fontSize: 14, fontWeight: '700', color: '#FFF' },
  questionCompact: { fontSize: 13, fontWeight: '700' },
  timeBadge: {
    backgroundColor: colors.primary.teal + '25',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  timeText: { fontSize: 11, fontWeight: '700', color: colors.primary.teal },

  options: { gap: 6 },
  optionsCompact: { gap: 5 },
  option: {
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  optionCompact: { borderRadius: 10 },
  optionVoted: { borderColor: colors.primary.teal + '40' },
  optionFill: {
    position: 'absolute', top: 0, left: 0, bottom: 0,
    backgroundColor: colors.primary.teal + '20',
    borderRadius: 10,
  },
  optionContent: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  optionContentCompact: { paddingHorizontal: 12, paddingVertical: 8 },
  optionText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#FFF' },
  optionTextCompact: { fontSize: 12 },
  optionPct: { fontSize: 13, fontWeight: '800', color: colors.primary.teal },

  totalVotes: {
    fontSize: 11, color: colors.dark.textMuted, textAlign: 'center', marginTop: 8,
  },
  totalVotesCompact: { marginTop: 6, fontSize: 10 },
});
