import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { type PhiFinding, highestSeverity } from '@/lib/phiGuardrail';

interface Props {
  findings: PhiFinding[];
  acknowledged: boolean;
  onAcknowledge: () => void;
}

const SEVERITY_COLOR: Record<string, string> = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#0EA5E9',
};

export function PHIGuardrailBanner({ findings, acknowledged, onAcknowledge }: Props) {
  if (findings.length === 0) return null;
  const sev = highestSeverity(findings) ?? 'low';
  const tint = SEVERITY_COLOR[sev]!;
  const title =
    sev === 'high'
      ? 'Possible patient privacy issue'
      : sev === 'medium'
        ? 'Double-check this for privacy'
        : 'Quick privacy check';

  return (
    <View style={[styles.wrap, { borderColor: tint + '99', backgroundColor: tint + '14' }]}>
      <View style={styles.headerRow}>
        <Ionicons name="shield-checkmark" size={18} color={tint} />
        <Text style={[styles.title, { color: tint }]}>{title}</Text>
      </View>
      <Text style={styles.lede}>
        We spotted patterns that could identify a patient. Review before posting:
      </Text>
      <View style={{ gap: 6, marginTop: 8 }}>
        {findings.slice(0, 5).map((f, idx) => (
          <View key={idx} style={styles.findingRow}>
            <View style={[styles.dot, { backgroundColor: SEVERITY_COLOR[f.severity] }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.findingReason}>{f.reason}</Text>
              <Text style={styles.findingMatch}>“{f.match}”</Text>
            </View>
          </View>
        ))}
      </View>
      <TouchableOpacity
        style={[styles.ackBtn, acknowledged && styles.ackBtnOn]}
        onPress={onAcknowledge}
        activeOpacity={0.8}
      >
        <Ionicons
          name={acknowledged ? 'checkmark-circle' : 'ellipse-outline'}
          size={18}
          color={acknowledged ? '#22C55E' : colors.dark.textSecondary}
        />
        <Text style={[styles.ackText, acknowledged && { color: '#22C55E' }]}>
          {acknowledged ? 'Reviewed — safe to post' : 'I\'ve reviewed and it\'s OK'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 14, fontWeight: '800' },
  lede: { fontSize: 12, color: colors.dark.textSecondary, marginTop: 4, lineHeight: 16 },
  findingRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  findingReason: { fontSize: 12, fontWeight: '700', color: colors.dark.text, lineHeight: 16 },
  findingMatch: { fontSize: 11, color: colors.dark.textMuted, marginTop: 2, fontStyle: 'italic' },
  ackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: colors.dark.cardAlt,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  ackBtnOn: { borderColor: '#22C55E' + '99', backgroundColor: '#22C55E14' },
  ackText: { fontSize: 12, fontWeight: '700', color: colors.dark.textSecondary },
});
