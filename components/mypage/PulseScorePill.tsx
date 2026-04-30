import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '@/theme';

/**
 * Gradient ring + breathing glow + tier chip — the same Pulse Score
 * “identity” treatment as {@link PulseStatsRow}. Presentational only;
 * callers own data fetching and any history sheet.
 */
export function PulseScorePill({
  value,
  tierLabel,
  tierAccent,
  tierGlow,
  onPress,
  /** Merges with root — e.g. `PulseStatsRow` passes its flex cell style. */
  style,
  accessibilityLabel = 'View Pulse Score history',
}: {
  value: string;
  tierLabel: string;
  tierAccent: string;
  tierGlow: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const glow = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0.55,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [glow]);

  return (
    <Pressable
      style={[styles.root, style]}
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <View style={styles.scoreWrap}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.scoreHalo,
            {
              backgroundColor: tierGlow,
              opacity: glow.interpolate({
                inputRange: [0.55, 1],
                outputRange: [0.35, 0.75],
              }),
              transform: [
                {
                  scale: glow.interpolate({
                    inputRange: [0.55, 1],
                    outputRange: [1, 1.12],
                  }),
                },
              ],
            },
          ]}
        />
        <LinearGradient
          colors={[tierAccent, '#22D3EE', '#A855F7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.scoreRing}
        >
          <View style={styles.scoreInner}>
            <Text style={styles.scoreValue} numberOfLines={1}>
              {value}
            </Text>
          </View>
        </LinearGradient>
      </View>

      <View
        style={[
          styles.tierChipOuter,
          { backgroundColor: `${tierAccent}1E`, borderColor: `${tierAccent}66` },
        ]}
      >
        <Text style={[styles.tierChipText, { color: tierAccent }]} numberOfLines={1}>
          {tierLabel.toUpperCase()}
        </Text>
        <Ionicons name="chevron-forward" size={9} color={tierAccent} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  scoreWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreHalo: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 999,
  },
  scoreRing: {
    borderRadius: 999,
    padding: 1.5,
  },
  scoreInner: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(5,11,20,0.94)',
    minWidth: 62,
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 19,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: -0.3,
    textShadowColor: 'rgba(20,184,166,0.55)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    fontVariant: ['tabular-nums'],
  },
  tierChipOuter: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  tierChipText: {
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
});
