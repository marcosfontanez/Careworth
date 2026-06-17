import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { circlePanelLayout } from '@/lib/circles/circlePanelLayout';
import type { CircleAccent } from '@/lib/circleAccents';
import type { CircleTopHelper } from '@/lib/circleIdentity';
import { formatCount } from '@/utils/format';

type Props = {
  helpers: CircleTopHelper[];
  accent: CircleAccent;
  onOpenProfile?: (userId: string) => void;
};

/** Real weekly Helpful leaders — hidden when empty or in anonymous rooms. */
export function CircleActiveVoicesCard({ helpers, accent, onOpenProfile }: Props) {
  if (helpers.length === 0) return null;

  return (
    <View style={[circlePanelLayout.panel, { borderColor: colors.dark.border }]}>
      <View style={circlePanelLayout.headerRow}>
        <Ionicons name="heart-outline" size={16} color={accent.color} />
        <Text style={circlePanelLayout.title}>Active voices this week</Text>
      </View>
      {helpers.map((h, idx) => (
        <TouchableOpacity
          key={h.userId}
          style={styles.row}
          onPress={() => onOpenProfile?.(h.userId)}
          disabled={!onOpenProfile}
          activeOpacity={onOpenProfile ? 0.85 : 1}
          accessibilityRole={onOpenProfile ? 'button' : 'text'}
          accessibilityLabel={`${h.displayName}, ${h.helpfulCount} helpful marks`}
        >
          <View style={[styles.rank, { backgroundColor: `${accent.color}18` }]}>
            <Text style={[styles.rankText, { color: accent.color }]}>{idx + 1}</Text>
          </View>
          <Text style={styles.name} numberOfLines={1}>
            {h.displayName}
          </Text>
          <Text style={styles.meta}>{formatCount(h.helpfulCount)} helpful</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, minHeight: 34 },
  rank: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { fontSize: 11, fontWeight: '800' },
  name: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.dark.textSecondary },
  meta: { fontSize: 12, color: colors.dark.textMuted, fontWeight: '600' },
});
