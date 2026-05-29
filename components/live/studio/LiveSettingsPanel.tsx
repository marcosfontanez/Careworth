import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { colors, typography } from '@/theme';

type ClipSettingKey = 'viewer_clips' | 'require_approval' | 'downloads';

type Props = {
  streamTitle: string;
  recordingEnabled?: boolean;
  streamIsLive?: boolean;
  viewerClipsAllowed?: boolean;
  requireHostApproval?: boolean;
  allowClipDownloads?: boolean;
  onToggleViewerClips?: (allowed: boolean) => void;
  onToggleRequireHostApproval?: (required: boolean) => void;
  onToggleAllowClipDownloads?: (allowed: boolean) => void;
  togglingSetting?: ClipSettingKey | null;
};

export function LiveSettingsPanel({
  streamTitle,
  recordingEnabled,
  streamIsLive = false,
  viewerClipsAllowed = false,
  requireHostApproval = true,
  allowClipDownloads = false,
  onToggleViewerClips,
  onToggleRequireHostApproval,
  onToggleAllowClipDownloads,
  togglingSetting = null,
}: Props) {
  const viewerClipsLocked = !streamIsLive;

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

      <Text style={styles.sectionTitle}>Clip settings</Text>

      <View style={[styles.toggleRow, viewerClipsLocked && styles.toggleRowLocked]}>
        <View style={styles.toggleCopy}>
          <Text style={styles.label}>Allow viewer clips</Text>
          <Text style={styles.hint}>
            Lets signed-in viewers save clip markers from the live player while you are broadcasting.
          </Text>
          {viewerClipsLocked ? (
            <Text style={styles.lockHint}>Only editable while the stream is live.</Text>
          ) : null}
        </View>
        <Switch
          value={viewerClipsAllowed}
          onValueChange={(next) => onToggleViewerClips?.(next)}
          disabled={viewerClipsLocked || !onToggleViewerClips || togglingSetting === 'viewer_clips'}
          trackColor={{ false: 'rgba(255,255,255,0.12)', true: 'rgba(56,189,248,0.45)' }}
          thumbColor={viewerClipsAllowed ? colors.primary.teal : colors.dark.textMuted}
        />
      </View>

      <View style={styles.toggleRow}>
        <View style={styles.toggleCopy}>
          <Text style={styles.label}>Require host approval</Text>
          <Text style={styles.hint}>
            When on, viewer markers stay pending until you approve them. When off, markers are ready
            for Clip Studio but still are not auto-published.
          </Text>
          {!streamIsLive ? (
            <Text style={styles.lockHint}>Editable post-live for this stream's clips.</Text>
          ) : null}
        </View>
        <Switch
          value={requireHostApproval}
          onValueChange={(next) => onToggleRequireHostApproval?.(next)}
          disabled={!onToggleRequireHostApproval || togglingSetting === 'require_approval'}
          trackColor={{ false: 'rgba(255,255,255,0.12)', true: 'rgba(56,189,248,0.45)' }}
          thumbColor={requireHostApproval ? colors.primary.teal : colors.dark.textMuted}
        />
      </View>

      <View style={styles.toggleRow}>
        <View style={styles.toggleCopy}>
          <Text style={styles.label}>Allow clip downloads</Text>
          <Text style={styles.hint}>
            Lets non-host users download ready clips from this stream. You can always download your
            own clips.
          </Text>
          {!streamIsLive ? (
            <Text style={styles.lockHint}>Editable post-live for this stream's clips.</Text>
          ) : null}
        </View>
        <Switch
          value={allowClipDownloads}
          onValueChange={(next) => onToggleAllowClipDownloads?.(next)}
          disabled={!onToggleAllowClipDownloads || togglingSetting === 'downloads'}
          trackColor={{ false: 'rgba(255,255,255,0.12)', true: 'rgba(56,189,248,0.45)' }}
          thumbColor={allowClipDownloads ? colors.primary.teal : colors.dark.textMuted}
        />
      </View>

      <View style={styles.reminder}>
        <Text style={styles.reminderTitle}>Before publishing or sharing clips</Text>
        <Text style={styles.reminderBody}>
          Review for PHI and sensitive content. Clips should follow community guidelines and
          healthcare-adjacent safety standards. Nothing publishes automatically.
        </Text>
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
  sectionTitle: {
    ...typography.caption,
    fontWeight: '800',
    color: colors.primary.teal,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 4,
  },
  toggleRowLocked: { opacity: 0.72 },
  toggleCopy: { flex: 1, gap: 4 },
  label: { ...typography.caption, color: colors.dark.textMuted, fontWeight: '700', textTransform: 'uppercase' },
  value: { ...typography.body, color: colors.neutral.white, fontWeight: '600' },
  hint: { ...typography.caption, color: colors.dark.textSecondary, lineHeight: 17 },
  lockHint: { ...typography.caption, color: colors.dark.textMuted, fontStyle: 'italic', lineHeight: 16 },
  reminder: {
    gap: 6,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(139,92,246,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.22)',
  },
  reminderTitle: {
    ...typography.caption,
    fontWeight: '800',
    color: colors.primary.teal,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reminderBody: { ...typography.caption, color: colors.dark.textSecondary, lineHeight: 17 },
  meta: { ...typography.caption, color: colors.dark.textMuted, lineHeight: 18, marginTop: 4 },
});
