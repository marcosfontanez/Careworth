import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { colors, typography, spacing } from '@/theme';
import { PulseLoader } from './LottieLoader';

interface Props {
  message?: string;
}

export function LoadingState({ message }: Props) {
  return (
    <View style={styles.container}>
      <PulseLoader size="medium" />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    backgroundColor: colors.dark.bg,
  },
  message: {
    ...typography.bodySmall,
    color: colors.dark.textMuted,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
});
