import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { SPECIALTY_STICKERS, type SpecialtyStickerId } from '@/lib/specialtyStickers';

interface Props {
  selected: SpecialtyStickerId | null;
  onSelect: (id: SpecialtyStickerId | null) => void;
}

export function SpecialtyStickerPicker({ selected, onSelect }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Specialty stickers</Text>
      <Text style={styles.sub}>One tap adds a themed badge over your photo / video.</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        <TouchableOpacity
          style={[styles.chip, !selected && styles.chipOn]}
          onPress={() => onSelect(null)}
          activeOpacity={0.85}
        >
          <Ionicons name="remove-circle-outline" size={14} color={!selected ? colors.primary.teal : colors.dark.textMuted} />
          <Text style={[styles.chipLabel, !selected && { color: colors.primary.teal }]}>None</Text>
        </TouchableOpacity>
        {SPECIALTY_STICKERS.map((s) => {
          const active = selected === s.id;
          return (
            <TouchableOpacity
              key={s.id}
              style={[styles.chip, active && { borderColor: s.color, backgroundColor: s.color + '22' }]}
              onPress={() => onSelect(s.id)}
              activeOpacity={0.85}
            >
              <Text style={styles.emoji}>{s.emoji}</Text>
              <Text style={[styles.chipLabel, active && { color: s.color }]}>{s.label}</Text>
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
  row: { flexDirection: 'row', gap: 8, paddingVertical: 6 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
    backgroundColor: colors.dark.card,
    borderWidth: 1, borderColor: colors.dark.border,
  },
  chipOn: { borderColor: colors.primary.teal, backgroundColor: colors.primary.teal + '22' },
  chipLabel: { fontSize: 12, fontWeight: '700', color: colors.dark.textSecondary },
  emoji: { fontSize: 14 },
});
