import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, layout, typography, iconSize, typeRoles, borderRadius } from '@/theme';

type LayoutMode = 'balanced' | 'split';

export type PageHeaderProps = {
  insetTop: number;
  onBack?: () => void;
  title: string;
  subtitle?: string;
  /**
   * `balanced` — back | centered title stack | trailing spacer (My Pulse–style).
   * `split` — back + trailing on one row; title/subtitle full-width below (shop–style).
   */
  layout?: LayoutMode;
  /** Right slot on the top row (e.g. Sparks pill). `split` only. */
  trailing?: React.ReactNode;
  /** Fixed width on the right for optical balance when `layout="balanced"` and no trailing. */
  balancedEndWidth?: number;
  backAccessibilityLabel?: string;
};

/**
 * Canonical page chrome: back affordance, title hierarchy, optional commerce trailing slot.
 * Keeps shop / vault / settings headers visually aligned without per-screen drift.
 */
export function PageHeader({
  insetTop,
  onBack,
  title,
  subtitle,
  layout: layoutMode = 'split',
  trailing,
  balancedEndWidth = 40,
  backAccessibilityLabel = 'Back',
}: PageHeaderProps) {
  const showBack = !!onBack;

  if (layoutMode === 'balanced') {
    return (
      <View style={[styles.topBar, { paddingTop: insetTop + 6 }]}>
        {showBack ? (
          <TouchableOpacity style={styles.backBtn} onPress={onBack} hitSlop={12} accessibilityRole="button">
            <Ionicons name="chevron-back" size={iconSize.md} color={colors.dark.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtn} />
        )}
        <View style={styles.titleBlock}>
          <Text style={styles.screenTitle}>{title}</Text>
          {subtitle ? <Text style={styles.screenSub}>{subtitle}</Text> : null}
        </View>
        <View style={{ width: balancedEndWidth }} />
      </View>
    );
  }

  return (
    <View style={{ paddingTop: insetTop + 8 }}>
      <View style={styles.splitTopRow}>
        {showBack ? (
          <TouchableOpacity
            onPress={onBack}
            hitSlop={12}
            style={styles.backBtnPadded}
            accessibilityRole="button"
            accessibilityLabel={backAccessibilityLabel}
          >
            <Ionicons name="chevron-back" size={26} color={colors.dark.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtnPadded} />
        )}
        {trailing ? <View style={styles.trailingWrap}>{trailing}</View> : <View style={{ minWidth: 44 }} />}
      </View>
      <Text style={styles.shopTitle}>{title}</Text>
      {subtitle ? <Text style={styles.shopSub}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layout.screenPadding,
    paddingBottom: 8,
  },
  backBtn: { width: 40 },
  titleBlock: { flex: 1, alignItems: 'center' },
  screenTitle: {
    ...typeRoles.pageTitle,
    fontSize: 22,
    color: colors.dark.text,
  },
  screenSub: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
    color: colors.dark.textMuted,
    textAlign: 'center',
    lineHeight: 17,
  },
  splitTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  backBtnPadded: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: colors.dark.borderSubtle,
  },
  trailingWrap: { alignItems: 'flex-end' },
  shopTitle: {
    ...typography.h1,
    fontSize: 27,
    fontWeight: '900',
    letterSpacing: -0.5,
    color: colors.dark.text,
  },
  shopSub: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
    color: colors.dark.textSecondary,
    marginBottom: 4,
    lineHeight: 21,
    letterSpacing: -0.05,
  },
});
