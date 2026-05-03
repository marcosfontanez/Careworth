import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

interface Props {
  /** Section the speed ramp applies to: start / mid / end. */
  rates: { start: number; mid: number; end: number };
  onChange: (next: { start: number; mid: number; end: number }) => void;
  effectivePreview: number;
  onPreviewChange: (rate: number) => void;
}

const OPTIONS = [0.25, 0.5, 1, 1.5, 2];

export function SpeedRampEditor({ rates, onChange, effectivePreview, onPreviewChange }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Speed ramps</Text>
      <Text style={styles.sub}>Slow the climax, speed the boring middle.</Text>

      {(['start', 'mid', 'end'] as const).map((section) => (
        <View key={section} style={styles.row}>
          <Text style={styles.rowLabel}>{section === 'start' ? 'Intro' : section === 'mid' ? 'Middle' : 'Outro'}</Text>
          <View style={styles.chipRow}>
            {OPTIONS.map((r) => {
              const active = rates[section] === r;
              return (
                <TouchableOpacity
                  key={r}
                  style={[styles.chip, active && styles.chipOn]}
                  onPress={() => onChange({ ...rates, [section]: r })}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.chipText, active && { color: colors.primary.teal }]}>{r}×</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}

      <View style={styles.previewRow}>
        <Ionicons name="play-circle-outline" size={18} color={colors.primary.teal} />
        <Text style={styles.previewText}>Preview the {effectivePreview}× rate live:</Text>
        <View style={styles.chipRow}>
          {OPTIONS.map((r) => {
            const active = effectivePreview === r;
            return (
              <TouchableOpacity
                key={r}
                style={[styles.chip, active && styles.chipOn]}
                onPress={() => onPreviewChange(r)}
                activeOpacity={0.85}
              >
                <Text style={[styles.chipText, active && { color: colors.primary.teal }]}>{r}×</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      <Text style={styles.helper}>
        Speed ramps render in the preview only. The uploaded file plays at 1×; a server-side
        re-encode pass is on the roadmap.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  title: { fontSize: 13, fontWeight: '800', color: colors.dark.text },
  sub: { fontSize: 11, color: colors.dark.textMuted },
  row: { gap: 6 },
  rowLabel: { fontSize: 11, fontWeight: '800', color: colors.dark.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
    backgroundColor: colors.dark.card, borderWidth: 1, borderColor: colors.dark.border,
  },
  chipOn: { borderColor: colors.primary.teal, backgroundColor: colors.primary.teal + '22' },
  chipText: { fontSize: 11, fontWeight: '800', color: colors.dark.textSecondary },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 4 },
  previewText: { fontSize: 11, fontWeight: '700', color: colors.dark.textSecondary },
  helper: { fontSize: 11, color: colors.dark.textMuted, lineHeight: 14 },
});
