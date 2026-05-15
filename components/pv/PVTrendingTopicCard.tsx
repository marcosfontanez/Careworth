import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { spacing, pulseverse, pvKit, pvGlassDepthShadow, pvCardRimBloom, pvRankGoldBloom } from '@/theme';

const GL = pvKit.circles.glassList;
const TK = pvKit.cards.trending;
const META = pvKit.cards.meta;

export type PVTrendingTopicCardProps = {
  topic: string;
  topicMode?: 'hashtag' | 'plain';
  statLabel?: string;
  categoryLabel?: string;
  timeLabel?: string;
  preview?: string;
  rank?: 1 | 2 | 3;
  accentColor?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

function formatTopic(topic: string, mode: 'hashtag' | 'plain') {
  if (mode === 'plain') return topic;
  return topic.startsWith('#') ? topic : `#${topic}`;
}

/** Trending row — volumetric glass, gold #1 halo, strong headline / meta contrast. */
export function PVTrendingTopicCard({
  topic,
  topicMode = 'hashtag',
  statLabel,
  categoryLabel,
  timeLabel,
  preview,
  rank,
  accentColor = pulseverse.electric,
  onPress,
  style,
  testID,
}: PVTrendingTopicCardProps) {
  const headline = formatTopic(topic, topicMode);
  const gold = colors.primary.gold;
  const rankIsGold = rank === 1;

  const iconBg =
    rank === 1
      ? (['rgba(250,204,21,0.28)', 'rgba(250,204,21,0.08)'] as const)
      : rank === 2
        ? ([`${accentColor}22`, `${accentColor}08`] as const)
        : (['rgba(12,18,32,0.92)', 'rgba(6,10,20,0.88)'] as const);
  const iconBorder = rankIsGold ? `${gold}90` : rank === 2 ? `${accentColor}58` : 'rgba(148,163,184,0.3)';

  const iconLift =
    rankIsGold && Platform.OS === 'ios'
      ? pvRankGoldBloom()
      : Platform.OS === 'ios'
        ? {
            shadowColor: pulseverse.electric,
            shadowOpacity: 0.22,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 0 },
          }
        : {};

  const body = (
    <View style={[styles.outer, pvGlassDepthShadow(), pvCardRimBloom(), style]} testID={testID}>
      <LinearGradient
        colors={[GL.fillTop, GL.fillMid, GL.fillBottom]}
        locations={[0, 0.5, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.fill}
      >
        <LinearGradient
          colors={[...pvKit.cards.topSheen]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.topSheen}
          pointerEvents="none"
        />
        <LinearGradient
          colors={['rgba(34,211,238,0.08)', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.leadingSheen}
          pointerEvents="none"
        />
        <LinearGradient
          colors={[...pvKit.cards.bottomVignette]}
          start={{ x: 0.5, y: 0.35 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.floorVig}
          pointerEvents="none"
        />

        <View style={styles.pad}>
          <View style={styles.row}>
            {rank != null ? (
              <View style={[styles.rank, rankIsGold && styles.rankGold, rankIsGold && pvRankGoldBloom()]}>
                <Text style={[styles.rankNum, rankIsGold && styles.rankNumGold]}>{rank}</Text>
              </View>
            ) : null}

            <LinearGradient
              colors={[...iconBg]}
              style={[styles.iconTile, { borderColor: iconBorder }, iconLift]}
            >
              {rank === 1 ? (
                <Ionicons name="flash" size={24} color={gold} />
              ) : rank === 2 || rank === 3 ? (
                <Ionicons name="flame" size={21} color={pulseverse.electricSoft} />
              ) : (
                <Ionicons name="trending-up" size={22} color={pulseverse.electricSoft} />
              )}
            </LinearGradient>

            <View style={styles.body}>
              <Text style={styles.title} numberOfLines={2}>
                {headline}
              </Text>
              {preview ? (
                <Text style={styles.preview} numberOfLines={1}>
                  {preview}
                </Text>
              ) : null}
              {(categoryLabel || statLabel || timeLabel) && (
                <View style={styles.metaRow}>
                  {categoryLabel ? (
                    <Text style={styles.category} numberOfLines={1}>
                      {categoryLabel}
                    </Text>
                  ) : null}
                  {categoryLabel && (statLabel || timeLabel) ? (
                    <Text style={styles.dot}>·</Text>
                  ) : null}
                  {statLabel ? (
                    <Text style={styles.engagement} numberOfLines={1}>
                      {statLabel}
                    </Text>
                  ) : null}
                  {statLabel && timeLabel ? <Text style={styles.dot}>·</Text> : null}
                  {timeLabel ? (
                    <Text style={styles.time} numberOfLines={1}>
                      {timeLabel}
                    </Text>
                  ) : null}
                </View>
              )}
            </View>

            <Ionicons name="chevron-forward" size={20} color={pulseverse.electricMuted} />
          </View>
        </View>

        <View style={styles.hairline} pointerEvents="none" />
      </LinearGradient>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [pressed && styles.pressed]}>
        {body}
      </Pressable>
    );
  }

  return body;
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: TK.radius,
    borderWidth: 1,
    borderColor: GL.border,
    overflow: 'hidden',
    backgroundColor: colors.dark.card,
  },
  fill: { borderRadius: TK.radius, position: 'relative' },
  topSheen: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '56%',
    borderTopLeftRadius: TK.radius,
    borderTopRightRadius: TK.radius,
  },
  leadingSheen: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 28,
    borderTopLeftRadius: TK.radius,
    borderBottomLeftRadius: TK.radius,
  },
  floorVig: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '58%',
    borderBottomLeftRadius: TK.radius,
    borderBottomRightRadius: TK.radius,
  },
  hairline: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: TK.radius,
    borderWidth: 1,
    borderColor: pvKit.cards.innerHairline,
    margin: 1,
    opacity: 0.95,
  },
  pad: { paddingVertical: spacing.lg, paddingHorizontal: spacing.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  rank: {
    width: TK.rankSize,
    height: TK.rankSize,
    borderRadius: TK.rankSize / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(4,8,16,0.96)',
    borderWidth: 1.5,
    borderColor: 'rgba(148,163,184,0.32)',
  },
  rankGold: {
    borderColor: `${colors.primary.gold}AA`,
    backgroundColor: 'rgba(212,166,58,0.2)',
  },
  rankNum: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.dark.textMuted,
  },
  rankNumGold: { color: colors.primary.gold },
  iconTile: {
    width: TK.iconTile,
    height: TK.iconTile,
    borderRadius: TK.iconTileRadius,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  body: { flex: 1, minWidth: 0 },
  title: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.dark.text,
    letterSpacing: -0.35,
    lineHeight: 22,
  },
  preview: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: colors.dark.textSecondary,
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.md,
  },
  category: {
    fontSize: 12,
    fontWeight: '800',
    color: META.category,
    maxWidth: '48%',
  },
  dot: { fontSize: 12, color: colors.dark.textMuted, opacity: 0.65 },
  engagement: {
    fontSize: 12,
    fontWeight: '700',
    color: META.engagement,
  },
  time: {
    fontSize: 12,
    fontWeight: '800',
    color: META.time,
  },
  pressed: { opacity: 0.94 },
});
