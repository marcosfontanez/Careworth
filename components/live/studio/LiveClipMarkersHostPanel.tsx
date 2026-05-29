import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  PulseButton,
  PulseCard,
  PulseChip,
  PulseLoadingSkeleton,
  PulseSectionHeader,
} from '@/components/ui/pulse';
import { pulseColors, pulseRadius, pulseSpacing, pulseTypography } from '@/lib/theme/pulseTheme';
import { formatClipMarkerTime } from '@/lib/live/clipMarkerErrors';
import { LiveManagerEmptyState } from '@/components/live/studio/StreamManagerPanelShell';
import type { LiveClipMarker } from '@/services/supabase/streamClipMarkers';
import type { PulseChipTone } from '@/lib/theme/pulseTheme';

type Props = {
  markers: LiveClipMarker[];
  loading?: boolean;
  backendReady?: boolean;
  recordingActive?: boolean;
  onMarkMoment?: () => void;
  markMomentLoading?: boolean;
  onOpenClipStudio?: () => void;
  onReviewMarker?: (markerId: string, decision: 'approved' | 'rejected') => void;
  reviewingMarkerId?: string | null;
};

function markerChipTone(status: LiveClipMarker['status']): PulseChipTone {
  switch (status) {
    case 'pending':
      return 'warning';
    case 'submitted':
      return 'muted';
    case 'approved':
      return 'success';
    default:
      return 'danger';
  }
}

function markerChipLabel(status: LiveClipMarker['status']): string {
  switch (status) {
    case 'pending':
      return 'Viewer pending';
    case 'submitted':
      return 'Host marked';
    case 'approved':
      return 'Approved';
    default:
      return 'Rejected';
  }
}

/** Host clip marker queue — review viewer submissions and host marks. */
export function LiveClipMarkersHostPanel({
  markers,
  loading = false,
  backendReady = true,
  recordingActive = false,
  onMarkMoment,
  markMomentLoading = false,
  onOpenClipStudio,
  onReviewMarker,
  reviewingMarkerId = null,
}: Props) {
  if (!backendReady) {
    return (
      <LiveManagerEmptyState
        icon="cut-outline"
        title="Clip markers need migration 206"
        message="Apply supabase/migrations/206_live_clip_markers.sql to enable live moment markers."
      />
    );
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <PulseLoadingSkeleton lines={4} card />
      </View>
    );
  }

  const pending = markers.filter((m) => m.status === 'pending');
  const submitted = markers.filter((m) => m.status === 'submitted');

  return (
    <View style={styles.wrap}>
      <View style={styles.toolbar}>
        <PulseButton
          label="Mark moment"
          leftIcon="bookmark-outline"
          onPress={() => onMarkMoment?.()}
          disabled={!onMarkMoment || markMomentLoading}
          loading={markMomentLoading}
          variant="secondary"
          style={styles.toolBtn}
        />
        <PulseButton
          label="Clip Studio"
          leftIcon="cut-outline"
          onPress={() => onOpenClipStudio?.()}
          disabled={!onOpenClipStudio}
          variant="ghost"
          style={styles.toolBtn}
        />
      </View>

      <PulseCard variant="default">
        <View style={styles.bannerRow}>
          <Ionicons
            name={recordingActive ? 'radio-outline' : 'alert-circle-outline'}
            size={16}
            color={recordingActive ? pulseColors.teal : pulseColors.mutedText}
          />
          <Text style={styles.bannerTxt}>
            {recordingActive
              ? 'Recording active — markers map to the live archive.'
              : 'No active recording — new markers will fail until egress is running.'}
          </Text>
        </View>
      </PulseCard>

      <PulseCard variant="glass">
        <Text style={styles.settingsHintTxt}>
          Viewer clips default to pending until you approve them. Trim and publish from Clip Studio
          after the stream ends.
        </Text>
      </PulseCard>

      {markers.length === 0 ? (
        <LiveManagerEmptyState
          icon="bookmark-outline"
          title="No markers yet"
          message="Tap Mark moment above, or wait for viewer clip submissions."
        />
      ) : null}

      {pending.length > 0 ? (
        <View style={styles.section}>
          <PulseSectionHeader title={`Viewer requests (${pending.length})`} />
          {pending.map((marker) => (
            <MarkerRow
              key={marker.id}
              marker={marker}
              onReview={onReviewMarker}
              reviewing={reviewingMarkerId === marker.id}
            />
          ))}
        </View>
      ) : null}

      {submitted.length > 0 ? (
        <View style={styles.section}>
          <PulseSectionHeader title={`Host marks (${submitted.length})`} />
          {submitted.map((marker) => (
            <MarkerRow key={marker.id} marker={marker} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function MarkerRow({
  marker,
  onReview,
  reviewing = false,
}: {
  marker: LiveClipMarker;
  onReview?: (markerId: string, decision: 'approved' | 'rejected') => void;
  reviewing?: boolean;
}) {
  const showReview = marker.status === 'pending' && onReview;

  return (
    <PulseCard variant="default" style={styles.row}>
      <View style={styles.rowTop}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {marker.title}
        </Text>
        <PulseChip label={markerChipLabel(marker.status)} tone={markerChipTone(marker.status)} />
      </View>
      <Text style={styles.rowMeta}>
        {marker.clipDurationSeconds ? `Last ${marker.clipDurationSeconds}s · ` : ''}
        At {formatClipMarkerTime(marker.markerTimeSeconds)} · window{' '}
        {formatClipMarkerTime(marker.startSeconds)}–{formatClipMarkerTime(marker.endSeconds)}
      </Text>
      {showReview ? (
        <View style={styles.reviewRow}>
          <PulseButton
            label="Approve"
            onPress={() => onReview(marker.id, 'approved')}
            disabled={reviewing}
            loading={reviewing}
            variant="primary"
            style={styles.reviewBtn}
          />
          <PulseButton
            label="Reject"
            onPress={() => onReview(marker.id, 'rejected')}
            disabled={reviewing}
            variant="danger"
            style={styles.reviewBtn}
          />
        </View>
      ) : null}
    </PulseCard>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: pulseSpacing.lg, paddingVertical: pulseSpacing.xs },
  loading: { paddingVertical: pulseSpacing['3xl'] },
  toolbar: { flexDirection: 'row', gap: pulseSpacing.sm },
  toolBtn: { flex: 1 },
  bannerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: pulseSpacing.sm },
  bannerTxt: { flex: 1, ...pulseTypography.caption, lineHeight: 17 },
  settingsHintTxt: { ...pulseTypography.caption, lineHeight: 17 },
  section: { gap: pulseSpacing.sm },
  row: { gap: pulseSpacing.sm },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: pulseSpacing.sm,
  },
  rowTitle: { flex: 1, ...pulseTypography.bodySmall, fontWeight: '700' },
  rowMeta: { ...pulseTypography.caption },
  reviewRow: { flexDirection: 'row', gap: pulseSpacing.sm, marginTop: pulseSpacing.xs },
  reviewBtn: { flex: 1 },
});
