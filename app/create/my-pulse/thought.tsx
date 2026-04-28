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

export default function MyPulseThoughtScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const showToast = useToast((s) => s.show);
  const { profile } = useAuth();
  const storeUser = useAppStore((s) => s.currentUser);
  const user = profile ?? storeUser;

  const [body, setBody] = useState('');
  const [mood, setMood] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not signed in');
      return profileUpdatesService.add(user.id, {
        type: 'thought',
        content: body.trim(),
        mood: mood.trim() || undefined,
        previewText: body.trim().slice(0, 160),
      });
    },
    onSuccess: async () => {
      if (user?.id) await queryClient.invalidateQueries({ queryKey: profileUpdateKeys.forUser(user.id) });
      showToast('Thought added to My Pulse', 'success');
      router.replace('/(tabs)/my-pulse');
    },
  });

  const submit = useCallback(() => {
    if (!body.trim()) return;
    mutation.mutate();
  }, [body, mutation]);

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
        <Text style={styles.headerTitle}>Thought</Text>
        <TouchableOpacity onPress={submit} disabled={!body.trim() || mutation.isPending}>
          <Text style={[styles.postBtn, (!body.trim() || mutation.isPending) && styles.postBtnOff]}>Add</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.hint}>
        A short reflection or personal update — this is the Thought row on your
        My Pulse. Keep it real, keep it brief.
      </Text>

      <Text style={styles.fieldLbl}>Mood (optional)</Text>
      <TextInput
        style={styles.moodInput}
        placeholder="e.g. Grateful, Tired, Hopeful"
        placeholderTextColor={colors.dark.textMuted}
        value={mood}
        onChangeText={setMood}
        maxLength={40}
      />

      <Text style={styles.fieldLbl}>What&apos;s on your mind?</Text>
      <MentionAutocomplete
        style={styles.input}
        placeholder="Share a quick thought… tag people with @"
        placeholderTextColor={colors.dark.textMuted}
        value={body}
        onChangeText={setBody}
        multiline
        textAlignVertical="top"
        maxLength={280}
      />
      <Text style={styles.count}>{body.length}/280</Text>
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
  postBtn: { fontSize: 16, fontWeight: '800', color: colors.primary.teal },
  postBtnOff: { opacity: 0.35 },
  hint: { fontSize: 13, color: colors.dark.textSecondary, lineHeight: 19, marginBottom: 16 },
  fieldLbl: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.dark.textMuted,
    marginBottom: 8,
  },
  moodInput: {
    backgroundColor: colors.dark.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.dark.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.dark.text,
    marginBottom: 18,
  },
  input: {
    flex: 1,
    minHeight: 140,
    fontSize: 16,
    lineHeight: 24,
    color: colors.dark.text,
    backgroundColor: colors.dark.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: 14,
  },
  count: {
    alignSelf: 'flex-end',
    marginTop: 8,
    fontSize: 12,
    color: colors.dark.textMuted,
  },
});
