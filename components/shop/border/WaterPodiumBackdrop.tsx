import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { hexWithAlpha } from '@/components/shop/border/previewPlateUtils';

type Props = {
  /** Visual width of the pedestal area (matches ring stage scale). */
  stageDiameter: number;
  ringColor: string;
  /** Taller stacks more ripples — featured hero vs compact shop bag. */
  intensity?: 'featured' | 'compact';
  children: React.ReactNode;
};

/**
 * “Liquid” pedestal: full horizontal ripples (no half-moons), soft pool glow, faint vertical rays.
 * Designed to sit behind transparent PNG ring art — no matte square stage.
 */
export function WaterPodiumBackdrop({ stageDiameter, ringColor, intensity = 'featured', children }: Props) {
  const shellPad = 8;
  const shellW = stageDiameter + shellPad * 2;
  const n = stageDiameter;

  const rippleSpecs =
    intensity === 'featured'
      ? ([
          { s: 1.42, b: 2, h: 13, stroke: 0.34, fill: 0.07 },
          { s: 1.22, b: 11, h: 12, stroke: 0.38, fill: 0.09 },
          { s: 1.04, b: 20, h: 11, stroke: 0.42, fill: 0.1 },
          { s: 0.88, b: 29, h: 10, stroke: 0.46, fill: 0.11 },
          { s: 0.72, b: 38, h: 9, stroke: 0.5, fill: 0.12 },
          { s: 0.58, b: 46, h: 8, stroke: 0.52, fill: 0.1 },
        ] as const)
      : ([
          { s: 1.12, b: 0, h: 9, stroke: 0.32, fill: 0.08 },
          { s: 0.9, b: 7, h: 8, stroke: 0.36, fill: 0.09 },
          { s: 0.72, b: 14, h: 7, stroke: 0.4, fill: 0.1 },
        ] as const);

  const rayXs = intensity === 'featured' ? ([0.26, 0.42, 0.58, 0.74] as const) : ([0.35, 0.65] as const);

  const poolPadBottom = intensity === 'featured' ? 52 : 28;

  return (
    <View style={[styles.shell, { width: shellW }]}>
      <View style={[styles.stage, { width: shellW, minHeight: stageDiameter + poolPadBottom }]}>
        {/* Under-pool soft wash */}
        <LinearGradient
          colors={[
            'transparent',
            hexWithAlpha(ringColor, 0.06),
            'rgba(34,211,238,0.12)',
            hexWithAlpha(ringColor, 0.05),
            'transparent',
          ]}
          locations={[0, 0.3, 0.55, 0.78, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          pointerEvents="none"
          style={styles.poolWash}
        />

        {/* Vertical pulse rays — behind ring */}
        <View style={[styles.raysHit, { top: stageDiameter * 0.04, height: stageDiameter * 0.92 }]} pointerEvents="none">
          {rayXs.map((pct, i) => (
            <LinearGradient
              key={i}
              colors={['transparent', 'rgba(103,232,249,0.16)', 'rgba(34,211,238,0.09)', 'transparent']}
              locations={[0, 0.38, 0.68, 1]}
              start={{ x: 0.5, y: 1 }}
              end={{ x: 0.5, y: 0 }}
              style={{
                position: 'absolute',
                left: `${pct * 100}%`,
                width: intensity === 'featured' ? 3 : 2,
                marginLeft: intensity === 'featured' ? -1.5 : -1,
                height: '100%',
                opacity: intensity === 'featured' ? 0.5 : 0.4,
              }}
            />
          ))}
        </View>

        {/* Concentric water ripples — full ellipses, widest at rear */}
        <View style={[styles.rippleBand, { height: intensity === 'featured' ? 96 : 52 }]} pointerEvents="none">
          {rippleSpecs.map((r, i) => {
            const rw = n * r.s;
            const rh = r.h;
            return (
              <View
                key={i}
                style={{
                  position: 'absolute',
                  bottom: r.b,
                  left: '50%',
                  width: rw,
                  marginLeft: -rw / 2,
                  height: rh,
                  borderRadius: rh / 2,
                  borderWidth: 1.15,
                  borderColor: `rgba(45,212,191,${r.stroke})`,
                  backgroundColor: `rgba(6,182,212,${r.fill})`,
                }}
              />
            );
          })}
        </View>

        <View style={styles.artLayer}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    alignItems: 'center',
    overflow: 'visible',
  },
  stage: {
    position: 'relative',
    alignItems: 'center',
    overflow: 'visible',
  },
  poolWash: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '58%',
    opacity: 0.72,
  },
  raysHit: {
    position: 'absolute',
    left: 0,
    right: 0,
    width: '100%',
  },
  rippleBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'visible',
  },
  artLayer: {
    zIndex: 4,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
});
