import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, layout, shadows, pulseverse } from '@/theme';
import type { OwnedBorderEntry } from '@/lib/borders/ownedTypes';
import { ringPreviewColor } from '@/lib/shop/catalogUtils';
import { BorderRarityBadge } from '@/components/shop/border/BorderRarityBadge';
import { BorderPreviewPlate } from '@/components/shop/border/BorderPreviewPlate';
import { compactSourceLabel } from '@/lib/shop/borderDisplayModel';

const SCREEN_W = Dimensions.get('window').width;
const GAP = 12;
const PAD = layout.screenPadding;
export const BORDER_INVENTORY_TILE_W = (SCREEN_W - PAD * 2 - GAP) / 2;

type Props = {
  entry: OwnedBorderEntry;
  equipped: boolean;
  onPress: () => void;
  onEquipPress?: () => void;
};

export function BorderInventoryTile({ entry, equipped, onPress, onEquipPress }: Props) {
  const { item, collectionName, inventory } = entry;
  const ring = ringPreviewColor(item);
  const motion =
    item.visual_tier === 'animated' ||
    item.visual_tier === 'reactive' ||
    item.is_animated === true;
  const src = compactSourceLabel(item.source_type);
  const isGifted = inventory.acquisition_source === 'gifted';
  const legacyOrRetired = item.availability_status === 'legacy' || item.is_retired;

  return (
    <TouchableOpacity
      style={[styles.card, { width: BORDER_INVENTORY_TILE_W }, equipped && styles.cardEquipped]}
      onPress={onPress}
      activeOpacity={0.92}
      accessibilityRole="button"
    >
      {equipped ? (
        <LinearGradient
          colors={['rgba(34,211,238,0.55)', 'rgba(56,189,248,0.35)', 'rgba(99,102,241,0.25)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.equippedBar}
        >
          <Ionicons name="checkmark-circle" size={12} color="#020617" style={{ marginRight: 5 }} />
          <Text style={styles.equippedBarText}>Equipped</Text>
        </LinearGradient>
      ) : null}
      <View style={[styles.previewBlock, equipped ? styles.previewBlockWithBar : styles.previewBlockNoBar]}>
        <BorderPreviewPlate
          ringColor={ring}
          size={68}
          rankPlace={item.rank_place}
          showMotionHint={motion}
          shopItem={item}
        />
      </View>
      <Text style={styles.name} numberOfLines={2}>
        {item.name}
      </Text>
      {collectionName ? (
        <Text style={styles.collectionEyebrow}>Collection</Text>
      ) : null}
      {collectionName ? (
        <Text style={styles.collection} numberOfLines={2}>
          {collectionName}
        </Text>
      ) : null}
      <View style={styles.badgeRow}>
        <BorderRarityBadge item={item} compact emphasized />
      </View>
      <View style={styles.tagRow}>
        {src ? (
          <View style={styles.miniTag}>
            <Text style={styles.miniTagText}>{src}</Text>
          </View>
        ) : null}
        {isGifted ? (
          <View style={[styles.miniTag, styles.giftTag]}>
            <Text style={styles.giftTagText}>Gifted</Text>
          </View>
        ) : null}
        {legacyOrRetired ? (
          <View style={[styles.miniTag, styles.legacyTag]}>
            <Text style={styles.legacyTagText}>{item.is_retired ? 'Retired' : 'Legacy'}</Text>
          </View>
        ) : null}
      </View>
      {!equipped && onEquipPress ? (
        <TouchableOpacity onPress={onEquipPress} activeOpacity={0.88} accessibilityLabel="Equip this border">
          <LinearGradient
            colors={['rgba(14,165,233,0.75)', 'rgba(34,211,238,0.55)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.equipMini}
          >
            <Text style={styles.equipMiniText}>Equip</Text>
          </LinearGradient>
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: pulseverse.surfaceDeep,
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: pulseverse.cardRim,
    paddingHorizontal: layout.cardPadding,
    paddingTop: layout.cardPadding,
    paddingBottom: layout.cardPadding + 2,
    marginBottom: GAP,
    position: 'relative',
    overflow: 'hidden',
    ...shadows.premiumCard,
  },
  cardEquipped: {
    borderColor: pulseverse.rimEquipped,
    backgroundColor: 'rgba(10,20,40,0.98)',
    ...shadows.accentEdge,
  },
  equippedBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    zIndex: 4,
  },
  equippedBarText: { fontSize: 10, fontWeight: '900', color: '#020617', letterSpacing: 0.8 },
  previewBlock: { alignItems: 'center' },
  previewBlockWithBar: { marginTop: 22 },
  previewBlockNoBar: { marginTop: 4 },
  name: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '900',
    color: colors.dark.text,
    textAlign: 'center',
    letterSpacing: -0.2,
    lineHeight: 18,
    minHeight: 36,
  },
  collectionEyebrow: {
    marginTop: 10,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.6,
    color: 'rgba(212,167,90,0.75)',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  collection: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(203,213,225,0.88)',
    textAlign: 'center',
    lineHeight: 15,
  },
  badgeRow: { marginTop: 10, alignItems: 'center' },
  tagRow: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 5,
  },
  miniTag: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.3)',
    backgroundColor: 'rgba(15,23,42,0.72)',
  },
  miniTagText: { fontSize: 9, fontWeight: '800', color: 'rgba(241,245,249,0.9)' },
  giftTag: { borderColor: 'rgba(167,139,250,0.45)' },
  giftTagText: { fontSize: 9, fontWeight: '800', color: '#DDD6FE' },
  legacyTag: { borderColor: 'rgba(251,113,133,0.4)' },
  legacyTagText: { fontSize: 9, fontWeight: '800', color: '#FECDD3' },
  equipMini: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  equipMiniText: { fontSize: 12, fontWeight: '900', color: '#020617', letterSpacing: 0.4 },
});
