import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, borderRadius, layout, typography, pulseverse, shadows, gradients } from '@/theme';
import { pulseImageListThumbProps } from '@/lib/pulseImage';
import { PulseLeaderboards } from '@/components/leaderboards/PulseLeaderboards';
import { useFeatureFlags } from '@/lib/featureFlags';

/** PulseVerse Creator Hub — use a PNG with alpha so the gradient background shows through. */
const CREATOR_HUB_BANNER = require('../../assets/images/pulseverse-creator-hub-banner.png');

type CreateTile = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  bg: string;
  href: string;
};

const CREATOR_HUB_LINKS: { title: string; subtitle: string; href: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  {
    title: 'Record / upload video',
    subtitle: 'PHI checks, thumbnails, optional alt cover (A/B), scheduling',
    href: '/create/video?mode=upload',
    icon: 'videocam-outline',
  },
  {
    title: 'Photo carousel',
    subtitle: 'Layouts, brand kit, carousels',
    href: '/create/image',
    icon: 'images-outline',
  },
];
/** Pulse Shop hub card — purple → indigo → cyan ring (see `gradients.hubShopRing`). */

const GRID: CreateTile[] = [
  {
    title: 'Record Video',
    subtitle: 'Capture a moment',
    icon: 'videocam',
    iconColor: '#A855F7',
    bg: '#A855F718',
    href: '/create/video-camera',
  },
  {
    title: 'Upload Video',
    subtitle: 'Share from gallery',
    icon: 'cloud-upload',
    iconColor: '#22C55E',
    bg: '#22C55E18',
    href: '/create/video?mode=upload',
  },
  {
    title: 'Add Photo / Media',
    subtitle: 'Multi-photo carousels & layouts',
    icon: 'images',
    iconColor: '#3B82F6',
    bg: '#3B82F618',
    href: '/create/image',
  },
];

export default function CreateScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const liveStreaming = useFeatureFlags((s) => s.liveStreaming);

  const openShop = useCallback(() => {
    router.push('/pulse-shop' as any);
  }, [router]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[...pulseverse.screenGradient]} style={StyleSheet.absoluteFill} />
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          onPress={openShop}
          style={styles.headerShopPill}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Open Pulse Shop"
        >
          <Ionicons name="storefront-outline" size={20} color={pulseverse.electric} />
          <Text style={styles.headerShopLabel}>Shop</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        nestedScrollEnabled
      >
        <View style={styles.hero}>
          <Image
            source={CREATOR_HUB_BANNER}
            style={styles.heroBanner}
            contentFit="contain"
            accessibilityLabel="PulseVerse Creator Hub"
            {...pulseImageListThumbProps}
          />
        </View>

        <View style={styles.grid}>
          {GRID.map((tile) => (
            <TouchableOpacity
              key={tile.title}
              style={styles.tile}
              activeOpacity={0.88}
              onPress={() => router.push(tile.href as any)}
            >
              <View style={[styles.tileIcon, { backgroundColor: tile.bg }]}>
                <Ionicons name={tile.icon} size={26} color={tile.iconColor} />
              </View>
              <View style={styles.tileText}>
                <Text style={styles.tileTitle}>{tile.title}</Text>
                <Text style={styles.tileSub}>{tile.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.dark.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.templatesKicker}>Creator toolkit</Text>
        <Text style={styles.templatesLede}>Same tools live inside each composer — jump here if you know what you need.</Text>
        <View style={styles.toolkitList}>
          {CREATOR_HUB_LINKS.map((row) => (
            <TouchableOpacity
              key={row.title}
              style={styles.toolkitRow}
              onPress={() => router.push(row.href as any)}
              activeOpacity={0.88}
            >
              <View style={styles.toolkitIcon}>
                <Ionicons name={row.icon} size={20} color={colors.primary.teal} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.toolkitTitle}>{row.title}</Text>
                <Text style={styles.toolkitSub}>{row.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.dark.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {liveStreaming ? (
          <TouchableOpacity
            style={styles.goLive}
            activeOpacity={0.88}
            onPress={() => router.push('/live/go-live' as any)}
          >
            <View style={styles.goLiveAccent} />
            <View style={styles.goLiveInner}>
              <View style={styles.goLiveIcon}>
                <Ionicons name="radio" size={24} color={LIVE_ACCENT} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.goLiveTitle}>Go Live</Text>
                <Text style={styles.goLiveSub}>Broadcast live</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.dark.textMuted} />
            </View>
          </TouchableOpacity>
        ) : null}

        <View style={styles.leaderboardsWrap}>
          <PulseLeaderboards />
        </View>

        <TouchableOpacity
          activeOpacity={0.92}
          onPress={openShop}
          accessibilityRole="button"
          accessibilityHint="Opens Pulse Shop"
          style={styles.shopCardOuter}
        >
          <LinearGradient
            colors={[...gradients.hubShopRing]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.shopCardRing}
          >
            <View style={styles.shopCardInner}>
              <View style={styles.shopCardTopRow}>
                <View style={styles.shopIconWrap}>
                  <Ionicons name="bag-handle-outline" size={24} color={pulseverse.electric} />
                </View>
                <View style={styles.shopTextCol}>
                  <Text style={styles.shopTitle}>Pulse Shop</Text>
                  <Text style={styles.shopSubtitle}>Borders, rewards, and creator extras.</Text>
                </View>
              </View>
              <View style={styles.shopCtaWrap}>
                <View style={styles.shopCta}>
                  <Text style={styles.shopCtaText}>Open Shop</Text>
                  <Ionicons name="chevron-forward" size={16} color={pulseverse.onElectric} />
                </View>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const LIVE_ACCENT = '#EC4899';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layout.screenPadding,
    paddingBottom: 4,
  },
  headerShopPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: borderRadius.full,
    backgroundColor: pulseverse.sparksPillBg,
    borderWidth: 1,
    borderColor: pulseverse.sparksPillBorder,
  },
  headerShopLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: pulseverse.electric,
    letterSpacing: 0.15,
  },
  scrollView: { flex: 1 },
  scroll: { paddingHorizontal: layout.screenPadding, paddingBottom: 120 },
  hero: {
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 20,
    width: '100%',
  },
  /** Wide horizontal art (~1024×341); transparent PNG blends with screen gradient. */
  heroBanner: {
    width: '100%',
    maxWidth: 560,
    aspectRatio: 1024 / 341,
    maxHeight: 150,
  },
  grid: { gap: layout.sectionGap },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.dark.card,
    borderRadius: borderRadius.card,
    paddingVertical: 16,
    paddingHorizontal: layout.screenPadding,
    borderWidth: 1,
    borderColor: pulseverse.cardRim,
    ...shadows.premiumCard,
  },
  tileIcon: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileText: { flex: 1 },
  tileTitle: {
    ...typography.bodyMedium,
    fontWeight: '800',
    color: colors.dark.text,
    letterSpacing: -0.2,
  },
  tileSub: {
    ...typography.caption,
    fontWeight: '500',
    color: colors.dark.textMuted,
    marginTop: 4,
  },
  goLive: {
    marginTop: layout.sectionGapLarge,
    borderRadius: borderRadius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: pulseverse.cardRim,
    backgroundColor: colors.dark.card,
  },
  goLiveAccent: {
    height: 3,
    width: '100%',
    backgroundColor: LIVE_ACCENT,
    opacity: 0.85,
  },
  goLiveInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: layout.screenPadding,
  },
  goLiveIcon: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.lg,
    backgroundColor: LIVE_ACCENT + '1F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goLiveTitle: {
    ...typography.h4,
    color: colors.dark.text,
  },
  goLiveSub: {
    ...typography.caption,
    fontWeight: '500',
    color: colors.dark.textMuted,
    marginTop: 4,
  },
  templatesKicker: {
    ...typography.caption,
    fontWeight: '800',
    color: pulseverse.electricSoft,
    marginTop: layout.sectionGapLarge,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontSize: 10,
  },
  templatesLede: {
    ...typography.caption,
    color: colors.dark.textSecondary,
    marginTop: 6,
    marginBottom: 10,
  },
  toolkitList: { gap: 8, marginBottom: 8 },
  toolkitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: layout.screenPadding,
    borderRadius: borderRadius.card,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: pulseverse.cardRim,
    ...shadows.subtle,
  },
  toolkitIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary.teal + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolkitTitle: { fontSize: 14, fontWeight: '800', color: colors.dark.text, letterSpacing: -0.15 },
  toolkitSub: { fontSize: 12, color: colors.dark.textMuted, marginTop: 4, lineHeight: 17 },
  leaderboardsWrap: { marginTop: layout.sectionGapLarge },
  shopCardOuter: {
    marginTop: layout.sectionGapLarge,
    borderRadius: borderRadius.card,
    ...shadows.accentEdge,
  },
  shopCardRing: {
    borderRadius: borderRadius.xl + 2,
    padding: 2,
  },
  shopCardInner: {
    borderRadius: borderRadius.xl,
    backgroundColor: colors.dark.card,
    paddingHorizontal: layout.screenPadding,
    paddingTop: 16,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: pulseverse.cardRim,
  },
  shopCardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  shopIconWrap: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(34,211,238,0.1)',
    borderWidth: 1,
    borderColor: pulseverse.sparksPillBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopTextCol: { flex: 1, minWidth: 0 },
  shopTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.dark.text,
    letterSpacing: -0.2,
  },
  shopSubtitle: {
    marginTop: 5,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    color: colors.dark.textSecondary,
  },
  shopCtaWrap: {
    marginTop: 16,
    alignItems: 'flex-end',
  },
  shopCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: borderRadius.button,
    backgroundColor: pulseverse.shopCtaFill,
  },
  shopCtaText: {
    fontSize: 14,
    fontWeight: '900',
    color: pulseverse.onElectric,
    letterSpacing: 0.2,
  },
});
