import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/theme';
import type { PulseScorePreview } from '@/lib/pulseScorePreview';

const PULSE_COLOR: Record<PulseScorePreview['pulse'], [string, string]> = {
  low:    ['#9CA3AF', '#6B7280'],
  medium: ['#0EA5E9', '#3B82F6'],
  high:   ['#14B8A6', '#22C55E'],
  elite:  ['#F59E0B', '#EC4899'],
};

const PULSE_LABEL: Record<PulseScorePreview['pulse'], string> = {
  low:    'Low — looks like a draft',
  medium: 'Solid — ready to post',
  high:   'High — likely to trend',
  elite:  'Elite — leaderboard track',
};

export function PulseScorePreviewCard({ preview }: { preview: PulseScorePreview }) {
  const [g1, g2] = PULSE_COLOR[preview.pulse];

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={[g1 + '24', g2 + '14']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, { borderColor: g1 + '88' }]}
      >
        <View style={styles.headerRow}>
          <View style={[styles.scoreBubble, { backgroundColor: g1 }]}>
            <Text style={styles.scoreText}>{preview.score}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Pulse Score preview</Text>
            <Text style={styles.sub}>{PULSE_LABEL[preview.pulse]}</Text>
          </View>
          <Ionicons name="trending-up" size={20} color={g1} />
        </View>

        <View style={styles.barWrap}>
          <View style={[styles.barFill, { width: `${preview.score}%`, backgroundColor: g1 }]} />
        </View>

        {preview.reasons.length > 0 ? (
          <View style={styles.list}>
            {preview.reasons.slice(0, 4).map((r, i) => (
              <View key={i} style={styles.row}>
                <Ionicons name="add-circle" size={12} color={g1} />
                <Text style={styles.itemText}>{r}</Text>
              </View>
            ))}
          </View>
        ) : null}
        {preview.tips.length > 0 ? (
          <View style={styles.list}>
            {preview.tips.slice(0, 3).map((t, i) => (
              <View key={i} style={styles.row}>
                <Ionicons name="bulb-outline" size={12} color="#F59E0B" />
                <Text style={styles.itemText}>{t}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 16, overflow: 'hidden' },
  card: { padding: 14, borderRadius: 16, borderWidth: 1, gap: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  scoreBubble: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  scoreText: { fontSize: 16, fontWeight: '900', color: '#FFF' },
  title: { fontSize: 14, fontWeight: '800', color: colors.dark.text },
  sub: { fontSize: 12, color: colors.dark.textSecondary, marginTop: 2 },
  barWrap: {
    height: 6, borderRadius: 3, overflow: 'hidden',
    backgroundColor: colors.dark.cardAlt, marginTop: 4,
  },
  barFill: { height: '100%', borderRadius: 3 },
  list: { gap: 4, marginTop: 4 },
  row: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  itemText: { flex: 1, fontSize: 11, color: colors.dark.textSecondary, lineHeight: 15 },
});
