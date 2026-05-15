import React from 'react';
import { StyleSheet, View, type ColorValue, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, pulseverse, pvKit } from '@/theme';

export type PVPageBackgroundProps = {
  children: React.ReactNode;
  /** Optional solid/gradient base behind texture (default: PulseVerse screen gradient) */
  baseColors?: readonly string[];
  style?: StyleProp<ViewStyle>;
};

/** Full-screen foundation: brand navy base + subtle top cyan wash + bottom depth. */
export function PVPageBackground({
  children,
  baseColors = pulseverse.screenGradient,
  style,
}: PVPageBackgroundProps) {
  return (
    <LinearGradient
      colors={[...baseColors] as [ColorValue, ColorValue, ...ColorValue[]]}
      style={[styles.fill, style]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
    >
      <LinearGradient
        colors={[pvKit.page.textureTop, pvKit.page.textureMid, pvKit.page.textureBottom]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        pointerEvents="none"
      />
      <View style={styles.content}>{children}</View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.dark.bg },
  content: { flex: 1 },
});
