import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius } from '@/theme';
import type { CircleAccent } from '@/lib/circleAccents';

export type CirclePostType = 'meme' | 'thread' | 'question' | 'video';

const TYPES: {
  key: CirclePostType;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}[] = [
  { key: 'meme', label: 'Meme', icon: 'image-outline' },
  { key: 'thread', label: 'Thread', icon: 'chatbubbles-outline' },
  { key: 'question', label: 'Question', icon: 'help-circle-outline' },
  { key: 'video', label: 'Video', icon: 'play-circle-outline' },
];

type Props = {
  active: CirclePostType;
  accent: CircleAccent;
  onSelect: (type: CirclePostType) => void;
};

/**
 * Top-of-composer post-type selector. Mirrors the room's mode chips so
 * the composer feels like an extension of the room: the active chip
 * lifts off the row with an accent gradient + soft shadow while inactive
 * chips stay quiet. This kills the "segmented form control" feel and
 * pushes it toward a curated brand chip strip.
 */
export function CirclePostTypeChips({ active, accent, onSelect }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {TYPES.map((t) => {
        const isActive = active === t.key;
        const inner = (
          <View style={styles.chipInner}>
            <Ionicons
              name={t.icon}
              size={15.5}
              color={isActive ? accent.color : colors.dark.textMuted}
            />
            <Text
              style={[
                styles.chipText,
                isActive && { color: accent.color, fontWeight: '800' },
              ]}
            >
              {t.label}
            </Text>
          </View>
        );
        return (
          <TouchableOpacity
            key={t.key}
            style={[styles.chipShadow, isActive && styles.chipShadowActive]}
            onPress={() => onSelect(t.key)}
            activeOpacity={0.85}
          >
            {isActive ? (
              <LinearGradient
                colors={[`${accent.color}33`, `${accent.color}14`]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.chip, { borderColor: accent.color }]}
              >
                {inner}
              </LinearGradient>
            ) : (
              <View style={styles.chip}>{inner}</View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    gap: 8,
  },
  chipShadow: {
    borderRadius: borderRadius.full ?? 999,
  },
  chipShadowActive: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.30,
        shadowRadius: 6,
      },
      android: { elevation: 3 },
      default: {},
    }),
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: borderRadius.full ?? 999,
    backgroundColor: colors.dark.card,
    borderWidth: 1.5,
    borderColor: colors.dark.border,
  },
  chipInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  chipText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.dark.textMuted,
    letterSpacing: 0.1,
  },
});
