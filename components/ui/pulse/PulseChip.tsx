import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { pulseRadius, pulseSpacing, pulseStatus, type PulseChipTone } from '@/lib/theme/pulseTheme';

type IonName = ComponentProps<typeof Ionicons>['name'];

type Props = {
  label: string;
  tone?: PulseChipTone;
  icon?: IonName;
  style?: StyleProp<ViewStyle>;
};

/** Premium capsule chip — live, success, warning, danger, muted, premium. */
export function PulseChip({ label, tone = 'muted', icon, style }: Props) {
  const palette = pulseStatus[tone];

  return (
    <View style={[styles.wrap, { backgroundColor: palette.bg, borderColor: palette.border }, style]}>
      {icon ? <Ionicons name={icon} size={12} color={palette.text} /> : null}
      <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: pulseSpacing.sm + 2,
    paddingVertical: 4,
    borderRadius: pulseRadius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  label: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
});
