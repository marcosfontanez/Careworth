import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
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
import { BETA_TESTER_BORDER_REWARD_ENABLED } from '@/lib/betaTesterBorder';
import { pulseAvatarFramesService } from '@/services/supabase/pulseAvatarFrames';
import { AvatarDisplay, pulseFrameFromUser } from '@/components/profile/AvatarBuilder';
import { useAppStore } from '@/store/useAppStore';
import { queryClient } from '@/lib/queryClient';
import { userKeys } from '@/lib/queryKeys';
import type { PulseAvatarFrame } from '@/types';

/**
 * First login after deploy: idempotent RPC grants the beta border once; user opens the
 * same bouncing gift as monthly Pulse prizes, then can jump to Customize to equip.
 */
export function BetaTesterBorderGate() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const segments = useSegments();
  const { user, profile, isAuthenticated, isLoading } = useAuth();
  const inAuth = segments[0] === 'auth' || segments[0] === 'onboarding';
  const setBetaTesterBorderBlocking = useAppStore((s) => s.setBetaTesterBorderBlocking);

  const enabled =
    BETA_TESTER_BORDER_REWARD_ENABLED && isAuthenticated && !isLoading && !inAuth && Boolean(user?.id);

  const [open, setOpen] = useState(false);
  const [frame, setFrame] = useState<PulseAvatarFrame | null>(null);
  const [giftOpened, setGiftOpened] = useState(false);
  const bounce = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setOpen(false);
    setFrame(null);
    setGiftOpened(false);
    setBetaTesterBorderBlocking(false);
  }, [user?.id, setBetaTesterBorderBlocking]);

  useEffect(() => {
    if (!enabled || !user?.id) return;
    let cancelled = false;

    void (async () => {
      try {
        const res = await pulseAvatarFramesService.claimBetaTesterBorder();
        if (cancelled || !res.ok || !res.newlyGranted || !res.frame) return;
        setFrame(res.frame);
        setOpen(true);
        setBetaTesterBorderBlocking(true);
      } catch {
        // Network / RPC — user keeps playing; next app open retries
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, user?.id, setBetaTesterBorderBlocking]);

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

  const finish = useCallback(async () => {
    const uid = user?.id;
    if (uid) {
      await queryClient.invalidateQueries({ queryKey: userKeys.detail(uid) });
    }
    setBetaTesterBorderBlocking(false);
    setOpen(false);
  }, [user?.id, setBetaTesterBorderBlocking]);

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
    void finish();
    router.push('/my-pulse-appearance');
  }, [finish, router]);

  if (!enabled || !open || !frame) return null;

  const pulseStyle = pulseFrameFromUser(frame);
  const giftTranslate = bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -12] });
  const avatarScale = burst.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] });

  return (
    <Modal visible animationType="fade" transparent statusBarTranslucent onRequestClose={finish}>
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
              <Text style={styles.subEm}>Beta Tester</Text> avatar border — wearable proof you were here from the
              early days. Tap the gift to reveal it, then equip it anytime from Customize My Pulse.
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
                <Pressable onPress={goCustomize} style={styles.secondaryBtn} accessibilityRole="button">
                  <Text style={styles.secondaryBtnText}>Open customization</Text>
                </Pressable>
              </>
            )}

            <Pressable onPress={() => void finish()} style={styles.primaryBtn} accessibilityRole="button">
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
  primaryBtn: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: spacing.md + 2,
    borderRadius: 14,
    backgroundColor: colors.primary.teal,
    marginTop: spacing.sm,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#06201C',
  },
});
