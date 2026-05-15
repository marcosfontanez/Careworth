import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, borderRadius, layout, typography, pulseverse, semantic, gradients, shadows } from '@/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useOwnedBorderEntries } from '@/hooks/useOwnedBorderEntries';
import { useEquipBorderMutation, useShopInventoryState } from '@/hooks/useShopEconomy';
import { useBorderCollectionsMap } from '@/hooks/useBorderCollectionsMap';
import { BorderDetailModal } from '@/components/shop/border/BorderDetailModal';
import { PageHeader } from '@/components/ui/PageHeader';
import { BorderInventoryTile } from '@/components/borders/inventory/BorderInventoryTile';
import { PulseFrameInventoryTile } from '@/components/borders/inventory/PulseFrameInventoryTile';
import { acquisitionSummaryLine, formatAcquiredAtLabel } from '@/lib/borders/acquisitionCopy';
import type { OwnedBorderEntry } from '@/lib/borders/ownedTypes';
import {
  defaultInventoryFilterState,
  countActiveAdvancedFilters,
  type InventoryFilterState,
  type InventorySortKey,
} from '@/lib/borders/inventoryFilters';
import {
  buildVaultRows,
  filterVaultRows,
  sortVaultRows,
  vaultCollectionStats,
} from '@/lib/borders/vaultRows';
import { resolveShopBorderFrameSlug } from '@/lib/borders/frameSlug';
import { pulseAvatarFramesService } from '@/services/supabase/pulseAvatarFrames';
import type { EarnedPulseAvatarFrame } from '@/services/supabase/pulseAvatarFrames';
import { shopKeys } from '@/lib/shop/queryKeys';
import { AvatarDisplay, pulseFrameFromUser } from '@/components/profile/AvatarBuilder';
import { ringPreviewColor } from '@/lib/shop/catalogUtils';
import { BorderRarityBadge, RarityTierBadge } from '@/components/shop/border/BorderRarityBadge';
import { BorderPreviewPlate } from '@/components/shop/border/BorderPreviewPlate';
import { BorderCompactMetaRow } from '@/components/shop/border/BorderCompactMetaRow';
import { compactSourceLabel } from '@/lib/shop/borderDisplayModel';
import type { BorderSourceType } from '@/lib/shop/borderCatalogTaxonomy';
import { BORDER_CATEGORY_LABELS, type BorderCategory } from '@/lib/borders/category';

const SCREEN_W = Dimensions.get('window').width;
const SCREEN_H = Dimensions.get('window').height;
const GAP = 12;
const H_PAD = layout.screenPadding;

const RARITIES = ['common', 'rare', 'epic', 'legendary', 'mythic'] as const;
const SOURCES: BorderSourceType[] = [
  'shop',
  'beta_reward',
  'leaderboard_reward',
  'seasonal_drop',
  'event_reward',
  'sponsored',
  'promotional',
  'admin_grant',
];
const SOURCE_FILTER_LABELS: Record<BorderSourceType, string> = {
  shop: 'Pulse Shop',
  beta_reward: 'Beta reward',
  leaderboard_reward: 'Leaderboard',
  seasonal_drop: 'Seasonal',
  event_reward: 'Event',
  sponsored: 'Sponsored',
  promotional: 'Promo',
  admin_grant: 'Grant',
};
const AVAIL = ['active', 'limited', 'legacy', 'retired', 'exclusive'] as const;
const VISUAL = ['static', 'enhanced', 'reactive', 'animated'] as const;
/** Quick filter strip — only the categories users typically slice by. */
const QUICK_CATEGORIES: BorderCategory[] = [
  'holiday',
  'premium',
  'charity',
  'advertiser',
  'leaderboard',
  'reward',
  'beta',
  'legacy',
];

const SORT_LABELS: Record<InventorySortKey, string> = {
  recent: 'Recent',
  rarity_desc: 'Rarity',
  collection_az: 'Collection',
  equipped_first: 'Equipped',
  prestige_desc: 'Prestige',
  season_newest: 'Season',
};

export type MyBordersScreenProps = {
  /** When true, omit full-screen chrome and stack inside a parent ScrollView (e.g. Customize My Pulse). */
  embedded?: boolean;
  /** Called after a successful equip so parents can refresh profile / pulse frame. */
  onInventoryChanged?: () => void;
};

export function MyBordersScreen({ embedded = false, onInventoryChanged }: MyBordersScreenProps = {}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const showToast = useToast((s) => s.show);
  const { user: authUser, profile } = useAuth();
  const userId = authUser?.id;
  const params = useLocalSearchParams<{ collectionId?: string }>();

  const invState = useShopInventoryState(userId);
  const { entries, isLoading: entriesLoading, refetch } = useOwnedBorderEntries(userId);
  const pulseQ = useQuery({
    queryKey: ['pulseAvatarFramesEarned', userId],
    queryFn: () => pulseAvatarFramesService.listEarned(userId!),
    enabled: !!userId,
    staleTime: 30_000,
  });
  const pulseEarned = pulseQ.data ?? [];

  const collectionsQ = useBorderCollectionsMap();
  const equipMut = useEquipBorderMutation(userId);

  const [filter, setFilter] = useState<InventoryFilterState>(() => defaultInventoryFilterState());
  const [sort, setSort] = useState<InventorySortKey>('equipped_first');
  const [detail, setDetail] = useState<OwnedBorderEntry | null>(null);
  const [pulseDetail, setPulseDetail] = useState<EarnedPulseAvatarFrame | null>(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [applyingPulse, setApplyingPulse] = useState(false);

  useEffect(() => {
    const cid = typeof params.collectionId === 'string' ? params.collectionId.trim() : '';
    if (!cid) return;
    setFilter((f) => ({ ...f, collectionKey: cid }));
  }, [params.collectionId]);

  const equippedShopItemId = invState.equippedBorder?.shop_item_id ?? null;
  const selectedPulseFrameId = profile?.selectedPulseAvatarFrameId ?? null;
  /**
   * Slug of the user's currently-equipped pulse frame. Used as the secondary
   * "Equipped" signal for shop tiles whose border is mirrored into
   * `user_pulse_avatar_frames` — keeps exactly one tile lit even when the user
   * equipped via the prize path (`set_selected_pulse_avatar_frame`) instead of
   * the shop path (`economy_equip_border`).
   */
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

  const filtered = useMemo(
    () => filterVaultRows(merged, filter, equippedShopItemId, selectedPulseFrameId),
    [merged, filter, equippedShopItemId, selectedPulseFrameId],
  );

  const sorted = useMemo(
    () => sortVaultRows(filtered, sort, equippedShopItemId, selectedPulseFrameId),
    [filtered, sort, equippedShopItemId, selectedPulseFrameId],
  );

  const stats = useMemo(() => vaultCollectionStats(entries, pulseEarned), [entries, pulseEarned]);

  const isLoading = entriesLoading || pulseQ.isLoading;

  const equippedEntry = useMemo(() => {
    // Prefer matching by mirrored pulse-frame slug (the avatar's actual source of
    // truth) so the hero panel stays in sync when the user equipped via the prize
    // path; fall back to the shop-side flag for borders without a frame mirror.
    if (selectedPulseFrameSlug) {
      const bySlug = entries.find(
        (e) => resolveShopBorderFrameSlug(e.item) === selectedPulseFrameSlug,
      );
      if (bySlug) return bySlug;
    }
    if (!equippedShopItemId) return null;
    return entries.find((e) => e.item.id === equippedShopItemId) ?? null;
  }, [entries, equippedShopItemId, selectedPulseFrameSlug]);

  const advancedCount = countActiveAdvancedFilters(filter);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetch(), invState.refetch(), pulseQ.refetch()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetch, invState, pulseQ]);

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
    [equipMut, showToast, onInventoryChanged],
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

  const collectionOptions = useMemo(() => {
    return [
      { key: null as string | null, label: 'All collections' },
      { key: '__shop__', label: 'Shop borders' },
      { key: '__uncat__', label: 'Uncategorized' },
      ...(collectionsQ.data ?? []).map((c) => ({ key: c.id, label: c.name })),
    ];
  }, [collectionsQ.data]);

  const renderSortChip = (k: InventorySortKey) => {
    const on = sort === k;
    return (
      <TouchableOpacity
        key={k}
        style={[styles.chip, on && styles.chipOn]}
        onPress={() => setSort(k)}
        activeOpacity={0.88}
      >
        <Text style={styles.chipText}>{SORT_LABELS[k]}</Text>
      </TouchableOpacity>
    );
  };

  const ownershipChip = (o: InventoryFilterState['ownership'], label: string) => {
    const on = filter.ownership === o;
    return (
      <TouchableOpacity
        style={[styles.chip, on && styles.chipOn]}
        onPress={() => setFilter((f) => ({ ...f, ownership: o }))}
        activeOpacity={0.88}
      >
        <Text style={styles.chipText}>{label}</Text>
      </TouchableOpacity>
    );
  };

  const openDetail = (e: OwnedBorderEntry) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDetail(e);
  };

  const openPulseDetail = (e: EarnedPulseAvatarFrame) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPulseDetail(e);
  };

  const hasAnyBorders = entries.length > 0 || pulseEarned.length > 0;
  /** Selected catalog frame drives the live ring; prefer it over a stale shop "equipped" row. */
  const pulseShowcaseActive = Boolean(selectedPulseFrameId && profile?.pulseAvatarFrame);
  const showPulseHero = pulseShowcaseActive;

  const headerBlock = (
    <>
      <View style={styles.heroFrame}>
        <LinearGradient
          colors={['rgba(22,78,99,0.35)', 'rgba(15,23,42,0.97)', 'rgba(2,6,23,0.98)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroShell}
        >
          <View style={styles.heroGlow} pointerEvents="none" />
          <Text style={styles.heroKicker}>Showcase</Text>
          <Text style={styles.heroEyebrow}>Live on your pulse</Text>
          {showPulseHero && profile?.pulseAvatarFrame ? (
            <>
              <AvatarDisplay
                size={108}
                avatarUrl={avatarUrlForVault}
                prioritizeRemoteAvatar
                ringColor={colors.primary.teal}
                pulseFrame={pulseFrameFromUser(profile.pulseAvatarFrame)}
              />
              <Text style={[styles.heroName, { marginTop: 14 }]}>{profile.pulseAvatarFrame.label}</Text>
              {profile.pulseAvatarFrame.subtitle ? (
                <Text style={styles.heroCollection}>{profile.pulseAvatarFrame.subtitle}</Text>
              ) : null}
              <View style={{ alignItems: 'center', marginTop: 10 }}>
                <RarityTierBadge tier={profile.pulseAvatarFrame.rarityTier} emphasized />
              </View>
              {profile.pulseAvatarFrame.acquisitionTag ? (
                <Text style={[styles.heroCollection, { marginTop: 8, fontSize: 13 }]}>
                  {profile.pulseAvatarFrame.acquisitionTag}
                </Text>
              ) : (
                <Text style={[styles.heroCollectionLabel, { marginTop: 12 }]}>Prize / reward ring</Text>
              )}
              <TouchableOpacity
                style={styles.heroCta}
                onPress={() => {
                  setFilter((f) => ({ ...f, ownership: 'all' }));
                  void Haptics.selectionAsync();
                }}
                activeOpacity={0.88}
              >
                <Text style={styles.heroCtaText}>Change active border</Text>
                <Ionicons name="swap-horizontal" size={18} color="#A5F3FC" />
              </TouchableOpacity>
            </>
          ) : equippedEntry ? (
            <>
              <BorderPreviewPlate
                ringColor={ringPreviewColor(equippedEntry.item)}
                size={108}
                rankPlace={equippedEntry.item.rank_place}
                showMotionHint={
                  equippedEntry.item.visual_tier === 'animated' ||
                  equippedEntry.item.visual_tier === 'reactive' ||
                  equippedEntry.item.is_animated === true
                }
                shopItem={equippedEntry.item}
              />
              <Text style={styles.heroName}>{equippedEntry.item.name}</Text>
              {equippedEntry.collectionName ? (
                <Text style={styles.heroCollectionLabel}>Collection</Text>
              ) : null}
              {equippedEntry.collectionName ? (
                <Text style={styles.heroCollection}>{equippedEntry.collectionName}</Text>
              ) : null}
              <View style={styles.heroBadgeRow}>
                <BorderRarityBadge item={equippedEntry.item} emphasized />
                {compactSourceLabel(equippedEntry.item.source_type) ? (
                  <View style={styles.heroSrcPill}>
                    <Text style={styles.heroSrcPillText}>
                      {compactSourceLabel(equippedEntry.item.source_type)}
                    </Text>
                  </View>
                ) : null}
              </View>
              <BorderCompactMetaRow item={equippedEntry.item} compact />
              <TouchableOpacity
                style={styles.heroCta}
                onPress={() => {
                  setFilter((f) => ({ ...f, ownership: 'unequipped' }));
                  void Haptics.selectionAsync();
                }}
                activeOpacity={0.88}
              >
                <Text style={styles.heroCtaText}>Change active border</Text>
                <Ionicons name="swap-horizontal" size={18} color="#A5F3FC" />
              </TouchableOpacity>
            </>
          ) : !hasAnyBorders && !isLoading ? (
            <View style={styles.heroEmpty}>
              <View style={styles.emptyOrb}>
                <Ionicons name="diamond-outline" size={32} color="rgba(34,211,238,0.55)" />
              </View>
              <Text style={styles.heroEmptyTitle}>Nothing equipped</Text>
              <Text style={styles.heroEmptySub}>
                Crown your avatar with a border—everyone sees it on My Pulse.
              </Text>
              <TouchableOpacity
                style={styles.heroPrimaryBtn}
                onPress={() => router.push({ pathname: '/pulse-shop', params: { tab: 'borders' } } as any)}
                activeOpacity={0.88}
              >
                <Text style={styles.heroPrimaryBtnText}>Discover borders</Text>
              </TouchableOpacity>
            </View>
          ) : isLoading && !hasAnyBorders ? (
            <View style={styles.heroEmpty}>
              <ActivityIndicator color={semantic.accentCyan} />
              <Text style={styles.heroEmptySub}>Loading your borders…</Text>
            </View>
          ) : (
            <View style={[styles.heroEmpty, { paddingTop: 8 }]}>
              <AvatarDisplay
                size={108}
                avatarUrl={avatarUrlForVault}
                prioritizeRemoteAvatar
                ringColor={colors.primary.teal}
              />
              <Text style={[styles.heroName, { marginTop: 14 }]}>Classic teal</Text>
              <Text style={[styles.heroEmptySub, { marginTop: 6 }]}>
                Default ring — pick any Shop or prize border below.
              </Text>
            </View>
          )}
        </LinearGradient>
      </View>

      <LinearGradient
        colors={['rgba(30,58,95,0.5)', 'rgba(15,23,42,0.9)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.statsRow}
      >
        <View style={styles.statCell}>
          <Text style={styles.statValue}>{stats.totalOwned}</Text>
          <Text style={styles.statLabel}>Owned</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCell}>
          <Text style={styles.statValue}>{stats.collectionCount}</Text>
          <Text style={styles.statLabel}>Sets</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCell}>
          <Text style={styles.statValue}>{stats.animatedCount}</Text>
          <Text style={styles.statLabel}>Motion</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCell}>
          <Text style={styles.statValue}>{stats.legacyCount}</Text>
          <Text style={styles.statLabel}>Heritage</Text>
        </View>
      </LinearGradient>

      <View style={styles.sectionLabelRow}>
        <View>
          <Text style={styles.sectionKicker}>Scope</Text>
          <Text style={styles.sectionTitle}>Vault</Text>
        </View>
        <TouchableOpacity onPress={() => setFilterSheetOpen(true)} style={styles.filterFab} activeOpacity={0.88}>
          <LinearGradient
            colors={['rgba(34,211,238,0.35)', 'rgba(99,102,241,0.25)']}
            style={styles.filterFabGrad}
          >
            <Ionicons name="options-outline" size={20} color="#E0F2FE" />
            {advancedCount > 0 ? (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{advancedCount}</Text>
              </View>
            ) : null}
          </LinearGradient>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
        {ownershipChip('all', 'All')}
        {ownershipChip('equipped', 'Equipped')}
        {ownershipChip('unequipped', 'Vault')}
      </ScrollView>

      <Text style={styles.sectionKicker}>Category</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
        <TouchableOpacity
          style={[styles.chip, !filter.category && styles.chipOn]}
          onPress={() => setFilter((f) => ({ ...f, category: null }))}
          activeOpacity={0.88}
        >
          <Text style={styles.chipText}>All</Text>
        </TouchableOpacity>
        {QUICK_CATEGORIES.map((cat) => {
          const on = filter.category === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, on && styles.chipOn]}
              onPress={() => setFilter((f) => ({ ...f, category: on ? null : cat }))}
              activeOpacity={0.88}
            >
              <Text style={styles.chipText}>{BORDER_CATEGORY_LABELS[cat]}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Text style={styles.sectionKicker}>Arrange</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
        {renderSortChip('equipped_first')}
        {renderSortChip('recent')}
        {renderSortChip('rarity_desc')}
        {renderSortChip('collection_az')}
        {renderSortChip('prestige_desc')}
        {renderSortChip('season_newest')}
      </ScrollView>

      <View style={styles.vaultRule} />
      <Text style={styles.gridHeading}>In your collection</Text>
    </>
  );

  const embeddedGrid = (
    <View style={styles.embeddedGrid}>
      {sorted.map((row) => (
        <React.Fragment key={row.kind === 'shop' ? row.entry.inventory.id : `pulse-${row.earned.frame.id}`}>
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
        </React.Fragment>
      ))}
    </View>
  );

  const filterEmptyBlock = (
    <View style={styles.filterEmpty}>
      <View style={styles.emptyOrb}>
        <Ionicons name="funnel-outline" size={28} color="rgba(34,211,238,0.45)" />
      </View>
      <Text style={styles.filterEmptyTitle}>Nothing in this view</Text>
      <Text style={styles.filterEmptySub}>
        Loosen a filter or reset—the rest of your vault is still there.
      </Text>
      <TouchableOpacity style={styles.heroPrimaryBtn} onPress={() => setFilter(defaultInventoryFilterState())}>
        <Text style={styles.heroPrimaryBtnText}>Clear filters</Text>
      </TouchableOpacity>
    </View>
  );

  if (!userId) {
    if (embedded) {
      return (
        <View style={styles.embeddedGate}>
          <Text style={styles.embeddedGateText}>Sign in to manage Pulse Shop borders.</Text>
        </View>
      );
    }
    return (
      <View style={[styles.root, styles.gate, { paddingTop: insets.top }]}>
        <Text style={styles.gateTitle}>Sign in</Text>
        <Text style={styles.gateSub}>Your border collection syncs with your PulseVerse account.</Text>
        <TouchableOpacity style={styles.heroPrimaryBtn} onPress={() => router.push('/auth/login')}>
          <Text style={styles.heroPrimaryBtnText}>Go to sign in</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const embeddedBody =
    isLoading && !hasAnyBorders ? (
      <View style={styles.embeddedLoading}>
        <ActivityIndicator size="small" color={semantic.accentCyan} />
        <Text style={styles.embeddedLoadingHint}>Opening your vault…</Text>
      </View>
    ) : !hasAnyBorders ? (
      <>
        {headerBlock}
        <View style={styles.emptyCard}>
          <Ionicons name="sparkles-outline" size={44} color="rgba(34,211,238,0.45)" />
          <Text style={styles.emptyTitle}>No borders yet</Text>
          <Text style={styles.emptyBody}>
            Earn borders through rewards, events, and the Pulse Shop. Your trophies will appear here.
          </Text>
          <TouchableOpacity
            style={styles.heroPrimaryBtn}
            onPress={() => router.push({ pathname: '/pulse-shop', params: { tab: 'borders' } } as any)}
          >
            <Text style={styles.heroPrimaryBtnText}>Browse Pulse Shop</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.textLink} onPress={() => router.push('/(tabs)/create' as any)}>
            <Text style={styles.textLinkText}>Explore create & rewards</Text>
          </TouchableOpacity>
        </View>
      </>
    ) : (
      <>
        {headerBlock}
        {sorted.length === 0 ? filterEmptyBlock : embeddedGrid}
      </>
    );

  const detailAndFilterModals = (
    <>
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
        onViewCollection={
          detail?.item.collection_id
            ? () => {
                const id = detail.item.collection_id!;
                setDetail(null);
                setFilter((f) => ({ ...f, collectionKey: id }));
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
        <Pressable style={styles.pulseModalBackdrop} onPress={() => !applyingPulse && setPulseDetail(null)}>
          <Pressable style={[styles.pulseDetailSheet, { paddingBottom: insets.bottom + 16 }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.pulseDetailHeader}>
              <Text style={styles.pulseDetailTitle}>Prize border</Text>
              <TouchableOpacity onPress={() => !applyingPulse && setPulseDetail(null)} hitSlop={12}>
                <Ionicons name="close" size={26} color={colors.dark.text} />
              </TouchableOpacity>
            </View>
            {pulseDetail ? (
              <>
                <View style={styles.pulseDetailPreview}>
                  <AvatarDisplay
                    size={96}
                    avatarUrl={avatarUrlForVault}
                    prioritizeRemoteAvatar
                    ringColor={colors.primary.teal}
                    pulseFrame={pulseFrameFromUser(pulseDetail.frame)}
                  />
                </View>
                <Text style={styles.pulseDetailName}>{pulseDetail.frame.label}</Text>
                {pulseDetail.frame.subtitle ? (
                  <Text style={styles.pulseDetailSub}>{pulseDetail.frame.subtitle}</Text>
                ) : null}
                <View style={{ alignItems: 'center', marginTop: 12 }}>
                  <RarityTierBadge tier={pulseDetail.frame.rarityTier} emphasized />
                </View>
                {pulseDetail.frame.acquisitionTag ? (
                  <Text style={styles.pulseDetailTag}>{pulseDetail.frame.acquisitionTag}</Text>
                ) : null}
                {selectedPulseFrameId === pulseDetail.frame.id ? (
                  <View style={styles.pulseDetailEquippedPill}>
                    <Ionicons name="checkmark-circle" size={18} color="#86EFAC" />
                    <Text style={styles.pulseDetailEquippedText}>Currently equipped</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.pulseDetailPrimary}
                    onPress={() => void handleEquipPulse(pulseDetail.frame.id)}
                    disabled={applyingPulse}
                    activeOpacity={0.88}
                  >
                    <Text style={styles.pulseDetailPrimaryText}>Equip this border</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.pulseDetailGhost}
                  onPress={() => void handleEquipPulse(null)}
                  disabled={applyingPulse}
                  activeOpacity={0.88}
                >
                  <Text style={styles.pulseDetailGhostText}>Use classic teal instead</Text>
                </TouchableOpacity>
                {applyingPulse ? <ActivityIndicator color={semantic.accentCyan} style={{ marginTop: 12 }} /> : null}
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={filterSheetOpen} animationType="slide" transparent onRequestClose={() => setFilterSheetOpen(false)}>
        <View style={styles.sheetBackdrop}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setFilterSheetOpen(false)} />
          <View style={styles.filterSheet}>
            <View style={styles.sheetGrab}>
              <View style={styles.sheetGrabBar} />
            </View>
            <Text style={styles.sheetTitle}>Refine vault</Text>
            <Text style={styles.sheetSubtitle}>Narrow by set, rarity, origin, and more.</Text>
            <ScrollView
              style={styles.sheetScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetScrollContent}
            >
              <Text style={styles.pickerSection}>Collection</Text>
              {collectionOptions.map((opt) => (
                <TouchableOpacity
                  key={String(opt.key)}
                  style={[styles.optionRow, filter.collectionKey === opt.key && styles.optionRowOn]}
                  onPress={() => setFilter((f) => ({ ...f, collectionKey: opt.key }))}
                >
                  <Text style={styles.optionText}>{opt.label}</Text>
                  {filter.collectionKey === opt.key ? (
                    <Ionicons name="checkmark-circle" size={20} color="#22D3EE" />
                  ) : null}
                </TouchableOpacity>
              ))}

              <Text style={styles.pickerSection}>Rarity</Text>
              <View style={styles.pickerWrap}>
                <TouchableOpacity
                  style={[styles.pill, !filter.rarity && styles.pillOn]}
                  onPress={() => setFilter((f) => ({ ...f, rarity: null }))}
                >
                  <Text style={styles.pillText}>Any</Text>
                </TouchableOpacity>
                {RARITIES.map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.pill, filter.rarity === r && styles.pillOn]}
                    onPress={() => setFilter((f) => ({ ...f, rarity: r }))}
                  >
                    <Text style={styles.pillText}>{r.charAt(0).toUpperCase() + r.slice(1)}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.pickerSection}>Source</Text>
              <View style={styles.pickerWrap}>
                <TouchableOpacity
                  style={[styles.pill, !filter.source && styles.pillOn]}
                  onPress={() => setFilter((f) => ({ ...f, source: null }))}
                >
                  <Text style={styles.pillText}>Any</Text>
                </TouchableOpacity>
                {SOURCES.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.pill, filter.source === s && styles.pillOn]}
                    onPress={() => setFilter((f) => ({ ...f, source: s }))}
                  >
                    <Text style={styles.pillText}>{SOURCE_FILTER_LABELS[s]}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.pickerSection}>Availability</Text>
              <View style={styles.pickerWrap}>
                <TouchableOpacity
                  style={[styles.pill, !filter.availability && styles.pillOn]}
                  onPress={() => setFilter((f) => ({ ...f, availability: null }))}
                >
                  <Text style={styles.pillText}>Any</Text>
                </TouchableOpacity>
                {AVAIL.map((a) => (
                  <TouchableOpacity
                    key={a}
                    style={[styles.pill, filter.availability === a && styles.pillOn]}
                    onPress={() => setFilter((f) => ({ ...f, availability: a }))}
                  >
                    <Text style={styles.pillText}>{a.charAt(0).toUpperCase() + a.slice(1)}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.pickerSection}>Visual tier</Text>
              <View style={styles.pickerWrap}>
                <TouchableOpacity
                  style={[styles.pill, !filter.visualTier && styles.pillOn]}
                  onPress={() => setFilter((f) => ({ ...f, visualTier: null }))}
                >
                  <Text style={styles.pillText}>Any</Text>
                </TouchableOpacity>
                {VISUAL.map((v) => (
                  <TouchableOpacity
                    key={v}
                    style={[styles.pill, filter.visualTier === v && styles.pillOn]}
                    onPress={() => setFilter((f) => ({ ...f, visualTier: v }))}
                  >
                    <Text style={styles.pillText}>{v.charAt(0).toUpperCase() + v.slice(1)}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.pickerSection}>Category</Text>
              <View style={styles.pickerWrap}>
                <TouchableOpacity
                  style={[styles.pill, !filter.category && styles.pillOn]}
                  onPress={() => setFilter((f) => ({ ...f, category: null }))}
                >
                  <Text style={styles.pillText}>Any</Text>
                </TouchableOpacity>
                {QUICK_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.pill, filter.category === cat && styles.pillOn]}
                    onPress={() => setFilter((f) => ({ ...f, category: cat }))}
                  >
                    <Text style={styles.pillText}>{BORDER_CATEGORY_LABELS[cat]}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.resetBtn}
                onPress={() => {
                  setFilter(defaultInventoryFilterState());
                  void Haptics.selectionAsync();
                }}
              >
                <Text style={styles.resetBtnText}>Reset all filters</Text>
              </TouchableOpacity>
            </ScrollView>
            <View style={[styles.sheetFooter, { paddingBottom: insets.bottom + 12 }]}>
              <TouchableOpacity
                style={styles.sheetDoneBtn}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setFilterSheetOpen(false);
                }}
                activeOpacity={0.92}
              >
                <LinearGradient
                  colors={[...gradients.sheetDone]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.sheetDoneGrad}
                >
                  <Text style={styles.sheetDoneText}>Done</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );

  if (embedded) {
    return (
      <>
        <View style={styles.embeddedBleed}>{embeddedBody}</View>
        {detailAndFilterModals}
      </>
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={[...pulseverse.screenGradient]} style={StyleSheet.absoluteFill} />
      <PageHeader
        layout="balanced"
        insetTop={insets.top}
        onBack={() => router.back()}
        title="My Borders"
        subtitle="Your vault—curate what the world sees on your pulse"
        balancedEndWidth={40}
      />

      {isLoading && !hasAnyBorders ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={semantic.accentCyan} />
          <Text style={styles.loadingHint}>Opening your vault…</Text>
        </View>
      ) : !hasAnyBorders ? (
        <ScrollView
          contentContainerStyle={[styles.emptyWrap, { paddingBottom: insets.bottom + 24 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={semantic.accentCyan} />}
        >
          {headerBlock}
          <View style={styles.emptyCard}>
            <Ionicons name="sparkles-outline" size={44} color="rgba(34,211,238,0.45)" />
            <Text style={styles.emptyTitle}>No borders yet</Text>
            <Text style={styles.emptyBody}>
              Earn borders through rewards, events, and the Pulse Shop. Your trophies will appear here.
            </Text>
            <TouchableOpacity style={styles.heroPrimaryBtn} onPress={() => router.push({ pathname: '/pulse-shop', params: { tab: 'borders' } } as any)}>
              <Text style={styles.heroPrimaryBtnText}>Browse Pulse Shop</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.textLink} onPress={() => router.push('/(tabs)/create' as any)}>
              <Text style={styles.textLinkText}>Explore create & rewards</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(row) =>
            row.kind === 'shop' ? row.entry.inventory.id : `pulse-${row.earned.frame.id}`
          }
          numColumns={2}
          columnWrapperStyle={styles.columnWrap}
          contentContainerStyle={{ paddingHorizontal: H_PAD, paddingBottom: insets.bottom + 28 }}
          ListHeaderComponent={headerBlock}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={semantic.accentCyan} />
          }
          ListEmptyComponent={filterEmptyBlock}
          renderItem={({ item }) => {
            if (item.kind === 'shop') {
              const equipped = isShopEntryEquipped(item.entry);
              return (
                <BorderInventoryTile
                  entry={item.entry}
                  equipped={equipped}
                  onPress={() => openDetail(item.entry)}
                  onEquipPress={
                    equipped ? undefined : () => void handleEquip(item.entry.inventory.id)
                  }
                />
              );
            }
            return (
              <PulseFrameInventoryTile
                earned={item.earned}
                equipped={selectedPulseFrameId === item.earned.frame.id}
                avatarUrl={avatarUrlForVault}
                onPress={() => openPulseDetail(item.earned)}
                onEquipPress={
                  selectedPulseFrameId === item.earned.frame.id
                    ? undefined
                    : () => void handleEquipPulse(item.earned.frame.id)
                }
              />
            );
          }}
        />
      )}

      {detailAndFilterModals}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.dark.bg },
  gate: { paddingHorizontal: H_PAD, justifyContent: 'center' },
  gateTitle: { ...typography.screenTitle, color: colors.dark.text, marginBottom: 8 },
  gateSub: { ...typography.body, color: colors.dark.textSecondary, marginBottom: 20, lineHeight: 22 },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingHint: { color: colors.dark.textMuted, fontWeight: '600' },
  heroFrame: {
    borderRadius: borderRadius.xl + 2,
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    top: -56,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: pulseverse.heroBloom,
    alignSelf: 'center',
  },
  heroKicker: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(250,204,21,0.92)',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  heroCollectionLabel: {
    marginTop: 10,
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(212,167,90,0.88)',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  emptyOrb: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.28)',
    backgroundColor: 'rgba(34,211,238,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.accentEdge,
  },
  sectionKicker: {
    fontSize: 10,
    fontWeight: '800',
    color: '#67E8F9',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    marginTop: 2,
    fontSize: 22,
    fontWeight: '900',
    color: colors.dark.text,
    letterSpacing: -0.5,
  },
  filterFab: {
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.4)',
  },
  filterFabGrad: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    minWidth: 48,
    minHeight: 48,
  },
  vaultRule: {
    height: StyleSheet.hairlineWidth * 2,
    marginTop: 22,
    backgroundColor: 'rgba(34,211,238,0.2)',
    borderRadius: 1,
  },
  gridHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: 'rgba(241,245,249,0.95)',
    letterSpacing: -0.2,
    marginTop: 14,
    marginBottom: 6,
  },
  heroShell: {
    marginTop: 4,
    borderRadius: borderRadius.card,
    padding: 20,
    borderWidth: 1,
    borderColor: pulseverse.cardRimAccent,
    alignItems: 'center',
  },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: '900',
    color: '#67E8F9',
    letterSpacing: 1.4,
    marginBottom: 10,
  },
  heroName: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: '900',
    color: colors.dark.text,
    textAlign: 'center',
  },
  heroCollection: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(203,213,225,0.92)',
    textAlign: 'center',
    letterSpacing: 0.15,
    lineHeight: 20,
  },
  heroBadgeRow: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  heroSrcPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
    backgroundColor: 'rgba(30,41,59,0.65)',
    justifyContent: 'center',
  },
  heroSrcPillText: { fontSize: 10, fontWeight: '800', color: colors.dark.text },
  heroCta: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.4)',
    backgroundColor: 'rgba(34,211,238,0.08)',
  },
  heroCtaText: { fontSize: 14, fontWeight: '900', color: '#22D3EE' },
  heroEmpty: { alignItems: 'center', paddingVertical: 16, gap: 10 },
  heroEmptyTitle: { fontSize: 17, fontWeight: '800', color: colors.dark.text },
  heroEmptySub: { fontSize: 13, color: colors.dark.textMuted, textAlign: 'center', lineHeight: 19, paddingHorizontal: 8 },
  heroPrimaryBtn: {
    marginTop: 8,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: borderRadius.lg,
    backgroundColor: '#0EA5E9',
  },
  heroPrimaryBtnText: { fontSize: 15, fontWeight: '900', color: '#FFF' },
  statsRow: {
    flexDirection: 'row',
    marginTop: 16,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(15,23,42,0.65)',
    paddingVertical: 12,
  },
  statCell: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 17, fontWeight: '900', color: colors.dark.text },
  statLabel: { marginTop: 4, fontSize: 10, fontWeight: '800', color: colors.dark.textMuted, letterSpacing: 0.4 },
  statDivider: { width: 1, backgroundColor: 'rgba(148,163,184,0.2)' },
  sectionLabelRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: { fontSize: 13, fontWeight: '800', color: colors.dark.textMuted, letterSpacing: 0.3 },
  filterIconBtn: { position: 'relative', padding: 4 },
  filterBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#22D3EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: { fontSize: 10, fontWeight: '900', color: '#050A14' },
  chipScroll: { gap: 8, paddingVertical: 10, paddingRight: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
    backgroundColor: 'rgba(15,23,42,0.55)',
  },
  chipOn: { borderColor: 'rgba(34,211,238,0.55)', backgroundColor: 'rgba(34,211,238,0.12)' },
  chipText: { fontSize: 12, fontWeight: '800', color: colors.dark.text },
  columnWrap: { justifyContent: 'space-between', gap: GAP, marginBottom: 0 },
  emptyWrap: { paddingHorizontal: H_PAD },
  emptyCard: {
    marginTop: 20,
    padding: 24,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.15)',
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.4)',
  },
  emptyTitle: { marginTop: 14, fontSize: 20, fontWeight: '900', color: colors.dark.text },
  emptyBody: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: colors.dark.textMuted,
    textAlign: 'center',
  },
  textLink: { marginTop: 14 },
  textLinkText: { fontSize: 14, fontWeight: '700', color: '#22D3EE' },
  filterEmpty: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    marginHorizontal: 4,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.15)',
    backgroundColor: 'rgba(15,23,42,0.35)',
  },
  filterEmptyTitle: { marginTop: 14, fontSize: 18, fontWeight: '900', color: colors.dark.text, letterSpacing: -0.2 },
  filterEmptySub: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: colors.dark.textMuted,
    textAlign: 'center',
    maxWidth: SCREEN_W * 0.85,
  },
  sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(2,6,23,0.65)' },
  pulseModalBackdrop: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(2,6,23,0.65)' },
  pulseDetailSheet: {
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
    width: SCREEN_W - 32,
  },
  pulseDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pulseDetailTitle: { fontSize: 18, fontWeight: '900', color: colors.dark.text },
  pulseDetailPreview: { alignItems: 'center', marginVertical: 8 },
  pulseDetailName: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.dark.text,
    textAlign: 'center',
    marginTop: 6,
  },
  pulseDetailSub: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark.textMuted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  pulseDetailTag: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(226,232,240,0.9)',
    textAlign: 'center',
  },
  pulseDetailEquippedPill: {
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
  pulseDetailEquippedText: { fontSize: 14, fontWeight: '800', color: '#86EFAC' },
  pulseDetailPrimary: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(37,99,235,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.5)',
    alignItems: 'center',
  },
  pulseDetailPrimaryText: { fontSize: 15, fontWeight: '900', color: '#E0F2FE' },
  pulseDetailGhost: { marginTop: 12, paddingVertical: 12, alignItems: 'center' },
  pulseDetailGhostText: { fontSize: 14, fontWeight: '700', color: '#22D3EE' },
  filterSheet: {
    backgroundColor: '#070F1C',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: SCREEN_H * 0.9,
    paddingHorizontal: H_PAD,
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.22)',
    borderBottomWidth: 0,
    flexGrow: 0,
  },
  sheetSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: colors.dark.textMuted,
    marginBottom: 8,
    opacity: 0.95,
  },
  sheetScroll: {
    maxHeight: SCREEN_H * 0.58,
  },
  sheetScrollContent: {
    paddingBottom: 16,
  },
  sheetFooter: {
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(148,163,184,0.2)',
  },
  sheetDoneBtn: { borderRadius: borderRadius.lg, overflow: 'hidden' },
  sheetDoneGrad: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetDoneText: { fontSize: 16, fontWeight: '900', color: '#020617', letterSpacing: 0.3 },
  sheetGrab: { alignItems: 'center', paddingVertical: 10 },
  sheetGrabBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(148,163,184,0.35)' },
  sheetTitle: { fontSize: 20, fontWeight: '900', color: colors.dark.text, marginBottom: 4, letterSpacing: -0.3 },
  pickerSection: { marginTop: 16, marginBottom: 8, fontSize: 12, fontWeight: '800', color: '#67E8F9', letterSpacing: 0.5 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 6,
  },
  optionRowOn: { borderColor: 'rgba(34,211,238,0.35)', backgroundColor: 'rgba(34,211,238,0.08)' },
  optionText: { fontSize: 14, fontWeight: '700', color: colors.dark.text, flex: 1 },
  pickerWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
    backgroundColor: 'rgba(15,23,42,0.55)',
  },
  pillOn: { borderColor: '#22D3EE', backgroundColor: 'rgba(34,211,238,0.12)' },
  pillText: { fontSize: 11, fontWeight: '800', color: colors.dark.text },
  resetBtn: {
    marginTop: 24,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(251,113,133,0.35)',
  },
  resetBtnText: { fontSize: 14, fontWeight: '800', color: '#FECDD3' },
  embeddedBleed: { marginHorizontal: -H_PAD },
  embeddedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: GAP,
    paddingHorizontal: H_PAD,
    paddingBottom: 16,
  },
  embeddedLoading: { paddingVertical: 24, alignItems: 'center', gap: 10 },
  embeddedLoadingHint: { color: colors.dark.textMuted, fontWeight: '600', fontSize: 13 },
  embeddedGate: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(15,23,42,0.65)',
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  embeddedGateText: { color: colors.dark.textMuted, fontSize: 13, textAlign: 'center' },
});
