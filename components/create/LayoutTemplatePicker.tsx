import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

export type PhotoLayoutPreset = 'carousel' | 'filmstrip' | 'grid2' | 'stack' | 'row3';

const PRESETS: Array<{ id: PhotoLayoutPreset; label: string; icon: keyof typeof Ionicons.glyphMap; hint: string }> = [
  { id: 'carousel', label: 'Carousel', icon: 'albums-outline', hint: 'Swipe slides — first is cover' },
  { id: 'filmstrip', label: 'Film strip', icon: 'film-outline', hint: 'Wide crops read best left-to-right' },
  { id: 'grid2', label: '2×2 story', icon: 'grid-outline', hint: 'Aim for four balanced shots' },
  { id: 'row3', label: '3 across', icon: 'apps-outline', hint: 'First row of three — rest follow in carousel' },
  { id: 'stack', label: 'Mag stack', icon: 'layers-outline', hint: '2–3 tall portrait crops' },
];

interface Props {
  value: PhotoLayoutPreset;
  onChange: (next: PhotoLayoutPreset) => void;
}

export function LayoutTemplatePicker({ value, onChange }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Layout guide</Text>
      <Text style={styles.sub}>Preview framing only — posts as carousel unless you merge elsewhere.</Text>
      <View style={styles.row}>
        {PRESETS.map((p) => {
          const on = p.id === value;
          return (
            <TouchableOpacity
              key={p.id}
              style={[styles.chip, on && styles.chipOn]}
              onPress={() => onChange(p.id)}
              activeOpacity={0.85}
            >
              <Ionicons name={p.icon} size={16} color={on ? colors.primary.teal : colors.dark.textSecondary} />
              <Text style={[styles.chipLabel, on && styles.chipLabelOn]} numberOfLines={1}>
                {p.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={styles.hint}>{PRESETS.find((x) => x.id === value)?.hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6, marginTop: 4 },
  title: { fontSize: 13, fontWeight: '800', color: colors.dark.text },
  sub: { fontSize: 11, color: colors.dark.textMuted, lineHeight: 15 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  chipOn: { borderColor: colors.primary.teal + '99', backgroundColor: colors.primary.teal + '14' },
  chipLabel: { fontSize: 11, fontWeight: '700', color: colors.dark.textSecondary, maxWidth: 88 },
  chipLabelOn: { color: colors.primary.teal },
  hint: { fontSize: 11, color: colors.dark.textMuted, fontStyle: 'italic', marginTop: 2 },
});
