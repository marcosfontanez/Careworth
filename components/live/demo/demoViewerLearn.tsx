import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, borderRadius, typography, pulseverse } from '@/theme';
import type { LiveSessionQuestion } from '@/types/liveHub';

export type LearnSeg = 'chat' | 'qa' | 'poll' | 'resources';

export function DemoLearnTabs({
  learnSeg,
  onChange,
}: {
  learnSeg: LearnSeg;
  onChange: (s: LearnSeg) => void;
}) {
  return (
    <View style={styles.segRow}>
      {(['chat', 'qa', 'poll', 'resources'] as LearnSeg[]).map((k) => {
        const on = learnSeg === k;
        return (
          <TouchableOpacity
            key={k}
            onPress={() => {
              Haptics.selectionAsync();
              onChange(k);
            }}
            style={[styles.segChip, on && styles.segChipOn]}
          >
            <Text style={[styles.segChipTxt, on && styles.segChipTxtOn]}>
              {k === 'qa' ? 'Q&A' : k.charAt(0).toUpperCase() + k.slice(1)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function DemoLearnPanel({
  learnSeg,
  questions,
  qVotes,
  onUpvote,
}: {
  learnSeg: LearnSeg;
  questions: LiveSessionQuestion[];
  qVotes: Record<string, number>;
  onUpvote: (questionId: string, baseUpvotes: number) => void;
}) {
  if (learnSeg === 'chat') return null;

  if (learnSeg === 'qa') {
    return (
      <View style={styles.panelBox}>
        <TextInput
          placeholder="Ask a question…"
          placeholderTextColor={colors.dark.textMuted}
          style={styles.qInput}
        />
        {questions.map((qu) => (
          <View key={qu.id} style={styles.qRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.qUser}>{qu.userName}</Text>
              <Text style={styles.qText}>{qu.question}</Text>
            </View>
            <TouchableOpacity
              onPress={() => onUpvote(qu.id, qu.upvotes)}
              style={styles.upvote}
            >
              <Ionicons name="chevron-up" size={16} color={pulseverse.electric} />
              <Text style={styles.upvoteTxt}>{qVotes[qu.id] ?? qu.upvotes}</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    );
  }

  if (learnSeg === 'poll') {
    return (
      <View style={styles.panelBox}>
        <Text style={styles.pollQ}>Which habit do you want next session?</Text>
        {['SBAR daily', 'Leader scripting', 'Family updates'].map((t, i) => (
          <TouchableOpacity key={t} style={styles.pollOpt}>
            <Text style={styles.pollOptTxt}>
              {String.fromCharCode(65 + i)}. {t}
            </Text>
          </TouchableOpacity>
        ))}
        <Text style={styles.pollHint}>Poll UI placeholder — TODO: `stream_polls` realtime</Text>
      </View>
    );
  }

  return (
    <View style={styles.panelBox}>
      <Text style={styles.resTitle}>Session resources</Text>
      <Text style={styles.resItem}>• Communication checklist (PDF) — coming soon</Text>
      <Text style={styles.resItem}>• Peer-reviewed references — coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  segRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 14,
    marginTop: 12,
  },
  segChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
    backgroundColor: 'rgba(15,23,42,0.45)',
  },
  segChipOn: { borderColor: pulseverse.electric + '77', backgroundColor: 'rgba(56,189,248,0.12)' },
  segChipTxt: { fontSize: 12, fontWeight: '700', color: colors.dark.textMuted },
  segChipTxtOn: { color: '#FFF' },

  panelBox: {
    marginHorizontal: 14,
    marginTop: 10,
    padding: 12,
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(15,23,42,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.15)',
  },
  qInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFF',
    marginBottom: 10,
  },
  qRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(148,163,184,0.15)',
  },
  qUser: { fontSize: 12, fontWeight: '800', color: pulseverse.electric },
  qText: { fontSize: 14, color: colors.dark.text, marginTop: 2 },
  upvote: { alignItems: 'center', justifyContent: 'center', width: 44 },
  upvoteTxt: { fontSize: 12, fontWeight: '800', color: colors.dark.textSecondary },

  pollQ: { fontSize: 15, fontWeight: '800', color: '#FFF', marginBottom: 10 },
  pollOpt: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
    marginBottom: 8,
  },
  pollOptTxt: { fontSize: 14, color: colors.dark.textSecondary },
  pollHint: { ...typography.caption, color: colors.dark.textMuted, marginTop: 8 },

  resTitle: { fontSize: 15, fontWeight: '800', color: '#FFF', marginBottom: 8 },
  resItem: { fontSize: 14, color: colors.dark.textSecondary, marginBottom: 6 },
});
