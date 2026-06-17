import React from 'react';
import { ScrollView, Text, TouchableOpacity, StyleSheet, View } from 'react-native';
import { colors, borderRadius } from '@/theme';
import { type CircleFlairFilter, type CircleFlairOption, safetyNoteForFlairFilter } from '@/lib/circleFlairs';
import type { CircleAccent } from '@/lib/circleAccents';

type Props = {
  active: CircleFlairFilter;
  accent: CircleAccent;
  options: CircleFlairOption[];
  onSelect: (flair: CircleFlairFilter) => void;
  showSafetyNote?: boolean;
};

export function CircleFlairFilterChips({
  active,
  accent,
  options,
  onSelect,
  showSafetyNote = true,
}: Props) {
  const safety = showSafetyNote ? safetyNoteForFlairFilter(active) : undefined;

  if (options.length <= 1) return null;

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {options.map((opt) => {
          const isActive = active === opt.id;
          return (
            <TouchableOpacity
              key={String(opt.id)}
              onPress={() => onSelect(opt.id)}
              activeOpacity={0.85}
              style={[
                styles.chip,
                isActive && { borderColor: accent.color, backgroundColor: `${accent.color}18` },
              ]}
            >
              <Text style={[styles.chipText, isActive && { color: accent.color, fontWeight: '700' }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {safety ? <Text style={styles.safety}>{safety}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: 16, marginBottom: 8 },
  row: { gap: 8, paddingVertical: 4 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.dark.border,
    backgroundColor: colors.dark.card,
  },
  chipText: { fontSize: 13, color: colors.dark.textSecondary, fontWeight: '600' },
  safety: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 17,
    color: colors.dark.textMuted,
    fontStyle: 'italic',
  },
});
