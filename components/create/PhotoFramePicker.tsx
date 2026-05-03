import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { PHOTO_FRAMES, type PhotoFrameId } from '@/lib/photoFrames';

interface Props {
  selected: PhotoFrameId;
  onSelect: (id: PhotoFrameId) => void;
}

export function PhotoFramePicker({ selected, onSelect }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Photo frames</Text>
      <Text style={styles.sub}>Wraps the cover slide. Free differentiator.</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {PHOTO_FRAMES.map((f) => {
          const active = selected === f.id;
          return (
            <TouchableOpacity
              key={f.id}
              style={[styles.chip, active && styles.chipOn]}
              onPress={() => onSelect(f.id)}
              activeOpacity={0.85}
            >
              <Text style={styles.emoji}>{f.emoji}</Text>
              <Text style={[styles.chipLabel, active && { color: colors.primary.teal }]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {selected !== 'none' ? (
        <Text style={styles.helper}>
          <Ionicons name="information-circle" size={11} color={colors.dark.textMuted} /> Frames render
          in the composer preview. Feed-side rendering ships in a follow-up so reviewers see them too.
        </Text>
      ) : null}
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
  emoji: { fontSize: 14 },
  chipLabel: { fontSize: 12, fontWeight: '700', color: colors.dark.textSecondary },
  helper: { fontSize: 11, color: colors.dark.textMuted, lineHeight: 14, marginTop: 4 },
});
