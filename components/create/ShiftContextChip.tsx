import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { suggestedShiftFromClock } from '@/lib/shiftSuggest';

export type ShiftContext = '' | 'day' | 'night' | 'weekend' | 'any';

interface Props {
  value: ShiftContext;
  onChange: (next: ShiftContext) => void;
  compact?: boolean;
  /** Prefill from clock when the row is still empty (once per mount). */
  autoSuggest?: boolean;
}

const ENTRIES: Array<{ id: Exclude<ShiftContext, ''>; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: 'day',     label: 'Day',     icon: 'sunny-outline' },
  { id: 'night',   label: 'Night',   icon: 'moon-outline' },
  { id: 'weekend', label: 'Weekend', icon: 'calendar-outline' },
  { id: 'any',     label: 'On-call', icon: 'pulse-outline' },
];

export function ShiftContextChip({ value, onChange, compact, autoSuggest = true }: Props) {
  const suggestedOnce = useRef(false);
  useEffect(() => {
    if (!autoSuggest || value !== '' || suggestedOnce.current) return;
    const s = suggestedShiftFromClock();
    if (!s) return;
    suggestedOnce.current = true;
    onChange(s);
  }, [autoSuggest, value, onChange]);
  return (
    <View style={[styles.row, compact && { gap: 6 }]}>
      {ENTRIES.map((e) => {
        const active = value === e.id;
        return (
          <TouchableOpacity
            key={e.id}
            style={[styles.chip, active && styles.chipOn, compact && styles.chipCompact]}
            onPress={() => onChange(active ? '' : e.id)}
            activeOpacity={0.85}
          >
            <Ionicons
              name={e.icon}
              size={compact ? 13 : 15}
              color={active ? colors.primary.teal : colors.dark.textSecondary}
            />
            <Text style={[styles.label, active && { color: colors.primary.teal }]}>{e.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  chipCompact: { paddingHorizontal: 10, paddingVertical: 6 },
  chipOn: {
    borderColor: colors.primary.teal,
    backgroundColor: colors.primary.teal + '22',
  },
  label: { fontSize: 12, fontWeight: '700', color: colors.dark.textSecondary },
});
