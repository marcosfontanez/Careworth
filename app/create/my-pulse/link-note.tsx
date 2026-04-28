import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useAppStore } from '@/store/useAppStore';
import { profileUpdatesService } from '@/services/profileUpdates';
import { useToast } from '@/components/ui/Toast';
import { MentionAutocomplete } from '@/components/ui/MentionAutocomplete';
import { colors, borderRadius, typography } from '@/theme';
import { profileUpdateKeys } from '@/lib/queryKeys';

function normalizeUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return '';
  return t.startsWith('http://') || t.startsWith('https://') ? t : `https://${t}`;
}

/** External link row — maps to `media_note` + `linkedUrl` (blue link style on My Pulse). */
export default function MyPulseLinkNoteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const showToast = useToast((s) => s.show);
  const { profile } = useAuth();
  const storeUser = useAppStore((s) => s.currentUser);
  const user = profile ?? storeUser;

  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not signed in');
      const href = normalizeUrl(url);
      const line = title.trim();
      return profileUpdatesService.add(user.id, {
        type: 'media_note',
        content: line,
        linkedUrl: href,
        previewText: line.slice(0, 160),
      });
    },
    onSuccess: async () => {
      if (user?.id) await queryClient.invalidateQueries({ queryKey: profileUpdateKeys.forUser(user.id) });
      showToast('Link added to My Pulse', 'success');
      router.replace('/(tabs)/my-pulse');
    },
  });

  const submit = useCallback(() => {
    if (!title.trim() || !url.trim()) return;
    mutation.mutate();
  }, [title, url, mutation]);

  const canSubmit = title.trim().length > 0 && url.trim().length > 0;

  if (!user) return <Redirect href="/auth/login" />;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Link</Text>
        <TouchableOpacity onPress={submit} disabled={!canSubmit || mutation.isPending}>
          <Text style={[styles.postBtn, (!canSubmit || mutation.isPending) && styles.postBtnOff]}>Add</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.hint}>Share a resource — it opens your URL when someone taps the row.</Text>

      <Text style={styles.fieldLbl}>What you&apos;re sharing</Text>
      <MentionAutocomplete
        style={styles.single}
        placeholder="Your take — tag folks with @"
        placeholderTextColor={colors.dark.textMuted}
        value={title}
        onChangeText={setTitle}
        maxLength={200}
      />

      <Text style={styles.fieldLbl}>URL</Text>
      <TextInput
        style={styles.single}
        placeholder="https://…"
        placeholderTextColor={colors.dark.textMuted}
        value={url}
        onChangeText={setUrl}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg, paddingHorizontal: 18 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitle: { ...typography.h3, color: colors.dark.text },
  postBtn: { fontSize: 16, fontWeight: '800', color: '#60A5FA' },
  postBtnOff: { opacity: 0.35 },
  hint: { fontSize: 13, color: colors.dark.textSecondary, lineHeight: 19, marginBottom: 18 },
  fieldLbl: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.dark.textMuted,
    marginBottom: 8,
  },
  single: {
    backgroundColor: colors.dark.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.dark.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.dark.text,
    marginBottom: 16,
  },
});
