import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams, Redirect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StackScreenHeader } from '@/components/ui/StackScreenHeader';
import { colors, spacing, typography, borderRadius, pulseverse } from '@/theme';
import { isFeatureEnabled } from '@/lib/featureFlags';

/**
 * Placeholder for post-stream clips / highlight reels.
 * Deep-linked from live viewers (`?streamId=`); encoder + CDN wiring is backend follow-up.
 */
export default function LiveHighlightsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { streamId } = useLocalSearchParams<{ streamId?: string }>();

  if (!isFeatureEnabled('liveStreaming')) {
    return <Redirect href="/(tabs)/feed" />;
  }

  return (
    <View style={styles.root}>
      <StackScreenHeader
        insetTop={insets.top}
        title="Clips & highlights"
        onPressLeft={() => router.back()}
        leftIcon="close"
        leftAccessibilityLabel="Close"
      />
      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Ionicons name="film-outline" size={36} color={pulseverse.electric} />
          <Text style={styles.title}>Highlight reels</Text>
          <Text style={styles.sub}>
            When replay encoding ships, you&apos;ll trim moments from finished streams and share them without
            leaving PulseVerse.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Backend hooks</Text>
          <Text style={styles.cardLine}>• Clip boundaries + asset IDs in storage</Text>
          <Text style={styles.cardLine}>• Share targets (Circles, Pulse Page, external)</Text>
          <Text style={styles.cardLine}>• Moderation & retention policy</Text>
        </View>

        {streamId ? (
          <View style={styles.refCard}>
            <Text style={styles.refLabel}>Reference stream</Text>
            <Text style={styles.refId} selectable>
              {streamId}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.dark.bg },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, gap: spacing.lg },
  hero: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.14)',
    backgroundColor: 'rgba(15,23,42,0.65)',
    gap: spacing.sm,
  },
  title: { ...typography.h3, fontSize: 20, color: colors.dark.text, textAlign: 'center' },
  sub: {
    ...typography.body,
    color: colors.dark.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: spacing.xs,
  },
  card: {
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.12)',
    backgroundColor: 'rgba(15,23,42,0.45)',
    gap: spacing.sm,
  },
  cardLabel: { ...typography.sectionLabel, color: colors.dark.textSecondary, marginBottom: spacing.xs },
  cardLine: { ...typography.bodySmall, color: colors.dark.textMuted, lineHeight: 20 },
  refCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: pulseverse.electric + '33',
    backgroundColor: 'rgba(56,189,248,0.06)',
  },
  refLabel: { ...typography.caption, color: colors.dark.textMuted, fontWeight: '700', marginBottom: 6 },
  refId: {
    ...typography.bodySmall,
    color: colors.dark.textSecondary,
    fontFamily: 'monospace',
  },
});
