import React, { useMemo } from 'react';
import { View, StyleSheet, Pressable, Image as RNImage } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  Easing,
  cancelAnimation,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import type { RewardRevealPhase } from '@/lib/rewardDelivery/types';

/** Must stay in sync with `box_open` dwell time in {@link RewardRevealModal}. */
export const GIFT_UNWRAP_DURATION_MS = 780;

/**
 * Replace PNG files under `assets/images/` while keeping these filenames stable:
 * - reward-gift-neon-closed — closed premium box
 * - reward-gift-neon-peek-1 — lid slightly lifted / energy leak
 * - reward-gift-neon-peek-2 — lid raised / stronger glow
 * - reward-gift-neon-open — open interior burst (no reward item baked in; layered separately)
 */

type NeonAssets = {
  closed: number;
  peek1: number;
  peek2: number;
  open: number;
};

type Props = {
  phase: RewardRevealPhase;
  frameSize: number;
  onTapClosedBox?: () => void;
  /** Runs once after shake completes — advances orchestrator to `box_open`. */
  onShakeComplete?: () => void;
  /** Increments on each priming tap — quick squash feedback before the final shake. */
  microPulseKey?: number;
};

function loadNeonGiftAssets(): NeonAssets | null {
  try {
    return {
      closed: require('@/assets/images/reward-gift-neon-closed.png'),
      peek1: require('@/assets/images/reward-gift-neon-peek-1.png'),
      peek2: require('@/assets/images/reward-gift-neon-peek-2.png'),
      open: require('@/assets/images/reward-gift-neon-open.png'),
    };
  } catch {
    return null;
  }
}

/**
 * Premium neon-glass gift: closed → peek → fuller peek → open (sprite progression), then burst motion on the open art.
 */
export function GiftBoxRevealStage({ phase, frameSize, onTapClosedBox, onShakeComplete, microPulseKey = 0 }: Props) {
  const assets = useMemo(() => loadNeonGiftAssets(), []);

  const shake = useSharedValue(0);
  const bob = useSharedValue(0);
  const squash = useSharedValue(1);

  /** 0 = fully closed art; 1 = unwrap sequence complete (full open art dominant). */
  const unwrapProgress = useSharedValue(0);
  /** Multiplier on open-layer opacity through burst / hide. */
  const burstDim = useSharedValue(1);
  const burstTy = useSharedValue(0);
  const burstSc = useSharedValue(1);

  React.useEffect(() => {
    const idle = phase === 'modal_intro' || phase === 'awaiting_tap';
    if (idle) {
      bob.value = withRepeat(
        withSequence(
          withTiming(-10, { duration: 780, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 780, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      );
    } else {
      cancelAnimation(bob);
      bob.value = withTiming(0, { duration: 160 });
    }
    return () => cancelAnimation(bob);
  }, [phase, bob]);

  React.useEffect(() => {
    if (microPulseKey <= 0) return;
    cancelAnimation(squash);
    squash.value = withSequence(
      withTiming(0.92, { duration: 52, easing: Easing.out(Easing.quad) }),
      withSpring(1, { damping: 15, stiffness: 380 }),
    );
  }, [microPulseKey, squash]);

  React.useEffect(() => {
    if (phase === 'box_shake') {
      shake.value = withRepeat(
        withSequence(
          withTiming(-6, { duration: 42, easing: Easing.inOut(Easing.quad) }),
          withTiming(6, { duration: 42, easing: Easing.inOut(Easing.quad) }),
          withTiming(-4, { duration: 38, easing: Easing.inOut(Easing.quad) }),
          withTiming(4, { duration: 38, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 60, easing: Easing.out(Easing.quad) }),
        ),
        2,
        false,
        (finished) => {
          if (finished && onShakeComplete) runOnJS(onShakeComplete)();
        },
      );
    } else {
      cancelAnimation(shake);
      shake.value = withTiming(0, { duration: 120 });
    }
    return () => cancelAnimation(shake);
  }, [phase, onShakeComplete]);

  React.useEffect(() => {
    const idleClosed = phase === 'modal_intro' || phase === 'awaiting_tap' || phase === 'box_shake';
    if (idleClosed) {
      cancelAnimation(unwrapProgress);
      cancelAnimation(burstDim);
      cancelAnimation(burstTy);
      cancelAnimation(burstSc);
      unwrapProgress.value = 0;
      burstDim.value = 1;
      burstTy.value = 0;
      burstSc.value = 1;
      return;
    }

    if (phase === 'box_open') {
      cancelAnimation(unwrapProgress);
      cancelAnimation(burstDim);
      cancelAnimation(burstTy);
      cancelAnimation(burstSc);
      unwrapProgress.value = 0;
      burstDim.value = 1;
      burstTy.value = 0;
      burstSc.value = 1;
      // One frame after resetting shared values avoids a skipped / imperceptible unwrap on some runtimes.
      const raf = requestAnimationFrame(() => {
        unwrapProgress.value = withTiming(1, {
          duration: GIFT_UNWRAP_DURATION_MS,
          easing: Easing.inOut(Easing.cubic),
        });
      });
      return () => cancelAnimationFrame(raf);
    }

    if (phase === 'burst') {
      burstDim.value = withSequence(
        withTiming(1, { duration: 80 }),
        withTiming(0.62, { duration: 320, easing: Easing.out(Easing.quad) }),
      );
      burstTy.value = withTiming(-46, { duration: 520, easing: Easing.out(Easing.cubic) });
      burstSc.value = withTiming(1.14, { duration: 520, easing: Easing.out(Easing.cubic) });
      return;
    }

    if (
      phase === 'item_emerge' ||
      phase === 'item_settle' ||
      phase === 'details_visible' ||
      phase === 'complete'
    ) {
      burstDim.value = withTiming(0, { duration: 180 });
    }
  }, [phase, unwrapProgress, burstDim, burstTy, burstSc]);

  const closedMotionStyle = useAnimatedStyle(() => ({
    opacity: interpolate(unwrapProgress.value, [0, 0.2, 0.32], [1, 1, 0], Extrapolation.CLAMP),
    transform: [{ translateX: shake.value }, { translateY: bob.value }, { scale: squash.value }],
  }));

  const peek1Style = useAnimatedStyle(() => ({
    opacity: interpolate(unwrapProgress.value, [0.1, 0.22, 0.32, 0.48], [0, 1, 1, 0], Extrapolation.CLAMP),
  }));

  const peek2Style = useAnimatedStyle(() => ({
    opacity: interpolate(unwrapProgress.value, [0.38, 0.5, 0.58, 0.78], [0, 1, 1, 0], Extrapolation.CLAMP),
  }));

  const openMotionStyle = useAnimatedStyle(() => {
    const u = unwrapProgress.value;
    const revealOp = interpolate(u, [0.62, 0.78, 1], [0, 1, 1], Extrapolation.CLAMP);
    const unwrapScale = interpolate(u, [0.62, 1], [0.92, 1], Extrapolation.CLAMP);
    return {
      opacity: revealOp * burstDim.value,
      transform: [{ translateY: burstTy.value }, { scale: unwrapScale * burstSc.value }],
    };
  });

  const awaitingTap = phase === 'awaiting_tap';

  const hideGiftChrome =
    phase === 'item_emerge' ||
    phase === 'item_settle' ||
    phase === 'details_visible' ||
    phase === 'complete';

  const imgHeight = frameSize * 1.22;
  const openW = frameSize * 1.02;
  const openH = imgHeight * 1.08;

  const placeholder = <View style={[styles.placeholderBox, { width: frameSize, height: frameSize }]} />;

  const closedInner =
    assets != null ? (
      <RNImage source={assets.closed} style={{ width: frameSize, height: imgHeight }} resizeMode="contain" />
    ) : (
      placeholder
    );

  const peek1Inner =
    assets != null ? (
      <RNImage source={assets.peek1} style={{ width: frameSize, height: imgHeight }} resizeMode="contain" />
    ) : null;

  const peek2Inner =
    assets != null ? (
      <RNImage source={assets.peek2} style={{ width: frameSize, height: imgHeight }} resizeMode="contain" />
    ) : null;

  const openInner =
    assets != null ? (
      <RNImage source={assets.open} style={{ width: openW, height: openH }} resizeMode="contain" />
    ) : null;

  return (
    <Pressable
      style={[styles.hit, { opacity: hideGiftChrome ? 0 : 1 }]}
      pointerEvents={hideGiftChrome ? 'none' : awaitingTap ? 'auto' : 'box-none'}
      onPress={awaitingTap ? onTapClosedBox : undefined}
      disabled={!awaitingTap}
      accessibilityRole={awaitingTap ? 'button' : undefined}
      accessibilityLabel={awaitingTap ? 'Tap three times to open gift' : undefined}
    >
      <View style={[styles.stack, { width: frameSize * 1.08, minHeight: imgHeight * 1.12 }]}>
        <Animated.View style={[styles.layer, closedMotionStyle]}>{closedInner}</Animated.View>
        {peek1Inner ? (
          <Animated.View style={[styles.layer, peek1Style]} pointerEvents="none">
            {peek1Inner}
          </Animated.View>
        ) : null}
        {peek2Inner ? (
          <Animated.View style={[styles.layer, peek2Style]} pointerEvents="none">
            {peek2Inner}
          </Animated.View>
        ) : null}
        {openInner ? (
          <Animated.View style={[styles.layer, openMotionStyle]} pointerEvents="none">
            {openInner}
          </Animated.View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: { alignItems: 'center', justifyContent: 'center' },
  stack: { alignItems: 'center', justifyContent: 'center' },
  layer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderBox: {
    borderRadius: 16,
    backgroundColor: 'rgba(15,23,42,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.35)',
  },
});
