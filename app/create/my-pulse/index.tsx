import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, borderRadius, typography, spacing, shadows } from '@/theme';
import { MY_PULSE_VISUALS } from '@/components/mypage/cards/MyPulseCardShell';
import type { ProfileUpdateDisplayType } from '@/types';

type OptionKey = ProfileUpdateDisplayType;

const OPTIONS: {
  key: OptionKey;
  route: string;
  subtitle: string;
  example: string;
}[] = [
  {
    key: 'thought',
    route: '/create/my-pulse/thought',
    subtitle: 'Short reflection or personal update.',
    example: '"Small daily choices, big long-term wins."',
  },
  {
    key: 'clip',
    route: '/create/my-pulse/link-post',
    subtitle: 'Surface a PulseVerse video you posted, liked, or saved.',
    example: 'Internal feed clips only — not external links.',
  },
  {
    key: 'link',
    route: '/create/my-pulse/link-note',
    subtitle: 'Share an article, resource, or outside web link.',
    example: 'Add a short note above the preview.',
  },
  {
    key: 'pics',
    route: '/create/my-pulse/pics',
    subtitle: 'A photo-first moment — single or a few shots.',
    example: 'Great for day-to-day shift culture.',
  },
];

export default function MyPulseHubScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const go = (route: string) => {
    Haptics.selectionAsync().catch(() => undefined);
    router.push(route as any);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={26} color={colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add to My Pulse</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lead}>
          What&apos;s on your Pulse? Share a thought, clip, link, or photo.
        </Text>

        {OPTIONS.map((o) => {
          const vis = MY_PULSE_VISUALS[o.key];
          return (
            <Pressable
              key={o.key}
              style={({ pressed }) => [
                styles.card,
                { borderColor: vis.ring },
                pressed ? styles.cardPressed : null,
                shadows.subtle,
              ]}
              onPress={() => go(o.route)}
              accessibilityRole="button"
              accessibilityLabel={`Add ${vis.label}`}
            >
              <LinearGradient
                colors={[vis.fill, 'rgba(255,255,255,0.015)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: vis.fill, borderColor: vis.ring },
                ]}
              >
                <Ionicons name={vis.icon} size={22} color={vis.accent} />
              </View>
              <View style={styles.cardText}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.cardTitle}>{vis.label}</Text>
                  <View
                    style={[
                      styles.chip,
                      { backgroundColor: vis.fill, borderColor: vis.ring },
                    ]}
                  >
                    <Text style={[styles.chipLabel, { color: vis.accent }]}>
                      {vis.label}
                    </Text>
                  </View>
                </View>
                <Text style={styles.cardSub}>{o.subtitle}</Text>
                <Text style={styles.cardExample} numberOfLines={1}>
                  {o.example}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.dark.textMuted}
              />
            </Pressable>
          );
        })}

        <View style={styles.footer}>
          <Ionicons
            name="pulse"
            size={14}
            color={colors.primary.teal}
            style={{ marginRight: 6 }}
          />
          <Text style={styles.footerText}>
            Only your latest 5 updates show — oldest rolls off when you add a
            new one.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.bg,
    paddingHorizontal: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: { ...typography.h3, color: colors.dark.text },
  lead: {
    fontSize: 14,
    color: colors.dark.textSecondary,
    lineHeight: 21,
    marginBottom: 20,
  },
  scroll: { paddingBottom: 48 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.dark.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardPressed: { opacity: 0.9, transform: [{ scale: 0.995 }] },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cardText: { flex: 1 },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.dark.text,
    letterSpacing: -0.2,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  chipLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  cardSub: {
    fontSize: 12.5,
    fontWeight: '500',
    color: colors.dark.textSecondary,
    lineHeight: 17,
  },
  cardExample: {
    fontSize: 11.5,
    fontWeight: '500',
    color: colors.dark.textMuted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  footer: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.dark.borderSubtle,
    backgroundColor: 'rgba(255,255,255,0.02)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: colors.dark.textMuted,
    fontWeight: '600',
  },
});
