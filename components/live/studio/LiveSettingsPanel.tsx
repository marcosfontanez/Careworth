import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, typography } from '@/theme';

type Props = {
  streamTitle: string;
  recordingEnabled?: boolean;
};

export function LiveSettingsPanel({ streamTitle, recordingEnabled }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={styles.label}>Stream title</Text>
        <Text style={styles.value} numberOfLines={2}>
          {streamTitle}
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Recording</Text>
        <Text style={styles.value}>{recordingEnabled ? 'Enabled (reserved)' : 'Off'}</Text>
      </View>
      <Text style={styles.meta}>
        Edit stream info and advanced broadcast settings from Quick Actions → Edit Stream Info.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12, paddingVertical: 8 },
  row: { gap: 4 },
  label: { ...typography.caption, color: colors.dark.textMuted, fontWeight: '700', textTransform: 'uppercase' },
  value: { ...typography.body, color: colors.neutral.white, fontWeight: '600' },
  meta: { ...typography.caption, color: colors.dark.textMuted, lineHeight: 18, marginTop: 4 },
});
