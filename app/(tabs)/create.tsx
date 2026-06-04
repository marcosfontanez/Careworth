import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
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
import { liveGoLiveHref } from '@/lib/navigation/liveRoutes';
import { ShopEntryCard } from '@/components/shop/premium/ShopEntryCard';
import { CreatorHubGlassBackdrop } from '@/components/pv/CreatorHubGlassBackdrop';
import { PVSectionHeader } from '@/components/pv/PVSectionHeader';
import { loadDraft, draftDataHasContent } from '@/lib/drafts';

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

/** Thin top-edge color glow — defines card boundaries without heavy neon rings. */
function CreatorHubTileTopSheen({
  accent,
  radius,
  height = 5,
}: {
  accent: string;
  radius: number;
  height?: number;
}) {
  return (
    <LinearGradient
      colors={[`${accent}EE`, `${accent}38`, `${accent}00`]}
      locations={[0, 0.42, 1]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      pointerEvents="none"
      style={[
        styles.tileTopSheen,
        {
          height,
          borderTopLeftRadius: radius,
          borderTopRightRadius: radius,
        },
      ]}
    />
  );
}

/** PulseVerse Creator Hub — use a PNG with alpha so the gradient background shows through. */
const CREATOR_HUB_BANNER = require('../../assets/images/pulseverse-creator-hub-banner.png');

export default function CreateScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const liveStreaming = useFeatureFlags((s) => s.liveStreaming);
  /**
   * Beta-stability gates. Each tile that smoke tests flagged as broken or
   * unfinished is now feature-flagged so the Creator Hub never shows a dead
   * affordance. See `defaultCreatorHub*` in `lib/featureFlags.ts` for defaults.
   *   - `creatorHubFeedDiscussion`  → "Feed discussion" tile  (issue #4, hide for beta)
   *   - `creatorHubCombineClips`    → "Combine clips" + B-roll alt link  (issue #5)
   */
  const showFeedDiscussion = useFeatureFlags((s) => s.creatorHubFeedDiscussion);
  const showCombineClips = useFeatureFlags((s) => s.creatorHubCombineClips);
  const showBrollStudio = useFeatureFlags((s) => s.creatorBrollStudio);
  // Green Screen + Cutout are now modes inside B-roll Studio (no separate tiles).
  // Their flags only adjust the unified tile's subtitle copy.
  const showOverlayMode = useFeatureFlags((s) => s.creatorOverlayPip);
  const showGreenScreenMode = useFeatureFlags((s) => s.creatorGreenScreenStudio);
  const showCutoutMode = useFeatureFlags((s) => s.creatorCutoutOverlay);
  const showTemplateStudio = useFeatureFlags((s) => s.creatorTemplateStudio);
  const hubFocused = useIsFocused();

  const brollStudioSubtitle = useMemo(() => {
    const modes = ['Cutaways'];
    if (showOverlayMode) modes.push('overlays');
    if (showGreenScreenMode) modes.push('green screen');
    if (showCutoutMode) modes.push('cutouts');
    if (modes.length === 1) return 'Add cutaway clips over your main video';
    if (modes.length === 2) return `${modes[0]} and ${modes[1]}`;
    return `${modes.slice(0, -1).join(', ')}, and ${modes[modes.length - 1]}`;
  }, [showOverlayMode, showGreenScreenMode, showCutoutMode]);

  const [videoDraft, setVideoDraft] = useState(false);
  const [imageDraft, setImageDraft] = useState(false);

  useEffect(() => {
    if (!hubFocused) return;
    let cancelled = false;
    (async () => {
      const [v, i] = await Promise.all([loadDraft('video'), loadDraft('image')]);
      if (cancelled) return;
      setVideoDraft(draftDataHasContent(v));
      setImageDraft(draftDataHasContent(i));
    })();
    return () => {
      cancelled = true;
    };
  }, [hubFocused]);

  const draftCount = (videoDraft ? 1 : 0) + (imageDraft ? 1 : 0);

  const openShop = useCallback(() => {
    router.push('/pulse-shop' as any);
  }, [router]);

  const openDrafts = useCallback(() => {
    if (videoDraft && !imageDraft) {
      router.push('/create/video' as any);
      return;
    }
    if (imageDraft && !videoDraft) {
      router.push('/create/image' as any);
      return;
    }
    if (videoDraft && imageDraft) {
      Alert.alert('Resume draft', 'Choose which draft to open.', [
        { text: 'Video', onPress: () => router.push('/create/video' as any) },
        { text: 'Photo', onPress: () => router.push('/create/image' as any) },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return;
    }
    Alert.alert(
      'Drafts',
      'No drafts yet. While you work on a video or photo post, PulseVerse saves your progress automatically — come back here anytime to continue.',
    );
  }, [router, videoDraft, imageDraft]);

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

        <View style={styles.hubSection}>
          <PVSectionHeader
            leading={<CreatorHubSectionLeading icon="film-outline" accent={pulseverse.hubTilePurple} />}
            kicker="Create"
            title="Start creating"
            subtitle="Record or upload, add photos, start a feed discussion, or combine clips into one merged post. Thumbnails, schedules, and extra polish live under Advanced on the video screen."
          />
          <View style={styles.hubPanel}>
            <CreatorHubGlassBackdrop borderRadius={borderRadius['2xl']} blurIntensity={44} />
            <View style={styles.hubPanelForeground}>
              <View style={styles.heroPairRow}>
                <TouchableOpacity
                  style={styles.heroTile}
                  activeOpacity={0.88}
                  onPress={() => router.push('/create/video-camera' as any)}
                  accessibilityRole="button"
                  accessibilityLabel="Record video"
                >
                  <CreatorHubGlassBackdrop borderRadius={borderRadius.card} blurIntensity={28} />
                  <CreatorHubTileTopSheen accent={pulseverse.hubTilePurple} radius={borderRadius.card} />
                  <View style={styles.heroTileForeground}>
                    <View style={[styles.heroTileIcon, { backgroundColor: pulseverse.hubTilePurpleBg }]}>
                      <Ionicons name="videocam" size={28} color={pulseverse.hubTilePurple} />
                    </View>
                    <Text style={styles.heroTileTitle}>Record</Text>
                    <Text style={styles.heroTileSub}>Camera</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.heroTile}
                  activeOpacity={0.88}
                  onPress={() => router.push('/create/video?mode=upload' as any)}
                  accessibilityRole="button"
                  accessibilityLabel="Upload video"
                >
                  <CreatorHubGlassBackdrop borderRadius={borderRadius.card} blurIntensity={28} />
                  <CreatorHubTileTopSheen accent={pulseverse.hubTileGreen} radius={borderRadius.card} />
                  <View style={styles.heroTileForeground}>
                    <View style={[styles.heroTileIcon, { backgroundColor: pulseverse.hubTileGreenBg }]}>
                      <Ionicons name="cloud-upload" size={28} color={pulseverse.hubTileGreen} />
                    </View>
                    <Text style={styles.heroTileTitle}>Upload</Text>
                    <Text style={styles.heroTileSub}>Gallery</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.photoTile}
                activeOpacity={0.88}
                onPress={() => router.push('/create/image' as any)}
                accessibilityRole="button"
                accessibilityLabel="Add photo or carousel"
              >
                <CreatorHubGlassBackdrop borderRadius={borderRadius.card} blurIntensity={28} />
                <CreatorHubTileTopSheen accent={pulseverse.hubTileBlue} radius={borderRadius.card} />
                <View style={styles.tileForeground}>
                  <View style={[styles.tileIcon, { backgroundColor: pulseverse.hubTileBlueBg }]}>
                    <Ionicons name="images" size={26} color={pulseverse.hubTileBlue} />
                  </View>
                  <View style={styles.tileText}>
                    <Text style={styles.tileTitle}>Photo / carousel</Text>
                    <Text style={styles.tileSub}>Layouts & multi-photo posts</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.dark.textMuted} />
                </View>
              </TouchableOpacity>

              {showFeedDiscussion ? (
                <TouchableOpacity
                  style={styles.photoTile}
                  activeOpacity={0.88}
                  onPress={() => router.push('/create/text' as any)}
                  accessibilityRole="button"
                  accessibilityLabel="Feed discussion — text post for main feed"
                >
                  <CreatorHubGlassBackdrop borderRadius={borderRadius.card} blurIntensity={28} />
                  <CreatorHubTileTopSheen accent={colors.primary.teal} radius={borderRadius.card} />
                  <View style={styles.tileForeground}>
                    <View
                      style={[
                        styles.tileIcon,
                        {
                          backgroundColor: 'rgba(45,212,191,0.12)',
                          borderWidth: 1,
                          borderColor: 'rgba(45,212,191,0.28)',
                        },
                      ]}
                    >
                      <Ionicons name="chatbubbles-outline" size={26} color={colors.primary.teal} />
                    </View>
                    <View style={styles.tileText}>
                      <Text style={styles.tileTitle}>Feed discussion</Text>
                      <Text style={styles.tileSub}>
                        Text for For You / Following — separate from My Pulse Thoughts (profile tab)
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.dark.textMuted} />
                  </View>
                </TouchableOpacity>
              ) : null}

              {showCombineClips ? (
                <>
                  <TouchableOpacity
                    style={styles.photoTile}
                    activeOpacity={0.88}
                    onPress={() => router.push('/create/video?openStitch=series' as any)}
                    accessibilityRole="button"
                    accessibilityLabel="Combine video clips"
                  >
                    <CreatorHubGlassBackdrop borderRadius={borderRadius.card} blurIntensity={28} />
                    <CreatorHubTileTopSheen accent={pulseverse.electric} radius={borderRadius.card} />
                    <View style={styles.tileForeground}>
                      <View
                        style={[
                          styles.tileIcon,
                          { backgroundColor: 'rgba(56,189,248,0.14)', borderWidth: 1, borderColor: 'rgba(56,189,248,0.28)' },
                        ]}
                      >
                        <Ionicons name="git-merge-outline" size={26} color={pulseverse.electric} />
                      </View>
                      <View style={styles.tileText}>
                        <Text style={styles.tileTitle}>Combine clips</Text>
                        <Text style={styles.tileSub}>Join multiple clips into one video · merged on the server</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.dark.textMuted} />
                    </View>
                  </TouchableOpacity>
                </>
              ) : null}

              {showBrollStudio ? (
                <TouchableOpacity
                  style={styles.photoTile}
                  activeOpacity={0.88}
                  onPress={() => router.push('/create/broll-studio' as any)}
                  accessibilityRole="button"
                  accessibilityLabel="Open B-roll Studio"
                >
                  <CreatorHubGlassBackdrop borderRadius={borderRadius.card} blurIntensity={28} />
                  <CreatorHubTileTopSheen accent={pulseverse.storeAccent} radius={borderRadius.card} />
                  <View style={styles.tileForeground}>
                    <View
                      style={[
                        styles.tileIcon,
                        { backgroundColor: 'rgba(231,201,117,0.14)', borderWidth: 1, borderColor: 'rgba(231,201,117,0.30)' },
                      ]}
                    >
                      <Ionicons name="film-outline" size={26} color={pulseverse.storeAccent} />
                    </View>
                    <View style={styles.tileText}>
                      <Text style={styles.tileTitle}>B-roll Studio</Text>
                      <Text style={styles.tileSub}>{brollStudioSubtitle}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.dark.textMuted} />
                  </View>
                </TouchableOpacity>
              ) : null}

              {showTemplateStudio ? (
                <TouchableOpacity
                  style={styles.photoTile}
                  activeOpacity={0.88}
                  onPress={() => router.push('/create/templates' as any)}
                  accessibilityRole="button"
                  accessibilityLabel="Open Creator Templates"
                >
                  <CreatorHubGlassBackdrop borderRadius={borderRadius.card} blurIntensity={28} />
                  <CreatorHubTileTopSheen accent={colors.primary.teal} radius={borderRadius.card} />
                  <View style={styles.tileForeground}>
                    <View
                      style={[
                        styles.tileIcon,
                        { backgroundColor: 'rgba(25,211,197,0.14)', borderWidth: 1, borderColor: 'rgba(25,211,197,0.30)' },
                      ]}
                    >
                      <Ionicons name="grid-outline" size={26} color={colors.primary.teal} />
                    </View>
                    <View style={styles.tileText}>
                      <Text style={styles.tileTitle}>Templates</Text>
                      <Text style={styles.tileSub}>Start with a polished creator layout</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.dark.textMuted} />
                  </View>
                </TouchableOpacity>
              ) : null}

              <View style={styles.quickRow}>
                <TouchableOpacity
                  style={styles.quickPill}
                  activeOpacity={0.85}
                  onPress={openDrafts}
                  accessibilityRole="button"
                  accessibilityLabel={
                    draftCount > 0 ? `Drafts, ${draftCount} saved` : 'Drafts, none saved yet'
                  }
                >
                  <CreatorHubGlassBackdrop borderRadius={borderRadius.lg} blurIntensity={22} />
                  <CreatorHubTileTopSheen accent={colors.primary.teal} radius={borderRadius.lg} height={4} />
                  <View style={styles.quickPillInner}>
                    <Ionicons name="document-text-outline" size={18} color={colors.primary.teal} />
                    <Text style={styles.quickPillText}>Drafts</Text>
                    {draftCount > 0 ? (
                      <View style={styles.draftBadge}>
                        <Text style={styles.draftBadgeText}>{draftCount}</Text>
                      </View>
                    ) : null}
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.quickPill}
                  activeOpacity={0.85}
                  onPress={() => router.push('/create/scheduled-posts' as any)}
                  accessibilityRole="button"
                  accessibilityLabel="Scheduled posts"
                >
                  <CreatorHubGlassBackdrop borderRadius={borderRadius.lg} blurIntensity={22} />
                  <CreatorHubTileTopSheen accent={pulseverse.storeAccent} radius={borderRadius.lg} height={4} />
                  <View style={styles.quickPillInner}>
                    <Ionicons name="calendar-outline" size={18} color={pulseverse.storeAccent} />
                    <Text style={styles.quickPillText}>Scheduled</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {liveStreaming ? (
                <TouchableOpacity
                  style={styles.photoTile}
                  activeOpacity={0.88}
                  onPress={() => router.push(liveGoLiveHref())}
                  accessibilityRole="button"
                  accessibilityLabel="Go Live — broadcast live"
                >
                  <CreatorHubGlassBackdrop borderRadius={borderRadius.card} blurIntensity={28} />
                  <CreatorHubTileTopSheen accent={pulseverse.livePink} radius={borderRadius.card} />
                  <View style={styles.tileForeground}>
                    <View
                      style={[
                        styles.tileIcon,
                        {
                          backgroundColor: pulseverse.livePink + '22',
                          borderWidth: 1,
                          borderColor: pulseverse.livePink + '44',
                        },
                      ]}
                    >
                      <Ionicons name="radio" size={26} color={pulseverse.livePink} />
                    </View>
                    <View style={styles.tileText}>
                      <Text style={styles.tileTitle}>Go Live</Text>
                      <Text style={styles.tileSub}>Broadcast live to your audience</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.dark.textMuted} />
                  </View>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>

        <HubSectionDivider />

        <View style={styles.hubBlockShopAfterCreate}>
          <ShopEntryCard onPress={openShop} motionActive={hubFocused} />
        </View>

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
  hubBlockShopAfterCreate: {
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
    gap: layout.sectionGap,
  },
  tileTopSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  hero: {
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: spacing.lg,
    width: '100%',
  },
  heroBanner: {
    width: '100%',
    maxWidth: 560,
    aspectRatio: 1024 / 341,
    maxHeight: 132,
  },
  heroPairRow: {
    flexDirection: 'row',
    gap: layout.sectionGap,
  },
  heroTile: {
    flex: 1,
    minHeight: 118,
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.18)',
    overflow: 'hidden',
    position: 'relative',
    ...shadows.subtle,
  },
  heroTileForeground: {
    paddingVertical: spacing.md + 4,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    position: 'relative',
    zIndex: 2,
  },
  heroTileIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTileTitle: {
    ...typography.bodyMedium,
    fontWeight: '800',
    color: colors.dark.text,
    letterSpacing: -0.2,
  },
  heroTileSub: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.dark.textMuted,
    marginTop: -2,
  },
  photoTile: {
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
    zIndex: 2,
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
  quickRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  quickPill: {
    flex: 1,
    minWidth: 0,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.16)',
    overflow: 'hidden',
    position: 'relative',
  },
  quickPillInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 8,
    position: 'relative',
    zIndex: 2,
  },
  quickPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.dark.text,
    letterSpacing: -0.1,
  },
  draftBadge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: colors.primary.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.dark.bg,
  },
});
