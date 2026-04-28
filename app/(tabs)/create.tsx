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

const LOGO = require('../../assets/images/pulseverse-logo.png');

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
    iconColor: '#A855F7',
    bg: '#A855F718',
    href: '/create/video?mode=record',
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
    subtitle: 'Images, GIFs, audio',
    icon: 'images',
    iconColor: '#3B82F6',
    bg: '#3B82F618',
    href: '/create/image',
  },
  {
    title: 'Post a Thought',
    subtitle: 'Text, idea, or quote',
    icon: 'chatbubble-ellipses',
    iconColor: '#EAB308',
    bg: '#EAB30818',
    href: '/create/text',
  },
  {
    title: 'Share to My Pulse',
    subtitle: 'Private by design',
    icon: 'people',
    iconColor: colors.primary.teal,
    bg: colors.primary.teal + '1F',
    href: '/create/my-pulse',
  },
  {
    title: 'Start a Circle Discussion',
    subtitle: 'Spark a conversation',
    icon: 'chatbubbles',
    iconColor: '#38BDF8',
    bg: '#38BDF818',
    href: '/create/text',
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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <Image source={LOGO} style={styles.heroLogo} contentFit="contain" />
          <Text style={styles.heroTitle}>Create Your World</Text>
          <Text style={styles.heroSub}>Inspire. Educate. Connect.</Text>
          <LinearGradient
            colors={['transparent', colors.primary.teal + '33', 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.heroArc}
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
  hero: { alignItems: 'center', paddingTop: 8, paddingBottom: 28 },
  heroLogo: { width: 72, height: 72, marginBottom: 16 },
  heroTitle: {
    ...typography.h2,
    color: colors.dark.text,
    letterSpacing: -0.5,
  },
  heroSub: {
    ...typography.body,
    fontWeight: '500',
    color: colors.dark.textSecondary,
    marginTop: 8,
  },
  heroArc: {
    marginTop: 20,
    height: 3,
    width: '72%',
    borderRadius: 2,
    opacity: 0.9,
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
  leaderboardsWrap: { marginTop: 20 },
});
