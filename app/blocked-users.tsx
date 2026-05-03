import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { StackScreenHeader } from '@/components/ui/StackScreenHeader';
import { LoadingState } from '@/components/ui/LoadingState';
import { borderRadius, colors, layout, spacing, typography } from '@/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface BlockedUser {
  blockId: string;
  id: string;
  displayName: string;
  avatarUrl: string | null;
  role: string;
}

export default function BlockedUsersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadBlocked();
  }, [user]);

  const loadBlocked = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('blocked_users')
        .select('id, blocked:blocked_id(id, display_name, avatar_url, role)')
        .eq('blocker_id', user!.id);

      setBlocked(
        (data ?? []).map((r: any) => ({
          blockId: r.id,
          id: r.blocked.id,
          displayName: r.blocked.display_name,
          avatarUrl: r.blocked.avatar_url,
          role: r.blocked.role,
        }))
      );
    } catch {}
    setLoading(false);
  };

  const handleUnblock = (item: BlockedUser) => {
    Alert.alert(
      'Unblock User',
      `Are you sure you want to unblock ${item.displayName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: async () => {
            await supabase.from('blocked_users').delete().eq('id', item.blockId);
            setBlocked((prev) => prev.filter((b) => b.blockId !== item.blockId));
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StackScreenHeader insetTop={insets.top} title="Blocked Users" onPressLeft={() => router.back()} />

      {loading ? (
        <LoadingState />
      ) : blocked.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="shield-checkmark-outline" size={48} color={colors.dark.textMuted} />
          <Text style={styles.emptyTitle}>No blocked users</Text>
          <Text style={styles.emptySubtitle}>
            Accounts you add to this list are blocked by you. Unblock to restore contact. If someone
            continues to harass you, use Report or contact support — we are hardening how blocks
            apply across messaging and discovery.
          </Text>
        </View>
      ) : (
        <FlatList
          data={blocked}
          keyExtractor={(item) => item.blockId}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Image source={{ uri: item.avatarUrl ?? '' }} style={styles.avatar} />
              <View style={styles.body}>
                <Text style={styles.name}>{item.displayName}</Text>
                <Text style={styles.role}>{item.role}</Text>
              </View>
              <TouchableOpacity style={styles.unblockBtn} onPress={() => handleUnblock(item)} activeOpacity={0.7}>
                <Text style={styles.unblockText}>Unblock</Text>
              </TouchableOpacity>
            </View>
          )}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  list: { padding: layout.screenPadding },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md - 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dark.border,
  },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  body: { flex: 1 },
  name: { ...typography.creatorName, color: colors.dark.text },
  role: { ...typography.metadata, color: colors.dark.textMuted, marginTop: 1 },
  unblockBtn: {
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.sm - 1,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.status.error,
  },
  unblockText: { ...typography.bodySmall, fontWeight: '700', color: colors.status.error },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    paddingTop: spacing['5xl'],
    gap: spacing.sm + 2,
    paddingHorizontal: spacing['3xl'],
  },
  emptyTitle: { ...typography.h3, fontSize: 17, color: colors.dark.text },
  emptySubtitle: {
    ...typography.bodySmall,
    color: colors.dark.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
