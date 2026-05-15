import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { borderRadius as br, shadows, spacing } from '@/theme';
import { CreatorHubGlassBackdrop } from '@/components/pv/CreatorHubGlassBackdrop';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: number;
  cornerRadius?: number;
  blurIntensity?: number;
  /**
   * Use for content that draws outside the card (e.g. Pulse Score tooltip above the row).
   * Glass layers stay inset; children may extend past the rounded rect.
   */
  overflowVisible?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
};

/**
 * Frosted glass section shell for My Pulse — matches Creator Hub / Shop glass
 * (blur, depth tint, cyan wash, top shine).
 */
export function MyPulseGlassPanel({
  children,
  style,
  padding = spacing.md,
  cornerRadius = br['2xl'],
  blurIntensity = 34,
  overflowVisible = false,
  contentStyle,
}: Props) {
  const r = cornerRadius;
  return (
    <View
      style={[
        styles.wrap,
        { borderRadius: r },
        overflowVisible ? styles.wrapOverflowVisible : styles.wrapClip,
        style,
      ]}
    >
      <CreatorHubGlassBackdrop borderRadius={r} blurIntensity={blurIntensity} />
      <View style={[styles.foreground, { padding }, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.22)',
    ...shadows.subtle,
  },
  wrapClip: {
    overflow: 'hidden',
  },
  wrapOverflowVisible: {
    overflow: 'visible',
  },
  foreground: {
    position: 'relative',
    zIndex: 1,
  },
});
