import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, typography } from '@/theme';

type Props = {
  onPress: () => void;
  disabled?: boolean;
  comboFlash?: number | null;
  /** Distance from bottom of player shell — clears bottom interaction bar. */
  bottomOffset?: number;
};

/** Floating Pulse reaction trigger — sits above the viewer bottom bar. */
export function PulseTapButton({ onPress, disabled, comboFlash, bottomOffset = 82 }: Props) {
  const comboOpacity = useRef(new Animated.Value(0)).current;
  const comboY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    if (!comboFlash || comboFlash < 2) return;
    comboOpacity.setValue(0);
    comboY.setValue(8);
    Animated.parallel([
      Animated.timing(comboOpacity, { toValue: 1, duration: 120, useNativeDriver: true }),
      Animated.timing(comboY, { toValue: -6, duration: 420, useNativeDriver: true }),
    ]).start(() => {
      Animated.timing(comboOpacity, { toValue: 0, duration: 380, useNativeDriver: true }).start();
    });
  }, [comboFlash, comboOpacity, comboY]);

  return (
    <View style={[styles.outer, { bottom: bottomOffset }]} pointerEvents="box-none">
      {comboFlash && comboFlash >= 2 ? (
        <Animated.View
          style={[styles.comboBadge, { opacity: comboOpacity, transform: [{ translateY: comboY }] }]}
          pointerEvents="none"
        >
          <Text style={styles.comboTxt}>+{comboFlash}</Text>
        </Animated.View>
      ) : null}
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [styles.btn, disabled && styles.disabled, pressed && !disabled && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Send Pulse reaction"
      >
        <LinearGradient
          colors={['rgba(34,211,238,0.32)', 'rgba(167,139,250,0.24)', 'rgba(236,72,153,0.16)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.ring}
        />
        <View style={styles.core}>
          <Ionicons name="pulse" size={20} color={colors.primary.teal} />
          <Text style={styles.label}>Pulse</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    right: 0,
    zIndex: 24,
    alignItems: 'center',
  },
  comboBadge: {
    position: 'absolute',
    top: -22,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(12,18,32,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.35)',
  },
  comboTxt: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '900',
    color: '#A5F3FC',
  },
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.88, transform: [{ scale: 0.94 }] },
  ring: {
    position: 'absolute',
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  core: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(12,18,32,0.84)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.3)',
    gap: 1,
  },
  label: {
    ...typography.caption,
    fontSize: 8,
    fontWeight: '800',
    color: '#A5F3FC',
    letterSpacing: 0.35,
  },
});
