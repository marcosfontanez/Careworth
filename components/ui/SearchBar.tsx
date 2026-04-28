import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, spacing, iconSize, typography } from '@/theme';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  /**
   * Colour scheme. The dark variant is the default because the entire
   * app runs on a dark theme; the light variant is reserved for the
   * rare occasion we render SearchBar on a white surface (e.g. some
   * legacy sheets) so we always have a usable contrast.
   */
  variant?: 'light' | 'dark';
}

export function SearchBar({ value, onChangeText, placeholder = 'Search...', variant = 'dark' }: Props) {
  const isDark = variant === 'dark';
  const iconColor = isDark ? colors.dark.textMuted : colors.neutral.midGray;
  return (
    <View style={[styles.container, isDark ? styles.containerDark : styles.containerLight]}>
      <Ionicons name="search" size={iconSize.sm} color={iconColor} />
      <TextInput
        style={[styles.input, isDark ? styles.inputDark : styles.inputLight]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={iconColor}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md + spacing.xs,
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm + spacing.xs,
    borderWidth: 1,
  },
  containerDark: {
    backgroundColor: colors.dark.card,
    borderColor: colors.dark.border,
  },
  containerLight: {
    backgroundColor: colors.neutral.lightGray,
    borderColor: colors.overlay.light,
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
