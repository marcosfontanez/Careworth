import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, borderRadius } from '@/theme';

export type CircleReplySort = 'new' | 'top' | 'helpful';

const OPTIONS: { key: CircleReplySort; label: string }[] = [
  { key: 'new', label: 'New' },
  { key: 'top', label: 'Top' },
  { key: 'helpful', label: 'Helpful' },
];

type Props = {
  active: CircleReplySort;
  accent: string;
  onSelect: (sort: CircleReplySort) => void;
};

export function CircleReplySortBar({ active, accent, onSelect }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>Sort replies</Text>
      <View style={styles.chips}>
        {OPTIONS.map((opt) => {
          const isActive = active === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              onPress={() => onSelect(opt.key)}
              style={[styles.chip, isActive && { borderColor: accent, backgroundColor: `${accent}18` }]}
            >
              <Text style={[styles.chipText, isActive && { color: accent, fontWeight: '700' }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dark.border,
  },
  label: { fontSize: 13, color: colors.dark.textMuted, fontWeight: '600' },
  chips: { flexDirection: 'row', gap: 8 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  chipText: { fontSize: 12, color: colors.dark.textSecondary, fontWeight: '600' },
});
