import React, { useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
import { AccentComposerFrame, AccentCharCount } from '@/components/ui/AccentComposerFrame';
import { scanForPhi, highestSeverity } from '@/lib/phiGuardrail';
import { PHIGuardrailBanner } from '@/components/create/PHIGuardrailBanner';

export default function CreateTextScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [posting, setPosting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [phiAck, setPhiAck] = useState(false);
  const [commentsOn, setCommentsOn] = useState(true);
  const toast = useToast();

  const phiFindings = useMemo(
    () => scanForPhi(content, hashtags),
    [content, hashtags],
  );
  const phiSev = highestSeverity(phiFindings);

  const handlePost = async () => {
    if (!content.trim()) {
      Alert.alert('Add content', 'Please write something before posting.');
      return;
    }
    if (!user) {
      toast.show('Sign in to post', 'error');
      return;
    }
    if (phiSev === 'high') {
      toast.show('High-risk privacy pattern — remove or reword before posting', 'error');
      return;
    }
    if (phiFindings.length > 0 && !phiAck) {
      toast.show('Review the privacy banner and confirm before posting', 'error');
      return;
    }
    if (!checkRateLimit('post')) return;

    setPosting(true);
    try {
      const tags = hashtags.split(/[\s,]+/).filter((t) => t.startsWith('#')).map((t) => t.slice(1));
      await postsService.create({
        creator_id: user.id,
        type: 'discussion',
        caption: content.trim(),
        hashtags: tags,
        feed_type_eligible: ['forYou', 'following'],
        comments_disabled: !commentsOn || undefined,
      });

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
          <TouchableOpacity
            onPress={handlePost}
            activeOpacity={0.7}
            disabled={posting || !canPost}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Post discussion"
          >
            {posting ? (
              <ActivityIndicator size="small" color={colors.primary.teal} />
            ) : (
              <Text style={[styles.postBtn, !canPost && styles.postDisabled]}>Post</Text>
            )}
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <AccentComposerFrame
          accentColor={colors.primary.teal}
          hint="Start a discussion — share a thought or ask a question."
          footer={
            <AccentCharCount
              length={charCount}
              max={MAX_CHARS}
              accentColor={colors.primary.teal}
              warnWithin={200}
              hideWhenEmpty={false}
            />
          }
        >
          <TextInput
            style={styles.mainInput}
            value={content}
            onChangeText={setContent}
            placeholder="What’s on your mind?"
            placeholderTextColor={colors.dark.textMuted}
            multiline
            autoFocus
            editable={!posting}
            maxLength={MAX_CHARS}
          />
        </AccentComposerFrame>

        <PHIGuardrailBanner findings={phiFindings} acknowledged={phiAck} onAcknowledge={() => setPhiAck(true)} />

        <AccentComposerFrame
          accentColor={colors.primary.teal}
          hint="Hashtags (optional)"
          compact
          noShadow
        >
          <TextInput
            style={styles.tagsInput}
            value={hashtags}
            onChangeText={setHashtags}
            placeholder="#Discussion #NurseLife"
            placeholderTextColor={colors.dark.textMuted}
            editable={!posting}
          />
        </AccentComposerFrame>

        <View style={styles.optionsRow}>
          <TouchableOpacity
            style={[styles.optionChip, !commentsOn && styles.optionChipActive]}
            activeOpacity={0.7}
            onPress={() => setCommentsOn(!commentsOn)}
          >
            <Ionicons
              name={commentsOn ? 'chatbubble-outline' : 'chatbubble-ellipses-outline'}
              size={18}
              color={commentsOn ? colors.dark.textSecondary : '#EF4444'}
            />
            <Text style={[styles.optionText, !commentsOn && { color: '#EF4444' }]}>
              {commentsOn ? 'Comments On' : 'Comments Off'}
            </Text>
          </TouchableOpacity>
        </View>
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
    paddingTop: 4,
  },
  tagsInput: {
    ...typography.body,
    fontSize: 15,
    color: colors.dark.text,
    paddingVertical: 4,
  },
  optionsRow: { flexDirection: 'row', gap: spacing.sm },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.dark.card,
    borderRadius: borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  optionText: { fontSize: 13, fontWeight: '600', color: colors.dark.textSecondary },
  optionChipActive: { borderColor: colors.primary.teal },
});
