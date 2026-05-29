import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { colors, typography } from '@/theme';

type Props = {
  requireHostApproval: boolean;
  allowClipDownloads: boolean;
  streamIsLive: boolean;
  togglingSetting?: 'require_approval' | 'downloads' | null;
  onToggleRequireHostApproval?: (required: boolean) => void;
  onToggleAllowClipDownloads?: (allowed: boolean) => void;
};

/** Post-live clip permissions — editable in Clip Studio after stream ends. */
export function ClipStudioStreamSettings({
  requireHostApproval,
  allowClipDownloads,
  streamIsLive,
  togglingSetting = null,
  onToggleRequireHostApproval,
  onToggleAllowClipDownloads,
}: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Clip permissions</Text>
      {!streamIsLive ? (
        <Text style={styles.sub}>Adjust how viewer markers and downloads work for this stream.</Text>
      ) : null}

      <View style={styles.toggleRow}>
        <View style={styles.copy}>
          <Text style={styles.label}>Require host approval</Text>
          <Text style={styles.hint}>Viewer markers stay pending until you approve them.</Text>
        </View>
        <Switch
          value={requireHostApproval}
          onValueChange={(v) => onToggleRequireHostApproval?.(v)}
          disabled={!onToggleRequireHostApproval || togglingSetting === 'require_approval'}
          trackColor={{ false: 'rgba(255,255,255,0.12)', true: 'rgba(56,189,248,0.45)' }}
          thumbColor={requireHostApproval ? colors.primary.teal : colors.dark.textMuted}
        />
      </View>

      <View style={styles.toggleRow}>
        <View style={styles.copy}>
          <Text style={styles.label}>Allow clip downloads</Text>
          <Text style={styles.hint}>Non-host users can download ready clips when enabled.</Text>
        </View>
        <Switch
          value={allowClipDownloads}
          onValueChange={(v) => onToggleAllowClipDownloads?.(v)}
          disabled={!onToggleAllowClipDownloads || togglingSetting === 'downloads'}
          trackColor={{ false: 'rgba(255,255,255,0.12)', true: 'rgba(56,189,248,0.45)' }}
          thumbColor={allowClipDownloads ? colors.primary.teal : colors.dark.textMuted}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(12,18,32,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.18)',
  },
  title: { ...typography.bodySmall, fontWeight: '800', color: colors.neutral.white },
  sub: { ...typography.caption, color: colors.dark.textSecondary, lineHeight: 17 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 4 },
  copy: { flex: 1, gap: 3 },
  label: { ...typography.caption, fontWeight: '700', color: colors.dark.textSecondary },
  hint: { ...typography.caption, color: colors.dark.textMuted, lineHeight: 16 },
});
