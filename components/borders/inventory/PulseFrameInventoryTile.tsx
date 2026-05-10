import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, layout, shadows, pulseverse } from '@/theme';
import type { EarnedPulseAvatarFrame } from '@/services/supabase/pulseAvatarFrames';
import { AvatarDisplay, pulseFrameFromUser } from '@/components/profile/AvatarBuilder';
import { BORDER_INVENTORY_TILE_W } from '@/components/borders/inventory/BorderInventoryTile';
import { RarityTierBadge } from '@/components/shop/border/BorderRarityBadge';

const GAP = 12;

type Props = {
  earned: EarnedPulseAvatarFrame;
  equipped: boolean;
  avatarUrl: string;
  onPress: () => void;
  onEquipPress?: () => void;
};

export function PulseFrameInventoryTile({ earned, equipped, avatarUrl, onPress, onEquipPress }: Props) {
  const { frame, leaderboardRank } = earned;
  const rankHint =
    leaderboardRank > 0 ? `Leaderboard · Top ${leaderboardRank}` : 'Pulse prize border';
  const storyLine = frame.acquisitionTag?.trim() || rankHint;

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
        <AvatarDisplay
          size={68}
          avatarUrl={avatarUrl}
          prioritizeRemoteAvatar
          ringColor={colors.primary.teal}
          pulseFrame={pulseFrameFromUser(frame)}
        />
      </View>
      <Text style={styles.name} numberOfLines={2}>
        {frame.label}
      </Text>
      {frame.subtitle ? (
        <Text style={styles.subtitle} numberOfLines={2}>
          {frame.subtitle}
        </Text>
      ) : null}
      <View style={styles.badgeRow}>
        <RarityTierBadge tier={frame.rarityTier} compact emphasized align="center" />
      </View>
      <View style={styles.tagCol}>
        <View style={styles.miniTag}>
          <Text style={styles.miniTagText}>{storyLine}</Text>
        </View>
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
  subtitle: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(203,213,225,0.88)',
    textAlign: 'center',
    lineHeight: 15,
  },
  badgeRow: { marginTop: 10, alignItems: 'center', width: '100%' },
  tagCol: {
    marginTop: 8,
    width: '100%',
    alignItems: 'center',
    gap: 5,
  },
  miniTag: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.3)',
    backgroundColor: 'rgba(15,23,42,0.72)',
    alignSelf: 'stretch',
  },
  miniTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(241,245,249,0.9)',
    textAlign: 'center',
  },
  equipMini: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  equipMiniText: { fontSize: 12, fontWeight: '900', color: '#020617', letterSpacing: 0.4 },
});
