import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows, pulseverse, layout } from '@/theme';
import type { ShopItemRow } from '@/lib/shop/types';
import { ringPreviewColor } from '@/lib/shop/catalogUtils';
import {
  resolveBorderPrimaryCta,
  lockReasonDisplay,
  shouldShowOwnedGiftAction,
  type BorderOwnership,
} from '@/lib/shop/borderDisplayModel';
import { BorderRarityBadge } from '@/components/shop/border/BorderRarityBadge';
import { CompactMetaChipPills } from '@/components/shop/border/BorderCompactMetaRow';
import { BorderPreviewPlate } from '@/components/shop/border/BorderPreviewPlate';
import { buildCompactMetaChips } from '@/lib/shop/borderDisplayModel';

export type BorderCardVariant = 'shop' | 'inventory' | 'gift';

export type BorderCardProps = {
  item: ShopItemRow;
  collectionName?: string | null;
  variant?: BorderCardVariant;
  /** Horizontal browse tile width */
  width?: number;
  isWeb: boolean;
  ownership: BorderOwnership;
  onOpenDetail?: () => void;
  onBuy?: () => void;
  onGift?: () => void;
  onEquip?: (inventoryRowId: string) => void;
  /** When true, outer wrapper is View only (e.g. nested in another pressable) */
  disableOuterPress?: boolean;
};

export function BorderCard({
  item,
  collectionName,
  variant = 'shop',
  width,
  isWeb,
  ownership,
  onOpenDetail,
  onBuy,
  onGift,
  onEquip,
  disableOuterPress,
}: BorderCardProps) {
  if (item.type !== 'border') return null;

  const ring = ringPreviewColor(item);
  const cta = resolveBorderPrimaryCta(item, ownership, isWeb);
  const showGiftSecondary =
    shouldShowOwnedGiftAction(item, ownership) && Platform.OS !== 'web' && variant !== 'gift';
  const locked = cta.kind === 'locked';
  const motionHint =
    item.visual_tier === 'animated' ||
    item.visual_tier === 'reactive' ||
    item.is_animated === true;

  const metaChips = buildCompactMetaChips(item, 3);
  const subtitleParts = [collectionName?.trim() || '', item.season_code?.trim() || ''].filter(Boolean);
  const subtitleLine = subtitleParts.join(' · ');

  const body = (
    <>
      <BorderPreviewPlate
        ringColor={ring}
        size={68}
        rankPlace={item.rank_place}
        showMotionHint={motionHint}
        locked={locked}
        shopItem={item}
      />
      <Text style={styles.name} numberOfLines={1}>
        {item.name}
      </Text>
      {subtitleLine ? (
        <Text style={styles.collection} numberOfLines={2}>
          {subtitleLine}
        </Text>
      ) : null}

      <View style={styles.descriptorStrip}>
        <BorderRarityBadge item={item} compact align="center" />
        <CompactMetaChipPills chips={metaChips} compact />
      </View>

      <View style={styles.actions}>
        {cta.kind === 'equipped' ? (
          <View style={styles.statusPillEquipped}>
            <Ionicons name="checkmark-circle" size={13} color={pulseverse.electricSoft} style={{ marginRight: 4 }} />
            <Text style={styles.statusPillText}>Equipped</Text>
          </View>
        ) : null}

        {cta.kind === 'owned_equip' ? (
          <>
            <View style={styles.statusPillOwned}>
              <Text style={styles.statusPillOwnedText}>Owned</Text>
            </View>
            <TouchableOpacity
              style={styles.primaryChip}
              onPress={() => onEquip?.(cta.inventoryRowId)}
              activeOpacity={0.88}
            >
              <Text style={styles.primaryChipText}>Equip</Text>
            </TouchableOpacity>
          </>
        ) : null}

        {cta.kind === 'free_claim' ? (
          <TouchableOpacity style={styles.primaryChip} onPress={onBuy} activeOpacity={0.88}>
            <Text style={styles.primaryChipText}>Claim free</Text>
          </TouchableOpacity>
        ) : null}

        {cta.kind === 'iap_choose_recipient' && !isWeb ? (
          <TouchableOpacity style={styles.primaryChip} onPress={onBuy} activeOpacity={0.88}>
            <Text style={styles.primaryChipText}>Purchase</Text>
          </TouchableOpacity>
        ) : null}

        {cta.kind === 'iap_choose_recipient' && isWeb ? (
          <View style={styles.statusPillMuted}>
            <Text style={styles.statusPillMutedText}>App store</Text>
          </View>
        ) : null}

        {cta.kind === 'gift_only' && !isWeb ? (
          <TouchableOpacity style={styles.secondaryChip} onPress={onGift} activeOpacity={0.88}>
            <Text style={styles.secondaryChipText}>Gift</Text>
          </TouchableOpacity>
        ) : null}

        {cta.kind === 'locked' ? (
          <View style={styles.lockedRow}>
            <Ionicons name="lock-closed" size={13} color={colors.dark.textMuted} style={{ marginRight: 6 }} />
            <Text style={styles.lockedText}>{lockReasonDisplay(cta.reason)}</Text>
          </View>
        ) : null}

        {showGiftSecondary ? (
          <TouchableOpacity style={styles.secondaryChip} onPress={onGift} activeOpacity={0.88}>
            <Ionicons name="gift-outline" size={14} color={pulseverse.electric} style={{ marginRight: 4 }} />
            <Text style={styles.secondaryChipText}>Gift</Text>
          </TouchableOpacity>
        ) : null}

        {variant === 'gift' && item.is_giftable ? (
          <View style={styles.giftableHint}>
            <Text style={styles.giftableHintText}>Giftable</Text>
          </View>
        ) : null}
      </View>
    </>
  );

  const inner = (
    <View style={[styles.card, width ? { width } : null, ownership.equipped && styles.cardEquipped]}>
      {body}
    </View>
  );

  if (disableOuterPress || !onOpenDetail) {
    return inner;
  }

  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onOpenDetail} accessibilityRole="button">
      {inner}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: pulseverse.surfaceShelf,
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: pulseverse.cardRim,
    padding: layout.screenPadding * 0.75,
    alignItems: 'center',
    ...shadows.premiumCard,
  },
  cardEquipped: {
    borderColor: pulseverse.rimEquipped,
    ...shadows.accentEdge,
  },
  name: {
    marginTop: 11,
    fontSize: 13,
    fontWeight: '800',
    color: colors.dark.text,
    letterSpacing: -0.15,
    textAlign: 'center',
    maxWidth: '100%',
  },
  collection: {
    marginTop: 5,
    fontSize: 11,
    fontWeight: '600',
    color: colors.dark.textMuted,
    letterSpacing: 0.05,
    textAlign: 'center',
    maxWidth: '100%',
  },
  descriptorStrip: {
    marginTop: 8,
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    rowGap: 5,
  },
  actions: {
    marginTop: 12,
    width: '100%',
    gap: 6,
    alignItems: 'stretch',
  },
  statusPillEquipped: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: borderRadius.chip,
    backgroundColor: 'rgba(34,211,238,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.35)',
  },
  statusPillText: { fontSize: 11, fontWeight: '800', color: pulseverse.electricSoft },
  statusPillOwned: {
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: borderRadius.chip,
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.35)',
  },
  statusPillOwnedText: { fontSize: 11, fontWeight: '800', color: '#86EFAC' },
  statusPillMuted: {
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: borderRadius.chip,
    backgroundColor: 'rgba(51,65,85,0.5)',
    borderWidth: 1,
    borderColor: colors.dark.borderSubtle,
  },
  statusPillMutedText: { fontSize: 11, fontWeight: '700', color: colors.dark.textMuted },
  primaryChip: {
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: borderRadius.chip,
    backgroundColor: 'rgba(37,99,235,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.45)',
  },
  primaryChipText: { fontSize: 12, fontWeight: '800', color: '#E0F2FE' },
  secondaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: borderRadius.chip,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.42)',
  },
  secondaryChipText: { fontSize: 12, fontWeight: '800', color: pulseverse.electric },
  lockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: borderRadius.chip,
    backgroundColor: 'rgba(30,41,59,0.65)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
  },
  lockedText: { fontSize: 11, fontWeight: '700', color: colors.dark.textMuted, textAlign: 'center' },
  giftableHint: {
    alignItems: 'center',
    marginTop: 2,
  },
  giftableHintText: { fontSize: 10, fontWeight: '800', color: '#A5B4FC', letterSpacing: 0.3 },
});
