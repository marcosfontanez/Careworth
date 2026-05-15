import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import AnimatedRN, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';

const USE_NATIVE = Platform.OS !== 'web';
const IS_WEB = Platform.OS === 'web';

/**
 * Normalized EKG (0–100 viewBox): several heartbeat cycles so the sweep shows multiple waves at once.
 * Path runs left → right; dash animation direction is tuned so the pulse travels L→R.
 */
const EKG_D =
  'M 5.2 50.2 L 7.8 50.2 L 8.8 41.5 L 10.4 58.5 L 12 45.8 L 14 57 L 16 46.5 L 18.2 53.5 L 20.2 47.5 L 22.2 51.2 ' +
  'L 24.6 51.2 L 25.6 42 L 27.2 58 L 28.8 46 L 30.8 56 L 32.8 47.5 L 34.8 53 L 36.8 48.5 L 38.8 51 ' +
  'L 41.2 51 L 42.3 41.8 L 43.9 58.2 L 45.5 45.5 L 47.5 56.5 L 49.5 47 L 51.5 52.8 L 53.5 49 L 55.5 51 ' +
  'L 58 51 L 59 42.5 L 60.6 57.5 L 62.2 46.2 L 64.2 55.8 L 66.2 47.8 L 68.2 53 L 70.2 48.8 L 72.2 51 ' +
  'L 74.6 51 L 75.7 42 L 77.3 58 L 78.9 46 L 80.9 56.2 L 82.9 47.5 L 84.9 52.5 L 86.9 49.2 L 88.9 51 ' +
  'L 91.3 51 L 92.4 43 L 94 57 L 95.6 47 L 97.4 54 L 99 50.2';

/** Lit segment length along stroke — large enough to show ~2–3 waveform beats at once. */
const DASH_VISIBLE = 44;
const DASH_GAP = 76;
const DASH_CYCLE = DASH_VISIBLE + DASH_GAP;

/** Full left→right sweep (ms); longer = slower traveling pulse. */
const EKG_TRAVEL_MS = 6500;
/** Clear pause after each full sweep before the next one starts (native + web). */
const EKG_CYCLE_GAP_MS = 2400;

/**
 * We only animate this authored path. A “baked” variant that squeezes the polyline into the
 * PNG gem band was repeatedly unreliable (clips to invisible on circular avatars / RN web).
 */
const EMERALD_SPARK = [
  '#ECFDF5',
  '#A7F3D0',
  '#6EE7B7',
  '#34D399',
  '#10B981',
  '#059669',
  '#D1FAE5',
];

const AnimatedPath = AnimatedRN.createAnimatedComponent(Path);
const AnimatedG = AnimatedRN.createAnimatedComponent(G);

/**
 * Imperative DOM SVG on web. Raw `<svg>` JSX inside RN `View` is not reliably mounted/updated
 * under the react-native-web + RN 19 tree; sparkles (`View`) still work. We attach an SVG
 * subtree to the `View`'s div and drive `stroke-dashoffset` with rAF.
 */
function EmeraldRenewalDomEkgSvgWeb(props: { size: number; gradId: string }) {
  const { size, gradId } = props;
  const pathRefs = useRef<SVGPathElement[]>([]);
  const [domHost, setDomHost] = useState<HTMLElement | null>(null);

  const captureHostRef = useCallback((node: unknown) => {
    setDomHost(node instanceof HTMLElement ? node : null);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    let cancelled = false;
    let rafKick = 0;
    let rafAnim = 0;

    const resolveHost = (): HTMLElement | null => {
      if (domHost) return domHost;
      return document.getElementById(`emerald_ekg_host_${gradId}`);
    };

    const mount = (host: HTMLElement) => {
      const SVG_NS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(SVG_NS, 'svg');
      svg.setAttribute('width', String(size));
      svg.setAttribute('height', String(size));
      svg.setAttribute('viewBox', '0 0 100 100');
      svg.style.position = 'absolute';
      svg.style.left = '0';
      svg.style.top = '0';
      svg.style.pointerEvents = 'none';

      const defs = document.createElementNS(SVG_NS, 'defs');
      const lg = document.createElementNS(SVG_NS, 'linearGradient');
      lg.setAttribute('id', gradId);
      lg.setAttribute('x1', '0');
      lg.setAttribute('y1', '0.5');
      lg.setAttribute('x2', '1');
      lg.setAttribute('y2', '0.5');
      for (const [offset, color, op] of [
        ['0', '#A7F3D0', '0.25'],
        ['0.45', '#ECFDF5', '1'],
        ['1', '#34D399', '0.55'],
      ] as const) {
        const s = document.createElementNS(SVG_NS, 'stop');
        s.setAttribute('offset', offset);
        s.setAttribute('stop-color', color);
        s.setAttribute('stop-opacity', op);
        lg.appendChild(s);
      }
      defs.appendChild(lg);
      svg.appendChild(defs);

      const waveG = document.createElementNS(SVG_NS, 'g');
      waveG.setAttribute('opacity', '1');

      const dashMain = `${DASH_VISIBLE} ${DASH_GAP}`;
      const dashThin = `${Math.round(DASH_VISIBLE * 0.45)} ${DASH_GAP + Math.round(DASH_VISIBLE * 0.55)}`;
      const paths: SVGPathElement[] = [];

      const appendPath = (attr: Record<string, string>) => {
        const p = document.createElementNS(SVG_NS, 'path');
        p.setAttribute('d', EKG_D);
        p.setAttribute('fill', 'none');
        for (const [k, v] of Object.entries(attr)) {
          p.setAttribute(k, v);
        }
        waveG.appendChild(p);
        paths.push(p);
      };

      appendPath({
        stroke: '#059669',
        'stroke-opacity': '0.45',
        'stroke-width': '2.6',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        'stroke-dasharray': dashMain,
        'stroke-dashoffset': String(DASH_CYCLE),
      });
      appendPath({
        stroke: `url(#${gradId})`,
        'stroke-width': '1.35',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        'stroke-dasharray': dashMain,
        'stroke-dashoffset': String(DASH_CYCLE),
      });
      appendPath({
        stroke: '#FFFFFF',
        'stroke-opacity': '0.48',
        'stroke-width': '0.55',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        'stroke-dasharray': dashThin,
        'stroke-dashoffset': String(DASH_CYCLE),
      });

      pathRefs.current = paths;
      svg.appendChild(waveG);
      host.appendChild(svg);

      const start = performance.now();
      const tick = (now: number) => {
        if (cancelled) return;
        const plist = pathRefs.current;
        if (plist.length) {
          const elapsed = (now - start) % (EKG_TRAVEL_MS + EKG_CYCLE_GAP_MS);
          const inSweep = elapsed < EKG_TRAVEL_MS;
          waveG.setAttribute('opacity', inSweep ? '1' : '0');
          const off = inSweep
            ? DASH_CYCLE - (elapsed / EKG_TRAVEL_MS) * DASH_CYCLE
            : DASH_CYCLE;
          const s = String(off);
          for (const p of plist) {
            p.setAttribute('stroke-dashoffset', s);
          }
        }
        rafAnim = requestAnimationFrame(tick);
      };
      rafAnim = requestAnimationFrame(tick);

      return () => {
        cancelAnimationFrame(rafAnim);
        pathRefs.current = [];
        svg.remove();
      };
    };

    let teardown: (() => void) | undefined;
    let attempts = 0;

    const tryMount = () => {
      if (cancelled) return;
      const host = resolveHost();
      if (host) {
        teardown = mount(host);
        return true;
      }
      if (attempts < 90) {
        attempts += 1;
        rafKick = requestAnimationFrame(tryMount);
      }
      return false;
    };

    tryMount();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafKick);
      if (teardown) teardown();
    };
  }, [domHost, size, gradId]);

  return (
    <View
      ref={captureHostRef as React.Ref<View>}
      // DOM id fallback if ref shape differs across RN Web versions
      nativeID={`emerald_ekg_host_${gradId}`}
      collapsable={false}
      pointerEvents="none"
      style={[StyleSheet.absoluteFillObject, { zIndex: 2 }]}
    />
  );
}

type SparkSpec = {
  angle: number;
  distance: number;
  delayMs: number;
  duration: number;
  size: number;
  gapMs: number;
  color: string;
  originX: number;
  originY: number;
  shadowColor: string;
};

function buildEmeraldSparkSpecs(ringDiameter: number): SparkSpec[] {
  const n = ringDiameter >= 72 ? 26 : ringDiameter >= 48 ? 22 : 16;
  const cx = ringDiameter / 2;
  const specs: SparkSpec[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / Math.max(1, n - 1);
    const baseAngle = -0.15 * Math.PI + t * 1.35 * Math.PI;
    const jitter = (Math.random() - 0.5) * 0.18;
    const angle = baseAngle + jitter;
    const zoneRoll = Math.random();
    let ox = cx;
    let oy = ringDiameter * (0.12 + Math.random() * 0.76);
    if (zoneRoll < 0.35) {
      ox = cx + (Math.random() - 0.5) * ringDiameter * 0.88;
      oy = ringDiameter * (0.06 + Math.random() * 0.14);
    } else if (zoneRoll < 0.55) {
      ox = cx + (Math.random() - 0.5) * ringDiameter * 0.88;
      oy = ringDiameter * (0.86 + Math.random() * 0.1);
    } else if (zoneRoll < 0.72) {
      ox = ringDiameter * (0.04 + Math.random() * 0.08);
      oy = ringDiameter * (0.32 + Math.random() * 0.36);
    } else if (zoneRoll < 0.88) {
      ox = ringDiameter * (0.88 + Math.random() * 0.08);
      oy = ringDiameter * (0.32 + Math.random() * 0.36);
    }
    const distance = ringDiameter * (0.22 + Math.random() * 0.55);
    const color = EMERALD_SPARK[i % EMERALD_SPARK.length]!;
    specs.push({
      angle,
      distance,
      delayMs: Math.random() * 640 + i * 22,
      duration: 420 + Math.round(Math.random() * 260),
      size: 1.4 + Math.random() * 2.6,
      gapMs: 90 + Math.round(Math.random() * 240),
      color,
      originX: ox,
      originY: oy,
      shadowColor: '#34D399',
    });
  }
  return specs;
}

function EmeraldSpark({ spec }: { spec: SparkSpec }) {
  const progress = useRef(new Animated.Value(0)).current;
  const { angle, distance, delayMs, duration, gapMs, size, color, originX, originY, shadowColor } = spec;
  const dx = Math.cos(angle) * distance;
  const dy = -Math.sin(angle) * distance;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delayMs),
        Animated.timing(progress, {
          toValue: 1,
          duration,
          useNativeDriver: USE_NATIVE,
        }),
        Animated.timing(progress, { toValue: 0, duration: 0, useNativeDriver: USE_NATIVE }),
        Animated.delay(gapMs),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      progress.setValue(0);
    };
  }, [progress, delayMs, duration, gapMs]);

  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, dx] });
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, dy] });
  const opacity = progress.interpolate({
    inputRange: [0, 0.1, 0.4, 0.75, 1],
    outputRange: [0, 1, 0.92, 0.35, 0],
  });
  const scale = progress.interpolate({
    inputRange: [0, 0.25, 1],
    outputRange: [0.2, 1.08, 0.45],
  });

  return (
    <Animated.View
      style={[
        styles.spark,
        {
          left: originX - size / 2,
          top: originY - size / 2,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          shadowColor,
          opacity,
          transform: [{ translateX }, { translateY }, { scale }],
        },
      ]}
    />
  );
}

type Props = {
  ringDiameter: number;
  active?: boolean;
};

/**
 * Procedural motion for Emerald Renewal May 2026: traveling EKG sweep left → right and emerald sparkles.
 * Sits above the static PNG ring; animates without a bundled GIF/WebP.
 */
export function EmeraldRenewalRingMotion({ ringDiameter, active = true }: Props) {
  const idRaw = useId().replace(/[^a-zA-Z0-9]/g, '');
  const gradId = `emeraldEkgStroke_${idRaw || 'g'}`;
  const dashOffset = useSharedValue(DASH_CYCLE);
  const ekgLayerOpacity = useSharedValue(1);

  useEffect(() => {
    if (IS_WEB) {
      cancelAnimation(dashOffset);
      cancelAnimation(ekgLayerOpacity);
      return;
    }
    if (!active || ringDiameter < 24) {
      cancelAnimation(dashOffset);
      cancelAnimation(ekgLayerOpacity);
      return;
    }
    dashOffset.value = DASH_CYCLE;
    ekgLayerOpacity.value = 1;
    dashOffset.value = withRepeat(
      withSequence(
        withTiming(0, { duration: EKG_TRAVEL_MS, easing: Easing.linear }),
        withTiming(DASH_CYCLE, { duration: 0 }),
        withDelay(EKG_CYCLE_GAP_MS, withTiming(DASH_CYCLE, { duration: 0 })),
      ),
      -1,
      false,
    );
    ekgLayerOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: EKG_TRAVEL_MS }),
        withTiming(0, { duration: 0 }),
        withDelay(EKG_CYCLE_GAP_MS, withTiming(0, { duration: 0 })),
        withTiming(1, { duration: 0 }),
      ),
      -1,
      false,
    );
    return () => {
      cancelAnimation(dashOffset);
      cancelAnimation(ekgLayerOpacity);
    };
  }, [active, ringDiameter]);

  const animatedDashProps = useAnimatedProps(() => ({
    strokeDashoffset: dashOffset.value,
  }));

  const animatedWaveGroupProps = useAnimatedProps(() => ({
    opacity: ekgLayerOpacity.value,
  }));

  const specs = useMemo(() => buildEmeraldSparkSpecs(ringDiameter), [ringDiameter]);

  if (!active || ringDiameter < 24) return null;

  if (IS_WEB) {
    return (
      <View
        pointerEvents="none"
        style={[
          styles.layer,
          {
            width: ringDiameter,
            height: ringDiameter,
            zIndex: 6,
          },
        ]}
      >
        {specs.map((s, i) => (
          <EmeraldSpark key={i} spec={s} />
        ))}
        <EmeraldRenewalDomEkgSvgWeb size={ringDiameter} gradId={gradId} />
      </View>
    );
  }

  return (
    <View
      pointerEvents="none"
      style={[
        styles.layer,
        {
          width: ringDiameter,
          height: ringDiameter,
          zIndex: 6,
        },
      ]}
    >
      {specs.map((s, i) => (
        <EmeraldSpark key={i} spec={s} />
      ))}
      <Svg
        width={ringDiameter}
        height={ringDiameter}
        viewBox="0 0 100 100"
        style={[StyleSheet.absoluteFillObject, { zIndex: 2 }]}
      >
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0.5" x2="1" y2="0.5">
            <Stop offset="0" stopColor="#A7F3D0" stopOpacity="0.25" />
            <Stop offset="0.45" stopColor="#ECFDF5" stopOpacity="1" />
            <Stop offset="1" stopColor="#34D399" stopOpacity="0.55" />
          </LinearGradient>
        </Defs>
        <AnimatedG animatedProps={animatedWaveGroupProps}>
          <AnimatedPath
            animatedProps={animatedDashProps}
            d={EKG_D}
            stroke="#059669"
            strokeOpacity={0.45}
            strokeWidth={2.6}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={`${DASH_VISIBLE} ${DASH_GAP}`}
          />
          <AnimatedPath
            animatedProps={animatedDashProps}
            d={EKG_D}
            stroke={`url(#${gradId})`}
            strokeWidth={1.35}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={`${DASH_VISIBLE} ${DASH_GAP}`}
          />
          <AnimatedPath
            animatedProps={animatedDashProps}
            d={EKG_D}
            stroke="#FFFFFF"
            strokeWidth={0.55}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity={0.48}
            strokeDasharray={`${Math.round(DASH_VISIBLE * 0.45)} ${DASH_GAP + Math.round(DASH_VISIBLE * 0.55)}`}
          />
        </AnimatedG>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    left: 0,
    top: 0,
    overflow: 'visible',
  },
  spark: {
    position: 'absolute',
    shadowOpacity: 0.95,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
  },
});
