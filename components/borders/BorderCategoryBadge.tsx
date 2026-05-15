import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  BORDER_CATEGORY_LABELS,
  BORDER_CATEGORY_TONE,
  type BorderCategory,
  type BorderCategoryTone,
} from '@/lib/borders/category';

type ToneColors = { fg: string; bg: string; border: string; icon: keyof typeof Ionicons.glyphMap };

const TONE: Record<BorderCategoryTone, ToneColors> = {
  cyan: {
    fg: '#A5F3FC',
    bg: 'rgba(34,211,238,0.12)',
    border: 'rgba(34,211,238,0.42)',
    icon: 'sparkles',
  },
  gold: {
    fg: '#FDE68A',
    bg: 'rgba(212,166,58,0.16)',
    border: 'rgba(212,166,58,0.46)',
    icon: 'heart',
  },
  violet: {
    fg: '#DDD6FE',
    bg: 'rgba(167,139,250,0.16)',
    border: 'rgba(167,139,250,0.45)',
    icon: 'megaphone',
  },
  green: {
    fg: '#BBF7D0',
    bg: 'rgba(34,197,94,0.16)',
    border: 'rgba(34,197,94,0.45)',
    icon: 'gift',
  },
  slate: {
    fg: '#CBD5F5',
    bg: 'rgba(71,85,105,0.32)',
    border: 'rgba(148,163,184,0.32)',
    icon: 'time',
  },
};

const ICON_OVERRIDE: Partial<Record<BorderCategory, keyof typeof Ionicons.glyphMap>> = {
  charity: 'heart',
  advertiser: 'megaphone',
  holiday: 'gift',
  leaderboard: 'trophy',
  beta: 'flask',
  reward: 'ribbon',
  premium: 'sparkles',
  legacy: 'time',
};

export type BorderCategoryBadgeProps = {
  category: BorderCategory;
  /** Smaller pill for cards / inline strips. */
  compact?: boolean;
  /** Hide leading icon for the tightest cases. */
  hideIcon?: boolean;
};

export function BorderCategoryBadge({ category, compact, hideIcon }: BorderCategoryBadgeProps) {
  const tone = TONE[BORDER_CATEGORY_TONE[category]];
  const icon = ICON_OVERRIDE[category] ?? tone.icon;
  return (
    <View
      style={[
        styles.pill,
        compact && styles.pillCompact,
        { backgroundColor: tone.bg, borderColor: tone.border },
      ]}
    >
      {!hideIcon ? (
        <Ionicons
          name={icon}
          size={compact ? 10 : 12}
          color={tone.fg}
          style={{ marginRight: compact ? 4 : 6 }}
        />
      ) : null}
      <Text
        style={[
          styles.label,
          compact && styles.labelCompact,
          { color: tone.fg },
        ]}
      >
        {BORDER_CATEGORY_LABELS[category]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  pillCompact: { paddingHorizontal: 7, paddingVertical: 3 },
  label: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  labelCompact: { fontSize: 10, letterSpacing: 0.3 },
});
