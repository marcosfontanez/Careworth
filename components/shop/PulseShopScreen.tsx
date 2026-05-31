import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, layout, typography, pulseverse, gradients, semantic, rarity, spacing, shadows } from '@/theme';
import { PageHeader } from '@/components/ui/PageHeader';
import { ShopHighlightNeonChip } from '@/components/shop/ShopHighlightNeonChip';
import { useToast } from '@/components/ui/Toast';
import { analytics } from '@/lib/analytics';
import { useAuth } from '@/contexts/AuthContext';
import { PROFILE_NEON_BORDER_PRESETS } from '@/components/mypage/ProfileNeonPills';
import {
  useShopCatalog,
  useSparkWallet,
  useDiamondWallet,
  useShopInventoryState,
  useShopDerived,
  useEnsureShopWallets,
  useShopRefetchers,
  useSparkBalanceNumber,
  useDiamondBalanceNumber,
  usePurchaseReceipts,
  useRetiredBorders,
} from '@/hooks/useShopEconomy';
import { purchaseService } from '@/services/shop/purchaseService';
import type { PurchaseReceiptRow, ShopItemRow } from '@/lib/shop/types';
import { ringPreviewColor, sparkPackLabel, isFreeShopBorder } from '@/lib/shop/catalogUtils';
import {
  CREATOR_GIFT_TIER_META,
  CREATOR_GIFT_TIER_ORDER,
  type GiftTierFilter,
  creatorGiftTierForItem,
  groupGiftsByTier,
} from '@/lib/shop/creatorGiftTiers';
import { CreatorGiftOrb } from '@/components/shop/CreatorGiftOrb';
import {
  BorderBuyConfirmModal,
  BorderGiftRecipientModal,
  BorderPurchaseChoiceModal,
  SparkGiftPreviewModal,
  CreditPackConfirmModal,
} from '@/components/shop/PulseShopModals';
import { BorderRarityBadge } from '@/components/shop/border/BorderRarityBadge';
import { CompactMetaChipPills } from '@/components/shop/border/BorderCompactMetaRow';
import { buildCompactMetaChips } from '@/lib/shop/borderDisplayModel';
import { BorderPreviewPlate } from '@/components/shop/border/BorderPreviewPlate';
import { FeaturedShopHero } from '@/components/shop/premium/FeaturedShopHero';
import { PremiumCardSparkBorder } from '@/components/shop/premium/PremiumCardSparkBorder';
import { BorderCard } from '@/components/shop/border/BorderCard';
import { BorderDetailModal } from '@/components/shop/border/BorderDetailModal';
import { useBorderCollectionsMap } from '@/hooks/useBorderCollectionsMap';
import { useBorderCatalogLists } from '@/hooks/useBorderCatalogFilters';
import { sortBorderItems } from '@/lib/shop/borderDisplayModel';
import { ShopResultModal, type PulseShopCelebrationPayload } from '@/components/shop/ShopResultModal';
import { ShopCatalogSkeleton } from '@/components/shop/ShopLoadingSkeleton';
import { DiamondsInfoModal } from '@/components/shop/DiamondsInfoModal';
import { queryClient } from '@/lib/queryClient';
import { shopKeys } from '@/lib/shop/queryKeys';
import { shopQueriesService } from '@/services/shop/shopQueries';
import { rewardDeliveriesService } from '@/services/supabase/rewardDeliveries';
import { rewardDeliveryKeys } from '@/lib/queryKeys';
import { buildBorderRewardMetadata } from '@/lib/rewardDelivery/buildBorderMetadata';
import { readPurchaseReceiptId, readUserInventoryId } from '@/lib/rewardDelivery/fulfillmentPayload';
import { rewardDeliveryDebug } from '@/lib/rewardDelivery/debugLog';
import { supabaseMessage } from '@/utils/supabaseErrors';
import { useGooglePlayProductPrefetch } from '@/hooks/useGooglePlayProductPrefetch';

/** Shown as native browser tooltip on web when hovering the Diamonds balance pill. */
const DIAMONDS_PILL_TOOLTIP_WEB =
  'Diamonds are what you earn when someone sends you a Sparks gift (live, on a post, or from your profile). Some may show as pending for a short hold, then move to available. Cashout will use available Diamonds when we turn that on.';

const { width: SCREEN_W } = Dimensions.get('window');
const H_PAD = layout.screenPadding;

type ShopTabKey = 'borders' | 'credits' | 'gifts' | 'more';

const TABS: { key: ShopTabKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'borders', label: 'Borders', icon: 'sparkles-outline' },
  { key: 'credits', label: 'Sparks', icon: 'flash-outline' },
  { key: 'gifts', label: 'Gifts', icon: 'gift-outline' },
  { key: 'more', label: 'More', icon: 'ellipsis-horizontal' },
];

type Celebration = null | PulseShopCelebrationPayload;

export default function PulseShopScreen() {
  const router = useRouter();
  const shopScreenFocused = useIsFocused();
  const { tab: tabParam } = useLocalSearchParams<{ tab?: string }>();
  const insets = useSafeAreaInsets();
  const showToast = useToast((s) => s.show);
  const { user: authUser, profile } = useAuth();
  const userId = authUser?.id;

  const initialTab = useMemo((): ShopTabKey => {
    const t = typeof tabParam === 'string' ? tabParam.toLowerCase() : '';
    if (t === 'sparks') return 'credits';
    if (t === 'credits' || t === 'gifts' || t === 'more' || t === 'borders') return t;
    return 'borders';
  }, [tabParam]);

  const [tab, setTab] = useState<ShopTabKey>(initialTab);
  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    analytics.track('shop_opened', { tab: initialTab });
  }, [initialTab]);

  useEnsureShopWallets(userId);

  const catalogQ = useShopCatalog();
  useGooglePlayProductPrefetch(catalogQ.data, shopScreenFocused);
  const walletQ = useSparkWallet(userId);
  const diamondQ = useDiamondWallet(userId);
  const sparkBalance = useSparkBalanceNumber(walletQ.data);
  const diamondBalanceTotal = useDiamondBalanceNumber(diamondQ.data);
  const invState = useShopInventoryState(userId);
  const { refreshAfterPurchase } = useShopRefetchers(userId);
  const receiptsQ = usePurchaseReceipts(userId);
  const shopReceipts: PurchaseReceiptRow[] = (receiptsQ.data ?? []) as PurchaseReceiptRow[];

  /**
   * Recovery pass (once per session): if a previous purchase was charged but
   * never granted — e.g. a transient failure, or store secrets were missing —
   * re-validate it server-side and credit it now. No-ops on web and when there
   * is nothing pending.
   */
  const reconciledRef = useRef(false);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (!shopScreenFocused || !userId || reconciledRef.current) return;
    reconciledRef.current = true;
    void (async () => {
      try {
        const r = await purchaseService.reconcilePendingStorePurchases(catalogQ.data);
        if (r.finished > 0) {
          await refreshAfterPurchase();
          showToast(
            `Recovered ${r.finished} pending purchase${r.finished === 1 ? '' : 's'} — your balance is updated.`,
            'success',
          );
        }
      } catch {
        /* best effort — never blocks the Shop */
      }
    })();
  }, [shopScreenFocused, userId, catalogQ.data, refreshAfterPurchase, showToast]);

  const { borders, packs, gifts, featured, browseBorders } = useShopDerived(catalogQ.data);

  const giftsByTier = useMemo(() => groupGiftsByTier(gifts), [gifts]);

  const collectionsQ = useBorderCollectionsMap();

  const [buyItem, setBuyItem] = useState<ShopItemRow | null>(null);
  const [giftBorderItem, setGiftBorderItem] = useState<ShopItemRow | null>(null);
  const [purchaseChoiceItem, setPurchaseChoiceItem] = useState<ShopItemRow | null>(null);
  const [borderDetailItem, setBorderDetailItem] = useState<ShopItemRow | null>(null);
  const [previewGift, setPreviewGift] = useState<ShopItemRow | null>(null);
  const [creditItem, setCreditItem] = useState<ShopItemRow | null>(null);
  const [celebration, setCelebration] = useState<Celebration>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [giftTierFilter, setGiftTierFilter] = useState<GiftTierFilter>('all');
  const [diamondsInfoOpen, setDiamondsInfoOpen] = useState(false);

  const browseTileW = useMemo(
    () => Math.min(154, Math.max(132, (SCREEN_W - H_PAD * 2 - 40) / 2.4)),
    [],
  );

  const onTab = useCallback((k: ShopTabKey) => {
    void Haptics.selectionAsync();
    setTab(k);
    analytics.track('shop_tab_viewed', { tab: k });
  }, []);

  const equipped = invState.equippedBorder;

  const borderOwnershipFor = useCallback(
    (b: ShopItemRow) => {
      const row = invState.inventoryRowForBorder(b.id);
      const owned = invState.ownsBorder(b.id);
      const isEq = equipped?.shop_item_id === b.id;
      return {
        owned,
        equipped: Boolean(isEq),
        inventoryRowId: row?.id,
      };
    },
    [invState, equipped?.shop_item_id],
  );

  const onPullRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        catalogQ.refetch(),
        walletQ.refetch(),
        diamondQ.refetch(),
        invState.refetch(),
        receiptsQ.refetch(),
        collectionsQ.refetch(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [catalogQ, walletQ, diamondQ, invState, receiptsQ, collectionsQ]);

  const handleEquip = useCallback(
    async (rowId: string) => {
      const r = await purchaseService.equipBorder(rowId);
      if (!r.ok) {
        showToast(r.message, 'error');
        return;
      }
      await invState.refetch();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Border equipped', 'success');
    },
    [invState, showToast],
  );

  const openBorderBuy = (b: ShopItemRow) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    analytics.track('border_purchase_started', { shop_item_id: b.id, surface: 'shop' });
    analytics.track('border_viewed', { shop_item_id: b.id, name: b.name });
    setBuyItem(b);
  };

  /** Paid shop borders: choose self vs gift first. Free borders: go straight to claim modal. */
  const startBorderShopCheckout = (b: ShopItemRow) => {
    if (isFreeShopBorder(b)) {
      openBorderBuy(b);
      return;
    }
    if (Platform.OS === 'web') {
      const p = b.real_money_display_price?.trim();
      showToast(
        p
          ? `Paid borders are purchased in the PulseVerse iOS/Android app (${p} in the catalog — charged by your app store).`
          : 'Paid borders are purchased in the PulseVerse iOS/Android app.',
        'info',
      );
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    analytics.track('border_purchase_started', { shop_item_id: b.id, surface: 'shop' });
    analytics.track('border_viewed', { shop_item_id: b.id, name: b.name });
    setPurchaseChoiceItem(b);
  };

  const feat = featured ?? browseBorders[0] ?? null;
  const [featuredSparkBox, setFeaturedSparkBox] = useState({ w: 0, h: 0 });

  useEffect(() => {
    setFeaturedSparkBox({ w: 0, h: 0 });
  }, [feat?.id]);

  const browseList = featured ? browseBorders : borders;

  /**
   * "Retired" drawer — when active, the browse strip swaps to a separate query of
   * borders that are no longer purchasable. Lazy-fetched so the drawer is free
   * unless the user opens it. Owned/Equipped state still resolves correctly via
   * `borderOwnershipFor`, so users can spot retired borders they already hold.
   */
  const [showRetired, setShowRetired] = useState(false);
  const retiredQ = useRetiredBorders(showRetired);
  const retiredBorders = useMemo(
    () => (retiredQ.data ?? []) as ShopItemRow[],
    [retiredQ.data],
  );

  const { processed: browseProcessedActive, filter: borderFilter, setFilter: setBorderFilter, sort: borderSort, setSort: setBorderSort } =
    useBorderCatalogLists(browseList, invState.ownsBorder);

  /**
   * Final list rendered in the browse strip. Retired drawer applies the same
   * sort selection but skips the active-catalog acquisition / owned filter (every
   * row in this list is, by definition, no longer purchasable).
   */
  const browseProcessed = useMemo(
    () => (showRetired ? sortBorderItems(retiredBorders, borderSort) : browseProcessedActive),
    [showRetired, retiredBorders, borderSort, browseProcessedActive],
  );

  const collectionNameFor = (b: ShopItemRow) =>
    b.collection_id ? collectionsQ.nameById.get(b.collection_id) ?? null : null;

  return (
    <View style={styles.root}>
      <LinearGradient colors={[...pulseverse.screenGradient]} style={StyleSheet.absoluteFill} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onPullRefresh}
            tintColor={semantic.accentCyan}
            colors={[semantic.accentCyan, semantic.accentCyanMuted]}
          />
        }
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 36 },
        ]}
      >
        <PageHeader
          insetTop={insets.top}
          onBack={() => router.back()}
          title="Pulse Shop"
          subtitle="Borders checkout in your app store · Sparks for gifts & creator support"
          layout="split"
          trailing={
            <View style={styles.headerWalletStack}>
              <View style={styles.sparksPill}>
                <Ionicons name="flash" size={15} color={pulseverse.electricSoft} style={{ marginRight: 6 }} />
                {walletQ.isLoading && !walletQ.data ? (
                  <ActivityIndicator size="small" color={pulseverse.electricSoft} />
                ) : !userId ? (
                  <Text style={styles.sparksSignedOut}>Sign in for balance</Text>
                ) : (
                  <View style={styles.sparksPillInner}>
                    <Text style={styles.sparksText}>
                      {sparkBalance.toLocaleString()} <Text style={styles.sparksLabel}>Sparks</Text>
                    </Text>
                    {walletQ.isFetching ? (
                      <ActivityIndicator size="small" color={pulseverse.electricSoft} style={{ marginLeft: 8 }} />
                    ) : null}
                  </View>
                )}
              </View>
              {userId ? (
                <TouchableOpacity
                  style={styles.diamondsPill}
                  accessibilityRole="button"
                  accessibilityLabel={`Diamonds ${diamondBalanceTotal.toLocaleString()}. Tap for details.`}
                  onPress={() => setDiamondsInfoOpen(true)}
                  activeOpacity={0.85}
                  {...(Platform.OS === 'web'
                    ? ({ title: DIAMONDS_PILL_TOOLTIP_WEB } as object)
                    : {})}
                >
                  <Ionicons name="diamond-outline" size={15} color={colors.primary.gold} style={{ marginRight: 6 }} />
                  {diamondQ.isLoading && !diamondQ.isFetched ? (
                    <ActivityIndicator size="small" color={colors.primary.gold} />
                  ) : (
                    <Text style={styles.diamondsPillText}>
                      {diamondBalanceTotal.toLocaleString()}{' '}
                      <Text style={styles.diamondsPillLabel}>Diamonds</Text>
                    </Text>
                  )}
                  {diamondQ.isFetching && diamondQ.isFetched ? (
                    <ActivityIndicator size="small" color={colors.primary.gold} style={{ marginLeft: 8 }} />
                  ) : null}
                  <Ionicons
                    name="information-circle-outline"
                    size={16}
                    color={colors.primary.gold}
                    style={{ marginLeft: 6, opacity: 0.85 }}
                  />
                </TouchableOpacity>
              ) : null}
            </View>
          }
        />

        <View style={styles.tabRow}>
          {TABS.map((t) => {
            const on = t.key === tab;
            return (
              <TouchableOpacity
                key={t.key}
                onPress={() => onTab(t.key)}
                style={styles.tabBtn}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={t.icon}
                  size={21}
                  color={on ? pulseverse.electric : colors.dark.textMuted}
                  style={on ? styles.tabIconGlow : undefined}
                />
                <Text style={[styles.tabLabel, on && styles.tabLabelActive]}>{t.label}</Text>
                {on ? <View style={styles.tabUnderline} /> : <View style={styles.tabUnderlinePlaceholder} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {catalogQ.isLoading && !catalogQ.data ? (
          <View style={styles.skeletonPane}>
            <ShopCatalogSkeleton />
            <Text style={styles.skeletonHint}>Loading your shop…</Text>
          </View>
        ) : catalogQ.isError ? (
          <View style={styles.skeletonPane}>
            <View style={styles.errorCard}>
              <Ionicons name="cloud-offline-outline" size={36} color={semantic.danger} />
              <Text style={styles.errorTitle}>Shop unavailable</Text>
              <Text style={styles.errorBanner}>
                Check your connection, then pull to refresh or try again.
              </Text>
              {catalogQ.error ? (
                <Text style={styles.errorDetail} selectable>
                  {supabaseMessage(catalogQ.error)}
                </Text>
              ) : null}
              {__DEV__ ? (
                <Text style={styles.errorDetail} selectable>
                  Supabase: {(process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'missing').replace(/^https:\/\//, '').replace(/\/$/, '')}
                </Text>
              ) : null}
              <TouchableOpacity style={styles.retryBtn} onPress={() => void catalogQ.refetch()} activeOpacity={0.88}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {catalogQ.data ? (
          <>
            {tab === 'borders' && feat ? (
              <View style={styles.tabPane}>
                <View
                  style={styles.featuredSparkHost}
                  collapsable={false}
                  onLayout={(e) => {
                    const { width, height } = e.nativeEvent.layout;
                    if (width < 8 || height < 8) return;
                    const w = Math.round(width);
                    const h = Math.round(height);
                    setFeaturedSparkBox((p) => (p.w !== w || p.h !== h ? { w, h } : p));
                  }}
                >
                  <LinearGradient
                    colors={[PROFILE_NEON_BORDER_PRESETS[2][0], PROFILE_NEON_BORDER_PRESETS[2][1]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.featuredNeonRing}
                  >
                    <FeaturedShopHero motionActive={shopScreenFocused}>
                  <View style={styles.featuredInner}>
                    <View style={styles.featuredFeaturedPill}>
                      <Text style={styles.featuredFeaturedPillText}>Featured</Text>
                    </View>
                    <TouchableOpacity
                      activeOpacity={0.96}
                      onPress={() => setBorderDetailItem(feat)}
                      accessibilityRole="button"
                      accessibilityLabel="View border details"
                    >
                      <View style={styles.featuredMainRow}>
                        <View style={styles.featuredCopy}>
                          <Text style={styles.featuredTitleSerif} numberOfLines={2}>
                            {feat.name}
                          </Text>
                          {(() => {
                            const cn = collectionNameFor(feat)?.trim() ?? '';
                            const sc = feat.season_code?.trim() ?? '';
                            const line = [cn, sc].filter(Boolean).join(' · ');
                            return line ? <Text style={styles.featuredCollection}>{line}</Text> : null;
                          })()}
                          <View style={styles.featuredDescriptorStrip}>
                            <BorderRarityBadge item={feat} compact align="start" />
                            <CompactMetaChipPills chips={buildCompactMetaChips(feat, 3)} compact />
                          </View>
                          <Text style={styles.featuredDesc} numberOfLines={4}>
                            {feat.description}
                          </Text>
                          <View style={styles.featuredSellingRow}>
                            <ShopHighlightNeonChip
                              icon="shield-checkmark-outline"
                              label="Exclusive borders"
                              labelStyle={styles.featuredSellingLabel}
                            />
                            <ShopHighlightNeonChip
                              icon="gift-outline"
                              label="Creator rewards"
                              labelStyle={styles.featuredSellingLabel}
                            />
                            <ShopHighlightNeonChip
                              icon="heart-outline"
                              label="Premium extras"
                              labelStyle={styles.featuredSellingLabel}
                            />
                          </View>
                          {!isFreeShopBorder(feat) ? (
                            <View style={styles.directPurchaseRow}>
                              <Ionicons name="phone-portrait-outline" size={14} color={colors.dark.textMuted} />
                              <Text style={styles.directPurchaseText}>Direct purchase · App Store / Google Play</Text>
                            </View>
                          ) : (
                            <View style={styles.directPurchaseRow}>
                              <Ionicons name="gift-outline" size={14} color={colors.status.online} />
                              <Text style={[styles.directPurchaseText, { color: colors.status.online }]}>
                                Free for everyone · tap below
                              </Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.featuredPreviewSpotlight}>
                        <BorderPreviewPlate
                          frame="podium"
                          ringColor={ringPreviewColor(feat)}
                          size={102}
                          rankPlace={feat.rank_place}
                          showMotionHint={
                            feat.visual_tier === 'animated' ||
                            feat.visual_tier === 'reactive' ||
                            feat.is_animated === true
                          }
                          shopItem={feat}
                        />
                        </View>
                      </View>
                    </TouchableOpacity>
                    {invState.ownsBorder(feat.id) ? (
                      <View style={styles.ownedBannerPremium}>
                        <View style={styles.ownedBadgeLarge}>
                          <Ionicons name="checkmark-done" size={20} color={pulseverse.storeAccentSoft} style={{ marginRight: 8 }} />
                          <Text style={styles.ownedBadgeLargeText}>Owned</Text>
                        </View>
                        <Text style={styles.ownedBannerSubtitle}>
                          {equipped?.shop_item_id === feat.id
                            ? 'Active on your avatar. You can still buy another copy or gift this border when eligible.'
                            : 'In your collection — equip when you’re ready.'}
                        </Text>
                        <View style={styles.ownedBannerActions}>
                          {equipped?.shop_item_id !== feat.id ? (
                            <TouchableOpacity
                              style={styles.ownedActionPrimary}
                              onPress={() => {
                                const row = invState.inventoryRowForBorder(feat.id);
                                if (row) void handleEquip(row.id);
                              }}
                            >
                              <Text style={styles.ownedActionPrimaryText}>Equip</Text>
                            </TouchableOpacity>
                          ) : null}
                          {!isFreeShopBorder(feat) && Platform.OS !== 'web' ? (
                            <TouchableOpacity
                              style={styles.ownedActionSecondary}
                              onPress={() => startBorderShopCheckout(feat)}
                            >
                              <Ionicons name="bag-add-outline" size={16} color={pulseverse.electricSoft} style={{ marginRight: 6 }} />
                              <Text style={styles.ownedActionSecondaryText}>Buy again</Text>
                            </TouchableOpacity>
                          ) : null}
                          {feat.is_giftable && Platform.OS !== 'web' ? (
                            <TouchableOpacity style={styles.giftMiniBtn} onPress={() => setGiftBorderItem(feat)}>
                              <Text style={styles.giftMiniBtnText}>Gift</Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>
                      </View>
                    ) : (
                      <>
                        {Platform.OS === 'web' ? (
                          <View style={styles.webIapNote}>
                            <Text style={styles.webIapNoteText}>
                              {isFreeShopBorder(feat)
                                ? 'Tap the card to open details and claim this border free.'
                                : feat.real_money_display_price?.trim()
                                  ? `Listed at ${feat.real_money_display_price.trim()} in the catalog — purchase in the iOS/Android app with your app store account.`
                                  : 'Border purchases run in the iOS/Android app with the native store.'}
                            </Text>
                          </View>
                        ) : (
                          <LinearGradient
                            colors={[...gradients.ctaCommerce]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.buyGradient}
                          >
                            <TouchableOpacity
                              style={styles.buyBtn}
                              activeOpacity={0.9}
                              onPress={() => startBorderShopCheckout(feat)}
                            >
                              <Ionicons
                                name={isFreeShopBorder(feat) ? 'sparkles-outline' : 'bag-handle-outline'}
                                size={18}
                                color={colors.dark.text}
                              />
                              <Text style={styles.buyBtnText}>
                                {isFreeShopBorder(feat) ? 'Claim free' : 'Purchase'}
                              </Text>
                            </TouchableOpacity>
                          </LinearGradient>
                        )}
                      </>
                    )}
                  </View>
                    </FeaturedShopHero>
                  </LinearGradient>
                  {featuredSparkBox.w > 8 && featuredSparkBox.h > 8 ? (
                    <PremiumCardSparkBorder
                      width={featuredSparkBox.w}
                      height={featuredSparkBox.h}
                      borderRadius={borderRadius['2xl'] + 3}
                      motionActive={shopScreenFocused}
                    />
                  ) : null}
                </View>

                <View style={styles.sectionHead}>
                  <Text style={styles.sectionTitle}>Browse borders</Text>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filterChipsRow}
                >
                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      !showRetired &&
                        borderFilter.acquisition === 'all' &&
                        !borderFilter.ownedOnly &&
                        styles.filterChipOn,
                    ]}
                    onPress={() => {
                      setShowRetired(false);
                      setBorderFilter({ acquisition: 'all', ownedOnly: false });
                    }}
                    activeOpacity={0.88}
                  >
                    <Text style={styles.filterChipText}>All</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      !showRetired && borderFilter.ownedOnly && styles.filterChipOn,
                    ]}
                    onPress={() => {
                      setShowRetired(false);
                      setBorderFilter({ acquisition: 'all', ownedOnly: true });
                    }}
                    activeOpacity={0.88}
                  >
                    <Text style={styles.filterChipText}>My borders</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      !showRetired &&
                        borderFilter.acquisition === 'shop' &&
                        !borderFilter.ownedOnly &&
                        styles.filterChipOn,
                    ]}
                    onPress={() => {
                      setShowRetired(false);
                      setBorderFilter({ acquisition: 'shop', ownedOnly: false });
                    }}
                    activeOpacity={0.88}
                  >
                    <Text style={styles.filterChipText}>Shop</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      !showRetired &&
                        borderFilter.acquisition === 'earned' &&
                        !borderFilter.ownedOnly &&
                        styles.filterChipOn,
                    ]}
                    onPress={() => {
                      setShowRetired(false);
                      setBorderFilter({ acquisition: 'earned', ownedOnly: false });
                    }}
                    activeOpacity={0.88}
                  >
                    <Text style={styles.filterChipText}>Earned</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.filterChip, showRetired && styles.filterChipOn]}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setShowRetired(true);
                      analytics.track('shop_retired_borders_viewed');
                    }}
                    activeOpacity={0.88}
                    accessibilityLabel="Browse retired borders"
                  >
                    <Ionicons
                      name="time-outline"
                      size={13}
                      color={colors.dark.text}
                      style={{ marginRight: 5 }}
                    />
                    <Text style={styles.filterChipText}>Retired</Text>
                  </TouchableOpacity>
                </ScrollView>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filterChipsRow}
                >
                  <Text style={styles.filterStaticLabel}>Sort</Text>
                  <TouchableOpacity
                    style={[styles.filterChip, borderSort === 'default' && styles.filterChipOn]}
                    onPress={() => setBorderSort('default')}
                    activeOpacity={0.88}
                  >
                    <Text style={styles.filterChipText}>Default</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.filterChip, borderSort === 'rarity_desc' && styles.filterChipOn]}
                    onPress={() => setBorderSort('rarity_desc')}
                    activeOpacity={0.88}
                  >
                    <Text style={styles.filterChipText}>Rarity</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.filterChip, borderSort === 'prestige_desc' && styles.filterChipOn]}
                    onPress={() => setBorderSort('prestige_desc')}
                    activeOpacity={0.88}
                  >
                    <Text style={styles.filterChipText}>Prestige</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.filterChip, borderSort === 'name' && styles.filterChipOn]}
                    onPress={() => setBorderSort('name')}
                    activeOpacity={0.88}
                  >
                    <Text style={styles.filterChipText}>Name</Text>
                  </TouchableOpacity>
                </ScrollView>

                {showRetired && retiredQ.isLoading && retiredBorders.length === 0 ? (
                  <View style={styles.retiredStateCard}>
                    <ActivityIndicator color={pulseverse.electric} />
                    <Text style={styles.retiredStateHint}>Loading retired borders…</Text>
                  </View>
                ) : showRetired && retiredBorders.length === 0 ? (
                  <View style={styles.retiredStateCard}>
                    <Ionicons name="time-outline" size={26} color={colors.dark.textMuted} />
                    <Text style={styles.retiredStateTitle}>Retired archive</Text>
                    <Text style={styles.retiredStateBody}>
                      Past shop and event borders will appear here once they leave the active shelf.
                    </Text>
                  </View>
                ) : (
                  <>
                    {showRetired ? (
                      <View style={styles.retiredHintRow}>
                        <Ionicons
                          name="information-circle-outline"
                          size={14}
                          color={colors.dark.textMuted}
                          style={{ marginRight: 6 }}
                        />
                        <Text style={styles.retiredHintText}>
                          These borders are no longer for sale — browsing only.
                        </Text>
                      </View>
                    ) : null}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.browseStrip}>
                      {browseProcessed.map((b) => (
                        <BorderCard
                          key={b.id}
                          item={b}
                          collectionName={collectionNameFor(b)}
                          width={browseTileW}
                          isWeb={Platform.OS === 'web'}
                          ownership={borderOwnershipFor(b)}
                          onOpenDetail={() => setBorderDetailItem(b)}
                          onBuy={() => startBorderShopCheckout(b)}
                          onGift={() => setGiftBorderItem(b)}
                        />
                      ))}
                    </ScrollView>
                  </>
                )}

                <View style={styles.footerBannerIap}>
                  <Ionicons name="shield-checkmark-outline" size={20} color={pulseverse.storeAccent} style={{ marginRight: 10 }} />
                  <Text style={styles.footerTextIap}>
                    Charged by your app store. PulseVerse confirms ownership — Sparks are never used for borders here.
                  </Text>
                </View>
              </View>
            ) : tab === 'borders' ? (
              <View style={styles.tabPane}>
                <Text style={styles.emptyText}>No borders in the catalog yet.</Text>
              </View>
            ) : null}

            {tab === 'credits' && (
              <View style={styles.tabPane}>
                <View style={styles.economyContextSparks}>
                  <LinearGradient
                    colors={[...gradients.economySparks]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.economyContextSparksGrad}
                  >
                    <Ionicons name="flash" size={17} color={pulseverse.electricSoft} style={{ marginRight: 8 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.economyContextTitleSparks}>Sparks wallet</Text>
                      <Text style={styles.economyContextSubSparks}>
                        Top up here, then spend Sparks on creator gifts from profiles, posts, or live.
                      </Text>
                    </View>
                  </LinearGradient>
                </View>
                <View style={styles.creditsHero}>
                  <Text style={styles.creditsHeroLabel}>Your balance</Text>
                  <Text style={styles.creditsHeroValue}>{sparkBalance.toLocaleString()} Sparks</Text>
                  <Text style={styles.creditsHeroSub}>Use Sparks for gifts and creator support.</Text>
                </View>
                <Text style={styles.packSectionTitle}>Top up</Text>
                {packs.length === 0 ? (
                  <Text style={styles.emptyText}>No Spark packs available yet.</Text>
                ) : (
                  packs.map((pack, idx) => {
                    const tag = sparkPackLabel(pack.spark_amount ?? 0, idx, packs.length);
                    return (
                      <TouchableOpacity
                        key={pack.id}
                        style={[styles.packCard, styles.packCardSparks]}
                        onPress={() => {
                          setCreditItem(pack);
                        }}
                        activeOpacity={0.9}
                      >
                        <View style={styles.packLeft}>
                          {tag ? (
                            <View
                              style={[
                                styles.packTag,
                                tag === 'Best Value' ? styles.packTagGold : styles.packTagCyan,
                              ]}
                            >
                              <Text style={styles.packTagText}>{tag.toUpperCase()}</Text>
                            </View>
                          ) : null}
                          <Text style={styles.packSparks}>
                            {(pack.spark_amount ?? 0).toLocaleString()} Sparks
                          </Text>
                          {pack.real_money_display_price ? (
                            <Text style={styles.packFine}>About {pack.real_money_display_price}</Text>
                          ) : (
                            <Text style={styles.packFine}>Billed via App Store or Google Play</Text>
                          )}
                        </View>
                        <View style={styles.packCta}>
                          <Text style={styles.packCtaText}>{Platform.OS === 'web' ? 'App only' : 'Purchase'}</Text>
                          <Ionicons name="chevron-forward" size={16} color={pulseverse.onElectric} />
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
                <Text style={styles.creditsLegal}>
                  Prices vary by region and platform. Sparks are credited after store validation.
                </Text>
              </View>
            )}

            {tab === 'gifts' && (
              <View style={styles.tabPane}>
                <LinearGradient
                  colors={['rgba(167,139,250,0.22)', 'rgba(34,211,238,0.08)', 'rgba(15,23,42,0.95)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.giftsHeroPanel}
                >
                  <View style={styles.giftsHeroIconWrap}>
                    <Ionicons name="gift" size={22} color={rarity.epic.text} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.giftsHeroTitle}>Send a moment</Text>
                    <Text style={styles.giftsHeroBody}>
                      Pick a gift, choose a creator, and your Sparks balance handles the rest — no separate checkout.
                    </Text>
                  </View>
                </LinearGradient>
                <Text style={styles.giftsLede}>
                  Filter by tier, then tap a gift for details. Send from a profile, post, or live.
                </Text>
                {userId ? (
                  <View style={styles.tipBanner}>
                    <Ionicons name="person-outline" size={20} color={pulseverse.electric} />
                    <Text style={styles.tipBannerText}>
                      Visit a creator profile or open a post to send gifts from the toolbar — same catalog and Sparks
                      balance.
                    </Text>
                  </View>
                ) : null}
                {gifts.length === 0 ? (
                  <Text style={styles.emptyText}>No gifts in the catalog yet.</Text>
                ) : (
                  <>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.giftTierChipsRow}
                    >
                      <TouchableOpacity
                        style={[styles.giftTierChip, giftTierFilter === 'all' && styles.giftTierChipOn]}
                        onPress={() => {
                          void Haptics.selectionAsync();
                          setGiftTierFilter('all');
                        }}
                        activeOpacity={0.88}
                      >
                        <Text style={[styles.giftTierChipText, giftTierFilter === 'all' && styles.giftTierChipTextOn]}>
                          All
                        </Text>
                      </TouchableOpacity>
                      {CREATOR_GIFT_TIER_ORDER.map((tierId) => {
                        const meta = CREATOR_GIFT_TIER_META[tierId];
                        const count = giftsByTier.get(tierId)?.length ?? 0;
                        if (count === 0) return null;
                        const on = giftTierFilter === tierId;
                        return (
                          <TouchableOpacity
                            key={tierId}
                            style={[styles.giftTierChip, on && styles.giftTierChipOn]}
                            onPress={() => {
                              void Haptics.selectionAsync();
                              setGiftTierFilter(tierId);
                            }}
                            activeOpacity={0.88}
                          >
                            <Ionicons
                              name={meta.icon}
                              size={13}
                              color={on ? pulseverse.onElectric : meta.iconColor}
                              style={{ marginRight: 5 }}
                            />
                            <Text style={[styles.giftTierChipText, on && styles.giftTierChipTextOn]}>{meta.label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>

                    <View style={styles.giftGridFull}>
                      {(giftTierFilter === 'all' ? [...CREATOR_GIFT_TIER_ORDER] : [giftTierFilter]).map((tierId) => {
                        const tierGifts = giftsByTier.get(tierId) ?? [];
                        if (tierGifts.length === 0) return null;
                        const headerMeta = CREATOR_GIFT_TIER_META[tierId];
                        return (
                          <View key={String(tierId)}>
                            {giftTierFilter === 'all' ? (
                              <View style={styles.giftTierSectionHeader}>
                                <View
                                  style={[
                                    styles.giftTierSectionRule,
                                    { backgroundColor: headerMeta.cardAccent },
                                  ]}
                                />
                                <View style={{ flex: 1, minWidth: 0 }}>
                                  <Text style={styles.giftTierSectionTitle}>{headerMeta.label}</Text>
                                  <Text style={styles.giftTierSectionTagline}>{headerMeta.tagline}</Text>
                                </View>
                              </View>
                            ) : null}
                            {tierGifts.map((g) => {
                              const price = g.spark_price ?? 0;
                              const short = sparkBalance < price;
                              const tier = creatorGiftTierForItem(g);
                              return (
                                <TouchableOpacity
                                  key={g.id}
                                  style={[
                                    styles.giftRowCard,
                                    { borderLeftColor: CREATOR_GIFT_TIER_META[tier].cardAccent },
                                  ]}
                                  activeOpacity={0.88}
                                  onPress={() => {
                                    analytics.track('border_viewed', {
                                      shop_item_id: g.id,
                                      kind: 'gift',
                                      name: g.name,
                                      gift_tier: tier,
                                    });
                                    setPreviewGift(g);
                                  }}
                                >
                                  <View
                                    style={[
                                      styles.giftRowOrb,
                                      { borderColor: ringPreviewColor(g) + '66' },
                                    ]}
                                  >
                                    <CreatorGiftOrb item={g} size={56} />
                                  </View>
                                  <View style={styles.giftRowBody}>
                                    <Text style={styles.giftRowName} numberOfLines={2}>
                                      {g.name}
                                    </Text>
                                    <Text style={styles.giftRowPrice}>{price.toLocaleString()} Sparks</Text>
                                    <View style={styles.giftRowChips}>
                                      {(g.gift_contexts ?? []).map((c) => (
                                        <View key={c} style={styles.contextChip}>
                                          <Text style={styles.contextChipText}>
                                            {c === 'post' ? 'Posts' : c === 'live' ? 'Live' : 'Profile'}
                                          </Text>
                                        </View>
                                      ))}
                                    </View>
                                    {short ? (
                                      <Text style={styles.insufficientHintSmall}>
                                        Need more Sparks · Sparks tab
                                      </Text>
                                    ) : null}
                                  </View>
                                  <Ionicons name="chevron-forward" size={20} color={colors.dark.textMuted} />
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        );
                      })}
                    </View>
                  </>
                )}
              </View>
            )}

            {tab === 'more' && (
              <View style={styles.tabPane}>
                <LinearGradient
                  colors={['rgba(56,189,248,0.12)', 'rgba(99,102,241,0.08)']}
                  style={styles.moreHero}
                >
                  <Ionicons name="rocket-outline" size={28} color={pulseverse.electric} />
                  <Text style={styles.moreHeroTitle}>More coming soon</Text>
                  <Text style={styles.moreHeroBody}>
                    Bundles, seasonal drops, sponsored items, and full purchase history are on the roadmap.
                  </Text>
                </LinearGradient>
                <Text style={styles.historyHead}>Recent store receipts</Text>
                {receiptsQ.isLoading && shopReceipts.length === 0 ? (
                  <ActivityIndicator color={pulseverse.electric} style={{ marginVertical: 20 }} />
                ) : shopReceipts.length === 0 ? (
                  <Text style={styles.historyEmpty}>No store receipts yet.</Text>
                ) : (
                  shopReceipts.slice(0, 8).map((r) => (
                    <View key={r.id} style={styles.historyRow}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.historyStore}>{r.store_product_id}</Text>
                        <Text style={styles.historyMeta}>
                          {r.validation_status}
                          {r.processed_at ? ` · ${new Date(r.processed_at).toLocaleString()}` : ''}
                        </Text>
                      </View>
                      <Text style={styles.historyPlat}>{r.platform}</Text>
                    </View>
                  ))
                )}
              </View>
            )}
          </>
        ) : null}
      </ScrollView>

      <BorderDetailModal
        visible={!!borderDetailItem}
        onClose={() => setBorderDetailItem(null)}
        item={borderDetailItem}
        collection={
          borderDetailItem?.collection_id
            ? collectionsQ.rowById.get(borderDetailItem.collection_id) ?? null
            : null
        }
        ownership={borderDetailItem ? borderOwnershipFor(borderDetailItem) : { owned: false, equipped: false }}
        isWeb={Platform.OS === 'web'}
        onBuy={() => {
          if (!borderDetailItem) return;
          const item = borderDetailItem;
          setBorderDetailItem(null);
          if (isFreeShopBorder(item)) openBorderBuy(item);
          else startBorderShopCheckout(item);
        }}
        onGift={() => {
          if (!borderDetailItem) return;
          setBorderDetailItem(null);
          setGiftBorderItem(borderDetailItem);
        }}
        onEquip={(rowId) => {
          setBorderDetailItem(null);
          void handleEquip(rowId);
        }}
        onOpenMyBorders={() => {
          setBorderDetailItem(null);
          router.push('/my-borders' as any);
        }}
      />

      <BorderBuyConfirmModal
        visible={!!buyItem}
        onClose={() => setBuyItem(null)}
        borderName={buyItem?.name ?? ''}
        purchaseMode={buyItem && isFreeShopBorder(buyItem) ? 'free' : 'iap'}
        onPurchase={async (opts) => {
          if (!buyItem) return { ok: false as const, code: 'INVALID_INPUT', message: 'Missing item' };
          return await purchaseService.purchaseBorderForSelf(buyItem, opts);
        }}
        onSuccess={async (data) => {
          await refreshAfterPurchase();
          analytics.track('border_purchase_completed', { shop_item_id: buyItem?.id ?? '' });
          if (!buyItem || !userId) {
            rewardDeliveryDebug.warn('Border purchase success but missing buyItem or userId — cannot enqueue celebration');
            return;
          }

          let equipInventoryId: string | undefined = readUserInventoryId(data) ?? undefined;
          if (!equipInventoryId) {
            const inv = await queryClient.fetchQuery({
              queryKey: shopKeys.inventory(userId),
              queryFn: () => shopQueriesService.getUserInventory(userId),
            });
            equipInventoryId = inv.find((i) => i.shop_item_id === buyItem.id)?.id;
          }
          if (!equipInventoryId) {
            await new Promise((r) => setTimeout(r, 480));
            const invRetry = await shopQueriesService.getUserInventory(userId);
            equipInventoryId = invRetry.find((i) => i.shop_item_id === buyItem.id)?.id;
          }

          let catalogItem = buyItem;
          try {
            const catalogRows = await shopQueriesService.getShopItemsByIds([buyItem.id]);
            if (catalogRows[0]) catalogItem = catalogRows[0];
          } catch (e) {
            rewardDeliveryDebug.warn('Catalog refresh for reward metadata failed', e);
          }

          if (!equipInventoryId) {
            rewardDeliveryDebug.warn('enqueueBorderSelf skipped: inventory row not found after purchase');
            Alert.alert(
              'Reward reveal unavailable',
              'Your border should appear in My Borders. We could not queue the celebration screen yet — try refreshing or restarting the app.',
            );
            showToast('Border added — check My Borders if no gift prompt appears.', 'info');
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
            return;
          }

          const meta = buildBorderRewardMetadata(catalogItem, equipInventoryId, {
            border_source: isFreeShopBorder(buyItem) ? 'promotional' : 'purchased',
          });
          const rq = await rewardDeliveriesService.enqueueBorderSelf(equipInventoryId, catalogItem.id, meta);
          if (rq) {
            await queryClient.invalidateQueries({ queryKey: rewardDeliveryKeys.pendingList(userId) });
            await queryClient.refetchQueries({ queryKey: rewardDeliveryKeys.pendingList(userId) });
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
            return;
          }

          Alert.alert(
            'Celebration queue failed',
            'Your border is saved in My Borders. The reward animation could not be queued — check your connection or try again later.',
          );
          showToast('Border saved — check My Borders.', 'info');
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
        }}
      />

      {purchaseChoiceItem ? (
        <BorderPurchaseChoiceModal
          visible
          onClose={() => setPurchaseChoiceItem(null)}
          border={purchaseChoiceItem}
          collectionName={collectionNameFor(purchaseChoiceItem)}
          onChooseSelf={() => {
            const b = purchaseChoiceItem;
            setPurchaseChoiceItem(null);
            if (b) {
              analytics.track('border_purchase_recipient_self', { shop_item_id: b.id });
              setBuyItem(b);
            }
          }}
          onChooseGift={() => {
            const b = purchaseChoiceItem;
            setPurchaseChoiceItem(null);
            if (b) {
              analytics.track('border_purchase_recipient_gift', { shop_item_id: b.id });
              setGiftBorderItem(b);
            }
          }}
        />
      ) : null}

      {giftBorderItem ? (
        <BorderGiftRecipientModal
          visible={!!giftBorderItem}
          onClose={() => setGiftBorderItem(null)}
          border={giftBorderItem}
          collectionName={collectionNameFor(giftBorderItem)}
          onPurchaseGift={async (handle, note) => {
            analytics.track('border_gift_started', { shop_item_id: giftBorderItem.id });
            return await purchaseService.purchaseBorderGift({
              item: giftBorderItem,
              recipientHandle: handle,
              note,
            });
          }}
          onSuccess={async (recipient) => {
            await refreshAfterPurchase();
            analytics.track('border_gift_completed', { recipient });
            setCelebration({
              kind: 'gift_sent',
              recipient,
              sentKind: 'border',
            });
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }}
        />
      ) : null}

      <SparkGiftPreviewModal
        visible={!!previewGift}
        onClose={() => setPreviewGift(null)}
        gift={previewGift}
        sparkBalance={sparkBalance}
      />

      <CreditPackConfirmModal
        visible={!!creditItem}
        onClose={() => setCreditItem(null)}
        mode={Platform.OS === 'web' ? 'web_info' : 'purchase'}
        packLabel={`Buy ${(creditItem?.spark_amount ?? 0).toLocaleString()} Sparks?`}
        sparksAmount={creditItem?.spark_amount ?? 0}
        tag={
          creditItem
            ? sparkPackLabel(
                creditItem.spark_amount ?? 0,
                packs.findIndex((p) => p.id === creditItem.id),
                packs.length,
              )
            : undefined
        }
        staffSparkPackCatalog={profile?.roleAdmin ? packs : undefined}
        onPurchase={
          Platform.OS === 'web'
            ? undefined
            : async (opts) => {
                if (!creditItem) return { ok: false as const, code: 'INVALID_INPUT', message: 'Missing pack' };
                analytics.track('spark_pack_purchase_started', { shop_item_id: creditItem.id });
                return await purchaseService.purchaseSparkPack(creditItem, opts);
              }
        }
        onSuccess={
          Platform.OS === 'web'
            ? undefined
            : async (data) => {
                await refreshAfterPurchase();
                analytics.track('spark_pack_purchase_completed', { shop_item_id: creditItem?.id ?? '' });
                const sparksAmount = creditItem?.spark_amount ?? 0;
                const receiptId = readPurchaseReceiptId(data);
                if (receiptId && creditItem && userId) {
                  const rq = await rewardDeliveriesService.enqueueSparksPack(receiptId, creditItem.id, sparksAmount, {
                    kind: 'sparks',
                    reason: 'purchase',
                    quantity: sparksAmount,
                    pack_name: creditItem.name ?? null,
                    shop_item_id: creditItem.id,
                  });
                  if (rq) {
                    await queryClient.invalidateQueries({ queryKey: rewardDeliveryKeys.pendingList(userId) });
                    await queryClient.refetchQueries({ queryKey: rewardDeliveryKeys.pendingList(userId) });
                    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
                    return;
                  }
                  Alert.alert(
                    'Celebration queue failed',
                    'Your Sparks balance should still update. We could not queue the reward toast.',
                  );
                  showToast('Sparks purchase saved — verify your balance.', 'info');
                  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
                  return;
                }
                rewardDeliveryDebug.warn('enqueueSparksPack skipped', {
                  hasReceipt: Boolean(receiptId),
                  hasCreditItem: Boolean(creditItem),
                  hasUserId: Boolean(userId),
                });
                Alert.alert(
                  'Celebration unavailable',
                  'We could not attach a purchase receipt for the celebration. Your Sparks balance may still update.',
                );
                showToast('Purchase finished — verify Sparks balance.', 'info');
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
              }
        }
      />

      <ShopResultModal
        visible={!!celebration}
        variant="success"
        title=""
        pulseCelebration={celebration}
        onSparkSendGift={() => {
          setCelebration(null);
          setTab('gifts');
        }}
        onPrimary={
          celebration?.kind === 'border_purchase' && celebration.equipInventoryId
            ? async () => {
                const id = celebration.equipInventoryId;
                if (!id) return;
                await handleEquip(id);
                setCelebration(null);
              }
            : undefined
        }
        onTertiary={
          celebration?.kind === 'border_purchase'
            ? () => {
                setCelebration(null);
                router.push('/my-borders' as any);
              }
            : undefined
        }
        onClose={() => setCelebration(null)}
      />

      <DiamondsInfoModal
        visible={diamondsInfoOpen}
        onClose={() => setDiamondsInfoOpen(false)}
        wallet={diamondQ.data}
        walletError={
          diamondQ.error
            ? supabaseMessage(diamondQ.error)
            : diamondQ.isFetched && !diamondQ.isLoading && diamondQ.data == null
              ? 'No wallet row returned (check user id matches SQL query).'
              : null
        }
        authUserId={userId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.dark.bg },
  scroll: { paddingHorizontal: H_PAD },
  tabPane: { paddingBottom: 8 },
  skeletonPane: {
    marginBottom: 12,
  },
  skeletonHint: {
    color: colors.dark.textMuted,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 14,
    fontSize: 13,
  },
  errorCard: {
    alignItems: 'center',
    padding: 22,
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(251,113,133,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(251,113,133,0.22)',
  },
  errorTitle: {
    marginTop: 12,
    fontSize: 17,
    fontWeight: '900',
    color: colors.dark.text,
  },
  errorBanner: { color: colors.dark.textSecondary, textAlign: 'center', marginTop: 8, fontWeight: '500', lineHeight: 20 },
  errorDetail: {
    color: colors.dark.textMuted,
    textAlign: 'center',
    marginTop: 10,
    fontSize: 12,
    lineHeight: 17,
    paddingHorizontal: spacing.md,
  },
  retryBtn: {
    marginTop: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: borderRadius.lg,
    backgroundColor: pulseverse.electric,
    ...shadows.ctaSoft,
  },
  retryBtnText: { fontWeight: '900', color: pulseverse.onElectric },
  headerWalletStack: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 8,
    maxWidth: 228,
  },
  sparksPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: borderRadius.full,
    backgroundColor: pulseverse.sparksPillBg,
    borderWidth: 1,
    borderColor: pulseverse.sparksPillBorder,
    minHeight: 44,
  },
  sparksPillInner: { flexDirection: 'row', alignItems: 'center' },
  sparksSignedOut: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.dark.textSecondary,
  },
  sparksText: { fontSize: 14, fontWeight: '800', color: colors.dark.text },
  sparksLabel: { fontWeight: '600', color: colors.dark.textSecondary },
  diamondsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(212,166,58,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(212,166,58,0.35)',
  },
  diamondsPillText: { fontSize: 13, fontWeight: '800', color: colors.dark.text },
  diamondsPillLabel: { fontWeight: '600', color: colors.dark.textSecondary },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: spacing.md,
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  tabBtn: { flex: 1, alignItems: 'center', minWidth: 0 },
  tabIconGlow: {
    textShadowColor: pulseverse.electric,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
    opacity: 1,
  },
  tabLabel: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '800',
    color: colors.dark.textMuted,
    letterSpacing: 0.02,
  },
  tabLabelActive: { color: pulseverse.electric },
  tabUnderline: {
    marginTop: 6,
    height: 3,
    width: 36,
    borderRadius: 2,
    backgroundColor: pulseverse.electric,
  },
  tabUnderlinePlaceholder: { marginTop: 6, height: 3, width: 36 },
  economyContextSparks: {
    marginBottom: 14,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.20)',
  },
  economyContextSparksGrad: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  economyContextTitleSparks: {
    fontSize: 13,
    fontWeight: '900',
    color: pulseverse.electricSoft,
    letterSpacing: 0.2,
    lineHeight: 18,
  },
  economyContextSubSparks: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: 'rgba(165,243,252,0.88)',
    fontWeight: '600',
  },
  browseCardEquipped: {
    borderColor: 'rgba(34,211,238,0.40)',
    backgroundColor: 'rgba(34,211,238,0.045)',
    ...shadows.accentEdge,
  },
  featuredSparkHost: {
    position: 'relative',
    marginBottom: spacing['2xl'] + 4,
  },
  featuredNeonRing: {
    borderRadius: borderRadius['2xl'] + 3,
    padding: 1.5,
    ...Platform.select({
      ios: {
        shadowColor: PROFILE_NEON_BORDER_PRESETS[2][0],
        shadowOpacity: 0.34,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 10 },
      default: {},
    }),
  },
  featuredInner: {
    borderRadius: borderRadius['2xl'],
    backgroundColor: 'transparent',
    paddingVertical: 18,
    paddingHorizontal: 18,
  },
  featuredPreviewSpotlight: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 6,
    paddingLeft: 2,
    overflow: 'visible',
  },
  featuredFeaturedPill: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(212,166,58,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(212,166,58,0.35)',
    marginBottom: 14,
  },
  featuredFeaturedPillText: {
    fontSize: 10,
    fontWeight: '900',
    color: pulseverse.storeAccent,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  featuredMainRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  featuredCopy: { flex: 1, minWidth: 0 },
  featuredTitleSerif: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.dark.text,
    letterSpacing: -0.5,
    lineHeight: 30,
    ...(Platform.OS === 'web'
      ? ({ fontFamily: 'Georgia, serif' } as const)
      : Platform.OS === 'ios'
        ? { fontFamily: 'Georgia' }
        : { fontFamily: 'serif' }),
  },
  featuredCollection: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '700',
    color: colors.dark.textMuted,
  },
  featuredDescriptorStrip: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 5,
    rowGap: 5,
  },
  featuredDesc: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
    color: colors.dark.textMuted,
    fontWeight: '500',
  },
  featuredSellingRow: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  featuredSellingLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: pulseverse.electricSoft,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  legendBadge: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(212,166,58,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(212,166,58,0.22)',
  },
  legendText: { fontSize: 11, fontWeight: '800', color: pulseverse.storeAccent },
  directPurchaseRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  directPurchaseText: { fontSize: 12, color: colors.dark.textMuted, fontWeight: '600', flex: 1 },
  webIapNote: {
    marginTop: 14,
    padding: 12,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(56,189,248,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.2)',
  },
  webIapNoteText: { fontSize: 13, color: colors.dark.textSecondary, fontWeight: '600' },
  previewRing: {
    borderWidth: 2,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  previewInner: {
    backgroundColor: colors.dark.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  buyGradient: {
    borderRadius: borderRadius.lg,
    marginTop: 16,
    overflow: 'hidden',
  },
  buyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  buyBtnText: { fontSize: 15, fontWeight: '800', color: colors.dark.text },
  giftOutlineBtn: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.38)',
    backgroundColor: 'rgba(34,211,238,0.05)',
  },
  giftOutlineText: { fontSize: 14, fontWeight: '800', color: pulseverse.electric },
  ownedBannerPremium: {
    marginTop: 16,
    padding: 16,
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(212,166,58,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(212,166,58,0.28)',
  },
  ownedBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ownedBadgeLargeText: {
    fontSize: 18,
    fontWeight: '900',
    color: pulseverse.storeAccentSoft,
    letterSpacing: 0.2,
  },
  ownedBannerSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.dark.textSecondary,
    fontWeight: '600',
    marginBottom: 14,
  },
  ownedBannerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'center',
  },
  ownedActionPrimary: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: borderRadius.chip,
    backgroundColor: pulseverse.electric,
  },
  ownedActionPrimaryText: { fontSize: 13, fontWeight: '900', color: pulseverse.onElectric },
  ownedActionSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: borderRadius.chip,
    backgroundColor: 'rgba(37,99,235,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.45)',
  },
  ownedActionSecondaryText: { fontSize: 13, fontWeight: '900', color: pulseverse.electricSoft },
  giftMiniBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: borderRadius.chip,
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.38)',
  },
  giftMiniBtnText: { fontSize: 12, fontWeight: '800', color: pulseverse.electric },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.dark.text, letterSpacing: -0.25 },
  filterChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 10,
    paddingRight: 4,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.32)',
    backgroundColor: 'rgba(15,23,42,0.5)',
  },
  filterChipOn: {
    borderColor: 'rgba(34,211,238,0.42)',
    backgroundColor: 'rgba(34,211,238,0.09)',
  },
  filterChipText: { fontSize: 12, fontWeight: '800', color: colors.dark.text },
  retiredHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(148,163,184,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.18)',
    marginBottom: 12,
  },
  retiredHintText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.dark.textMuted,
    lineHeight: 16,
  },
  retiredStateCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    paddingHorizontal: 22,
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(15,23,42,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.22)',
    marginBottom: 8,
  },
  retiredStateTitle: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: '900',
    color: colors.dark.text,
  },
  retiredStateBody: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
    color: colors.dark.textMuted,
    textAlign: 'center',
    maxWidth: 280,
  },
  retiredStateHint: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '700',
    color: colors.dark.textMuted,
  },
  filterStaticLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.dark.textMuted,
    marginRight: 4,
  },
  browseStrip: { gap: 10, paddingBottom: 6 },
  browseCard: {
    backgroundColor: colors.dark.card,
    borderRadius: borderRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    position: 'relative',
  },
  limitedTag: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(168,85,247,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.38)',
    zIndex: 2,
  },
  limitedTagText: { fontSize: 9, fontWeight: '800', color: rarity.epic.text, letterSpacing: 0.35 },
  giftableTag: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(34,211,238,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.28)',
    zIndex: 2,
  },
  giftableTagText: { fontSize: 9, fontWeight: '800', color: rarity.rare.text },
  browseName: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.dark.text,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  rarityPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    marginBottom: 8,
  },
  rarityText: { fontSize: 10, fontWeight: '800' },
  ownedPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.chip,
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.28)',
  },
  ownedPillText: { fontSize: 11, fontWeight: '800', color: colors.status.online },
  equippedPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.chip,
    backgroundColor: 'rgba(56,189,248,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.28)',
  },
  equippedPillText: { fontSize: 11, fontWeight: '800', color: rarity.rare.text },
  borderActions: { flexDirection: 'row', gap: 8 },
  borderActionsColumn: { gap: 8, alignItems: 'center' },
  equipChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.chip,
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.42)',
  },
  equipChipText: { fontSize: 12, fontWeight: '800', color: pulseverse.electric },
  borderBuyChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.chip,
    backgroundColor: pulseverse.electric,
    ...shadows.ctaSoft,
  },
  borderBuyChipText: { fontSize: 12, fontWeight: '800', color: pulseverse.onElectric },
  borderGiftChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.chip,
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.42)',
    backgroundColor: 'transparent',
  },
  borderGiftChipText: { fontSize: 12, fontWeight: '800', color: pulseverse.electric },
  footerBannerIap: {
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(212,166,58,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(212,166,58,0.22)',
  },
  footerTextIap: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: colors.dark.textSecondary,
    fontWeight: '600',
  },
  creditsHero: {
    padding: 18,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.borderSubtle,
    marginBottom: 18,
  },
  creditsHeroLabel: { fontSize: 12, fontWeight: '700', color: colors.dark.textMuted, letterSpacing: 0.5 },
  creditsHeroValue: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.dark.text,
    marginTop: 6,
    letterSpacing: -0.5,
  },
  creditsHeroSub: { fontSize: 13, color: colors.dark.textSecondary, marginTop: 6, fontWeight: '500' },
  packSectionTitle: {
    ...typography.label,
    color: colors.dark.textMuted,
    marginBottom: 10,
  },
  packCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 12,
  },
  packCardSparks: {
    borderLeftWidth: 3,
    borderLeftColor: pulseverse.electric,
    borderColor: 'rgba(34,211,238,0.18)',
  },
  packLeft: { flex: 1, minWidth: 0 },
  packTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  packTagCyan: { backgroundColor: 'rgba(34,211,238,0.15)', borderWidth: 1, borderColor: 'rgba(34,211,238,0.35)' },
  packTagGold: { backgroundColor: 'rgba(212,166,58,0.15)', borderWidth: 1, borderColor: 'rgba(212,166,58,0.35)' },
  packTagText: { fontSize: 9, fontWeight: '900', color: colors.dark.text, letterSpacing: 0.6 },
  packSparks: { fontSize: 20, fontWeight: '900', color: colors.dark.text },
  packFine: { fontSize: 12, color: colors.dark.textMuted, marginTop: 4, fontWeight: '500' },
  packCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: pulseverse.electric,
  },
  packCtaText: { fontSize: 13, fontWeight: '900', color: pulseverse.onElectric },
  creditsLegal: {
    marginTop: 8,
    fontSize: 11,
    lineHeight: 16,
    color: colors.dark.textQuiet,
    fontWeight: '500',
  },
  giftsLede: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.dark.textSecondary,
    fontWeight: '500',
    marginBottom: 14,
  },
  giftsHeroPanel: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: 16,
    borderRadius: borderRadius.xl,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.25)',
    backgroundColor: 'rgba(15,23,42,0.75)',
  },
  giftsHeroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(167,139,250,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(196,181,253,0.35)',
  },
  giftsHeroTitle: { fontSize: 16, fontWeight: '900', color: colors.dark.text, letterSpacing: -0.2 },
  giftsHeroBody: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: colors.dark.textSecondary,
    fontWeight: '600',
  },
  giftRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(15,23,42,0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderLeftWidth: 3,
    marginBottom: 10,
  },
  giftRowOrb: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1.5,
  },
  giftRowBody: { flex: 1, minWidth: 0 },
  giftRowName: { fontSize: 16, fontWeight: '900', color: colors.dark.text, letterSpacing: -0.2 },
  giftRowPrice: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '800',
    color: pulseverse.electricSoft,
  },
  giftRowChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  insufficientHintSmall: { marginTop: 6, fontSize: 11, fontWeight: '700', color: semantic.danger },
  tipBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(56,189,248,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.22)',
    marginBottom: 16,
  },
  tipBannerText: { flex: 1, fontSize: 13, lineHeight: 18, color: colors.dark.textSecondary, fontWeight: '500' },
  giftTierChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 14,
    paddingTop: 4,
  },
  giftTierChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
    backgroundColor: 'rgba(15,23,42,0.55)',
  },
  giftTierChipOn: {
    borderColor: 'rgba(34,211,238,0.5)',
    backgroundColor: 'rgba(34,211,238,0.22)',
  },
  giftTierChipText: { fontSize: 12, fontWeight: '800', color: colors.dark.textSecondary },
  giftTierChipTextOn: { color: pulseverse.onElectric },
  giftTierSectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
    marginTop: 4,
  },
  giftTierSectionRule: { width: 4, borderRadius: 2, minHeight: 36, marginTop: 2 },
  giftTierSectionTitle: { fontSize: 15, fontWeight: '900', color: colors.dark.text },
  giftTierSectionTagline: { fontSize: 12, color: colors.dark.textMuted, marginTop: 2, fontWeight: '600' },
  giftGridFull: { gap: 12 },
  giftFullCard: {
    padding: 16,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  giftFullCardSparks: {
    borderLeftWidth: 3,
    borderLeftColor: colors.status.invite,
    borderColor: 'rgba(167,139,250,0.2)',
    backgroundColor: 'rgba(167,139,250,0.04)',
  },
  giftIconOrb: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginBottom: 12,
    overflow: 'hidden',
  },
  giftFullName: { fontSize: 17, fontWeight: '900', color: colors.dark.text },
  giftFullPrice: { fontSize: 14, fontWeight: '800', color: pulseverse.electricSoft, marginTop: 4 },
  contextRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  contextChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(56,189,248,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.25)',
  },
  contextChipText: { fontSize: 10, fontWeight: '800', color: rarity.rare.text },
  insufficientHint: { marginTop: 8, fontSize: 12, fontWeight: '700', color: semantic.danger },
  emptyText: { color: colors.dark.textMuted, textAlign: 'center', marginVertical: 24, fontWeight: '600' },
  moreHero: {
    padding: 20,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.2)',
    alignItems: 'center',
    marginBottom: 20,
  },
  moreHeroTitle: { marginTop: 10, fontSize: 18, fontWeight: '900', color: colors.dark.text },
  moreHeroBody: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    color: colors.dark.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  historyHead: { fontSize: 14, fontWeight: '800', color: colors.dark.text, marginBottom: 10 },
  historyEmpty: { color: colors.dark.textMuted, fontSize: 13, marginBottom: 12 },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.borderSubtle,
  },
  historyStore: { fontSize: 13, fontWeight: '700', color: colors.dark.text },
  historyMeta: { fontSize: 11, color: colors.dark.textMuted, marginTop: 2 },
  historyPlat: { fontSize: 11, fontWeight: '800', color: pulseverse.electricSoft, textTransform: 'uppercase' },
});
