import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { useToast } from '@/components/ui/Toast';
import { soundCatalogService, type SoundCatalogAdminRow } from '@/services/supabase/soundCatalog';

export default function AdminSoundCatalogScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const [rows, setRows] = useState<SoundCatalogAdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [postId, setPostId] = useState('');
  const [artist, setArtist] = useState('');
  const [keywords, setKeywords] = useState('');
  const [sortBoost, setSortBoost] = useState('1000');
  const [isActive, setIsActive] = useState(true);

  const load = useCallback(async () => {
    const data = await soundCatalogService.listForAdmin();
    setRows(data);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await load();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to load catalog';
        if (!cancelled) toast.show(msg, 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- zustand toast identity is not stable as a dep
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Refresh failed';
      toast.show(msg, 'error');
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const handleSave = async () => {
    const pid = postId.trim();
    if (!pid) {
      toast.show('Post UUID is required', 'error');
      return;
    }
    setSaving(true);
    try {
      const parsed = parseInt(sortBoost, 10);
      const boost = Number.isFinite(parsed) ? parsed : 1000;
      await soundCatalogService.upsert({
        postId: pid,
        artist,
        keywords,
        sortBoost: boost,
        isActive,
      });
      toast.show('Saved to catalog', 'success');
      setPostId('');
      setArtist('');
      setKeywords('');
      setSortBoost('1000');
      setIsActive(true);
      await load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Save failed';
      toast.show(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (row: SoundCatalogAdminRow) => {
    Alert.alert(
      'Remove from catalog',
      `Remove this entry for post ${row.post_id.slice(0, 8)}…?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await soundCatalogService.deleteByPostId(row.post_id);
              toast.show('Removed', 'success');
              await load();
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : 'Delete failed';
              toast.show(msg, 'error');
            }
          },
        },
      ],
    );
  };

  const ListHeader = (
    <>
      <Text style={styles.help}>
        Use a video post ID (with media, not an anonymous repost of another sound). Artist and keywords help search rank this sound.
      </Text>
      <View style={styles.form}>
        <Text style={styles.label}>Post UUID</Text>
        <TextInput
          style={styles.input}
          value={postId}
          onChangeText={setPostId}
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          placeholderTextColor={colors.dark.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={styles.label}>Artist (optional)</Text>
        <TextInput
          style={styles.input}
          value={artist}
          onChangeText={setArtist}
          placeholder="Display name or label"
          placeholderTextColor={colors.dark.textMuted}
        />
        <Text style={styles.label}>Keywords (optional)</Text>
        <TextInput
          style={styles.input}
          value={keywords}
          onChangeText={setKeywords}
          placeholder="Comma-separated terms"
          placeholderTextColor={colors.dark.textMuted}
        />
        <Text style={styles.label}>Sort boost</Text>
        <TextInput
          style={styles.input}
          value={sortBoost}
          onChangeText={setSortBoost}
          placeholder="1000"
          placeholderTextColor={colors.dark.textMuted}
          keyboardType="number-pad"
        />
        <View style={styles.switchRow}>
          <Text style={styles.labelFlat}>Active (visible in search)</Text>
          <Switch
            value={isActive}
            onValueChange={setIsActive}
            trackColor={{ false: colors.dark.border, true: colors.primary.teal + '88' }}
            thumbColor={isActive ? colors.primary.teal : colors.neutral.midGray}
          />
        </View>
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color={colors.dark.text} />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color={colors.dark.text} />
              <Text style={styles.saveBtnText}>Add or update</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
      <Text style={styles.sectionTitle}>Entries ({rows.length})</Text>
    </>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Curated sounds</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary.teal} style={{ marginTop: 48 }} />
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={ListHeader}
            refreshControl={(
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary.teal} />
            )}
            renderItem={({ item }) => (
              <View style={styles.rowCard}>
                <View style={styles.rowMain}>
                  <View style={[styles.badge, !item.is_active && styles.badgeOff]}>
                    <Text style={styles.badgeText}>{item.is_active ? 'On' : 'Off'}</Text>
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {item.artist || '(no artist)'}
                    </Text>
                    <Text style={styles.rowSub} numberOfLines={1}>
                      {item.post_id}
                    </Text>
                    {item.keywords ? (
                      <Text style={styles.rowKw} numberOfLines={2}>
                        {item.keywords}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.boost}>{item.sort_boost}</Text>
                  <TouchableOpacity
                    onPress={() => confirmDelete(item)}
                    hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                    accessibilityLabel="Remove from catalog"
                  >
                    <Ionicons name="trash-outline" size={22} color={colors.status.error} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            contentContainerStyle={styles.list}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary.navy },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.dark.text },
  content: {
    flex: 1,
    backgroundColor: colors.dark.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  help: {
    fontSize: 13,
    color: colors.dark.textMuted,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    lineHeight: 18,
  },
  form: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 6,
  },
  label: { fontSize: 12, fontWeight: '700', color: colors.dark.textSecondary, marginTop: 6 },
  labelFlat: { fontSize: 14, fontWeight: '600', color: colors.dark.text },
  input: {
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.dark.text,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 4,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary.royal,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 12,
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { fontSize: 16, fontWeight: '800', color: colors.dark.text },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.dark.text,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  list: { paddingBottom: 32 },
  rowCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: colors.dark.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.dark.border,
    overflow: 'hidden',
  },
  rowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  badge: {
    backgroundColor: colors.status.success + '33',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeOff: { backgroundColor: colors.dark.cardAlt },
  badgeText: { fontSize: 11, fontWeight: '800', color: colors.dark.text },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 15, fontWeight: '700', color: colors.dark.text },
  rowSub: { fontSize: 12, color: colors.dark.textMuted, fontFamily: 'monospace', marginTop: 2 },
  rowKw: { fontSize: 12, color: colors.dark.textSecondary, marginTop: 4 },
  boost: { fontSize: 14, fontWeight: '800', color: colors.primary.teal },
});
