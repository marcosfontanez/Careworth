import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { colors, borderRadius, spacing, typography } from '@/theme';

type IonName = ComponentProps<typeof Ionicons>['name'];

export type LiveTopic = {
  id: string;
  label: string;
  icon: IonName;
  /** Brand accent — drives icon/border/text tint */
  accent: string;
};

/**
 * Curated topic catalog for the "Browse by Topic" section.
 * Order matches the design spec: Nursing, ICU, ER, Night Shift, Pharmacy, Wellness, Funny Medical Memes.
 * Each topic carries an accent that maps loosely to its mood.
 */
export const LIVE_TOPICS: LiveTopic[] = [
  { id: 'nursing',  label: 'Nursing',             icon: 'medkit-outline',     accent: colors.primary.teal },
  { id: 'icu',      label: 'ICU',                 icon: 'pulse-outline',      accent: colors.primary.royal },
  { id: 'er',       label: 'ER',                  icon: 'medical-outline',    accent: colors.status.error },
  { id: 'night',    label: 'Night Shift',         icon: 'moon-outline',       accent: colors.status.invite },
  { id: 'pharmacy', label: 'Pharmacy',            icon: 'flask-outline',      accent: colors.community.pharmacists },
  { id: 'wellness', label: 'Wellness',            icon: 'leaf-outline',       accent: colors.community.confessions },
  { id: 'memes',    label: 'Funny Medical Memes', icon: 'happy-outline',      accent: colors.community.memes },
];

type Props = {
  topic: LiveTopic;
  onPress: () => void;
  active?: boolean;
};

/**
 * Pill-style topic card. Uses the topic accent as a subtle tint + icon ring
 * so each topic feels distinct without feeling tacky.
 */
export function LiveTopicChip({ topic, onPress, active = false }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Browse ${topic.label} live streams`}
      style={[
        styles.chip,
        {
          backgroundColor: active ? topic.accent + '24' : colors.dark.card,
          borderColor: active ? topic.accent + '88' : topic.accent + '32',
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: topic.accent + '20', borderColor: topic.accent + '44' }]}>
        <Ionicons name={topic.icon} size={15} color={topic.accent} />
      </View>
      <Text style={[styles.label, active && { color: colors.dark.text }]} numberOfLines={1}>
        {topic.label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: 6,
    paddingRight: spacing.md + 2,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  label: {
    ...typography.sectionLabel,
    fontSize: 13,
    fontWeight: '700',
    color: colors.dark.textSecondary,
    letterSpacing: -0.1,
  },
});
