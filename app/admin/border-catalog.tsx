import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, typography } from '@/theme';
import { BorderCatalogMetaChips } from '@/components/shop/BorderCatalogMetaChips';
import { borderCatalogAdminService } from '@/services/shop/borderCatalogAdmin';
import type { BorderCollectionRow } from '@/lib/shop/borderCatalogTaxonomy';
import { borderCatalogLabels } from '@/lib/shop/borderCatalogTaxonomy';
import type { ShopItemRow } from '@/lib/shop/types';
import { useToast } from '@/components/ui/Toast';

export default function AdminBorderCatalogScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [collections, setCollections] = useState<BorderCollectionRow[]>([]);
  const [borders, setBorders] = useState<ShopItemRow[]>([]);

  const load = useCallback(async () => {
    const [c, b] = await Promise.all([
      borderCatalogAdminService.listCollections(),
      borderCatalogAdminService.listBorderItems(),
    ]);
    setCollections(c);
    setBorders(b);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await load();
      } catch (e) {
        if (!cancelled) toast.show(e instanceof Error ? e.message : 'Failed to load border catalog', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load, toast]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Refresh failed', 'error');
    } finally {
      setRefreshing(false);
    }
  }, [load, toast]);

  const byCollection = useMemo(() => {
    const m = new Map<string, ShopItemRow[]>();
    for (const b of borders) {
      const k = b.collection_id ?? '_ungrouped';
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(b);
    }
    return m;
  }, [borders]);

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.primary.teal} />
        <Text style={styles.muted}>Loading border catalog…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.topRow}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={26} color={colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Border catalog</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary.teal} />}
      >
        <Text style={styles.help}>
          Collections group leaderboard, beta, seasonal, and shop sets. Monthly defaults: call SQL{' '}
          <Text style={styles.mono}>admin_border_catalog_create_monthly_champions(season, month_label)</Text> as admin.
        </Text>

        <Text style={styles.sectionHead}>Collections ({collections.length})</Text>
        {collections.map((col) => {
          const ctype = col.collection_type as keyof typeof borderCatalogLabels.collectionType;
          const items = col.id ? byCollection.get(col.id) ?? [] : [];
          return (
            <View key={col.id} style={styles.card}>
              <View style={styles.cardHead}>
                <Text style={styles.cardTitle}>{col.name}</Text>
                <Text style={styles.cardSlug} numberOfLines={1}>
                  {col.slug}
                </Text>
              </View>
              <Text style={styles.cardMeta}>
                {borderCatalogLabels.collectionType[ctype] ?? col.collection_type}
                {col.season_code ? ` · ${col.season_code}` : ''}
                {col.is_retired ? ' · retired set' : ''}
              </Text>
              {col.description ? <Text style={styles.cardDesc}>{col.description}</Text> : null}
              {items.length > 0 ? (
                <View style={styles.borderList}>
                  {items.map((b) => (
                    <View key={b.id} style={styles.borderRow}>
                      <Text style={styles.borderName} numberOfLines={1}>
                        {b.name}
                      </Text>
                      <Text style={styles.borderSlug} numberOfLines={1}>
                        {b.slug}
                      </Text>
                      <BorderCatalogMetaChips item={b} compact />
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.empty}>No borders linked to this collection.</Text>
              )}
            </View>
          );
        })}

        {(byCollection.get('_ungrouped')?.length ?? 0) > 0 ? (
          <>
            <Text style={styles.sectionHead}>Ungrouped borders</Text>
            <View style={styles.card}>
              {(byCollection.get('_ungrouped') ?? []).map((b) => (
                <View key={b.id} style={styles.borderRow}>
                  <Text style={styles.borderName}>{b.name}</Text>
                  <BorderCatalogMetaChips item={b} compact />
                </View>
              ))}
            </View>
          </>
        ) : null}

        <Text style={styles.sectionHead}>Pricing guidance</Text>
        <Text style={styles.help}>
          Table <Text style={styles.mono}>border_pricing_rules</Text> stores recommended bands by rarity + visual tier.
          Rarity is not price: combine with visual tier and limited status when setting IAP labels.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { marginTop: 10, color: colors.dark.textMuted, fontWeight: '600' },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 8,
  },
  title: { ...typography.h3, color: colors.dark.text, fontWeight: '900', flex: 1, textAlign: 'center' },
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },
  help: {
    ...typography.body,
    color: colors.dark.textSecondary,
    marginBottom: 16,
    lineHeight: 22,
  },
  mono: { fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }), fontSize: 12 },
  sectionHead: { fontSize: 15, fontWeight: '900', color: colors.dark.text, marginBottom: 10, marginTop: 8 },
  card: {
    backgroundColor: colors.dark.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.dark.borderSubtle,
    padding: 14,
    marginBottom: 12,
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '900', color: colors.dark.text, flex: 1 },
  cardSlug: { fontSize: 11, color: colors.dark.textMuted, fontWeight: '600', maxWidth: '45%' },
  cardMeta: { marginTop: 6, fontSize: 12, color: colors.dark.textSecondary, fontWeight: '600' },
  cardDesc: { marginTop: 8, fontSize: 13, color: colors.dark.textSecondary, lineHeight: 18 },
  borderList: { marginTop: 12, gap: 12 },
  borderRow: { paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.dark.borderSubtle },
  borderName: { fontSize: 14, fontWeight: '800', color: colors.dark.text },
  borderSlug: { fontSize: 11, color: colors.dark.textQuiet, marginTop: 2 },
  empty: { marginTop: 8, fontSize: 12, color: colors.dark.textMuted, fontStyle: 'italic' },
});
