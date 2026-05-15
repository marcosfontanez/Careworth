import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, colors, semantic, shadows } from '@/theme';
import type { ShopItemRow } from '@/lib/shop/types';
import {
  deriveBorderCategory,
  readCharityMeta,
  readSponsorMeta,
  type BorderCategory,
  type BorderCollectionLike,
} from '@/lib/borders/category';
import { BORDER_CATEGORY_KICKER } from '@/lib/borders/cta';
import { BorderCategoryBadge } from '@/components/borders/BorderCategoryBadge';
import { CampaignWindowCountdown } from '@/components/borders/CampaignWindowCountdown';
import { BorderPreviewPlate } from '@/components/shop/border/BorderPreviewPlate';
import { ringPreviewColor, isFreeShopBorder } from '@/lib/shop/catalogUtils';

const { width: SCREEN_W } = Dimensions.get('window');

/** Caller-friendly "collection enough to display + categorize" projection. */
export type HeroCollectionInfo =
  | (BorderCollectionLike & { name?: string | null })
  | null;

export type MonthlyHeroEntry = {
  item: ShopItemRow;
  collection: HeroCollectionInfo;
  /** Pre-resolved category — defaults to `deriveBorderCategory(item, collection)`. */
  category?: BorderCategory;
};

export type MonthlyHeroRailProps = {
  entries: MonthlyHeroEntry[];
  onOpenDetail: (item: ShopItemRow) => void;
  /** When true, owner already has the border equipped (rare on heros — render owned pill). */
  equippedShopItemId?: string | null;
  /** Lookup for ownership state (avoid passing the full inv state). */
  ownsBorder?: (id: string) => boolean;
};

/**
 * Curated monthly hero rail — surfaces up to 4 hero tiles representing the
 * different border programs that month: free monthly (holiday), premium
 * drop, charity, partner. Replaces the single-featured slot when 2+
 * categories are live; falls back to a single big hero in the parent when not.
 *
 * Each tile is its own categorical mini-hero with a category badge, an
 * optional countdown, a preview, and either "Brought to you by [Brand]"
 * (advertiser) or "Supports [Cause]" (charity) microcopy.
 */
export function MonthlyHeroRail({
  entries,
  onOpenDetail,
  equippedShopItemId,
  ownsBorder,
}: MonthlyHeroRailProps) {
  if (!entries.length) return null;

  // Tile width tuned for "1.1 tiles visible" on phone — peek the next.
  const TILE_W = Math.min(320, Math.round(SCREEN_W * 0.84));

  return (
    <View>
      <View style={styles.head}>
        <View>
          <Text style={styles.kicker}>This month at the Pulse Shop</Text>
          <Text style={styles.title}>Monthly border drops</Text>
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}
        snapToInterval={TILE_W + 12}
        decelerationRate="fast"
      >
        {entries.map((e, idx) => {
          const cat = e.category ?? deriveBorderCategory(e.item, e.collection);
          const owned = ownsBorder?.(e.item.id) ?? equippedShopItemId === e.item.id;
          return (
            <HeroTile
              key={e.item.id}
              item={e.item}
              collection={e.collection}
              category={cat}
              owned={owned}
              width={TILE_W}
              onPress={() => onOpenDetail(e.item)}
              isFirst={idx === 0}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}

function HeroTile({
  item,
  collection,
  category,
  owned,
  width,
  onPress,
  isFirst,
}: {
  item: ShopItemRow;
  collection: HeroCollectionInfo;
  category: BorderCategory;
  owned: boolean;
  width: number;
  onPress: () => void;
  isFirst: boolean;
}) {
  const charity = category === 'charity' ? readCharityMeta(item) : null;
  const sponsor = category === 'advertiser' ? readSponsorMeta(item) : null;
  const isFree = category === 'holiday' || category === 'advertiser' || isFreeShopBorder(item);
  const motionHint =
    item.visual_tier === 'animated' || item.visual_tier === 'reactive' || item.is_animated === true;

  const ctaLabel = owned
    ? 'View border'
    : category === 'holiday'
      ? 'Claim free'
      : category === 'advertiser'
        ? 'Claim free'
        : category === 'charity'
          ? 'Claim charity drop'
          : 'View border';

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open ${item.name}`}
      style={[styles.tile, { width, marginLeft: isFirst ? 0 : 12 }]}
    >
      {Platform.OS === 'web' ? (
        <View style={[StyleSheet.absoluteFill, styles.tileGlassWeb]} pointerEvents="none" />
      ) : (
        <BlurView intensity={36} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />
      )}
      <LinearGradient
        colors={['rgba(15,23,42,0.62)', 'rgba(2,6,23,0.92)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, styles.tileVeil]}
        pointerEvents="none"
      />
      {/* Subtle category-tinted top wash */}
      <LinearGradient
        colors={categoryWashColors(category)}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[styles.tileWash, { height: 84 }]}
        pointerEvents="none"
      />

      <View style={styles.tileHead}>
        <BorderCategoryBadge category={category} compact />
        <CampaignWindowCountdown item={item} live variant="chip" />
      </View>

      <View style={styles.tileBody}>
        <View style={styles.previewWrap}>
          <BorderPreviewPlate
            ringColor={ringPreviewColor(item)}
            size={88}
            rankPlace={item.rank_place}
            showMotionHint={motionHint}
            shopItem={item}
          />
        </View>
        <View style={styles.copy}>
          <Text style={styles.heroKicker} numberOfLines={1}>
            {BORDER_CATEGORY_KICKER[category]}
          </Text>
          <Text style={styles.heroTitle} numberOfLines={2}>
            {item.name}
          </Text>
          {collection?.name ? (
            <Text style={styles.heroCollection} numberOfLines={1}>
              {collection.name}
            </Text>
          ) : null}
          {sponsor ? (
            <Text style={styles.heroPartner} numberOfLines={1}>
              {sponsor.brandName}
            </Text>
          ) : null}
          {charity ? (
            <Text style={styles.heroCharity} numberOfLines={2}>
              Supports {charity.partnerName}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.tileFoot}>
        {owned ? (
          <View style={styles.ownedPill}>
            <Ionicons name="checkmark-done" size={13} color="#FDE68A" />
            <Text style={styles.ownedPillText}>In your vault</Text>
          </View>
        ) : isFree ? (
          <View style={[styles.ctaPill, styles.ctaPillFree]}>
            <Text style={[styles.ctaPillText, { color: '#021627' }]}>{ctaLabel}</Text>
          </View>
        ) : (
          <View style={styles.ctaPill}>
            <Ionicons name="phone-portrait-outline" size={13} color="#021627" style={{ marginRight: 6 }} />
            <Text style={[styles.ctaPillText, { color: '#021627' }]}>
              {item.real_money_display_price?.trim() || ctaLabel}
            </Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={16} color={semantic.accentCyan} />
      </View>
    </TouchableOpacity>
  );
}

function categoryWashColors(category: BorderCategory): readonly [string, string] {
  switch (category) {
    case 'charity':
      return ['rgba(212,166,58,0.22)', 'rgba(15,23,42,0)'] as const;
    case 'advertiser':
      return ['rgba(167,139,250,0.22)', 'rgba(15,23,42,0)'] as const;
    case 'holiday':
      return ['rgba(34,197,94,0.22)', 'rgba(15,23,42,0)'] as const;
    case 'leaderboard':
      return ['rgba(212,166,58,0.20)', 'rgba(15,23,42,0)'] as const;
    case 'beta':
      return ['rgba(99,102,241,0.18)', 'rgba(15,23,42,0)'] as const;
    case 'reward':
      return ['rgba(34,211,238,0.18)', 'rgba(15,23,42,0)'] as const;
    case 'legacy':
      return ['rgba(148,163,184,0.18)', 'rgba(15,23,42,0)'] as const;
    case 'premium':
    default:
      return ['rgba(34,211,238,0.20)', 'rgba(15,23,42,0)'] as const;
  }
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: 4, marginBottom: 8 },
  kicker: {
    fontSize: 10,
    fontWeight: '900',
    color: '#67E8F9',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 2,
    fontSize: 20,
    fontWeight: '900',
    color: colors.dark.text,
    letterSpacing: -0.4,
  },
  rail: { paddingVertical: 4 },
  tile: {
    minHeight: 240,
    borderRadius: borderRadius.xl + 2,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.26)',
    overflow: 'hidden',
    position: 'relative',
    padding: 16,
    ...shadows.premiumCard,
  },
  tileGlassWeb: { backgroundColor: 'rgba(15,23,42,0.78)' },
  tileVeil: {},
  tileWash: { position: 'absolute', left: 0, right: 0, top: 0 },
  tileHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  tileBody: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  previewWrap: { width: 96, alignItems: 'center' },
  copy: { flex: 1, minWidth: 0 },
  heroKicker: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#A5F3FC',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  heroTitle: {
    marginTop: 4,
    fontSize: 17,
    fontWeight: '900',
    color: colors.dark.text,
    letterSpacing: -0.3,
  },
  heroCollection: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: colors.dark.textMuted,
  },
  heroPartner: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '900',
    color: '#DDD6FE',
    letterSpacing: 0.2,
  },
  heroCharity: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '900',
    color: '#FDE68A',
    letterSpacing: 0.2,
  },
  tileFoot: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  ctaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#22D3EE',
  },
  ctaPillFree: { backgroundColor: '#86EFAC' },
  ctaPillText: { fontSize: 12.5, fontWeight: '900', letterSpacing: 0.2 },
  ownedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(212,166,58,0.42)',
    backgroundColor: 'rgba(212,166,58,0.16)',
  },
  ownedPillText: { fontSize: 12, fontWeight: '900', color: '#FDE68A', letterSpacing: 0.3 },
});
