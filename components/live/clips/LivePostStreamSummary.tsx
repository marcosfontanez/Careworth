import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PulseButton, PulseChip, PulseGlassCard } from '@/components/ui/pulse';
import { pulseColors, pulseRadius, pulseSpacing, pulseTypography } from '@/lib/theme/pulseTheme';
import { formatCount } from '@/utils/format';

type Props = {
  streamTitle: string;
  durationLabel?: string;
  peakViewers?: number;
  markerCount?: number;
  clipCount?: number;
  showOpenStudio?: boolean;
  onOpenStudio?: () => void;
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/** Post-live recap card — sits above Clip Studio after a stream ends. */
export function LivePostStreamSummary({
  streamTitle,
  durationLabel = '—',
  peakViewers = 0,
  markerCount = 0,
  clipCount = 0,
  showOpenStudio = false,
  onOpenStudio,
}: Props) {
  return (
    <PulseGlassCard featured style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="checkmark-circle" size={22} color={pulseColors.teal} />
        <View style={styles.headerCopy}>
          <PulseChip label="Stream ended" tone="success" icon="checkmark-circle-outline" />
          <Text style={styles.title} numberOfLines={2}>
            {streamTitle}
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <Stat label="Duration" value={durationLabel} />
        <Stat label="Peak viewers" value={formatCount(peakViewers)} />
        <Stat label="Markers" value={String(markerCount)} />
        <Stat label="Clips" value={String(clipCount)} />
      </View>

      <Text style={styles.hint}>
        Review markers, trim highlights, and publish to Feed from Clip Studio. Viewer submissions
        stay pending until you approve them.
      </Text>

      {showOpenStudio && onOpenStudio ? (
        <PulseButton
          label="Open Clip Studio"
          rightIcon="arrow-forward"
          onPress={onOpenStudio}
          variant="primary"
          fullWidth
        />
      ) : null}
    </PulseGlassCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: pulseSpacing.lg },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: pulseSpacing.sm },
  headerCopy: { flex: 1, minWidth: 0, gap: pulseSpacing.sm },
  title: { ...pulseTypography.cardTitle, fontSize: 16 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: pulseSpacing.sm },
  stat: {
    minWidth: '22%',
    flexGrow: 1,
    padding: pulseSpacing.sm,
    borderRadius: pulseRadius.lg,
    backgroundColor: 'rgba(7, 17, 31, 0.55)',
    borderWidth: 1,
    borderColor: pulseColors.border,
    gap: 2,
  },
  statValue: { ...pulseTypography.bodySmall, fontWeight: '800', color: pulseColors.text },
  statLabel: { ...pulseTypography.caption },
  hint: { ...pulseTypography.caption, lineHeight: 17 },
});
