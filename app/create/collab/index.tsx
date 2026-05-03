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

export default function CollabHubScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const toast = useToast();
  const [rows, setRows] = useState<CollabProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const list = await collabProjectsService.listMyProjects(user.id);
      setRows(list);
    } catch (e: unknown) {
      toast.show(e instanceof Error ? e.message : 'Could not load projects', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    if (!user?.id) return;
    try {
      const p = await collabProjectsService.createProject(user.id);
      await collabProjectsService.addSlots(p.id, 3, 10);
      toast.show('Project created — add collaborators on the next screen.', 'success');
      router.push(`/create/collab/${p.id}`);
    } catch (e: unknown) {
      toast.show(e instanceof Error ? e.message : 'Create failed', 'error');
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
        {!loading && rows.length === 0 ? (
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
});
