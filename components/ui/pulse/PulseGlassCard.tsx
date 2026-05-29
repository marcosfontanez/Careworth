import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { pulseColors, pulseGradients, pulseRadius, pulseShadows, pulseSpacing } from '@/lib/theme/pulseTheme';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  /** Stronger cyan rim for featured hierarchy. */
  featured?: boolean;
};

/** Glass card preset — blur-like layered fill with restrained cyan rim. */
export function PulseGlassCard({ children, style, padded = true, featured = false }: Props) {
  return (
    <View
      style={[
        styles.wrap,
        featured && styles.featured,
        pulseShadows.card,
        style,
      ]}
    >
      <LinearGradient colors={[...pulseGradients.secondaryVeil]} style={styles.fill}>
        <LinearGradient colors={[...pulseGradients.glassTop]} style={styles.topVeil} pointerEvents="none" />
        <View style={padded ? styles.padded : undefined}>{children}</View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: pulseRadius.card,
    borderWidth: 1,
    borderColor: pulseColors.borderStrong,
    overflow: 'hidden',
    backgroundColor: pulseColors.glass,
  },
  featured: {
    borderColor: pulseColors.borderAccent,
    ...pulseShadows.glowTeal,
  },
  fill: { overflow: 'hidden' },
  topVeil: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 48,
  },
  padded: { padding: pulseSpacing.lg },
});
