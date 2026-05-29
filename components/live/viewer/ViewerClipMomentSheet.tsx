import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  PulseButton,
  PulseCard,
  PulseChip,
  PulseEmptyState,
} from '@/components/ui/pulse';
import { pulseColors, pulseRadius, pulseSpacing, pulseTypography } from '@/lib/theme/pulseTheme';

import {
  CLIP_MARKER_DURATION_PRESETS,
  type ClipMarkerDurationSeconds,
} from '@/lib/live/clipMarkerDuration';

export type ViewerClipDurationChoice = ClipMarkerDurationSeconds;

const DURATIONS = CLIP_MARKER_DURATION_PRESETS;

type Props = {
  signedIn: boolean;
  clipsAllowed: boolean;
  broadcastLive: boolean;
  streamIsLive: boolean;
  backendReady: boolean;
  saving?: boolean;
  onSave: (duration: ViewerClipDurationChoice) => void;
};

/** Viewer clip moment sheet — marker only, no on-device video processing. */
export function ViewerClipMomentSheet({
  signedIn,
  clipsAllowed,
  broadcastLive,
  streamIsLive,
  backendReady,
  saving = false,
  onSave,
}: Props) {
  const [selected, setSelected] = useState<ViewerClipDurationChoice>(30);

  if (!signedIn) {
    return (
      <PulseEmptyState
        icon="bookmark-outline"
        title="Clip this moment"
        message="Sign in to save a clip marker for the host to review."
      />
    );
  }

  if (!streamIsLive) {
    return (
      <PulseEmptyState
        icon="time-outline"
        title="Stream ended"
        message="Clips can only be marked while the live is active."
      />
    );
  }

  if (!clipsAllowed) {
    return (
      <PulseEmptyState
        icon="cut-outline"
        title="Clips not available"
        message="The host has not enabled viewer clips for this stream. You can still watch and interact with chat, polls, and gifts."
      />
    );
  }

  if (!backendReady) {
    return (
      <PulseEmptyState
        icon="cloud-offline-outline"
        title="Coming soon"
        message="Clip markers will be available after the live clipping migration is applied on the server."
      />
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Save a clip moment</Text>
      <Text style={styles.body}>
        Choose how much of the live you want flagged. The host reviews before anything is published.
      </Text>

      {!broadcastLive ? (
        <PulseCard variant="gift" padded style={styles.noticeCard}>
          <View style={styles.noticeRow}>
            <Ionicons name="time-outline" size={16} color={pulseColors.gift} />
            <Text style={styles.noticeTxt}>Clips unlock once the host is broadcasting.</Text>
          </View>
        </PulseCard>
      ) : null}

      <View style={styles.durationRow}>
        {DURATIONS.map((d) => {
          const on = selected === d;
          return (
            <Pressable
              key={d}
              onPress={() => setSelected(d)}
              style={[styles.durationBtn, on && styles.durationBtnOn]}
            >
              <Text style={[styles.durationTxt, on && styles.durationTxtOn]}>Last {d}s</Text>
            </Pressable>
          );
        })}
      </View>

      <PulseButton
        label="Save clip marker"
        leftIcon="bookmark-outline"
        onPress={() => onSave(selected)}
        disabled={saving || !broadcastLive}
        loading={saving}
        fullWidth
      />

      <Text style={styles.footer}>
        Your marker stays pending until the host approves it. Final trimming happens in Clip Studio
        after the recording is processed — nothing is published instantly.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: pulseSpacing.lg, paddingBottom: pulseSpacing.sm },
  title: { ...pulseTypography.sectionTitle },
  body: { ...pulseTypography.bodySmall, lineHeight: 20 },
  noticeCard: { marginVertical: 0 },
  noticeRow: { flexDirection: 'row', alignItems: 'center', gap: pulseSpacing.sm },
  noticeTxt: { flex: 1, ...pulseTypography.caption, lineHeight: 17 },
  durationRow: { flexDirection: 'row', gap: pulseSpacing.sm },
  durationBtn: {
    flex: 1,
    paddingVertical: pulseSpacing.md,
    borderRadius: pulseRadius.lg,
    alignItems: 'center',
    backgroundColor: pulseColors.glass,
    borderWidth: 1,
    borderColor: pulseColors.border,
  },
  durationBtnOn: {
    borderColor: pulseColors.borderAccent,
    backgroundColor: 'rgba(25, 211, 197, 0.12)',
  },
  durationTxt: { ...pulseTypography.caption, fontWeight: '700', color: pulseColors.mutedText },
  durationTxtOn: { color: pulseColors.teal },
  footer: { ...pulseTypography.caption, lineHeight: 17 },
});
