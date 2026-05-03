import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  boxSize: number;
  /** Neon border stroke width (same as avatar outer border). */
  ringWidth: number;
  /** Diameter of the centered profile photo. */
  photoDiameter: number;
  text: string;
  textColor: string;
  fontSize: number;
};

/** Approximate advance width per character for layout (no onLayout). */
function charAdvance(ch: string, fontSize: number): number {
  if (ch === ' ') return fontSize * 0.38;
  if (/[iIl1|.:;,'`]/.test(ch)) return fontSize * 0.32;
  if (/[mwMW@%]/.test(ch)) return fontSize * 0.72;
  return fontSize * 0.58;
}

/**
 * Curved caption along the **top arc of the ring** (annulus between neon stroke and photo).
 * Each glyph sits on the circle so the label reads along the rim, not across the face.
 */
export function PulseAvatarRingCaption({
  boxSize,
  ringWidth,
  photoDiameter,
  text,
  textColor,
  fontSize,
}: Props) {
  const t = text.trim();

  const cx = boxSize / 2;
  const cy = boxSize / 2;
  const rInner = boxSize / 2 - ringWidth;
  const rPhoto = photoDiameter / 2;

  const items = useMemo(() => {
    if (!t || rInner <= rPhoto + 2) return null;

    /** Radius along the ring band — biased outward so glyphs stay off the face */
    let rArc = rPhoto + (rInner - rPhoto) * 0.72;
    const minR = rPhoto + fontSize * 0.62;
    rArc = Math.max(rArc, minR);
    if (rArc >= rInner - 0.5) return null;

    const chars = [...t];
    const widths = chars.map((ch) => charAdvance(ch, fontSize));
    const totalW = widths.reduce((a, b) => a + b, 0);
    let span = totalW / rArc;
    span = Math.min(Math.max(span, 0.72), 1.38);

    const out: { ch: string; theta: number; w: number; rotDeg: number }[] = [];
    let acc = 0;
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i]!;
      const w = widths[i]!;
      const mid = acc + w / 2;
      acc += w;
      const theta = -Math.PI / 2 - span / 2 + (span * mid) / totalW;
      const rotDeg = ((theta + Math.PI / 2) * 180) / Math.PI;
      out.push({ ch, theta, w, rotDeg });
    }
    return { r: rArc, glyphs: out };
  }, [t, rInner, rPhoto, fontSize]);

  if (!items) return null;

  const { r, glyphs } = items;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject} accessibilityLabel={t}>
      {glyphs.map(({ ch, theta, w, rotDeg }, i) => {
        if (ch === ' ') {
          return <View key={i} collapsable={false} />;
        }
        const x = cx + r * Math.cos(theta);
        const y = cy + r * Math.sin(theta);
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: x - w / 2,
              top: y - fontSize / 2,
              width: w,
              minHeight: fontSize + 2,
              justifyContent: 'center',
              alignItems: 'center',
              transform: [{ rotate: `${rotDeg}deg` }],
            }}
          >
            <Text
              style={[
                styles.glyph,
                {
                  color: textColor,
                  fontSize,
                  lineHeight: fontSize + 1,
                  width: w + 1,
                  textAlign: 'center',
                },
              ]}
              numberOfLines={1}
            >
              {ch}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  glyph: {
    fontWeight: '900',
    letterSpacing: 0,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 0.5 },
    textShadowRadius: 2,
  },
});
