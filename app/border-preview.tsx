import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { StackScreenHeader } from '@/components/ui/StackScreenHeader';
import { PremiumAnimatedProfileBorder } from '@/components/profile/PremiumAnimatedProfileBorder';
import {
  CLASS_OF_2026_INNER_OPENING_FRAC,
  type PremiumBorderTuningOverride,
} from '@/lib/borders/premiumBorderConfig';
import { colors, spacing, borderRadius } from '@/theme';

/**
 * Class of 2026 — border preview / tuning screen.
 *
 * Route: /border-preview  (push from anywhere, e.g. router.push('/border-preview'))
 *
 * This is a developer/design tool: it renders the Class of 2026 border around a
 * sample profile photo at multiple sizes with live sliders for every tunable knob.
 * The slider values map onto the same fields documented in
 * `lib/borders/premiumBorderConfig.ts` → PREMIUM_BORDER_TUNING. Once you settle on
 * values you like here, copy them into that file so they ship as the defaults.
 */

const SAMPLE_PHOTO = 'https://api.dicebear.com/7.x/avataaars/png?seed=ClassOf2026&size=320';

const SIZE_PRESETS: { key: string; label: string; box: number }[] = [
  { key: 'compact', label: 'Compact (feed)', box: 72 },
  { key: 'profile', label: 'Profile', box: 168 },
  { key: 'hero', label: 'Hero / featured', box: 248 },
];

export default function BorderPreviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [box, setBox] = useState(248);
  const [isAnimated, setIsAnimated] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [showBurst, setShowBurst] = useState(true);
  const [replayKey, setReplayKey] = useState(0);
  /** Photo size inside the frame (how tightly the gold ring wraps the avatar). */
  const [openingFrac, setOpeningFrac] = useState(CLASS_OF_2026_INNER_OPENING_FRAC);
  /**
   * When on, force full particle density regardless of size. Turn OFF to preview
   * the size-scaled density a feed / circle avatar actually renders.
   */
  const [forceFull, setForceFull] = useState(true);

  // Global + per-knob tuning (see premiumBorderConfig.ts for what each controls).
  const [intensity, setIntensity] = useState(1);
  const [confettiAmount, setConfettiAmount] = useState(72);
  const [confettiSpeed, setConfettiSpeed] = useState(1); // multiplier
  const [burstStrength, setBurstStrength] = useState(1.15);
  const [shimmerBrightness, setShimmerBrightness] = useState(0.95);
  const [glowIntensity, setGlowIntensity] = useState(1);
  const [sparkleFrequency, setSparkleFrequency] = useState(1);
  const [restGapSec, setRestGapSec] = useState(5); // seconds before the celebration loops
  // Synchronized "downbeat" effects (fire together on each loop).
  const [popScale, setPopScale] = useState(1.05);
  const [flashPeak, setFlashPeak] = useState(0.5);
  const [spotlightPeak, setSpotlightPeak] = useState(0.6);
  const [shockwavePeak, setShockwavePeak] = useState(0.9);

  const tuning = useMemo<PremiumBorderTuningOverride>(
    () => ({
      loopRestGapMs: Math.round(restGapSec * 1000),
      confetti: {
        count: Math.round(confettiAmount),
        burstStrength,
        // Higher "speed" multiplier → shorter durations (faster motion).
        fallSpeed: 2600 / confettiSpeed,
        burstSpeed: 950 / confettiSpeed,
      },
      shimmer: { brightness: shimmerBrightness },
      glow: { intensity: glowIntensity },
      sparkle: { frequency: sparkleFrequency },
      celebration: {
        popScale,
        flashPeak,
        spotlightPeak,
        shockwavePeak,
      },
    }),
    [
      restGapSec,
      confettiAmount,
      confettiSpeed,
      burstStrength,
      shimmerBrightness,
      glowIntensity,
      sparkleFrequency,
      popScale,
      flashPeak,
      spotlightPeak,
      shockwavePeak,
    ],
  );

  return (
    <View style={styles.root}>
      <StackScreenHeader insetTop={insets.top} title="Class of 2026 — Preview" onPressLeft={() => router.back()} />

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }} showsVerticalScrollIndicator={false}>
        {/* Stage */}
        <LinearGradient
          colors={['#0A0F1E', '#111A30', '#0A0F1E']}
          style={styles.stage}
        >
          <PremiumAnimatedProfileBorder
            key={replayKey}
            imageUri={SAMPLE_PHOTO}
            size={box}
            premiumType="classOf2026"
            isAnimated={isAnimated}
            reducedMotion={reducedMotion}
            animationIntensity={intensity}
            showCelebrationBurst={showBurst}
            innerOpeningFrac={openingFrac}
            previewMode={forceFull}
            tuning={tuning}
          />
        </LinearGradient>

        <TouchableOpacity style={styles.replayBtn} onPress={() => setReplayKey((k) => k + 1)} activeOpacity={0.85}>
          <Text style={styles.replayText}>Replay celebration burst</Text>
        </TouchableOpacity>

        {/* Size presets */}
        <Text style={styles.sectionTitle}>Surface size</Text>
        <View style={styles.row}>
          {SIZE_PRESETS.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={[styles.chip, box === p.box && styles.chipActive]}
              onPress={() => setBox(p.box)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, box === p.box && styles.chipTextActive]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Toggles */}
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Animation on</Text>
          <Switch value={isAnimated} onValueChange={setIsAnimated} />
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Reduced motion (static fallback)</Text>
          <Switch value={reducedMotion} onValueChange={setReducedMotion} />
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Show celebration burst</Text>
          <Switch value={showBurst} onValueChange={setShowBurst} />
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Full particle density (off = size-scaled like feed)</Text>
          <Switch value={forceFull} onValueChange={setForceFull} />
        </View>

        {/* Fit */}
        <Text style={styles.sectionTitle}>Fit</Text>
        <LabeledSlider
          label="Opening fit (photo size)"
          value={openingFrac}
          min={0.5}
          max={0.74}
          step={0.005}
          onChange={setOpeningFrac}
          fmt={(v) => v.toFixed(3)}
        />
        <Text style={styles.note}>
          Higher = bigger photo that tucks further under the gold ring. Ships from{'\n'}
          CLASS_OF_2026_INNER_OPENING_FRAC in lib/borders/premiumBorderConfig.ts.
        </Text>

        {/* Tuning sliders */}
        <Text style={styles.sectionTitle}>Tune the celebration</Text>
        <LabeledSlider label="Overall intensity" value={intensity} min={0} max={2} step={0.05} onChange={setIntensity} fmt={(v) => `${v.toFixed(2)}×`} />
        <LabeledSlider label="Confetti amount" value={confettiAmount} min={6} max={110} step={1} onChange={setConfettiAmount} fmt={(v) => `${Math.round(v)}`} />
        <LabeledSlider label="Confetti speed" value={confettiSpeed} min={0.5} max={2.5} step={0.05} onChange={setConfettiSpeed} fmt={(v) => `${v.toFixed(2)}×`} />
        <LabeledSlider label="Burst strength" value={burstStrength} min={0.3} max={2} step={0.05} onChange={setBurstStrength} fmt={(v) => `${v.toFixed(2)}×`} />
        <LabeledSlider label="Shimmer brightness" value={shimmerBrightness} min={0} max={1} step={0.05} onChange={setShimmerBrightness} fmt={(v) => v.toFixed(2)} />
        <LabeledSlider label="Glow intensity" value={glowIntensity} min={0} max={2} step={0.05} onChange={setGlowIntensity} fmt={(v) => `${v.toFixed(2)}×`} />
        <LabeledSlider label="Sparkle frequency" value={sparkleFrequency} min={0} max={2} step={0.05} onChange={setSparkleFrequency} fmt={(v) => `${v.toFixed(2)}×`} />
        <LabeledSlider label="Seconds before looping" value={restGapSec} min={0} max={10} step={0.5} onChange={setRestGapSec} fmt={(v) => `${v.toFixed(1)}s`} />

        <Text style={styles.sectionTitle}>Downbeat “BANG” (synced burst)</Text>
        <LabeledSlider label="Frame pop" value={popScale} min={1} max={1.15} step={0.005} onChange={setPopScale} fmt={(v) => `${v.toFixed(3)}×`} />
        <LabeledSlider label="Ignition flash" value={flashPeak} min={0} max={1} step={0.05} onChange={setFlashPeak} fmt={(v) => v.toFixed(2)} />
        <LabeledSlider label="Spotlight bloom" value={spotlightPeak} min={0} max={1} step={0.05} onChange={setSpotlightPeak} fmt={(v) => v.toFixed(2)} />
        <LabeledSlider label="Shockwave ring" value={shockwavePeak} min={0} max={1} step={0.05} onChange={setShockwavePeak} fmt={(v) => v.toFixed(2)} />

        <Text style={styles.note}>
          These sliders only affect this preview. Copy values you like into{'\n'}
          lib/borders/premiumBorderConfig.ts → PREMIUM_BORDER_TUNING to ship them.
        </Text>
      </ScrollView>
    </View>
  );
}

function LabeledSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  fmt,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  fmt: (v: number) => string;
}) {
  return (
    <View style={styles.sliderBlock}>
      <View style={styles.sliderHeader}>
        <Text style={styles.sliderLabel}>{label}</Text>
        <Text style={styles.sliderValue}>{fmt(value)}</Text>
      </View>
      <Slider
        value={value}
        minimumValue={min}
        maximumValue={max}
        step={step}
        onValueChange={onChange}
        minimumTrackTintColor={colors.primary.teal}
        maximumTrackTintColor={colors.dark.border}
        thumbTintColor={colors.primary.teal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.dark.bg },
  stage: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 320,
    borderWidth: 1,
    borderColor: 'rgba(94,234,212,0.18)',
    overflow: 'hidden',
  },
  replayBtn: {
    alignSelf: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary.royal,
  },
  replayText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  sectionTitle: {
    color: colors.dark.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginHorizontal: spacing.md,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.md },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  chipActive: { backgroundColor: colors.primary.teal + '22', borderColor: colors.primary.teal },
  chipText: { color: colors.dark.textMuted, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: colors.primary.teal },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  toggleLabel: { color: colors.dark.text, fontSize: 14, flex: 1 },
  sliderBlock: { marginHorizontal: spacing.md, marginTop: spacing.sm },
  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sliderLabel: { color: colors.dark.text, fontSize: 14, fontWeight: '600' },
  sliderValue: { color: colors.primary.teal, fontSize: 13, fontWeight: '700' },
  note: {
    color: colors.dark.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
});
