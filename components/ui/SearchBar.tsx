import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, spacing, iconSize, typography } from '@/theme';
import { AccentComposerFrame } from '@/components/ui/AccentComposerFrame';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  accessibilityLabel?: string;
  /**
   * Colour scheme. The dark variant is the default because the entire
   * app runs on a dark theme; the light variant is reserved for the
   * rare occasion we render SearchBar on a white surface (e.g. some
   * legacy sheets) so we always have a usable contrast.
   */
  variant?: 'light' | 'dark';
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search...',
  variant = 'dark',
  accessibilityLabel,
}: Props) {
  const isDark = variant === 'dark';
  const iconColor = isDark ? colors.dark.textMuted : colors.neutral.midGray;
  const accent = colors.primary.teal;
  return (
    <AccentComposerFrame
      accentColor={accent}
      compact
      noShadow
      innerStyle={{
        paddingVertical: 4,
        paddingHorizontal: 4,
        gap: 0,
      }}
      style={[
        styles.frameOuter,
        isDark
          ? undefined
          : { backgroundColor: colors.neutral.lightGray, borderColor: colors.overlay.light },
      ]}
    >
      <View style={styles.container}>
        <Ionicons name="search" size={iconSize.sm} color={iconColor} />
        <TextInput
          style={[styles.input, isDark ? styles.inputDark : styles.inputLight]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={iconColor}
          accessibilityLabel={accessibilityLabel}
        />
      </View>
    </AccentComposerFrame>
  );
}

const styles = StyleSheet.create({
  frameOuter: {
    borderRadius: borderRadius.xl,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm + spacing.xs,
  },
  input: {
    ...typography.body,
    flex: 1,
    padding: 0,
  },
  inputDark: {
    color: colors.dark.text,
  },
  inputLight: {
    color: colors.neutral.darkText,
  },
});
