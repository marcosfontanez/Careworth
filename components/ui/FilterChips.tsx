import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, Platform, View } from 'react-native';
import { colors, borderRadius, layout, spacing, typography } from '@/theme';
import * as Haptics from 'expo-haptics';

interface Props {
  options: string[];
  selected: string;
  onSelect: (val: string) => void;
}

export function FilterChips({ options, selected, onSelect }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {options.map((opt) => {
        const isActive = selected === opt;
        return (
          <TouchableOpacity
            key={opt}
            style={[styles.chip, isActive && styles.active]}
            onPress={() => {
              Haptics.selectionAsync();
              onSelect(opt);
            }}
            activeOpacity={0.75}
          >
            {isActive ? <View pointerEvents="none" style={styles.activeSheen} /> : null}
            <Text style={[styles.label, isActive && styles.activeLabel]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: layout.screenPadding,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 1,
    borderRadius: borderRadius['2xl'],
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
    overflow: 'hidden',
  },
  active: {
    backgroundColor: colors.primary.teal,
    borderColor: 'rgba(255,255,255,0.18)',
    ...Platform.select({
      ios: {
        shadowColor: colors.primary.teal,
        shadowOpacity: 0.35,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 3 },
      default: {},
    }),
  },
  activeSheen: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '50%',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  label: { ...typography.sectionLabel, color: colors.dark.textSecondary },
  activeLabel: { color: colors.dark.text, fontWeight: '700' },
});
