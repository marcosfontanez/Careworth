import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PulseTier, tierMeta } from '@/utils/pulseScore';

type Size = 'xs' | 'sm' | 'md';

interface Props {
  /**
   * Tier id. Accepts `null`/`undefined`/unknown strings so callers can
   * pass `creator.pulseTier` directly without a null guard. Murmur is
   * the safe default.
   */
  tier?: PulseTier | string | null;
  /**
   * Optional overall score (0–100). When provided, appears after the
   * tier label — handy when the badge is the only Pulse surface a user
   * sees (e.g. feed avatar strip).
   */
  score?: number | null;
  size?: Size;
  /**
   * When true (default false) the Murmur tier renders as an invisible
   * no-op. Feed overlays use this so profiles with no Pulse signal yet
   * don't get a visual penalty chip.
   */
  hideMurmur?: boolean;
  /** Drop a small pulse-heart glyph in front of the label. */
  showIcon?: boolean;
}

/**
 * Reusable Pulse tier chip.
 *
 * The canonical "this creator is currently at X tier" badge.
 * Pixel-accurate across the app: feed overlays, search results,
 * leaderboards, profile rows, comment authors — anywhere an avatar
 * appears, this can sit next to it. Reads tier metadata (label + accent
 * colors) from `utils/pulseScore`, so any tier rebrand propagates
 * instantly.
 *
 * All color is driven off the tier accent — transparent background with
 * a 1px ring so it reads as a premium identity marker, not a banner ad.
 */
export function PulseTierBadge({
  tier,
  score,
  size = 'sm',
  hideMurmur = false,
  showIcon = true,
}: Props) {
  const meta = tierMeta(tier ?? null);

  if (hideMurmur && meta.id === 'murmur') return null;

  const s = SIZES[size];

  return (
    <View
      style={[
        styles.base,
        {
          paddingHorizontal: s.padX,
          paddingVertical: s.padY,
          borderRadius: 999,
          backgroundColor: `${meta.accent}1F`,
          borderColor: `${meta.accent}66`,
          gap: s.gap,
        },
      ]}
      accessibilityLabel={`Pulse tier ${meta.label}${
        typeof score === 'number' && Number.isFinite(score) ? `, score ${Math.round(score)}` : ''
      }`}
    >
      {showIcon ? (
        <Ionicons name="pulse" size={s.icon} color={meta.accent} />
      ) : null}
      <Text style={[styles.label, { color: meta.accent, fontSize: s.label, letterSpacing: s.track }]}>
        {meta.label.toUpperCase()}
      </Text>
      {typeof score === 'number' && Number.isFinite(score) ? (
        <Text style={[styles.score, { color: meta.accent, fontSize: s.label }]}>
          · {Math.round(score)}
        </Text>
      ) : null}
    </View>
  );
}

const SIZES = {
  xs: { padX: 5, padY: 1,   icon: 8,  label: 8.5, track: 0.6, gap: 2 },
  sm: { padX: 7, padY: 2,   icon: 9,  label: 9.5, track: 0.6, gap: 3 },
  md: { padX: 9, padY: 3,   icon: 11, label: 11,  track: 0.5, gap: 4 },
} as const;

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  label: {
    fontWeight: '900',
  },
  score: {
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
});
