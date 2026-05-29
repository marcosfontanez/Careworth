import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import { PulseButton, PulseEmptyState, PulseGlassCard, PulseLoadingSkeleton } from '@/components/ui/pulse';
import { pulseColors, pulseRadius, pulseSpacing, pulseTypography } from '@/lib/theme/pulseTheme';
import { useAuth } from '@/contexts/AuthContext';
import {
  useShopCatalog,
  useShopDerived,
  useShopRefetchers,
  useSparkBalanceNumber,
  useSparkWallet,
} from '@/hooks/useShopEconomy';
import { CreatorGiftOrb } from '@/components/shop/CreatorGiftOrb';
import {
  CREATOR_GIFT_TIER_META,
  CREATOR_GIFT_TIER_ORDER,
  creatorGiftTierForItem,
  groupGiftsByTier,
  type GiftTierFilter,
} from '@/lib/shop/creatorGiftTiers';
import { sendLiveCreatorGift, validateLiveCreatorGiftSend } from '@/lib/gifts/GiftTransactionService';
import { shopErrorHint } from '@/lib/shop/shopErrors';
import type { GiftContext, ShopItemRow } from '@/lib/shop/types';
import { analytics } from '@/lib/analytics';

export type LiveGiftSentPayload = {
  giftSlug: string;
  giftName: string;
  shopItem: ShopItemRow;
};

type Props = {
  streamId: string;
  streamStatus?: string | null;
  broadcastLive: boolean;
  creatorUserId: string;
  creatorDisplayName?: string | null;
  creatorHandle?: string | null;
  onSent?: (payload: LiveGiftSentPayload) => void;
  onClose?: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
};

function giftAllowedOnLive(g: ShopItemRow): boolean {
  const contexts = (g.gift_contexts ?? []) as GiftContext[];
  return contexts.length === 0 || contexts.includes('live');
}

/** Premium live gift drawer — shop catalog, Sparks debit, creator Diamonds credit. */
export function LiveGiftDrawer({
  streamId,
  streamStatus,
  broadcastLive,
  creatorUserId,
  creatorDisplayName,
  creatorHandle,
  onSent,
  onClose,
  showToast,
}: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id;
  const catalogQ = useShopCatalog();
  const { gifts } = useShopDerived(catalogQ.data);
  const walletQ = useSparkWallet(userId);
  const sparks = useSparkBalanceNumber(walletQ.data);
  const { refreshAfterPurchase } = useShopRefetchers(userId);

  const [tierFilter, setTierFilter] = useState<GiftTierFilter>('all');
  const [picked, setPicked] = useState<ShopItemRow | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const sendLockRef = useRef(false);

  const recipientLabel = useMemo(() => {
    const name = creatorDisplayName?.trim();
    if (name) return name;
    const h = creatorHandle?.trim();
    if (h) return `@${h}`;
    return 'the host';
  }, [creatorDisplayName, creatorHandle]);

  useEffect(() => {
    if (userId) void walletQ.refetch();
  }, [userId, walletQ]);

  const liveGifts = useMemo(
    () => [...gifts].filter(giftAllowedOnLive).sort((a, b) => (a.spark_price ?? 0) - (b.spark_price ?? 0)),
    [gifts],
  );

  const giftsByTier = useMemo(() => groupGiftsByTier(liveGifts), [liveGifts]);

  const visibleGifts = useMemo(() => {
    if (tierFilter === 'all') return liveGifts;
    return giftsByTier.get(tierFilter) ?? [];
  }, [tierFilter, giftsByTier, liveGifts]);

  const featuredGifts = useMemo(() => {
    const flagged = liveGifts.filter(
      (g) => (g.metadata as { featured?: boolean } | null)?.featured === true,
    );
    const pool = flagged.length > 0 ? flagged : liveGifts.slice(-3).reverse();
    return pool.slice(0, 4);
  }, [liveGifts]);

  const goGetSparks = useCallback(() => {
    analytics.track('insufficient_sparks_prompt_shown', {
      action: 'get_sparks_cta',
      surface: 'live_gift_drawer',
    });
    onClose?.();
    router.push('/pulse-shop?tab=sparks' as never);
  }, [onClose, router]);

  const tryPickGift = useCallback(
    (gift: ShopItemRow) => {
      if (sending || sendLockRef.current) return;

      const validation = validateLiveCreatorGiftSend({
        viewerUserId: userId,
        hostUserId: creatorUserId,
        streamId,
        streamStatus,
        broadcastLive,
        giftItem: gift,
      });
      if (!validation.ok) {
        showToast(validation.message, 'info');
        return;
      }

      const price = gift.spark_price ?? 0;
      if (sparks < price) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        showToast(
          `Need ${price.toLocaleString()} Sparks — you have ${Math.max(0, sparks).toLocaleString()}.`,
          'info',
        );
        return;
      }

      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setPicked(gift);
      setConfirmOpen(true);
    },
    [sending, userId, creatorUserId, streamId, streamStatus, broadcastLive, sparks, showToast],
  );

  const handleSend = useCallback(async () => {
    const gift = picked;
    if (!gift || !userId || sending || sendLockRef.current) return;

    sendLockRef.current = true;
    setSending(true);

    try {
      const validation = validateLiveCreatorGiftSend({
        viewerUserId: userId,
        hostUserId: creatorUserId,
        streamId,
        streamStatus,
        broadcastLive,
        giftItem: gift,
      });
      if (!validation.ok) {
        showToast(validation.message, 'error');
        setConfirmOpen(false);
        return;
      }

      const res = await sendLiveCreatorGift({
        giftItem: gift,
        streamId,
        hostUserId: creatorUserId,
        viewerUserId: userId,
        streamStatus,
        broadcastLive,
        idempotencyKey: Crypto.randomUUID(),
      });

      if (!res.ok) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        showToast(shopErrorHint(res.code) || res.message || 'Could not send gift.', 'error');
        return;
      }

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      analytics.track('gift_sent', {
        gift_id: gift.id,
        creator_id: creatorUserId,
        context_type: 'live',
        context_id: streamId,
        sparks: gift.spark_price,
        surface: 'live_gift_drawer',
      });

      await refreshAfterPurchase();
      setConfirmOpen(false);
      setPicked(null);
      showToast(`Gift sent to ${recipientLabel}!`, 'success');
      onSent?.({
        giftSlug: gift.slug,
        giftName: gift.name,
        shopItem: gift,
      });
      onClose?.();
    } catch (err) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast(err instanceof Error ? err.message : 'Could not send gift. Try again.', 'error');
      if (__DEV__) console.warn('[LiveGiftDrawer.send]', err);
    } finally {
      setSending(false);
      setTimeout(() => {
        sendLockRef.current = false;
      }, 700);
    }
  }, [
    picked,
    userId,
    sending,
    creatorUserId,
    streamId,
    streamStatus,
    broadcastLive,
    refreshAfterPurchase,
    recipientLabel,
    showToast,
    onSent,
    onClose,
  ]);

  const renderGiftTile = (gift: ShopItemRow, featured = false) => {
    const price = gift.spark_price ?? 0;
    const canAfford = sparks >= price;
    const tier = creatorGiftTierForItem(gift);
    const tierMeta = CREATOR_GIFT_TIER_META[tier];
    const isPremium = tier === 'zenith' || tier === 'supernova' || tier === 'constellation';

    return (
      <Pressable
        key={gift.id}
        onPress={() => tryPickGift(gift)}
        disabled={sending}
        style={({ pressed }) => [
          styles.tile,
          featured && styles.tileFeatured,
          isPremium && styles.tilePremium,
          !canAfford && styles.tileDisabled,
          pressed && !sending && styles.tilePressed,
        ]}
      >
        {isPremium ? (
          <LinearGradient
            colors={['rgba(250,204,21,0.12)', 'rgba(167,139,250,0.08)']}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        <View style={[styles.orbRing, { borderColor: tierMeta.cardAccent }]}>
          <CreatorGiftOrb item={gift} size={featured ? 52 : 46} />
        </View>
        <Text style={styles.tileName} numberOfLines={2}>
          {gift.name}
        </Text>
        <View style={styles.priceRow}>
          <Ionicons name="flash" size={11} color={canAfford ? pulseColors.teal : pulseColors.danger} />
          <Text style={[styles.tilePrice, !canAfford && styles.tilePriceWarn]}>
            {price.toLocaleString()}
          </Text>
        </View>
        {!canAfford ? (
          <Text style={styles.needSparks}>Need Sparks</Text>
        ) : null}
      </Pressable>
    );
  };

  if (confirmOpen && picked) {
    const price = picked.spark_price ?? 0;
    return (
      <View style={styles.wrap}>
        <PulseGlassCard featured style={styles.confirmCard}>
          <Text style={styles.confirmTitle}>Send gift?</Text>
          <View style={styles.confirmOrb}>
            <CreatorGiftOrb item={picked} size={64} />
          </View>
          <Text style={styles.confirmGiftName}>{picked.name}</Text>
          <Text style={styles.confirmBody}>
            Send to <Text style={styles.confirmBold}>{recipientLabel}</Text> for{' '}
            <Text style={styles.confirmBold}>{price.toLocaleString()} Sparks</Text>
          </Text>
          <View style={styles.confirmActions}>
            <PulseButton
              label="Back"
              onPress={() => {
                if (!sending) setConfirmOpen(false);
              }}
              disabled={sending}
              variant="secondary"
              style={styles.confirmBtn}
            />
            <PulseButton
              label="Send gift"
              leftIcon="gift-outline"
              onPress={handleSend}
              disabled={sending}
              loading={sending}
              variant="gift"
              style={styles.confirmBtnPrimary}
            />
          </View>
        </PulseGlassCard>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Send a gift</Text>
          <Text style={styles.subtitle}>
            Support {recipientLabel} · Sparks send · Creators earn Diamonds
          </Text>
        </View>
        <Pressable style={styles.balancePill} onPress={goGetSparks}>
          <Ionicons name="flash" size={14} color={pulseColors.teal} />
          {walletQ.isLoading && !walletQ.data ? (
            <ActivityIndicator size="small" color={pulseColors.teal} />
          ) : (
            <Text style={styles.balanceTxt}>{Math.max(0, sparks).toLocaleString()}</Text>
          )}
        </Pressable>
      </View>

      {catalogQ.isLoading ? (
        <PulseLoadingSkeleton card style={styles.loadingBox} />
      ) : liveGifts.length === 0 ? (
        <PulseEmptyState
          icon="gift-outline"
          title="No live gifts"
          message="No live gifts available right now."
          style={styles.empty}
        />
      ) : (
        <>
          {featuredGifts.length > 0 ? (
            <>
              <Text style={styles.sectionLabel}>Featured</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.featuredRow}
              >
                {featuredGifts.map((g) => (
                  <View key={`feat-${g.id}`} style={styles.featuredWrap}>
                    {renderGiftTile(g, true)}
                  </View>
                ))}
              </ScrollView>
            </>
          ) : null}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            <Pressable
              style={[styles.chip, tierFilter === 'all' && styles.chipOn]}
              onPress={() => setTierFilter('all')}
            >
              <Text style={[styles.chipTxt, tierFilter === 'all' && styles.chipTxtOn]}>All</Text>
            </Pressable>
            {CREATOR_GIFT_TIER_ORDER.map((tid) => {
              const count = giftsByTier.get(tid)?.length ?? 0;
              if (count === 0) return null;
              const meta = CREATOR_GIFT_TIER_META[tid];
              const on = tierFilter === tid;
              return (
                <Pressable
                  key={tid}
                  style={[styles.chip, on && styles.chipOn]}
                  onPress={() => setTierFilter(tid)}
                >
                  <Ionicons
                    name={meta.icon}
                    size={12}
                    color={on ? '#0F172A' : meta.iconColor}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[styles.chipTxt, on && styles.chipTxtOn]}>{meta.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <ScrollView
            style={styles.gridScroll}
            contentContainerStyle={styles.grid}
            showsVerticalScrollIndicator={false}
          >
            {visibleGifts.map((g) => renderGiftTile(g))}
          </ScrollView>

          <PulseButton
            label="Get Sparks"
            leftIcon="wallet-outline"
            onPress={goGetSparks}
            variant="primary"
            fullWidth
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: pulseSpacing.md, paddingBottom: pulseSpacing.sm, maxHeight: 520 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  headerText: { flex: 1, gap: 4 },
  title: { ...pulseTypography.sectionTitle, fontSize: 18 },
  subtitle: { ...pulseTypography.caption, lineHeight: 16 },
  balancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: pulseSpacing.md,
    paddingVertical: pulseSpacing.sm,
    borderRadius: pulseRadius.full,
    backgroundColor: pulseColors.glass,
    borderWidth: 1,
    borderColor: pulseColors.borderStrong,
  },
  balanceTxt: { ...pulseTypography.caption, fontWeight: '900', color: pulseColors.text },
  sectionLabel: {
    ...pulseTypography.label,
    color: pulseColors.gift,
  },
  featuredRow: { gap: 10, paddingBottom: 4 },
  featuredWrap: { width: 118 },
  chipRow: { gap: pulseSpacing.sm, paddingVertical: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: pulseSpacing.md,
    paddingVertical: 7,
    borderRadius: pulseRadius.full,
    backgroundColor: pulseColors.glass,
    borderWidth: 1,
    borderColor: pulseColors.border,
  },
  chipOn: {
    backgroundColor: 'rgba(25, 211, 197, 0.14)',
    borderColor: pulseColors.borderAccent,
  },
  chipTxt: { ...pulseTypography.caption, fontWeight: '800', color: pulseColors.textSecondary },
  chipTxtOn: { color: pulseColors.onAccent },
  gridScroll: { maxHeight: 280 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 4,
  },
  tile: {
    width: '31%',
    minWidth: 100,
    flexGrow: 1,
    padding: 10,
    borderRadius: pulseRadius.lg,
    backgroundColor: pulseColors.glass,
    borderWidth: 1,
    borderColor: pulseColors.border,
    alignItems: 'center',
    gap: 6,
    overflow: 'hidden',
  },
  tileFeatured: {
    width: '100%',
    borderColor: 'rgba(246, 196, 83, 0.32)',
  },
  tilePremium: {
    borderColor: 'rgba(246, 196, 83, 0.28)',
  },
  tileDisabled: { opacity: 0.55 },
  tilePressed: { opacity: 0.9, transform: [{ scale: 0.97 }] },
  orbRing: {
    padding: 4,
    borderRadius: pulseRadius.full,
    borderWidth: 1,
    backgroundColor: 'rgba(7, 17, 31, 0.55)',
  },
  tileName: {
    ...pulseTypography.caption,
    fontSize: 11,
    fontWeight: '800',
    color: pulseColors.text,
    textAlign: 'center',
    minHeight: 28,
  },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  tilePrice: { ...pulseTypography.caption, fontWeight: '900', color: pulseColors.teal },
  tilePriceWarn: { color: pulseColors.danger },
  needSparks: { fontSize: 9, fontWeight: '800', color: pulseColors.danger },
  loadingBox: { marginVertical: pulseSpacing.lg },
  empty: { paddingVertical: pulseSpacing.xl },
  confirmCard: { alignItems: 'center', gap: pulseSpacing.sm },
  confirmTitle: { ...pulseTypography.sectionTitle },
  confirmOrb: { marginVertical: 4 },
  confirmGiftName: { ...pulseTypography.body, fontWeight: '900', color: pulseColors.gift },
  confirmBody: { ...pulseTypography.bodySmall, textAlign: 'center' },
  confirmBold: { fontWeight: '900', color: pulseColors.text },
  confirmActions: { flexDirection: 'row', gap: pulseSpacing.sm, marginTop: pulseSpacing.sm, width: '100%' },
  confirmBtn: { flex: 1 },
  confirmBtnPrimary: { flex: 1.2 },
});
