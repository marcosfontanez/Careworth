/**
 * Premium Animated Profile Border — tuning + layout config.
 *
 * This is the ONE place to tune the "Class of 2026" celebration animation. Every
 * value here is intentionally named and commented so motion can be dialed up/down
 * without touching the component render code.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * HOW TO TUNE (quick map)
 *   • Confetti amount ........ PREMIUM_BORDER_TUNING.confetti.count
 *   • Confetti speed ......... PREMIUM_BORDER_TUNING.confetti.fallSpeed / burstSpeed
 *   • Burst strength ......... PREMIUM_BORDER_TUNING.confetti.burstStrength
 *   • Shimmer brightness ..... PREMIUM_BORDER_TUNING.shimmer.brightness
 *   • Glow intensity ......... PREMIUM_BORDER_TUNING.glow.intensity (plaque + cap + ECG)
 *   • Sparkle frequency ...... PREMIUM_BORDER_TUNING.sparkle.frequency
 *
 * Everything is then multiplied by the runtime `animationIntensity` prop
 * (0 = effectively static, 1 = authored default, >1 = extra hype) so a single
 * prop can scale the whole show per-surface.
 * ──────────────────────────────────────────────────────────────────────────────
 */

import type { ImageSourcePropType } from 'react-native';

/** Catalog slug for the Class of 2026 graduation frame (matches pulse_avatar_frames.slug + shop metadata.pulse_frame_slug). */
export const PULSE_CLASS_OF_2026_FRAME_SLUG = 'class-of-2026-border';

/** Shop slugs that map to the Class of 2026 border art. */
export const SHOP_SLUGS_CLASS_OF_2026 = new Set([
  'border-class-of-2026',
  'border_class_of_2026',
]);

/**
 * Premium families that get the rich animated overlay. Keep this an enum-ish union
 * so we can add future animated drops (e.g. a New Year flagship) without rewriting
 * the component. `premiumType` is a prop on PremiumAnimatedProfileBorder.
 */
export type PremiumBorderType = 'classOf2026';

/**
 * Region anchors expressed as fractions (0–1) of the SQUARE outer box.
 * (0,0) = top-left, (1,1) = bottom-right, (0.5,0.5) = dead center of the photo.
 *
 * These are tuned against `assets/images/pulse-rings/class-of-2026-border.png`.
 * If you swap in final art and the cap/gems/plaque move, nudge these values —
 * the animation layers read positions from here, nothing is hard-coded in the view.
 */
export type BorderRegionMap = {
  /** Graduation cap / top crest — the confetti explosion source. */
  capCrest: { x: number; y: number; radius: number };
  /** Heart gem (left). */
  gemLeft: { x: number; y: number };
  /** Heart gem (right). */
  gemRight: { x: number; y: number };
  /** Left ECG/pulse line — a HORIZONTAL segment centered at (x,y); energy travels along its width. */
  ecgLeft: { x: number; y: number; halfWidth: number };
  /** Right ECG/pulse line. */
  ecgRight: { x: number; y: number; halfWidth: number };
  /** "Class of 2026" plaque (bottom). */
  plaque: { x: number; y: number; width: number; height: number };
  /**
   * Outer ring of accent-sparkle anchors (angles in radians, 0 = +x / right,
   * sweeping clockwise). Sparkles ride the gold trim at these positions.
   */
  sparkleAngles: number[];
};

// Anchors tuned to assets/images/pulse-rings/class-of-2026-border.png (purple/gold art):
// purple cap+tassel at top, purple heart gems at the sides, gold horizontal ECG
// lines mid-side, "CLASS OF 2026" plaque at the bottom.
export const CLASS_OF_2026_REGION_MAP: BorderRegionMap = {
  capCrest: { x: 0.5, y: 0.11, radius: 0.15 },
  gemLeft: { x: 0.105, y: 0.56 },
  gemRight: { x: 0.895, y: 0.56 },
  ecgLeft: { x: 0.17, y: 0.5, halfWidth: 0.075 },
  ecgRight: { x: 0.83, y: 0.5, halfWidth: 0.075 },
  plaque: { x: 0.5, y: 0.805, width: 0.34, height: 0.12 },
  // Crest, both heart gems, and four points of gold trim / teal gems.
  sparkleAngles: [
    -Math.PI / 2, // top crest
    -Math.PI / 3,
    -(2 * Math.PI) / 3,
    Math.PI, // left gem
    0, // right gem
    Math.PI / 4,
    (3 * Math.PI) / 4,
  ],
};

/**
 * Authored animation defaults. Multiply any of these by `animationIntensity`
 * at runtime. Comments call out the "feel" each knob controls.
 */
export const PREMIUM_BORDER_TUNING = {
  /** Active celebration length. Burst lives in the first ~1s, then confetti falls. */
  loopDurationMs: 5000,

  /**
   * Quiet hold AFTER the celebration finishes before it loops again. Per product:
   * play the celebration, then wait 5s, then replay. During this gap the ambient
   * shimmer / gem glints / ECG glow / plaque breathing keep the frame "alive" — only
   * the dramatic confetti burst + cap-halo flare pause and then re-fire.
   */
  loopRestGapMs: 5000,

  confetti: {
    /**
     * How many confetti pieces in the celebratory burst+fall. Tuned HIGH to mirror
     * the reference video, where a dense purple burst completely fills the ring.
     */
    count: 72,
    /** Burst pieces explode outward over this window (ms) from the cap crest. */
    burstSpeed: 820,
    /** Higher = pieces fly further/faster out of the cap before gravity. */
    burstStrength: 1.15,
    /** Falling/drift duration per piece (ms). Lower = faster rain. */
    fallSpeed: 2400,
    /**
     * Confetti palette — purple-dominant to match the reference video (deep violet →
     * orchid → lavender) with a few bright lavender/white flecks catching the light.
     */
    palette: [
      '#7C3AED', '#9333EA', '#A855F7', '#C084FC', '#C77DFF',
      '#B24BF3', '#8B2FC9', '#6D28D9', '#D8B4FE', '#E9D5FF',
      '#A855F7', '#9333EA', '#C084FC', '#5EEAD4', '#2DD4BF', '#FFFFFF',
    ],
    /** Metallic gold flecks mixed into the burst (school-color gold that catches light). */
    goldColors: ['#FFD700', '#F5C518', '#FFE9A8'],
    /** Fraction of pieces rendered as shiny GOLD foil rectangles (0–1). */
    goldFoilFrac: 0.22,
    /** Fraction of pieces rendered as long fluttering STREAMERS / ribbons (0–1). */
    streamerFrac: 0.14,
    /** Keep confetti in the outer ring band; this is the min radius (fraction of box) from center. */
    minRadiusFrac: 0.34,
    /**
     * Confetti rains all the way down to here (fraction of box) before fading, so the
     * burst fills the WHOLE interior like the video instead of only the upper band.
     */
    fadeBelowY: 0.92,
    /** Piece size range (px at a 320px reference box; scaled by box size). Fine flecks. */
    sizeMin: 3,
    sizeMax: 8,
    /**
     * Fraction of the box width the falling "curtain" of confetti fans across. Near
     * full-width so the explosion blankets the entire center of the ring.
     */
    spreadXFrac: 0.96,
    /** Fraction of pieces that shoot UP above the cap as the explosion plume (rest fill/rain down). */
    plumeFrac: 0.34,
    /** How far above the cap crest (fraction of box) the plume pieces can launch. */
    topRiseFrac: 0.2,
  },

  shimmer: {
    /** Gold light sweep travel time around the ring (ms). */
    sweepMs: 2400,
    /** 0–1 peak opacity of the moving highlight. Higher = brighter polished metal. */
    brightness: 0.95,
    /** Arc width of the moving highlight (radians). */
    arcWidth: Math.PI / 2.4,
    /** 0–1 brightness of the steady luminous gold glow that rings the inner band (the video's "lighting"). */
    ringGlow: 0.6,
  },

  /**
   * Bright starburst that flares on top of the graduation cap — the "spark" in the
   * reference video. White-hot core with long gold diffraction spikes.
   */
  capSpark: {
    /** Hot core color. */
    coreColor: '#FFFFFF',
    /** Diffraction-spike / ray color. */
    rayColor: '#FFE9A8',
    /** Star span as a fraction of the box (longest spike ≈ this × box). */
    sizeFrac: 0.34,
    /** Time for one flare-up of the spark (ms). */
    flareMs: 240,
    /** Quiet gap between spark flares (ms). */
    gapMs: 1500,
  },

  gem: {
    /** A single gem glint duration (ms). Quick starburst, not a slow pulse. */
    glintMs: 360,
    /** Gap between successive gem glints (ms). Staggered so frame feels alive. */
    staggerMs: 1300,
    /** Peak scale of the gem glint starburst. */
    peakScale: 2.4,
  },

  ecg: {
    /** Energy travel time along the ECG line (ms). */
    travelMs: 1800,
    /** Glow color for the pulse energy. */
    glowColor: '#5EE7FF',
    /** 0–1 base intensity of the ECG glow before `glow.intensity` scaling. */
    base: 0.9,
  },

  glow: {
    /** Master glow multiplier (plaque breathing, cap halo, ECG glow). */
    intensity: 1,
    /** Plaque "breathing" cycle (ms) — rises and fades. */
    plaqueBreathMs: 2600,
    /** Cap halo flares during the confetti burst, then settles. */
    capHaloColor: '#FFE08A',
    /** Plaque magical glow color. */
    plaqueColor: '#FFE9A8',
  },

  sparkle: {
    /** 0–1: higher fires more accent sparkles around the crest/gems/trim. */
    frequency: 1,
    /** Single accent sparkle lifetime (ms). */
    lifeMs: 520,
    /** Accent sparkle colors (warm gold + cool white). */
    palette: ['#FFF6D6', '#FFD54A', '#FFFFFF', '#BFefff'],
    sizeMin: 1.6,
    sizeMax: 3.6,
  },

  tassel: {
    /** Gentle sway amplitude (degrees) of the cap tassel highlight. */
    swayDeg: 7,
    swayMs: 2200,
  },

  /**
   * The synchronized "downbeat" — one coordinated BANG at the top of every loop:
   * ignition flash + shockwave ring + god-ray burst + spotlight bloom + frame pop.
   * These all fire on the same shared celebration cycle so the explosion lands as a
   * single impactful moment instead of unsynced ambient motion.
   */
  celebration: {
    /** Whole-frame bounce on the downbeat (1 = none). Subtle = energetic, not jarring. */
    popScale: 1.05,
    /** Quick brightness bloom that washes the frame at the burst instant. */
    flashColor: '#FFF7E0',
    /** 0–1 peak opacity of the ignition flash. */
    flashPeak: 0.5,
    /** Ignition flash rise+fall duration (ms). */
    flashMs: 360,
    /** Expanding ring that rips outward from the cap on the burst. */
    shockwaveColor: '#FFE9A8',
    /** 0–1 peak opacity of the shockwave ring. */
    shockwavePeak: 0.9,
    /** Shockwave expand duration (ms). */
    shockwaveMs: 660,
    /** Final shockwave diameter as a fraction of the box. */
    shockwaveSpreadFrac: 0.98,
    /** Soft radial spotlight that blooms behind the whole frame (cinematic hero light). */
    spotlightColor: 'rgba(124,58,237,0.55)',
    /** 0–1 peak opacity of the spotlight bloom. */
    spotlightPeak: 0.6,
    /** 0–1 quiet ambient floor the spotlight holds between bursts (keeps depth alive). */
    spotlightAmbient: 0.16,
    /** God-ray fan that flares from the cap on the burst. */
    godRayColor: 'rgba(255,240,200,0.7)',
    /** Number of light rays in the burst fan. */
    godRayCount: 12,
    /** God-ray flare duration (ms). */
    godRayMs: 540,
    /** Second confetti pop fires this many ms after the first (the "echo"). */
    echoPhaseMs: 460,
    /** Particle-count scale of the echo pop relative to the main burst. */
    echoCountScale: 0.5,
  },

  /** Ambient gold dust drifting upward between bursts so the frame never feels dead. */
  motes: {
    /** Floating mote count at full density. */
    count: 12,
    /** Mote color (warm gold). */
    color: 'rgba(255,226,150,0.85)',
    /** Time for one mote to drift up and fade (ms). */
    riseMs: 5200,
    sizeMin: 1.4,
    sizeMax: 3.4,
  },
} as const;

export type PremiumBorderTuning = {
  loopDurationMs: number;
  loopRestGapMs: number;
  confetti: {
    count: number;
    burstSpeed: number;
    burstStrength: number;
    fallSpeed: number;
    palette: readonly string[];
    goldColors: readonly string[];
    goldFoilFrac: number;
    streamerFrac: number;
    minRadiusFrac: number;
    fadeBelowY: number;
    sizeMin: number;
    sizeMax: number;
    spreadXFrac: number;
    plumeFrac: number;
    topRiseFrac: number;
  };
  shimmer: { sweepMs: number; brightness: number; arcWidth: number; ringGlow: number };
  capSpark: { coreColor: string; rayColor: string; sizeFrac: number; flareMs: number; gapMs: number };
  gem: { glintMs: number; staggerMs: number; peakScale: number };
  ecg: { travelMs: number; glowColor: string; base: number };
  glow: { intensity: number; plaqueBreathMs: number; capHaloColor: string; plaqueColor: string };
  sparkle: {
    frequency: number;
    lifeMs: number;
    palette: readonly string[];
    sizeMin: number;
    sizeMax: number;
  };
  tassel: { swayDeg: number; swayMs: number };
  celebration: {
    popScale: number;
    flashColor: string;
    flashPeak: number;
    flashMs: number;
    shockwaveColor: string;
    shockwavePeak: number;
    shockwaveMs: number;
    shockwaveSpreadFrac: number;
    spotlightColor: string;
    spotlightPeak: number;
    spotlightAmbient: number;
    godRayColor: string;
    godRayCount: number;
    godRayMs: number;
    echoPhaseMs: number;
    echoCountScale: number;
  };
  motes: {
    count: number;
    color: string;
    riseMs: number;
    sizeMin: number;
    sizeMax: number;
  };
};

/** Per-section partial used by the preview screen + per-surface overrides. */
export type PremiumBorderTuningOverride = {
  loopDurationMs?: number;
  loopRestGapMs?: number;
  confetti?: Partial<PremiumBorderTuning['confetti']>;
  shimmer?: Partial<PremiumBorderTuning['shimmer']>;
  capSpark?: Partial<PremiumBorderTuning['capSpark']>;
  gem?: Partial<PremiumBorderTuning['gem']>;
  ecg?: Partial<PremiumBorderTuning['ecg']>;
  glow?: Partial<PremiumBorderTuning['glow']>;
  sparkle?: Partial<PremiumBorderTuning['sparkle']>;
  tassel?: Partial<PremiumBorderTuning['tassel']>;
  celebration?: Partial<PremiumBorderTuning['celebration']>;
  motes?: Partial<PremiumBorderTuning['motes']>;
};

/** Shallow-merge each tuning section over the authored defaults. */
export function mergePremiumTuning(
  override?: PremiumBorderTuningOverride | null,
): PremiumBorderTuning {
  const base = PREMIUM_BORDER_TUNING as unknown as PremiumBorderTuning;
  if (!override) return base;
  return {
    loopDurationMs: override.loopDurationMs ?? base.loopDurationMs,
    loopRestGapMs: override.loopRestGapMs ?? base.loopRestGapMs,
    confetti: { ...base.confetti, ...override.confetti },
    shimmer: { ...base.shimmer, ...override.shimmer },
    capSpark: { ...base.capSpark, ...override.capSpark },
    gem: { ...base.gem, ...override.gem },
    ecg: { ...base.ecg, ...override.ecg },
    glow: { ...base.glow, ...override.glow },
    sparkle: { ...base.sparkle, ...override.sparkle },
    tassel: { ...base.tassel, ...override.tassel },
    celebration: { ...base.celebration, ...override.celebration },
    motes: { ...base.motes, ...override.motes },
  };
}

/**
 * Static asset for the Class of 2026 frame. NOTE: this is currently a generated
 * placeholder — replace the file at the same path with final production art and
 * re-measure {@link CLASS_OF_2026_INNER_OPENING_FRAC} if the transparent center
 * changes size.
 */
export const CLASS_OF_2026_BORDER_ASSET =
  require('../../assets/images/pulse-rings/class-of-2026-border.png') as ImageSourcePropType;

/**
 * Photo diameter / square canvas edge for the Class of 2026 PNG.
 * Drives `rasterRingOuterBoxSide` so the user's photo sits centered and fills the
 * opening right up to the gold ring.
 *
 * NOTE: this is intentionally LARGER than the bare transparent-hole measurement
 * (~0.52). A radial scan of the art (`scripts/measure-class-of-2026-opening.mjs`)
 * shows the pure hole + sparse inner ornament band runs out to radius ~0.31 and the
 * SOLID gold ring only begins at radius ~0.33 (diameter ~0.66). Sizing the photo to
 * ~0.62 lets its edge tuck just under the gold ring instead of floating inside it
 * with a dark gap — i.e. the border truly wraps the photo. Nudge with the
 * "Opening fit" slider on `/border-preview` if a tighter/looser hug is wanted.
 */
export const CLASS_OF_2026_INNER_OPENING_FRAC = 0.62;

export function isClassOf2026FrameSlug(slug: string | null | undefined): boolean {
  return String(slug ?? '').trim().toLowerCase() === PULSE_CLASS_OF_2026_FRAME_SLUG;
}
