import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { pulseColors, pulseSpacing, pulseTypography } from '@/lib/theme/pulseTheme';

type IonName = ComponentProps<typeof Ionicons>['name'];

type Props = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: IonName;
  style?: StyleProp<ViewStyle>;
};

/** Section header with optional action link. */
export function PulseSectionHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
  icon,
  style,
}: Props) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.copy}>
        {icon ? <Ionicons name={icon} size={16} color={pulseColors.teal} style={styles.icon} /> : null}
        <View style={styles.textBlock}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="button" hitSlop={8}>
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: pulseSpacing.md,
    paddingVertical: pulseSpacing.sm,
  },
  copy: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: pulseSpacing.sm },
  icon: { marginTop: 2 },
  textBlock: { flex: 1, gap: 2 },
  title: { ...pulseTypography.sectionTitle },
  subtitle: { ...pulseTypography.caption, lineHeight: 17 },
  action: { ...pulseTypography.caption, fontWeight: '800', color: pulseColors.teal },
});
