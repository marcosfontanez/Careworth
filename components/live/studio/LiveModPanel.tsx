import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, typography } from '@/theme';

export function LiveModPanel() {
  return (
    <View style={styles.wrap}>
      <View style={styles.tip}>
        <Ionicons name="hand-left-outline" size={18} color={colors.primary.teal} />
        <Text style={styles.tipTxt}>Long-press chat messages to pin, remove, or report.</Text>
      </View>
      <Text style={styles.meta}>
        Hosts can remove messages for everyone. Viewers can report messages that break community guidelines.
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
  meta: { ...typography.caption, color: colors.dark.textMuted, lineHeight: 18 },
});
