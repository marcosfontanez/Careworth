import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Modal,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { colors, borderRadius, layout } from '@/theme';
import { profilesService } from '@/services/supabase/profiles';
import { avatarThumb } from '@/lib/storage';
import type { UserProfile } from '@/types';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (userId: string) => void;
  /** Exclude host or already-assigned ids */
  excludeUserIds?: Set<string>;
}

export function CollabInviteeSearchModal({ visible, onClose, onSelect, excludeUserIds }: Props) {
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<UserProfile[]>([]);

  const runSearch = useCallback(async () => {
    const raw = q.trim();
    if (!raw) {
      setResults([]);
      return;
    }
    setBusy(true);
    try {
      let list: UserProfile[] = [];
      if (raw.startsWith('@') || /^[a-z0-9_]{2,}$/i.test(raw.replace(/^@+/, ''))) {
        const byHandle = await profilesService.searchByHandle(raw.replace(/^@+/, ''), 12);
        list = byHandle.length ? byHandle : await profilesService.search(raw);
      } else {
        list = await profilesService.search(raw);
      }
      const ex = excludeUserIds ?? new Set();
      setResults(list.filter((p) => !ex.has(p.id)));
    } catch {
      setResults([]);
    } finally {
      setBusy(false);
    }
  }, [q, excludeUserIds]);

  useEffect(() => {
    if (!visible) {
      setQ('');
      setResults([]);
      return;
    }
    const t = setTimeout(runSearch, 320);
    return () => clearTimeout(t);
  }, [visible, runSearch]);

  const renderRow = ({ item }: { item: UserProfile }) => {
    const handle = item.username ? `@${item.username}` : item.displayName;
    const sub = [item.role, item.specialty].filter(Boolean).join(' · ');
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => {
          onSelect(item.id);
          onClose();
        }}
        activeOpacity={0.88}
      >
        <Image
          source={{ uri: avatarThumb(item.avatarUrl, 40) || undefined }}
          style={styles.avatar}
          contentFit="cover"
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.displayName}</Text>
          <Text style={styles.handle}>{handle}</Text>
          {sub ? <Text style={styles.sub} numberOfLines={1}>{sub}</Text> : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.dark.textMuted} />
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.sheet}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Invite collaborator</Text>
          <View style={{ width: 56 }} />
        </View>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={colors.dark.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Name, @username, or specialty"
            placeholderTextColor={colors.dark.textMuted}
            value={q}
            onChangeText={setQ}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={runSearch}
          />
          {busy ? <ActivityIndicator size="small" color={colors.primary.teal} /> : null}
        </View>
        <Text style={styles.hint}>Shows people on PulseVerse. They must have an account.</Text>
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderRow}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: layout.screenPadding + 24 }}
          ListEmptyComponent={
            !busy && q.trim().length >= 2 ? (
              <Text style={styles.empty}>No matches — try another search or paste a user ID (host only).</Text>
            ) : null
          }
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.dark.bg, paddingTop: Platform.OS === 'ios' ? 56 : 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPadding,
    paddingBottom: 12,
  },
  cancel: { fontSize: 16, fontWeight: '700', color: colors.primary.teal },
  title: { fontSize: 16, fontWeight: '800', color: colors.dark.text },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: layout.screenPadding,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.dark.border,
    backgroundColor: colors.dark.card,
  },
  searchIcon: { marginRight: 6 },
  searchInput: { flex: 1, paddingVertical: 12, color: colors.dark.text, fontSize: 15 },
  hint: {
    fontSize: 11,
    color: colors.dark.textMuted,
    paddingHorizontal: layout.screenPadding,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: layout.screenPadding,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.dark.cardAlt },
  name: { fontSize: 15, fontWeight: '800', color: colors.dark.text },
  handle: { fontSize: 13, fontWeight: '600', color: colors.primary.teal, marginTop: 2 },
  sub: { fontSize: 11, color: colors.dark.textMuted, marginTop: 2 },
  empty: { textAlign: 'center', color: colors.dark.textMuted, padding: 24, fontSize: 13 },
});
