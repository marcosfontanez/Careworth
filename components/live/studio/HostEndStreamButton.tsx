import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, typography } from '@/theme';

type Props = {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
};

/** Centered red End Stream control — separate from the icon dock. */
export function HostEndStreamButton({ onPress, disabled, loading }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        (disabled || loading) && styles.btnDisabled,
        pressed && !disabled && !loading && styles.btnPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel="End stream"
    >
      {loading ? (
        <ActivityIndicator color="#FFF" size="small" />
      ) : (
        <>
          <Ionicons name="stop-circle" size={18} color="#FFF" />
          <Text style={styles.label}>End Stream</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(185,28,28,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(252,165,165,0.4)',
    marginBottom: 10,
    minWidth: 160,
  },
  btnDisabled: { opacity: 0.55 },
  btnPressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  label: {
    ...typography.button,
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.2,
  },
});
