import React from 'react';
import { View, Text, StyleSheet, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { PROFILE_NEON_BORDER_PRESETS } from '@/components/mypage/ProfileNeonPills';
import { borderRadius } from '@/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface Props {
  icon: IoniconName;
  label: string;
  iconColor?: string;
  /** Outer ring — e.g. `{ flex: 1, minWidth: 0 }` for equal-width rows */
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  iconSize?: number;
  /** Create hub card uses tighter padding */
  density?: 'default' | 'compact';
  /** Index into {@link PROFILE_NEON_BORDER_PRESETS} — default matches shop featured ring */
  presetIndex?: number;
}

export function ShopHighlightNeonChip({
  icon,
  label,
  iconColor = '#67E8F9',
  style,
  labelStyle,
  iconSize = 13,
  density = 'default',
  presetIndex = 2,
}: Props) {
  const pair = PROFILE_NEON_BORDER_PRESETS[presetIndex] ?? PROFILE_NEON_BORDER_PRESETS[2];
  const compact = density === 'compact';

  return (
    <LinearGradient
      colors={[pair[0], pair[1]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.ring, compact ? styles.ringCompact : null, style]}
    >
      <View style={[styles.inner, compact ? styles.innerCompact : null]}>
        <Ionicons name={icon} size={iconSize} color={iconColor} />
        <Text
          style={[compact ? styles.textCompact : styles.textFeatured, labelStyle]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  ring: {
    borderRadius: borderRadius.chip,
    padding: 1.35,
  },
  ringCompact: {
    borderRadius: borderRadius.sm + 1.5,
    padding: 1,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minWidth: 0,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: borderRadius.chip - 1,
    backgroundColor: 'rgba(4, 12, 28, 0.9)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  innerCompact: {
    flex: 1,
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: borderRadius.sm,
  },
  textFeatured: {
    fontSize: 10,
    fontWeight: '800',
    color: '#A5F3FC',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
    flexShrink: 1,
  },
  textCompact: {
    flex: 1,
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.92)',
    letterSpacing: 0.15,
    minWidth: 0,
  },
});
