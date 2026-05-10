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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Crypto from 'expo-crypto';
import { colors, borderRadius, layout, typography, pulseverse, shadows } from '@/theme';
import { pulseImageListThumbProps } from '@/lib/pulseImage';
import { useAuth } from '@/contexts/AuthContext';
import { useShopCatalog, useSparkWallet, useShopRefetchers, useSparkBalanceNumber, useShopDerived } from '@/hooks/useShopEconomy';
import { purchaseService } from '@/services/shop/purchaseService';
import type { ShopItemRow } from '@/lib/shop/types';
import { giftIconFromItem } from '@/lib/shop/catalogUtils';
import { analytics } from '@/lib/analytics';
import { shopErrorHint } from '@/lib/shop/shopErrors';
import { useToast } from '@/components/ui/Toast';
import { ShopResultModal } from '@/components/shop/ShopResultModal';

export type CreatorGiftContext = 'live' | 'post' | 'profile';

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
  const toast = useToast((s) => s.show);
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
  const [celebration, setCelebration] = useState<{ title: string; message: string } | null>(null);

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
      setCelebration(null);
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

  const openConfirm = (g: ShopItemRow) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const price = g.spark_price ?? 0;
    if (sparks < price) {
      analytics.track('insufficient_sparks_prompt_shown', {
        needed: price,
        have: sparks,
        surface: 'creator_gift_tray',
      });
      toast(`You need ${price.toLocaleString()} Sparks. Top up in Pulse Shop.`, 'error');
      return;
    }
    setPicked(g);
    setConfirmOpen(true);
  };

  const sendGift = async () => {
    if (!picked || !userId) return;
    setSending(true);
    try {
      const idem = Crypto.randomUUID();
      const res = await purchaseService.sendCreatorGift({
        giftItem: picked,
        creatorUserId,
        contextType,
        contextId,
        idempotencyKey: idem,
      });
      if (!res.ok) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        toast(shopErrorHint(res.code) || res.message, 'error');
        return;
      }
      await refreshAfterPurchase();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      analytics.track('gift_sent', {
        gift_id: picked.id,
        creator_id: creatorUserId,
        context_type: contextType,
        context_id: contextId,
        sparks: picked.spark_price,
      });
      setCelebration({
        title: 'Gift delivered',
        message: `You sent ${picked.name} with Sparks.${creatorDisplayName ? ` Thanks for supporting ${creatorDisplayName}.` : ''} Your balance is updated.`,
      });
    } finally {
      setSending(false);
    }
  };

  const finishCelebration = useCallback(() => {
    setCelebration(null);
    onSent?.();
    handleClose();
  }, [handleClose, onSent]);

  const goGetSparks = () => {
    analytics.track('insufficient_sparks_prompt_shown', {
      action: 'get_sparks_cta',
      surface: 'creator_gift_tray',
    });
    handleClose();
    router.push('/pulse-shop?tab=credits' as any);
  };

  const ctxLabel =
    contextType === 'live' ? 'Live' : contextType === 'post' ? 'Post' : 'Profile';

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={sending || celebration ? () => undefined : handleClose}
      >
        <Pressable style={styles.backdrop} onPress={sending || celebration ? undefined : handleClose}>
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
                <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
                  {sortedGifts.map((g) => {
                    const price = g.spark_price ?? 0;
                    const short = sparks < price;
                    const contexts = g.gift_contexts ?? [];
                    const allowed = contexts.length === 0 || contexts.includes(contextType);
                    return (
                      <TouchableOpacity
                        key={g.id}
                        style={[styles.giftRow, !allowed && styles.giftRowDisabled]}
                        disabled={!allowed || sending}
                        onPress={() => allowed && openConfirm(g)}
                        activeOpacity={0.88}
                      >
                        <View style={styles.giftOrb}>
                          {g.image_url ? (
                            <Image source={{ uri: g.image_url }} style={styles.giftImg} {...pulseImageListThumbProps} />
                          ) : (
                            <Ionicons name={giftIconFromItem(g) as any} size={22} color={pulseverse.electric} />
                          )}
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
      visible={!!celebration}
      variant="success"
      title={celebration?.title ?? ''}
      message={celebration?.message}
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
  },
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
  giftImg: { width: 48, height: 48, borderRadius: borderRadius.full },
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
