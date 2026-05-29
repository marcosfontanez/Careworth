import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, layout, typography } from '@/theme';
import { useAuth } from '@/contexts/AuthContext';
import { collabProjectsService } from '@/services/supabase';
import type { CollabProjectRow } from '@/services/supabase/collabProjects';
import { useToast } from '@/components/ui/Toast';

/** Promise race helper — returns within `ms` even if the underlying call hangs. */
function withDeadline<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms),
    ),
  ]);
}

export default function CollabHubScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const toast = useToast();
  const [rows, setRows] = useState<CollabProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  /** Permanent surface for errors — toast alone disappeared too fast and hid the underlying freeze. */
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) {
      // Auth not hydrated yet — clear the spinner so the "sign in" branch can render.
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      /** 12s deadline. Co-create depends on migration 096; if the relation is missing
       *  remotely the call would otherwise hang forever and freeze the screen. */
      const list = await withDeadline(
        collabProjectsService.listMyProjects(user.id),
        12_000,
        'Loading projects',
      );
      setRows(list);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not load projects';
      setLoadError(msg);
      // Don't double-surface as a toast — the inline card is louder and persistent.
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    if (!user?.id) return;
    try {
      const p = await withDeadline(
        collabProjectsService.createProject(user.id),
        12_000,
        'Creating project',
      );
      await withDeadline(collabProjectsService.addSlots(p.id, 3, 10), 12_000, 'Adding slots');
      toast.show('Project created — add collaborators on the next screen.', 'success');
      router.push(`/create/collab/${p.id}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Create failed';
      // Show both — toast for transient feedback, inline error for follow-up.
      toast.show(msg, 'error');
      setLoadError(msg);
    }
  };

  if (!user) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.muted}>Sign in to use co-create.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Co-create</Text>
        <TouchableOpacity onPress={create} hitSlop={12}>
          <Ionicons name="add-circle" size={28} color={colors.primary.teal} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary.teal} />
        }
      >
        <Text style={styles.lede}>
          Start a project, assign slots with search-by-name or @handle (host), and invitees upload clips when they open
          the project link. Apply migration 096 so Storage + invitee project read work in production.
        </Text>
        {loading ? <ActivityIndicator color={colors.primary.teal} style={{ marginTop: 24 }} /> : null}
        {!loading && loadError ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle" size={20} color={colors.status.error} />
            <View style={{ flex: 1 }}>
              <Text style={styles.errorTitle}>Co-create is not available right now</Text>
              <Text style={styles.errorBody}>
                {loadError}. Apply Supabase migration 096 (Co-create projects + slots) and try again. Until
                then, the rest of the app is unaffected.
              </Text>
              <TouchableOpacity onPress={load} style={styles.errorRetry} activeOpacity={0.85}>
                <Text style={styles.errorRetryText}>Try again</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
        {!loading && !loadError && rows.length === 0 ? (
          <Text style={styles.muted}>No projects yet. Tap + to start.</Text>
        ) : null}
        {rows.map((r) => (
          <TouchableOpacity
            key={r.id}
            style={styles.card}
            onPress={() => router.push(`/create/collab/${r.id}`)}
            activeOpacity={0.88}
          >
            <Text style={styles.cardTitle}>{r.title}</Text>
            <Text style={styles.cardMeta}>{r.status} · {new Date(r.created_at).toLocaleDateString()}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.dark.textMuted} style={styles.cardChev} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPadding,
    paddingBottom: 12,
  },
  headerTitle: { ...typography.h3, color: colors.dark.text },
  body: { padding: layout.screenPadding, paddingBottom: 100, gap: 12 },
  lede: { ...typography.caption, color: colors.dark.textSecondary, lineHeight: 18 },
  muted: { ...typography.body, color: colors.dark.textMuted, marginTop: 16 },
  card: {
    padding: 16,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: colors.dark.text },
  cardMeta: { fontSize: 12, color: colors.dark.textMuted, marginTop: 4 },
  cardChev: { position: 'absolute', right: 14, top: 18 },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    marginTop: 16,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(239,68,68,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.30)',
  },
  errorTitle: { fontSize: 14, fontWeight: '800', color: colors.dark.text },
  errorBody: { fontSize: 13, color: colors.dark.textSecondary, marginTop: 4, lineHeight: 18 },
  errorRetry: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary.teal,
  },
  errorRetryText: { color: '#fff', fontWeight: '800', fontSize: 13 },
});
