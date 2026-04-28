import React, { useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { spacing } from '@/theme';
import type { ProfileUpdateDisplayType } from '@/types';
import { MY_PULSE_VISUALS } from './cards/MyPulseCardShell';

interface Props {
  /** Owner only: when true the chips route into the composer. Visitors hide the row. */
  isOwner: boolean;
  variant?: 'full';
}

/**
 * Composer chips — plural labels so they read as categories ("post a new
 * Thought / Clip / Link / Pics") rather than the singular title of a
 * specific post. Pics stays Pics (informally already plural).
 */
const CHIPS: {
  key: ProfileUpdateDisplayType;
  route: string;
  label: string;
}[] = [
  { key: 'thought', route: '/create/my-pulse/thought', label: 'Thoughts' },
  { key: 'clip', route: '/create/my-pulse/link-post', label: 'Clips' },
  { key: 'link', route: '/create/my-pulse/link-note', label: 'Links' },
  { key: 'pics', route: '/create/my-pulse/pics', label: 'Pics' },
];

/**
 * My Pulse composer chips — the "Add to your Pulse" row that lets the
 * owner jump straight into the composer for one of the four canonical
 * Pulse types (Thoughts / Clips / Links / Pics).
 *
 * Layout:
 * - Row of 4 equal-width pills via `flex:1 + minWidth:0`
 * - Each pill has a 2px accent neon border and a 22% accent fill
 * - Badge (small rounded-square accent tile with white glyph) pinned
 *   to the left
 * - Plural label centered in the remaining space in white bold
 *
 * Implementation notes:
 * - We use `TouchableOpacity` as the single interactive element that
 *   also owns the pill chrome (border, fill, shape, flex sizing). Using
 *   TouchableOpacity (instead of nesting Pressable in a View) avoids a
 *   RN quirk where Pressable's function-as-style can drop layout styles
 *   and where a View-wrapped Pressable can miss tap events in some
 *   render paths.
 * - Label font is sized to the narrowest case ("Thoughts" on a 390pt
 *   screen) so every label fits without clipping.
 */
export function MyPulseComposerChips({ isOwner }: Props) {
  const router = useRouter();

  const go = useCallback(
    (route: string) => {
      Haptics.selectionAsync().catch(() => undefined);
      router.push(route as any);
    },
    [router],
  );

  if (!isOwner) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {CHIPS.map((chip) => {
          const vis = MY_PULSE_VISUALS[chip.key];
          return (
            <TouchableOpacity
              key={chip.key}
              onPress={() => go(chip.route)}
              activeOpacity={0.75}
              style={[
                styles.chip,
                {
                  borderColor: vis.accent,
                  backgroundColor: withAlpha(vis.accent, 0.18),
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Add ${chip.label} to My Pulse`}
            >
              <Ionicons name={vis.icon} size={13} color={vis.accent} />
              <Text
                style={[styles.label, { color: vis.accent }]}
                numberOfLines={1}
                ellipsizeMode="tail"
                allowFontScaling={false}
              >
                {chip.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

/**
 * Convert a hex color (#RGB or #RRGGBB) to rgba(r, g, b, a). Falls back
 * to the original string if we can't parse it so callers can safely
 * pass any color token through.
 */
function withAlpha(hex: string, alpha: number): string {
  if (!hex.startsWith('#') || (hex.length !== 7 && hex.length !== 4)) {
    return hex;
  }
  let r: number;
  let g: number;
  let b: number;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  /**
   * Row of 4 chips spanning the full content width. `alignSelf:stretch`
   * + `width:'100%'` is belt-and-suspenders in case any ancestor isn't
   * stretching children. Gap of 6pt between chips.
   */
  row: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    width: '100%',
    gap: 6,
  },
  /**
   * The pill itself — all chrome (border, fill, shape, height) plus
   * the row flex (icon + label) lives on this TouchableOpacity so
   * styling and tap handling stay in one place and there are no
   * wrapper issues.
   *
   * Premium-minimal look per the reference mockup:
   * - 1.5px accent outline (thin, not heavy)
   * - 18% accent fill so the pill reads as a subtle glow, not a block
   * - Icon + label are rendered in the accent color and centered
   *   together as a tight group (gap 4) — no solid icon tile, no
   *   background-chrome on the glyph. The glyph itself IS the badge.
   */
  chip: {
    flex: 1,
    minWidth: 0,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    gap: 4,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  /**
   * Label sits next to the glyph as a single chromatic group. We
   * don't use `flex:1` here — we want the (icon + label) group to
   * size to its content and be centered inside the pill via the
   * parent's `justifyContent:'center'`, not stretched to fill.
   * This is what gives the pill its "tight, premium" feel versus
   * an icon jammed to one edge with space between.
   */
  label: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.1,
    minWidth: 0,
    flexShrink: 1,
    includeFontPadding: false,
  },
});
