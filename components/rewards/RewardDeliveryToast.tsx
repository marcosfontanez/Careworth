import React, { useEffect, useRef } from 'react';
import { Pressable, Text, StyleSheet, View, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, pulseverse, shadows, spacing } from '@/theme';

type Props = {
  visible: boolean;
  title: string;
  subtitle?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  onOpen: () => void;
  onDismiss: () => void;
};

/**
 * Pulse-branded reward toast — sits below the global toast strip so both can coexist if needed.
 */
export function RewardDeliveryToast({
  visible,
  title,
  subtitle,
  accessibilityLabel,
  accessibilityHint,
  onOpen,
  onDismiss,
}: Props) {
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(28)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(opacity, {
        toValue: visible ? 1 : 0,
        friction: 8,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: visible ? 0 : 24,
        friction: 9,
        tension: 90,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, opacity, translateY]);

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[
        styles.wrap,
        {
          bottom: Math.max(insets.bottom, spacing.md) + 52,
          opacity,
          transform: [{ translateY }],
        },
        shadows.lifted,
      ]}
    >
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? (title ? `${title}. Open reward` : 'Open reward')}
        accessibilityHint={accessibilityHint}
      >
        <LinearGradient
          colors={['rgba(12,18,32,0.96)', 'rgba(18,26,44,0.98)']}
          style={styles.card}
        >
          <View style={styles.iconOrb}>
            <Ionicons name="gift" size={22} color="#FDE68A" />
          </View>
          <View style={styles.copy}>
            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={styles.sub} numberOfLines={2}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.5)" />
        </LinearGradient>
      </Pressable>
      <Pressable hitSlop={10} style={styles.dismiss} onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Dismiss reward toast">
        <Ionicons name="close" size={18} color="rgba(255,255,255,0.55)" />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 60,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.22)',
  },
  iconOrb: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(34,211,238,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  copy: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: '900', color: colors.dark.text },
  sub: { fontSize: 13, fontWeight: '600', color: colors.dark.textSecondary },
  dismiss: {
    position: 'absolute',
    top: -8,
    right: -8,
    padding: 8,
    backgroundColor: 'rgba(8,14,28,0.92)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
});
