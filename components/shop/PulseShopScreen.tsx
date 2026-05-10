import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, layout, typography, pulseverse, gradients, semantic, spacing, shadows } from '@/theme';
import { PageHeader } from '@/components/ui/PageHeader';
import { pulseImageListThumbProps } from '@/lib/pulseImage';
import { useToast } from '@/components/ui/Toast';
import { analytics } from '@/lib/analytics';
import { useAuth } from '@/contexts/AuthContext';
import {
  useShopCatalog,
  useSparkWallet,
  useShopInventoryState,
  useShopDerived,
  useEnsureShopWallets,
  useShopRefetchers,
  useSparkBalanceNumber,
  usePurchaseReceipts,
} from '@/hooks/useShopEconomy';
import { purchaseService } from '@/services/shop/purchaseService';
import type { PurchaseReceiptRow, ShopItemRow } from '@/lib/shop/types';
import { ringPreviewColor, sparkPackLabel, giftIconFromItem, isFreeShopBorder } from '@/lib/shop/catalogUtils';
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
import { BorderCard } from '@/components/shop/border/BorderCard';
import { BorderDetailModal } from '@/components/shop/border/BorderDetailModal';
import { useBorderCollectionsMap } from '@/hooks/useBorderCollectionsMap';
import { useBorderCatalogLists } from '@/hooks/useBorderCatalogFilters';
import { ShopResultModal } from '@/components/shop/ShopResultModal';
import { ShopCatalogSkeleton } from '@/components/shop/ShopLoadingSkeleton';
import { queryClient } from '@/lib/queryClient';
import { shopKeys } from '@/lib/shop/queryKeys';
import { shopQueriesService } from '@/services/shop/shopQueries';

const { width: SCREEN_W } = Dimensions.get('window');
const H_PAD = layout.screenPadding;

type ShopTabKey = 'borders' | 'credits' | 'gifts' | 'more';

const TABS: { key: ShopTabKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'borders', label: 'Borders', icon: 'sparkles-outline' },
  { key: 'credits', label: 'Credits', icon: 'wallet-outline' },
  { key: 'gifts', label: 'Gifts', icon: 'gift-outline' },
  { key: 'more', label: 'More', icon: 'ellipsis-horizontal' },
];

type Celebration =
  | null
  | {
      kind: 'border' | 'spark' | 'gift_sent';
      title: string;
      message?: string;
      equipInventoryId?: string;
    };

export default function PulseShopScreen() {
  const router = useRouter();
  const { tab: tabParam } = useLocalSearchParams<{ tab?: string }>();
  const insets = useSafeAreaInsets();
  const showToast = useToast((s) => s.show);
  const { user: authUser } = useAuth();
  const userId = authUser?.id;

  const initialTab = useMemo((): ShopTabKey => {
    const t = typeof tabParam === 'string' ? tabParam.toLowerCase() : '';
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
  const walletQ = useSparkWallet(userId);
  const sparkBalance = useSparkBalanceNumber(walletQ.data);
  const invState = useShopInventoryState(userId);
  const { refreshAfterPurchase } = useShopRefetchers(userId);
  const receiptsQ = usePurchaseReceipts(userId);
  const shopReceipts: PurchaseReceiptRow[] = (receiptsQ.data ?? []) as PurchaseReceiptRow[];

  const { borders, packs, gifts, featured, browseBorders } = useShopDerived(catalogQ.data);

  const collectionsQ = useBorderCollectionsMap();

  const [buyItem, setBuyItem] = useState<ShopItemRow | null>(null);
  const [giftBorderItem, setGiftBorderItem] = useState<ShopItemRow | null>(null);
  const [purchaseChoiceItem, setPurchaseChoiceItem] = useState<ShopItemRow | null>(null);
  const [borderDetailItem, setBorderDetailItem] = useState<ShopItemRow | null>(null);
  const [previewGift, setPreviewGift] = useState<ShopItemRow | null>(null);
  const [creditItem, setCreditItem] = useState<ShopItemRow | null>(null);
  const [celebration, setCelebration] = useState<Celebration>(null);
  const [refreshing, setRefreshing] = useState(false);

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
        invState.refetch(),
        receiptsQ.refetch(),
        collectionsQ.refetch(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [catalogQ, walletQ, invState, receiptsQ, collectionsQ]);

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
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      analytics.track('border_purchase_started', { shop_item_id: b.id, surface: 'shop' });
      analytics.track('border_viewed', { shop_item_id: b.id, name: b.name });
      setPurchaseChoiceItem(b);
    }
  };

  const feat = featured ?? browseBorders[0] ?? null;
  const browseList = featured ? browseBorders : borders;

  const { processed: browseProcessed, filter: borderFilter, setFilter: setBorderFilter, sort: borderSort, setSort: setBorderSort } =
    useBorderCatalogLists(browseList, invState.ownsBorder);

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
                  size={18}
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
              <Ionicons name="cloud-offline-outline" size={36} color="#FB7185" />
              <Text style={styles.errorTitle}>Shop unavailable</Text>
              <Text style={styles.errorBanner}>
                Check your connection, then pull to refresh or try again.
              </Text>
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
                <LinearGradient
                  colors={[...gradients.featuredBorder]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.featuredWrap}
                >
                  <View style={styles.featuredInner}>
                <Text style={styles.featuredKicker}>Featured border</Text>
                    <TouchableOpacity
                      activeOpacity={0.96}
                      onPress={() => setBorderDetailItem(feat)}
                      accessibilityRole="button"
                      accessibilityLabel="View border details"
                    >
                      <View style={styles.featuredMainRow}>
                        <View style={styles.featuredCopy}>
                          <Text style={styles.featuredTitle}>{feat.name}</Text>
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
                          <Text style={styles.featuredDesc}>{feat.description}</Text>
                          {!isFreeShopBorder(feat) ? (
                            <View style={styles.directPurchaseRow}>
                              <Ionicons name="phone-portrait-outline" size={14} color={colors.dark.textMuted} />
                              <Text style={styles.directPurchaseText}>Direct purchase · App Store / Google Play</Text>
                            </View>
                          ) : (
                            <View style={styles.directPurchaseRow}>
                              <Ionicons name="gift-outline" size={14} color="#86EFAC" />
                              <Text style={[styles.directPurchaseText, { color: '#86EFAC' }]}>Free for everyone · tap below</Text>
                            </View>
                          )}
                        </View>
                        <BorderPreviewPlate
                          ringColor={ringPreviewColor(feat)}
                          size={88}
                          rankPlace={feat.rank_place}
                          showMotionHint={
                            feat.visual_tier === 'animated' ||
                            feat.visual_tier === 'reactive' ||
                            feat.is_animated === true
                          }
                          shopItem={feat}
                        />
                      </View>
                    </TouchableOpacity>
                    {invState.ownsBorder(feat.id) ? (
                      <View style={styles.ownedBanner}>
                        <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
                        <Text style={styles.ownedBannerText}>
                          {equipped?.shop_item_id === feat.id ? 'Active on your avatar' : 'In your collection'}
                        </Text>
                        {equipped?.shop_item_id !== feat.id ? (
                          <TouchableOpacity
                            style={styles.giftMiniBtn}
                            onPress={() => {
                              const row = invState.inventoryRowForBorder(feat.id);
                              if (row) void handleEquip(row.id);
                            }}
                          >
                            <Text style={styles.giftMiniBtnText}>Equip</Text>
                          </TouchableOpacity>
                        ) : null}
                        {feat.is_giftable ? (
                          <TouchableOpacity style={styles.giftMiniBtn} onPress={() => setGiftBorderItem(feat)}>
                            <Text style={styles.giftMiniBtnText}>Gift</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    ) : (
                      <>
                        {Platform.OS === 'web' ? (
                          <View style={styles.webIapNote}>
                            <Text style={styles.webIapNoteText}>
                              Border purchases run in the iOS/Android app with the native store.
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
                                color="#FFF"
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
                </LinearGradient>

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
                      borderFilter.acquisition === 'all' && !borderFilter.ownedOnly && styles.filterChipOn,
                    ]}
                    onPress={() => setBorderFilter({ acquisition: 'all', ownedOnly: false })}
                    activeOpacity={0.88}
                  >
                    <Text style={styles.filterChipText}>All</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.filterChip, borderFilter.ownedOnly && styles.filterChipOn]}
                    onPress={() => setBorderFilter({ acquisition: 'all', ownedOnly: true })}
                    activeOpacity={0.88}
                  >
                    <Text style={styles.filterChipText}>My borders</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      borderFilter.acquisition === 'shop' && !borderFilter.ownedOnly && styles.filterChipOn,
                    ]}
                    onPress={() => setBorderFilter({ acquisition: 'shop', ownedOnly: false })}
                    activeOpacity={0.88}
                  >
                    <Text style={styles.filterChipText}>Shop</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      borderFilter.acquisition === 'earned' && !borderFilter.ownedOnly && styles.filterChipOn,
                    ]}
                    onPress={() => setBorderFilter({ acquisition: 'earned', ownedOnly: false })}
                    activeOpacity={0.88}
                  >
                    <Text style={styles.filterChipText}>Earned</Text>
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
                      onEquip={(rowId) => void handleEquip(rowId)}
                    />
                  ))}
                </ScrollView>

                <View style={styles.footerBannerIap}>
                  <Ionicons name="shield-checkmark-outline" size={20} color="#E7C975" style={{ marginRight: 10 }} />
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
                    <Ionicons name="flash" size={17} color="#67E8F9" style={{ marginRight: 8 }} />
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
                          if (Platform.OS === 'web') {
                            showToast('Spark packs are available in the iOS/Android app.', 'info');
                            return;
                          }
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
                <View style={styles.economyContextSparks}>
                  <LinearGradient
                    colors={[...gradients.economyGift]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.economyContextSparksGrad}
                  >
                    <Ionicons name="gift-outline" size={17} color="#C4B5FD" style={{ marginRight: 8 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.economyContextTitleSparks}>Creator gifts · Sparks only</Text>
                      <Text style={styles.economyContextSubSparks}>
                        Not the app store — these use your Sparks balance. Different from border checkout in the
                        Borders tab.
                      </Text>
                    </View>
                  </LinearGradient>
                </View>
                <Text style={styles.giftsLede}>
                  Send from a profile, post, or live stream — browse the catalog here first.
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
                <View style={styles.giftGridFull}>
                  {gifts.map((g) => {
                    const price = g.spark_price ?? 0;
                    const short = sparkBalance < price;
                    return (
                      <TouchableOpacity
                        key={g.id}
                        style={[styles.giftFullCard, styles.giftFullCardSparks]}
                        activeOpacity={0.9}
                        onPress={() => {
                          analytics.track('border_viewed', { shop_item_id: g.id, kind: 'gift', name: g.name });
                          setPreviewGift(g);
                        }}
                      >
                        <View style={[styles.giftIconOrb, { borderColor: ringPreviewColor(g) + '55' }]}>
                          {g.image_url ? (
                            <Image source={{ uri: g.image_url }} style={styles.giftThumb} {...pulseImageListThumbProps} />
                          ) : (
                            <Ionicons name={giftIconFromItem(g) as any} size={26} color={pulseverse.electric} />
                          )}
                        </View>
                        <Text style={styles.giftFullName}>{g.name}</Text>
                        <Text style={styles.giftFullPrice}>{price.toLocaleString()} Sparks</Text>
                        <View style={styles.contextRow}>
                          {(g.gift_contexts ?? []).map((c) => (
                            <View key={c} style={styles.contextChip}>
                              <Text style={styles.contextChipText}>
                                {c === 'post' ? 'Posts' : c === 'live' ? 'Live' : 'Profile'}
                              </Text>
                            </View>
                          ))}
                        </View>
                        {short ? (
                          <Text style={styles.insufficientHint}>Not enough Sparks — top up in Credits.</Text>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {gifts.length === 0 ? <Text style={styles.emptyText}>No gifts in the catalog yet.</Text> : null}
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
        onPurchase={async () => {
          if (!buyItem) return { ok: false as const, code: 'INVALID_INPUT', message: 'Missing item' };
          return await purchaseService.purchaseBorderForSelf(buyItem);
        }}
        onSuccess={async () => {
          await refreshAfterPurchase();
          analytics.track('border_purchase_completed', { shop_item_id: buyItem?.id ?? '' });
          let equipInventoryId: string | undefined;
          if (userId && buyItem) {
            const inv = await queryClient.fetchQuery({
              queryKey: shopKeys.inventory(userId),
              queryFn: () => shopQueriesService.getUserInventory(userId),
            });
            equipInventoryId = inv.find((i) => i.shop_item_id === buyItem.id)?.id;
          }
          setCelebration({
            kind: 'border',
            title: 'Border unlocked',
            message: `${buyItem?.name} is yours. Equip it to show it off.`,
            equipInventoryId,
          });
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          showToast('Border unlocked!', 'success');
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
            title: 'Gift sent',
            message: `Border gift on its way to ${recipient}.`,
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
        visible={!!creditItem && Platform.OS !== 'web'}
        onClose={() => setCreditItem(null)}
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
        onPurchase={async () => {
          if (!creditItem) return { ok: false as const, code: 'INVALID_INPUT', message: 'Missing pack' };
          analytics.track('spark_pack_purchase_started', { shop_item_id: creditItem.id });
          return await purchaseService.purchaseSparkPack(creditItem);
        }}
        onSuccess={async () => {
          await refreshAfterPurchase();
          analytics.track('spark_pack_purchase_completed', { shop_item_id: creditItem?.id ?? '' });
          setCelebration({
            kind: 'spark',
            title: 'Sparks added',
            message: 'Your balance is updated from the server.',
          });
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
      />

      <ShopResultModal
        visible={!!celebration}
        variant="success"
        title={celebration?.title ?? ''}
        message={celebration?.message}
        primaryLabel={
          celebration?.kind === 'border' && celebration.equipInventoryId ? 'Equip now' : undefined
        }
        onPrimary={
          celebration?.kind === 'border' && celebration.equipInventoryId
            ? async () => {
                await handleEquip(celebration.equipInventoryId!);
                setCelebration(null);
              }
            : undefined
        }
        tertiaryLabel={celebration?.kind === 'border' ? 'My borders' : undefined}
        onTertiary={
          celebration?.kind === 'border'
            ? () => {
                setCelebration(null);
                router.push('/my-borders' as any);
              }
            : undefined
        }
        onClose={() => setCelebration(null)}
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
  retryBtn: {
    marginTop: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: borderRadius.lg,
    backgroundColor: pulseverse.electric,
    ...shadows.ctaSoft,
  },
  retryBtnText: { fontWeight: '900', color: pulseverse.onElectric },
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
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: 22,
    paddingHorizontal: 4,
  },
  tabBtn: { flex: 1, alignItems: 'center', minWidth: 0 },
  tabIconGlow: {
    textShadowColor: pulseverse.electric,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
    opacity: 1,
  },
  tabLabel: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '700',
    color: colors.dark.textMuted,
    letterSpacing: 0.15,
  },
  tabLabelActive: { color: pulseverse.electric },
  tabUnderline: {
    marginTop: 8,
    height: 3,
    width: 28,
    borderRadius: 2,
    backgroundColor: pulseverse.electric,
  },
  tabUnderlinePlaceholder: { marginTop: 8, height: 3, width: 28 },
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
    color: '#A5F3FC',
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
  featuredWrap: {
    borderRadius: borderRadius.xl + 2,
    padding: 2,
    marginBottom: spacing['2xl'] + 4,
  },
  featuredInner: {
    borderRadius: borderRadius.card,
    backgroundColor: colors.dark.card,
    padding: 20,
    borderWidth: 1,
    borderColor: pulseverse.cardRim,
  },
  featuredKicker: {
    fontSize: 10,
    fontWeight: '800',
    color: pulseverse.storeAccent,
    letterSpacing: 1.2,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  featuredMainRow: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  featuredCopy: { flex: 1, minWidth: 0 },
  featuredTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.dark.text,
    letterSpacing: -0.3,
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
  legendText: { fontSize: 11, fontWeight: '800', color: '#E7C975' },
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
  buyBtnText: { fontSize: 15, fontWeight: '800', color: '#FFF' },
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
  ownedBanner: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    padding: 12,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.28)',
  },
  ownedBannerText: { fontSize: 14, fontWeight: '800', color: '#22C55E', flex: 1 },
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
  limitedTagText: { fontSize: 9, fontWeight: '800', color: '#C4B5FD', letterSpacing: 0.35 },
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
  giftableTagText: { fontSize: 9, fontWeight: '800', color: '#7DD3FC' },
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
  ownedPillText: { fontSize: 11, fontWeight: '800', color: '#22C55E' },
  equippedPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.chip,
    backgroundColor: 'rgba(56,189,248,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.28)',
  },
  equippedPillText: { fontSize: 11, fontWeight: '800', color: '#7DD3FC' },
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
    marginBottom: 16,
  },
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
    borderLeftColor: '#A78BFA',
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
  giftThumb: { width: 52, height: 52, borderRadius: 26 },
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
  contextChipText: { fontSize: 10, fontWeight: '800', color: '#7DD3FC' },
  insufficientHint: { marginTop: 8, fontSize: 12, fontWeight: '700', color: '#F87171' },
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
