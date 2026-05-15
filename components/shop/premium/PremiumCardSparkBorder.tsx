import React, { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

/** Perimeter of axis-aligned rounded rect (corner radius clamped). */
function roundedRectPerimeter(width: number, height: number, cornerRadius: number): number {
  const r = Math.min(cornerRadius, width / 2, height / 2);
  if (width <= 0 || height <= 0) return 0;
  return 2 * (width + height - 2 * r) + 2 * Math.PI * r;
}

const SPARK_DURATION_MS = 3400;
const STROKE_W = 3.25;

let sparkGradCounter = 0;
function nextSparkGradId(): string {
  sparkGradCounter += 1;
  return `premiumSparkGrad_${sparkGradCounter}`;
}

type Props = {
  /** Measured outer box (Pulse Shop card wrapper). */
  width: number;
  height: number;
  /** Matches outer card corner radius (e.g. ring wrapper). */
  borderRadius: number;
  motionActive?: boolean;
  reducedMotionSupport?: boolean;
};

/**
 * Traveling cyan/violet highlight along the rounded border — Pulse Shop premium cue.
 * Parent must pass measured width/height (absolute-fill self-layout is often 0×0 on RN).
 */
export function PremiumCardSparkBorder({
  width,
  height,
  borderRadius,
  motionActive = true,
  reducedMotionSupport = true,
}: Props) {
  const gradId = useMemo(() => nextSparkGradId(), []);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let alive = true;
    if (reducedMotionSupport && Platform.OS !== 'web') {
      AccessibilityInfo.isReduceMotionEnabled?.()
        .then((v) => {
          if (alive) setReduceMotion(Boolean(v));
        })
        .catch(() => {});
      const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v: boolean) => {
        setReduceMotion(Boolean(v));
      });
      return () => {
        alive = false;
        sub?.remove?.();
      };
    }
    return () => {
      alive = false;
    };
  }, [reducedMotionSupport]);

  const { innerW, innerH, rx, perimeter } = useMemo(() => {
    const iw = Math.max(0, width - STROKE_W);
    const ih = Math.max(0, height - STROKE_W);
    const r = Math.min(borderRadius, iw / 2, ih / 2);
    return { innerW: iw, innerH: ih, rx: r, perimeter: roundedRectPerimeter(iw, ih, r) };
  }, [width, height, borderRadius]);

  const dashTravel = useMemo(() => {
    if (perimeter <= 0) return { spark: 1, gap: 1 };
    const spark = Math.max(36, Math.min(96, perimeter * 0.16));
    const gap = Math.max(0, perimeter - spark);
    return { spark, gap };
  }, [perimeter]);

  const dashOffset = useSharedValue(0);

  useEffect(() => {
    if (!motionActive || reduceMotion || perimeter <= 0) {
      cancelAnimation(dashOffset);
      dashOffset.value = 0;
      return;
    }
    dashOffset.value = 0;
    dashOffset.value = withRepeat(
      withTiming(perimeter, {
        duration: SPARK_DURATION_MS,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
    return () => cancelAnimation(dashOffset);
  }, [motionActive, reduceMotion, perimeter, dashOffset]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: -dashOffset.value,
  }));

  if (reduceMotion || width < 8 || height < 8 || perimeter <= 0) return null;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 12 }]} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#67E8F9" stopOpacity="0.35" />
            <Stop offset="0.28" stopColor="#FFFFFF" stopOpacity="1" />
            <Stop offset="0.5" stopColor="#C4B5FD" stopOpacity="1" />
            <Stop offset="0.72" stopColor="#22D3EE" stopOpacity="0.95" />
            <Stop offset="1" stopColor="#38BDF8" stopOpacity="0.5" />
          </LinearGradient>
        </Defs>
        {/* Faint full ring so the card edge reads even when the dash is on the far side */}
        <Rect
          x={STROKE_W / 2}
          y={STROKE_W / 2}
          width={innerW}
          height={innerH}
          rx={rx}
          ry={rx}
          fill="none"
          stroke="rgba(103,232,249,0.28)"
          strokeWidth={STROKE_W * 0.55}
        />
        <AnimatedRect
          animatedProps={animatedProps}
          x={STROKE_W / 2}
          y={STROKE_W / 2}
          width={innerW}
          height={innerH}
          rx={rx}
          ry={rx}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={STROKE_W}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={`${dashTravel.spark} ${dashTravel.gap}`}
          opacity={1}
        />
      </Svg>
    </View>
  );
}
