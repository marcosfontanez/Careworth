import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import type { HookCoachResult } from '@/lib/hookCoach';

const GRADE_COLOR: Record<string, string> = {
  A: '#22C55E',
  B: '#F59E0B',
  C: '#EF4444',
};

export function HookCoachCard({ result }: { result: HookCoachResult }) {
  const tint = GRADE_COLOR[result.grade]!;
  return (
    <View style={[styles.wrap, { borderColor: tint + '66', backgroundColor: tint + '14' }]}>
      <View style={styles.headerRow}>
        <View style={[styles.gradeBubble, { backgroundColor: tint }]}>
          <Text style={styles.gradeText}>{result.grade}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Hook coach</Text>
          <Text style={styles.sub}>Score {result.score}/100</Text>
        </View>
        <Ionicons name="sparkles" size={18} color={tint} />
      </View>
      {result.positives.length > 0 ? (
        <View style={styles.list}>
          {result.positives.slice(0, 2).map((p, i) => (
            <View key={i} style={styles.row}>
              <Ionicons name="checkmark-circle" size={13} color="#22C55E" />
              <Text style={styles.itemText}>{p}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {result.suggestions.length > 0 ? (
        <View style={styles.list}>
          {result.suggestions.slice(0, 2).map((s, i) => (
            <View key={i} style={styles.row}>
              <Ionicons name="bulb" size={13} color="#F59E0B" />
              <Text style={styles.itemText}>{s}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 12, borderRadius: 14, borderWidth: 1, gap: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  gradeBubble: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  gradeText: { fontSize: 14, fontWeight: '900', color: '#FFF' },
  title: { fontSize: 13, fontWeight: '800', color: colors.dark.text },
  sub: { fontSize: 11, color: colors.dark.textMuted },
  list: { gap: 4 },
  row: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  itemText: { flex: 1, fontSize: 12, color: colors.dark.textSecondary, lineHeight: 16 },
});
