import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { borderRadius, colors, semantic, shadows } from '@/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { useOwnedBorderEntries } from '@/hooks/useOwnedBorderEntries';
import { useEquipBorderMutation, useShopInventoryState } from '@/hooks/useShopEconomy';
import { useBorderCollectionsMap } from '@/hooks/useBorderCollectionsMap';
import { BorderInventoryTile } from '@/components/borders/inventory/BorderInventoryTile';
import { PulseFrameInventoryTile } from '@/components/borders/inventory/PulseFrameInventoryTile';
import { BorderDetailModal } from '@/components/shop/border/BorderDetailModal';
import { AvatarDisplay, pulseFrameFromUser } from '@/components/profile/AvatarBuilder';
import { RarityTierBadge } from '@/components/shop/border/BorderRarityBadge';
import { acquisitionSummaryLine, formatAcquiredAtLabel } from '@/lib/borders/acquisitionCopy';
import type { OwnedBorderEntry } from '@/lib/borders/ownedTypes';
import { buildVaultRows, sortVaultRows } from '@/lib/borders/vaultRows';
import { resolveShopBorderFrameSlug } from '@/lib/borders/frameSlug';
import { pulseAvatarFramesService } from '@/services/supabase/pulseAvatarFrames';
import type { EarnedPulseAvatarFrame } from '@/services/supabase/pulseAvatarFrames';
import { shopKeys } from '@/lib/shop/queryKeys';
import type { InventorySortKey } from '@/lib/borders/inventoryFilters';

/**
 * Compact, opinionated borders collection used in Customize → Look (mockup-driven).
 *
 * Why this exists separately from the full vault screen:
 *   The dedicated `/my-borders` deep-dive keeps the rich filter/sort
 *   surface (collection, source, availability, visual tier, etc). Inside
 *   Customize My Pulse, that whole filter system was overkill -- the
 *   equipped border already has its own large hero panel above, so the
 *   strip below it just needs to let the user browse + equip quickly.
 *
 * Surface contract:
 *   - Three sort modes only: All in Collection / Rarity / Newest.
 *     "All in Collection" = `equipped_first` (owned + pulse, equipped on top).
 *     "Rarity"            = `rarity_desc`.
 *     "Newest"            = `recent` (sorted by acquired_at desc).
 *   - Horizontal FlatList of tiles -- no two-column grid.
 *   - One CTA at the bottom: "Explore Border Vault" -> `/my-borders`.
 */

type CollectionSort = 'collection' | 'rarity' | 'newest';

const SORT_KEY: Record<CollectionSort, InventorySortKey> = {
  collection: 'equipped_first',
  rarity: 'rarity_desc',
  newest: 'recent',
};

const SORT_LABEL: Record<CollectionSort, string> = {
  collection: 'All in Collection',
  rarity: 'Rarity',
  newest: 'Newest',
};

export type BordersCollectionStripProps = {
  /** Called after a successful equip so parents can refresh derived UI (avatars, etc.). */
  onInventoryChanged?: () => void;
};

export function BordersCollectionStrip({ onInventoryChanged }: BordersCollectionStripProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const showToast = useToast((s) => s.show);
  const { user: authUser, profile } = useAuth();
  const userId = authUser?.id;

  const invState = useShopInventoryState(userId);
  const { entries, isLoading: entriesLoading } = useOwnedBorderEntries(userId);
  const pulseQ = useQuery({
    queryKey: ['pulseAvatarFramesEarned', userId],
    queryFn: () => pulseAvatarFramesService.listEarned(userId!),
    enabled: !!userId,
    staleTime: 30_000,
  });
  const pulseEarned = pulseQ.data ?? [];

  const collectionsQ = useBorderCollectionsMap();
  const equipMut = useEquipBorderMutation(userId);

  const [sort, setSort] = useState<CollectionSort>('collection');
  const [detail, setDetail] = useState<OwnedBorderEntry | null>(null);
  const [pulseDetail, setPulseDetail] = useState<EarnedPulseAvatarFrame | null>(null);
  const [applyingPulse, setApplyingPulse] = useState(false);

  const equippedShopItemId = invState.equippedBorder?.shop_item_id ?? null;
  const selectedPulseFrameId = profile?.selectedPulseAvatarFrameId ?? null;
  /** Avatar's actual source of truth — see notes in `MyBordersScreen`. */
  const selectedPulseFrameSlug = profile?.pulseAvatarFrame?.slug ?? null;
  const avatarUrlForVault = profile?.avatarUrl?.trim() ? profile.avatarUrl.trim() : '';

  const isShopEntryEquipped = useCallback(
    (entry: OwnedBorderEntry) => {
      if (equippedShopItemId === entry.item.id) return true;
      if (!selectedPulseFrameSlug) return false;
      const mirroredSlug = resolveShopBorderFrameSlug(entry.item);
      return mirroredSlug !== null && mirroredSlug === selectedPulseFrameSlug;
    },
    [equippedShopItemId, selectedPulseFrameSlug],
  );

  const merged = useMemo(() => buildVaultRows(entries, pulseEarned), [entries, pulseEarned]);
  const sorted = useMemo(
    () => sortVaultRows(merged, SORT_KEY[sort], equippedShopItemId, selectedPulseFrameId),
    [merged, sort, equippedShopItemId, selectedPulseFrameId],
  );

  const isLoading = entriesLoading || pulseQ.isLoading;
  const hasAnyBorders = entries.length > 0 || pulseEarned.length > 0;

  const handleEquip = useCallback(
    async (inventoryRowId: string) => {
      const r = await equipMut.mutateAsync(inventoryRowId);
      if (!r.ok) {
        showToast(r.message, 'error');
        return;
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Border equipped', 'success');
      if (userId) {
        await queryClient.invalidateQueries({ queryKey: ['pulseAvatarFramesEarned', userId] });
      }
      onInventoryChanged?.();
      setDetail(null);
    },
    [equipMut, showToast, onInventoryChanged, queryClient, userId],
  );

  const handleEquipPulse = useCallback(
    async (frameId: string | null) => {
      if (!userId) return;
      setApplyingPulse(true);
      try {
        await pulseAvatarFramesService.setSelected(frameId);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast(frameId ? 'Border equipped' : 'Using classic teal ring', 'success');
        await queryClient.invalidateQueries({ queryKey: ['pulseAvatarFramesEarned', userId] });
        await queryClient.invalidateQueries({ queryKey: shopKeys.inventory(userId) });
        onInventoryChanged?.();
        setPulseDetail(null);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Could not update border';
        showToast(msg, 'error');
      } finally {
        setApplyingPulse(false);
      }
    },
    [userId, queryClient, showToast, onInventoryChanged],
  );

  const openDetail = (e: OwnedBorderEntry) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDetail(e);
  };
  const openPulseDetail = (e: EarnedPulseAvatarFrame) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPulseDetail(e);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionLabel}>BORDERS COLLECTION</Text>
      </View>

      {/**
       * Three filter chips. Tapping switches the active sort. The current
       * mode visually 'fills' (active state); inactive modes show as outlined
       * pills with a chevron-down to suggest they're switchable.
       */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipScroll}
      >
        {(['collection', 'rarity', 'newest'] as const).map((key) => {
          const active = sort === key;
          if (active) {
            return (
              <LinearGradient
                key={key}
                colors={['rgba(34,211,238,0.55)', 'rgba(34,211,238,0.18)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.chip, styles.chipActive]}
              >
                <TouchableOpacity
                  style={styles.chipInner}
                  onPress={() => setSort(key)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.chipTextActive}>{SORT_LABEL[key]}</Text>
                </TouchableOpacity>
              </LinearGradient>
            );
          }
          return (
            <TouchableOpacity
              key={key}
              style={[styles.chip, styles.chipIdle]}
              onPress={() => setSort(key)}
              activeOpacity={0.85}
            >
              <Text style={styles.chipTextIdle}>{SORT_LABEL[key]}</Text>
              <Ionicons
                name="chevron-down"
                size={14}
                color="rgba(148,163,184,0.85)"
                style={styles.chipChevron}
              />
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {isLoading && !hasAnyBorders ? (
        <View style={styles.loading}>
          <ActivityIndicator color={semantic.accentCyan} />
          <Text style={styles.loadingHint}>Loading your borders…</Text>
        </View>
      ) : !hasAnyBorders ? (
        <View style={styles.emptyCard}>
          <Ionicons name="sparkles-outline" size={32} color="rgba(34,211,238,0.45)" />
          <Text style={styles.emptyTitle}>No borders yet</Text>
          <Text style={styles.emptyBody}>
            Earn borders through rewards, events, and the Pulse Shop.
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tilesScroll}
          decelerationRate="fast"
        >
          {sorted.map((row) => (
            <View
              key={row.kind === 'shop' ? row.entry.inventory.id : `pulse-${row.earned.frame.id}`}
              style={styles.tileWrap}
            >
              {row.kind === 'shop' ? (
                (() => {
                  const equipped = isShopEntryEquipped(row.entry);
                  return (
                    <BorderInventoryTile
                      entry={row.entry}
                      equipped={equipped}
                      onPress={() => openDetail(row.entry)}
                      onEquipPress={
                        equipped ? undefined : () => void handleEquip(row.entry.inventory.id)
                      }
                    />
                  );
                })()
              ) : (
                <PulseFrameInventoryTile
                  earned={row.earned}
                  equipped={selectedPulseFrameId === row.earned.frame.id}
                  avatarUrl={avatarUrlForVault}
                  onPress={() => openPulseDetail(row.earned)}
                  onEquipPress={
                    selectedPulseFrameId === row.earned.frame.id
                      ? undefined
                      : () => void handleEquipPulse(row.earned.frame.id)
                  }
                />
              )}
            </View>
          ))}
        </ScrollView>
      )}

      <TouchableOpacity
        style={styles.exploreCta}
        onPress={() => router.push('/my-borders' as never)}
        activeOpacity={0.92}
      >
        <LinearGradient
          colors={['rgba(34,211,238,0.18)', 'rgba(99,102,241,0.16)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.exploreCtaGrad}
        >
          <View style={styles.exploreCtaIcon}>
            <Ionicons name="cube-outline" size={18} color="#67E8F9" />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.exploreCtaTitle}>Explore Border Vault</Text>
            <Text style={styles.exploreCtaSub} numberOfLines={1}>
              Discover rare borders and exclusive drops
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#67E8F9" />
        </LinearGradient>
      </TouchableOpacity>

      <BorderDetailModal
        visible={!!detail}
        onClose={() => setDetail(null)}
        item={detail?.item ?? null}
        collection={
          detail?.item.collection_id
            ? collectionsQ.rowById.get(detail.item.collection_id) ?? null
            : null
        }
        ownership={{
          owned: true,
          equipped: detail ? equippedShopItemId === detail.item.id : false,
          inventoryRowId: detail?.inventory.id,
        }}
        isWeb={false}
        inventorySurface
        inventoryMeta={
          detail
            ? {
                acquiredAtLabel: formatAcquiredAtLabel(detail.inventory.acquired_at),
                acquisitionSummary: acquisitionSummaryLine(detail),
                giftedByDisplay: detail.giftedByUsername ? `@${detail.giftedByUsername}` : null,
              }
            : undefined
        }
        onEquip={(rowId) => void handleEquip(rowId)}
      />

      <Modal
        visible={!!pulseDetail}
        animationType="fade"
        transparent
        onRequestClose={() => !applyingPulse && setPulseDetail(null)}
      >
        <Pressable
          style={styles.pulseBackdrop}
          onPress={() => !applyingPulse && setPulseDetail(null)}
        >
          <Pressable
            style={[styles.pulseSheet, { paddingBottom: insets.bottom + 16 }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.pulseHeader}>
              <Text style={styles.pulseTitle}>Prize border</Text>
              <TouchableOpacity
                onPress={() => !applyingPulse && setPulseDetail(null)}
                hitSlop={12}
              >
                <Ionicons name="close" size={26} color={colors.dark.text} />
              </TouchableOpacity>
            </View>
            {pulseDetail ? (
              <>
                <View style={styles.pulsePreview}>
                  <AvatarDisplay
                    size={96}
                    avatarUrl={avatarUrlForVault}
                    prioritizeRemoteAvatar
                    ringColor={colors.primary.teal}
                    pulseFrame={pulseFrameFromUser(pulseDetail.frame)}
                  />
                </View>
                <Text style={styles.pulseName}>{pulseDetail.frame.label}</Text>
                {pulseDetail.frame.subtitle ? (
                  <Text style={styles.pulseSub}>{pulseDetail.frame.subtitle}</Text>
                ) : null}
                <View style={{ alignItems: 'center', marginTop: 12 }}>
                  <RarityTierBadge tier={pulseDetail.frame.rarityTier} emphasized />
                </View>
                {selectedPulseFrameId === pulseDetail.frame.id ? (
                  <View style={styles.pulseEquippedPill}>
                    <Ionicons name="checkmark-circle" size={18} color="#86EFAC" />
                    <Text style={styles.pulseEquippedText}>Currently equipped</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.pulsePrimary}
                    onPress={() => void handleEquipPulse(pulseDetail.frame.id)}
                    disabled={applyingPulse}
                    activeOpacity={0.9}
                  >
                    <Text style={styles.pulsePrimaryText}>Equip this border</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.pulseGhost}
                  onPress={() => void handleEquipPulse(null)}
                  disabled={applyingPulse}
                  activeOpacity={0.85}
                >
                  <Text style={styles.pulseGhostText}>Use classic teal instead</Text>
                </TouchableOpacity>
                {applyingPulse ? (
                  <ActivityIndicator color={semantic.accentCyan} style={{ marginTop: 12 }} />
                ) : null}
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 18 },
  headerRow: {
    paddingHorizontal: 4,
    paddingBottom: 6,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: 'rgba(148,163,184,0.95)',
    letterSpacing: 1.4,
  },
  chipScroll: {
    paddingVertical: 8,
    paddingRight: 12,
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    overflow: 'hidden',
  },
  chipActive: {
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.6)',
  },
  chipInner: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipIdle: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.32)',
    backgroundColor: 'rgba(15,23,42,0.6)',
  },
  chipChevron: { marginLeft: 4 },
  chipTextActive: {
    fontSize: 12.5,
    fontWeight: '900',
    color: '#06121F',
    letterSpacing: 0.2,
  },
  chipTextIdle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: 'rgba(226,232,240,0.95)',
    letterSpacing: 0.1,
  },
  loading: { paddingVertical: 24, alignItems: 'center', gap: 8 },
  loadingHint: { color: colors.dark.textMuted, fontSize: 12.5, fontWeight: '600' },
  emptyCard: {
    marginTop: 6,
    padding: 22,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.18)',
    backgroundColor: 'rgba(15,23,42,0.45)',
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.dark.text,
    marginTop: 4,
  },
  emptyBody: {
    fontSize: 13,
    color: 'rgba(148,163,184,0.95)',
    textAlign: 'center',
    lineHeight: 18,
  },
  tilesScroll: {
    paddingHorizontal: 2,
    paddingVertical: 4,
    gap: 12,
  },
  /**
   * Tiles re-use `BORDER_INVENTORY_TILE_W` (sized for the 2-col vault grid),
   * so each `tileWrap` is just an inline-block in the horizontal scroller.
   */
  tileWrap: { flexShrink: 0 },
  exploreCta: {
    marginTop: 14,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.32)',
    ...shadows.premiumCard,
  },
  exploreCtaGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  exploreCtaIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(34,211,238,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.36)',
  },
  exploreCtaTitle: {
    fontSize: 15.5,
    fontWeight: '900',
    color: '#67E8F9',
    letterSpacing: -0.2,
  },
  exploreCtaSub: {
    marginTop: 2,
    fontSize: 12,
    color: 'rgba(186,219,233,0.85)',
    fontWeight: '600',
  },
  pulseBackdrop: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(2,6,23,0.65)' },
  pulseSheet: {
    backgroundColor: '#070F1C',
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: borderRadius.xl,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.22)',
    maxWidth: 420,
    alignSelf: 'center',
  },
  pulseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pulseTitle: { fontSize: 18, fontWeight: '900', color: colors.dark.text },
  pulsePreview: { alignItems: 'center', marginVertical: 8 },
  pulseName: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.dark.text,
    textAlign: 'center',
    marginTop: 6,
  },
  pulseSub: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark.textMuted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  pulseEquippedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 10,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.35)',
  },
  pulseEquippedText: { fontSize: 14, fontWeight: '800', color: '#86EFAC' },
  pulsePrimary: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(37,99,235,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.5)',
    alignItems: 'center',
  },
  pulsePrimaryText: { fontSize: 15, fontWeight: '900', color: '#E0F2FE' },
  pulseGhost: { marginTop: 12, paddingVertical: 12, alignItems: 'center' },
  pulseGhostText: { fontSize: 14, fontWeight: '700', color: '#22D3EE' },
});
