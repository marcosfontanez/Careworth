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

/**
 * Premium placeholder layout while Live hub payload loads — keeps header visible elsewhere.
 */
export function LiveHubSkeleton() {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.scroll, { paddingBottom: spacing['3xl'] }]}
    >
      <Block h={380} style={{ width: CARD_W, alignSelf: 'center', borderRadius: borderRadius['3xl'] - 4 }} />

      <View style={styles.rowTitle}>
        <Block h={14} style={{ width: '42%', borderRadius: 6 }} />
      </View>
      <View style={styles.pairRow}>
        <Block h={200} style={{ flex: 1, borderRadius: borderRadius.xl }} />
        <Block h={200} style={{ flex: 1, borderRadius: borderRadius.xl }} />
      </View>

      <View style={styles.rowTitle}>
        <Block h={14} style={{ width: '38%', borderRadius: 6 }} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
        {[1, 2, 3].map((k) => (
          <Block key={k} h={160} style={{ width: 140, borderRadius: borderRadius.xl }} />
        ))}
      </ScrollView>

      <View style={styles.rowTitle}>
        <Block h={14} style={{ width: '52%', borderRadius: 6 }} />
      </View>
      {[1, 2].map((k) => (
        <Block key={k} h={96} style={{ marginBottom: spacing.md, borderRadius: borderRadius.xl }} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingTop: spacing.sm,
    paddingHorizontal: layout.screenPadding,
    gap: spacing.md,
  },
  block: {
    backgroundColor: colors.dark.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.dark.borderSubtle,
    opacity: 0.85,
  },
  rowTitle: {
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  pairRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  hScroll: {
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
});
