import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackScreenHeader } from '@/components/ui/StackScreenHeader';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { colors, layout, spacing, typography } from '@/theme';

export default function ContentAppealScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const toast = useToast();
  const { postId: postIdRaw } = useLocalSearchParams<{ postId: string }>();
  const postId = decodeURIComponent(Array.isArray(postIdRaw) ? postIdRaw[0] : postIdRaw ?? '').trim();
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!user?.id) {
      toast.show('Sign in to submit an appeal', 'info');
      return;
    }
    const msg = message.trim();
    if (msg.length < 8) {
      toast.show('Please add a bit more detail (at least 8 characters)', 'info');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('content_appeals').insert({
        user_id: user.id,
        post_id: postId || null,
        message: msg,
      } as never);
      if (error) throw error;
      toast.show('Appeal submitted. Our team will review.', 'success');
      router.back();
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : 'Could not submit';
      toast.show(err.length > 120 ? `${err.slice(0, 117)}…` : err, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <StackScreenHeader insetTop={insets.top} title="Request review" onPressLeft={() => router.back()} />
      <View style={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={styles.lead}>
          Explain why this content should remain visible or was flagged in error. Include policy references if you have them.
        </Text>
        <TextInput
          style={styles.input}
          value={message}
          onChangeText={setMessage}
          placeholder="Your message to moderators…"
          placeholderTextColor={colors.dark.textMuted}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          editable={!submitting}
        />
        <TouchableOpacity
          style={[styles.btn, (!message.trim() || submitting) && styles.btnDisabled]}
          onPress={() => void submit()}
          disabled={!message.trim() || submitting}
          activeOpacity={0.88}
        >
          {submitting ? (
            <ActivityIndicator color={colors.dark.text} />
          ) : (
            <Text style={styles.btnText}>Submit appeal</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  body: { paddingHorizontal: layout.screenPadding, paddingTop: spacing.lg, gap: spacing.md },
  lead: { ...typography.bodySmall, color: colors.dark.textSecondary, lineHeight: 20 },
  input: {
    minHeight: 140,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: spacing.md,
    backgroundColor: colors.dark.cardAlt,
    color: colors.dark.text,
    fontSize: 15,
  },
  btn: {
    marginTop: spacing.sm,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.primary.teal,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { fontSize: 15, fontWeight: '800', color: colors.dark.text },
});
