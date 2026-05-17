import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/** Neon-glass floor glow + concentric rings under the reward gift (mockup parity). */
export function RewardGiftPedestal() {
  return (
    <View style={styles.wrap} pointerEvents="none">
      <LinearGradient
        pointerEvents="none"
        colors={['transparent', 'rgba(34,211,238,0.14)', 'rgba(139,92,246,0.07)', 'transparent']}
        start={{ x: 0.5, y: 0.2 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.floorBloom}
      />
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={[
            styles.ring,
            {
              width: 236 - i * 34,
              height: 236 - i * 34,
              borderRadius: 118 - i * 17,
              opacity: 0.38 - i * 0.1,
            },
          ]}
        />
      ))}
      <View style={styles.innerAccent} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 18,
  },
  floorBloom: {
    position: 'absolute',
    bottom: -12,
    width: '118%',
    height: 160,
    alignSelf: 'center',
    opacity: 0.85,
  },
  ring: {
    position: 'absolute',
    bottom: 36,
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.22)',
    backgroundColor: 'transparent',
    shadowColor: 'rgba(56,189,248,0.35)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
  },
  innerAccent: {
    position: 'absolute',
    bottom: 52,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(34,211,238,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.18)',
  },
});
