import React from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { layout, spacing, borderRadius, colors } from '@/theme';

const W = Dimensions.get('window').width;
const CARD_W = W - layout.screenPadding * 2;

function Block({ h, style }: { h: number; style?: object }) {
  return (
    <View
      style={[
        styles.block,
        {
          height: h,
        },
        style,
      ]}
    />
  );
}

/** Placeholder layout aligned with premium Live hub: hero → rails → CTA. */
export function LiveHubSkeleton() {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.scroll, { paddingBottom: spacing['3xl'] }]}
    >
      <View style={styles.headerGap}>
        <Block h={12} style={{ width: '36%', borderRadius: 6, alignSelf: 'center' }} />
        <Block h={18} style={{ width: '52%', borderRadius: 8, marginTop: spacing.sm, alignSelf: 'center' }} />
        <Block h={11} style={{ width: '72%', borderRadius: 6, marginTop: spacing.xs, alignSelf: 'center' }} />
      </View>

      <Block h={400} style={{ width: CARD_W, alignSelf: 'center', borderRadius: borderRadius['3xl'] - 4 }} />

      <View style={styles.sectionHead}>
        <Block h={13} style={{ width: '44%', borderRadius: 6 }} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hStrip}>
        {[1, 2, 3].map((k) => (
          <Block key={k} h={268} style={{ width: 220, borderRadius: borderRadius['2xl'], marginRight: spacing.md }} />
        ))}
      </ScrollView>

      <View style={styles.sectionHead}>
        <Block h={13} style={{ width: '40%', borderRadius: 6 }} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hStrip}>
        {[1, 2].map((k) => (
          <Block key={k} h={148} style={{ width: 260, borderRadius: borderRadius.xl, marginRight: spacing.md }} />
        ))}
      </ScrollView>

      <View style={styles.sectionHead}>
        <Block h={13} style={{ width: '48%', borderRadius: 6 }} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hStrip}>
        {[1, 2].map((k) => (
          <Block key={k} h={132} style={{ width: 300, borderRadius: borderRadius.xl, marginRight: spacing.md }} />
        ))}
      </ScrollView>

      <Block h={120} style={{ marginHorizontal: layout.screenPadding, borderRadius: borderRadius['2xl'] }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  headerGap: {
    paddingHorizontal: layout.screenPadding,
    marginBottom: spacing.sm,
  },
  sectionHead: {
    marginTop: spacing.lg,
    paddingHorizontal: layout.screenPadding,
    marginBottom: spacing.xs,
  },
  block: {
    backgroundColor: colors.dark.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.dark.borderSubtle,
    opacity: 0.85,
  },
  hStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.xs,
  },
});
