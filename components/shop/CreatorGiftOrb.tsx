import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { pulseImageListThumbProps } from '@/lib/pulseImage';
import { creatorGiftBundledSource } from '@/lib/shop/creatorGiftAssets';
import type { ShopItemRow } from '@/lib/shop/types';
import { CREATOR_GIFT_TIER_META, creatorGiftTierForItem } from '@/lib/shop/creatorGiftTiers';

type Props = {
  item: ShopItemRow;
  size?: number;
};

type MotionVariant = 'soft' | 'heartbeat' | 'bob' | 'twinkle' | 'spotlight' | 'orbit-wobble' | 'nova';

function motionVariantForSlug(slug: string): MotionVariant {
  switch (slug) {
    case 'pulse-nova':
      return 'nova';
    case 'pulse-orbit':
      return 'orbit-wobble';
    case 'pulse':
      return 'heartbeat';
    case 'coffee-drop':
      return 'bob';
    case 'crown':
    case 'night-residency':
      return 'twinkle';
    case 'spotlight-moment':
    case 'healers-monument':
      return 'spotlight';
    default:
      return 'soft';
  }
}

function PulseNovaLayers({ size }: { size: number }) {
  const shockA = useSharedValue(0);
  const shockB = useSharedValue(0);
  const flare = useSharedValue(0);

  useEffect(() => {
    const burst = withSequence(
      withTiming(0, { duration: 0 }),
      withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }),
      withTiming(0, { duration: 0 }),
      withDelay(280, withTiming(0, { duration: 0 }))
    );
    shockA.value = withRepeat(burst, -1, false);
    shockB.value = withDelay(480, withRepeat(burst, -1, false));
    flare.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 340, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.35, { duration: 420, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );
    return () => {
      cancelAnimation(shockA);
      cancelAnimation(shockB);
      cancelAnimation(flare);
    };
  }, [shockA, shockB, flare]);

  const ringA = useAnimatedStyle(() => ({
    opacity: interpolate(shockA.value, [0, 0.12, 1], [0, 0.72, 0]),
    transform: [{ scale: interpolate(shockA.value, [0, 1], [0.45, 1.55]) }],
  }));

  const ringB = useAnimatedStyle(() => ({
    opacity: interpolate(shockB.value, [0, 0.12, 1], [0, 0.5, 0]),
    transform: [{ scale: interpolate(shockB.value, [0, 1], [0.5, 1.42]) }],
  }));

  const coreGlow = useAnimatedStyle(() => ({
    opacity: interpolate(flare.value, [0.35, 1], [0.22, 0.62]),
    transform: [{ scale: interpolate(flare.value, [0.35, 1], [0.88, 1.18]) }],
  }));

  const half = size / 2;

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.novaGlow,
          {
            width: size * 0.92,
            height: size * 0.92,
            borderRadius: (size * 0.92) / 2,
            top: size * 0.04,
            left: size * 0.04,
            backgroundColor: 'rgba(34,211,238,0.38)',
          },
          coreGlow,
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.novaRing,
          {
            width: size * 0.72,
            height: size * 0.72,
            borderRadius: (size * 0.72) / 2,
            top: half - (size * 0.72) / 2,
            left: half - (size * 0.72) / 2,
            borderColor: 'rgba(165,243,252,0.85)',
          },
          ringA,
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.novaRing,
          {
            width: size * 0.72,
            height: size * 0.72,
            borderRadius: (size * 0.72) / 2,
            top: half - (size * 0.72) / 2,
            left: half - (size * 0.72) / 2,
            borderColor: 'rgba(255,255,255,0.5)',
          },
          ringB,
        ]}
      />
    </>
  );
}

function AnimatedGiftImage({
  source,
  size,
  variant,
}: {
  source: number | { uri: string };
  size: number;
  variant: MotionVariant;
}) {
  const t = useSharedValue(0);

  useEffect(() => {
    if (variant === 'nova') {
      t.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 320, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 380, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        false
      );
    } else if (variant === 'heartbeat') {
      t.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }), -1, true);
    } else if (variant === 'bob') {
      t.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }), -1, true);
    } else if (variant === 'twinkle') {
      t.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.quad) }), -1, true);
    } else if (variant === 'spotlight') {
      t.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.quad) }), -1, true);
    } else if (variant === 'orbit-wobble') {
      t.value = withRepeat(withTiming(1, { duration: 7000, easing: Easing.inOut(Easing.sin) }), -1, true);
    } else {
      t.value = withRepeat(withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.quad) }), -1, true);
    }
    return () => cancelAnimation(t);
  }, [t, variant]);

  const animatedStyle = useAnimatedStyle(() => {
    if (variant === 'nova') {
      const s = interpolate(t.value, [0, 1], [1, 1.09]);
      return {
        transform: [{ scale: s }],
      };
    }
    if (variant === 'heartbeat') {
      const s = interpolate(t.value, [0, 0.45, 1], [0.96, 1.08, 0.96]);
      return { transform: [{ scale: s }] };
    }
    if (variant === 'bob') {
      const y = interpolate(t.value, [0, 1], [-2.2, 2.2]);
      return { transform: [{ translateY: y }] };
    }
    if (variant === 'twinkle') {
      const o = interpolate(t.value, [0, 1], [0.88, 1]);
      return { opacity: o };
    }
    if (variant === 'spotlight') {
      const s = interpolate(t.value, [0, 1], [0.93, 1.06]);
      return { transform: [{ scale: s }] };
    }
    if (variant === 'orbit-wobble') {
      const rot = interpolate(t.value, [0, 1], [-3.2, 3.2]);
      return { transform: [{ rotate: `${rot}deg` }] };
    }
    const s = interpolate(t.value, [0, 1], [0.97, 1.03]);
    return { transform: [{ scale: s }] };
  });

  return (
    <Animated.View style={[{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }, animatedStyle]}>
      <Image source={source} style={{ width: size, height: size }} {...pulseImageListThumbProps} />
    </Animated.View>
  );
}

/**
 * Store / tray orb: bundled art by slug, then remote `image_url`, then tier gradient + icon.
 * Light motion per gift; Pulse Nova adds nova rings + core flare.
 */
export function CreatorGiftOrb({ item, size = 52 }: Props) {
  const tier = creatorGiftTierForItem(item);
  const meta = CREATOR_GIFT_TIER_META[tier];
  const iconSize = Math.round(size * 0.44);
  const slug = item.slug?.toLowerCase().trim() ?? '';
  const bundled = creatorGiftBundledSource(slug);
  const remoteUri = item.image_url?.trim();
  const variant = motionVariantForSlug(slug);

  if (!bundled && !remoteUri) {
    return (
      <LinearGradient
        colors={[...meta.orbGradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.grad, { width: size, height: size, borderRadius: size / 2 }]}
      >
        <Ionicons name={meta.icon} size={iconSize} color={meta.iconColor} />
      </LinearGradient>
    );
  }

  const source = bundled ?? { uri: remoteUri! };

  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2 }]}>
      {variant === 'nova' ? <PulseNovaLayers size={size} /> : null}
      <AnimatedGiftImage source={source} size={size} variant={variant} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  grad: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  novaGlow: {
    position: 'absolute',
    zIndex: 0,
  },
  novaRing: {
    position: 'absolute',
    zIndex: 0,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
});
