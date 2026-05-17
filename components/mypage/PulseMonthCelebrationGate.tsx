import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { colors, spacing } from '@/theme';
import { hasSeenPulseMonthCelebration, markPulseMonthCelebrationSeen } from '@/lib/pulseMonthCelebrationSeen';
import { usePulseMonthCelebration } from '@/hooks/usePulseMonthCelebration';
import { PulseScorePill } from '@/components/mypage/PulseScorePill';
import { AvatarDisplay, type PulseAvatarRingStyle } from '@/components/profile/AvatarBuilder';
import { tierMeta } from '@/utils/pulseScore';
import { profileUpdatesService } from '@/services/profileUpdates';
import { useAppStore } from '@/store/useAppStore';
import { queryClient } from '@/lib/queryClient';
import { rewardDeliveryKeys } from '@/lib/queryKeys';
import { rewardDeliveriesService } from '@/services/supabase/rewardDeliveries';
import { rewardDeliveryDebug } from '@/lib/rewardDelivery/debugLog';

function formatMonthHeading(iso: string): string {
  const d = new Date(`${iso.trim().slice(0, 10)}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return 'last month';
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function celebrationThoughtContent(
  monthLabel: string,
  overall: number,
  globalRank: number,
  totalRanked: number,
  isTop5: boolean,
  frameLabel: string | null,
): string {
  const rankLine = `I placed #${globalRank} of ${totalRanked.toLocaleString()} creators worldwide`;
  const scoreLine = `with a finalized Pulse Score of ${overall} for ${monthLabel}`;
  let body = `${rankLine} ${scoreLine}.`;
  if (isTop5) {
    body += ' Finished in the top 5 on the monthly leaderboard.';
    if (frameLabel?.trim()) body += ` Unlocked the ${frameLabel.trim()} avatar border.`;
  }
  return body;
}

function frameFromCelebration(
  isTop5: boolean,
  prizeTier: 'gold' | 'silver' | 'bronze' | null,
  ring: string | null,
  glow: string | null,
  caption: string | null,
): PulseAvatarRingStyle | null {
  if (!isTop5) return null;
  return {
    ringColor: ring?.trim() || '#EAB308',
    glowColor: glow?.trim() || 'rgba(234, 179, 8, 0.45)',
    ringCaption: caption?.trim() ? caption : null,
    prizeTier: prizeTier ?? undefined,
    borderWidth: prizeTier === 'gold' ? 4 : 3,
  };
}

/**
 * One-time modal after each month-end tally: rank, score pill, optional top-5 border celebration.
 * Top-5 frames are also enqueued into Reward Delivery (`leaderboard_reward` → toast → gift box) when possible.
 */
export function PulseMonthCelebrationGate() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const segments = useSegments();
  const { user, profile, isAuthenticated, isLoading } = useAuth();
  const betaTesterBorderBlocking = useAppStore((s) => s.betaTesterBorderBlocking);
  const teamBorderGiftBlocking = useAppStore((s) => s.teamBorderGiftBlocking);
  const rewardDeliveryBlocking = useAppStore((s) => s.rewardDeliveryBlocking);
  const setPulseMonthCelebrationBlocking = useAppStore((s) => s.setPulseMonthCelebrationBlocking);
  const inAuth = segments[0] === 'auth';
  const enabled =
    isAuthenticated && !isLoading && !inAuth && Boolean(user?.id) && !rewardDeliveryBlocking;

  const { data: celebration, isFetched } = usePulseMonthCelebration(user?.id, enabled);

  const [open, setOpen] = useState(false);
  const [giftOpened, setGiftOpened] = useState(false);
  const [posting, setPosting] = useState(false);
  /** Top-5 only: premium toast path vs legacy inline gift. */
  const [top5RevealMode, setTop5RevealMode] = useState<'idle' | 'loading' | 'delivery' | 'legacy'>('idle');
  const leaderboardEnqueueAttemptedRef = useRef(false);
  const bounce = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setOpen(false);
    setGiftOpened(false);
    setPosting(false);
    setTop5RevealMode('idle');
    leaderboardEnqueueAttemptedRef.current = false;
  }, [user?.id]);

  useEffect(() => {
    setGiftOpened(false);
  }, [celebration?.monthStart]);

  useEffect(() => {
    if (!open) {
      leaderboardEnqueueAttemptedRef.current = false;
      setTop5RevealMode('idle');
      return;
    }
    if (!celebration?.isTop5 || !user?.id || !celebration.monthStart?.trim()) {
      setTop5RevealMode('idle');
      return;
    }
    if (leaderboardEnqueueAttemptedRef.current) return;
    leaderboardEnqueueAttemptedRef.current = true;
    setTop5RevealMode('loading');

    const uid = user.id;
    const monthStart = celebration.monthStart;

    void (async () => {
      const id = await rewardDeliveriesService.enqueueClient({
        deliveryType: 'leaderboard_reward',
        itemType: 'future_item',
        idempotencyKey: `pulse_month_top5:${uid}:${monthStart}`,
        metadata: {
          kind: 'pulse_leaderboard_frame',
          prize_tier: celebration.prizeTier,
          ring_color: celebration.frameRingColor,
          glow_color: celebration.frameGlowColor,
          ring_caption: celebration.frameRingCaption,
          frame_label: celebration.frameLabel,
        },
      });

      if (id) {
        await queryClient.invalidateQueries({ queryKey: rewardDeliveryKeys.pendingList(uid) });
        await queryClient.refetchQueries({ queryKey: rewardDeliveryKeys.pendingList(uid) });
        setTop5RevealMode('delivery');
        rewardDeliveryDebug.log('PulseMonthCelebrationGate: top-5 leaderboard reward queued', {
          deliveryId: id.slice(0, 8),
        });
      } else {
        setTop5RevealMode('legacy');
        rewardDeliveryDebug.warn(
          'PulseMonthCelebrationGate: leaderboard enqueueClient returned null — inline gift fallback',
        );
      }
    })();
  }, [
    open,
    celebration?.isTop5,
    celebration?.monthStart,
    celebration?.prizeTier,
    celebration?.frameRingColor,
    celebration?.frameGlowColor,
    celebration?.frameRingCaption,
    celebration?.frameLabel,
    user?.id,
  ]);

  useEffect(() => {
    setPulseMonthCelebrationBlocking(open);
    return () => setPulseMonthCelebrationBlocking(false);
  }, [open, setPulseMonthCelebrationBlocking]);

  useEffect(() => {
    if (betaTesterBorderBlocking || teamBorderGiftBlocking || rewardDeliveryBlocking) {
      setOpen(false);
    }
  }, [betaTesterBorderBlocking, teamBorderGiftBlocking, rewardDeliveryBlocking]);

  useEffect(() => {
    if (!celebration?.monthStart || !isFetched || betaTesterBorderBlocking || teamBorderGiftBlocking || rewardDeliveryBlocking) return;
    let cancelled = false;
    (async () => {
      const seen = await hasSeenPulseMonthCelebration(celebration.monthStart);
      if (!cancelled && !seen) setOpen(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [celebration?.monthStart, isFetched, betaTesterBorderBlocking, teamBorderGiftBlocking, rewardDeliveryBlocking]);

  useEffect(() => {
    if (!open || giftOpened || !celebration?.isTop5 || top5RevealMode !== 'legacy') return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, {
          toValue: 1,
          duration: 520,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(bounce, {
          toValue: 0,
          duration: 520,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [open, giftOpened, celebration?.isTop5, top5RevealMode, bounce]);

  const closeAndMark = useCallback(async () => {
    if (celebration?.monthStart) await markPulseMonthCelebrationSeen(celebration.monthStart);
    setOpen(false);
  }, [celebration?.monthStart]);

  const onOpenGift = useCallback(() => {
    if (giftOpened) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    setGiftOpened(true);
    burst.setValue(0);
    Animated.spring(burst, {
      toValue: 1,
      friction: 6,
      tension: 120,
      useNativeDriver: true,
    }).start();
  }, [giftOpened, burst]);

  const goCustomize = useCallback(() => {
    void closeAndMark();
    router.push('/my-pulse-appearance');
  }, [closeAndMark, router]);

  const confirmThenCustomize = useCallback(() => {
    const top5 = celebration?.isTop5;
    const queuedOrPending =
      top5RevealMode === 'delivery' ||
      top5RevealMode === 'loading' ||
      top5RevealMode === 'idle';
    const msg =
      top5 && top5RevealMode === 'legacy' && !giftOpened
        ? 'Finish opening your gift above if you haven’t yet — then equip your new border under Border on Customize My Pulse.'
        : top5 && queuedOrPending
          ? 'Your leaderboard border is also delivered through the reward toast — tap the toast and open the gift box when it appears, then equip under Border on Customize My Pulse.'
          : 'You can adjust your portrait, avatar border, and how your My Pulse page looks there.';
    Alert.alert('Open Customize My Pulse?', msg, [
      { text: 'Not now', style: 'cancel' },
      { text: 'Open Customize My Pulse', onPress: () => goCustomize() },
    ]);
  }, [goCustomize, celebration?.isTop5, top5RevealMode, giftOpened]);

  const postToMyPulse = useCallback(async () => {
    const uid = user?.id;
    const c = celebration;
    if (!uid || !c || posting) return;
    setPosting(true);
    const monthHeading = formatMonthHeading(c.monthStart);
    try {
      const content = celebrationThoughtContent(
        monthHeading,
        c.overall,
        c.globalRank,
        c.totalRanked,
        c.isTop5,
        c.frameLabel,
      );
      await profileUpdatesService.add(uid, {
        type: 'thought',
        content,
        previewText: `${monthHeading} · #${c.globalRank} on Pulse`,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      await closeAndMark();
      router.push('/(tabs)/my-pulse');
    } catch (e) {
      console.warn('[PulseMonthCelebrationGate] postToMyPulse', e);
      Alert.alert('Could not post', 'Something went wrong. Try again in a moment.');
    } finally {
      setPosting(false);
    }
  }, [user?.id, posting, celebration, closeAndMark, router]);

  if (!enabled || !celebration || !open) return null;

  const monthLabel = formatMonthHeading(celebration.monthStart);
  const tier = tierMeta(celebration.tier);
  const pulseFrame = frameFromCelebration(
    celebration.isTop5,
    celebration.prizeTier,
    celebration.frameRingColor,
    celebration.frameGlowColor,
    celebration.frameRingCaption,
  );

  /** Avoid one-frame legacy flash before enqueue effect runs. */
  const top5UiMode =
    !celebration.isTop5
      ? null
      : top5RevealMode === 'delivery'
        ? ('delivery' as const)
        : top5RevealMode === 'legacy'
          ? ('legacy' as const)
          : ('loading' as const);

  const hidePrimaryForLegacyGift = celebration.isTop5 && top5UiMode === 'legacy' && !giftOpened;

  const giftTranslate = bounce.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -12],
  });

  const avatarScale = burst.interpolate({
    inputRange: [0, 1],
    outputRange: [0.15, 1],
  });

  return (
    <Modal
      visible
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={confirmThenCustomize}
    >
      <View style={[styles.backdrop, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.md }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.title}>Congratulations</Text>
            <Text style={styles.subtitle}>
              Your final Pulse Score for {monthLabel} is ready. Below you can see how you ranked among all creators on
              PulseVerse.
            </Text>

            <PulseScorePill
              value={String(celebration.overall)}
              tierLabel={tier.label}
              tierAccent={tier.accent}
              tierGlow={tier.glow}
              onPress={() => undefined}
              accessibilityLabel={`Pulse Score ${celebration.overall}, ${tier.label}`}
              style={styles.pill}
            />

            <Text style={styles.rankLine}>
              You placed <Text style={styles.rankEm}>#{celebration.globalRank}</Text> of{' '}
              <Text style={styles.rankEm}>{celebration.totalRanked.toLocaleString()}</Text> creators worldwide.
            </Text>

            {celebration.isTop5 ? (
              <>
                <Text style={styles.top5Line}>
                  You finished in the top 5 and unlocked an exclusive avatar border
                  {celebration.frameLabel ? ` — ${celebration.frameLabel}` : ''}.
                </Text>

                {top5UiMode === 'loading' ? (
                  <View style={styles.top5Loading}>
                    <ActivityIndicator color={colors.primary.gold} />
                    <Text style={styles.top5LoadingText}>Preparing your reward reveal…</Text>
                  </View>
                ) : top5UiMode === 'delivery' ? (
                  <View style={styles.toastCallout}>
                    <Ionicons name="notifications-outline" size={22} color={colors.primary.teal} />
                    <Text style={styles.toastCalloutText}>
                      Your border is ready in the{' '}
                      <Text style={styles.toastCalloutEm}>PulseVerse reward</Text> flow. Watch for the{' '}
                      <Text style={styles.toastCalloutEm}>reward toast</Text>, tap it, then open your premium gift box.
                      Closing this summary won’t cancel the toast.
                    </Text>
                  </View>
                ) : (
                  <>
                    {!giftOpened ? (
                      <Pressable
                        onPress={onOpenGift}
                        style={styles.giftHit}
                        accessibilityRole="button"
                        accessibilityLabel="Open reward, reveal new border"
                      >
                        <Animated.View style={{ transform: [{ translateY: giftTranslate }] }}>
                          <Ionicons name="gift" size={64} color={colors.primary.gold} />
                        </Animated.View>
                        <Text style={styles.giftHint}>Tap the gift</Text>
                      </Pressable>
                    ) : (
                      <>
                        <Animated.View
                          style={[styles.avatarBurst, { transform: [{ scale: avatarScale }] }]}
                          accessibilityLabel="New avatar border preview"
                        >
                          <AvatarDisplay
                            size={96}
                            avatarUrl={profile?.avatarUrl ?? undefined}
                            prioritizeRemoteAvatar
                            pulseFrame={pulseFrame ?? undefined}
                          />
                        </Animated.View>
                        <Text style={styles.howto}>
                          Find your border on <Text style={styles.howtoEm}>My Pulse</Text>: open{' '}
                          <Text style={styles.howtoEm}>Customize My Pulse</Text>, then choose{' '}
                          <Text style={styles.howtoEm}>Border</Text> to equip it.
                        </Text>
                      </>
                    )}
                  </>
                )}
              </>
            ) : null}

            <Pressable
              onPress={() => void postToMyPulse()}
              style={[styles.secondaryBtn, posting && styles.secondaryBtnDisabled]}
              disabled={posting}
              accessibilityRole="button"
              accessibilityState={{ disabled: posting }}
              accessibilityLabel="Post your ranking to My Pulse"
            >
              {posting ? (
                <ActivityIndicator color={colors.primary.teal} />
              ) : (
                <Text style={styles.secondaryBtnText}>Post to My Pulse</Text>
              )}
            </Pressable>
            <Text style={styles.postHint}>Share your placement on your My Pulse page.</Text>

            {!(celebration.isTop5 && hidePrimaryForLegacyGift) ? (
              <Pressable
                onPress={confirmThenCustomize}
                style={styles.primaryBtn}
                accessibilityRole="button"
                accessibilityLabel="Confirm and open Customize My Pulse"
              >
                <Text style={styles.primaryBtnText}>Go to Customize My Pulse</Text>
              </Pressable>
            ) : null}
            {celebration.isTop5 && hidePrimaryForLegacyGift ? (
              <Text style={styles.continueHint}>Tap the gift above to open your prize, then continue.</Text>
            ) : null}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 11, 20, 0.88)',
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    backgroundColor: colors.dark.card,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(148,163,184,0.25)',
    padding: spacing.lg + 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.dark.textMuted,
    marginBottom: spacing.lg,
  },
  pill: {
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  rankLine: {
    fontSize: 16,
    lineHeight: 24,
    color: '#E2E8F0',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  rankEm: {
    fontWeight: '900',
    color: colors.primary.teal,
  },
  top5Line: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.dark.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  top5Loading: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  top5LoadingText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.dark.textSecondary,
    textAlign: 'center',
  },
  toastCallout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: 16,
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.28)',
  },
  toastCalloutText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
    color: colors.dark.textSecondary,
  },
  toastCalloutEm: {
    fontWeight: '800',
    color: '#F8FAFC',
  },
  giftHit: {
    alignSelf: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    padding: spacing.md,
  },
  giftHint: {
    marginTop: spacing.sm,
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary.gold,
  },
  avatarBurst: {
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  howto: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.dark.textMuted,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  howtoEm: {
    fontWeight: '800',
    color: '#F8FAFC',
  },
  secondaryBtn: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.45)',
    backgroundColor: 'rgba(20, 184, 166, 0.12)',
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary.teal,
  },
  secondaryBtnDisabled: {
    opacity: 0.65,
  },
  postHint: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.dark.textMuted,
    textAlign: 'center',
    marginTop: -spacing.xs,
    marginBottom: spacing.md,
  },
  continueHint: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.dark.textMuted,
    textAlign: 'center',
    fontWeight: '600',
  },
  primaryBtn: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: spacing.md + 2,
    borderRadius: 14,
    backgroundColor: colors.primary.teal,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#06201C',
  },
});
