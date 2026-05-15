import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, borderRadius, layout, typography, pulseverse, shadows, spacing, tabBarScrollPaddingBottom } from '@/theme';
import { pulseImageListThumbProps } from '@/lib/pulseImage';
import { PulseLeaderboards } from '@/components/leaderboards/PulseLeaderboards';
import { useFeatureFlags } from '@/lib/featureFlags';
import { ShopEntryCard } from '@/components/shop/premium/ShopEntryCard';
import { CreatorHubGlassBackdrop } from '@/components/pv/CreatorHubGlassBackdrop';
import { PVSectionHeader } from '@/components/pv/PVSectionHeader';

function CreatorHubSectionLeading({
  icon,
  accent,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
}) {
  return (
    <LinearGradient
      colors={[`${accent}40`, `${accent}14`]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hubLeadGrad}
    >
      <View style={[styles.hubLeadInner, { borderColor: `${accent}55` }]}>
        <Ionicons name={icon} size={20} color={accent} />
      </View>
    </LinearGradient>
  );
}

function HubSectionDivider() {
  return (
    <View style={styles.hubSectionDivider}>
      <View style={styles.hubSectionDividerLine} />
      <View style={styles.hubSectionDividerJewel} />
      <View style={styles.hubSectionDividerLine} />
    </View>
  );
}

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

const GRID: CreateTile[] = [
  {
    title: 'Record Video',
    subtitle: 'Capture a moment',
    icon: 'videocam',
    iconColor: pulseverse.hubTilePurple,
    bg: pulseverse.hubTilePurpleBg,
    href: '/create/video-camera',
  },
  {
    title: 'Upload Video',
    subtitle: 'Share from gallery',
    icon: 'cloud-upload',
    iconColor: pulseverse.hubTileGreen,
    bg: pulseverse.hubTileGreenBg,
    href: '/create/video?mode=upload',
  },
  {
    title: 'Add Photo / Media',
    subtitle: 'Multi-photo carousels & layouts',
    icon: 'images',
    iconColor: pulseverse.hubTileBlue,
    bg: pulseverse.hubTileBlueBg,
    href: '/create/image',
  },
];

export default function CreateScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const liveStreaming = useFeatureFlags((s) => s.liveStreaming);
  const hubFocused = useIsFocused();

  const openShop = useCallback(() => {
    router.push('/pulse-shop' as any);
  }, [router]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[...pulseverse.screenGradient]} style={StyleSheet.absoluteFill} />
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          onPress={openShop}
          style={styles.headerShopPill}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Open Pulse Shop"
        >
          <CreatorHubGlassBackdrop borderRadius={borderRadius.full} blurIntensity={36} />
          <View style={styles.headerShopPillInner}>
            <Ionicons name="storefront-outline" size={20} color={pulseverse.electric} />
            <Text style={styles.headerShopLabel}>Shop</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: tabBarScrollPaddingBottom(insets.bottom) + spacing.lg },
        ]}
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

        <View style={styles.hubBlockShop}>
          <ShopEntryCard onPress={openShop} motionActive={hubFocused} />
        </View>

        <HubSectionDivider />

        <View style={styles.hubSection}>
          <PVSectionHeader
            leading={<CreatorHubSectionLeading icon="film-outline" accent={pulseverse.hubTilePurple} />}
            kicker="Create"
            title="Videos & photos"
            subtitle="Capture or upload video, build photo layouts, and open Advanced tools for series posts, B-roll queues, and duet layouts — one composer pipeline."
          />
          <View style={styles.hubPanel}>
            <CreatorHubGlassBackdrop borderRadius={borderRadius['2xl']} blurIntensity={44} />
            <View style={styles.hubPanelForeground}>
              <View style={styles.grid}>
                {GRID.map((tile) => (
                  <TouchableOpacity
                    key={tile.title}
                    style={styles.tile}
                    activeOpacity={0.88}
                    onPress={() => router.push(tile.href as any)}
                  >
                    <CreatorHubGlassBackdrop borderRadius={borderRadius.card} blurIntensity={28} />
                    <View style={styles.tileForeground}>
                      <View style={[styles.tileIcon, { backgroundColor: tile.bg }]}>
                        <Ionicons name={tile.icon} size={26} color={tile.iconColor} />
                      </View>
                      <View style={styles.tileText}>
                        <Text style={styles.tileTitle}>{tile.title}</Text>
                        <Text style={styles.tileSub}>{tile.subtitle}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.dark.textMuted} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        {liveStreaming ? (
          <View style={styles.hubSection}>
            <PVSectionHeader
              leading={<CreatorHubSectionLeading icon="radio-outline" accent={pulseverse.livePink} />}
              kicker="Live"
              title="Broadcast"
              subtitle="Go live to your audience with the PulseVerse live stack."
            />
            <View style={styles.hubPanelFlush}>
              <CreatorHubGlassBackdrop borderRadius={borderRadius['2xl']} blurIntensity={44} />
              <TouchableOpacity
                style={styles.goLive}
                activeOpacity={0.88}
                onPress={() => router.push('/live/go-live' as any)}
              >
                <View style={styles.goLiveAccent} />
                <View style={styles.goLiveInner}>
                  <View style={styles.goLiveIcon}>
                    <Ionicons name="radio" size={24} color={pulseverse.livePink} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.goLiveTitle}>Go Live</Text>
                    <Text style={styles.goLiveSub}>Broadcast live</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.dark.textMuted} />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        <HubSectionDivider />

        <View style={styles.hubSection}>
          <PVSectionHeader
            leading={<CreatorHubSectionLeading icon="trophy-outline" accent={pulseverse.storeAccent} />}
            kicker="Community"
            title="Pulse leaderboards"
            subtitle="Monthly rankings, lifetime honors, and top creators on PulseVerse."
          />
          <PulseLeaderboards />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.xs,
  },
  headerShopPill: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: pulseverse.sparksPillBorder,
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.22,
        shadowRadius: 10,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  headerShopPillInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm - 2,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md + 2,
    zIndex: 1,
  },
  headerShopLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: pulseverse.electric,
    letterSpacing: 0.15,
  },
  scrollView: { flex: 1 },
  scroll: { paddingHorizontal: layout.screenPadding },
  hubBlockShop: {
    marginTop: spacing.md,
    marginBottom: spacing['2xl'],
  },
  hubSectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing['2xl'],
    paddingHorizontal: spacing.xs,
    opacity: 0.95,
  },
  hubSectionDividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(148,163,184,0.22)',
  },
  hubSectionDividerJewel: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(56,189,248,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    ...Platform.select({
      ios: {
        shadowColor: pulseverse.electric,
        shadowOpacity: 0.65,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 0 },
      },
      default: {},
    }),
  },
  hubSection: {
    marginBottom: spacing['4xl'],
    gap: spacing.lg,
  },
  hubLeadGrad: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    padding: 1.5,
  },
  hubLeadInner: {
    flex: 1,
    borderRadius: borderRadius.lg - 2,
    backgroundColor: 'rgba(6,14,26,0.88)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubPanel: {
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.20)',
    overflow: 'hidden',
    position: 'relative',
    ...shadows.subtle,
  },
  hubPanelForeground: {
    padding: spacing.lg,
    position: 'relative',
    zIndex: 1,
  },
  hubPanelFlush: {
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.18)',
    overflow: 'hidden',
    position: 'relative',
    ...shadows.subtle,
  },
  hero: {
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: spacing.xl,
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
    position: 'relative',
    overflow: 'hidden',
    flexDirection: 'column',
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.18)',
    ...shadows.subtle,
  },
  tileForeground: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: spacing.lg,
    position: 'relative',
    zIndex: 1,
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
    position: 'relative',
    zIndex: 1,
    overflow: 'hidden',
    borderRadius: borderRadius['2xl'],
    backgroundColor: 'transparent',
  },
  goLiveAccent: {
    height: 3,
    width: '100%',
    backgroundColor: pulseverse.livePink,
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
    backgroundColor: pulseverse.livePink + '1F',
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
});
