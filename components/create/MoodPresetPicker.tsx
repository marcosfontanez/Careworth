import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { colors } from '@/theme';
import { MOOD_PRESETS, type MoodPreset, type MoodPresetId } from '@/lib/moodPresets';

interface Props {
  selected: MoodPresetId | null;
  onSelect: (preset: MoodPreset | null) => void;
}

export function MoodPresetPicker({ selected, onSelect }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Mood presets</Text>
      <Text style={styles.sub}>One tap = color filter + suggested hashtags.</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        <TouchableOpacity
          style={[styles.card, !selected && { borderColor: colors.primary.teal }]}
          onPress={() => onSelect(null)}
          activeOpacity={0.85}
        >
          <Text style={styles.emoji}>—</Text>
          <Text style={styles.label}>No mood</Text>
          <Text style={styles.desc}>Use my own settings</Text>
        </TouchableOpacity>
        {MOOD_PRESETS.map((m) => {
          const active = selected === m.id;
          return (
            <TouchableOpacity
              key={m.id}
              style={[styles.card, active && { borderColor: m.accent, backgroundColor: m.accent + '18' }]}
              onPress={() => onSelect(m)}
              activeOpacity={0.85}
            >
              <Text style={styles.emoji}>{m.emoji}</Text>
              <Text style={[styles.label, active && { color: m.accent }]}>{m.label}</Text>
              <Text style={styles.desc} numberOfLines={2}>{m.description}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  title: { fontSize: 13, fontWeight: '800', color: colors.dark.text },
  sub: { fontSize: 11, color: colors.dark.textMuted },
  row: { flexDirection: 'row', gap: 10, paddingVertical: 8 },
  card: {
    width: 130,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.dark.card,
    borderWidth: 1, borderColor: colors.dark.border,
    gap: 4,
  },
  emoji: { fontSize: 22 },
  label: { fontSize: 13, fontWeight: '800', color: colors.dark.text },
  desc: { fontSize: 11, color: colors.dark.textMuted, lineHeight: 14 },
});
