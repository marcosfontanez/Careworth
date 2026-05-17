import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, Redirect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StackScreenHeader } from '@/components/ui/StackScreenHeader';
import { colors, borderRadius, spacing, typography, pulseverse } from '@/theme';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { DEMO_PRODUCT_HYDRA, DEMO_PRODUCT_SCRUB_SET } from '@/services/live/mockLiveHubData';

/**
 * Front-end-only seller dock for Shop Live / monetization previews.
 * TODO: Bind to host session + commerce analytics WebSocket.
 */
export default function LiveHostControlsScreen() {
  if (!isFeatureEnabled('liveStreaming')) {
    return <Redirect href="/(tabs)/feed" />;
  }
  return <LiveHostControlsBody />;
}

function LiveHostControlsBody() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { demo } = useLocalSearchParams<{ demo?: string }>();

  return (
    <View style={styles.root}>
      <StackScreenHeader
        insetTop={insets.top}
        title="Seller controls"
        onPressLeft={() => router.back()}
        leftIcon="close"
        leftAccessibilityLabel="Close"
      />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {demo ? (
          <View style={styles.demoBanner}>
            <Ionicons name="flask" size={16} color={pulseverse.electric} />
            <Text style={styles.demoBannerTxt}>Demo overlay — no backend session.</Text>
          </View>
        ) : null}

        <MetricCard label="Live title" value="HydraGlow Serum Drop (preview)" />
        <MetricCard label="Viewers" value="623" hint="Realtime presence TODO" />
        <MetricCard label="Revenue (est.)" value="$128.40" hint="Stripe Connect TODO" />
        <MetricCard label="Product clicks" value="184" hint="analytics.live_product_click" />
        <MetricCard label="Add to cart" value="26" hint="shop_live_funnel" />

        <Text style={styles.sectionLabel}>Pinned product</Text>
        <ProductQueueRow product={DEMO_PRODUCT_HYDRA} pinned />

        <Text style={styles.sectionLabel}>Queue</Text>
        <ProductQueueRow product={DEMO_PRODUCT_SCRUB_SET} />

        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.85}>
          <Ionicons name="pin" size={18} color={colors.primary.teal} />
          <Text style={styles.actionTxt}>Pin next product</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.85}>
          <Ionicons name="flash" size={18} color={colors.primary.gold} />
          <Text style={styles.actionTxt}>Trigger flash deal</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.85}>
          <Ionicons name="gift" size={18} color={pulseverse.electric} />
          <Text style={styles.actionTxt}>Launch giveaway (TODO)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.85}>
          <Ionicons name="shield-checkmark" size={18} color={colors.dark.textSecondary} />
          <Text style={styles.actionTxt}>Chat moderation</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.endBtn]}
          activeOpacity={0.85}
          onPress={() => router.back()}
        >
          <Ionicons name="stop-circle" size={18} color="#FCA5A5" />
          <Text style={[styles.actionTxt, { color: '#FCA5A5' }]}>End live (demo)</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      {hint ? <Text style={styles.metricHint}>{hint}</Text> : null}
    </View>
  );
}

function ProductQueueRow({
  product,
  pinned,
}: {
  product: typeof DEMO_PRODUCT_HYDRA;
  pinned?: boolean;
}) {
  return (
    <View style={[styles.queueRow, pinned && styles.queueRowPinned]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.queueTitle} numberOfLines={2}>
          {product.title}
        </Text>
        <Text style={styles.queuePrice}>{product.price}</Text>
      </View>
      {pinned ? (
        <View style={styles.pinnedTag}>
          <Text style={styles.pinnedTagTxt}>PINNED</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.dark.bg },
  scroll: { paddingHorizontal: spacing.lg, gap: spacing.md },
  demoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: pulseverse.electric + '44',
    backgroundColor: 'rgba(56,189,248,0.08)',
    marginBottom: spacing.sm,
  },
  demoBannerTxt: { ...typography.caption, color: colors.dark.textSecondary, flex: 1 },
  metric: {
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.14)',
    backgroundColor: 'rgba(15,23,42,0.72)',
  },
  metricLabel: { ...typography.caption, color: colors.dark.textMuted, fontWeight: '700' },
  metricValue: { ...typography.h3, fontSize: 20, color: colors.dark.text, marginTop: 4 },
  metricHint: { ...typography.caption, color: colors.dark.textMuted, marginTop: 6 },
  sectionLabel: {
    ...typography.sectionLabel,
    color: colors.dark.textMuted,
    marginTop: spacing.md,
    marginBottom: 4,
  },
  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.12)',
    backgroundColor: 'rgba(15,23,42,0.55)',
  },
  queueRowPinned: { borderColor: 'rgba(251,191,36,0.35)' },
  queueTitle: { fontSize: 15, fontWeight: '700', color: colors.dark.text },
  queuePrice: { fontSize: 14, fontWeight: '800', color: colors.primary.gold, marginTop: 4 },
  pinnedTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(251,191,36,0.15)',
  },
  pinnedTagTxt: { fontSize: 10, fontWeight: '900', color: colors.primary.gold },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.14)',
    backgroundColor: 'rgba(15,23,42,0.55)',
  },
  actionTxt: { ...typography.body, fontWeight: '700', color: colors.dark.text },
  endBtn: { borderColor: 'rgba(248,113,113,0.35)', marginTop: spacing.lg },
});
