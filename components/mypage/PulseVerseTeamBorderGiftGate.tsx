import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  InteractionManager,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { usePathname, useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { colors, spacing, borderRadius, pulseverse, gradients, rarity } from '@/theme';
import { needsLegalAcknowledgment } from '@/lib/legalAck';
import { shopKeys } from '@/lib/shop/queryKeys';
import { shopQueriesService } from '@/services/shop/shopQueries';
import { purchaseService } from '@/services/shop/purchaseService';
import { useAppStore } from '@/store/useAppStore';
import { analytics } from '@/lib/analytics';
import { useToast } from '@/components/ui/Toast';
import { rewardDeliveriesService } from '@/services/supabase/rewardDeliveries';
import { rewardDeliveryKeys } from '@/lib/queryKeys';
import { buildBorderRewardMetadata } from '@/lib/rewardDelivery/buildBorderMetadata';
import { rewardDeliveryDebug } from '@/lib/rewardDelivery/debugLog';

const TEAM_LABEL = 'Pulse Verse Team';

const RIM_PREMIUM = [
  'rgba(34,211,238,0.95)',
  'rgba(168,85,247,0.65)',
  'rgba(236,72,153,0.72)',
  'rgba(56,189,248,0.85)',
] as const;

let lastTeamGiftGateUserId: string | null = null;

/**
 * Presents a full-screen “open your gift” flow when staff grant a shop border from the web admin.
 * Inventory is created only after the recipient taps Open (see `economy_accept_pending_border_gift`).
 *
 * Pending `border_gifts` rows today are staff/admin grants only — subtitle uses {@link TEAM_LABEL}.
 */
export function PulseVerseTeamBorderGiftGate() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const showToast = useToast((s) => s.show);
  const segments = useSegments();
  const pathname = usePathname() ?? '';
  const { user, profile, isAuthenticated } = useAuth();
  const betaTesterBorderBlocking = useAppStore((s) => s.betaTesterBorderBlocking);
  const pulseMonthCelebrationBlocking = useAppStore((s) => s.pulseMonthCelebrationBlocking);
  const rewardDeliveryBlocking = useAppStore((s) => s.rewardDeliveryBlocking);
  const setTeamBorderGiftBlocking = useAppStore((s) => s.setTeamBorderGiftBlocking);

  const termsComplete = profile != null && !needsLegalAcknowledgment(profile);
  const inAuth = segments.some((s) => s === 'auth') || pathname.startsWith('/auth');

  const canShow =
    isAuthenticated &&
    Boolean(user?.id) &&
    termsComplete &&
    !inAuth &&
    !betaTesterBorderBlocking &&
    !pulseMonthCelebrationBlocking &&
    !rewardDeliveryBlocking;

  const uid = user?.id;

  const pendingQ = useQuery({
    queryKey: shopKeys.pendingTeamBorderGifts(uid),
    queryFn: () => shopQueriesService.getNextPendingTeamBorderGift(uid!),
    enabled: !!uid && canShow,
    staleTime: 8_000,
    refetchOnWindowFocus: 'always',
  });

  const [open, setOpen] = useState(false);
  const [opening, setOpening] = useState(false);

  const bounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const id = user?.id ?? null;
    if (id === lastTeamGiftGateUserId) return;
    lastTeamGiftGateUserId = id;
    setOpen(false);
    setOpening(false);
    bounce.setValue(0);
    setTeamBorderGiftBlocking(false);
  }, [user?.id, setTeamBorderGiftBlocking, bounce]);

  useEffect(() => {
    if (!canShow && open) {
      setOpen(false);
      setTeamBorderGiftBlocking(false);
    }
  }, [canShow, open, setTeamBorderGiftBlocking]);

  const gift = pendingQ.data ?? null;

  useEffect(() => {
    if (open && !gift) {
      setOpen(false);
      setTeamBorderGiftBlocking(false);
    }
  }, [open, gift, setTeamBorderGiftBlocking]);

  useEffect(() => {
    if (!canShow || !gift || open || opening) return;

    let cancelled = false;
    void (async () => {
      await new Promise<void>((resolve) => {
        InteractionManager.runAfterInteractions(() => resolve());
      });
      if (cancelled || !canShow || !gift) return;
      requestAnimationFrame(() => {
        if (cancelled) return;
        setOpen(true);
        setTeamBorderGiftBlocking(true);
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [canShow, gift, open, opening, setTeamBorderGiftBlocking]);

  useEffect(() => {
    if (!open || opening) return;
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
  }, [open, opening, bounce]);

  const closeGate = useCallback(() => {
    setOpen(false);
    setOpening(false);
    bounce.setValue(0);
    setTeamBorderGiftBlocking(false);
  }, [setTeamBorderGiftBlocking, bounce]);

  const onOpenGift = useCallback(async () => {
    if (!gift || opening) return;
    setOpening(true);
    try {
      const res = await purchaseService.acceptPendingTeamBorderGift(gift.giftId);
      if (!res.ok) {
        Alert.alert('Could not open gift', res.message);
        return;
      }

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      analytics.track('team_border_gift_opened', { shop_item_id: gift.shopItem.id });

      const payload = (res.data ?? {}) as Record<string, unknown>;
      let invId: string | null =
        typeof payload.user_inventory_id === 'string' ? payload.user_inventory_id.trim() || null : null;

      if (!invId && uid) {
        const list = await shopQueriesService.getUserInventory(uid);
        invId = list.find((i) => i.shop_item_id === gift.shopItem.id)?.id ?? null;
      }

      await qc.invalidateQueries({ queryKey: shopKeys.pendingTeamBorderGifts(uid) });
      await qc.invalidateQueries({ queryKey: shopKeys.inventory(uid) });

      const meta = buildBorderRewardMetadata(gift.shopItem, invId ?? undefined, {
        border_source: 'sponsored',
        partner_label: TEAM_LABEL,
      });

      const routedId = await rewardDeliveriesService.enqueueClient({
        deliveryType: 'gift',
        itemType: 'border',
        itemId: gift.shopItem.id,
        idempotencyKey: `team_border_gift:${gift.giftId}`,
        metadata: meta as unknown as Record<string, unknown>,
        sourceDisplayName: TEAM_LABEL,
      });
      await qc.invalidateQueries({ queryKey: rewardDeliveryKeys.pendingList(uid) });
      await qc.refetchQueries({ queryKey: rewardDeliveryKeys.pendingList(uid) });
      if (!routedId) {
        rewardDeliveryDebug.warn('PulseVerseTeamBorderGiftGate: enqueueClient returned null');
        Alert.alert(
          'Celebration queue failed',
          'Your border was added to your vault. The animated reward toast could not be queued — check My Borders.',
        );
      }

      showToast('Open your reward celebration below.', 'success');
      closeGate();
    } catch (e) {
      console.warn('[PulseVerseTeamBorderGiftGate] accept', e);
      Alert.alert('Could not open gift', 'Something went wrong. Try again in a moment.');
    } finally {
      setOpening(false);
    }
  }, [gift, opening, qc, uid, closeGate, showToast]);

  if (!open || !gift) return null;

  const bounceY = bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -14] });

  return (
    <Modal visible animationType="fade" transparent statusBarTranslucent onRequestClose={() => undefined}>
      <View style={[styles.backdrop, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.md }]}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={38} tint="dark" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.androidDim]} />
        )}
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(5,10,22,0.92)', 'rgba(5,10,22,0.78)', 'rgba(8,15,32,0.88)']}
          style={StyleSheet.absoluteFill}
        />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <LinearGradient colors={[...RIM_PREMIUM]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cardGlow}>
            <View style={styles.cardInner}>
              <Text style={styles.title}>Gift received</Text>
              <Text style={styles.subtitle}>
                You received <Text style={styles.subGold}>{gift.shopItem.name}</Text>
                {'\n'}
                from <Text style={styles.subCyan}>{TEAM_LABEL}</Text>
              </Text>

              <Animated.View style={[styles.giftHero, { transform: [{ translateY: bounceY }] }]}>
                <LinearGradient colors={['rgba(45,212,191,0.95)', 'rgba(34,211,238,0.75)']} style={styles.giftOrb}>
                  <Ionicons name="gift" size={52} color="#FDE68A" />
                </LinearGradient>
              </Animated.View>

              <View style={styles.statusPill}>
                <Ionicons name="star" size={14} color={pulseverse.electricSoft} style={{ marginRight: 8 }} />
                <Text style={styles.statusPillText}>A premium gift is waiting — open it to add to your vault.</Text>
              </View>

              <TouchableOpacity
                style={[styles.openBtn, opening && styles.openBtnDisabled]}
                onPress={() => void onOpenGift()}
                disabled={opening}
                activeOpacity={0.88}
              >
                <LinearGradient colors={[...gradients.ctaSheet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.openBtnGrad}>
                  {opening ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Ionicons name="gift-outline" size={20} color="#fff" />
                      <Text style={styles.openBtnText}>Open gift</Text>
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  androidDim: { backgroundColor: 'rgba(2,6,23,0.72)' },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  cardGlow: {
    padding: 2,
    borderRadius: 26,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  cardInner: {
    borderRadius: 24,
    backgroundColor: 'rgba(12,18,32,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.14)',
    paddingTop: 36,
    paddingBottom: 28,
    paddingHorizontal: 22,
    shadowColor: '#22D3EE',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 26,
    elevation: 14,
  },
  closeX: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 3,
    padding: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.dark.text,
    textAlign: 'center',
    letterSpacing: -0.35,
  },
  subtitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '700',
    color: colors.dark.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  subGold: { color: rarity.legendary.text, fontWeight: '900' },
  subCyan: { color: pulseverse.electricSoft, fontWeight: '900' },
  giftHero: {
    marginTop: 22,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  giftOrb: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    shadowColor: '#FDE68A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 22,
    elevation: 16,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(8,14,28,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.15)',
    marginBottom: 18,
  },
  statusPillText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.dark.textSecondary,
    lineHeight: 18,
  },
  openBtn: {
    alignSelf: 'stretch',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    shadowColor: '#22D3EE',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 10,
  },
  openBtnDisabled: { opacity: 0.75 },
  openBtnGrad: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openBtnText: { fontSize: 16, fontWeight: '900', color: '#fff' },

  successBadgeWrap: { marginTop: -6, marginBottom: 10, alignItems: 'center' },
  successBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    shadowColor: '#2DD4BF',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  bodyCenter: { marginTop: 10, textAlign: 'center', lineHeight: 22 },
  bodyMuted: { fontSize: 15, fontWeight: '600', color: colors.dark.textSecondary },
  vaultWord: { fontSize: 15, fontWeight: '900', color: pulseverse.electricSoft },
  previewWrap: { marginTop: 18, alignItems: 'center' },
  rarityRow: { marginTop: 8, marginBottom: 6 },
  borderName: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.dark.text,
    textAlign: 'center',
  },
  borderMeta: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
    color: colors.dark.textMuted,
    textAlign: 'center',
  },
  infoStrip: {
    marginTop: 18,
    alignSelf: 'stretch',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(8,14,28,0.65)',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.12)',
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: pulseverse.electricMuted,
  },
  equipBtn: {
    marginTop: 22,
    alignSelf: 'stretch',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    shadowColor: '#22D3EE',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 10,
  },
  equipGrad: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  equipMini: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  equipMiniLetter: {
    fontWeight: '900',
    fontSize: 14,
    color: '#fff',
  },
  equipText: { fontSize: 16, fontWeight: '900', color: '#fff' },
  keepBrowse: { marginTop: 16, alignSelf: 'center', paddingVertical: 8 },
  keepBrowseText: { fontSize: 14, fontWeight: '800', color: pulseverse.electricSoft },
});
