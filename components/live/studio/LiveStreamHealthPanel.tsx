import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Clipboard,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  PulseButton,
  PulseCard,
  PulseChip,
  PulseSectionHeader,
} from '@/components/ui/pulse';
import { pulseColors, pulseRadius, pulseSpacing, pulseTypography } from '@/lib/theme/pulseTheme';
import {
  buildHealthDebugSummary,
  cameraStatusLabel,
  formatHeartbeatAge,
  healthLevelForCamera,
  healthLevelForLiveKit,
  healthLevelForMic,
  healthLevelForRealtime,
  healthLevelForStreamDb,
  liveKitStatusLabel,
  liveSceneLabel,
  micStatusLabel,
  realtimeStatusLabel,
  streamDbStatusLabel,
  type HealthLevel,
  type StreamHealthSnapshot,
} from '@/lib/live/streamHealth';
import type { PulseChipTone } from '@/lib/theme/pulseTheme';

export type { StreamHealthSnapshot } from '@/lib/live/streamHealth';

type Row = {
  key: string;
  label: string;
  value: string;
  level: HealthLevel;
  icon: keyof typeof Ionicons.glyphMap;
  hint?: string;
};

function levelToChipTone(level: HealthLevel): PulseChipTone {
  if (level === 'good') return 'success';
  if (level === 'warn') return 'warning';
  if (level === 'bad') return 'danger';
  return 'muted';
}

function levelIconColor(level: HealthLevel): string {
  if (level === 'good') return pulseColors.success;
  if (level === 'warn') return pulseColors.warning;
  if (level === 'bad') return pulseColors.danger;
  return pulseColors.mutedText;
}

function HealthChip({ row }: { row: Row }) {
  return (
    <PulseCard variant="default" padded style={styles.chip}>
      <View style={styles.chipRow}>
        <Ionicons name={row.icon} size={15} color={levelIconColor(row.level)} />
        <View style={styles.chipText}>
          <View style={styles.chipHeader}>
            <Text style={styles.chipLabel}>{row.label}</Text>
            <PulseChip label={row.value} tone={levelToChipTone(row.level)} />
          </View>
          {row.hint ? <Text style={styles.chipHint}>{row.hint}</Text> : null}
        </View>
      </View>
    </PulseCard>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <PulseSectionHeader title={title} />
      <View style={styles.grid}>{children}</View>
    </View>
  );
}

type Props = {
  snapshot: StreamHealthSnapshot;
  onRefresh?: () => void;
  refreshing?: boolean;
};

/** Host Stream Health diagnostics — premium dark glass status cards. */
export function LiveStreamHealthPanel({ snapshot, onRefresh, refreshing = false }: Props) {
  const [devLog, setDevLog] = useState<string[]>([]);

  useEffect(() => {
    if (!__DEV__) return;
    const line = `[health] lk=${snapshot.liveKitStatus} mic=${snapshot.micStatus} cam=${snapshot.cameraStatus} rt=${snapshot.realtimeStatus}`;
    setDevLog((prev) => [...prev.slice(-4), line]);
  }, [snapshot]);

  const overviewRows = useMemo((): Row[] => {
    return [
      {
        key: 'lk',
        label: 'LiveKit',
        value: liveKitStatusLabel(snapshot.liveKitStatus),
        level: healthLevelForLiveKit(snapshot.liveKitStatus),
        icon: 'videocam-outline',
        hint:
          snapshot.liveKitStatus === 'error' && snapshot.liveKitError
            ? snapshot.liveKitError
            : undefined,
      },
      {
        key: 'stream-db',
        label: 'Stream database',
        value: streamDbStatusLabel(snapshot.streamDbStatus),
        level: healthLevelForStreamDb(snapshot.streamDbStatus),
        icon: 'server-outline',
      },
      {
        key: 'realtime',
        label: 'Supabase realtime',
        value: realtimeStatusLabel(snapshot.realtimeStatus),
        level: healthLevelForRealtime(snapshot.realtimeStatus),
        icon: 'cloud-outline',
      },
    ];
  }, [snapshot]);

  const mediaRows = useMemo((): Row[] => {
    return [
      {
        key: 'mic',
        label: 'Microphone',
        value: micStatusLabel(snapshot.micStatus),
        level: healthLevelForMic(snapshot.micStatus),
        icon: snapshot.micStatus === 'muted' ? 'mic-off-outline' : 'mic-outline',
      },
      {
        key: 'cam',
        label: 'Camera',
        value: cameraStatusLabel(snapshot.cameraStatus),
        level: healthLevelForCamera(snapshot.cameraStatus, snapshot.sceneMode),
        icon: 'camera-outline',
        hint:
          snapshot.cameraStatus === 'off' &&
          snapshot.sceneMode !== 'live' &&
          snapshot.sceneMode !== 'qna' &&
          snapshot.sceneMode !== 'poll'
            ? 'Scene overlay active'
            : undefined,
      },
    ];
  }, [snapshot]);

  const sessionRows = useMemo((): Row[] => {
    return [
      {
        key: 'viewers',
        label: 'Viewers',
        value: String(snapshot.viewerCount),
        level: 'good',
        icon: 'eye-outline',
      },
      {
        key: 'scene',
        label: 'Scene mode',
        value: liveSceneLabel(snapshot.sceneMode),
        level: snapshot.sceneMode === 'live' ? 'good' : 'warn',
        icon: 'layers-outline',
      },
      {
        key: 'heartbeat-db',
        label: 'Last DB heartbeat',
        value: formatHeartbeatAge(snapshot.lastHeartbeatAt),
        level:
          snapshot.streamDbStatus === 'stale_risk'
            ? 'warn'
            : snapshot.lastHeartbeatAt
              ? 'good'
              : 'neutral',
        icon: 'heart-outline',
      },
      {
        key: 'heartbeat-local',
        label: 'Last local ping',
        value: formatHeartbeatAge(snapshot.lastLocalHeartbeatAt),
        level: snapshot.lastLocalHeartbeatAt ? 'good' : 'neutral',
        icon: 'pulse-outline',
        hint: snapshot.lastLocalHeartbeatAt ? undefined : 'Available while broadcasting',
      },
    ];
  }, [snapshot]);

  const channelRows = useMemo((): Row[] => {
    const ch = snapshot.realtimeChannels;
    const rows: Row[] = [
      {
        key: 'rt-chat',
        label: 'Chat',
        value: ch.chat ? 'Subscribed' : 'Waiting',
        level: ch.chat ? 'good' : 'warn',
        icon: 'chatbubbles-outline',
      },
      {
        key: 'rt-stream',
        label: 'Stream row',
        value: ch.stream ? 'Subscribed' : 'Waiting',
        level: ch.stream ? 'good' : 'bad',
        icon: 'radio-outline',
      },
      {
        key: 'rt-polls',
        label: 'Polls',
        value: ch.polls ? 'Subscribed' : 'Waiting',
        level: ch.polls ? 'good' : 'warn',
        icon: 'stats-chart-outline',
      },
      {
        key: 'rt-pins',
        label: 'Pins',
        value: ch.pins ? 'Subscribed' : 'Waiting',
        level: ch.pins ? 'good' : 'warn',
        icon: 'pin-outline',
      },
      {
        key: 'rt-gifts',
        label: 'Gifts',
        value: ch.gifts ? 'Subscribed' : 'Waiting',
        level: ch.gifts ? 'good' : 'warn',
        icon: 'gift-outline',
      },
    ];
    if (ch.questions !== undefined) {
      rows.push({
        key: 'rt-qna',
        label: 'Q&A',
        value: ch.questions ? 'Subscribed' : 'Waiting',
        level: ch.questions ? 'good' : 'warn',
        icon: 'help-circle-outline',
      });
    }
    return rows;
  }, [snapshot.realtimeChannels]);

  const handleCopyDebug = useCallback(() => {
    try {
      const summary = buildHealthDebugSummary(snapshot);
      Clipboard.setString(summary);
      Alert.alert('Copied', 'Debug summary copied to clipboard.');
    } catch (err) {
      if (__DEV__) console.warn('[LiveStreamHealthPanel.copyDebug]', err);
    }
  }, [snapshot]);

  return (
    <ScrollView contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false}>
      <Text style={styles.intro}>
        Session diagnostics at a glance. Yellow is often intentional (BRB, connecting). Red needs
        attention.
      </Text>

      <View style={styles.toolbar}>
        {onRefresh ? (
          <PulseButton
            label={refreshing ? 'Refreshing…' : 'Refresh health'}
            leftIcon="refresh-outline"
            onPress={onRefresh}
            disabled={refreshing}
            variant="secondary"
          />
        ) : null}
        {__DEV__ ? (
          <PulseButton
            label="Copy debug summary"
            leftIcon="copy-outline"
            onPress={handleCopyDebug}
            variant="ghost"
          />
        ) : null}
      </View>

      <Text style={styles.updatedMeta}>Snapshot · {formatHeartbeatAge(snapshot.capturedAt)}</Text>

      <Section title="Overview">
        {overviewRows.map((row) => (
          <HealthChip key={row.key} row={row} />
        ))}
      </Section>

      <Section title="Media">
        {mediaRows.map((row) => (
          <HealthChip key={row.key} row={row} />
        ))}
      </Section>

      <Section title="Session">
        {sessionRows.map((row) => (
          <HealthChip key={row.key} row={row} />
        ))}
      </Section>

      <Section title="Realtime channels">
        {channelRows.map((row) => (
          <HealthChip key={row.key} row={row} />
        ))}
      </Section>

      {__DEV__ && devLog.length > 0 ? (
        <PulseCard variant="default">
          <Text style={styles.devTitle}>Dev log</Text>
          {devLog.map((line, i) => (
            <Text key={`${i}-${line}`} style={styles.devLine}>
              {line}
            </Text>
          ))}
        </PulseCard>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: pulseSpacing.lg, paddingBottom: pulseSpacing.lg },
  intro: { ...pulseTypography.bodySmall, lineHeight: 20 },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', gap: pulseSpacing.sm },
  updatedMeta: { ...pulseTypography.caption },
  section: { gap: pulseSpacing.sm },
  grid: { gap: pulseSpacing.sm },
  chip: { marginBottom: 0 },
  chipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: pulseSpacing.sm },
  chipText: { flex: 1, gap: pulseSpacing.xs },
  chipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: pulseSpacing.sm,
  },
  chipLabel: { ...pulseTypography.caption, fontWeight: '800', color: pulseColors.text, flex: 1 },
  chipHint: { ...pulseTypography.caption, fontSize: 10, lineHeight: 14 },
  devTitle: {
    ...pulseTypography.label,
    marginBottom: pulseSpacing.xs,
  },
  devLine: {
    ...pulseTypography.caption,
    fontSize: 10,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
});
