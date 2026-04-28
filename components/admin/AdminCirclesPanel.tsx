import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { colors } from '@/theme';
import { communitiesService } from '@/services/supabase';
import { adminCirclesService, normalizeCommunitySlug } from '@/services/adminCircles';
import { communityKeys } from '@/lib/queryKeys';
import type { Community } from '@/types';
import { useToast } from '@/components/ui/Toast';

function sortForAdminList(a: Community, b: Community): number {
  const ao = a.featuredOrder;
  const bo = b.featuredOrder;
  if (ao != null && bo != null) return ao - bo;
  if (ao != null) return -1;
  if (bo != null) return 1;
  return a.name.localeCompare(b.name);
}

export function AdminCirclesPanel() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [featuredDraft, setFeaturedDraft] = useState<Record<string, string>>({});
  const [savingFeatured, setSavingFeatured] = useState(false);

  const [newSlug, setNewSlug] = useState('');
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newIcon, setNewIcon] = useState('🏥');
  const [newAccent, setNewAccent] = useState('#1E4ED8');
  const [creating, setCreating] = useState(false);

  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null);
  const [pins, setPins] = useState<Awaited<ReturnType<typeof adminCirclesService.listPins>>>([]);
  const [recentPosts, setRecentPosts] = useState<{ id: string; caption: string | null }[]>([]);
  const [pinsLoading, setPinsLoading] = useState(false);
  const [postIdInput, setPostIdInput] = useState('');

  const loadCommunities = useCallback(async () => {
    const list = await communitiesService.getAll();
    setCommunities(list);
    const draft: Record<string, string> = {};
    for (const c of list) {
      draft[c.id] = c.featuredOrder != null ? String(c.featuredOrder) : '';
    }
    setFeaturedDraft(draft);
    setSelectedCommunityId((prev) => {
      if (prev && list.some((x) => x.id === prev)) return prev;
      return list[0]?.id ?? null;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await loadCommunities();
      } catch (e: any) {
        if (!cancelled) toast.show(e?.message ?? 'Failed to load circles', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadCommunities, toast]);

  const loadPinsForSelection = useCallback(async () => {
    if (!selectedCommunityId) {
      setPins([]);
      setRecentPosts([]);
      return;
    }
    setPinsLoading(true);
    try {
      const [pinRows, posts] = await Promise.all([
        adminCirclesService.listPins(selectedCommunityId),
        adminCirclesService.listRecentPostIds(selectedCommunityId),
      ]);
      setPins(pinRows);
      setRecentPosts(posts);
    } catch (e: any) {
      toast.show(e?.message ?? 'Failed to load pins', 'error');
    } finally {
      setPinsLoading(false);
    }
  }, [selectedCommunityId, toast]);

  useEffect(() => {
    loadPinsForSelection();
  }, [loadPinsForSelection]);

  const invalidateAfterCuration = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: communityKeys.listAll() });
    queryClient.invalidateQueries({ queryKey: communityKeys.circlesHome() });
  }, [queryClient]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadCommunities();
      await loadPinsForSelection();
    } catch (e: any) {
      toast.show(e?.message ?? 'Refresh failed', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const sortedCommunities = useMemo(() => [...communities].sort(sortForAdminList), [communities]);

  const saveFeatured = async () => {
    setSavingFeatured(true);
    try {
      for (const c of communities) {
        const raw = (featuredDraft[c.id] ?? '').trim();
        const next = raw === '' ? null : parseInt(raw, 10);
        if (raw !== '' && Number.isNaN(next)) {
          toast.show(`Invalid order for ${c.name}`, 'error');
          setSavingFeatured(false);
          return;
        }
        const prev = c.featuredOrder ?? null;
        if (prev !== next) {
          await adminCirclesService.setFeaturedOrder(c.id, next);
        }
      }
      toast.show('Featured order saved', 'success');
      await loadCommunities();
      invalidateAfterCuration();
    } catch (e: any) {
      toast.show(e?.message ?? 'Save failed', 'error');
    } finally {
      setSavingFeatured(false);
    }
  };

  const createCircle = async () => {
    const slug = normalizeCommunitySlug(newSlug || newName);
    if (!slug || !newName.trim()) {
      toast.show('Name and a valid slug are required', 'error');
      return;
    }
    setCreating(true);
    try {
      await adminCirclesService.createCommunity({
        slug,
        name: newName.trim(),
        description: newDescription,
        icon: newIcon,
        accentColor: newAccent,
      });
      toast.show('Circle created', 'success');
      setNewSlug('');
      setNewName('');
      setNewDescription('');
      await loadCommunities();
      invalidateAfterCuration();
    } catch (e: any) {
      toast.show(e?.message ?? 'Create failed', 'error');
    } finally {
      setCreating(false);
    }
  };

  const pinPostById = async (postId: string) => {
    if (!selectedCommunityId) return;
    const trimmed = postId.trim();
    if (!trimmed) return;
    try {
      await adminCirclesService.addPin(selectedCommunityId, trimmed);
      toast.show('Pinned', 'success');
      await loadPinsForSelection();
      queryClient.invalidateQueries({ queryKey: communityKeys.postsAllViewers(selectedCommunityId) });
    } catch (e: any) {
      toast.show(e?.message ?? 'Pin failed', 'error');
    }
  };

  const unpin = async (postId: string) => {
    if (!selectedCommunityId) return;
    try {
      await adminCirclesService.removePin(selectedCommunityId, postId);
      toast.show('Unpinned', 'success');
      await loadPinsForSelection();
      queryClient.invalidateQueries({ queryKey: communityKeys.postsAllViewers(selectedCommunityId) });
    } catch (e: any) {
      toast.show(e?.message ?? 'Unpin failed', 'error');
    }
  };

  const movePin = async (postId: string, direction: 'up' | 'down') => {
    if (!selectedCommunityId) return;
    try {
      await adminCirclesService.movePin(selectedCommunityId, postId, direction);
      await loadPinsForSelection();
      queryClient.invalidateQueries({ queryKey: communityKeys.postsAllViewers(selectedCommunityId) });
    } catch (e: any) {
      toast.show(e?.message ?? 'Reorder failed', 'error');
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" color={colors.primary.teal} style={{ marginTop: 48 }} />;
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary.teal} />}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.sectionTitle}>Create circle</Text>
      <Text style={styles.hint}>Slug is auto-normalized (lowercase, hyphens). Leave slug empty to derive from name.</Text>
      <TextInput
        style={styles.input}
        placeholder="Slug (optional)"
        placeholderTextColor={colors.neutral.midGray}
        value={newSlug}
        onChangeText={setNewSlug}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Display name"
        placeholderTextColor={colors.neutral.midGray}
        value={newName}
        onChangeText={setNewName}
      />
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="Description"
        placeholderTextColor={colors.neutral.midGray}
        value={newDescription}
        onChangeText={setNewDescription}
        multiline
      />
      <View style={styles.row}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Icon emoji"
          placeholderTextColor={colors.neutral.midGray}
          value={newIcon}
          onChangeText={setNewIcon}
        />
        <TextInput
          style={[styles.input, { flex: 2, marginLeft: 8 }]}
          placeholder="Accent #hex"
          placeholderTextColor={colors.neutral.midGray}
          value={newAccent}
          onChangeText={setNewAccent}
          autoCapitalize="none"
        />
      </View>
      <TouchableOpacity
        style={[styles.primaryBtn, creating && styles.btnDisabled]}
        onPress={createCircle}
        disabled={creating}
      >
        {creating ? (
          <ActivityIndicator color={colors.dark.text} />
        ) : (
          <Text style={styles.primaryBtnText}>Create circle</Text>
        )}
      </TouchableOpacity>

      <Text style={[styles.sectionTitle, styles.sectionSpaced]}>Featured carousel order</Text>
      <Text style={styles.hint}>Integer rank: lower first. Leave blank to remove from curated featured strip.</Text>
      <TouchableOpacity
        style={[styles.secondaryBtn, savingFeatured && styles.btnDisabled]}
        onPress={saveFeatured}
        disabled={savingFeatured}
      >
        {savingFeatured ? (
          <ActivityIndicator color={colors.dark.text} />
        ) : (
          <Text style={styles.secondaryBtnText}>Save featured order</Text>
        )}
      </TouchableOpacity>

      {sortedCommunities.map((c) => (
        <View key={c.id} style={styles.featureRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.circleName}>{c.icon} {c.name}</Text>
            <Text style={styles.circleSlug}>{c.slug}</Text>
          </View>
          <TextInput
            style={styles.orderInput}
            keyboardType="number-pad"
            placeholder="—"
            placeholderTextColor={colors.neutral.midGray}
            value={featuredDraft[c.id] ?? ''}
            onChangeText={(t) => setFeaturedDraft((prev) => ({ ...prev, [c.id]: t }))}
          />
        </View>
      ))}

      <Text style={[styles.sectionTitle, styles.sectionSpaced]}>Pinned posts (per circle)</Text>
      <Text style={styles.hint}>Choose a circle, then pin by post id or from recent posts. Only admins can change pins (RLS).</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        {sortedCommunities.map((c) => {
          const active = c.id === selectedCommunityId;
          return (
            <TouchableOpacity
              key={c.id}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setSelectedCommunityId(c.id)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {pinsLoading ? (
        <ActivityIndicator color={colors.primary.teal} style={{ marginVertical: 16 }} />
      ) : (
        <>
          <Text style={styles.subheading}>Pinned ({pins.length})</Text>
          {pins.length === 0 ? (
            <Text style={styles.empty}>No pins yet.</Text>
          ) : (
            pins.map((p, i) => (
              <View key={p.id} style={styles.pinRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pinId} numberOfLines={1}>
                    {p.post_id}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => movePin(p.post_id, 'up')} disabled={i === 0} style={styles.iconBtn}>
                  <Ionicons name="arrow-up" size={18} color={i === 0 ? colors.neutral.midGray : colors.dark.text} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => movePin(p.post_id, 'down')}
                  disabled={i === pins.length - 1}
                  style={styles.iconBtn}
                >
                  <Ionicons
                    name="arrow-down"
                    size={18}
                    color={i === pins.length - 1 ? colors.neutral.midGray : colors.dark.text}
                  />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => unpin(p.post_id)} style={styles.iconBtn}>
                  <Ionicons name="close-circle-outline" size={20} color={colors.status.error} />
                </TouchableOpacity>
              </View>
            ))
          )}

          <Text style={styles.subheading}>Pin by post ID</Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Post UUID"
              placeholderTextColor={colors.neutral.midGray}
              value={postIdInput}
              onChangeText={setPostIdInput}
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.smallPrimary} onPress={() => pinPostById(postIdInput)}>
              <Text style={styles.smallPrimaryText}>Pin</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subheading}>Recent posts in this circle</Text>
          {recentPosts.length === 0 ? (
            <Text style={styles.empty}>No posts yet.</Text>
          ) : (
            recentPosts.map((rp) => {
              const isPinned = pins.some((x) => x.post_id === rp.id);
              return (
                <View key={rp.id} style={styles.postRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.postCaption} numberOfLines={2}>
                      {rp.caption?.trim() || '(no caption)'}
                    </Text>
                    <Text style={styles.postMeta} numberOfLines={1}>
                      {rp.id}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.smallBtn, isPinned && styles.smallBtnMuted]}
                    onPress={() => (isPinned ? unpin(rp.id) : pinPostById(rp.id))}
                    disabled={isPinned}
                  >
                    <Text style={styles.smallBtnText}>{isPinned ? 'Pinned' : 'Pin'}</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.dark.text,
    marginBottom: 8,
  },
  sectionSpaced: { marginTop: 24 },
  subheading: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.dark.text,
    marginTop: 16,
    marginBottom: 8,
  },
  hint: {
    fontSize: 13,
    color: colors.dark.textMuted,
    marginBottom: 10,
    lineHeight: 18,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.dark.text,
    marginBottom: 10,
    fontSize: 15,
  },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  primaryBtn: {
    backgroundColor: colors.primary.teal,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnText: { color: colors.dark.text, fontWeight: '700', fontSize: 16 },
  secondaryBtn: {
    backgroundColor: colors.primary.royal,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  secondaryBtnText: { color: colors.dark.text, fontWeight: '600', fontSize: 15 },
  btnDisabled: { opacity: 0.6 },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dark.borderSubtle,
  },
  circleName: { fontSize: 15, fontWeight: '600', color: colors.dark.text },
  circleSlug: { fontSize: 12, color: colors.dark.textMuted, marginTop: 2 },
  orderInput: {
    width: 56,
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    textAlign: 'center',
    color: colors.dark.text,
    fontSize: 15,
  },
  chipScroll: { marginBottom: 8, maxHeight: 44 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.dark.card,
    marginRight: 8,
  },
  chipActive: { backgroundColor: colors.primary.teal },
  chipText: { fontSize: 14, color: colors.dark.textMuted },
  chipTextActive: { color: colors.dark.text, fontWeight: '600' },
  pinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dark.borderSubtle,
  },
  pinId: { fontSize: 12, color: colors.dark.text },
  iconBtn: { padding: 8 },
  postRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dark.borderSubtle,
  },
  postCaption: { fontSize: 14, color: colors.dark.text },
  postMeta: { fontSize: 11, color: colors.dark.textMuted, marginTop: 4 },
  smallBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.primary.royal,
    marginLeft: 8,
  },
  smallBtnMuted: { backgroundColor: colors.neutral.midGray },
  smallBtnText: { color: colors.dark.text, fontWeight: '600', fontSize: 13 },
  smallPrimary: {
    marginLeft: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.primary.teal,
    justifyContent: 'center',
  },
  smallPrimaryText: { color: colors.dark.text, fontWeight: '700' },
  empty: { fontSize: 14, color: colors.dark.textMuted, fontStyle: 'italic' },
});
