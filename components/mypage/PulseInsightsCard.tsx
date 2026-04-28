import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, borderRadius, spacing, typography, shadows } from '@/theme';
import { formatCount } from '@/utils/format';
import type { ProfileUpdate } from '@/types';

/**
 * PulseInsightsCard
 * -----------------
 * Replaces the flat Followers/Following/Likes/Shares row on My Pulse with a
 * single premium "insights" surface that tells a fuller story:
 *
 *   • Streak row — consecutive days of activity (hero metric, gold accent)
 *   • Weekly Pulse — 7-day mini-activity chart driven by recent profile updates
 *   • Core metrics — followers / following / likes / shares (compact grid)
 *
 * The card degrades gracefully: if streak data is missing it shows an
 * encouraging "Start your streak" line for owners, or quietly hides the
 * streak row for visitors. Metrics stay unconditionally visible.
 */

export type PulseInsightsCardProps = {
  /** Whether the viewer is the profile owner (affects copy + nav affordances). */
  isOwner: boolean;
  /** Current consecutive-day activity streak. Undefined while loading. */
  currentStreak?: number;
  /** All-time best streak, shown subtly when > currentStreak. */
  bestStreak?: number;
  /** Pre-computed engagement rollups (likes/shares across user's visible posts). */
  likes: number;
  shares: number;
  followers: number;
  following: number;
  /** The user's 5 most-recent My Pulse updates (used to draw the weekly chart). */
  updates: ProfileUpdate[];
  /** Tap handlers for counts — keep existing follower/following routes. */
  onPressFollowers?: () => void;
  onPressFollowing?: () => void;
  /** Owner-only affordance: jump to a richer insights screen (stub for now). */
  onPressSeeDetails?: () => void;
};

export function PulseInsightsCard({
  isOwner,
  currentStreak,
  bestStreak,
  likes,
  shares,
  followers,
  following,
  updates,
  onPressFollowers,
  onPressFollowing,
  onPressSeeDetails,
}: PulseInsightsCardProps) {
  const streakCount = currentStreak ?? 0;
  const showStreak = streakCount > 0 || isOwner;
  const showBest = typeof bestStreak === 'number' && bestStreak > streakCount;

  /** Bucket the user's 5 most-recent updates by day for the last 7 days. */
  const weeklyBars = useMemo(() => {
    const buckets = new Array<number>(7).fill(0);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    for (const u of updates) {
      const t = new Date(u.createdAt).getTime();
      // Index 0 = 6 days ago, index 6 = today.
      const dayIdx = 6 - Math.floor((todayStart - t) / (24 * 60 * 60 * 1000));
      if (dayIdx >= 0 && dayIdx <= 6) buckets[dayIdx] += 1;
    }
    return buckets;
  }, [updates]);

  const weeklyTotal = weeklyBars.reduce((sum, n) => sum + n, 0);
  const weeklyPeak = Math.max(1, ...weeklyBars);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[colors.primary.teal + '22', 'rgba(6,14,26,0.6)', 'rgba(15,28,48,0.95)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBorder}
      >
        <View style={[styles.surface, shadows.card]}>
          {showStreak ? (
            <Pressable
              onPress={isOwner ? onPressSeeDetails : undefined}
              style={styles.streakRow}
              android_ripple={{ color: 'rgba(255,255,255,0.04)' }}
            >
              <View style={styles.streakLeft}>
                <LinearGradient
                  colors={['#F59E0B', '#D4A63A']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.streakBadge}
                >
                  <Ionicons name="flame" size={16} color="#FFF" />
                </LinearGradient>
                <View style={styles.streakStack}>
                  {streakCount > 0 ? (
                    <>
                      <Text style={styles.streakNum}>
                        {streakCount}
                        <Text style={styles.streakUnit}>
                          {streakCount === 1 ? ' day' : ' days'}
                        </Text>
                      </Text>
                      <Text style={styles.streakLabel}>
                        Active streak
                        {showBest ? (
                          <Text style={styles.streakBest}>{`  ·  Best ${bestStreak}`}</Text>
                        ) : null}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.streakNumMuted}>Start your streak</Text>
                      <Text style={styles.streakLabel}>
                        Post, comment, or add to My Pulse today.
                      </Text>
                    </>
                  )}
                </View>
              </View>
              {isOwner && onPressSeeDetails ? (
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.dark.textMuted}
                />
              ) : null}
            </Pressable>
          ) : null}

          <View style={styles.weeklyBlock}>
            <View style={styles.weeklyHead}>
              <Text style={styles.weeklyKicker}>Weekly pulse</Text>
              <Text style={styles.weeklyCount}>
                {weeklyTotal} update{weeklyTotal === 1 ? '' : 's'}
              </Text>
            </View>
            <View style={styles.weeklyChart}>
              {weeklyBars.map((n, i) => {
                const isToday = i === 6;
                const height = 6 + (n / weeklyPeak) * 22;
                return (
                  <View key={i} style={styles.weeklyCol}>
                    <View
                      style={[
                        styles.weeklyBar,
                        { height },
                        n === 0 && styles.weeklyBarEmpty,
                        isToday && styles.weeklyBarToday,
                      ]}
                    />
                  </View>
                );
              })}
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.metrics}>
            <TouchableOpacity
              style={styles.metric}
              onPress={onPressFollowers}
              disabled={!onPressFollowers}
              activeOpacity={0.8}
            >
              <Text style={styles.metricVal}>{formatCount(followers)}</Text>
              <Text style={styles.metricLbl}>Followers</Text>
            </TouchableOpacity>
            <View style={styles.metricDivider} />
            <TouchableOpacity
              style={styles.metric}
              onPress={onPressFollowing}
              disabled={!onPressFollowing}
              activeOpacity={0.8}
            >
              <Text style={styles.metricVal}>{formatCount(following)}</Text>
              <Text style={styles.metricLbl}>Following</Text>
            </TouchableOpacity>
            <View style={styles.metricDivider} />
            <View style={styles.metric}>
              <Text style={styles.metricVal}>{formatCount(likes)}</Text>
              <Text style={styles.metricLbl}>Likes</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metric}>
              <Text style={styles.metricVal}>{formatCount(shares)}</Text>
              <Text style={styles.metricLbl}>Shares</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { marginTop: spacing.md, marginBottom: spacing.sm + 2 },
  gradientBorder: {
    borderRadius: borderRadius['2xl'],
    padding: 1,
  },
  surface: {
    borderRadius: borderRadius['2xl'] - 1,
    backgroundColor: colors.dark.elevated,
    paddingHorizontal: spacing.md + 2,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm + 2,
  },

  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  streakLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  streakBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    // Warm gold glow
    ...(StyleSheet.flatten(shadows.subtle) as object),
  },
  streakStack: { flex: 1, minWidth: 0 },
  streakNum: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.dark.text,
    letterSpacing: -0.4,
  },
  streakNumMuted: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.dark.text,
    letterSpacing: -0.2,
  },
  streakUnit: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.dark.textSecondary,
    letterSpacing: -0.2,
  },
  streakLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.dark.textMuted,
    letterSpacing: 0.35,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  streakBest: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.dark.textQuiet,
    letterSpacing: 0.3,
    textTransform: 'none',
  },

  weeklyBlock: { marginTop: spacing.md },
  weeklyHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weeklyKicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.25,
    textTransform: 'uppercase',
    color: colors.dark.textSecondary,
  },
  weeklyCount: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.dark.textMuted,
    letterSpacing: 0.3,
  },
  weeklyChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 5,
    height: 34,
    marginTop: 10,
  },
  weeklyCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  weeklyBar: {
    width: '85%',
    backgroundColor: colors.primary.teal,
    borderRadius: 3,
    opacity: 0.8,
  },
  weeklyBarEmpty: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    opacity: 1,
  },
  weeklyBarToday: {
    opacity: 1,
    backgroundColor: colors.primary.gold,
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },

  metrics: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metric: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  metricDivider: {
    width: StyleSheet.hairlineWidth,
    height: 22,
    backgroundColor: 'rgba(255,255,255,0.09)',
    alignSelf: 'center',
  },
  metricVal: {
    ...typography.stat,
    fontSize: 15,
    color: colors.dark.text,
    fontWeight: '800',
  },
  metricLbl: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.dark.textMuted,
    letterSpacing: 0.4,
    marginTop: 2,
    textTransform: 'uppercase',
  },
});
