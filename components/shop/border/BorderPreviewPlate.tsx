import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import type { ShopItemRow } from '@/lib/shop/types';
import { pulseImageListThumbProps } from '@/lib/pulseImage';
import { rasterRingOuterBoxSide, shopItemBundledRasterPreview } from '@/lib/pulseRingRasterAssets';

type Props = {
  ringColor: string;
  size?: number;
  /** Leaderboard rank 1–5 */
  rankPlace?: number | null;
  showMotionHint?: boolean;
  locked?: boolean;
  /**
   * When set, shop may show `image_url`, bundled raster (e.g. Beta Pioneer), or fall back to stroke ring.
   */
  shopItem?: ShopItemRow | null;
};

export function BorderPreviewPlate({
  ringColor,
  size = 72,
  rankPlace,
  showMotionHint,
  locked,
  shopItem,
}: Props) {
  const r = size / 2;
  const inner = Math.max(size - 8, 32);
  const showRank = typeof rankPlace === 'number' && rankPlace > 0;

  const remoteUri = shopItem?.image_url?.trim() || shopItem?.animation_url?.trim();
  const bundled = shopItem ? shopItemBundledRasterPreview(shopItem) : null;

  /* Shipped PNGs (beta, Pride, …) win over remote URLs so stale CDN rows never override app art. */
  if (bundled) {
    const outer = rasterRingOuterBoxSide(inner, bundled.innerOpeningFrac);
    return (
      <View style={[styles.wrap, { width: outer + 8 }, locked && styles.previewLocked]}>
        <View
          style={{
            width: outer,
            height: outer,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View
            style={[
              styles.rasterFaceCircle,
              {
                width: inner,
                height: inner,
                borderRadius: inner / 2,
              },
            ]}
          >
            <Ionicons name="person" size={Math.round(inner * 0.36)} color={colors.dark.textMuted} />
          </View>
          <Image
            source={bundled.source}
            style={{ position: 'absolute', width: outer, height: outer, left: 0, top: 0 }}
            contentFit="contain"
            pointerEvents="none"
            {...pulseImageListThumbProps}
          />
        </View>
        {showRank ? (
          <View style={styles.rankBadge}>
            <Text style={styles.rankText}>#{rankPlace}</Text>
          </View>
        ) : null}
        {showMotionHint ? (
          <View style={styles.motionDot} accessibilityLabel="Animated or reactive border">
            <Ionicons name="sparkles" size={11} color="#FDE68A" />
          </View>
        ) : null}
      </View>
    );
  }

  if (remoteUri) {
    const box = Math.max(size + 8, 80);
    return (
      <View style={[styles.wrap, { width: box + 8 }, locked && styles.previewLocked]}>
        <Image
          source={{ uri: remoteUri }}
          style={{ width: box, height: box, borderRadius: 12 }}
          contentFit="contain"
          {...pulseImageListThumbProps}
        />
        {showRank ? (
          <View style={styles.rankBadge}>
            <Text style={styles.rankText}>#{rankPlace}</Text>
          </View>
        ) : null}
        {showMotionHint ? (
          <View style={styles.motionDot} accessibilityLabel="Animated or reactive border">
            <Ionicons name="sparkles" size={11} color="#FDE68A" />
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { width: size + 8 }]}>
      <View
        style={[
          styles.previewRing,
          { width: size, height: size, borderRadius: r, borderColor: ringColor },
          locked && styles.previewLocked,
        ]}
      >
        <View
          style={[
            styles.previewInner,
            {
              width: inner,
              height: inner,
              borderRadius: inner / 2,
            },
          ]}
        >
          <Ionicons name="person" size={Math.round(size * 0.36)} color={colors.dark.textMuted} />
        </View>
      </View>
      {showRank ? (
        <View style={styles.rankBadge}>
          <Text style={styles.rankText}>#{rankPlace}</Text>
        </View>
      ) : null}
      {showMotionHint ? (
        <View style={styles.motionDot} accessibilityLabel="Animated or reactive border">
          <Ionicons name="sparkles" size={11} color="#FDE68A" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', alignItems: 'center' },
  rasterFaceCircle: {
    backgroundColor: 'rgba(15,23,42,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewRing: {
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.55)',
  },
  previewLocked: { opacity: 0.55 },
  previewInner: {
    backgroundColor: 'rgba(15,23,42,0.88)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankBadge: {
    position: 'absolute',
    top: -2,
    right: 0,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(15,23,42,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(212,166,58,0.55)',
  },
  rankText: { fontSize: 11, fontWeight: '900', color: '#FDE68A' },
  motionDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(15,23,42,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(250,204,21,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
