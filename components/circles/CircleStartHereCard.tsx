import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, colors } from '@/theme';
import { circlePanelLayout } from '@/lib/circles/circlePanelLayout';
import type { CircleAccent } from '@/lib/circleAccents';
import type { CircleThread } from '@/types';

type Props = {
  copy: string;
  accent: CircleAccent;
  welcomeThread?: CircleThread | null;
  isConfessions?: boolean;
  onOpenThread?: (threadId: string) => void;
};

/** Pinned welcome / Start here card — never links to hidden or missing threads. */
export function CircleStartHereCard({
  copy,
  accent,
  welcomeThread,
  isConfessions,
  onOpenThread,
}: Props) {
  const threadTitle = welcomeThread?.title?.trim();
  const canLink = !!threadTitle && !!welcomeThread?.id && !!onOpenThread;

  return (
    <View style={circlePanelLayout.panel}>
      <View style={circlePanelLayout.headerRow}>
        <View style={[styles.iconWrap, { backgroundColor: `${accent.color}22` }]}>
          <Ionicons name={isConfessions ? 'shield-outline' : 'compass-outline'} size={18} color={accent.color} />
        </View>
        <Text style={circlePanelLayout.title}>Start here</Text>
      </View>
      <Text style={circlePanelLayout.body}>{copy}</Text>
      {canLink ? (
        <TouchableOpacity
          style={[styles.linkRow, { borderColor: `${accent.color}40` }]}
          onPress={() => onOpenThread!(welcomeThread!.id)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`Open pinned thread: ${threadTitle}`}
        >
          <Ionicons name="pin" size={14} color={accent.color} />
          <Text style={[styles.linkText, { color: accent.color }]} numberOfLines={2}>
            {threadTitle}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={accent.color} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    backgroundColor: 'rgba(18,26,44,0.55)',
  },
  linkText: { flex: 1, fontSize: 13, fontWeight: '600' },
});
