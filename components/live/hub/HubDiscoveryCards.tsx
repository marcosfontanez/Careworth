import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, borderRadius, layout, spacing, typography, pulseverse } from '@/theme';
import { pulseImageFeedHeroProps, pulseImageListThumbProps } from '@/lib/pulseImage';
import { LivePill } from '@/components/live/LivePill';
import { LiveViewerBadge } from '@/components/live/LiveViewerBadge';
import { formatCount } from '@/utils/format';
import type { LiveHubCategoryTab, LiveHubStream, LiveModeType, LiveScheduledEvent } from '@/types/liveHub';

const W = Dimensions.get('window').width;
const TREND_COL_W = (W - layout.screenPadding * 2 - spacing.md) / 2;

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

export function LiveHubCategoryBar({
  active,
  onChange,
}: {
  active: LiveHubCategoryTab;
  onChange: (t: LiveHubCategoryTab) => void;
}) {
  const tabs: { id: LiveHubCategoryTab; label: string }[] = [
    { id: 'for-you', label: 'For You' },
    { id: 'following', label: 'Following' },
    { id: 'gaming', label: 'Gaming' },
    { id: 'irl', label: 'IRL' },
    { id: 'learn', label: 'Learn' },
    { id: 'shop', label: 'Shop Live' },
  ];
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipScroll}
    >
      {tabs.map((t) => {
        const on = t.id === active;
        return (
          <Pressable
            key={t.id}
            onPress={() => onChange(t.id)}
            style={[styles.chip, on && styles.chipOn]}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
          >
            <Text style={[styles.chipTxt, on && styles.chipTxtOn]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function HubTrendingCard({ stream, onPress }: { stream: LiveHubStream; onPress: () => void }) {
  const h = 200;
  return (
    <Pressable
      onPress={onPress}
      style={[styles.trendCard, { width: TREND_COL_W, height: h }]}
      accessibilityRole="button"
      accessibilityLabel={stream.title}
    >
      <Image
        source={{ uri: stream.thumbnailUrl }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        {...pulseImageFeedHeroProps}
      />
      <LinearGradient
        colors={['rgba(6,14,26,0.1)', 'rgba(6,14,26,0.95)']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.trendTop}>
        <LivePill />
        <LiveViewerBadge count={stream.viewerCount} />
      </View>
      <View style={styles.trendBottom}>
        <View style={styles.modeTag}>
          <Text style={styles.modeTagTxt}>{liveModeLabel(stream.liveType)}</Text>
        </View>
        <Text style={styles.trendTitle} numberOfLines={2}>
          {stream.title}
        </Text>
        <View style={styles.trendHost}>
          <Image
            source={{ uri: stream.host.avatarUrl }}
            style={styles.trendAv}
            {...pulseImageListThumbProps}
          />
          <Text style={styles.trendHostName} numberOfLines={1}>
            {stream.host.displayName}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export function HubShopLiveCard({ stream, onPress }: { stream: LiveHubStream; onPress: () => void }) {
  return (
    <Pressable style={styles.shopCard} onPress={onPress} accessibilityRole="button">
      <Image
        source={{ uri: stream.thumbnailUrl }}
        style={styles.shopThumb}
        contentFit="cover"
        {...pulseImageFeedHeroProps}
      />
      <LinearGradient
        colors={['transparent', 'rgba(6,14,26,0.92)']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.shopTop}>
        <LivePill />
        {stream.promoTag ? (
          <View style={styles.dealTag}>
            <Text style={styles.dealTagTxt}>{stream.promoTag}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.shopBody}>
        <Text style={styles.shopTitle} numberOfLines={2}>
          {stream.products?.[0]?.title ?? stream.title}
        </Text>
        <Text style={styles.shopMeta} numberOfLines={1}>
          {stream.host.displayName} · {formatCount(stream.viewerCount)} watching
        </Text>
      </View>
    </Pressable>
  );
}

export function HubUpcomingCard({
  ev,
  onRsvp,
}: {
  ev: LiveScheduledEvent;
  onRsvp: () => void;
}) {
  const d = new Date(ev.startsAt);
  const dateStr = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const timeStr = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return (
    <View style={styles.upCard}>
      <View style={styles.upLeft}>
        <Text style={styles.upCat}>{ev.category === 'panel' ? 'Panel' : 'Learn'}</Text>
        <Text style={styles.upTitle} numberOfLines={2}>
          {ev.title}
        </Text>
        <Text style={styles.upHost} numberOfLines={1}>
          {ev.hostName}
          {ev.hostTitle ? ` · ${ev.hostTitle}` : ''}
        </Text>
        <Text style={styles.upWhen}>
          {dateStr} · {timeStr}
        </Text>
      </View>
      <Pressable onPress={onRsvp} style={styles.upBtn} accessibilityRole="button">
        <Text style={styles.upBtnTxt}>{ev.rsvpState === 'going' ? 'Saved' : 'Remind Me'}</Text>
      </Pressable>
    </View>
  );
}

export function HubCircleLiveCard({ stream, onPress }: { stream: LiveHubStream; onPress: () => void }) {
  return (
    <Pressable style={styles.circleCard} onPress={onPress}>
      <Image
        source={{ uri: stream.thumbnailUrl }}
        style={styles.circleThumb}
        contentFit="cover"
        {...pulseImageFeedHeroProps}
      />
      <LinearGradient colors={['rgba(6,14,26,0.2)', 'rgba(6,14,26,0.92)']} style={StyleSheet.absoluteFill} />
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
      colors={['rgba(56,189,248,0.16)', 'rgba(99,102,241,0.14)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.promoCard}
    >
      <Text style={styles.promoTitle}>Start Your Own Live</Text>
      <Text style={styles.promoSub}>
        Host a stream, teach a class, sell a product, or build your community — all in one trusted space.
      </Text>
      <Pressable onPress={onGoLive} style={styles.promoCta} accessibilityRole="button">
        <Ionicons name="videocam" size={18} color={colors.dark.bg} />
        <Text style={styles.promoCtaTxt}>Go Live</Text>
      </Pressable>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  chipScroll: {
    paddingHorizontal: layout.screenPadding,
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
    backgroundColor: 'rgba(15,23,42,0.55)',
  },
  chipOn: {
    borderColor: pulseverse.electric + '88',
    backgroundColor: 'rgba(56,189,248,0.12)',
  },
  chipTxt: { ...typography.caption, fontWeight: '600', color: colors.dark.textMuted },
  chipTxtOn: { color: colors.dark.text },

  trendCard: {
    borderRadius: borderRadius.xl,
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
    borderColor: 'rgba(56,189,248,0.35)',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.sm,
  },
  dealTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(251,191,36,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.45)',
  },
  dealTagTxt: { fontSize: 10, fontWeight: '800', color: colors.primary.gold },
  shopBody: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.md,
  },
  shopTitle: { ...typography.h3, fontSize: 15, color: '#FFF', marginBottom: 4 },
  shopMeta: { ...typography.caption, color: colors.dark.textSecondary },

  upCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.14)',
    backgroundColor: 'rgba(15,23,42,0.72)',
    marginBottom: spacing.sm,
    marginHorizontal: layout.screenPadding,
  },
  upLeft: { flex: 1 },
  upCat: { fontSize: 10, fontWeight: '800', color: pulseverse.electric, letterSpacing: 1, marginBottom: 4 },
  upTitle: { ...typography.h3, fontSize: 16, color: colors.dark.text },
  upHost: { ...typography.caption, color: colors.dark.textMuted, marginTop: 4 },
  upWhen: { ...typography.caption, color: colors.dark.textSecondary, marginTop: 6, fontWeight: '600' },
  upBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: borderRadius.button,
    borderWidth: 1,
    borderColor: pulseverse.electric + '55',
    backgroundColor: 'rgba(56,189,248,0.12)',
  },
  upBtnTxt: { ...typography.button, fontSize: 12, color: pulseverse.electric },

  circleCard: {
    width: 260,
    height: 140,
    marginRight: spacing.md,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.14)',
  },
  circleThumb: { ...StyleSheet.absoluteFillObject },
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
    padding: spacing.lg,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.22)',
    marginBottom: spacing.xl,
  },
  promoTitle: { ...typography.h3, fontSize: 18, color: colors.dark.text },
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
