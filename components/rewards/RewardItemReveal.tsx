import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, pulseverse, gradients } from '@/theme';
import type { BorderRewardMetadata, RewardDeliveryRecord, RewardRevealPhase } from '@/lib/rewardDelivery/types';
import { BorderPreviewPlate } from '@/components/shop/border/BorderPreviewPlate';
import { AvatarDisplay, pulseFrameFromUser } from '@/components/profile/AvatarBuilder';
import type { PulseAvatarFrame } from '@/types';
import type { ShopItemRow } from '@/lib/shop/types';
import { useAuth } from '@/contexts/AuthContext';
import { coerceCssColor } from '@/lib/coerceCssColor';
import { ringPreviewColor } from '@/lib/shop/catalogUtils';
import { shopItemBundledRasterPreview } from '@/lib/pulseRingRasterAssets';
import { shopQueriesService } from '@/services/shop/shopQueries';
import { shopKeys } from '@/lib/shop/queryKeys';
import { rewardDeliveryDebug } from '@/lib/rewardDelivery/debugLog';
import { CreatorGiftOrb } from '@/components/shop/CreatorGiftOrb';
import { BorderRarityBadge } from '@/components/shop/border/BorderRarityBadge';

type Props = {
  delivery: RewardDeliveryRecord;
  phase: RewardRevealPhase;
};

function metaString(meta: Record<string, unknown>, key: string): string | null {
  const v = meta[key];
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

function asBorderMeta(metadata: Record<string, unknown>): BorderRewardMetadata {
  return metadata as unknown as BorderRewardMetadata;
}

function shopStubFromBorderMeta(bm: BorderRewardMetadata): ShopItemRow {
  const slug = bm.border_name?.trim()?.toLowerCase().replace(/\s+/g, '-') ?? 'reward-border';
  return {
    id: bm.shop_item_id ?? 'reward-border',
    slug,
    type: 'border',
    category: null,
    name: bm.border_name ?? 'Border',
    description: '',
    rarity: bm.rarity_slug ?? null,
    image_url: bm.preview_image_url ?? null,
    animation_url: bm.preview_image_url ?? null,
    spark_price: null,
    spark_amount: null,
    real_money_display_price: null,
    store_product_id_ios: null,
    store_product_id_android: null,
    is_active: true,
    is_giftable: false,
    is_limited: false,
    inventory_count: null,
    release_at: null,
    expires_at: null,
    sort_order: 0,
    gift_contexts: null,
    metadata: {},
    created_at: '',
    updated_at: '',
    rarity_tier: (bm.rarity_label as ShopItemRow['rarity_tier']) ?? null,
    visual_tier: undefined,
    is_animated: Boolean(bm.preview_image_url),
  };
}

export function RewardItemReveal({ delivery, phase }: Props) {
  const scale = useSharedValue(0.2);
  const opacity = useSharedValue(0);

  const emerged =
    phase === 'item_emerge' ||
    phase === 'item_settle' ||
    phase === 'details_visible' ||
    phase === 'complete';

  const meta = delivery.metadata ?? {};
  const borderMetaBase = useMemo(() => asBorderMeta(meta), [meta]);
  const shopId =
    delivery.item_type === 'border' ? borderMetaBase.shop_item_id?.trim() ?? '' : '';
  const missingPreview =
    delivery.item_type === 'border' && !borderMetaBase.preview_image_url?.trim();

  /** Creator Sparks gift → Diamonds: server stores shop gift id on `item_id` (migration 164). */
  const creatorDiamondGiftShopId =
    delivery.item_type === 'diamonds' && metaString(meta, 'reason') === 'gift_conversion'
      ? (delivery.item_id?.trim() ?? '')
      : '';

  const { data: catalogRows } = useQuery({
    queryKey: shopKeys.shopItemsByIds(shopId || '__none__'),
    queryFn: () => shopQueriesService.getShopItemsByIds([shopId]),
    /** Always load catalog for borders so leaderboard rows supply `rank_place` + bundled podium art. */
    enabled: Boolean(delivery.item_type === 'border' && shopId),
    staleTime: 120_000,
  });

  const { data: creatorDiamondGiftRows, isPending: creatorDiamondGiftPending } = useQuery({
    queryKey: shopKeys.shopItemsByIds(creatorDiamondGiftShopId || '__none__'),
    queryFn: () => shopQueriesService.getShopItemsByIds([creatorDiamondGiftShopId]),
    enabled: Boolean(creatorDiamondGiftShopId),
    staleTime: 120_000,
  });

  const creatorDiamondGiftItem = creatorDiamondGiftRows?.[0];

  const borderMetaResolved = useMemo(() => {
    if (delivery.item_type !== 'border') return borderMetaBase;
    const row = catalogRows?.[0];
    if (!row) return borderMetaBase;
    const enriched: BorderRewardMetadata = {
      ...borderMetaBase,
      preview_image_url: borderMetaBase.preview_image_url?.trim()
        ? borderMetaBase.preview_image_url
        : row.image_url ?? row.animation_url ?? null,
      border_name: borderMetaBase.border_name ?? row.name,
      rarity_slug: borderMetaBase.rarity_slug ?? row.rarity ?? null,
      rarity_label: borderMetaBase.rarity_label ?? row.rarity_tier ?? row.rarity ?? null,
      ring_preview_hex: borderMetaBase.ring_preview_hex ?? ringPreviewColor(row),
    };
    if (missingPreview && (row.image_url || row.animation_url)) {
      rewardDeliveryDebug.catalogHydrate(shopId, true);
    }
    return enriched;
  }, [delivery.item_type, borderMetaBase, catalogRows, missingPreview, shopId]);

  useEffect(() => {
    if (!missingPreview || !shopId || catalogRows === undefined) return;
    if (catalogRows.length === 0) rewardDeliveryDebug.catalogHydrate(shopId, false);
  }, [missingPreview, shopId, catalogRows]);

  useEffect(() => {
    if (!emerged) {
      opacity.value = withTiming(0, { duration: 120 });
      scale.value = withTiming(0.2, { duration: 120 });
      return;
    }
    opacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
    scale.value = withSpring(1, { damping: 14, stiffness: 160 });
  }, [emerged, opacity, scale]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const { profile } = useAuth();

  const inner = (() => {
    switch (delivery.item_type) {
      case 'border': {
        const bm = borderMetaResolved;
        const stub = shopStubFromBorderMeta(bm);
        const row = catalogRows?.[0];
        const shopItemForPlate: ShopItemRow = row
          ? {
              ...row,
              image_url: bm.preview_image_url?.trim() ? bm.preview_image_url : row.image_url,
              animation_url: bm.preview_image_url?.trim() ? bm.preview_image_url : row.animation_url,
              name: bm.border_name ?? row.name,
              rarity: bm.rarity_slug ?? row.rarity,
              rarity_tier: (bm.rarity_label as ShopItemRow['rarity_tier']) ?? row.rarity_tier,
            }
          : stub;
        const ring = coerceCssColor(bm.ring_preview_hex ?? '#38BDF8', '#38BDF8');
        const borderCatalogPending = Boolean(shopId && catalogRows === undefined);
        const plateShowsRaster =
          shopItemBundledRasterPreview(shopItemForPlate) != null ||
          Boolean(shopItemForPlate.image_url?.trim() || shopItemForPlate.animation_url?.trim());
        const stillNoArt = !borderCatalogPending && !plateShowsRaster;
        const rankPlace =
          typeof row?.rank_place === 'number' && row.rank_place > 0 ? row.rank_place : null;
        return (
          <View style={styles.borderPlate}>
            <BorderPreviewPlate
              ringColor={ring}
              size={128}
              frame="podium"
              shopItem={shopItemForPlate}
              rankPlace={rankPlace}
              showMotionHint
            />
            <View style={styles.borderRevealBadgeRow}>
              <BorderRarityBadge item={shopItemForPlate} compact emphasized align="center" />
            </View>
            {stillNoArt ? (
              <View style={styles.borderFallbackBanner}>
                <Ionicons name="sparkles-outline" size={18} color={pulseverse.electricSoft} />
                <Text style={styles.borderFallbackName}>{bm.border_name ?? 'Border reward'}</Text>
                <Text style={styles.borderFallbackHint}>Preview unavailable — your border is saved in My Borders.</Text>
              </View>
            ) : null}
          </View>
        );
      }
      case 'sparks': {
        const metaQty = metaString(meta, 'quantity');
        const parsed = metaQty != null ? Number(metaQty) : NaN;
        const base = delivery.quantity;
        const qty =
          typeof base === 'number' && Number.isFinite(base)
            ? base
            : Number.isFinite(parsed)
              ? parsed
              : 0;
        return (
          <LinearGradient colors={[...gradients.economySparks]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.sparkOrb}>
            <Ionicons name="flash" size={56} color="#ECFEFF" />
            <Text style={styles.sparkAmt}>+{qty.toLocaleString()}</Text>
            <Text style={styles.sparkLbl}>Sparks</Text>
          </LinearGradient>
        );
      }
      case 'diamonds': {
        const metaQty = metaString(meta, 'quantity');
        const parsed = metaQty != null ? Number(metaQty) : NaN;
        const base = delivery.quantity;
        const qty =
          typeof base === 'number' && Number.isFinite(base)
            ? base
            : Number.isFinite(parsed)
              ? parsed
              : 0;
        const giftLabel = metaString(meta, 'gift_name');
        const diamondReason = metaString(meta, 'reason');
        const showCreatorGiftArt =
          diamondReason === 'gift_conversion' && Boolean(creatorDiamondGiftShopId);
        const liveStickerEmoji =
          diamondReason === 'live_stream' ? metaString(meta, 'gift_emoji') : null;

        return (
          <View style={styles.diamondRevealColumn}>
            <View style={styles.diamondGiftOrbRing}>
              {showCreatorGiftArt ? (
                creatorDiamondGiftPending ? (
                  <View style={[styles.diamondFallbackOrb, styles.diamondGiftLoadingOrb]}>
                    <ActivityIndicator color="#FDE68A" size="large" />
                  </View>
                ) : creatorDiamondGiftItem ? (
                  <CreatorGiftOrb item={creatorDiamondGiftItem} size={120} />
                ) : (
                  <LinearGradient
                    colors={['rgba(212,166,58,0.95)', 'rgba(251,191,36,0.75)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.diamondFallbackOrb}
                  >
                    <Ionicons name="diamond" size={52} color="#fff" />
                  </LinearGradient>
                )
              ) : liveStickerEmoji ? (
                <View style={styles.liveStickerOrb}>
                  <Text style={styles.liveStickerEmoji} allowFontScaling={false}>
                    {liveStickerEmoji}
                  </Text>
                </View>
              ) : (
                <LinearGradient
                  colors={['rgba(212,166,58,0.95)', 'rgba(251,191,36,0.75)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.diamondFallbackOrb}
                >
                  <Ionicons name="diamond" size={52} color="#fff" />
                </LinearGradient>
              )}
            </View>
            <Text style={styles.sparkAmt}>+{qty.toLocaleString()}</Text>
            <Text style={styles.sparkLbl}>Diamonds</Text>
            {giftLabel ? <Text style={styles.sparkGiftHint}>{giftLabel}</Text> : null}
          </View>
        );
      }
      case 'future_item':
      default: {
        const mk = metaString(meta, 'kind');
        if (mk === 'beta_tester_frame' && meta.frame && typeof meta.frame === 'object') {
          const frame = meta.frame as unknown as PulseAvatarFrame;
          const ring = pulseFrameFromUser(frame);
          return (
            <View style={styles.avatarWrap}>
              <AvatarDisplay
                size={112}
                avatarUrl={profile?.avatarUrl ?? undefined}
                prioritizeRemoteAvatar
                pulseFrame={ring ?? undefined}
              />
              <Text style={styles.futureCaption}>{frame.label}</Text>
            </View>
          );
        }
        if (mk === 'pulse_leaderboard_frame') {
          const ring = coerceCssColor(metaString(meta, 'ring_color'), '#EAB308');
          const glow = metaString(meta, 'glow_color') ?? 'rgba(234, 179, 8, 0.45)';
          const caption = metaString(meta, 'ring_caption');
          const tierRaw = metaString(meta, 'prize_tier');
          const tier =
            tierRaw === 'gold' || tierRaw === 'silver' || tierRaw === 'bronze' ? tierRaw : undefined;
          return (
            <View style={styles.avatarWrap}>
              <AvatarDisplay
                size={112}
                avatarUrl={profile?.avatarUrl ?? undefined}
                prioritizeRemoteAvatar
                pulseFrame={{
                  ringColor: ring,
                  glowColor: glow,
                  ringCaption: caption,
                  prizeTier: tier,
                  borderWidth: tier === 'gold' ? 4 : 3,
                }}
              />
              <Text style={styles.futureCaption}>{metaString(meta, 'frame_label') ?? 'Leaderboard border'}</Text>
            </View>
          );
        }
        return (
          <View style={styles.genericOrb}>
            <Ionicons name="ribbon-outline" size={48} color={pulseverse.electricSoft} />
            <Text style={styles.genericLbl}>Reward unlocked</Text>
          </View>
        );
      }
    }
  })();

  if (!emerged) return null;

  return <Animated.View style={[styles.wrap, animStyle]}>{inner}</Animated.View>;
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'box-none',
  },
  borderPlate: { alignItems: 'center', gap: 10 },
  borderRevealBadgeRow: {
    marginTop: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  borderFallbackBanner: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(12,18,32,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.22)',
    maxWidth: 280,
  },
  borderFallbackName: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.dark.text,
    textAlign: 'center',
  },
  borderFallbackHint: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.dark.textMuted,
    textAlign: 'center',
    lineHeight: 17,
  },
  sparkOrb: {
    width: 168,
    height: 168,
    borderRadius: 84,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  diamondRevealColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    maxWidth: 280,
  },
  diamondGiftOrbRing: {
    padding: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.35)',
  },
  diamondFallbackOrb: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  diamondGiftLoadingOrb: {
    backgroundColor: 'rgba(30,41,59,0.55)',
    justifyContent: 'center',
  },
  liveStickerOrb: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(12,18,32,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.22)',
  },
  liveStickerEmoji: {
    fontSize: 56,
    lineHeight: 62,
    textAlign: 'center',
  },
  sparkAmt: {
    marginTop: 6,
    fontSize: 26,
    fontWeight: '900',
    color: '#fff',
  },
  sparkLbl: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
  },
  sparkGiftHint: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
    maxWidth: 200,
  },
  avatarWrap: { alignItems: 'center', gap: 12 },
  futureCaption: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.dark.text,
    textAlign: 'center',
    maxWidth: 260,
  },
  genericOrb: {
    width: 152,
    height: 152,
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(12,18,32,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  genericLbl: { fontSize: 15, fontWeight: '800', color: colors.dark.textSecondary },
});
