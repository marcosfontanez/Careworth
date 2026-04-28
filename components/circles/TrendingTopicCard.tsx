import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius } from '@/theme';
import { formatCount, timeAgo } from '@/utils/format';
import type { TrendingTopic24h } from '@/types';

type Props = {
  topic: TrendingTopic24h;
  accent: string;
  /** 1–3 — only three trending slots exist. */
  rank: 1 | 2 | 3;
  onPress: () => void;
};

export function TrendingTopicCard({ topic, accent, rank, onPress }: Props) {
  const isPost = Boolean(topic.postId);
  const engagementLabel = isPost ? 'comments' : 'replies';
  const grad: [string, string] =
    rank === 1
      ? [colors.primary.gold + '24', colors.primary.gold + '05']
      : rank === 2
        ? [accent + '22', accent + '06']
        : [colors.dark.cardAlt + 'FF', colors.dark.bg];

  return (
    <TouchableOpacity activeOpacity={0.88} onPress={onPress} style={styles.touch}>
      <LinearGradient colors={grad} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.card}>
        <View style={[styles.rank, rank === 1 && styles.rankHot]}>
          <Text style={[styles.rankNum, rank === 1 && styles.rankNumHot]}>{rank}</Text>
        </View>
        <View style={[styles.flame, { borderColor: accent + '66' }]}>
          <Ionicons
            name={rank === 1 ? 'flash' : 'flame'}
            size={rank === 1 ? 20 : 18}
            color={rank === 1 ? colors.primary.gold : colors.primary.teal}
          />
        </View>
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2}>
              {topic.title}
            </Text>
          </View>
          <Text style={styles.preview} numberOfLines={1}>
            {topic.preview}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.circle} numberOfLines={1}>
              {topic.circleName}
            </Text>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.urgent}>
              {formatCount(topic.replyCount)} {engagementLabel}
            </Text>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.live}>{timeAgo(topic.lastActiveAt)}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={17} color={colors.dark.textMuted} />
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touch: { borderRadius: borderRadius['2xl'] },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius['2xl'],
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  rank: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dark.bg,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  rankHot: {
    borderColor: colors.primary.gold + '55',
    backgroundColor: colors.primary.gold + '12',
  },
  rankNum: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.dark.textMuted,
  },
  rankNumHot: { color: colors.primary.gold },
  flame: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dark.bg,
  },
  body: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: colors.dark.text,
    letterSpacing: -0.2,
  },
  preview: {
    fontSize: 12,
    color: colors.dark.textSecondary,
    marginTop: 4,
    lineHeight: 16,
    opacity: 0.9,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  circle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary.teal,
    maxWidth: '42%',
  },
  dot: { fontSize: 11, color: colors.dark.textMuted, opacity: 0.7 },
  urgent: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.dark.text,
  },
  live: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.status.warning,
  },
});
