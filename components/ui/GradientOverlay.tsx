import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

interface Props {
  position?: 'top' | 'bottom' | 'full';
  intensity?: 'light' | 'medium' | 'heavy';
}

export function GradientOverlay({ position = 'bottom', intensity = 'medium' }: Props) {
  const opacityMap = { light: 0.22, medium: 0.48, heavy: 0.68 };
  const opacity = opacityMap[intensity];

  const colorSets = {
    top: [`rgba(0,0,0,${opacity})`, 'transparent'],
    bottom: ['transparent', `rgba(0,0,0,${opacity})`],
    full: [`rgba(0,0,0,${opacity * 0.5})`, `rgba(0,0,0,${opacity})`],
  };

  const positionStyle = {
    top: styles.top,
    bottom: styles.bottom,
    full: styles.full,
  };

  return (
    <LinearGradient
      colors={colorSets[position] as [string, string]}
      style={[styles.base, positionStyle[position], { pointerEvents: 'none' }]}
    />
  );
}

const styles = StyleSheet.create({
  base: { position: 'absolute', left: 0, right: 0, zIndex: 1 },
  top: { top: 0, height: 120 },
  bottom: { bottom: 0, height: 200 },
  full: { top: 0, bottom: 0 },
});
