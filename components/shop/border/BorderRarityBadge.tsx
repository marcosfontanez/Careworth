import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { shadows, borderRadius } from '@/theme';
import { getRarityBadgeVisual, type RarityBadgeVisual } from '@/lib/shop/borderBadgeTheme';
import { effectiveRarityKey } from '@/lib/shop/catalogUtils';
import type { ShopItemRow } from '@/lib/shop/types';

type Align = 'start' | 'center';

type ShellProps = {
  visual: RarityBadgeVisual;
  compact?: boolean;
  emphasized?: boolean;
  align?: Align;
};

function RarityBadgeShell({ visual, compact, emphasized, align = 'start' }: ShellProps) {
  const alignStyle = align === 'center' ? styles.alignCenter : styles.alignStart;

  const textEl = (
    <Text
      style={[
        styles.text,
        compact && !emphasized ? styles.textCompact : null,
        emphasized ? (compact ? styles.textVaultCompact : styles.textVault) : null,
        { color: visual.textColor },
        emphasized ? styles.textShadowPremium : null,
      ]}
    >
      {visual.label}
    </Text>
  );

  if (visual.useGradientBorder && visual.gradientColors?.length) {
    return (
      <LinearGradient
        colors={[...visual.gradientColors]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.gradOuter,
          compact && styles.gradOuterCompact,
          emphasized && styles.gradOuterEmphasized,
          alignStyle,
        ]}
      >
        <View
          style={[
            styles.gradInner,
            { backgroundColor: visual.backgroundColor },
            compact && styles.gradInnerCompact,
            emphasized && styles.gradInnerEmphasized,
          ]}
        >
          {textEl}
        </View>
      </LinearGradient>
    );
  }

  return (
    <View
      style={[
        styles.plain,
        compact && styles.plainCompact,
        emphasized && styles.plainEmphasized,
        alignStyle,
        { borderColor: visual.borderColor, backgroundColor: visual.backgroundColor },
      ]}
    >
      {textEl}
    </View>
  );
}

type ItemProps = {
  item: ShopItemRow;
  compact?: boolean;
  /** Extra depth and legibility for showcase / vault surfaces (not shop browse density). */
  emphasized?: boolean;
  /** Use on centered cards so rarity lines up with wrapped meta chips. */
  align?: Align;
};

export function BorderRarityBadge({ item, compact, emphasized, align = 'start' }: ItemProps) {
  const visual = getRarityBadgeVisual(effectiveRarityKey(item));
  return (
    <RarityBadgeShell visual={visual} compact={compact} emphasized={emphasized} align={align} />
  );
}

/** Rarity pill from a catalog tier string (e.g. pulse_avatar_frames.rarity_tier). */
export function RarityTierBadge({
  tier,
  compact,
  emphasized,
  align = 'start',
}: {
  tier: string | null | undefined;
  compact?: boolean;
  emphasized?: boolean;
  align?: Align;
}) {
  const visual = getRarityBadgeVisual(tier);
  return (
    <RarityBadgeShell visual={visual} compact={compact} emphasized={emphasized} align={align} />
  );
}

const styles = StyleSheet.create({
  alignStart: { alignSelf: 'flex-start' },
  alignCenter: { alignSelf: 'center' },
  text: { fontSize: 10, fontWeight: '900', letterSpacing: 0.55 },
  textCompact: { fontSize: 9, letterSpacing: 0.45 },
  textVault: { fontSize: 11, letterSpacing: 0.65 },
  textVaultCompact: { fontSize: 10, letterSpacing: 0.55 },
  textShadowPremium: {
    textShadowColor: 'rgba(0,0,0,0.22)',
    textShadowOffset: { width: 0, height: 0.5 },
    textShadowRadius: 1.5,
  },
  plain: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  plainCompact: { paddingHorizontal: 7, paddingVertical: 2 },
  plainEmphasized: {
    borderWidth: 1,
    ...shadows.subtle,
  },
  gradOuter: {
    borderRadius: borderRadius.full,
    padding: 1,
  },
  gradOuterCompact: { padding: 0.75 },
  gradOuterEmphasized: {
    ...shadows.subtle,
  },
  gradInner: {
    borderRadius: borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  gradInnerCompact: { paddingHorizontal: 6, paddingVertical: 2 },
  gradInnerEmphasized: { paddingHorizontal: 12, paddingVertical: 4 },
});
