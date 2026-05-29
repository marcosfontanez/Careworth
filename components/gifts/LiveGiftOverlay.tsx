import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CreatorGiftOrb } from '@/components/shop/CreatorGiftOrb';
import { prefetchCreatorGiftAsset } from '@/lib/gifts/GiftAssetResolver';
import type { ShopItemRow } from '@/lib/shop/types';
import { colors, borderRadius, typography } from '@/theme';

type Props = {
  giftSlug: string;
  giftName: string;
  shopItem: ShopItemRow | null;
  senderName?: string;
  onDone?: () => void;
};

const FALLBACK_SHOP_ITEM: ShopItemRow = {
  id: 'fallback-gift',
  slug: 'pulse',
  type: 'gift',
  category: null,
  name: 'Pulse Gift',
  description: '',
  rarity: null,
  image_url: null,
  animation_url: null,
  spark_price: 0,
  spark_amount: null,
  real_money_display_price: null,
  store_product_id_ios: null,
  store_product_id_android: null,
  is_active: true,
  is_giftable: true,
  is_limited: false,
  inventory_count: null,
  release_at: null,
  expires_at: null,
  sort_order: 0,
  gift_contexts: ['live'],
  metadata: {},
  created_at: '',
  updated_at: '',
};

function FallbackBanner({ giftName, senderName }: { giftName: string; senderName?: string }) {
  return (
    <View style={styles.fallback}>
      <Text style={styles.fallbackSender} numberOfLines={1}>
        {senderName ?? 'Someone'}
      </Text>
      <Text style={styles.fallbackGift} numberOfLines={1}>
        sent {giftName || 'a gift'} ✨
      </Text>
    </View>
  );
}

/**
 * Premium live gift burst — {@link CreatorGiftOrb} + bundled shop-gift art, text fallback on failure.
 */
export function LiveGiftOverlay({ giftSlug, giftName, shopItem, senderName, onDone }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.88)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  const orbItem = shopItem ?? { ...FALLBACK_SHOP_ITEM, slug: giftSlug || 'pulse', name: giftName || 'Gift' };
  const useTextFallback = !giftSlug && Boolean(giftName);

  useEffect(() => {
    prefetchCreatorGiftAsset(orbItem);
  }, [orbItem]);

  useEffect(() => {
    if (!giftSlug && !giftName) return;
    let anim: Animated.CompositeAnimation | null = null;
    try {
      opacity.setValue(0);
      scale.setValue(0.88);
      translateY.setValue(16);
      anim = Animated.sequence([
        Animated.parallel([
          Animated.timing(opacity, { toValue: 1, duration: 260, useNativeDriver: true }),
          Animated.spring(scale, { toValue: 1, friction: 7, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: 0, duration: 260, useNativeDriver: true }),
        ]),
        Animated.delay(2200),
        Animated.timing(opacity, { toValue: 0, duration: 420, useNativeDriver: true }),
      ]);
      anim.start(({ finished }) => {
        if (finished) onDone?.();
      });
    } catch (err) {
      if (__DEV__) console.warn('[LiveGiftOverlay]', err);
      onDone?.();
    }
    return () => anim?.stop();
  }, [giftSlug, giftName, opacity, scale, translateY, onDone]);

  if (!giftSlug && !giftName) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.wrap, { opacity, transform: [{ scale }, { translateY }] }]}
    >
      <LinearGradient
        colors={['rgba(56,189,248,0.22)', 'rgba(99,102,241,0.18)', 'rgba(12,18,32,0.92)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {useTextFallback ? (
          <FallbackBanner giftName={giftName} senderName={senderName} />
        ) : (
          <>
            <View style={styles.orbWrap}>
              <CreatorGiftOrb item={orbItem} size={72} />
            </View>
            <View style={styles.meta}>
              <Text style={styles.sender} numberOfLines={1}>
                {senderName ?? 'Someone'}
              </Text>
              <Text style={styles.giftName} numberOfLines={1}>
                sent {giftName || 'a gift'}
              </Text>
            </View>
          </>
        )}
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: '34%',
    alignSelf: 'center',
    zIndex: 40,
    maxWidth: '84%',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.35)',
  },
  orbWrap: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: { flexShrink: 1, minWidth: 0 },
  sender: {
    ...typography.caption,
    fontWeight: '800',
    color: colors.neutral.white,
  },
  giftName: {
    ...typography.caption,
    marginTop: 2,
    fontWeight: '700',
    color: colors.primary.gold,
  },
  fallback: { flex: 1, paddingVertical: 8, paddingHorizontal: 4, gap: 4 },
  fallbackSender: { ...typography.caption, fontWeight: '800', color: colors.neutral.white },
  fallbackGift: { ...typography.bodySmall, fontWeight: '700', color: colors.primary.gold },
});
