import React, { useEffect, useMemo, useRef } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image as RNImage,
  type ImageSourcePropType,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import {
  CLASS_OF_2026_BORDER_ASSET,
  CLASS_OF_2026_INNER_OPENING_FRAC,
  CLASS_OF_2026_REGION_MAP,
  PREMIUM_BORDER_TUNING,
  mergePremiumTuning,
  type BorderRegionMap,
  type PremiumBorderTuning,
  type PremiumBorderTuningOverride,
  type PremiumBorderType,
} from '@/lib/borders/premiumBorderConfig';

/**
 * Resolved tuning is supplied via context so the preview screen (and any future
 * per-surface override) can scale individual knobs WITHOUT re-plumbing every
 * effect. Effects read `useTuning()`; defaults come from PREMIUM_BORDER_TUNING.
 */
const TuningContext = React.createContext<PremiumBorderTuning>(
  PREMIUM_BORDER_TUNING as unknown as PremiumBorderTuning,
);
const useTuning = () => React.useContext(TuningContext);

/**
 * Shared "downbeat" impulse: returns an Animated.Value that spikes 0→1→0 at the
 * start of every `cycleMs` window, then holds 0 for the rest of the cycle. Every
 * synchronized effect (flash, shockwave, god rays, frame pop, cap-halo bloom) uses
 * this with the SAME `cycleMs`, so — because they all mount together — their bursts
 * land on the exact same frame. That single coordinated BANG is what makes the
 * celebration feel huge instead of like unsynced ambient motion.
 */
function useDownbeat(cycleMs: number, upMs: number, downMs: number, phaseMs = 0) {
  const p = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const hold = Math.max(0, cycleMs - upMs - downMs);
    const seq = Animated.sequence([
      Animated.timing(p, { toValue: 1, duration: upMs, easing: Easing.out(Easing.cubic), useNativeDriver: USE_NATIVE }),
      Animated.timing(p, { toValue: 0, duration: downMs, easing: Easing.in(Easing.quad), useNativeDriver: USE_NATIVE }),
      Animated.delay(hold),
    ]);
    const runner =
      phaseMs > 0 ? Animated.sequence([Animated.delay(phaseMs), Animated.loop(seq)]) : Animated.loop(seq);
    runner.start();
    return () => {
      runner.stop();
      p.setValue(0);
    };
  }, [p, cycleMs, upMs, downMs, phaseMs]);
  return p;
}

/**
 * Reference box (px) the authored tuning sizes were designed against. All particle
 * sizes / distances scale linearly with `box / REF_BOX` so the celebration looks
 * the same at 64px (compact) and 320px (preview modal).
 */
const REF_BOX = 320;
const USE_NATIVE = Platform.OS !== 'web';

/**
 * Max per-piece launch stagger (ms) for the confetti explosion. Pieces start within
 * this window so the burst fans out organically, but every piece's TOTAL loop length
 * is normalized to `stagger + burst + fall + restGap`, so the celebration re-fires in
 * sync on each loop instead of drifting apart.
 */
const CONFETTI_STAGGER_MS = 240;

/**
 * Confetti uses animated opacity + colored fills + scale flips. On Hermes that combo
 * with `useNativeDriver: true` often renders as a solid purple rectangle instead of
 * individual pieces (especially when dozens spawn at the plaque anchor). Keep confetti
 * on the JS driver — count is capped and only runs on profile-sized avatars.
 */
const CONFETTI_USE_NATIVE = false;

/**
 * Below this OUTER box size the overlay does not animate at all (tiny notification
 * thumbs / micro avatars where motion is invisible and wasteful). Everything from
 * feed/circle rows up (default BorderedAvatar size 36 → outerBox ≈ 58) animates so
 * the premium border is clearly alive everywhere it appears — not a static ring.
 */
const MIN_ANIMATED_BOX = 40;

/**
 * Box size at/above which particle effects (confetti + accent sparkles) run at
 * their FULL authored count. Smaller surfaces still get the complete celebration
 * — confetti burst, sparkles, the lot — but with the particle COUNT scaled down
 * (see `densityScale`) so a busy feed stays smooth. Nothing is ever turned off by
 * size alone; only `MIN_ANIMATED_BOX` (micro avatars) and reduced-motion gate it.
 */
const FULL_DENSITY_BOX = 150;
/** Floor for the particle-count scale so even small avatars keep a visible burst. */
const MIN_DENSITY_SCALE = 0.45;

/* ────────────────────────────────────────────────────────────────────────────
 * PUBLIC PROPS
 * ──────────────────────────────────────────────────────────────────────────── */

export type PremiumAnimatedProfileBorderProps = {
  /** User profile photo URI. Falls back to a neutral disc if absent. */
  imageUri?: string | null;
  /**
   * OUTER frame box size (px). The transparent center photo is derived from this
   * via the border's inner-opening fraction so alignment is correct at any size.
   */
  size: number;
  /** Static transparent PNG border. Defaults to the Class of 2026 art. */
  borderStaticAsset?: ImageSourcePropType;
  /** Which premium family this is (selects region map / palette). */
  premiumType?: PremiumBorderType;
  /** Master animation switch. Set false (e.g. offscreen) to render static only. */
  isAnimated?: boolean;
  /** Respect OS reduced-motion. When true → static border, no looping motion. */
  reducedMotion?: boolean;
  /** Scales the whole show. 0 ≈ static, 1 = authored default, >1 = extra hype. */
  animationIntensity?: number;
  /** Play the dramatic top confetti explosion on mount (vs. ambient loop only). */
  showCelebrationBurst?: boolean;
  /** Force full animation regardless of size gating (preview / equip / featured). */
  previewMode?: boolean;
  /** Inner opening fraction override (defaults to the asset's measured value). */
  innerOpeningFrac?: number;
  /** Live per-knob tuning override (used by the preview screen sliders). */
  tuning?: PremiumBorderTuningOverride | null;
};

const REGION_BY_TYPE: Record<PremiumBorderType, BorderRegionMap> = {
  classOf2026: CLASS_OF_2026_REGION_MAP,
};

/* ────────────────────────────────────────────────────────────────────────────
 * STATIC FALLBACK ERROR BOUNDARY
 * If any animated layer throws, we keep showing the static border + photo.
 * ──────────────────────────────────────────────────────────────────────────── */

class OverlayErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    /* swallow — static border below remains visible */
  }
  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * MAIN COMPONENT (self-contained: photo + static border + animated overlay)
 * ──────────────────────────────────────────────────────────────────────────── */

export function PremiumAnimatedProfileBorder({
  imageUri,
  size,
  borderStaticAsset = CLASS_OF_2026_BORDER_ASSET,
  premiumType = 'classOf2026',
  isAnimated = true,
  reducedMotion = false,
  animationIntensity = 1,
  showCelebrationBurst = true,
  previewMode = false,
  innerOpeningFrac = CLASS_OF_2026_INNER_OPENING_FRAC,
  tuning,
}: PremiumAnimatedProfileBorderProps) {
  const photo = Math.round(size * innerOpeningFrac);
  const active = usePremiumOverlayActive({ isAnimated, reducedMotion, box: size, previewMode });

  return (
    <View style={[styles.root, { width: size, height: size }]} pointerEvents="none">
      {/* Layer 1 — circular profile photo (centered in the transparent opening) */}
      <View
        style={[
          styles.photoWrap,
          { width: photo, height: photo, borderRadius: photo / 2, left: (size - photo) / 2, top: (size - photo) / 2 },
        ]}
      >
        {imageUri?.trim() ? (
          <Image
            source={{ uri: imageUri.trim() }}
            style={{ width: photo, height: photo, borderRadius: photo / 2 }}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={[styles.photoFallback, { width: photo, height: photo, borderRadius: photo / 2 }]} />
        )}
      </View>

      {/* Layer 2 — static transparent PNG graduation border */}
      <RNImage
        source={borderStaticAsset}
        style={{ position: 'absolute', left: 0, top: 0, width: size, height: size }}
        resizeMode="contain"
      />

      {/* Layer 3 — animated overlay effects (confetti, cap spark, gold light, etc.) */}
      {active ? (
        <OverlayErrorBoundary>
          <PremiumBorderOverlay
            box={size}
            premiumType={premiumType}
            animationIntensity={animationIntensity}
            showCelebrationBurst={showCelebrationBurst}
            previewMode={previewMode}
            tuning={tuning}
          />
        </OverlayErrorBoundary>
      ) : null}
    </View>
  );
}

/**
 * Resolves whether the looping overlay should run for the current surface.
 * Honors the explicit `isAnimated` prop, OS reduced-motion, and size gating.
 * Exported so feed/profile call-sites (e.g. AvatarDisplay) share one policy:
 * static only in compact lists, full animation on profile / preview / featured.
 */
export function usePremiumOverlayActive({
  isAnimated = true,
  reducedMotion = false,
  box,
  previewMode = false,
}: {
  isAnimated?: boolean;
  reducedMotion?: boolean;
  box: number;
  previewMode?: boolean;
}) {
  const [osReduceMotion, setOsReduceMotion] = React.useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((v) => {
        if (mounted) setOsReduceMotion(Boolean(v));
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v) =>
      setOsReduceMotion(Boolean(v)),
    );
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);

  if (!isAnimated) return false;
  if (reducedMotion || osReduceMotion) return false;
  if (!previewMode && box < MIN_ANIMATED_BOX) return false;
  return true;
}

/* ────────────────────────────────────────────────────────────────────────────
 * OVERLAY ENGINE — the 8 animated layers. Mount this above a static ring (e.g.
 * inside AvatarDisplay) exactly like EmeraldRenewalRingMotion.
 * ──────────────────────────────────────────────────────────────────────────── */

export function PremiumBorderOverlay({
  box,
  premiumType = 'classOf2026',
  animationIntensity = 1,
  showCelebrationBurst = true,
  previewMode = false,
  tuning,
}: {
  box: number;
  premiumType?: PremiumBorderType;
  animationIntensity?: number;
  showCelebrationBurst?: boolean;
  /** Force the full celebration (confetti + sparkles) regardless of size. */
  previewMode?: boolean;
  tuning?: PremiumBorderTuningOverride | null;
}) {
  const regions = REGION_BY_TYPE[premiumType];
  const k = box / REF_BOX; // px scale factor
  const intensity = Math.max(0, animationIntensity);
  const mergedTuning = useMemo(() => mergePremiumTuning(tuning), [tuning]);
  /**
   * The full celebration (confetti + sparkles + all glows) plays on EVERY animated
   * surface so the border is never a flat ring. To keep a scrolling feed smooth we
   * only scale the particle COUNT down on smaller avatars — never disable effects.
   */
  const densityScale = previewMode
    ? 1
    : Math.max(MIN_DENSITY_SCALE, Math.min(1, box / FULL_DENSITY_BOX));

  // One shared celebration window. Confetti's own loop length is exactly this
  // (stagger + burst + fall + rest), so every synced effect using `cycleMs` lands
  // its impulse on the same frame as the confetti cannon.
  const cfgC = mergedTuning.confetti;
  const cycleMs = CONFETTI_STAGGER_MS + cfgC.burstSpeed + cfgC.fallSpeed + mergedTuning.loopRestGapMs;

  // Whole-frame bounce on the downbeat (overlay only — never touches the photo layer).
  const popPulse = useDownbeat(cycleMs, 200, 520);
  const popScale = popPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, Math.max(1, mergedTuning.celebration.popScale)],
  });

  return (
    <TuningContext.Provider value={mergedTuning}>
      <View style={[styles.overlay, { width: box, height: box }]} pointerEvents="none">
        {/* 0 — cinematic spotlight bloom BEHIND the frame (pulses on the downbeat) */}
        <SpotlightBloom box={box} intensity={intensity} cycleMs={cycleMs} />

        <Animated.View
          style={[styles.overlay, { width: box, height: box, transform: [{ scale: popScale }] }]}
          pointerEvents="none"
        >
          {/* 5 — ECG / pulse energy (behind confetti, on the gold band) */}
          <EcgPulse box={box} region={regions.ecgLeft} intensity={intensity} mirror={false} />
          <EcgPulse box={box} region={regions.ecgRight} intensity={intensity} mirror />

          {/* 3 — gold rim shine: the border EDGES glow/breathe (no orbiting blobs) */}
          <ShimmerSweep box={box} intensity={intensity} />

          {/* 6 — ambient gold dust drifting up between bursts (keeps the frame alive) */}
          <FloatingMotes box={box} k={k} intensity={intensity} densityScale={densityScale} />

          {/* 7 — cap halo + tassel sway (bloom synced to the downbeat) */}
          <CapHalo box={box} k={k} region={regions.capCrest} intensity={intensity} burst={showCelebrationBurst} cycleMs={cycleMs} />

          {/* DOWNBEAT — god rays fan out + shockwave ring rips outward from the cap */}
          <GodRays box={box} region={regions.capCrest} intensity={intensity} cycleMs={cycleMs} />
          <ShockwaveRing box={box} region={regions.capCrest} intensity={intensity} cycleMs={cycleMs} />

          {/* 7b — bright spark/starburst flaring on top of the cap */}
          <CapSpark box={box} k={k} region={regions.capCrest} intensity={intensity} />

          {/* 4 — gemstone glints (staggered) */}
          <GemGlint box={box} k={k} region={regions.gemLeft} color="#C77DFF" delayMs={0} intensity={intensity} />
          <GemGlint box={box} k={k} region={regions.gemRight} color="#5EEAD4" delayMs={PREMIUM_BORDER_TUNING.gem.staggerMs / 2} intensity={intensity} />

          {/* 8 — accent sparkles around crest / gems / trim */}
          <AccentSparkles box={box} k={k} regions={regions} intensity={intensity} densityScale={densityScale} />

          {/* 1 + 2 — confetti cannon → falling celebration: erupts from the cap crest
              AND the CLASS OF 2026 plaque, plus a second "echo" pop just after. */}
          <Confetti box={box} k={k} region={regions.capCrest} intensity={intensity} burst={showCelebrationBurst} densityScale={densityScale} />
          <Confetti box={box} k={k} region={regions.plaque} intensity={intensity} burst={showCelebrationBurst} densityScale={densityScale} countScale={0.6} source="plaque" />
          <Confetti
            box={box}
            k={k}
            region={regions.capCrest}
            intensity={intensity}
            burst={showCelebrationBurst}
            densityScale={densityScale}
            countScale={mergedTuning.celebration.echoCountScale}
            phaseMs={mergedTuning.celebration.echoPhaseMs}
          />

          {/* DOWNBEAT — ignition flash washes the frame at the burst instant (on top) */}
          <CelebrationFlash box={box} intensity={intensity} cycleMs={cycleMs} />
        </Animated.View>
      </View>
    </TuningContext.Provider>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
 * EFFECT 1 + 2 — TOP CONFETTI BURST → FALLING CELEBRATION
 * Tune via PREMIUM_BORDER_TUNING.confetti
 * ════════════════════════════════════════════════════════════════════════════ */

type ConfettiKind = 'foil' | 'streamer' | 'speck';

type ConfettiSpec = {
  startX: number;
  startY: number;
  burstX: number;
  burstY: number;
  fallY: number;
  driftX: number;
  size: number;
  color: string;
  rotate: number;
  delayMs: number;
  burstMs: number;
  fallMs: number;
  kind: ConfettiKind;
  /** Phase (radians) so each piece flutters/flips out of sync with its neighbors. */
  flutterPhase: number;
};

function buildConfetti(
  box: number,
  k: number,
  region: { x: number; y: number; width?: number; height?: number },
  intensity: number,
  cfg: PremiumBorderTuning['confetti'],
  densityScale: number,
  countScale: number,
  source: 'cap' | 'plaque',
): ConfettiSpec[] {
  const count = Math.max(
    6,
    Math.round(cfg.count * Math.min(1.6, Math.max(0.2, intensity)) * densityScale * countScale),
  );
  const cx = box * region.x;
  const cy = box * region.y;
  const plaqueW = (region.width ?? 0.1) * box;
  const plaqueH = (region.height ?? 0.08) * box;
  const intClamp = Math.min(1.5, Math.max(0.4, intensity));
  const spreadX = box * cfg.spreadXFrac;
  const plumeCount = Math.round(count * (source === 'plaque' ? 0.78 : cfg.plumeFrac));
  const specs: ConfettiSpec[] = [];
  for (let i = 0; i < count; i++) {
    let startX = cx;
    let startY = cy;
    if (source === 'plaque') {
      // Spread launches across the plaque band so the burst reads as confetti, not one solid block.
      startX = cx + (Math.random() - 0.5) * plaqueW * 0.88;
      startY = cy + (Math.random() - 0.5) * plaqueH * 0.65;
    }
    let burstX: number;
    let burstY: number;
    let fallY: number;
    if (source === 'plaque') {
      // Fountain from the CLASS OF 2026 plaque: pieces erupt UP and outward, then fall
      // back down past the bottom of the frame.
      if (i < plumeCount) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.25;
        const dist = box * (0.14 + Math.random() * 0.32) * cfg.burstStrength * intClamp;
        burstX = cx + Math.cos(angle) * dist;
        burstY = cy + Math.sin(angle) * dist; // sin < 0 → above the plaque
      } else {
        // A few spray sideways along the plaque then drop.
        burstX = cx + (Math.random() - 0.5) * box * 0.5;
        burstY = cy - box * (0.02 + Math.random() * 0.1);
      }
      fallY = box * (0.96 + Math.random() * 0.06);
    } else if (i < plumeCount) {
      // Plume: pieces shoot UP and outward above the cap (the explosion's crown),
      // mirroring frame 1 of the reference where confetti erupts over the cap.
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.0;
      const dist = box * (0.12 + Math.random() * 0.24) * cfg.burstStrength * intClamp;
      burstX = cx + Math.cos(angle) * dist;
      burstY = cy - Math.abs(Math.sin(angle)) * dist - box * Math.random() * cfg.topRiseFrac;
      fallY = box * (cfg.fadeBelowY - Math.random() * 0.16);
    } else {
      // Curtain: pieces spray across nearly the full width and DOWN into the interior,
      // so the burst blankets the whole center of the ring before it rains out.
      burstX = cx + (Math.random() - 0.5) * spreadX;
      burstY = cy + box * (0.02 + Math.random() * 0.38);
      fallY = box * (cfg.fadeBelowY - Math.random() * 0.16);
    }
    // Gentle horizontal drift as everything rains down.
    const driftX = burstX + (Math.random() - 0.5) * box * 0.16;
    // Piece type: a mix of metallic gold foil, fluttering streamers, and fine specks
    // reads far richer than uniform rectangles.
    const r = Math.random();
    let kind: ConfettiKind;
    if (source === 'plaque') {
      // Long purple streamers at the plaque anchor stack into a rectangular smear on Hermes.
      if (r < cfg.goldFoilFrac * 1.15) kind = 'foil';
      else if (r < cfg.goldFoilFrac * 1.15 + cfg.streamerFrac * 0.25) kind = 'streamer';
      else kind = 'speck';
    } else if (r < cfg.streamerFrac) kind = 'streamer';
    else if (r < cfg.streamerFrac + cfg.goldFoilFrac) kind = 'foil';
    else kind = 'speck';
    const color =
      kind === 'foil'
        ? cfg.goldColors[i % cfg.goldColors.length]!
        : cfg.palette[i % cfg.palette.length]!;
    // Foil pieces run a touch larger (they catch the light); streamers are long+thin.
    const baseSize = (cfg.sizeMin + Math.random() * (cfg.sizeMax - cfg.sizeMin)) * k;
    const size = kind === 'foil' ? baseSize * 1.35 : baseSize;
    specs.push({
      startX,
      startY,
      burstX,
      burstY,
      fallY,
      driftX,
      size,
      color,
      rotate: Math.random() * 360,
      delayMs: Math.random() * CONFETTI_STAGGER_MS,
      // Fixed burst/fall so every piece shares one loop length (see CONFETTI_STAGGER_MS).
      burstMs: cfg.burstSpeed,
      fallMs: cfg.fallSpeed,
      kind,
      flutterPhase: Math.random() * Math.PI * 2,
    });
  }
  return specs;
}

function ConfettiPiece({
  spec,
  burst,
  restGapMs,
  phaseMs = 0,
}: {
  spec: ConfettiSpec;
  burst: boolean;
  restGapMs: number;
  phaseMs?: number;
}) {
  const p = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const burstLeg = Animated.timing(p, {
      toValue: 1,
      duration: spec.burstMs,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: CONFETTI_USE_NATIVE,
    });
    const fallLeg = Animated.timing(p, {
      toValue: 2,
      duration: spec.fallMs,
      easing: Easing.in(Easing.quad),
      useNativeDriver: CONFETTI_USE_NATIVE,
    });
    const reset = Animated.timing(p, { toValue: 0, duration: 0, useNativeDriver: CONFETTI_USE_NATIVE });
    // Trailing wait = the 5s rest gap + whatever stagger this piece didn't use up
    // front, so every piece's full cycle is identical → bursts stay synced each loop.
    const tailMs = Math.max(0, restGapMs) + (CONFETTI_STAGGER_MS - spec.delayMs);
    const seq = Animated.sequence([
      Animated.delay(spec.delayMs),
      ...(burst ? [burstLeg] : []),
      fallLeg,
      reset,
      Animated.delay(tailMs),
    ]);
    // `phaseMs` offsets the whole loop once (used by the echo pop), keeping its
    // period identical so it stays a constant beat behind the main cannon.
    const loop = Animated.loop(seq);
    const runner = phaseMs > 0 ? Animated.sequence([Animated.delay(phaseMs), loop]) : loop;
    runner.start();
    return () => {
      runner.stop();
      p.setValue(0);
    };
  }, [p, spec, burst, restGapMs, phaseMs]);

  const translateX = p.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [spec.startX, spec.burstX, spec.driftX],
  });
  const translateY = p.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [spec.startY, spec.burstY, spec.fallY],
  });
  const opacity = p.interpolate({
    inputRange: [0, 0.14, 0.22, 1.4, 2],
    outputRange: [0, 0, 1, 1, 0],
  });
  const rotate = p.interpolate({
    inputRange: [0, 2],
    outputRange: ['0deg', `${spec.rotate + 360}deg`],
  });
  // Positive-only scale flutter — negative scaleX on Hermes can paint a solid color slab.
  const ph = spec.flutterPhase;
  const flutterX = p.interpolate({
    inputRange: [0, 0.5, 1, 1.5, 2],
    outputRange: [
      0.55 + Math.abs(Math.cos(ph)) * 0.45,
      0.3 + Math.abs(Math.cos(ph + 2.4)) * 0.35,
      0.55 + Math.abs(Math.cos(ph + 4.8)) * 0.45,
      0.35 + Math.abs(Math.cos(ph + 7.2)) * 0.4,
      0.5 + Math.abs(Math.cos(ph + 9.6)) * 0.35,
    ],
  });

  const isStreamer = spec.kind === 'streamer';
  const w = isStreamer ? Math.max(1.4, spec.size * 0.45) : spec.size;
  const h = isStreamer ? spec.size * 2.4 : spec.size * 1.35;
  const pieceRadius = isStreamer ? w / 2 : Math.max(1, spec.size * 0.35);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        opacity,
        transform: [{ translateX }, { translateY }, { rotate }],
      }}
      pointerEvents="none"
    >
      <Animated.View
        style={{
          marginLeft: -w / 2,
          marginTop: -h / 2,
          width: w,
          height: h,
          borderRadius: pieceRadius,
          backgroundColor: spec.color,
          transform: [{ scaleX: flutterX }],
          ...(spec.kind === 'foil'
            ? { shadowColor: spec.color, shadowOpacity: 0.75, shadowRadius: 2, shadowOffset: { width: 0, height: 0 } }
            : null),
        }}
      />
    </Animated.View>
  );
}

function Confetti({
  box,
  k,
  region,
  intensity,
  burst,
  densityScale,
  countScale = 1,
  source = 'cap',
  phaseMs = 0,
}: {
  box: number;
  k: number;
  region: { x: number; y: number; width?: number; height?: number };
  intensity: number;
  burst: boolean;
  densityScale: number;
  countScale?: number;
  source?: 'cap' | 'plaque';
  phaseMs?: number;
}) {
  const T = useTuning();
  const cfg = T.confetti;
  const specs = useMemo(
    () => buildConfetti(box, k, region, intensity, cfg, densityScale, countScale, source),
    [box, k, region, intensity, cfg, densityScale, countScale, source],
  );
  if (intensity <= 0.01) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {specs.map((s, i) => (
        <ConfettiPiece key={i} spec={s} burst={burst} restGapMs={T.loopRestGapMs} phaseMs={phaseMs} />
      ))}
    </View>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
 * EFFECT 3 — GOLD RIM SHINE: the border EDGES themselves glow and breathe (no
 * orbiting blobs). Two thin concentric gold rings sit on the gold band's inner +
 * outer edge and gently pulse, so the metal looks lit. Tune via shimmer.brightness.
 * ════════════════════════════════════════════════════════════════════════════ */

function ShimmerSweep({ box, intensity }: { box: number; intensity: number }) {
  const cfg = useTuning().shimmer;
  const breath = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: cfg.sweepMs / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: USE_NATIVE }),
        Animated.timing(breath, { toValue: 0, duration: cfg.sweepMs / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: USE_NATIVE }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      breath.setValue(0);
    };
  }, [breath, cfg.sweepMs]);

  if (intensity <= 0.01) return null;
  const peak = Math.min(0.75, cfg.brightness * intensity);
  const rimR = box * 0.435; // sits on the gold band
  const outer = rimR * 2;
  const thick = Math.max(2, box * 0.022);
  const opacity = breath.interpolate({ inputRange: [0, 1], outputRange: [peak * 0.35, peak] });

  const Ring = ({
    size,
    thickness,
    color,
    glow,
  }: {
    size: number;
    thickness: number;
    color: string;
    glow: number;
  }) => (
    <Animated.View
      style={{
        position: 'absolute',
        left: box / 2 - size / 2,
        top: box / 2 - size / 2,
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: thickness,
        borderColor: color,
        opacity,
        shadowColor: '#FFE08A',
        shadowOpacity: 0.9,
        shadowRadius: glow,
        shadowOffset: { width: 0, height: 0 },
      }}
    />
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* outer gold edge — soft bloom */}
      <Ring size={outer} thickness={thick} color="rgba(255,226,148,0.9)" glow={box * 0.045} />
      {/* inner gold edge — brighter, tighter highlight */}
      <Ring size={outer - thick * 2.6} thickness={Math.max(1, box * 0.009)} color="rgba(255,246,212,0.85)" glow={box * 0.02} />
    </View>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
 * EFFECT 4 — GEMSTONE GLINTS (quick staggered starbursts)
 * Tune via PREMIUM_BORDER_TUNING.gem
 * ════════════════════════════════════════════════════════════════════════════ */

function GemGlint({
  box,
  k,
  region,
  color,
  delayMs,
  intensity,
}: {
  box: number;
  k: number;
  region: { x: number; y: number };
  color: string;
  delayMs: number;
  intensity: number;
}) {
  const cfg = useTuning().gem;
  const p = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delayMs),
        Animated.timing(p, { toValue: 1, duration: cfg.glintMs, easing: Easing.out(Easing.quad), useNativeDriver: USE_NATIVE }),
        Animated.timing(p, { toValue: 0, duration: cfg.glintMs * 0.8, easing: Easing.in(Easing.quad), useNativeDriver: USE_NATIVE }),
        Animated.delay(cfg.staggerMs),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      p.setValue(0);
    };
  }, [p, cfg.glintMs, cfg.staggerMs, delayMs]);

  if (intensity <= 0.01) return null;
  const cx = box * region.x;
  const cy = box * region.y;
  const armLen = 18 * k;
  const armThick = 2.4 * k;
  const opacity = p.interpolate({ inputRange: [0, 1], outputRange: [0, Math.min(1, intensity)] });
  const scale = p.interpolate({ inputRange: [0, 1], outputRange: [0.2, cfg.peakScale] });

  const Arm = ({ rot, len }: { rot: string; len: number }) => (
    <View
      style={{
        position: 'absolute',
        left: -armThick / 2,
        top: -len / 2,
        width: armThick,
        height: len,
        borderRadius: armThick,
        backgroundColor: '#FFFFFF',
        transform: [{ rotate: rot }],
      }}
    />
  );

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: cx,
        top: cy,
        opacity,
        transform: [{ scale }],
        shadowColor: color,
        shadowOpacity: 0.95,
        shadowRadius: 6 * k,
        shadowOffset: { width: 0, height: 0 },
      }}
    >
      <Arm rot="0deg" len={armLen} />
      <Arm rot="90deg" len={armLen} />
      <Arm rot="45deg" len={armLen * 0.6} />
      <Arm rot="-45deg" len={armLen * 0.6} />
      <View style={{ position: 'absolute', left: -3 * k, top: -3 * k, width: 6 * k, height: 6 * k, borderRadius: 3 * k, backgroundColor: '#FFFFFF' }} />
    </Animated.View>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
 * EFFECT 5 — ECG / PULSE GLOW (energy travels along the heartbeat line)
 * Tune via PREMIUM_BORDER_TUNING.ecg
 * ════════════════════════════════════════════════════════════════════════════ */

function EcgPulse({
  box,
  region,
  intensity,
  mirror,
}: {
  box: number;
  region: { x: number; y: number; halfWidth: number };
  intensity: number;
  mirror: boolean;
}) {
  const T = useTuning();
  const cfg = T.ecg;
  const glowMul = T.glow.intensity * intensity;
  const travel = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(travel, { toValue: 1, duration: cfg.travelMs, easing: Easing.inOut(Easing.quad), useNativeDriver: USE_NATIVE }),
        Animated.timing(travel, { toValue: 0, duration: 0, useNativeDriver: USE_NATIVE }),
        Animated.delay(500),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      travel.setValue(0);
    };
  }, [travel, cfg.travelMs]);

  if (intensity <= 0.01) return null;
  // Horizontal ECG segment: a glowing energy pulse travels along the art's gold
  // heartbeat line. `mirror` flips the right side so energy reads symmetrically.
  const segW = region.halfWidth * 2 * box;
  const segH = Math.max(8, box * 0.06);
  const left = box * region.x - segW / 2;
  const top = box * region.y - segH / 2;
  const glowSize = segH * 1.9;
  const glowX = travel.interpolate({ inputRange: [0, 1], outputRange: [-glowSize / 2, segW - glowSize / 2] });
  const underOpacity = Math.min(0.5, cfg.base * glowMul * 0.5);

  return (
    <View style={{ position: 'absolute', left, top, width: segW, height: segH, transform: mirror ? [{ scaleX: -1 }] : undefined }} pointerEvents="none">
      {/* soft glow underlay so the static gold line reads as energized */}
      <LinearGradient
        colors={['rgba(94,231,255,0)', `rgba(94,231,255,${underOpacity})`, 'rgba(255,224,138,0)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ position: 'absolute', left: 0, top: segH / 2 - segH * 0.18, width: segW, height: segH * 0.36, borderRadius: segH * 0.18 }}
      />
      {/* traveling energy pulse */}
      <Animated.View
        style={{
          position: 'absolute',
          top: segH / 2 - glowSize / 2,
          width: glowSize,
          height: glowSize,
          borderRadius: glowSize / 2,
          transform: [{ translateX: glowX }],
        }}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0)', `rgba(150,240,255,${Math.min(0.95, 0.85 * glowMul)})`, 'rgba(255,224,138,0)']}
          style={{ width: glowSize, height: glowSize, borderRadius: glowSize / 2 }}
        />
      </Animated.View>
    </View>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
 * EFFECT 7 — CAP HALO + TASSEL SWAY (halo flares during the confetti burst)
 * ════════════════════════════════════════════════════════════════════════════ */

function CapHalo({
  box,
  k,
  region,
  intensity,
  burst,
  cycleMs,
}: {
  box: number;
  k: number;
  region: { x: number; y: number; radius: number };
  intensity: number;
  burst: boolean;
  cycleMs: number;
}) {
  const cfg = useTuning();
  const flare = useRef(new Animated.Value(burst ? 0 : 0.4)).current;
  const sway = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const upMs = burst ? 700 : 1400;
    const downMs = 900;
    // Hold the rest of the shared cycle so the halo bloom re-fires on the downbeat
    // in lockstep with the confetti cannon, flash, and shockwave.
    const holdMs = Math.max(600, cycleMs - upMs - downMs);
    const f = Animated.loop(
      Animated.sequence([
        Animated.timing(flare, { toValue: 1, duration: upMs, easing: Easing.out(Easing.cubic), useNativeDriver: USE_NATIVE }),
        Animated.timing(flare, { toValue: 0.3, duration: downMs, easing: Easing.inOut(Easing.sin), useNativeDriver: USE_NATIVE }),
        Animated.delay(holdMs),
      ]),
    );
    const s = Animated.loop(
      Animated.sequence([
        Animated.timing(sway, { toValue: 1, duration: cfg.tassel.swayMs / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: USE_NATIVE }),
        Animated.timing(sway, { toValue: -1, duration: cfg.tassel.swayMs, easing: Easing.inOut(Easing.sin), useNativeDriver: USE_NATIVE }),
        Animated.timing(sway, { toValue: 0, duration: cfg.tassel.swayMs / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: USE_NATIVE }),
      ]),
    );
    f.start();
    s.start();
    return () => {
      f.stop();
      s.stop();
    };
  }, [flare, sway, burst, cycleMs, cfg.tassel.swayMs]);

  if (intensity <= 0.01) return null;
  const haloR = box * region.radius * 1.7;
  const left = box * region.x - haloR / 2;
  const top = box * region.y - haloR / 2;
  const opacity = flare.interpolate({ inputRange: [0, 1], outputRange: [0.1 * intensity, Math.min(0.7, 0.55 * intensity)] });
  const scale = flare.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.15] });
  const tasselRot = sway.interpolate({ inputRange: [-1, 1], outputRange: [`-${cfg.tassel.swayDeg}deg`, `${cfg.tassel.swayDeg}deg`] });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View
        style={{
          position: 'absolute',
          left,
          top,
          width: haloR,
          height: haloR,
          borderRadius: haloR / 2,
          backgroundColor: cfg.glow.capHaloColor,
          opacity,
          transform: [{ scale }],
          shadowColor: cfg.glow.capHaloColor,
          shadowOpacity: 0.9,
          shadowRadius: 16 * k,
          shadowOffset: { width: 0, height: 0 },
        }}
      />
      {/* subtle tassel-tip glint sway just right of the crest */}
      <Animated.View
        style={{
          position: 'absolute',
          left: box * region.x + box * 0.06,
          top: box * region.y + box * 0.02,
          width: 3.4 * k,
          height: 3.4 * k,
          borderRadius: 2 * k,
          backgroundColor: '#FFE9A8',
          opacity: 0.9 * intensity,
          transform: [{ rotate: tasselRot }, { translateY: box * 0.04 }],
        }}
      />
    </View>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
 * EFFECT 7b — CAP SPARK (bright starburst that flares on top of the cap)
 * The "spark at the top of the graduation cap" from the reference video: a white-hot
 * core with long gold diffraction spikes that twinkles on a loop.
 * Tune via PREMIUM_BORDER_TUNING.capSpark
 * ════════════════════════════════════════════════════════════════════════════ */

function CapSpark({
  box,
  k,
  region,
  intensity,
}: {
  box: number;
  k: number;
  region: { x: number; y: number; radius: number };
  intensity: number;
}) {
  const cfg = useTuning().capSpark;
  const p = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(p, { toValue: 1, duration: cfg.flareMs, easing: Easing.out(Easing.cubic), useNativeDriver: USE_NATIVE }),
        Animated.timing(p, { toValue: 0.18, duration: cfg.flareMs * 2.4, easing: Easing.in(Easing.quad), useNativeDriver: USE_NATIVE }),
        Animated.delay(cfg.gapMs),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      p.setValue(0);
    };
  }, [p, cfg.flareMs, cfg.gapMs]);

  if (intensity <= 0.01) return null;
  // Sits on the peak of the mortarboard, just above the crest anchor.
  const cx = box * region.x;
  const cy = box * (region.y - 0.025);
  const span = box * cfg.sizeFrac; // longest spike length
  const longThick = Math.max(1.4, 2.2 * k);
  const diagLen = span * 0.42;
  const core = Math.max(4, 7 * k);

  const opacity = p.interpolate({ inputRange: [0, 1], outputRange: [0, Math.min(1, 0.95 * intensity)] });
  const scale = p.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] });

  const Ray = ({ rot, len, thick, color }: { rot: string; len: number; thick: number; color: string }) => (
    <View
      style={{
        position: 'absolute',
        left: -thick / 2,
        top: -len / 2,
        width: thick,
        height: len,
        borderRadius: thick,
        backgroundColor: color,
        transform: [{ rotate: rot }],
      }}
    />
  );

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: cx,
        top: cy,
        opacity,
        transform: [{ scale }],
        shadowColor: cfg.rayColor,
        shadowOpacity: 0.95,
        shadowRadius: 10 * k,
        shadowOffset: { width: 0, height: 0 },
      }}
      pointerEvents="none"
    >
      {/* long vertical + horizontal diffraction spikes */}
      <Ray rot="0deg" len={span} thick={longThick} color={cfg.rayColor} />
      <Ray rot="90deg" len={span * 0.9} thick={longThick} color={cfg.rayColor} />
      {/* shorter diagonal spikes */}
      <Ray rot="45deg" len={diagLen} thick={longThick * 0.8} color={cfg.rayColor} />
      <Ray rot="-45deg" len={diagLen} thick={longThick * 0.8} color={cfg.rayColor} />
      {/* soft glow disc behind the core */}
      <View
        style={{
          position: 'absolute',
          left: -core,
          top: -core,
          width: core * 2,
          height: core * 2,
          borderRadius: core,
          backgroundColor: cfg.rayColor,
          opacity: 0.5,
        }}
      />
      {/* white-hot core */}
      <View
        style={{
          position: 'absolute',
          left: -core / 2,
          top: -core / 2,
          width: core,
          height: core,
          borderRadius: core / 2,
          backgroundColor: cfg.coreColor,
        }}
      />
    </Animated.View>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
 * EFFECT 8 — ACCENT SPARKLES around crest / gems / gold trim
 * Tune via PREMIUM_BORDER_TUNING.sparkle
 * ════════════════════════════════════════════════════════════════════════════ */

type SparkSpec = { x: number; y: number; size: number; color: string; delayMs: number; gapMs: number };

function buildSparkles(
  box: number,
  k: number,
  regions: BorderRegionMap,
  intensity: number,
  cfg: PremiumBorderTuning['sparkle'],
  densityScale: number,
): SparkSpec[] {
  const cx = box / 2;
  const cy = box / 2;
  const rimR = box * 0.41;
  const n = Math.max(
    4,
    Math.round(regions.sparkleAngles.length * 2 * Math.min(1.5, Math.max(0.3, cfg.frequency * intensity)) * densityScale),
  );
  const specs: SparkSpec[] = [];
  for (let i = 0; i < n; i++) {
    const baseAngle = regions.sparkleAngles[i % regions.sparkleAngles.length]!;
    const angle = baseAngle + (Math.random() - 0.5) * 0.4;
    const r = rimR * (0.86 + Math.random() * 0.22);
    specs.push({
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
      size: (cfg.sizeMin + Math.random() * (cfg.sizeMax - cfg.sizeMin)) * k,
      color: cfg.palette[i % cfg.palette.length]!,
      delayMs: Math.random() * 1800,
      gapMs: 700 + Math.random() * 1600,
    });
  }
  return specs;
}

function Sparkle({ spec }: { spec: SparkSpec }) {
  const lifeMs = useTuning().sparkle.lifeMs;
  const p = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(spec.delayMs),
        Animated.timing(p, { toValue: 1, duration: lifeMs, easing: Easing.out(Easing.quad), useNativeDriver: USE_NATIVE }),
        Animated.timing(p, { toValue: 0, duration: 0, useNativeDriver: USE_NATIVE }),
        Animated.delay(spec.gapMs),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      p.setValue(0);
    };
  }, [p, spec.delayMs, spec.gapMs, lifeMs]);

  const opacity = p.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 0] });
  const scale = p.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.2, 1.2, 0.4] });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: spec.x - spec.size / 2,
        top: spec.y - spec.size / 2,
        width: spec.size,
        height: spec.size,
        borderRadius: spec.size / 2,
        backgroundColor: spec.color,
        opacity,
        transform: [{ scale }],
        shadowColor: spec.color,
        shadowOpacity: 0.9,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 0 },
      }}
    />
  );
}

function AccentSparkles({ box, k, regions, intensity, densityScale }: { box: number; k: number; regions: BorderRegionMap; intensity: number; densityScale: number }) {
  const cfg = useTuning().sparkle;
  const specs = useMemo(
    () => buildSparkles(box, k, regions, intensity, cfg, densityScale),
    [box, k, regions, intensity, cfg, densityScale],
  );
  if (intensity <= 0.01) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {specs.map((s, i) => (
        <Sparkle key={i} spec={s} />
      ))}
    </View>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
 * DOWNBEAT EFFECT — SPOTLIGHT BLOOM
 * Cinematic outer aura: concentric soft gold/purple glow rings that swell on the
 * downbeat so the WHOLE frame "lights up." Transparent centers keep the face clean.
 * ════════════════════════════════════════════════════════════════════════════ */

function SpotlightBloom({ box, intensity, cycleMs }: { box: number; intensity: number; cycleMs: number }) {
  const cfg = useTuning().celebration;
  const p = useDownbeat(cycleMs, 280, Math.max(700, Math.round(cycleMs * 0.14)));
  if (intensity <= 0.01) return null;
  const ambient = Math.min(0.5, cfg.spotlightAmbient * Math.min(1.2, intensity));
  const peak = Math.min(0.92, cfg.spotlightPeak * Math.min(1.2, intensity));
  const opacity = p.interpolate({ inputRange: [0, 1], outputRange: [ambient, peak] });
  const scale = p.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.08] });

  const Aura = ({ d, thick, color, glow }: { d: number; thick: number; color: string; glow: number }) => (
    <Animated.View
      style={{
        position: 'absolute',
        left: box / 2 - d / 2,
        top: box / 2 - d / 2,
        width: d,
        height: d,
        borderRadius: d / 2,
        borderWidth: thick,
        borderColor: color,
        opacity,
        transform: [{ scale }],
        shadowColor: color,
        shadowOpacity: 0.95,
        shadowRadius: glow,
        shadowOffset: { width: 0, height: 0 },
      }}
    />
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Aura d={box * 0.99} thick={box * 0.05} color={cfg.spotlightColor} glow={box * 0.12} />
      <Aura d={box * 1.08} thick={box * 0.03} color={cfg.spotlightColor} glow={box * 0.16} />
      <Aura d={box * 0.9} thick={box * 0.025} color="rgba(255,226,150,0.45)" glow={box * 0.08} />
    </View>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
 * DOWNBEAT EFFECT — IGNITION FLASH
 * A quick brightness wash over the whole frame at the burst instant (the camera-
 * flash / firework-ignite pop). Brief + on top of everything.
 * ════════════════════════════════════════════════════════════════════════════ */

function CelebrationFlash({ box, intensity, cycleMs }: { box: number; intensity: number; cycleMs: number }) {
  const cfg = useTuning().celebration;
  const p = useDownbeat(cycleMs, 90, Math.max(180, cfg.flashMs));
  if (intensity <= 0.01) return null;
  const peak = Math.min(0.85, cfg.flashPeak * Math.min(1.3, intensity));
  const opacity = p.interpolate({ inputRange: [0, 1], outputRange: [0, peak] });
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: box / 2 - (box * 0.86) / 2,
        top: box / 2 - (box * 0.86) / 2,
        width: box * 0.86,
        height: box * 0.86,
        borderRadius: (box * 0.86) / 2,
        backgroundColor: cfg.flashColor,
        opacity,
        shadowColor: cfg.flashColor,
        shadowOpacity: 0.9,
        shadowRadius: box * 0.12,
        shadowOffset: { width: 0, height: 0 },
      }}
      pointerEvents="none"
    />
  );
}

/* ════════════════════════════════════════════════════════════════════════════
 * DOWNBEAT EFFECT — GOD RAYS
 * A radial fan of light slivers that flares out from the cap on the downbeat, then
 * fades — a sunburst of energy behind the explosion.
 * ════════════════════════════════════════════════════════════════════════════ */

function GodRays({
  box,
  region,
  intensity,
  cycleMs,
}: {
  box: number;
  region: { x: number; y: number; radius: number };
  intensity: number;
  cycleMs: number;
}) {
  const cfg = useTuning().celebration;
  const p = useDownbeat(cycleMs, 160, Math.max(260, cfg.godRayMs));
  if (intensity <= 0.01) return null;
  const cx = box * region.x;
  const cy = box * region.y;
  const len = box * 0.46;
  const thick = Math.max(2, box * 0.018);
  // Fewer rays on small avatars (feed/comments) so dense lists stay smooth.
  const rayScale = Math.min(1, box / FULL_DENSITY_BOX);
  const n = Math.max(5, Math.round(cfg.godRayCount * rayScale));
  const opacity = p.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, Math.min(0.9, intensity), 0] });
  const scaleY = p.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] });
  const spin = p.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '24deg'] });

  return (
    <Animated.View
      style={{ position: 'absolute', left: cx, top: cy, opacity, transform: [{ rotate: spin }] }}
      pointerEvents="none"
    >
      {Array.from({ length: n }).map((_, i) => {
        const angle = (360 / n) * i;
        // Centered at the anchor, then rotate + push outward → a clean radial spoke
        // that emanates from the cap center (not a pinwheel around each ray's middle).
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: -thick / 2,
              top: -len / 2,
              width: thick,
              height: len,
              borderRadius: thick,
              backgroundColor: cfg.godRayColor,
              transform: [{ rotate: `${angle}deg` }, { translateY: -len / 2 }, { scaleY }],
            }}
          />
        );
      })}
    </Animated.View>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
 * DOWNBEAT EFFECT — SHOCKWAVE RING
 * A thin bright ring that rips outward from the cap on the burst and fades —
 * the "energy release" of the explosion. Reads great even on small avatars.
 * ════════════════════════════════════════════════════════════════════════════ */

function ShockwaveRing({
  box,
  region,
  intensity,
  cycleMs,
}: {
  box: number;
  region: { x: number; y: number; radius: number };
  intensity: number;
  cycleMs: number;
}) {
  const cfg = useTuning().celebration;
  const p = useDownbeat(cycleMs, 60, Math.max(360, cfg.shockwaveMs));
  if (intensity <= 0.01) return null;
  const cx = box * region.x;
  const cy = box * region.y;
  const d = box * cfg.shockwaveSpreadFrac;
  const peak = Math.min(1, cfg.shockwavePeak * Math.min(1.2, intensity));
  const opacity = p.interpolate({ inputRange: [0, 0.12, 1], outputRange: [0, peak, 0] });
  const scale = p.interpolate({ inputRange: [0, 1], outputRange: [0.12, 1] });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: cx - d / 2,
        top: cy - d / 2,
        width: d,
        height: d,
        borderRadius: d / 2,
        borderWidth: Math.max(2, box * 0.02),
        borderColor: cfg.shockwaveColor,
        opacity,
        transform: [{ scale }],
        shadowColor: cfg.shockwaveColor,
        shadowOpacity: 0.9,
        shadowRadius: box * 0.05,
        shadowOffset: { width: 0, height: 0 },
      }}
      pointerEvents="none"
    />
  );
}

/* ════════════════════════════════════════════════════════════════════════════
 * AMBIENT EFFECT — FLOATING MOTES
 * Slow gold dust that drifts upward and fades on a continuous loop, so the frame
 * keeps shimmering with life during the quiet gap between celebrations.
 * ════════════════════════════════════════════════════════════════════════════ */

type MoteSpec = { x: number; rise: number; size: number; delayMs: number; driftX: number };

function Mote({ spec, box, color, riseMs }: { spec: MoteSpec; box: number; color: string; riseMs: number }) {
  const p = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(spec.delayMs),
        Animated.timing(p, { toValue: 1, duration: riseMs, easing: Easing.inOut(Easing.sin), useNativeDriver: USE_NATIVE }),
        Animated.timing(p, { toValue: 0, duration: 0, useNativeDriver: USE_NATIVE }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      p.setValue(0);
    };
  }, [p, spec.delayMs, riseMs]);

  const startY = box * 0.82;
  const translateY = p.interpolate({ inputRange: [0, 1], outputRange: [startY, box * spec.rise] });
  const translateX = p.interpolate({ inputRange: [0, 1], outputRange: [spec.x, spec.x + spec.driftX] });
  const opacity = p.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 1, 1, 0] });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: -spec.size / 2,
        top: -spec.size / 2,
        width: spec.size,
        height: spec.size,
        borderRadius: spec.size / 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateX }, { translateY }],
        shadowColor: color,
        shadowOpacity: 0.9,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 0 },
      }}
    />
  );
}

function FloatingMotes({
  box,
  k,
  intensity,
  densityScale,
}: {
  box: number;
  k: number;
  intensity: number;
  densityScale: number;
}) {
  const cfg = useTuning().motes;
  const specs = useMemo<MoteSpec[]>(() => {
    const n = Math.max(3, Math.round(cfg.count * densityScale));
    return Array.from({ length: n }).map(() => ({
      x: box * (0.16 + Math.random() * 0.68),
      rise: 0.12 + Math.random() * 0.22,
      size: (cfg.sizeMin + Math.random() * (cfg.sizeMax - cfg.sizeMin)) * k,
      delayMs: Math.random() * cfg.riseMs,
      driftX: (Math.random() - 0.5) * box * 0.12,
    }));
  }, [box, k, densityScale, cfg.count, cfg.riseMs, cfg.sizeMin, cfg.sizeMax]);

  if (intensity <= 0.01) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {specs.map((s, i) => (
        <Mote key={i} spec={s} box={box} color={cfg.color} riseMs={cfg.riseMs} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'relative', overflow: 'visible', alignItems: 'center', justifyContent: 'center' },
  photoWrap: { position: 'absolute', overflow: 'hidden', backgroundColor: 'transparent' },
  photoFallback: { backgroundColor: '#0E1626' },
  overlay: { position: 'absolute', left: 0, top: 0, overflow: 'visible' },
});

export default PremiumAnimatedProfileBorder;
