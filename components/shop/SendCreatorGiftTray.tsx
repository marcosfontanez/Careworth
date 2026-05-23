import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Crypto from 'expo-crypto';
import { colors, borderRadius, layout, typography, pulseverse, shadows } from '@/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useShopCatalog, useSparkWallet, useShopRefetchers, useSparkBalanceNumber, useShopDerived } from '@/hooks/useShopEconomy';
import { purchaseService } from '@/services/shop/purchaseService';
import { shopQueriesService } from '@/services/shop/shopQueries';
import type { GiftContext, ShopItemRow } from '@/lib/shop/types';
import {
  CREATOR_GIFT_TIER_META,
  CREATOR_GIFT_TIER_ORDER,
  type GiftTierFilter,
  creatorGiftTierForItem,
  groupGiftsByTier,
} from '@/lib/shop/creatorGiftTiers';
import { CreatorGiftOrb } from '@/components/shop/CreatorGiftOrb';
import { analytics } from '@/lib/analytics';
import { shopErrorHint } from '@/lib/shop/shopErrors';
import { ShopResultModal } from '@/components/shop/ShopResultModal';

/** Matches economy RPC `p_context_type` (`live` = `/live/:id`). Receipt metadata may use reason `live_stream`. */
export type CreatorGiftContext = 'live' | 'post' | 'profile';

function giftContextSurfaceLabel(c: GiftContext): string {
  if (c === 'live') return 'Live';
  if (c === 'post') return 'Posts';
  return 'Profiles';
}

type Props = {
  visible: boolean;
  onClose: () => void;
  creatorUserId: string;
  creatorDisplayName?: string | null;
  creatorHandle?: string | null;
  creatorAvatarUrl?: string | null;
  contextType: CreatorGiftContext;
  contextId: string | null;
  onSent?: () => void;
};

export function SendCreatorGiftTray({
  visible,
  onClose,
  creatorUserId,
  creatorDisplayName,
  creatorHandle,
  contextType,
  contextId,
  onSent,
}: Props) {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const userId = authUser?.id;
  const catalogQ = useShopCatalog();
  const { gifts } = useShopDerived(catalogQ.data);
  const walletQ = useSparkWallet(userId);
  const sparks = useSparkBalanceNumber(walletQ.data);
  const { refreshAfterPurchase } = useShopRefetchers(userId);

  const [picked, setPicked] = useState<ShopItemRow | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  /** Success modal open — hides sheet Modal so it stacks above (RN Modal order). */
  const [sentCelebrationOpen, setSentCelebrationOpen] = useState(false);
  const [sentGiftName, setSentGiftName] = useState<string | null>(null);
  const [giftTierFilter, setGiftTierFilter] = useState<GiftTierFilter>('all');

  const recipientDisplay = useMemo(() => {
    const name = creatorDisplayName?.trim();
    if (name) return name;
    const h = creatorHandle?.trim();
    if (h) return `@${h}`;
    return 'This creator';
  }, [creatorDisplayName, creatorHandle]);

  const senderGiftContextNavigate = useMemo(() => {
    const id = contextId?.trim();
    if (!id) return null;
    if (contextType === 'post') return { label: 'View post', href: `/post/${id}` } as const;
    if (contextType === 'profile') return { label: 'View profile', href: `/profile/${id}` } as const;
    if (contextType === 'live') return { label: 'View live', href: `/live/${encodeURIComponent(id)}` } as const;
    return null;
  }, [contextType, contextId]);

  useEffect(() => {
    if (visible && userId) {
      void walletQ.refetch();
    }
  }, [visible, userId]);

  useEffect(() => {
    if (visible) {
      setPicked(null);
      setConfirmOpen(false);
      setSending(false);
      setSentCelebrationOpen(false);
      setSentGiftName(null);
      setGiftTierFilter('all');
    }
  }, [visible]);

  const reset = useCallback(() => {
    setPicked(null);
    setConfirmOpen(false);
    setSending(false);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  const sortedGifts = useMemo(
    () => [...gifts].sort((a, b) => (a.spark_price ?? 0) - (b.spark_price ?? 0)),
    [gifts],
  );

  const giftsByTier = useMemo(() => groupGiftsByTier(sortedGifts), [sortedGifts]);

  const visibleTrayGifts = useMemo(() => {
    if (giftTierFilter === 'all') return sortedGifts;
    return giftsByTier.get(giftTierFilter) ?? [];
  }, [giftTierFilter, giftsByTier, sortedGifts]);

  const goGetSparks = useCallback(() => {
    analytics.track('insufficient_sparks_prompt_shown', {
      action: 'get_sparks_cta',
      surface: 'creator_gift_tray',
    });
    handleClose();
    router.push('/pulse-shop?tab=sparks' as any);
  }, [handleClose, router]);

  const openConfirm = (g: ShopItemRow) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const price = g.spark_price ?? 0;
    if (sparks < price) {
      analytics.track('insufficient_sparks_prompt_shown', {
        needed: price,
        have: sparks,
        surface: 'creator_gift_tray',
      });
      /** RN Modal sits above {@link ToastContainer} — Alert is visible on top. */
      Alert.alert(
        'Not enough Sparks',
        `You need ${price.toLocaleString()} Sparks. You have ${Math.max(0, sparks).toLocaleString()}.`,
        [
          { text: 'OK', style: 'cancel' },
          { text: 'Get Sparks', onPress: goGetSparks },
        ],
      );
      return;
    }
    setPicked(g);
    setConfirmOpen(true);
  };

  const onGiftRowPress = (g: ShopItemRow, contexts: GiftContext[], allowed: boolean) => {
    if (sending) return;
    if (!allowed) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      const where =
        contexts.length > 0
          ? contexts.map((c) => giftContextSurfaceLabel(c)).join(' · ')
          : 'Live · Posts · Profiles';
      Alert.alert(
        'Not available here',
        `This gift can only be sent from: ${where}. Open one of their posts or a live stream to send it.`,
      );
      return;
    }
    openConfirm(g);
  };

  const sendGift = async () => {
    const gift = picked;
    if (!gift || !userId) return;
    setSending(true);
    try {
      try {
        await shopQueriesService.ensureWallets(userId);
      } catch (wErr) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          'Could not send gift',
          wErr instanceof Error ? wErr.message : 'Wallet setup failed. Try again after signing in.',
        );
        return;
      }

      const idem = Crypto.randomUUID();
      const res = await purchaseService.sendCreatorGift({
        giftItem: gift,
        creatorUserId,
        contextType,
        contextId,
        idempotencyKey: idem,
      });
      if (!res.ok) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Could not send gift', shopErrorHint(res.code) || res.message);
        return;
      }
      setConfirmOpen(false);
      setPicked(null);
      setSentGiftName(gift.name);
      await refreshAfterPurchase();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      analytics.track('gift_sent', {
        gift_id: gift.id,
        creator_id: creatorUserId,
        context_type: contextType,
        context_id: contextId,
        sparks: gift.spark_price,
      });
      setSentCelebrationOpen(true);
    } catch (err) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Could not send gift',
        err instanceof Error ? err.message : 'Something went wrong. Try again.',
      );
      if (__DEV__) console.warn('[SendCreatorGiftTray.sendGift]', err);
    } finally {
      setSending(false);
    }
  };

  const finishCelebration = useCallback(() => {
    setSentCelebrationOpen(false);
    setSentGiftName(null);
    onSent?.();
    handleClose();
  }, [handleClose, onSent]);

  const ctxLabel =
    contextType === 'live' ? 'Live' : contextType === 'post' ? 'Post' : 'Profile';

  return (
    <>
      <Modal
        visible={visible && !sentCelebrationOpen}
        animationType="slide"
        transparent
        onRequestClose={sending || sentCelebrationOpen ? () => undefined : handleClose}
      >
        <Pressable style={styles.backdrop} onPress={sending || sentCelebrationOpen ? undefined : handleClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <LinearGradient
            colors={['#A78BFA', pulseverse.electric]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.sheetAccentStripe}
          />
          <View style={styles.handle} />
          <View style={styles.modeRow}>
            <View style={styles.modeBadge}>
              <Ionicons name="flash" size={14} color="#A5F3FC" />
              <Text style={styles.modeBadgeText}>Creator gift · Sparks only</Text>
            </View>
          </View>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Send a gift</Text>
              <Text style={styles.sub}>
                {creatorDisplayName ?? 'Creator'}
                {creatorHandle ? ` · @${creatorHandle}` : ''} · {ctxLabel}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.balanceBadge}
              onPress={goGetSparks}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Get Sparks"
            >
              <Ionicons name="flash" size={14} color="#38BDF8" />
              {walletQ.isLoading && !walletQ.data ? (
                <ActivityIndicator size="small" color="#38BDF8" style={{ marginLeft: 4 }} />
              ) : (
                <Text style={styles.balanceText}>{sparks.toLocaleString()}</Text>
              )}
            </TouchableOpacity>
          </View>

          {!confirmOpen ? (
            <>
              {catalogQ.isLoading ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator color={pulseverse.electric} />
                  <Text style={styles.loadingText}>Loading gifts…</Text>
                </View>
              ) : sortedGifts.length === 0 ? (
                <Text style={styles.empty}>No gifts in the catalog yet. Check back soon.</Text>
              ) : (
                <>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.tierChipsRow}
                  >
                    <TouchableOpacity
                      style={[styles.tierChip, giftTierFilter === 'all' && styles.tierChipOn]}
                      onPress={() => {
                        void Haptics.selectionAsync();
                        setGiftTierFilter('all');
                      }}
                      activeOpacity={0.88}
                    >
                      <Text style={[styles.tierChipTxt, giftTierFilter === 'all' && styles.tierChipTxtOn]}>
                        All
                      </Text>
                    </TouchableOpacity>
                    {CREATOR_GIFT_TIER_ORDER.map((tid) => {
                      const count = giftsByTier.get(tid)?.length ?? 0;
                      if (count === 0) return null;
                      const meta = CREATOR_GIFT_TIER_META[tid];
                      const on = giftTierFilter === tid;
                      return (
                        <TouchableOpacity
                          key={tid}
                          style={[styles.tierChip, on && styles.tierChipOn]}
                          onPress={() => {
                            void Haptics.selectionAsync();
                            setGiftTierFilter(tid);
                          }}
                          activeOpacity={0.88}
                        >
                          <Ionicons
                            name={meta.icon}
                            size={13}
                            color={on ? '#0F172A' : meta.iconColor}
                            style={{ marginRight: 5 }}
                          />
                          <Text style={[styles.tierChipTxt, on && styles.tierChipTxtOn]}>{meta.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                  <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
                    {visibleTrayGifts.map((g) => {
                    const price = g.spark_price ?? 0;
                    const short = sparks < price;
                    const contexts = (g.gift_contexts ?? []) as GiftContext[];
                    const allowed = contexts.length === 0 || contexts.includes(contextType);
                    const tier = creatorGiftTierForItem(g);
                    return (
                      <TouchableOpacity
                        key={g.id}
                        style={[
                          styles.giftRow,
                          !allowed && styles.giftRowDisabled,
                          { borderLeftColor: CREATOR_GIFT_TIER_META[tier].cardAccent },
                        ]}
                        disabled={sending}
                        onPress={() => onGiftRowPress(g, contexts, allowed)}
                        activeOpacity={0.88}
                      >
                        <View style={styles.giftOrb}>
                          <CreatorGiftOrb item={g} size={48} />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.giftName} numberOfLines={1}>
                            {g.name}
                          </Text>
                          <Text style={styles.giftMeta} numberOfLines={1}>
                            {contexts.map((c) => (c === 'live' ? 'Live' : c === 'post' ? 'Posts' : 'Profile')).join(' · ')}
                          </Text>
                        </View>
                        <View style={styles.giftRight}>
                          <Text style={[styles.price, short && styles.priceWarn]}>
                            {price.toLocaleString()}
                          </Text>
                          {!allowed ? (
                            <Text style={styles.naTag}>N/A</Text>
                          ) : short ? (
                            <Text style={styles.getSparksSmall}>Need Sparks</Text>
                          ) : (
                            <Ionicons name="chevron-forward" size={16} color={colors.dark.textMuted} />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                </>
              )}
              <TouchableOpacity style={styles.getSparksCta} onPress={goGetSparks} activeOpacity={0.88}>
                <Ionicons name="wallet-outline" size={18} color="#050A14" />
                <Text style={styles.getSparksCtaText}>Get Sparks</Text>
              </TouchableOpacity>
            </>
          ) : picked ? (
            <View style={styles.confirmPane}>
              <Text style={styles.confirmTitle}>Confirm gift</Text>
              <Text style={styles.confirmBody}>
                Send <Text style={{ fontWeight: '900' }}>{picked.name}</Text> for{' '}
                <Text style={{ fontWeight: '900', color: pulseverse.electricSoft }}>
                  {(picked.spark_price ?? 0).toLocaleString()} Sparks
                </Text>
                ?
              </Text>
              <View style={styles.confirmActions}>
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={() => setConfirmOpen(false)}
                  disabled={sending}
                >
                  <Text style={styles.secondaryBtnText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={sendGift}
                  disabled={sending}
                >
                  {sending ? (
                    <ActivityIndicator color="#050A14" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Send</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
    <ShopResultModal
      visible={sentCelebrationOpen}
      variant="success"
      title="Gift sent"
      message={`You sent ${sentGiftName ?? 'a gift'} with Sparks. Your balance is updated.`}
      pulseCelebration={{
        kind: 'gift_sent',
        recipient: recipientDisplay,
        sentKind: 'creator_sparks',
        contextNavigate: senderGiftContextNavigate,
      }}
      secondaryLabel="Done"
      onClose={finishCelebration}
    />
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5,8,14,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '88%',
    backgroundColor: colors.dark.card,
    borderTopLeftRadius: borderRadius.sheet,
    borderTopRightRadius: borderRadius.sheet,
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.22)',
    paddingBottom: 28,
    paddingHorizontal: layout.screenPadding,
    overflow: 'hidden',
  },
  sheetAccentStripe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  modeRow: { marginBottom: 10 },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(99,102,241,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.45)',
  },
  modeBadgeText: { fontSize: 11, fontWeight: '800', color: '#E9D5FF' },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginTop: 10,
    marginBottom: 14,
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
  title: { ...typography.h3, color: colors.dark.text, fontWeight: '900' },
  sub: { marginTop: 4, fontSize: 12, color: colors.dark.textMuted, fontWeight: '600' },
  balanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(15,28,48,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.4)',
  },
  balanceText: { fontSize: 13, fontWeight: '800', color: colors.dark.text },
  list: { maxHeight: 380 },
  listContent: { paddingBottom: 8, gap: 8 },
  giftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.dark.cardAlt,
    borderWidth: 1,
    borderColor: colors.dark.borderSubtle,
    borderLeftWidth: 3,
  },
  tierChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 12,
    marginHorizontal: -2,
  },
  tierChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
    backgroundColor: 'rgba(15,23,42,0.55)',
  },
  tierChipOn: {
    borderColor: 'rgba(34,211,238,0.5)',
    backgroundColor: 'rgba(34,211,238,0.22)',
  },
  tierChipTxt: { fontSize: 11, fontWeight: '800', color: colors.dark.textSecondary },
  tierChipTxtOn: { color: '#0F172A' },
  giftRowDisabled: { opacity: 0.48 },
  giftOrb: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(56,189,248,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  giftName: { fontSize: 15, fontWeight: '900', color: colors.dark.text },
  giftMeta: { marginTop: 2, fontSize: 11, color: colors.dark.textMuted, fontWeight: '600' },
  giftRight: { alignItems: 'flex-end' },
  price: { fontSize: 14, fontWeight: '900', color: pulseverse.electricSoft },
  priceWarn: { color: colors.status.error },
  naTag: { fontSize: 10, fontWeight: '800', color: colors.dark.textQuiet },
  getSparksSmall: { fontSize: 10, fontWeight: '800', color: '#F87171' },
  getSparksCta: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    backgroundColor: pulseverse.electric,
    ...shadows.ctaSoft,
  },
  getSparksCtaText: { fontSize: 15, fontWeight: '900', color: pulseverse.onElectric },
  loadingBox: { paddingVertical: 40, alignItems: 'center' },
  loadingText: { marginTop: 10, color: colors.dark.textMuted, fontWeight: '600' },
  empty: { ...typography.body, color: colors.dark.textMuted, textAlign: 'center', paddingVertical: 24 },
  confirmPane: { paddingTop: 8 },
  confirmTitle: { fontSize: 18, fontWeight: '900', color: colors.dark.text },
  confirmBody: { marginTop: 10, fontSize: 14, lineHeight: 20, color: colors.dark.textSecondary, fontWeight: '500' },
  confirmActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.dark.border,
    alignItems: 'center',
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '800', color: colors.dark.textSecondary },
  primaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    backgroundColor: pulseverse.electric,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.ctaSoft,
  },
  primaryBtnText: { fontSize: 15, fontWeight: '900', color: pulseverse.onElectric },
});
