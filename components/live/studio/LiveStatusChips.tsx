import React from 'react';
import { StyleSheet, View } from 'react-native';
import { PulseChip } from '@/components/ui/pulse';
import type { PulseChipTone } from '@/lib/theme/pulseTheme';
import { pulseSpacing } from '@/lib/theme/pulseTheme';
import {
  liveSceneLabel,
  sceneStatusChipIcon,
  sceneStatusChipTone,
  type LiveSceneMode,
} from '@/lib/live/liveSceneMode';

function sceneToneToPulse(tone: 'default' | 'active' | 'warn' | 'purple' | 'danger'): PulseChipTone {
  switch (tone) {
    case 'active':
      return 'success';
    case 'warn':
      return 'warning';
    case 'purple':
      return 'premium';
    case 'danger':
      return 'danger';
    default:
      return 'muted';
  }
}

type Props = {
  sessionTimer: string;
  viewerCountLabel: string;
  micMuted: boolean;
  sceneMode: LiveSceneMode;
};

/** Metric chips under the Live Studio preview. */
export function LiveStatusChips({
  sessionTimer,
  viewerCountLabel,
  micMuted,
  sceneMode,
}: Props) {
  const sceneTone = sceneStatusChipTone(sceneMode);
  const sceneActive = sceneMode !== 'live';

  return (
    <View style={styles.row}>
      <PulseChip label={sessionTimer || '0:00'} tone="muted" icon="time-outline" />
      <PulseChip label={viewerCountLabel} tone="muted" icon="eye-outline" />
      <PulseChip
        label={micMuted ? 'Mic off' : 'Mic on'}
        tone={micMuted ? 'warning' : 'success'}
        icon={micMuted ? 'mic-off-outline' : 'mic-outline'}
      />
      <PulseChip
        label={liveSceneLabel(sceneMode)}
        tone={sceneActive ? sceneToneToPulse(sceneTone) : 'success'}
        icon={sceneStatusChipIcon(sceneMode)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: pulseSpacing.sm,
    marginBottom: pulseSpacing.lg,
  },
});
