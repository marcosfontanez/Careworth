import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, borderRadius, pulseverse, layout, semantic } from '@/theme';
import type { ShopItemRow } from '@/lib/shop/types';
import type { BorderCollectionSummary } from '@/services/shop/shopQueries';
import { ringPreviewColor } from '@/lib/shop/catalogUtils';
import { formatBorderSourceLabel } from '@/lib/shop/borderCatalogTaxonomy';
import {
  borderFlavorLine,
  resolveBorderPrimaryCta,
  lockReasonDisplay,
  shouldShowOwnedGiftAction,
  detailAvailabilityLabel,
  detailVisualTierLabel,
  detailUnlockMethodLabel,
  type BorderOwnership,
} from '@/lib/shop/borderDisplayModel';
import { BorderRarityBadge } from '@/components/shop/border/BorderRarityBadge';
import { BorderPreviewPlate } from '@/components/shop/border/BorderPreviewPlate';

export type BorderDetailModalProps = {
  visible: boolean;
  onClose: () => void;
  item: ShopItemRow | null;
  collection?: BorderCollectionSummary | null;
  ownership: BorderOwnership;
  isWeb: boolean;
  onBuy?: () => void;
  onGift?: () => void;
  onEquip?: (inventoryRowId: string) => void;
  /** Hides shop CTAs; use on My Borders and other inventory surfaces. */
  inventorySurface?: boolean;
  inventoryMeta?: {
    acquiredAtLabel: string;
    acquisitionSummary: string;
    giftedByDisplay?: string | null;
  };
  onViewCollection?: () => void;
  /** Shop surface: jump to full inventory for owned borders. */
  onOpenMyBorders?: () => void;
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

export function BorderDetailModal({
  visible,
  onClose,
  item,
  collection,
  ownership,
  isWeb,
  onBuy,
  onGift,
  onEquip,
  inventorySurface = false,
  inventoryMeta,
  onViewCollection,
  onOpenMyBorders,
}: BorderDetailModalProps) {
  const insets = useSafeAreaInsets();
  if (!item || item.type !== 'border') return null;

  const ring = ringPreviewColor(item);
  const flavor = borderFlavorLine(item, collection?.name ?? null);
  const cta = inventorySurface ? null : resolveBorderPrimaryCta(item, ownership, isWeb);
  const showGiftOwned =
    !inventorySurface && shouldShowOwnedGiftAction(item, ownership) && Platform.OS !== 'web';
  const motionHint =
    item.visual_tier === 'animated' ||
    item.visual_tier === 'reactive' ||
    item.is_animated === true;
  const sourceLabel = formatBorderSourceLabel(item.source_type) ?? '—';
  const rankLine =
    item.rank_place != null && item.rank_place > 0 ? `#${item.rank_place} place` : null;
  const lockedPreview = !inventorySurface && cta?.kind === 'locked';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <LinearGradient
            colors={['#0F172A', '#020617']}
            style={[styles.sheetInner, { paddingTop: insets.top > 12 ? 8 : 12 }]}
          >
            <View style={styles.header}>
              <View style={styles.headerTextCol}>
                <Text style={styles.headerTitle}>
                  {inventorySurface ? 'Vault piece' : 'Border details'}
                </Text>
                {inventorySurface ? (
                  <Text style={styles.headerSub}>Inspect, equip, and trace its lineage.</Text>
                ) : null}
              </View>
              <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
                <Ionicons name="close" size={26} color={colors.dark.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
              <View style={[styles.heroPreview, inventorySurface && styles.heroPreviewVault]}>
                {inventorySurface ? (
                  <View style={styles.vaultHeroHalo} pointerEvents="none" />
                ) : null}
                <BorderPreviewPlate
                  ringColor={ring}
                  size={112}
                  rankPlace={item.rank_place}
                  showMotionHint={motionHint}
                  locked={lockedPreview}
                  shopItem={item}
                />
              </View>

              <Text style={styles.title}>{item.name}</Text>
              {collection?.name ? (
                inventorySurface ? (
                  <>
                    <Text style={styles.collectionEyebrowVault}>Collection</Text>
                    <Text style={styles.collectionVault}>{collection.name}</Text>
                  </>
                ) : (
                  <Text style={styles.collection}>{collection.name}</Text>
                )
              ) : null}
              {item.season_code ? <Text style={styles.season}>{item.season_code}</Text> : null}

              <View style={styles.rarityRow}>
                <BorderRarityBadge item={item} emphasized={inventorySurface} />
              </View>

              {flavor ? <Text style={styles.flavor}>{flavor}</Text> : null}
              {item.description ? <Text style={styles.description}>{item.description}</Text> : null}

              <View style={[styles.metaBlock, inventorySurface && styles.metaBlockVault]}>
                <Row label="Rarity" value={String(item.rarity_tier ?? item.rarity ?? '—').toUpperCase()} />
                <Row label="Source" value={sourceLabel} />
                <Row label="Visual tier" value={detailVisualTierLabel(item) ?? '—'} />
                <Row label="Availability" value={detailAvailabilityLabel(item) ?? '—'} />
                <Row label="Unlock" value={detailUnlockMethodLabel(item) ?? '—'} />
                {rankLine ? <Row label="Rank" value={rankLine} /> : null}
                {inventoryMeta ? (
                  <>
                    <Row label="Acquired" value={inventoryMeta.acquiredAtLabel} />
                    <Row label="How you got it" value={inventoryMeta.acquisitionSummary} />
                    {inventoryMeta.giftedByDisplay ? (
                      <Row label="Gifted by" value={inventoryMeta.giftedByDisplay} />
                    ) : null}
                  </>
                ) : null}
              </View>

              {collection?.description ? (
                <View style={styles.collectionNotes}>
                  <Text style={styles.collectionNotesTitle}>Collection</Text>
                  <Text style={styles.collectionNotesBody}>{collection.description}</Text>
                </View>
              ) : null}

              <View style={styles.ctaBlock}>
                {inventorySurface ? (
                  <>
                    {ownership.equipped ? (
                      <LinearGradient
                        colors={['rgba(34,211,238,0.12)', 'rgba(99,102,241,0.06)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.ctaStatusVaultOuter}
                      >
                        <View style={styles.ctaStatusVaultInner}>
                          <Ionicons name="checkmark-circle" size={20} color="#67E8F9" style={{ marginRight: 10 }} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.ctaStatusVaultKicker}>Live now</Text>
                            <Text style={styles.ctaStatusVaultText}>Equipped on your pulse</Text>
                          </View>
                        </View>
                      </LinearGradient>
                    ) : ownership.inventoryRowId ? (
                      <TouchableOpacity
                        onPress={() => onEquip?.(ownership.inventoryRowId!)}
                        activeOpacity={0.88}
                        style={styles.ctaPrimaryVaultBtn}
                      >
                        <LinearGradient
                          colors={[pulseverse.electric, '#6366F1']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.ctaPrimaryVaultGrad}
                        >
                          <Ionicons name="sparkles" size={18} color="#020617" style={{ marginRight: 8 }} />
                          <Text style={styles.ctaPrimaryVaultText}>Wear this border</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    ) : null}
                    {onViewCollection && item.collection_id ? (
                      <TouchableOpacity style={styles.ctaSecondary} onPress={onViewCollection} activeOpacity={0.88}>
                        <Ionicons name="albums-outline" size={18} color={pulseverse.electric} style={{ marginRight: 8 }} />
                        <Text style={styles.ctaSecondaryText}>Open collection</Text>
                      </TouchableOpacity>
                    ) : null}
                  </>
                ) : (
                  <>
                {cta?.kind === 'equipped' ? (
                  <View style={styles.ctaStatus}>
                    <Ionicons name="checkmark-circle" size={18} color={pulseverse.electric} style={{ marginRight: 8 }} />
                    <Text style={styles.ctaStatusText}>Equipped on your avatar</Text>
                  </View>
                ) : null}

                {cta?.kind === 'owned_equip' ? (
                  <TouchableOpacity
                    style={styles.ctaPrimary}
                    onPress={() => onEquip?.(cta.inventoryRowId)}
                    activeOpacity={0.88}
                  >
                    <Text style={styles.ctaPrimaryText}>Equip</Text>
                  </TouchableOpacity>
                ) : null}

                {cta?.kind === 'free_claim' ? (
                  <TouchableOpacity style={styles.ctaPrimary} onPress={onBuy} activeOpacity={0.88}>
                    <Text style={styles.ctaPrimaryText}>Claim free</Text>
                  </TouchableOpacity>
                ) : null}

                {cta?.kind === 'iap_choose_recipient' && !isWeb ? (
                  <TouchableOpacity style={styles.ctaPrimary} onPress={onBuy} activeOpacity={0.88}>
                    <Text style={styles.ctaPrimaryText}>Purchase</Text>
                  </TouchableOpacity>
                ) : null}

                {cta?.kind === 'gift_only' && !isWeb ? (
                  <TouchableOpacity style={styles.ctaSecondary} onPress={onGift} activeOpacity={0.88}>
                    <Ionicons name="gift-outline" size={18} color={pulseverse.electric} style={{ marginRight: 8 }} />
                    <Text style={styles.ctaSecondaryText}>Gift</Text>
                  </TouchableOpacity>
                ) : null}

                {isWeb && item.is_shop_item && cta?.kind !== 'free_claim' ? (
                  <View style={styles.webNote}>
                    <Text style={styles.webNoteText}>
                      Border purchases complete in the iOS/Android app with your app store account.
                    </Text>
                  </View>
                ) : null}

                {cta?.kind === 'locked' ? (
                  <View style={styles.lockedBanner}>
                    <Ionicons name="lock-closed" size={18} color={colors.dark.textMuted} style={{ marginRight: 8 }} />
                    <Text style={styles.lockedBannerText}>{lockReasonDisplay(cta.reason)}</Text>
                  </View>
                ) : null}

                {showGiftOwned ? (
                  <TouchableOpacity style={styles.ctaSecondary} onPress={onGift} activeOpacity={0.88}>
                    <Ionicons name="gift-outline" size={18} color={pulseverse.electric} style={{ marginRight: 8 }} />
                    <Text style={styles.ctaSecondaryText}>Gift to someone</Text>
                  </TouchableOpacity>
                ) : null}
                {!inventorySurface && ownership.owned && onOpenMyBorders ? (
                  <TouchableOpacity style={styles.inventoryLink} onPress={onOpenMyBorders} activeOpacity={0.88}>
                    <Ionicons name="albums-outline" size={18} color={colors.dark.textMuted} style={{ marginRight: 8 }} />
                    <Text style={styles.inventoryLinkText}>View in My Borders</Text>
                  </TouchableOpacity>
                ) : null}
                  </>
                )}
              </View>
            </ScrollView>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: semantic.modalScrim,
  },
  sheet: {
    maxHeight: '92%',
    borderTopLeftRadius: borderRadius.sheet,
    borderTopRightRadius: borderRadius.sheet,
    overflow: 'hidden',
  },
  sheetInner: { paddingHorizontal: layout.screenPadding },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerTextCol: { flex: 1, paddingRight: 12 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.dark.text, letterSpacing: -0.3 },
  headerSub: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: colors.dark.textMuted,
    lineHeight: 17,
  },
  scrollBody: { paddingBottom: 28 },
  heroPreview: { alignItems: 'center', marginVertical: 14 },
  heroPreviewVault: { marginTop: 8, marginBottom: 18, position: 'relative' },
  vaultHeroHalo: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: borderRadius.full,
    backgroundColor: pulseverse.heroBloom,
    top: '50%',
    left: '50%',
    marginLeft: -100,
    marginTop: -100,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.dark.text,
    textAlign: 'center',
    letterSpacing: -0.4,
    marginTop: 4,
  },
  collection: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark.textMuted,
    textAlign: 'center',
  },
  collectionEyebrowVault: {
    marginTop: 10,
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(212,167,90,0.88)',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  collectionVault: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(203,213,225,0.92)',
    textAlign: 'center',
    letterSpacing: 0.15,
    lineHeight: 20,
  },
  season: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(148,163,184,0.9)',
    textAlign: 'center',
  },
  rarityRow: { alignItems: 'center', marginTop: 14 },
  flavor: {
    marginTop: 14,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: 'rgba(226,232,240,0.88)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  description: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 19,
    color: colors.dark.textMuted,
    textAlign: 'center',
  },
  metaBlock: {
    marginTop: 22,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.dark.borderInner,
    backgroundColor: 'rgba(15,23,42,0.5)',
    paddingVertical: 6,
  },
  metaBlockVault: {
    borderColor: pulseverse.cardRimAccent,
    backgroundColor: 'rgba(8,15,32,0.72)',
  },
  metaRow: {
    paddingHorizontal: layout.screenPadding - 2,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dark.borderSubtle,
  },
  metaLabel: { fontSize: 11, fontWeight: '700', color: colors.dark.textMuted, marginBottom: 4, letterSpacing: 0.35 },
  metaValue: { fontSize: 15, fontWeight: '600', color: colors.dark.text, lineHeight: 20 },
  collectionNotes: {
    marginTop: 18,
    padding: layout.screenPadding,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(99,102,241,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.18)',
  },
  collectionNotesTitle: { fontSize: 12, fontWeight: '800', color: '#A5B4FC', marginBottom: 8 },
  collectionNotesBody: { fontSize: 13, lineHeight: 19, color: colors.dark.textMuted },
  ctaBlock: { marginTop: 22, gap: 12 },
  ctaStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.35)',
    backgroundColor: 'rgba(34,211,238,0.08)',
  },
  ctaStatusText: { fontSize: 14, fontWeight: '800', color: '#67E8F9' },
  ctaPrimary: {
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: borderRadius.lg,
    backgroundColor: pulseverse.electric,
  },
  ctaPrimaryText: { fontSize: 15, fontWeight: '900', color: pulseverse.onElectric },
  ctaPrimaryVaultBtn: { borderRadius: borderRadius.lg, overflow: 'hidden' },
  ctaPrimaryVaultGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 18,
  },
  ctaPrimaryVaultText: { fontSize: 16, fontWeight: '900', color: '#020617', letterSpacing: 0.2 },
  ctaStatusVaultOuter: {
    borderRadius: borderRadius.lg,
    padding: 2,
    overflow: 'hidden',
  },
  ctaStatusVaultInner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg - 2,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(15,23,42,0.65)',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.35)',
  },
  ctaStatusVaultKicker: {
    fontSize: 10,
    fontWeight: '900',
    color: '#67E8F9',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  ctaStatusVaultText: { fontSize: 15, fontWeight: '800', color: colors.dark.text },
  ctaSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.35)',
  },
  ctaSecondaryText: { fontSize: 15, fontWeight: '800', color: pulseverse.electric },
  webNote: {
    padding: 12,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(51,65,85,0.5)',
    borderWidth: 1,
    borderColor: colors.dark.borderSubtle,
  },
  webNoteText: { fontSize: 13, color: colors.dark.textMuted, textAlign: 'center', lineHeight: 18 },
  lockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(30,41,59,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
  },
  lockedBannerText: { fontSize: 14, fontWeight: '800', color: colors.dark.textMuted },
  inventoryLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  inventoryLinkText: { fontSize: 14, fontWeight: '700', color: colors.dark.textMuted },
});
