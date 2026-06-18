import React, { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  buildPulseSnapshot,
  PULSE_SNAPSHOT_ACTION_LABELS,
  PULSE_SNAPSHOT_EMPTY_ACTIONS,
  type PulseSnapshotActionKey,
  type PulseSnapshotHero,
} from '@/lib/pulseSnapshot';
import { pushPostViewer } from '@/lib/postViewerRoute';
import { postsService } from '@/services/supabase';
import { PVSectionHeader } from '@/components/pv/PVSectionHeader';
import { usePulseWeeklyRecap } from '@/hooks/useQueries';
import type { ProfileUpdate, UserProfile } from '@/types';
import { borderRadius, colors, pulseverse, rhythm, typography } from '@/theme';

type Props = {
  user: UserProfile;
  profileUpdates?: ProfileUpdate[];
  isOwner: boolean;
  onScrollToTodaysPulse?: () => void;
  onScrollToPulseBoard?: () => void;
  onScrollToMediaHub?: () => void;
  onFeatureMomentHint?: () => void;
};

async function openHeroTarget(
  router: ReturnType<typeof useRouter>,
  hero: PulseSnapshotHero,
) {
  if (hero.kind === 'profile_update') {
    router.push(`/my-pulse/${hero.id}` as never);
    return;
  }
  try {
    const post = await postsService.getById(hero.id);
    if (post) {
      pushPostViewer(router, post);
      return;
    }
  } catch {
    /* fall through */
  }
  router.push(`/post/${hero.id}` as never);
}

function SnapshotActionRow({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.actionRow, pressed && styles.actionRowPressed]}
      accessibilityRole="button"
    >
      <View style={styles.actionIconWrap}>
        <Ionicons name={icon} size={15} color={pulseverse.electricSoft} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.dark.textMuted} />
    </Pressable>
  );
}

function actionIcon(key: PulseSnapshotActionKey): keyof typeof Ionicons.glyphMap {
  const map: Record<PulseSnapshotActionKey, keyof typeof Ionicons.glyphMap> = {
    review_shoutouts: 'megaphone-outline',
    update_todays_pulse: 'pulse',
    feature_moment: 'pin-outline',
    feature_hero: 'sparkles',
    create_update: 'create-outline',
    browse_media: 'images-outline',
  };
  return map[key];
}

export function PulseWeeklyRecapCard({
  user,
  profileUpdates,
  isOwner,
  onScrollToTodaysPulse,
  onScrollToPulseBoard,
  onScrollToMediaHub,
  onFeatureMomentHint,
}: Props) {
  const router = useRouter();
  const { data: recap, isLoading, isError } = usePulseWeeklyRecap(user.id, isOwner);

  const snapshot = useMemo(() => {
    if (!recap) return null;
    return buildPulseSnapshot(recap, user, profileUpdates);
  }, [recap, user, profileUpdates]);

  const runAction = useCallback(
    (key: PulseSnapshotActionKey) => {
      switch (key) {
        case 'review_shoutouts':
          onScrollToPulseBoard?.();
          break;
        case 'update_todays_pulse':
          onScrollToTodaysPulse?.();
          break;
        case 'feature_moment':
        case 'feature_hero':
          onFeatureMomentHint?.();
          break;
        case 'create_update':
          router.push('/create/my-pulse/thought' as never);
          break;
        case 'browse_media':
          onScrollToMediaHub?.();
          break;
        default:
          break;
      }
    },
    [
      onFeatureMomentHint,
      onScrollToMediaHub,
      onScrollToPulseBoard,
      onScrollToTodaysPulse,
      router,
    ],
  );

  const openHero = useCallback(() => {
    if (!snapshot?.hero) return;
    void openHeroTarget(router, snapshot.hero);
  }, [router, snapshot?.hero]);

  if (!isOwner) return null;

  return (
    <View style={styles.root}>
      <PVSectionHeader
        title="Pulse Snapshot"
        subtitle="Private insights to help keep your page active."
      />

      {isLoading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={pulseverse.electric} />
        </View>
      ) : isError ? (
        <View style={styles.emptyBlock}>
          <Text style={styles.emptyTitle}>
            Pulse Snapshot is temporarily unavailable.
          </Text>
          <Text style={styles.emptySub}>
            Try updating Today&apos;s Pulse, adding a Featured Moment, or posting something new.
          </Text>
          <View style={styles.emptyActions}>
            {PULSE_SNAPSHOT_EMPTY_ACTIONS.map((key) => (
              <Pressable
                key={key}
                onPress={() => runAction(key)}
                style={({ pressed }) => [styles.emptyPill, pressed && styles.pillPressed]}
              >
                <Text style={styles.emptyPillText}>{PULSE_SNAPSHOT_ACTION_LABELS[key]}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : !recap || !snapshot ? (
        <View style={styles.emptyBlock}>
          <Text style={styles.emptyTitle}>
            Your Pulse Snapshot will appear as people interact with your page.
          </Text>
          <Text style={styles.emptySub}>
            Try updating Today&apos;s Pulse, adding a Featured Moment, or posting something new.
          </Text>
        </View>
      ) : snapshot.isEmpty ? (
        <View style={styles.emptyBlock}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="analytics-outline" size={20} color={pulseverse.electricSoft} />
          </View>
          <Text style={styles.emptyTitle}>
            {snapshot.emptyStateActions.length === 0
              ? "You're all caught up this week."
              : 'Your Pulse Snapshot will appear as people interact with your page.'}
          </Text>
          <Text style={styles.emptySub}>
            {snapshot.emptyStateActions.length === 0
              ? 'Your page setup looks good. New activity and insights will show up here as people engage.'
              : 'Finish the items below to keep your page sharp.'}
          </Text>
          {snapshot.emptyStateActions.length > 0 ? (
            <View style={styles.emptyActions}>
              {snapshot.emptyStateActions.map((key) => (
                <Pressable
                  key={key}
                  onPress={() => runAction(key)}
                  style={({ pressed }) => [styles.emptyPill, pressed && styles.pillPressed]}
                >
                  <Text style={styles.emptyPillText}>{PULSE_SNAPSHOT_ACTION_LABELS[key]}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      ) : (
        <>
          {snapshot.hero ? (
            <Pressable
              onPress={() => void openHero()}
              style={({ pressed }) => [styles.heroCard, pressed && styles.heroPressed]}
              accessibilityRole="button"
              accessibilityLabel={`Top moment. ${snapshot.hero.reason} View.`}
            >
              <LinearGradient
                colors={['rgba(34,211,238,0.14)', 'rgba(8,14,28,0.72)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroGradient}
              >
                {snapshot.hero.thumbnailUrl ? (
                  <Image
                    source={{ uri: snapshot.hero.thumbnailUrl }}
                    style={styles.heroThumb}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.heroThumbFallback}>
                    <Ionicons name="sparkles" size={18} color={pulseverse.electric} />
                  </View>
                )}
                <View style={styles.heroCopy}>
                  <Text style={styles.heroKicker}>Top moment this week</Text>
                  <Text style={styles.heroReason}>{snapshot.hero.reason}</Text>
                  <Text style={styles.heroLabel} numberOfLines={1}>
                    {snapshot.hero.label}
                  </Text>
                  <Text style={styles.heroMetric}>{snapshot.hero.metricLabel}</Text>
                </View>
                <View style={styles.viewPill}>
                  <Text style={styles.viewPillText}>View</Text>
                  <Ionicons name="arrow-forward" size={14} color="#021627" />
                </View>
              </LinearGradient>
            </Pressable>
          ) : null}

          {snapshot.activity.length > 0 ? (
            <View style={styles.activityRow}>
              {snapshot.activity.map((metric) => (
                <View key={metric.key} style={styles.activityChip}>
                  <Text style={styles.activityValue}>{metric.value}</Text>
                  <Text style={styles.activityLabel}>{metric.label}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {snapshot.attention.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Needs attention</Text>
              {snapshot.attention.map((item) => {
                const onPress =
                  item.key === 'review_shoutouts'
                    ? () => runAction('review_shoutouts')
                    : item.key === 'update_todays_pulse'
                      ? () => runAction('update_todays_pulse')
                      : item.key === 'feature_moment'
                        ? () => runAction('feature_moment')
                        : item.key === 'new_media'
                          ? () => runAction('browse_media')
                          : undefined;

                if (!onPress) {
                  return (
                    <View key={item.key} style={styles.attentionRow}>
                      <Ionicons
                        name="alert-circle-outline"
                        size={15}
                        color={pulseverse.hubTilePurple}
                        style={styles.attentionIcon}
                      />
                      <Text style={styles.attentionText}>{item.message}</Text>
                    </View>
                  );
                }

                return (
                  <Pressable
                    key={item.key}
                    onPress={onPress}
                    style={({ pressed }) => [
                      styles.attentionRow,
                      pressed ? styles.actionRowPressed : null,
                    ]}
                  >
                    <Ionicons
                      name="alert-circle-outline"
                      size={15}
                      color={pulseverse.hubTilePurple}
                      style={styles.attentionIcon}
                    />
                    <Text style={styles.attentionText}>{item.message}</Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.dark.textMuted} />
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {snapshot.suggestedActions.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Suggested next move</Text>
              {snapshot.suggestedActions.map((key) => (
                <SnapshotActionRow
                  key={key}
                  label={PULSE_SNAPSHOT_ACTION_LABELS[key]}
                  icon={actionIcon(key)}
                  onPress={() => runAction(key)}
                />
              ))}
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

export function pulseWeeklyRecapFeatureHint() {
  Alert.alert(
    'Featured Moment',
    'Open the ⋮ menu on any My Pulse update and choose “Feature on your Pulse” to highlight one post at the top.',
    [{ text: 'Got it', style: 'default' }],
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', gap: rhythm.myPulseSectionGap },
  loadingRow: { paddingVertical: rhythm.cardPaddingLarge, alignItems: 'center' },
  emptyBlock: {
    alignItems: 'center',
    gap: rhythm.cardPaddingSmall,
    paddingVertical: rhythm.cardPaddingSmall,
  },
  emptyIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(34,211,238,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.22)',
  },
  emptyTitle: {
    ...typography.bodySmall,
    color: colors.dark.text,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 300,
  },
  emptySub: {
    ...typography.caption,
    color: colors.dark.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 290,
  },
  emptyActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: rhythm.cardPaddingSmall,
    marginTop: rhythm.cardPaddingSmall,
  },
  emptyPill: {
    paddingHorizontal: rhythm.myPulsePanelPadding,
    paddingVertical: rhythm.cardPaddingSmall,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.35)',
    backgroundColor: 'rgba(8,14,28,0.55)',
  },
  emptyPillText: {
    ...typography.label,
    fontSize: 12,
    color: pulseverse.electricSoft,
    fontWeight: '600',
  },
  pillPressed: { opacity: 0.86 },
  heroCard: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.22)',
  },
  heroPressed: { opacity: 0.92 },
  heroGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rhythm.cardPaddingSmall,
    padding: rhythm.cardPaddingSmall,
  },
  heroThumb: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    backgroundColor: colors.dark.surface,
  },
  heroThumbFallback: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(34,211,238,0.12)',
  },
  heroCopy: { flex: 1, minWidth: 0, gap: 2 },
  heroKicker: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: pulseverse.electricSoft,
  },
  heroReason: {
    ...typography.caption,
    color: colors.dark.textSecondary,
    lineHeight: 16,
  },
  heroLabel: {
    ...typography.label,
    color: colors.dark.text,
    fontWeight: '600',
  },
  heroMetric: {
    ...typography.caption,
    color: pulseverse.hubTilePurple,
    fontWeight: '700',
    marginTop: 2,
  },
  viewPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rhythm.myPulseItemStackGap,
    paddingHorizontal: rhythm.cardPaddingSmall + 2,
    paddingVertical: rhythm.myPulseItemStackGap + 2,
    borderRadius: borderRadius.pill,
    backgroundColor: pulseverse.electric,
  },
  viewPillText: {
    ...typography.caption,
    fontWeight: '800',
    color: '#021627',
  },
  activityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rhythm.cardPaddingSmall,
  },
  activityChip: {
    minWidth: 72,
    paddingVertical: rhythm.cardPaddingSmall,
    paddingHorizontal: rhythm.cardPaddingSmall,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(8,14,28,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(120,180,255,0.12)',
    alignItems: 'center',
  },
  activityValue: {
    ...typography.label,
    fontSize: 18,
    fontWeight: '800',
    color: colors.dark.text,
  },
  activityLabel: {
    ...typography.caption,
    color: colors.dark.textMuted,
    marginTop: 2,
  },
  section: { gap: rhythm.myPulseItemStackGap },
  sectionTitle: {
    ...typography.caption,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.dark.textMuted,
    marginBottom: rhythm.myPulseItemStackGap / 2,
  },
  attentionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rhythm.cardPaddingSmall,
    paddingVertical: rhythm.cardPaddingSmall,
    paddingHorizontal: rhythm.cardPaddingSmall,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(8,14,28,0.35)',
  },
  attentionIcon: { marginTop: 1 },
  attentionText: {
    ...typography.bodySmall,
    flex: 1,
    color: colors.dark.textSecondary,
    lineHeight: 19,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rhythm.cardPaddingSmall,
    paddingVertical: rhythm.cardPaddingSmall,
    paddingHorizontal: rhythm.cardPaddingSmall,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(8,14,28,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.12)',
  },
  actionRowPressed: { opacity: 0.88 },
  actionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(34,211,238,0.1)',
  },
  actionLabel: {
    ...typography.bodySmall,
    flex: 1,
    color: colors.dark.text,
    fontWeight: '600',
  },
});
