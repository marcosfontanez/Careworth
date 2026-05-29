import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, borderRadius, layout, spacing, typography, pulseverse } from '@/theme';
import { CreatorHubGlassBackdrop } from '@/components/pv/CreatorHubGlassBackdrop';
import { PROFILE_NEON_BORDER_PRESETS } from '@/components/mypage/ProfileNeonPills';
import { pulseImageFeedHeroProps, pulseImageListThumbProps } from '@/lib/pulseImage';
import { LivePill } from '@/components/live/LivePill';
import { LiveViewerBadge } from '@/components/live/LiveViewerBadge';
import { formatCount } from '@/utils/format';
import type { LiveHubCategoryTab, LiveHubStream, LiveModeType, LiveScheduledEvent } from '@/types/liveHub';

const W = Dimensions.get('window').width;
const TREND_COL_W = (W - layout.screenPadding * 2 - spacing.md) / 2;

function safeMediaUri(uri?: string | null): string | undefined {
  const trimmed = uri?.trim();
  return trimmed ? trimmed : undefined;
}

const HUB_MEDIA_FALLBACK = { backgroundColor: 'rgba(12,18,32,0.92)' } as const;

export function liveModeLabel(mode: LiveModeType): string {
  switch (mode) {
    case 'casual':
      return 'Casual';
    case 'irl':
      return 'IRL';
    case 'gaming':
      return 'Gaming';
    case 'learn':
      return 'Learn';
    case 'shop':
      return 'Shop Live';
    default:
      return 'Live';
  }
}

const FILTER_PRIMARY: LiveHubCategoryTab[] = ['for-you', 'following', 'learn', 'shop'];
const FILTER_OVERFLOW: LiveHubCategoryTab[] = ['casual', 'gaming', 'irl'];

const FILTER_LABELS: Record<LiveHubCategoryTab, string> = {
  'for-you': 'For You',
  following: 'Following',
  casual: 'Casual',
  gaming: 'Gaming',
  irl: 'IRL',
  learn: 'Learn',
  shop: 'Shop Live',
};

const TAB_NEON_PRESET_ORDER: LiveHubCategoryTab[] = [
  'for-you',
  'following',
  'casual',
  'gaming',
  'irl',
  'learn',
  'shop',
];

function neonPresetForTab(id: LiveHubCategoryTab): readonly [string, string] {
  const i = TAB_NEON_PRESET_ORDER.indexOf(id);
  const idx = i >= 0 ? i : 0;
  return PROFILE_NEON_BORDER_PRESETS[idx % PROFILE_NEON_BORDER_PRESETS.length];
}

/**
 * Single discovery rail: primary chips + **More** expands Casual / Gaming / IRL (no duplicate spotlight row).
 * Frosted shell matches Creator Hub / Shop glass.
 */
export function LiveHubCategoryBar({
  active,
  onChange,
  compact = false,
}: {
  active: LiveHubCategoryTab;
  onChange: (t: LiveHubCategoryTab) => void;
  /** Tighter vertical padding when the Live header is collapsed on scroll. */
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(() => FILTER_OVERFLOW.includes(active));

  useEffect(() => {
    if (FILTER_OVERFLOW.includes(active)) setExpanded(true);
  }, [active]);

  const orderedTabs = useMemo(() => {
    const all: LiveHubCategoryTab[] = [
      'for-you',
      'following',
      'casual',
      'gaming',
      'irl',
      'learn',
      'shop',
    ];
    return expanded ? all : FILTER_PRIMARY;
  }, [expanded]);

  const showLess = expanded && FILTER_PRIMARY.includes(active);

  return (
    <View style={styles.chipRailShell}>
      <View style={styles.chipRailGlass} pointerEvents="none">
        <CreatorHubGlassBackdrop borderRadius={0} blurIntensity={28} />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScrollView}
        contentContainerStyle={[styles.chipScrollContent, compact && styles.chipScrollContentCompact]}
      >
        {orderedTabs.map((id) => {
          const on = id === active;
          const preset = neonPresetForTab(id);
          if (on) {
            return (
              <Pressable
                key={id}
                onPress={() => onChange(id)}
                style={({ pressed }) => [pressed && styles.chipNeonPressed]}
                accessibilityRole="tab"
                accessibilityState={{ selected: true }}
              >
                <LinearGradient
                  colors={[preset[0], preset[1]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.chipNeonRing}
                >
                  <View style={styles.chipNeonInner}>
                    <Text style={styles.chipTxtNeon} numberOfLines={1}>
                      {FILTER_LABELS[id]}
                    </Text>
                  </View>
                </LinearGradient>
              </Pressable>
            );
          }
          return (
            <Pressable
              key={id}
              onPress={() => onChange(id)}
              style={styles.chip}
              accessibilityRole="tab"
              accessibilityState={{ selected: false }}
            >
              <Text style={styles.chipTxt} numberOfLines={1}>
                {FILTER_LABELS[id]}
              </Text>
            </Pressable>
          );
        })}
        {!expanded ? (
          <Pressable
            onPress={() => setExpanded(true)}
            style={styles.chipMore}
            accessibilityRole="button"
            accessibilityLabel="More live filters"
          >
            <Text style={styles.chipMoreTxt}>More</Text>
            <Ionicons name="chevron-down" size={14} color={colors.dark.textMuted} />
          </Pressable>
        ) : showLess ? (
          <Pressable
            onPress={() => setExpanded(false)}
            style={styles.chipMore}
            accessibilityRole="button"
            accessibilityLabel="Fewer filters"
          >
            <Text style={styles.chipMoreTxt}>Less</Text>
            <Ionicons name="chevron-up" size={14} color={colors.dark.textMuted} />
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

function modeAccentBorder(mode: LiveModeType): string {
  switch (mode) {
    case 'gaming':
      return 'rgba(139,92,246,0.35)';
    case 'irl':
      return 'rgba(74,222,128,0.35)';
    case 'learn':
      return 'rgba(59,130,246,0.38)';
    case 'shop':
      return 'rgba(251,191,36,0.4)';
    default:
      return 'rgba(56,189,248,0.28)';
  }
}

/** Slim commerce cue under mode tiles — jumps to Shop Live chip filter (mockup “live selling” lane). */
export function LiveShopDealsShortcut({
  dealCount,
  onPress,
}: {
  dealCount: number;
  onPress: () => void;
}) {
  if (dealCount <= 0) return null;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.shopShortcutOuter, pressed && styles.shopShortcutPressed]}
      accessibilityRole="button"
      accessibilityLabel={`Shop live deals, ${dealCount} streams`}
    >
      <View style={styles.shopShortcutGlass} pointerEvents="none">
        <CreatorHubGlassBackdrop borderRadius={borderRadius.xl} blurIntensity={40} />
      </View>
      <LinearGradient
        colors={['rgba(251,191,36,0.12)', 'rgba(251,191,36,0.02)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={styles.shopShortcutRow}>
        <View style={styles.shopShortcutIconWrap}>
          <Ionicons name="bag-handle" size={18} color={colors.primary.gold} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.shopShortcutTitle}>Shop Live deals</Text>
          <Text style={styles.shopShortcutSub}>
            {dealCount} selling now · jump to deals
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.dark.textMuted} />
      </View>
    </Pressable>
  );
}

export function HubTrendingCard({
  stream,
  onPress,
  posterHeight = 200,
}: {
  stream: LiveHubStream;
  onPress: () => void;
  /** Taller tiles read closer to TikTok-style discover mocks. */
  posterHeight?: number;
}) {
  const thumbUri = safeMediaUri(stream.thumbnailUrl);
  const avatarUri = safeMediaUri(stream.host.avatarUrl);

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.trendCard,
        {
          width: TREND_COL_W,
          height: posterHeight,
          borderColor: modeAccentBorder(stream.liveType),
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={stream.title}
    >
      {thumbUri ? (
        <Image
          source={{ uri: thumbUri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          {...pulseImageFeedHeroProps}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, HUB_MEDIA_FALLBACK]} />
      )}
      <LinearGradient
        colors={['rgba(6,14,26,0.1)', 'rgba(6,14,26,0.95)']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.trendTop}>
        <LivePill />
        <LiveViewerBadge count={stream.viewerCount} />
      </View>
      <View style={styles.trendBottom}>
        <View style={[styles.modeTag, { borderColor: modeAccentBorder(stream.liveType) }]}>
          <Text style={styles.modeTagTxt}>{liveModeLabel(stream.liveType)}</Text>
        </View>
        <Text style={styles.trendTitle} numberOfLines={2}>
          {stream.title}
        </Text>
        <View style={styles.trendHost}>
          {avatarUri ? (
            <Image
              source={{ uri: avatarUri }}
              style={styles.trendAv}
              {...pulseImageListThumbProps}
            />
          ) : (
            <View style={[styles.trendAv, HUB_MEDIA_FALLBACK]} />
          )}
          <Text style={styles.trendHostName} numberOfLines={1}>
            {stream.host.displayName}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export function HubShopLiveCard({ stream, onPress }: { stream: LiveHubStream; onPress: () => void }) {
  const dealLabel =
    stream.promoTag?.trim() || (stream.hasProducts ? 'Live Deal' : null);
  const priceLine = stream.products?.[0]?.price?.trim();
  const thumbUri = safeMediaUri(stream.thumbnailUrl);

  return (
    <Pressable style={styles.shopCard} onPress={onPress} accessibilityRole="button">
      {thumbUri ? (
        <Image
          source={{ uri: thumbUri }}
          style={styles.shopThumb}
          contentFit="cover"
          {...pulseImageFeedHeroProps}
        />
      ) : (
        <View style={[styles.shopThumb, HUB_MEDIA_FALLBACK]} />
      )}
      <LinearGradient
        colors={['transparent', 'rgba(6,14,26,0.92)']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.shopTop}>
        <LivePill />
        <LiveViewerBadge count={stream.viewerCount} />
      </View>
      {dealLabel ? (
        <View style={styles.shopDealFloating}>
          <Ionicons name="bag-handle" size={11} color={colors.primary.gold} />
          <Text style={styles.shopDealFloatingTxt} numberOfLines={1}>
            {dealLabel}
          </Text>
        </View>
      ) : null}
      <View style={styles.shopBody}>
        <Text style={styles.shopTitle} numberOfLines={2}>
          {stream.products?.[0]?.title ?? stream.title}
        </Text>
        <Text style={styles.shopMeta} numberOfLines={1}>
          {stream.host.displayName}
        </Text>
        {priceLine ? (
          <Text style={styles.shopPrice} numberOfLines={1}>
            {priceLine}
          </Text>
        ) : (
          <Text style={styles.shopMetaMuted} numberOfLines={1}>
            {formatCount(stream.viewerCount)} watching
          </Text>
        )}
      </View>
    </Pressable>
  );
}

export function upcomingSessionCategoryLabel(ev: LiveScheduledEvent): string {
  if (ev.circleLabel?.trim()) return 'Circle Live';
  if (ev.category === 'panel') return 'Panel';
  if (ev.category === 'shop') return 'Shop Live';
  return liveModeLabel(ev.category as LiveModeType);
}

/** Compact horizontal card for Upcoming rail on Live hub. */
export function HubUpcomingSessionCard({
  ev,
  onRsvp,
  onOpenSession,
}: {
  ev: LiveScheduledEvent;
  onRsvp: () => void;
  onOpenSession?: () => void;
}) {
  const d = new Date(ev.startsAt);
  const month = d.toLocaleDateString(undefined, { month: 'short' }).toUpperCase();
  const dayNum = d.getDate();
  const weekday = d.toLocaleDateString(undefined, { weekday: 'short' });
  const timeStr = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  return (
    <View style={styles.upRailCard}>
      <View style={styles.upRailGlass} pointerEvents="none">
        <CreatorHubGlassBackdrop borderRadius={borderRadius.xl} blurIntensity={34} />
      </View>
      <View style={styles.upRailInner}>
        <Pressable
          style={styles.upRailTapTarget}
          onPress={onOpenSession}
          disabled={!onOpenSession}
          accessibilityRole="button"
          accessibilityLabel={`Open scheduled session: ${ev.title}`}
        >
          <View style={styles.upRailDateCol}>
            <Text style={styles.upRailMonth}>{month}</Text>
            <Text style={styles.upRailDay}>{dayNum}</Text>
          </View>
          <View style={styles.upRailMid}>
            <Text style={styles.upRailCat}>{upcomingSessionCategoryLabel(ev)}</Text>
            <Text style={styles.upRailTitle} numberOfLines={2}>
              {ev.title}
            </Text>
            <Text style={styles.upRailHost} numberOfLines={2}>
              {ev.hostName}
              {ev.hostTitle ? ` · ${ev.hostTitle}` : ''}
            </Text>
            <View style={styles.upRailWhenRow}>
              <Ionicons name="calendar-outline" size={13} color={pulseverse.electric} />
              <Text style={styles.upRailWhenTxt}>
                {weekday} · {timeStr}
              </Text>
            </View>
          </View>
        </Pressable>
        <Pressable onPress={onRsvp} style={styles.upRailBtn} accessibilityRole="button">
          <Text style={styles.upRailBtnTxt}>{ev.rsvpState === 'going' ? 'Saved' : 'Remind Me'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** @deprecated Use {@link HubUpcomingSessionCard} in horizontal rails. */
export function HubUpcomingCard(props: { ev: LiveScheduledEvent; onRsvp: () => void }) {
  return <HubUpcomingSessionCard {...props} />;
}

export function HubCircleLiveCard({ stream, onPress }: { stream: LiveHubStream; onPress: () => void }) {
  const thumbUri = safeMediaUri(stream.thumbnailUrl);

  return (
    <Pressable style={styles.circleCard} onPress={onPress}>
      {thumbUri ? (
        <Image
          source={{ uri: thumbUri }}
          style={styles.circleThumb}
          contentFit="cover"
          {...pulseImageFeedHeroProps}
        />
      ) : (
        <View style={[styles.circleThumb, HUB_MEDIA_FALLBACK]} />
      )}
      <LinearGradient colors={['rgba(6,14,26,0.2)', 'rgba(6,14,26,0.92)']} style={StyleSheet.absoluteFill} />
      <View style={styles.circleTop}>
        <LivePill />
        <LiveViewerBadge count={stream.viewerCount} />
      </View>
      <View style={styles.circleBody}>
        <View style={styles.circleBadge}>
          <Ionicons name="people" size={12} color={pulseverse.electric} />
          <Text style={styles.circleBadgeTxt} numberOfLines={1}>
            {stream.communityName ?? 'Circle'}
          </Text>
        </View>
        <Text style={styles.circleTitle} numberOfLines={2}>
          {stream.title}
        </Text>
        <Text style={styles.circleHost} numberOfLines={1}>
          {stream.host.displayName}
        </Text>
      </View>
    </Pressable>
  );
}

export function StartLivePromoCard({ onGoLive }: { onGoLive: () => void }) {
  return (
    <LinearGradient
      colors={['rgba(88,28,135,0.45)', 'rgba(15,23,42,0.94)', 'rgba(34,211,238,0.18)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.promoCard}
    >
      <Text style={styles.promoTitle}>Create Something Live</Text>
      <Text style={styles.promoSub}>
        Stream, teach, sell, or build your community — all in one trusted space.
      </Text>
      <Pressable onPress={onGoLive} style={styles.promoCta} accessibilityRole="button">
        <Ionicons name="videocam" size={18} color={colors.dark.bg} />
        <Text style={styles.promoCtaTxt}>Go Live</Text>
      </Pressable>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  chipRailShell: {
    flexGrow: 0,
    flexShrink: 0,
    position: 'relative',
    overflow: 'hidden',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(56,189,248,0.14)',
  },
  chipRailGlass: { ...StyleSheet.absoluteFillObject },
  chipScrollView: {
    flexGrow: 0,
    zIndex: 1,
  },
  chipScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm,
  },
  chipScrollContentCompact: {
    paddingVertical: spacing.sm,
  },
  chipMore: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.22)',
    backgroundColor: 'rgba(18,26,44,0.45)',
  },
  chipMoreTxt: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '700',
    color: colors.dark.textSecondary,
  },
  chip: {
    flexShrink: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.28)',
    backgroundColor: 'rgba(18,26,44,0.38)',
  },
  chipNeonRing: {
    borderRadius: borderRadius.full,
    padding: 1.5,
    flexShrink: 0,
  },
  chipNeonInner: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(6,14,26,0.94)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  chipNeonPressed: { opacity: 0.9 },
  chipTxt: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '600',
    color: colors.dark.textMuted,
  },
  chipTxtNeon: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '800',
    color: '#A5F3FC',
    letterSpacing: 0.2,
  },

  shopShortcutOuter: {
    flexGrow: 0,
    marginHorizontal: layout.screenPadding,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.28)',
    position: 'relative',
  },
  shopShortcutGlass: { ...StyleSheet.absoluteFillObject },
  shopShortcutPressed: { opacity: 0.92 },
  shopShortcutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    zIndex: 1,
  },
  shopShortcutIconWrap: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,23,42,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.25)',
  },
  shopShortcutTitle: {
    ...typography.h3,
    fontSize: 14,
    fontWeight: '800',
    color: colors.dark.text,
  },
  shopShortcutSub: {
    ...typography.caption,
    fontSize: 11,
    color: colors.dark.textMuted,
    marginTop: 2,
  },

  trendCard: {
    borderRadius: borderRadius['2xl'],
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.12)',
  },
  trendTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.sm,
  },
  trendBottom: { flex: 1, justifyContent: 'flex-end', padding: spacing.sm },
  modeTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(6,14,26,0.55)',
    borderWidth: 1,
    marginBottom: 6,
  },
  modeTagTxt: { fontSize: 10, fontWeight: '800', color: pulseverse.electric, letterSpacing: 0.6 },
  trendTitle: { ...typography.h3, fontSize: 14, color: '#FFF', marginBottom: 6 },
  trendHost: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trendAv: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  trendHostName: { flex: 1, ...typography.caption, color: colors.dark.textSecondary, fontWeight: '600' },

  shopCard: {
    width: 220,
    height: 260,
    marginRight: spacing.md,
    borderRadius: borderRadius['2xl'],
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.25)',
    backgroundColor: colors.dark.cardAlt,
  },
  shopThumb: { ...StyleSheet.absoluteFillObject },
  shopTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.sm,
    zIndex: 2,
  },
  shopDealFloating: {
    position: 'absolute',
    left: spacing.sm,
    bottom: 108,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    maxWidth: '78%',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(251,191,36,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.5)',
    zIndex: 2,
  },
  shopDealFloatingTxt: {
    flex: 1,
    fontSize: 10,
    fontWeight: '900',
    color: colors.primary.gold,
    letterSpacing: 0.4,
  },
  shopBody: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.md,
  },
  shopTitle: { ...typography.h3, fontSize: 15, color: '#FFF', marginBottom: 4 },
  shopMeta: { ...typography.caption, color: colors.dark.textSecondary },
  shopPrice: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary.gold,
    marginTop: 4,
  },
  shopMetaMuted: {
    ...typography.caption,
    fontSize: 11,
    color: 'rgba(248,250,252,0.55)',
    marginTop: 4,
  },

  upRailCard: {
    width: 300,
    marginRight: spacing.md,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.2)',
    position: 'relative',
  },
  upRailGlass: { ...StyleSheet.absoluteFillObject },
  upRailInner: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
    padding: spacing.md,
    zIndex: 1,
  },
  upRailTapTarget: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
    minWidth: 0,
  },
  upRailDateCol: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(56,189,248,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.25)',
  },
  upRailMonth: {
    fontSize: 9,
    fontWeight: '900',
    color: pulseverse.electric,
    letterSpacing: 0.6,
  },
  upRailDay: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.dark.text,
    marginTop: 2,
  },
  upRailMid: { flex: 1, minWidth: 0 },
  upRailCat: {
    fontSize: 9,
    fontWeight: '900',
    color: pulseverse.electric,
    letterSpacing: 0.9,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  upRailTitle: { ...typography.h3, fontSize: 14, color: colors.dark.text, lineHeight: 18 },
  upRailHost: { ...typography.caption, color: colors.dark.textMuted, marginTop: 4, fontSize: 11 },
  upRailWhenRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  upRailWhenTxt: { ...typography.caption, fontSize: 11, color: colors.dark.textSecondary, fontWeight: '600' },
  upRailBtn: {
    alignSelf: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 9,
    borderRadius: borderRadius.button,
    borderWidth: 1,
    borderColor: pulseverse.electric + '55',
    backgroundColor: 'rgba(56,189,248,0.1)',
    maxWidth: 84,
  },
  upRailBtnTxt: { ...typography.button, fontSize: 11, color: pulseverse.electric, textAlign: 'center' },

  circleCard: {
    width: 260,
    height: 148,
    marginRight: spacing.md,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.14)',
  },
  circleThumb: { ...StyleSheet.absoluteFillObject },
  circleTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.sm,
    zIndex: 2,
  },
  circleBody: { flex: 1, justifyContent: 'flex-end', padding: spacing.md },
  circleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(6,14,26,0.55)',
    marginBottom: 6,
  },
  circleBadgeTxt: { fontSize: 11, fontWeight: '700', color: colors.dark.text, maxWidth: 180 },
  circleTitle: { ...typography.h3, fontSize: 14, color: '#FFF' },
  circleHost: { ...typography.caption, color: colors.dark.textSecondary, marginTop: 4 },

  promoCard: {
    marginHorizontal: layout.screenPadding,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.22)',
    marginBottom: spacing.xl,
  },
  promoTitle: { ...typography.h3, fontSize: 17, fontWeight: '800', color: colors.dark.text, letterSpacing: -0.3 },
  promoSub: { ...typography.body, color: colors.dark.textMuted, marginTop: spacing.sm, lineHeight: 22 },
  promoCta: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: borderRadius.full,
    backgroundColor: pulseverse.electric,
  },
  promoCtaTxt: { ...typography.button, color: colors.dark.bg, fontWeight: '800' },
});
