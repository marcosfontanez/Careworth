import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { spacing, pvKit } from '@/theme';

export type PVSectionHeaderProps = {
  title: string;
  kicker?: string;
  subtitle?: string;
  /** Optional icon / badge before the text stack (e.g. Creator Hub gradient tile). */
  leading?: React.ReactNode;
  rightSlot?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** Screen section title stack — uppercase kicker, bold title, muted subtitle. */
export function PVSectionHeader({
  title,
  kicker,
  subtitle,
  leading,
  rightSlot,
  style,
  testID,
}: PVSectionHeaderProps) {
  return (
    <View style={[styles.row, style]} testID={testID}>
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={styles.textCol}>
        {kicker ? <Text style={pvKit.sectionHeader.kicker}>{kicker}</Text> : null}
        <Text style={[pvKit.sectionHeader.title, !kicker && styles.titleNoKicker]}>{title}</Text>
        {subtitle ? <Text style={pvKit.sectionHeader.subtitle}>{subtitle}</Text> : null}
      </View>
      {rightSlot ? <View style={styles.right}>{rightSlot}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    /** Tighter title–subtitle rhythm when a kicker is present. */
    marginBottom: spacing.lg,
  },
  leading: { marginTop: spacing.xs },
  textCol: { flex: 1, minWidth: 0 },
  right: { alignSelf: 'center' },
  titleNoKicker: { marginTop: 0 },
});
