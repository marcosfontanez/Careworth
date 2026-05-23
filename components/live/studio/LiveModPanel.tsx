import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, typography } from '@/theme';

type Props = {
  slowModeEnabled: boolean;
};

export function LiveModPanel({ slowModeEnabled }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.tip}>
        <Ionicons name="hand-left-outline" size={18} color={colors.primary.teal} />
        <Text style={styles.tipTxt}>Long-press chat messages to pin or report.</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>Slow mode</Text>
        <Text style={styles.rowValue}>{slowModeEnabled ? 'On (stub)' : 'Off'}</Text>
      </View>
      <Text style={styles.meta}>
        Full moderation tools (timeouts, bans, word filters) will expand here. Use chat long-press for now.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12, paddingVertical: 8 },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(15,28,48,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.22)',
  },
  tipTxt: { ...typography.bodySmall, flex: 1, color: colors.neutral.white, lineHeight: 20 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  rowLabel: { ...typography.bodySmall, fontWeight: '700', color: colors.neutral.white },
  rowValue: { ...typography.bodySmall, color: colors.dark.textMuted },
  meta: { ...typography.caption, color: colors.dark.textMuted, lineHeight: 18 },
});
