import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { borderRadius, colors, semantic, shadows } from '@/theme';
import { AvatarDisplay, pulseFrameFromUser } from '@/components/profile/AvatarBuilder';
import type { PulseAvatarFrame } from '@/types';
import { borderCatalogLabels } from '@/lib/shop/borderCatalogTaxonomy';
import { BORDER_CTA } from '@/lib/borders/cta';

export type EquippedBorderPanelProps = {
  /** Currently equipped catalog frame; null = classic teal default. */
  frame: PulseAvatarFrame | null;
  /** Owner avatar URL for the live preview. */
  avatarUrl?: string | null;
  /** Number of borders the owner has unlocked overall. */
  ownedCount?: number;
  /** Optional explicit handler for the "Browse vault" action. Defaults to scrolling. */
  onBrowseVault?: () => void;
};

/**
 * Premium summary panel that lives at the TOP of the Customize → Borders area.
 * Mirrors the "Live on your pulse" hero from the vault but is laid out as a
 * compact identity card with a single clear next-step CTA.
 */
export function EquippedBorderPanel({
  frame,
  avatarUrl,
  ownedCount,
  onBrowseVault,
}: EquippedBorderPanelProps) {
  const router = useRouter();
  const hasFrame = !!frame;
  const rarity = hasFrame && frame?.rarityTier ? borderCatalogLabels.rarityTier[frame.rarityTier] : null;

  return (
    <LinearGradient
      colors={['rgba(22,78,99,0.4)', 'rgba(15,23,42,0.95)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.shell}
    >
      <View style={styles.glow} pointerEvents="none" />
      <View style={styles.kickerRow}>
        <Ionicons name="sparkles" size={12} color={semantic.accentCyan} />
        <Text style={styles.kicker}>Equipped border</Text>
      </View>

      <View style={styles.row}>
        <View style={styles.previewWrap}>
          <AvatarDisplay
            size={84}
            avatarUrl={avatarUrl ?? undefined}
            prioritizeRemoteAvatar
            ringColor={colors.primary.teal}
            pulseFrame={hasFrame ? pulseFrameFromUser(frame) : null}
          />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title} numberOfLines={2}>
            {hasFrame ? frame.label : 'Classic teal ring'}
          </Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            {hasFrame
              ? frame.subtitle ?? 'Your equipped border shows everywhere your avatar appears.'
              : 'Default look — pick any unlocked border below to make your avatar pop.'}
          </Text>
          <View style={styles.metaRow}>
            {rarity ? (
              <View style={styles.rarityChip}>
                <Ionicons name="diamond-outline" size={11} color="#A5F3FC" style={{ marginRight: 4 }} />
                <Text style={styles.rarityChipText}>{rarity}</Text>
              </View>
            ) : null}
            {typeof ownedCount === 'number' ? (
              <View style={styles.countChip}>
                <Ionicons name="albums-outline" size={11} color="#FDE68A" style={{ marginRight: 4 }} />
                <Text style={styles.countChipText}>
                  {ownedCount.toLocaleString()} unlocked
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      <View style={styles.ctaRow}>
        {onBrowseVault ? (
          <TouchableOpacity
            style={styles.primaryCta}
            onPress={onBrowseVault}
            activeOpacity={0.88}
          >
            <Ionicons name="swap-horizontal" size={15} color="#021627" style={{ marginRight: 6 }} />
            <Text style={styles.primaryCtaText}>{BORDER_CTA.changeBorder}</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={styles.secondaryCta}
          onPress={() => router.push({ pathname: '/pulse-shop', params: { tab: 'borders' } } as never)}
          activeOpacity={0.88}
        >
          <Ionicons name="storefront-outline" size={14} color="#A5F3FC" style={{ marginRight: 6 }} />
          <Text style={styles.secondaryCtaText}>{BORDER_CTA.viewShop}</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.32)',
    padding: 16,
    overflow: 'hidden',
    ...shadows.premiumCard,
  },
  glow: {
    position: 'absolute',
    top: -64,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(34,211,238,0.12)',
    alignSelf: 'center',
  },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kicker: {
    fontSize: 10,
    fontWeight: '900',
    color: '#67E8F9',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  row: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 16 },
  previewWrap: { paddingVertical: 4 },
  copy: { flex: 1, minWidth: 0 },
  title: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.dark.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12.5,
    lineHeight: 17,
    color: colors.dark.textMuted,
  },
  metaRow: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  rarityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.4)',
    backgroundColor: 'rgba(34,211,238,0.10)',
  },
  rarityChipText: { fontSize: 10.5, fontWeight: '900', color: '#A5F3FC', letterSpacing: 0.4 },
  countChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(212,166,58,0.4)',
    backgroundColor: 'rgba(212,166,58,0.10)',
  },
  countChipText: { fontSize: 10.5, fontWeight: '900', color: '#FDE68A', letterSpacing: 0.4 },
  ctaRow: { marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: borderRadius.lg,
    backgroundColor: '#22D3EE',
  },
  primaryCtaText: { fontSize: 13, fontWeight: '900', color: '#021627', letterSpacing: 0.2 },
  secondaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.4)',
    backgroundColor: 'rgba(34,211,238,0.08)',
  },
  secondaryCtaText: { fontSize: 13, fontWeight: '900', color: '#A5F3FC', letterSpacing: 0.2 },
});
