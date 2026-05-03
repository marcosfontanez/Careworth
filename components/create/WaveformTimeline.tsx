import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { colors } from '@/theme';

interface Props {
  uri: string;
  durationSec: number | null | undefined;
  trimStart: number;
  trimEnd: number | null;
  onTrim?: (start: number, end: number) => void;
}

const SEGMENTS = 64;

/**
 * Synthetic waveform — a deterministic per-uri set of bars + a translucent
 * trim window. We don't have ffmpeg amplitude data on the client today, so
 * the bars are pseudo-random but stable per video. The trim window is real.
 */
export function WaveformTimeline({ uri, durationSec, trimStart, trimEnd }: Props) {
  const bars = useMemo(() => {
    let h = 0;
    for (let i = 0; i < uri.length; i += 1) h = (h * 31 + uri.charCodeAt(i)) | 0;
    return Array.from({ length: SEGMENTS }, (_, i) => {
      h = (h * 1103515245 + 12345 + i) | 0;
      const v = (Math.abs(h) % 100) / 100;
      // Bias toward more interesting middle amplitudes.
      return 0.2 + v * 0.8;
    });
  }, [uri]);

  const total = Math.max(durationSec ?? 0, 1);
  const startPct = Math.max(0, Math.min(1, trimStart / total));
  const endPct = Math.max(startPct, Math.min(1, (trimEnd ?? total) / total));
  const trimW = (endPct - startPct) * 100;
  const screen = Dimensions.get('window').width - 32;

  return (
    <View style={[styles.wrap, { width: screen }]}>
      <View style={styles.barsRow}>
        {bars.map((amp, i) => {
          const inWindow = i / SEGMENTS >= startPct && i / SEGMENTS <= endPct;
          return (
            <View
              key={i}
              style={[
                styles.bar,
                { height: 8 + amp * 32, opacity: inWindow ? 1 : 0.35, backgroundColor: inWindow ? colors.primary.teal : colors.dark.textMuted },
              ]}
            />
          );
        })}
      </View>
      <View
        pointerEvents="none"
        style={[
          styles.window,
          { left: `${startPct * 100}%`, width: `${trimW}%` },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 56, borderRadius: 12, overflow: 'hidden',
    backgroundColor: colors.dark.card,
    borderWidth: 1, borderColor: colors.dark.border,
    paddingHorizontal: 8, justifyContent: 'center',
  },
  barsRow: { flexDirection: 'row', alignItems: 'center', gap: 2, height: '100%' },
  bar: { width: 3, borderRadius: 2 },
  window: {
    position: 'absolute', top: 0, bottom: 0,
    borderColor: colors.primary.teal,
    borderWidth: 2, borderRadius: 8,
    backgroundColor: colors.primary.teal + '14',
  },
});
