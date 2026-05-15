import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows, pulseverse, layout } from '@/theme';
import type { ShopItemRow } from '@/lib/shop/types';
import { ringPreviewColor } from '@/lib/shop/catalogUtils';
import {
  resolveBorderPrimaryCta,
  lockReasonDisplay,
  borderShopCardPurchaseLabel,
  borderWebStoreStatusLabel,
  type BorderOwnership,
} from '@/lib/shop/borderDisplayModel';
import { BorderRarityBadge } from '@/components/shop/border/BorderRarityBadge';
import { CompactMetaChipPills } from '@/components/shop/border/BorderCompactMetaRow';
import { BorderPreviewPlate } from '@/components/shop/border/BorderPreviewPlate';
import { buildCompactMetaChips } from '@/lib/shop/borderDisplayModel';
import { BorderCategoryBadge } from '@/components/borders/BorderCategoryBadge';
import { CampaignWindowCountdown } from '@/components/borders/CampaignWindowCountdown';
import { deriveBorderCategory } from '@/lib/borders/category';
import { readCampaignWindow } from '@/lib/borders/campaignWindow';

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
  /** When true, outer wrapper is View only (e.g. nested in another pressable) */
  disableOuterPress?: boolean;
};

/**
 * Shop grid tile: glass surface + one bottom CTA (price / claim / gift / owned).
 * Equip, buy-again, and gift flows live in {@link BorderDetailModal}.
 */
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
  disableOuterPress,
}: BorderCardProps) {
  if (item.type !== 'border') return null;

  const ring = ringPreviewColor(item);
  const cta = resolveBorderPrimaryCta(item, ownership, isWeb);
  const locked = cta.kind === 'locked';
  const motionHint =
    item.visual_tier === 'animated' ||
    item.visual_tier === 'reactive' ||
    item.is_animated === true;

  const metaChips = buildCompactMetaChips(item, 3);
  const subtitleParts = [collectionName?.trim() || '', item.season_code?.trim() || ''].filter(Boolean);
  const subtitleLine = subtitleParts.join(' · ');

  const purchaseLabel = borderShopCardPurchaseLabel(item, cta, isWeb);
  const category = deriveBorderCategory(item, null);
  const campaign = readCampaignWindow(item);
  const showCountdown = !!(campaign.releaseAt || campaign.expiresAt);

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
        <BorderCategoryBadge category={category} compact />
        {showCountdown ? <CampaignWindowCountdown item={item} variant="chip" /> : null}
        <CompactMetaChipPills chips={metaChips} compact />
      </View>

      <View style={styles.actions}>
        {cta.kind === 'owned_retail' ? (
          <View style={styles.ownedListPill}>
            <Ionicons name="checkmark-done" size={14} color="#FDE68A" style={{ marginRight: 6 }} />
            <Text style={styles.ownedListPillText} numberOfLines={1}>
              {cta.equipped ? 'Owned · Equipped' : 'Owned'}
            </Text>
          </View>
        ) : null}

        {cta.kind === 'free_claim' ? (
          <TouchableOpacity style={styles.primaryChip} onPress={onBuy} activeOpacity={0.88}>
            <Text style={styles.primaryChipText}>Claim free</Text>
          </TouchableOpacity>
        ) : null}

        {cta.kind === 'iap_choose_recipient' && !isWeb ? (
          <TouchableOpacity style={styles.primaryChip} onPress={onBuy} activeOpacity={0.88}>
            <Text style={styles.primaryChipText} numberOfLines={1}>
              {purchaseLabel ?? 'Buy in app'}
            </Text>
          </TouchableOpacity>
        ) : null}

        {cta.kind === 'iap_choose_recipient' && isWeb ? (
          <View style={styles.statusPillMuted}>
            <Text style={styles.statusPillMutedText} numberOfLines={1}>
              {borderWebStoreStatusLabel(item)}
            </Text>
          </View>
        ) : null}

        {cta.kind === 'gift_only' && !isWeb ? (
          <TouchableOpacity style={styles.primaryChip} onPress={onGift} activeOpacity={0.88}>
            <Text style={styles.primaryChipText} numberOfLines={1}>
              {purchaseLabel ?? 'Send as gift'}
            </Text>
          </TouchableOpacity>
        ) : null}

        {cta.kind === 'locked' && cta.reason === 'web_store' ? (
          <View style={styles.statusPillMuted}>
            <Text style={styles.statusPillMutedText} numberOfLines={1}>
              {borderWebStoreStatusLabel(item)}
            </Text>
          </View>
        ) : null}

        {cta.kind === 'locked' && cta.reason !== 'web_store' ? (
          <View style={styles.lockedRow}>
            <Ionicons name="lock-closed" size={13} color={colors.dark.textMuted} style={{ marginRight: 6 }} />
            <Text style={styles.lockedText}>{lockReasonDisplay(cta.reason)}</Text>
          </View>
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
    <View style={[styles.cardShell, width ? { width } : null, ownership.equipped && styles.cardEquipped]}>
      {Platform.OS === 'web' ? (
        <View style={[StyleSheet.absoluteFill, styles.cardGlassWeb]} pointerEvents="none" />
      ) : (
        <BlurView intensity={44} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />
      )}
      <LinearGradient
        colors={['rgba(15,23,42,0.42)', 'rgba(2,6,23,0.78)', 'rgba(15,23,42,0.52)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, styles.cardGlassVeil]}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['rgba(56,189,248,0.11)', 'rgba(0,0,0,0)', 'rgba(129,140,248,0.09)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, styles.cardGlassSheen]}
        pointerEvents="none"
      />
      <View style={styles.cardContent}>{body}</View>
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
  cardShell: {
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.26)',
    overflow: 'hidden',
    position: 'relative',
    ...shadows.premiumCard,
  },
  cardEquipped: {
    borderColor: pulseverse.rimEquipped,
    ...shadows.accentEdge,
  },
  cardGlassWeb: {
    backgroundColor: 'rgba(15,23,42,0.78)',
  },
  cardGlassVeil: {},
  cardGlassSheen: {},
  cardContent: {
    padding: layout.screenPadding * 0.75,
    alignItems: 'center',
    position: 'relative',
    zIndex: 1,
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
  ownedListPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: borderRadius.chip,
    backgroundColor: 'rgba(212,166,58,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(212,166,58,0.38)',
  },
  ownedListPillText: { fontSize: 12, fontWeight: '900', color: '#FDE68A', letterSpacing: 0.15 },
  statusPillMuted: {
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: borderRadius.chip,
    backgroundColor: 'rgba(51,65,85,0.45)',
    borderWidth: 1,
    borderColor: colors.dark.borderSubtle,
  },
  statusPillMutedText: { fontSize: 12, fontWeight: '700', color: colors.dark.textMuted },
  primaryChip: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: borderRadius.chip,
    backgroundColor: 'rgba(37,99,235,0.38)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.5)',
  },
  primaryChipText: { fontSize: 12, fontWeight: '800', color: '#E0F2FE', textAlign: 'center' },
  lockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: borderRadius.chip,
    backgroundColor: 'rgba(30,41,59,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.28)',
  },
  lockedText: { fontSize: 11, fontWeight: '700', color: colors.dark.textMuted, textAlign: 'center' },
  giftableHint: {
    alignItems: 'center',
    marginTop: 2,
  },
  giftableHintText: { fontSize: 10, fontWeight: '800', color: '#A5B4FC', letterSpacing: 0.3 },
});
