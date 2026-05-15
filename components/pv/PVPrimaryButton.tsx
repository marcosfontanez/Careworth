import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { pvKit, pvPrimaryCtaGlow } from '@/theme';

export type PVPrimaryButtonProps = {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
};

/** Primary CTA — fuller gradient stack + readable rim + stronger lift. */
export function PVPrimaryButton({
  title,
  onPress,
  disabled,
  loading,
  style,
  textStyle,
  testID,
}: PVPrimaryButtonProps) {
  const dim = Boolean(disabled || loading);
  return (
    <Pressable
      onPress={onPress}
      disabled={dim}
      accessibilityRole="button"
      testID={testID}
      style={({ pressed }) => [
        styles.touch,
        pvPrimaryCtaGlow(),
        dim && styles.dimmed,
        pressed && !dim && styles.pressed,
        style,
      ]}
    >
      <LinearGradient
        colors={[...pvKit.primaryCta.colors]}
        locations={[...pvKit.primaryCta.locations]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.gradient}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.18)', 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.85 }}
          style={styles.highlight}
          pointerEvents="none"
        />
        {loading ? (
          <ActivityIndicator color={pvKit.primaryCta.text} />
        ) : (
          <Text style={[styles.label, textStyle]} numberOfLines={1}>
            {title}
          </Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touch: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: pvKit.primaryCta.border,
  },
  gradient: {
    paddingVertical: 15,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    overflow: 'hidden',
  },
  highlight: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.85,
  },
  label: {
    color: pvKit.primaryCta.text,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  dimmed: { opacity: 0.5 },
  pressed: { opacity: 0.94 },
});
