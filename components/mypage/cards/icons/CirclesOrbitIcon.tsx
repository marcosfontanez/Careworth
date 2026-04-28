import React from 'react';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Stop,
} from 'react-native-svg';

interface Props {
  /** Square render size in pixels. */
  size?: number;
  /**
   * Override the orbit color. Defaults to a blue → purple gradient that
   * mirrors the reference Circles logo. Passing a solid color swaps the
   * gradient for a single-tone orbit (useful when the caller wants the
   * icon to inherit the surrounding accent — e.g. the Circle Discussion
   * pill on My Pulse, which is rose-pink).
   */
  color?: string;
  /**
   * Opacity of the non-dot portions of the orbit. 1 = crisp like the logo,
   * lower values keep the glyph readable on busy backgrounds without
   * competing with the label next to it.
   */
  orbitOpacity?: number;
}

/**
 * Custom "Circles" glyph — a tilted orbit with two glowing endpoint dots,
 * inspired by the PulseVerse Circles wordmark. Rendered as SVG so it reads
 * crisply at any size (11px pill icon, 22px hub tile, etc.) without
 * jagged bitmap scaling.
 *
 * Geometry is drawn on a 24×24 viewBox:
 *   - Upper arc (top-left → top-right)
 *   - Lower arc (bottom-right → bottom-left), offset slightly so the two
 *     arcs appear to orbit each other (the characteristic look of the logo)
 *   - Two filled dots sit at the arc endpoints, giving the "planet meeting
 *     planet" feel.
 */
export function CirclesOrbitIcon({ size = 16, color, orbitOpacity = 0.95 }: Props) {
  const solidColor = color;
  const gradientId = 'circles-orbit-gradient';

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {!solidColor ? (
        <Defs>
          <LinearGradient
            id={gradientId}
            x1="0"
            y1="0"
            x2="24"
            y2="24"
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor="#22D3EE" />
            <Stop offset="0.55" stopColor="#60A5FA" />
            <Stop offset="1" stopColor="#A855F7" />
          </LinearGradient>
        </Defs>
      ) : null}

      {(() => {
        const stroke = solidColor ?? `url(#${gradientId})`;

        return (
          <>
            <Path
              d="M 3.5 9 A 10 5 -18 0 1 20.5 6.5"
              stroke={stroke}
              strokeWidth={2}
              strokeLinecap="round"
              fill="none"
              opacity={orbitOpacity}
            />
            <Path
              d="M 3.5 17.5 A 10 5 -18 0 0 20.5 15"
              stroke={stroke}
              strokeWidth={2}
              strokeLinecap="round"
              fill="none"
              opacity={orbitOpacity}
            />

            <Circle cx={20.5} cy={6.5} r={1.7} fill={stroke} />
            <Circle cx={3.5} cy={17.5} r={1.7} fill={stroke} />
          </>
        );
      })()}
    </Svg>
  );
}
