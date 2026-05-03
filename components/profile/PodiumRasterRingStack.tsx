import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { GoldFireworksBurst } from '@/components/profile/GoldFireworksBurst';
import { podiumPulseRingSource, rasterRingOuterBoxSide } from '@/lib/pulseRingRasterAssets';
import { avatarThumb } from '@/lib/storage';
import { colors } from '@/theme';

export type PodiumRasterTier = 'gold' | 'silver' | 'bronze';

type Props = {
  photoDiameter: number;
  prizeTier: PodiumRasterTier;
  avatarUrl?: string | null;
  /** Looping sparks for monthly 1st / gold frame. */
  showFireworks?: boolean;
};

/**
 * Ornate podium PNG ring (transparent center) over a circular photo — matches
 * monthly leaderboard prizes shown on profiles.
 */
export function PodiumRasterRingStack({
  photoDiameter,
  prizeTier,
  avatarUrl,
  showFireworks,
}: Props) {
  const raster = podiumPulseRingSource(prizeTier);
  if (!raster) return null;
  const outerBox = rasterRingOuterBoxSide(photoDiameter);
  const uri = avatarUrl?.trim() ? avatarThumb(avatarUrl.trim(), Math.round(photoDiameter * 1.5)) : null;
  const fireworksColors =
    prizeTier === 'gold'
      ? ['#FFF176', '#FF9100', '#FFEA00', '#FFFEF0', '#FFD700', '#FFFFFF']
      : undefined;

  return (
    <View style={[styles.wrap, { width: outerBox, height: outerBox }]}>
      {showFireworks ? (
        <GoldFireworksBurst
          ringDiameter={outerBox}
          tier="gold"
          sparkColors={fireworksColors}
        />
      ) : null}
      <View style={[styles.inner, { width: outerBox, height: outerBox }]}>
        {uri ? (
          <Image
            source={{ uri }}
            style={{
              width: photoDiameter,
              height: photoDiameter,
              borderRadius: photoDiameter / 2,
            }}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <View
            style={[
              styles.ph,
              {
                width: photoDiameter,
                height: photoDiameter,
                borderRadius: photoDiameter / 2,
              },
            ]}
          >
            <Ionicons name="person" size={Math.round(photoDiameter * 0.38)} color={colors.dark.textMuted} />
          </View>
        )}
      </View>
      <Image
        source={raster}
        style={[styles.ring, { width: outerBox, height: outerBox }]}
        contentFit="contain"
        pointerEvents="none"
      />
    </View>
  );
}

/** Prize border tier for global monthly ranks 1–5 (2nd & 3rd share silver; 4th & 5th bronze). */
export function prizeFrameTierForMonthlyRank(rank: number): PodiumRasterTier | null {
  if (rank === 1) return 'gold';
  if (rank === 2 || rank === 3) return 'silver';
  if (rank === 4 || rank === 5) return 'bronze';
  return null;
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    backgroundColor: 'transparent',
  },
  ring: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 4,
    backgroundColor: 'transparent',
  },
  ph: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
});
