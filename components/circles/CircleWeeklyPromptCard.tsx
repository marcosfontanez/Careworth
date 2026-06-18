import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, colors } from '@/theme';
import { circlePanelLayout } from '@/lib/circles/circlePanelLayout';
import type { CircleAccent } from '@/lib/circleAccents';
import type { CircleWeeklyPrompt } from '@/lib/circleWeeklyPrompts';

type Props = {
  prompt: CircleWeeklyPrompt;
  accent: CircleAccent;
  onPress: () => void;
  onDismiss?: () => void;
};

export function CircleWeeklyPromptCard({ prompt, accent, onPress, onDismiss }: Props) {
  return (
    <View style={[circlePanelLayout.panel, { borderColor: `${accent.color}44` }]}>
      <View style={styles.top}>
        <View style={[styles.badge, { backgroundColor: `${accent.color}22` }]}>
          <Ionicons name="sparkles-outline" size={14} color={accent.color} />
          <Text style={[styles.badgeText, { color: accent.color }]}>This week</Text>
        </View>
        {onDismiss ? (
          <TouchableOpacity onPress={onDismiss} hitSlop={8} accessibilityLabel="Dismiss prompt">
            <Ionicons name="close" size={18} color={colors.dark.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {prompt.title}
      </Text>
      <Text style={circlePanelLayout.body} numberOfLines={3}>
        {prompt.body}
      </Text>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        style={[styles.cta, { backgroundColor: accent.color }]}
      >
        <Text style={styles.ctaText}>{prompt.cta}</Text>
        <Ionicons name="arrow-forward" size={16} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  badgeText: { fontSize: 12, fontWeight: '700' },
  title: { fontSize: 16, fontWeight: '800', color: colors.dark.text, marginBottom: 6, lineHeight: 21 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: borderRadius.button,
    marginTop: 12,
  },
  ctaText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
});
