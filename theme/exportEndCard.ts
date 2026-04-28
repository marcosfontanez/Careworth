/**
 * PulseVerse Export End Card — design tokens (export/share outro slate).
 *
 * Animation notes (for designers + export engineers):
 * - Keep motion under ~400ms per element; total on-screen 1.0–1.5s for export.
 * - Prefer opacity + slight scale (0.94→1) over large moves so small reshares stay legible.
 * - Orbit/pulse layers stay low-contrast so they read as “atmosphere,” not noise.
 *
 * TODO:audio-sting — When muxing exported MP4:
 * - Duration target: 0.5–1.2s, single non-looping hit at start of end-card segment.
 * - Level: sit ~14–18 dB below full-scale dialog; avoid piercing highs.
 * - Sonic direction: short “pulse” transient + soft modern synth tail (clinical / social, not cartoon).
 * - Asset placeholder: `assets/audio/pulseverse-export-sting.mp3` (not bundled in this phase).
 * - Implementation sketch: `expo-audio` play in preview only; real export = FFmpeg `-i sting.mp3 -filter_complex amix` or platform composer.
 */
export const exportEndCardTokens = {
  /**
   * End-card slate palette. This is *intentionally* distinct from the
   * in-app palette in `theme/colors.ts` — the slate is designed to be
   * vibrant and legible at tiny reshare thumbnail sizes against the
   * navy background, and needs a different teal hue than the muted
   * UI teal (`colors.primary.teal = #14B8A6`). Do not "sync" unless
   * you're redesigning the export slate.
   */
  brand: {
    deepNavy: '#0B1F3A',
    electricBlue: '#2563EB',
    teal: '#19D3C5',
    aqua: '#0FA3B1',
    softGold: '#E5B84B',
    white: '#FFFFFF',
    coolGray: '#F4F7FB',
  },
  /** Typical 9:16 export; in-app preview can scale uniformly */
  aspect: { w: 9, h: 16 },
  timing: {
    /** Recommended duration of the appended slate in export pipelines */
    exportDurationRecommendedMs: 1250,
    logoFadeMs: 360,
    logoScaleFrom: 0.94,
    creatorFadeMs: 300,
    creatorDelayMs: 100,
    taglineFadeMs: 280,
    taglineDelayMs: 220,
    /** Background orbit rotation period (slow, ambient) */
    orbitPeriodMs: 10000,
    /** Horizontal pulse sweep */
    pulseSweepPeriodMs: 2800,
  },
  layout: {
    logoMarkSize: 48,
    maxContentWidthRatio: 0.88,
  },
} as const;

export type ExportEndCardTokenTiming = typeof exportEndCardTokens.timing;
