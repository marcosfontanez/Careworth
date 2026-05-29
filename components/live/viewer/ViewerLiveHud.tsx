import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PulseChip, PulseIconButton } from '@/components/ui/pulse';
import { pulseColors, pulseSpacing, pulseTypography, pulseZIndex } from '@/lib/theme/pulseTheme';
import { formatCount } from '@/utils/format';

type Props = {
  liveLabel: string;
  viewerCount: number;
  audioMuted: boolean;
  onBack: () => void;
  onToggleAudio: () => void;
};

function liveChipTone(label: string): 'live' | 'warning' | 'muted' {
  if (label === 'LIVE') return 'live';
  if (label === 'CONNECTING') return 'warning';
  return 'muted';
}

export function ViewerLiveHud({
  liveLabel,
  viewerCount,
  audioMuted,
  onBack,
  onToggleAudio,
}: Props) {
  return (
    <View style={styles.wrap}>
      <PulseIconButton
        icon="chevron-back"
        onPress={onBack}
        accessibilityLabel="Close live"
        size="sm"
        tone="ghost"
      />

      <View style={styles.center}>
        <PulseChip label={liveLabel} tone={liveChipTone(liveLabel)} icon="radio-outline" />
        <View style={styles.viewerBadge}>
          <Ionicons name="eye-outline" size={12} color={pulseColors.mutedText} />
          <Text style={styles.viewerText}>{formatCount(viewerCount)}</Text>
        </View>
      </View>

      <PulseIconButton
        icon={audioMuted ? 'volume-mute' : 'volume-high'}
        onPress={onToggleAudio}
        accessibilityLabel={audioMuted ? 'Unmute audio' : 'Mute audio'}
        size="sm"
        tone={audioMuted ? 'gift' : 'ghost'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: pulseSpacing.sm,
    zIndex: pulseZIndex.overlay,
  },
  center: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: pulseSpacing.sm },
  viewerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: pulseColors.glass,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: pulseColors.border,
  },
  viewerText: { ...pulseTypography.caption, fontWeight: '700', color: pulseColors.text },
});
