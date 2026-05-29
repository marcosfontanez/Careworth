import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { openPulsePage } from '@/lib/navigation/pulsePageRoutes';
import { useQueryClient } from '@tanstack/react-query';
import { pushPostViewer } from '@/lib/postViewerRoute';
import { colors, borderRadius, spacing, pulseverse, gradients } from '@/theme';
import type {
  BorderRewardMetadata,
  DiamondsRewardMetadata,
  RewardDeliveryRecord,
  RewardRevealPhase,
} from '@/lib/rewardDelivery/types';
import { rewardDeliveryDebug } from '@/lib/rewardDelivery/debugLog';
import { GiftBoxRevealStage, GIFT_UNWRAP_DURATION_MS } from '@/components/rewards/GiftBoxRevealStage';
import { RewardGiftPedestal } from '@/components/rewards/RewardGiftPedestal';
import { RewardBurstParticles, type RewardBurstVisualPhase } from '@/components/rewards/RewardBurstParticles';
import { RewardItemReveal } from '@/components/rewards/RewardItemReveal';
import { purchaseService } from '@/services/shop/purchaseService';
import { shopKeys } from '@/lib/shop/queryKeys';
import { useAuth } from '@/contexts/AuthContext';
import { RarityTierBadge } from '@/components/shop/border/BorderRarityBadge';
import { analytics } from '@/lib/analytics';

type Props = {
  visible: boolean;
  delivery: RewardDeliveryRecord | null;
  onDismiss: () => void;
  onAcknowledge: (id: string, outcome: 'acknowledged' | 'dismissed') => Promise<void>;
};

function metaStr(meta: Record<string, unknown>, key: string): string | null {
  const v = meta[key];
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

function sparksRevealQty(delivery: RewardDeliveryRecord, meta: Record<string, unknown>): number {
  const metaQty = metaStr(meta, 'quantity');
  const parsed = metaQty != null ? Number(metaQty) : NaN;
  const base = delivery.quantity;
  if (typeof base === 'number' && Number.isFinite(base)) return base;
  if (Number.isFinite(parsed)) return parsed;
  return 0;
}

function toastTitle(d: RewardDeliveryRecord): string {
  switch (d.item_type) {
    case 'border':
      return 'New border';
    case 'sparks':
      return 'Sparks added';
    case 'diamonds':
      return 'Diamonds added';
    default:
      return 'Reward ready';
  }
}

const MIN_GIFT_PRIMING_TAPS = 3;

function burstParticlesPhase(phase: RewardRevealPhase): RewardBurstVisualPhase {
  if (phase === 'burst') return 'explosion';
  if (
    phase === 'item_emerge' ||
    phase === 'item_settle' ||
    phase === 'details_visible' ||
    phase === 'complete'
  ) {
    return 'ambient';
  }
  return 'off';
}

function accentHue(d: RewardDeliveryRecord): number {
  switch (d.item_type) {
    case 'border':
      return 192;
    case 'sparks':
      return 188;
    case 'diamonds': {
      const r = typeof d.metadata?.reason === 'string' ? d.metadata.reason : '';
      if (r === 'live_stream') return 188;
      return 48;
    }
    default:
      return 270;
  }
}

function revealPayloadCompleteness(d: RewardDeliveryRecord): Record<string, unknown> {
  const m = d.metadata ?? {};
  const base = {
    item_type: d.item_type,
    has_item_id: Boolean(d.item_id),
    has_quantity: typeof d.quantity === 'number',
    delivery_type: d.delivery_type,
    has_source_display: Boolean(d.source_display_name),
  };
  if (d.item_type === 'border') {
    const bm = m as BorderRewardMetadata;
    return {
      ...base,
      has_border_name: Boolean(bm.border_name?.trim()),
      has_preview_image_url: Boolean(bm.preview_image_url?.trim()),
      has_inventory_item_id: Boolean(bm.inventory_item_id?.trim()),
      has_shop_item_id: Boolean(bm.shop_item_id?.trim()),
      has_ring_preview_hex: Boolean(bm.ring_preview_hex?.trim()),
      has_rarity: Boolean(bm.rarity_slug ?? bm.rarity_label),
    };
  }
  if (d.item_type === 'sparks') {
    return { ...base, meta_quantity: typeof m.quantity === 'number' };
  }
  if (d.item_type === 'diamonds') {
    const dm = m as DiamondsRewardMetadata;
    return {
      ...base,
      meta_reason: typeof dm.reason === 'string',
      gift_name: Boolean(dm.gift_name?.trim()),
      has_sender_username: Boolean(dm.sender_username?.trim()),
      has_context_id: Boolean(dm.context_id?.trim()),
      has_context_type: Boolean(dm.context_type?.trim()),
      has_gift_slug: Boolean(dm.gift_slug?.trim()),
      has_stream_id: Boolean(dm.stream_id?.trim()),
      has_gift_emoji: Boolean(dm.gift_emoji?.trim()),
      has_gift_id: Boolean(dm.gift_id?.trim()),
    };
  }
  return { ...base, meta_kind: typeof (m as { kind?: string }).kind === 'string' };
}

export function RewardRevealModal({ visible, delivery, onDismiss, onAcknowledge }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuth();
  const uid = user?.id ?? null;

  const [phase, setPhase] = useState<RewardRevealPhase>('modal_intro');
  const [giftMicroPulseKey, setGiftMicroPulseKey] = useState(0);
  const giftPrimTapRef = useRef(0);
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  useEffect(() => {
    if (!visible || !delivery) return;
    setPhase('modal_intro');
    giftPrimTapRef.current = 0;
    setGiftMicroPulseKey(0);
    clearTimers();
    const t = setTimeout(() => setPhase('awaiting_tap'), 72);
    timersRef.current.push(t);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    return clearTimers;
  }, [visible, delivery?.id, clearTimers]);

  useEffect(() => {
    if (!visible || !delivery) return;
    rewardDeliveryDebug.modalOpen(delivery.id, delivery.item_type, revealPayloadCompleteness(delivery));
  }, [visible, delivery]);

  useEffect(() => {
    if (!visible || !delivery) return;
    analytics.track('reward_reveal_opened', {
      delivery_id: delivery.id,
      item_type: delivery.item_type,
      delivery_type: delivery.delivery_type,
      meta_reason: typeof delivery.metadata?.reason === 'string' ? delivery.metadata.reason : undefined,
    });
  }, [visible, delivery?.id, delivery?.item_type, delivery?.delivery_type]);

  useEffect(() => {
    if (!visible || !delivery) return;
    rewardDeliveryDebug.phase(phase, delivery.id);
  }, [phase, visible, delivery]);

  useEffect(() => {
    if (phase !== 'box_open') return;
    clearTimers();
    const t = setTimeout(() => {
      setPhase('burst');
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    }, GIFT_UNWRAP_DURATION_MS + 48);
    timersRef.current.push(t);
    return clearTimers;
  }, [phase, clearTimers]);

  useEffect(() => {
    if (phase !== 'burst') return;
    clearTimers();
    const t1 = setTimeout(() => setPhase('item_emerge'), 440);
    const t2 = setTimeout(() => {
      setPhase('item_settle');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    }, 780);
    const t3 = setTimeout(() => {
      setPhase('details_visible');
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }, 1120);
    timersRef.current.push(t1, t2, t3);
    return clearTimers;
  }, [phase, clearTimers]);

  const showDetails = phase === 'details_visible' || phase === 'complete';

  const meta = delivery?.metadata ?? {};
  const metaKind = typeof meta.kind === 'string' ? meta.kind : '';
  const borderMeta = meta as unknown as BorderRewardMetadata;

  const onPrimingGiftTap = useCallback(() => {
    if (phase !== 'awaiting_tap') return;
    giftPrimTapRef.current += 1;
    const n = giftPrimTapRef.current;
    setGiftMicroPulseKey((k) => k + 1);

    if (n < MIN_GIFT_PRIMING_TAPS) {
      const escalation = [Haptics.ImpactFeedbackStyle.Light, Haptics.ImpactFeedbackStyle.Medium] as const;
      void Haptics.impactAsync(escalation[n - 1] ?? Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => undefined);
    setPhase('box_shake');
  }, [phase]);

  const onShakeComplete = useCallback(() => {
    setPhase('box_open');
  }, []);

  const trackRevealCta = useCallback(
    (cta: string, extra?: Record<string, unknown>) => {
      if (!delivery) return;
      analytics.track('reward_reveal_cta', {
        cta,
        delivery_id: delivery.id,
        item_type: delivery.item_type,
        ...extra,
      });
    },
    [delivery],
  );

  const closeModal = useCallback(
    async (outcome: 'acknowledged' | 'dismissed') => {
      if (!delivery) return;
      analytics.track('reward_reveal_closed', {
        delivery_id: delivery.id,
        item_type: delivery.item_type,
        outcome,
      });
      clearTimers();
      await onAcknowledge(delivery.id, outcome);
      onDismiss();
    },
    [delivery, onAcknowledge, onDismiss, clearTimers],
  );

  const onEquipBorder = useCallback(async () => {
    const inv = borderMeta.inventory_item_id?.trim();
    if (!inv) return;
    trackRevealCta('equip_now');
    const r = await purchaseService.equipBorder(inv);
    if (!r.ok) return;
    if (uid) await qc.invalidateQueries({ queryKey: shopKeys.inventory(uid) });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    await closeModal('acknowledged');
  }, [borderMeta.inventory_item_id, qc, uid, closeModal, trackRevealCta]);

  const frameSize = 200;

  if (!visible || !delivery) return null;

  const metaReason = typeof meta.reason === 'string' ? meta.reason : '';

  let subtitleEl: React.ReactNode;
  if (delivery.item_type === 'diamonds') {
    const live = metaReason === 'live_stream';
    const giftConv = metaReason === 'gift_conversion';
    const enrichedGift = giftConv || live;

    if (enrichedGift) {
      const su = metaStr(meta, 'sender_username');
      const ctxType = metaStr(meta, 'context_type');
      const ctxMuted =
        giftConv && ctxType === 'post'
          ? 'From a post'
          : giftConv && ctxType === 'live'
            ? 'During a live'
            : giftConv && ctxType === 'profile'
              ? 'From your profile'
              : live
                ? 'Live stream gift'
                : null;

      if (su) {
        subtitleEl = (
          <Text style={styles.sub}>
            Gifted by <Text style={styles.subEm}>@{su}</Text>
            {ctxMuted ? (
              <>
                {'\n'}
                <Text style={styles.subMuted}>{ctxMuted}</Text>
              </>
            ) : null}
            {'\n'}
            <Text style={styles.subMuted}>Your Diamonds balance is updated.</Text>
          </Text>
        );
      } else if (delivery.source_display_name) {
        subtitleEl = (
          <Text style={styles.sub}>
            From <Text style={styles.subEm}>{delivery.source_display_name}</Text>
            {ctxMuted ? (
              <>
                {'\n'}
                <Text style={styles.subMuted}>{ctxMuted}</Text>
              </>
            ) : live ? (
              <>
                {'\n'}
                <Text style={styles.subMuted}>Live stream gift</Text>
              </>
            ) : null}
            {'\n'}
            <Text style={styles.subMuted}>Your Diamonds balance is updated.</Text>
          </Text>
        );
      } else {
        subtitleEl = (
          <Text style={styles.sub}>
            <Text style={styles.subMuted}>{ctxMuted ?? (live ? 'Live stream gift' : 'Gift delivered')}</Text>
            {'\n'}
            <Text style={styles.subMuted}>Your Diamonds balance is updated.</Text>
          </Text>
        );
      }
    } else if (delivery.source_display_name) {
      subtitleEl = (
        <Text style={styles.sub}>
          From <Text style={styles.subEm}>{delivery.source_display_name}</Text>
        </Text>
      );
    } else {
      subtitleEl = <Text style={styles.sub}>Your Diamonds balance is updated.</Text>;
    }
  } else if (delivery.item_type === 'sparks') {
    const qty = sparksRevealQty(delivery, meta);
    const qtyLine =
      qty > 0 ? (
        <Text style={styles.subMuted}>Wallet credit · +{qty.toLocaleString()} Sparks</Text>
      ) : (
        <Text style={styles.subMuted}>Your Sparks wallet was updated.</Text>
      );
    if (delivery.source_display_name) {
      subtitleEl = (
        <Text style={styles.sub}>
          From <Text style={styles.subEm}>{delivery.source_display_name}</Text>
          {'\n'}
          {qtyLine}
          {'\n'}
          <Text style={styles.subMuted}>Spend on creator gifts or Pulse Shop borders.</Text>
        </Text>
      );
    } else {
      subtitleEl = (
        <Text style={styles.sub}>
          {qtyLine}
          {'\n'}
          <Text style={styles.subMuted}>Spend on creator gifts or Pulse Shop borders.</Text>
        </Text>
      );
    }
  } else if (delivery.item_type === 'border') {
    const bm = borderMeta;
    const giftedBy = bm.gifted_by_username?.trim();
    const partner = bm.partner_label?.trim();
    const charity = bm.charity_label?.trim();
    if (giftedBy) {
      subtitleEl = (
        <Text style={styles.sub}>
          Gifted by <Text style={styles.subEm}>@{giftedBy}</Text>
          {'\n'}
          <Text style={styles.subMuted}>Saved to My Borders — equip anytime.</Text>
        </Text>
      );
    } else if (partner || charity) {
      subtitleEl = (
        <Text style={styles.sub}>
          {partner ? (
            <>
              <Text style={styles.subMuted}>{partner}</Text>
              {'\n'}
            </>
          ) : null}
          {charity ? (
            <>
              <Text style={styles.subMuted}>{charity}</Text>
              {'\n'}
            </>
          ) : null}
          <Text style={styles.subMuted}>Saved to My Borders — equip anytime.</Text>
        </Text>
      );
    } else if (delivery.source_display_name) {
      subtitleEl = (
        <Text style={styles.sub}>
          From <Text style={styles.subEm}>{delivery.source_display_name}</Text>
          {'\n'}
          <Text style={styles.subMuted}>Saved to My Borders — equip anytime.</Text>
        </Text>
      );
    } else {
      subtitleEl = (
        <Text style={styles.sub}>
          <Text style={styles.subMuted}>Saved to My Borders — equip anytime.</Text>
        </Text>
      );
    }
  } else if (delivery.source_display_name) {
    subtitleEl = (
      <Text style={styles.sub}>
        From <Text style={styles.subEm}>{delivery.source_display_name}</Text>
      </Text>
    );
  } else {
    subtitleEl = (
      <Text style={styles.sub}>Tap the gift a few times — then it bursts open to reveal your reward.</Text>
    );
  }

  const diamondGiftUx =
    delivery.item_type === 'diamonds' &&
    (metaReason === 'gift_conversion' || metaReason === 'live_stream');
  const giftHeadline = metaStr(meta, 'gift_name');
  const sparksQty = delivery.item_type === 'sparks' ? sparksRevealQty(delivery, meta) : 0;
  const borderRevealTier =
    delivery.item_type === 'border'
      ? borderMeta.rarity_label?.trim() || borderMeta.rarity_slug?.trim() || null
      : null;

  let modalKicker: string;
  let modalTitle: string;
  if (diamondGiftUx) {
    modalKicker = 'Gift received';
    modalTitle = giftHeadline ?? 'You earned Diamonds';
  } else if (delivery.item_type === 'border') {
    modalKicker = 'Border unlocked';
    modalTitle = borderMeta.border_name?.trim() || 'A new border awaits';
  } else if (delivery.item_type === 'sparks') {
    modalKicker = 'Sparks delivered';
    modalTitle = sparksQty > 0 ? `+${sparksQty.toLocaleString()} Sparks` : 'Balance updated';
  } else {
    modalKicker = toastTitle(delivery);
    modalTitle = 'A new reward awaits';
  }

  const postCtxId =
    metaReason === 'gift_conversion' && metaStr(meta, 'context_type') === 'post'
      ? metaStr(meta, 'context_id')
      : null;
  const profileCtxId =
    metaReason === 'gift_conversion' && metaStr(meta, 'context_type') === 'profile'
      ? metaStr(meta, 'context_id')
      : null;
  const liveStreamDeepLinkId =
    metaReason === 'live_stream'
      ? metaStr(meta, 'stream_id')
      : metaReason === 'gift_conversion' && metaStr(meta, 'context_type') === 'live'
        ? metaStr(meta, 'context_id')
        : null;

  return (
    <Modal visible animationType="fade" transparent statusBarTranslucent onRequestClose={() => void closeModal('dismissed')}>
      <View style={[styles.root, { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.md }]}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={42} tint="dark" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.androidDim]} />
        )}
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(5,10,22,0.94)', 'rgba(8,15,32,0.88)', 'rgba(5,10,22,0.96)']}
          style={StyleSheet.absoluteFill}
        />

        <Pressable style={styles.closeBtn} onPress={() => void closeModal('dismissed')} hitSlop={12}>
          <Ionicons name="close" size={24} color="rgba(255,255,255,0.72)" />
        </Pressable>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <LinearGradient
            colors={['rgba(34,211,238,0.55)', 'rgba(168,85,247,0.38)', 'rgba(236,72,153,0.42)', 'rgba(56,189,248,0.52)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardEdge}
          >
            <View style={styles.card}>
              <Text style={styles.kicker}>{modalKicker}</Text>
              <Text style={styles.title}>{modalTitle}</Text>
              {delivery.item_type === 'border' && borderRevealTier ? (
                <View style={styles.revealRarityRow}>
                  <RarityTierBadge tier={borderRevealTier} compact emphasized align="center" />
                </View>
              ) : null}
              {subtitleEl}

              <View style={styles.stage}>
                <View style={styles.stageFocus}>
                  <RewardGiftPedestal />
                  {/** FX below the box so unwrap / lid sprites stay visible (explosion was painting on top). */}
                  <View style={styles.stageBurstLayer} pointerEvents="none">
                    <RewardBurstParticles phase={burstParticlesPhase(phase)} accentHue={accentHue(delivery)} />
                  </View>
                  <View style={styles.stageGiftLayer} pointerEvents="box-none">
                    <GiftBoxRevealStage
                      phase={phase}
                      frameSize={frameSize}
                      microPulseKey={giftMicroPulseKey}
                      onTapClosedBox={onPrimingGiftTap}
                      onShakeComplete={onShakeComplete}
                    />
                  </View>
                  <View style={styles.stageRewardLayer} pointerEvents="box-none">
                    <RewardItemReveal delivery={delivery} phase={phase} />
                  </View>
                </View>
              </View>

              {phase === 'awaiting_tap' ? (
                <View style={styles.tapHintRow}>
                  <Ionicons name="hand-left-outline" size={18} color="rgba(34,211,238,0.58)" />
                  <Text style={styles.tapHintTxt}>Tap the gift</Text>
                </View>
              ) : null}

              {showDetails ? (
                <View style={styles.actions}>
                  {delivery.item_type === 'border' ? (
                    <>
                      {borderMeta.inventory_item_id ? (
                        <TouchableOpacity activeOpacity={0.88} onPress={() => void onEquipBorder()} style={styles.primaryBtn}>
                          <LinearGradient colors={[...gradients.ctaSheet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryGrad}>
                            <Text style={styles.primaryTxt}>Equip now</Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      ) : null}
                      <TouchableOpacity
                        activeOpacity={0.88}
                        onPress={() => {
                          trackRevealCta('customize_appearance');
                          router.push('/my-pulse-appearance' as any);
                          void closeModal('acknowledged');
                        }}
                        style={styles.secondaryBtn}
                      >
                        <Text style={styles.secondaryTxt}>Open Customize</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        activeOpacity={0.88}
                        onPress={() => {
                          trackRevealCta('border_vault');
                          router.push('/my-borders' as any);
                          void closeModal('acknowledged');
                        }}
                        style={styles.tertiaryBtn}
                      >
                        <Text style={styles.tertiaryTxt}>View Border Vault</Text>
                      </TouchableOpacity>
                    </>
                  ) : null}

                  {delivery.item_type === 'sparks' ? (
                    <TouchableOpacity
                      activeOpacity={0.88}
                      onPress={() => {
                        trackRevealCta('pulse_shop');
                        router.push('/pulse-shop' as any);
                        void closeModal('acknowledged');
                      }}
                      style={styles.primaryBtn}
                    >
                      <LinearGradient colors={[...gradients.ctaSheet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryGrad}>
                        <Text style={styles.primaryTxt}>Open Pulse Shop</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  ) : null}

                  {delivery.item_type === 'diamonds' ? (
                    <>
                      {postCtxId ? (
                        <TouchableOpacity
                          activeOpacity={0.88}
                          onPress={() => {
                            trackRevealCta('view_post');
                            void pushPostViewer(router, postCtxId);
                            void closeModal('acknowledged');
                          }}
                          style={styles.secondaryBtn}
                        >
                          <Text style={styles.secondaryTxt}>View post</Text>
                        </TouchableOpacity>
                      ) : null}
                      {profileCtxId ? (
                        <TouchableOpacity
                          activeOpacity={0.88}
                          onPress={() => {
                            trackRevealCta('view_profile');
                            openPulsePage(router, profileCtxId);
                            void closeModal('acknowledged');
                          }}
                          style={styles.secondaryBtn}
                        >
                          <Text style={styles.secondaryTxt}>View profile</Text>
                        </TouchableOpacity>
                      ) : null}
                      {liveStreamDeepLinkId ? (
                        <TouchableOpacity
                          activeOpacity={0.88}
                          onPress={() => {
                            trackRevealCta('view_live');
                            router.push(`/live/${encodeURIComponent(liveStreamDeepLinkId)}` as any);
                            void closeModal('acknowledged');
                          }}
                          style={styles.secondaryBtn}
                        >
                          <Text style={styles.secondaryTxt}>View live</Text>
                        </TouchableOpacity>
                      ) : null}
                      <TouchableOpacity
                        activeOpacity={0.88}
                        onPress={() => {
                          trackRevealCta('pulse_shop');
                          router.push('/pulse-shop' as any);
                          void closeModal('acknowledged');
                        }}
                        style={styles.primaryBtn}
                      >
                        <LinearGradient colors={[...gradients.ctaSheet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryGrad}>
                          <Text style={styles.primaryTxt}>Open Pulse Shop</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </>
                  ) : null}

                  {delivery.item_type === 'future_item' &&
                  (metaKind === 'pulse_leaderboard_frame' || metaKind === 'beta_tester_frame') ? (
                    <TouchableOpacity
                      activeOpacity={0.88}
                      onPress={() => {
                        trackRevealCta('customize_appearance');
                        router.push('/my-pulse-appearance' as any);
                        void closeModal('acknowledged');
                      }}
                      style={styles.primaryBtn}
                    >
                      <LinearGradient colors={[...gradients.ctaSheet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryGrad}>
                        <Text style={styles.primaryTxt}>Open Customize</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  ) : null}

                  {delivery.item_type === 'future_item' &&
                  metaKind !== 'pulse_leaderboard_frame' &&
                  metaKind !== 'beta_tester_frame' ? (
                    <TouchableOpacity
                      activeOpacity={0.88}
                      onPress={() => {
                        trackRevealCta('continue');
                        void closeModal('acknowledged');
                      }}
                      style={styles.primaryBtn}
                    >
                      <LinearGradient colors={[...gradients.ctaSheet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryGrad}>
                        <Text style={styles.primaryTxt}>Continue</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  ) : null}

                  <TouchableOpacity
                    activeOpacity={0.88}
                    onPress={() => {
                      trackRevealCta('done');
                      void closeModal('acknowledged');
                    }}
                    style={styles.doneGhost}
                  >
                    <Text style={styles.doneGhostTxt}>Done</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          </LinearGradient>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  androidDim: { backgroundColor: 'rgba(2,6,23,0.78)' },
  closeBtn: {
    alignSelf: 'flex-end',
    padding: 10,
    marginRight: 6,
    zIndex: 4,
  },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: spacing.lg },
  cardEdge: {
    borderRadius: 26,
    padding: 2,
    maxWidth: 460,
    width: '100%',
    alignSelf: 'center',
  },
  card: {
    borderRadius: 24,
    backgroundColor: 'rgba(12,18,32,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.14)',
    paddingTop: 28,
    paddingBottom: 22,
    paddingHorizontal: 20,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: pulseverse.electricMuted,
    textAlign: 'center',
  },
  title: {
    marginTop: 10,
    fontSize: 22,
    fontWeight: '900',
    color: colors.dark.text,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  revealRarityRow: {
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sub: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: '600',
    color: colors.dark.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  subEm: { color: pulseverse.electricSoft, fontWeight: '900' },
  subMuted: { fontSize: 13, fontWeight: '600', color: colors.dark.textMuted },
  tapHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    paddingVertical: 6,
  },
  tapHintTxt: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(226,232,240,0.65)',
    letterSpacing: 0.2,
  },
  stage: {
    marginTop: 22,
    minHeight: 300,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  /** Centers gift box + revealed reward on the same focal point (reward draws above). */
  stageFocus: {
    width: '100%',
    minHeight: 300,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  stageBurstLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  stageGiftLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageRewardLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 3,
  },
  actions: { marginTop: 22, gap: 12 },
  primaryBtn: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  primaryGrad: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryTxt: { fontSize: 16, fontWeight: '900', color: '#fff' },
  secondaryBtn: {
    alignSelf: 'stretch',
    paddingVertical: 13,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.35)',
    backgroundColor: 'rgba(8,14,28,0.65)',
    alignItems: 'center',
  },
  secondaryTxt: { fontSize: 15, fontWeight: '800', color: pulseverse.electricSoft },
  tertiaryBtn: { alignSelf: 'center', paddingVertical: 6 },
  tertiaryTxt: { fontSize: 14, fontWeight: '700', color: colors.dark.textMuted },
  doneGhost: { alignSelf: 'center', paddingVertical: 8 },
  doneGhostTxt: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.45)' },
});
