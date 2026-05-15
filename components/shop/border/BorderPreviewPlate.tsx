import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import type { ShopItemRow } from '@/lib/shop/types';
import { pulseImageListThumbProps } from '@/lib/pulseImage';
import { rasterRingOuterBoxSide, shopItemBundledRasterPreview, shopItemIsEmeraldRenewalMay2026 } from '@/lib/pulseRingRasterAssets';
import { EmeraldRenewalRingMotion } from '@/components/profile/EmeraldRenewalRingMotion';
import { hexWithAlpha, ringBloomStyle } from '@/components/shop/border/previewPlateUtils';
import { WaterPodiumBackdrop } from '@/components/shop/border/WaterPodiumBackdrop';

function PlateChrome({
  framed,
  ringColor,
  stageSize,
  borderRadiusPx,
  children,
}: {
  framed: 'boxed' | 'podium';
  ringColor: string;
  stageSize: number;
  borderRadiusPx: number;
  children: React.ReactNode;
}) {
  if (framed === 'podium') {
    return (
      <WaterPodiumBackdrop stageDiameter={stageSize} ringColor={ringColor} intensity="featured">
        <View
          style={{
            width: stageSize,
            height: stageSize,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {children}
        </View>
      </WaterPodiumBackdrop>
    );
  }
  return (
    <LinearGradient
      colors={[
        hexWithAlpha(ringColor, 0.2),
        'rgba(15,23,42,0.55)',
        hexWithAlpha(ringColor, 0.12),
      ]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[
        styles.previewStage,
        { width: stageSize, height: stageSize, borderRadius: borderRadiusPx },
      ]}
    >
      {children}
    </LinearGradient>
  );
}

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
  /**
   * `boxed` — gradient square stage (grids, cards). `podium` — floating ring on liquid pedestal (featured hero).
   */
  frame?: 'boxed' | 'podium';
};

export function BorderPreviewPlate({
  ringColor,
  size = 72,
  rankPlace,
  showMotionHint,
  locked,
  shopItem,
  frame = 'boxed',
}: Props) {
  const r = size / 2;
  const inner = Math.max(size - 8, 32);
  const showRank = typeof rankPlace === 'number' && rankPlace > 0;
  const isPodium = frame === 'podium';

  const remoteUri = shopItem?.image_url?.trim() || shopItem?.animation_url?.trim();
  const bundled = shopItem ? shopItemBundledRasterPreview(shopItem) : null;

  const pad = 6;

  /* Shipped PNGs (beta, Pride, …) win over remote URLs so stale CDN rows never override app art. */
  if (bundled) {
    const outer = rasterRingOuterBoxSide(inner, bundled.innerOpeningFrac);
    const bloom = ringBloomStyle(ringColor, Boolean(locked), Math.min(16, Math.round(outer * 0.14)), {
      forPodium: isPodium,
    });
    const stageSize = outer + pad * 2;
    const wrapW = isPodium ? stageSize + 20 : stageSize + 8;
    const plateInner = (
      <View
        style={{
          width: outer,
          height: outer,
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
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
        <View style={[styles.rasterBloomClip, { width: outer, height: outer }]}>
          <View style={[styles.rasterBloom, bloom, { width: outer, height: outer }]}>
            <Image
              source={bundled.source}
              style={{ width: outer, height: outer }}
              contentFit="contain"
              pointerEvents="none"
              {...pulseImageListThumbProps}
            />
            {shopItem && shopItemIsEmeraldRenewalMay2026(shopItem) ? (
              <EmeraldRenewalRingMotion ringDiameter={outer} active />
            ) : null}
          </View>
        </View>
      </View>
    );

    const borderRadiusPx = frame === 'boxed' ? stageSize * 0.2 : 0;

    return (
      <View style={[styles.wrap, { width: wrapW }, locked && styles.previewLocked]}>
        <PlateChrome
          framed={frame}
          ringColor={ringColor}
          stageSize={stageSize}
          borderRadiusPx={borderRadiusPx}
        >
          {plateInner}
        </PlateChrome>
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
    const stageW = box + pad * 2;
    const bloom = ringBloomStyle(ringColor, Boolean(locked), 12, { forPodium: isPodium });
    const wrapW = isPodium ? stageW + 20 : stageW + 8;
    const plateInner = (
      <View style={{ width: box, height: box, position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
        <View style={[styles.rasterBloomClip, { width: box, height: box }]}>
          <View style={[styles.rasterBloom, bloom, { width: box, height: box }]}>
            <Image
              source={{ uri: remoteUri }}
              style={{ width: box, height: box, borderRadius: frame === 'boxed' ? 12 : 0 }}
              contentFit="contain"
              {...pulseImageListThumbProps}
            />
          </View>
        </View>
      </View>
    );

    return (
      <View style={[styles.wrap, { width: wrapW }, locked && styles.previewLocked]}>
        <PlateChrome framed={frame} ringColor={ringColor} stageSize={stageW} borderRadiusPx={16}>
          {plateInner}
        </PlateChrome>
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
    backgroundColor: 'rgba(51,65,85,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  previewStage: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  rasterBloomClip: {
    position: 'absolute',
    left: 0,
    top: 0,
    overflow: 'visible',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rasterBloom: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
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
