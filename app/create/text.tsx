import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { StackScreenHeader } from '@/components/ui/StackScreenHeader';
import { borderRadius, colors, layout, spacing, typography } from '@/theme';
import { useAuth } from '@/contexts/AuthContext';
import { postsService } from '@/services/supabase';
import { checkRateLimit } from '@/lib/rateLimit';
import { analytics } from '@/lib/analytics';
import { SuccessAnimation } from '@/components/ui/SuccessAnimation';
import { useToast } from '@/components/ui/Toast';

export default function CreateTextScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [posting, setPosting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const toast = useToast();

  const handlePost = async () => {
    if (!content.trim()) {
      Alert.alert('Add content', 'Please write something before posting.');
      return;
    }
    if (!checkRateLimit('post')) return;

    setPosting(true);
    try {
      if (user) {
        const tags = hashtags.split(/[\s,]+/).filter((t) => t.startsWith('#')).map((t) => t.slice(1));
        await postsService.create({
          creator_id: user.id,
          type: 'discussion',
          caption: content.trim(),
          hashtags: tags,
          feed_type_eligible: ['forYou', 'following'],
        });
      }

      analytics.track('post_created', { type: 'discussion' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowSuccess(true);
    } catch (err: any) {
      toast.show(err.message ?? 'Something went wrong.', 'error');
    } finally {
      setPosting(false);
    }
  };

  const canPost = content.trim().length > 0;
  const charCount = content.length;
  const MAX_CHARS = 2000;

  return (
    <View style={styles.container}>
      <SuccessAnimation
        visible={showSuccess}
        message="Posted!"
        onComplete={() => router.replace('/(tabs)/feed')}
      />

      <StackScreenHeader
        insetTop={insets.top}
        title="Discussion"
        onPressLeft={() => router.back()}
        leftIcon="close"
        leftAccessibilityLabel="Close"
        right={
          <TouchableOpacity onPress={handlePost} activeOpacity={0.7} disabled={posting || !canPost} hitSlop={12}>
            {posting ? (
              <ActivityIndicator size="small" color={colors.primary.teal} />
            ) : (
              <Text style={[styles.postBtn, !canPost && styles.postDisabled]}>Post</Text>
            )}
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextInput
          style={styles.mainInput}
          value={content}
          onChangeText={setContent}
          placeholder="Start a discussion, share a thought, or ask a question..."
          placeholderTextColor={colors.dark.textMuted}
          multiline
          autoFocus
          editable={!posting}
        />

        <Text style={[styles.charCount, charCount > MAX_CHARS && { color: colors.status.error }]}>
          {charCount}/{MAX_CHARS}
        </Text>

        <Text style={styles.label}>Hashtags</Text>
        <TextInput
          style={styles.input}
          value={hashtags}
          onChangeText={setHashtags}
          placeholder="#Discussion #NurseLife"
          placeholderTextColor={colors.dark.textMuted}
          editable={!posting}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  postBtn: { ...typography.button, fontSize: 15, fontWeight: '800', color: colors.primary.teal },
  postDisabled: { opacity: 0.4 },
  content: { padding: layout.screenPadding, gap: spacing.lg },
  mainInput: {
    ...typography.body,
    fontSize: 17,
    color: colors.dark.text,
    lineHeight: 26,
    minHeight: 160,
    textAlignVertical: 'top',
  },
  label: { ...typography.sectionLabel, color: colors.dark.textSecondary },
  input: {
    backgroundColor: colors.dark.card,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + spacing.xs,
    fontSize: 15,
    color: colors.dark.text,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.dark.border,
  },
  charCount: {
    ...typography.caption,
    color: colors.dark.textMuted,
    textAlign: 'right',
    fontWeight: '500',
    marginTop: -spacing.sm,
  },
});
