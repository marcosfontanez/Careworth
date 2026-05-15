import React from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  Platform,
  Text,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { pulseverse, pvKit, spacing, pvCardRimBloom } from '@/theme';
import { colors } from '@/theme/colors';

export type PVSearchBarProps = {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
  onClear?: () => void;
  /** Trailing control (e.g. filter) — renders before clear. */
  endSlot?: React.ReactNode;
} & Omit<TextInputProps, 'style' | 'value' | 'onChangeText' | 'placeholder'>;

const S = pvKit.search;

/** Premium pill search — layered fill, bright rim, optional trailing slot. */
export function PVSearchBar({
  value,
  onChangeText,
  placeholder = 'Search',
  style,
  onClear,
  endSlot,
  ...rest
}: PVSearchBarProps) {
  const lift =
    Platform.OS === 'ios'
      ? {
          shadowColor: '#020617',
          shadowOpacity: 0.42,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
        }
      : { elevation: 6 };

  return (
    <View style={[styles.shadowWrap, lift, pvCardRimBloom(), style]}>
      <View style={styles.clip}>
        <LinearGradient
          colors={[S.fillInner, S.fill]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['rgba(34,211,238,0.12)', 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.65 }}
          style={styles.topGloss}
          pointerEvents="none"
        />
        <View style={styles.innerHairline} pointerEvents="none" />
        <View style={styles.row}>
          <Ionicons name="search" size={21} color={pulseverse.electricSoft} style={styles.icon} />
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={S.placeholder}
            selectionColor={pulseverse.electric}
            style={styles.input}
            {...rest}
          />
          {endSlot}
          {onClear && value.length > 0 ? (
            <Pressable onPress={onClear} hitSlop={10} accessibilityLabel="Clear search" style={styles.clearHit}>
              <Ionicons name="close-circle" size={22} color={colors.dark.textMuted} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

/** Tappable shell matching {@link PVSearchBar} — navigates to global search (e.g. My Pulse entry point). */
export function PVSearchBarTrigger({
  onPress,
  placeholder = 'Search',
  style,
  accessibilityLabel,
}: {
  onPress: () => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const lift =
    Platform.OS === 'ios'
      ? {
          shadowColor: '#020617',
          shadowOpacity: 0.42,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
        }
      : { elevation: 6 };

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? placeholder}
      style={[styles.shadowWrap, lift, pvCardRimBloom(), style]}
    >
      <View style={styles.clip}>
        <LinearGradient
          colors={[S.fillInner, S.fill]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['rgba(34,211,238,0.12)', 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.65 }}
          style={styles.topGloss}
          pointerEvents="none"
        />
        <View style={styles.innerHairline} pointerEvents="none" />
        <View style={styles.row}>
          <Ionicons name="search" size={21} color={pulseverse.electricSoft} style={styles.icon} />
          <Text style={styles.triggerPlaceholder} numberOfLines={1}>
            {placeholder}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shadowWrap: {
    borderRadius: S.radius,
  },
  clip: {
    borderRadius: S.radius,
    borderWidth: 1.5,
    borderColor: S.border,
    minHeight: S.minHeight,
    overflow: 'hidden',
    backgroundColor: colors.dark.card,
  },
  topGloss: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '58%',
  },
  innerHairline: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: S.radius,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    margin: 1,
    opacity: 0.95,
    pointerEvents: 'none',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.lg,
    paddingRight: spacing.md,
    minHeight: S.minHeight,
    zIndex: 1,
  },
  icon: { marginRight: spacing.md },
  input: {
    flex: 1,
    color: colors.dark.text,
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 14,
    paddingRight: spacing.sm,
    letterSpacing: -0.15,
  },
  clearHit: { marginLeft: spacing.xs, padding: 4 },
  triggerPlaceholder: {
    flex: 1,
    color: S.placeholder,
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 14,
    paddingRight: spacing.sm,
    letterSpacing: -0.15,
  },
});
