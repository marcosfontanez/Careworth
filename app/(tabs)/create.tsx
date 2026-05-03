import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, borderRadius, layout, typography } from '@/theme';
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

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#050A14', colors.dark.bg, colors.dark.bg]}
        style={StyleSheet.absoluteFill}
      />
      <View style={{ paddingTop: insets.top + 10 }} />

      <ScrollView
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
      </ScrollView>
    </View>
  );
}

const LIVE_ACCENT = '#EC4899';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
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
  grid: { gap: 10 },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.dark.card,
    borderRadius: borderRadius.xl,
    paddingVertical: 16,
    paddingHorizontal: layout.screenPadding,
    borderWidth: 1,
    borderColor: colors.dark.border,
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
    marginTop: 16,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.dark.border,
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
    fontWeight: '700',
    color: colors.dark.textMuted,
    marginTop: 18,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
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
    borderRadius: borderRadius.xl,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  toolkitIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary.teal + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolkitTitle: { fontSize: 14, fontWeight: '800', color: colors.dark.text },
  toolkitSub: { fontSize: 12, color: colors.dark.textMuted, marginTop: 3 },
  leaderboardsWrap: { marginTop: 20 },
});
