import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { VISUAL_PHI_REMINDERS } from '@/lib/phiGuardrail';

/** Static checklist — vision-based frame scan is not on-device yet. */
const BULLETS = [...VISUAL_PHI_REMINDERS];

export function VideoHygieneCard() {
  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Ionicons name="videocam-outline" size={18} color={colors.primary.teal} />
        <Text style={styles.title}>Video hygiene</Text>
      </View>
      <Text style={styles.sub}>
        We can’t auto-detect whiteboards or monitors yet — use this checklist before posting clinical content.
      </Text>
      {BULLETS.map((line) => (
        <View key={line} style={styles.row}>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.line}>{line}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.dark.border,
    backgroundColor: colors.dark.cardAlt,
    gap: 6,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 13, fontWeight: '800', color: colors.dark.text },
  sub: { fontSize: 11, color: colors.dark.textMuted, lineHeight: 15, marginBottom: 4 },
  row: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  dot: { fontSize: 12, color: colors.primary.teal, marginTop: 1 },
  line: { flex: 1, fontSize: 11, fontWeight: '600', color: colors.dark.textSecondary, lineHeight: 15 },
});
