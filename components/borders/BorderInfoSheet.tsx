import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { borderRadius, colors, semantic } from '@/theme';
import { AvatarDisplay, pulseFrameFromUser } from '@/components/profile/AvatarBuilder';
import type { PulseAvatarFrame } from '@/types';
import { BorderCategoryBadge } from '@/components/borders/BorderCategoryBadge';
import { BORDER_CATEGORY_TAGLINE } from '@/lib/borders/cta';
import { borderCatalogLabels } from '@/lib/shop/borderCatalogTaxonomy';
import type { BorderCategory } from '@/lib/borders/category';

export type BorderInfoSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** The equipped border data — derived from the viewed user's `pulseAvatarFrame`. */
  frame: PulseAvatarFrame | null;
  /** Display name shown above ("Wearing Gold Renewal Ring"). */
  ownerDisplayName?: string | null;
  /** Owner's avatar URL — used as the photo inside the live ring preview. */
  ownerAvatarUrl?: string | null;
  /** Resolved category badge — supplied by callers that have full ShopItemRow context. */
  category?: BorderCategory | null;
};

/**
 * Bottom-sheet modal triggered by long-pressing any avatar in the app.
 * Shows the equipped border framed around the owner's avatar plus a
 * single CTA: "Open Pulse Shop" — keeps social discovery → commerce loop tight.
 */
export function BorderInfoSheet({
  visible,
  onClose,
  frame,
  ownerDisplayName,
  ownerAvatarUrl,
  category,
}: BorderInfoSheetProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  if (!frame) return null;

  const tagline = category ? BORDER_CATEGORY_TAGLINE[category] : null;
  const rarityLabel = frame.rarityTier ? borderCatalogLabels.rarityTier[frame.rarityTier] : null;

  const goShop = () => {
    onClose();
    router.push({ pathname: '/pulse-shop', params: { tab: 'borders' } } as never);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: insets.bottom + 18 }]}
          onPress={(e) => e.stopPropagation()}
        >
          <LinearGradient
            colors={['rgba(34,211,238,0.14)', 'rgba(15,23,42,0.0)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <Text style={styles.kicker}>Border in view</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={colors.dark.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.previewWrap}>
            <AvatarDisplay
              size={108}
              avatarUrl={ownerAvatarUrl ?? undefined}
              prioritizeRemoteAvatar
              ringColor={colors.primary.teal}
              pulseFrame={pulseFrameFromUser(frame)}
            />
          </View>

          <Text style={styles.title} numberOfLines={2}>
            {frame.label}
          </Text>
          {ownerDisplayName ? (
            <Text style={styles.owner} numberOfLines={1}>
              Wearing on {ownerDisplayName}
            </Text>
          ) : null}

          <View style={styles.badgeRow}>
            {category ? <BorderCategoryBadge category={category} /> : null}
            {rarityLabel ? (
              <View style={styles.rarityPill}>
                <Ionicons name="diamond-outline" size={11} color="#A5F3FC" style={{ marginRight: 4 }} />
                <Text style={styles.rarityPillText}>{rarityLabel}</Text>
              </View>
            ) : null}
          </View>

          {frame.subtitle ? <Text style={styles.subtitle}>{frame.subtitle}</Text> : null}
          {!frame.subtitle && tagline ? <Text style={styles.subtitle}>{tagline}</Text> : null}
          {frame.acquisitionTag ? (
            <View style={styles.acquisitionRow}>
              <Ionicons name="ribbon-outline" size={13} color={semantic.accentCyan} />
              <Text style={styles.acquisitionText}>{frame.acquisitionTag}</Text>
            </View>
          ) : null}

          <TouchableOpacity style={styles.primary} onPress={goShop} activeOpacity={0.9}>
            <Ionicons name="storefront-outline" size={16} color="#021627" />
            <Text style={styles.primaryText}>Open Pulse Shop</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(2,6,23,0.7)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#070F1C',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingTop: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderColor: 'rgba(34,211,238,0.28)',
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(148,163,184,0.4)',
    marginBottom: 10,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kicker: {
    fontSize: 10,
    fontWeight: '900',
    color: '#67E8F9',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  previewWrap: { alignItems: 'center', marginTop: 16 },
  title: {
    marginTop: 14,
    fontSize: 22,
    fontWeight: '900',
    color: colors.dark.text,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  owner: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
    color: colors.dark.textMuted,
    textAlign: 'center',
  },
  badgeRow: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  rarityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.4)',
    backgroundColor: 'rgba(34,211,238,0.10)',
  },
  rarityPillText: { fontSize: 11, fontWeight: '900', color: '#A5F3FC', letterSpacing: 0.4 },
  subtitle: {
    marginTop: 12,
    fontSize: 13.5,
    lineHeight: 19,
    color: 'rgba(203,213,225,0.92)',
    textAlign: 'center',
    paddingHorizontal: 6,
  },
  acquisitionRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  acquisitionText: { fontSize: 12.5, fontWeight: '700', color: '#A5F3FC', letterSpacing: 0.2 },
  primary: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    backgroundColor: '#22D3EE',
  },
  primaryText: { fontSize: 15, fontWeight: '900', color: '#021627', letterSpacing: 0.2 },
});
