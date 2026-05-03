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
 * One-time modal after each month-end tally: rank, score pill, optional top-5 gift + border reveal.
 */
export function PulseMonthCelebrationGate() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const segments = useSegments();
  const { user, profile, isAuthenticated, isLoading } = useAuth();
  const betaTesterBorderBlocking = useAppStore((s) => s.betaTesterBorderBlocking);
  const inAuth = segments[0] === 'auth' || segments[0] === 'onboarding';
  const enabled = isAuthenticated && !isLoading && !inAuth && Boolean(user?.id);

  const { data: celebration, isFetched } = usePulseMonthCelebration(user?.id, enabled);

  const [open, setOpen] = useState(false);
  const [giftOpened, setGiftOpened] = useState(false);
  const [posting, setPosting] = useState(false);
  const bounce = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setOpen(false);
    setGiftOpened(false);
    setPosting(false);
  }, [user?.id]);

  useEffect(() => {
    setGiftOpened(false);
  }, [celebration?.monthStart]);

  useEffect(() => {
    if (betaTesterBorderBlocking) {
      setOpen(false);
    }
  }, [betaTesterBorderBlocking]);

  useEffect(() => {
    if (!celebration?.monthStart || !isFetched || betaTesterBorderBlocking) return;
    let cancelled = false;
    (async () => {
      const seen = await hasSeenPulseMonthCelebration(celebration.monthStart);
      if (!cancelled && !seen) setOpen(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [celebration?.monthStart, isFetched, betaTesterBorderBlocking]);

  useEffect(() => {
    if (!open || giftOpened || !celebration?.isTop5) return;
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
  }, [open, giftOpened, celebration?.isTop5, bounce]);

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

  const giftTranslate = bounce.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -12],
  });

  const avatarScale = burst.interpolate({
    inputRange: [0, 1],
    outputRange: [0.15, 1],
  });

  return (
    <Modal visible animationType="fade" transparent statusBarTranslucent onRequestClose={closeAndMark}>
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
                    <Pressable onPress={goCustomize} style={styles.secondaryBtn} accessibilityRole="button">
                      <Text style={styles.secondaryBtnText}>Open customization</Text>
                    </Pressable>
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

            <Pressable onPress={closeAndMark} style={styles.primaryBtn} accessibilityRole="button">
              <Text style={styles.primaryBtnText}>Continue</Text>
            </Pressable>
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
