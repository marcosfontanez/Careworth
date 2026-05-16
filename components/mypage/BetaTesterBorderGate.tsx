import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  InteractionManager,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter, useSegments, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { colors, spacing } from '@/theme';
import { BETA_TESTER_BORDER_REWARD_ENABLED } from '@/lib/betaTesterBorder';
import { needsLegalAcknowledgment } from '@/lib/legalAck';
import { hasDismissedBetaTesterGiftModal, markBetaTesterGiftModalDismissed } from '@/lib/betaTesterGiftSeen';
import { pulseAvatarFramesService } from '@/services/supabase/pulseAvatarFrames';
import { AvatarDisplay, pulseFrameFromUser } from '@/components/profile/AvatarBuilder';
import { useAppStore } from '@/store/useAppStore';
import { queryClient } from '@/lib/queryClient';
import { userKeys } from '@/lib/queryKeys';
import type { PulseAvatarFrame } from '@/types';

/**
 * Only reset gift UI when the signed-in account UUID changes (not on gate remount).
 */
let lastBetaTesterBorderGateUserId: string | null = null;

/**
 * Gift should show on the main home experience. Expo Router v6 often reports only `/(tabs)` (no child
 * segment) from the root layout, so `.../feed` checks alone never become true and the modal never opens.
 * Any route under the tab navigator is treated as eligible (Feed is the first tab).
 */
function isFeedPath(pathname: string, segments: string[]): boolean {
  const p = pathname || '';
  const norm = p.startsWith('/') || p === '' ? p : `/${p}`;

  if (norm.includes('/feed') || norm.endsWith('feed')) return true;
  if (segments.some((s) => s === 'feed')) return true;

  if (norm.startsWith('/(tabs)') || norm === '(tabs)' || segments.includes('(tabs)')) return true;

  return false;
}

/**
 * Beta tester border: one coordinator effect (claim + open) so we don’t depend on a fragile
 * segment → Zustand → second effect chain that never fires when `segments` lacks `feed`.
 */
export function BetaTesterBorderGate() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname() ?? '';
  const routeKey = `${pathname}|${segments.join('/')}`;

  const { user, profile, isAuthenticated, betaGiftCheckNonce } = useAuth();

  const teamBorderGiftBlocking = useAppStore((s) => s.teamBorderGiftBlocking);

  /** Segments alone can lag behind navigation; pathname reflects the focused route more reliably. */
  const inAuth = segments.some((s) => s === 'auth') || pathname.startsWith('/auth');
  const termsComplete = useMemo(
    () => profile != null && !needsLegalAcknowledgment(profile),
    [profile],
  );
  const onFeed = isFeedPath(pathname, segments);
  const onCustomizeRoute = segments.includes('my-pulse-appearance') || pathname.includes('my-pulse-appearance');

  const canShowGiftUi =
    BETA_TESTER_BORDER_REWARD_ENABLED &&
    isAuthenticated &&
    Boolean(user?.id) &&
    termsComplete &&
    !inAuth &&
    onFeed &&
    !teamBorderGiftBlocking;

  const canShowModalRef = useRef(canShowGiftUi);
  canShowModalRef.current = canShowGiftUi;

  const onFeedRef = useRef(onFeed);
  onFeedRef.current = onFeed;
  const inAuthRef = useRef(inAuth);
  inAuthRef.current = inAuth;

  const [open, setOpen] = useState(false);
  const [frame, setFrame] = useState<PulseAvatarFrame | null>(null);
  const [giftOpened, setGiftOpened] = useState(false);
  const bounce = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const giftClaimUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const uid = user?.id ?? null;
    if (uid === lastBetaTesterBorderGateUserId) return;
    lastBetaTesterBorderGateUserId = uid;
    setOpen(false);
    setFrame(null);
    setGiftOpened(false);
    useAppStore.getState().setBetaTesterBorderBlocking(false);
    useAppStore.getState().clearBetaTesterGiftPending();
  }, [user?.id]);

  useEffect(() => {
    if (canShowGiftUi) return;
    useAppStore.getState().setBetaTesterBorderBlocking(false);
  }, [canShowGiftUi]);

  useEffect(() => {
    if (!canShowGiftUi || !open || !frame) return;
    useAppStore.getState().setBetaTesterBorderBlocking(true);
  }, [canShowGiftUi, open, frame]);

  /**
   * Past legal ack: always run idempotent claim off the auth stack. Open the modal only on feed.
   * Re-runs when `routeKey` / nonce / profile terms change so “land on feed after circles” still opens.
   */
  useEffect(() => {
    if (!BETA_TESTER_BORDER_REWARD_ENABLED || !user?.id || !isAuthenticated) return;
    if (!termsComplete || inAuth) return;

    let cancelled = false;
    const effectUserId = user.id;
    giftClaimUserIdRef.current = effectUserId;

    void (async () => {
      try {
        const dismissedEarly = await hasDismissedBetaTesterGiftModal(effectUserId);
        if (cancelled || giftClaimUserIdRef.current !== effectUserId) return;
        if (dismissedEarly) {
          useAppStore.getState().clearBetaTesterGiftPending();
          return;
        }

        const res = await pulseAvatarFramesService.claimBetaTesterBorder();
        if (cancelled || giftClaimUserIdRef.current !== effectUserId) return;
        if (!res.ok || !res.frame) {
          if (__DEV__) console.warn('[BetaTesterBorderGate] claim', res.reason ?? 'failed');
          return;
        }

        /** Already granted on another device/session — don’t repeat the full-screen gift UX. */
        if (!res.newlyGranted) {
          await markBetaTesterGiftModalDismissed(effectUserId);
          useAppStore.getState().clearBetaTesterGiftPending();
          await queryClient.invalidateQueries({ queryKey: userKeys.detail(effectUserId) });
          return;
        }

        useAppStore.getState().setBetaTesterGiftPending({ userId: effectUserId, frame: res.frame });

        if (!onFeedRef.current || inAuthRef.current) {
          if (__DEV__) console.log('[BetaTesterBorderGate] border granted; will open on Feed when pathname updates');
          return;
        }

        const dismissedLate = await hasDismissedBetaTesterGiftModal(effectUserId);
        if (cancelled || dismissedLate) {
          if (dismissedLate) useAppStore.getState().clearBetaTesterGiftPending();
          return;
        }

        await new Promise<void>((resolve) => {
          InteractionManager.runAfterInteractions(() => resolve());
        });
        if (cancelled || giftClaimUserIdRef.current !== effectUserId) return;

        requestAnimationFrame(() => {
          if (cancelled || giftClaimUserIdRef.current !== effectUserId) return;
          setFrame(res.frame);
          setOpen(true);
          if (__DEV__) console.log('[BetaTesterBorderGate] opened modal', effectUserId);
          if (canShowModalRef.current) {
            useAppStore.getState().setBetaTesterBorderBlocking(true);
          }
        });
      } catch (e) {
        if (__DEV__) console.warn('[BetaTesterBorderGate] pipeline', e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    user?.id,
    isAuthenticated,
    termsComplete,
    inAuth,
    onFeed,
    betaGiftCheckNonce,
    profile?.termsPrivacyAcceptedAt,
    profile?.id,
    routeKey,
  ]);

  /**
   * If claim finished while not on Feed, we store `betaTesterGiftPending`. Re-open when tabs/path
   * catch up so we never depend on a single effect re-run after `routeKey` flips.
   */
  const giftPending = useAppStore((s) => s.betaTesterGiftPending);

  useEffect(() => {
    if (!BETA_TESTER_BORDER_REWARD_ENABLED || !user?.id || !isAuthenticated) return;
    if (!termsComplete || inAuth || !onFeed || open) return;
    if (!giftPending || giftPending.userId !== user.id) return;

    let cancelled = false;
    void (async () => {
      try {
        const dismissed = await hasDismissedBetaTesterGiftModal(user.id);
        if (cancelled) return;
        if (dismissed) {
          useAppStore.getState().clearBetaTesterGiftPending();
          return;
        }
        await new Promise<void>((resolve) => {
          InteractionManager.runAfterInteractions(() => resolve());
        });
        if (cancelled || giftClaimUserIdRef.current !== user.id) return;
        if (!onFeedRef.current || inAuthRef.current) return;

        requestAnimationFrame(() => {
          if (cancelled || giftClaimUserIdRef.current !== user.id) return;
          const p = useAppStore.getState().betaTesterGiftPending;
          if (!p || p.userId !== user.id) return;
          setFrame(p.frame);
          setOpen(true);
          if (__DEV__) console.log('[BetaTesterBorderGate] opened from pending on Feed', user.id);
          if (canShowModalRef.current) {
            useAppStore.getState().setBetaTesterBorderBlocking(true);
          }
        });
      } catch (e) {
        if (__DEV__) console.warn('[BetaTesterBorderGate] pending opener', e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    user?.id,
    isAuthenticated,
    termsComplete,
    inAuth,
    onFeed,
    open,
    giftPending,
    routeKey,
  ]);

  useEffect(() => {
    if (!open || giftOpened) return;
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
  }, [open, giftOpened, bounce]);

  const finishAfterCustomize = useCallback(async () => {
    const uid = user?.id;
    if (uid) {
      await markBetaTesterGiftModalDismissed(uid);
      await queryClient.invalidateQueries({ queryKey: userKeys.detail(uid) });
    }
    useAppStore.getState().setBetaTesterBorderBlocking(false);
    useAppStore.getState().clearBetaTesterGiftPending();
    setOpen(false);
    setFrame(null);
    setGiftOpened(false);
  }, [user?.id]);

  useEffect(() => {
    if (!open || !onCustomizeRoute) return;
    void finishAfterCustomize();
  }, [open, onCustomizeRoute, finishAfterCustomize]);

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
    router.push('/my-pulse-appearance');
  }, [router]);

  if (!open || !frame || inAuth) return null;

  const pulseStyle = pulseFrameFromUser(frame);
  const giftTranslate = bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -12] });
  const avatarScale = burst.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] });

  return (
    <Modal
      visible
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={() => undefined}
    >
      <View style={[styles.backdrop, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.md }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.title}>You unlocked a beta gift</Text>
            <Text style={styles.subtitle}>
              As a token of appreciation for helping us shape PulseVerse during beta, we’re awarding you an exclusive{' '}
              <Text style={styles.subEm}>Beta Tester</Text> avatar border. Tap the gift to reveal it, then use{' '}
              <Text style={styles.howtoEm}>Open customization</Text> to equip it — that’s how you continue into the app.
            </Text>

            {!giftOpened ? (
              <Pressable
                onPress={onOpenGift}
                style={styles.giftHit}
                accessibilityRole="button"
                accessibilityLabel="Open beta reward gift"
              >
                <Animated.View style={{ transform: [{ translateY: giftTranslate }] }}>
                  <Ionicons name="gift" size={64} color={colors.primary.teal} />
                </Animated.View>
                <Text style={styles.giftHint}>Tap the gift</Text>
              </Pressable>
            ) : (
              <>
                <Animated.View
                  style={[styles.avatarBurst, { transform: [{ scale: avatarScale }] }]}
                  accessibilityLabel="Beta tester border preview"
                >
                  <AvatarDisplay
                    size={96}
                    avatarUrl={profile?.avatarUrl ?? undefined}
                    prioritizeRemoteAvatar
                    pulseFrame={pulseStyle ?? undefined}
                  />
                </Animated.View>
                <Text style={styles.howto}>
                  Equip it under <Text style={styles.howtoEm}>My Pulse</Text> →{' '}
                  <Text style={styles.howtoEm}>Customize My Pulse</Text> → <Text style={styles.howtoEm}>Border</Text>.
                </Text>
                <Pressable
                  onPress={goCustomize}
                  style={styles.primaryCta}
                  accessibilityRole="button"
                  accessibilityLabel="Open customization to equip beta border"
                >
                  <Text style={styles.primaryCtaText}>Open customization</Text>
                </Pressable>
              </>
            )}
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
  subEm: { fontWeight: '800', color: '#5EEAD4' },
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
    color: colors.primary.teal,
  },
  avatarBurst: { alignSelf: 'center', marginBottom: spacing.lg },
  howto: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.dark.textMuted,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  howtoEm: { fontWeight: '800', color: '#F8FAFC' },
  primaryCta: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: spacing.md + 2,
    borderRadius: 14,
    backgroundColor: colors.primary.teal,
    marginTop: spacing.sm,
  },
  primaryCtaText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#06201C',
  },
});