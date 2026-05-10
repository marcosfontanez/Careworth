import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { ShopItemRow } from '@/lib/shop/types';
import { BorderRarityBadge } from '@/components/shop/border/BorderRarityBadge';
import { BorderCompactMetaRow } from '@/components/shop/border/BorderCompactMetaRow';
import { borderRadius } from '@/theme';

type Props = {
  item: ShopItemRow;
  /** Tighter padding for featured hero */
  compact?: boolean;
};

/**
 * Admin / dense catalog preview — rarity + compact meta + contextual extras (rank, season).
 */
export function BorderCatalogMetaChips({ item, compact }: Props) {
  if (item.type !== 'border') return null;

  const extras: { key: string; label: string }[] = [];
  if (item.rank_place != null && item.rank_place > 0) {
    extras.push({ key: 'rk', label: `#${item.rank_place}` });
  }
  if (item.season_code) {
    extras.push({ key: 'season', label: item.season_code });
  }
  if (item.is_earned_only) {
    extras.push({ key: 'earned', label: 'Earned only' });
  }

  return (
    <View style={[styles.block, compact && styles.blockCompact]}>
      <View style={styles.rarityRow}>
        <BorderRarityBadge item={item} compact={compact} />
      </View>
      <BorderCompactMetaRow item={item} compact={compact} />
      {extras.length > 0 ? (
        <View style={[styles.row, compact && styles.rowCompact]}>
          {extras.map((c) => (
            <View key={c.key} style={styles.chipExtra}>
              <Text style={styles.chipExtraText}>{c.label}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginTop: 10, marginBottom: 6 },
  blockCompact: { marginTop: 8, marginBottom: 4 },
  rarityRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  rowCompact: { marginTop: 6, gap: 6 },
  chipExtra: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.32)',
    backgroundColor: 'rgba(15,23,42,0.5)',
  },
  chipExtraText: { fontSize: 10, fontWeight: '700', color: 'rgba(226,232,240,0.88)' },
});
