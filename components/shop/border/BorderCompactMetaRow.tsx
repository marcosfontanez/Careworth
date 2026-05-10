import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { buildCompactMetaChips, type CompactMetaChip } from '@/lib/shop/borderDisplayModel';
import type { ShopItemRow } from '@/lib/shop/types';
import { borderRadius, statusHierarchy } from '@/theme';

type Props = {
  item: ShopItemRow;
  compact?: boolean;
};

const VARIANT: Record<
  'source' | 'motion' | 'availability',
  { border: string; bg: string; color: string }
> = {
  source: {
    border: 'rgba(148,163,184,0.4)',
    bg: 'rgba(51,65,85,0.45)',
    color: 'rgba(226,232,240,0.92)',
  },
  motion: {
    border: 'rgba(250,204,21,0.35)',
    bg: 'rgba(250,204,21,0.12)',
    color: '#FDE68A',
  },
  availability: {
    border: 'rgba(251,113,133,0.4)',
    bg: 'rgba(251,113,133,0.12)',
    color: '#FECDD3',
  },
};

export function CompactMetaChipPills({ chips, compact }: { chips: CompactMetaChip[]; compact?: boolean }) {
  if (chips.length === 0) return null;
  return (
    <>
      {chips.map((c) => {
        const v = VARIANT[c.variant];
        return (
          <View key={c.key} style={[styles.chip, compact && styles.chipCompact, { borderColor: v.border, backgroundColor: v.bg }]}>
            <Text style={[styles.chipText, compact && styles.chipTextCompact, { color: v.color }]} numberOfLines={1}>
              {c.label}
            </Text>
          </View>
        );
      })}
    </>
  );
}

export function BorderCompactMetaRow({ item, compact }: Props) {
  const chips = buildCompactMetaChips(
    item,
    compact ? statusHierarchy.maxSecondaryChipsOnCompactCard : undefined,
  );
  if (chips.length === 0) return null;

  return (
    <View style={[styles.row, compact && styles.rowCompact]}>
      <CompactMetaChipPills chips={chips} compact={compact} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 6 },
  rowCompact: { marginTop: 4, gap: 4 },
  chip: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    maxWidth: '100%',
  },
  chipCompact: { paddingHorizontal: 6, paddingVertical: 2 },
  chipText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.28 },
  chipTextCompact: { fontSize: 8, letterSpacing: 0.2 },
});
