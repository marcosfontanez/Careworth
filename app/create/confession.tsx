import React, { useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { borderRadius, colors, iconSize, layout, spacing, typography } from '@/theme';
import { useAuth } from '@/contexts/AuthContext';
import { postsService } from '@/services/supabase';
import { checkRateLimit } from '@/lib/rateLimit';
import { analytics } from '@/lib/analytics';
import { AccentComposerFrame, AccentCharCount } from '@/components/ui/AccentComposerFrame';
import { scanForPhi, highestSeverity } from '@/lib/phiGuardrail';
import { PHIGuardrailBanner } from '@/components/create/PHIGuardrailBanner';
import { useToast } from '@/components/ui/Toast';

export default function CreateConfessionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const toast = useToast();
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [phiAck, setPhiAck] = useState(false);
  const [commentsOn, setCommentsOn] = useState(true);
  const MAX_CHARS = 2000;

  const phiFindings = useMemo(() => scanForPhi(content), [content]);
  const phiSev = highestSeverity(phiFindings);

  const handlePost = async () => {
    if (!content.trim()) {
      Alert.alert('Add content', 'Please write your confession before posting.');
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
      await postsService.create({
        creator_id: user.id,
        type: 'confession',
        caption: content.trim(),
        is_anonymous: true,
        privacy_mode: 'alias',
        // No community tag. The previous `['shift-confessions']` was a slug, not
        // a community UUID — the posts INSERT RLS casts each entry to uuid
        // (`user_is_member_of_all_post_communities`), so a slug threw
        // "invalid input syntax for type uuid" and every post failed. This is a
        // feed-level anonymous confession (For You), not a Circle wall post, so
        // it carries no community; an empty list passes the membership check.
        feed_type_eligible: ['forYou'],
        comments_disabled: !commentsOn || undefined,
      });

      analytics.track('post_created', { type: 'confession' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)/feed');
    } catch (err: any) {
      Alert.alert('Post failed', err.message ?? 'Something went wrong.');
    } finally {
      setPosting(false);
    }
  };

  const canPost = content.trim().length > 0;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1a0a2e', '#2d1654']} style={styles.gradient}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Close">
            <Ionicons name="close" size={iconSize.lg} color={colors.dark.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Shift Confession</Text>
          <TouchableOpacity onPress={handlePost} activeOpacity={0.7} disabled={posting || !canPost} accessibilityRole="button" accessibilityLabel="Post confession">
            {posting ? (
              <ActivityIndicator size="small" color={colors.primary.gold} />
            ) : (
              <Text style={[styles.postBtn, !canPost && styles.postBtnDisabled]}>Post</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.anonBadge}>
            <Ionicons name="eye-off" size={iconSize.sm} color={colors.dark.text} />
            <Text style={styles.anonText}>This will be posted anonymously</Text>
          </View>

          <AccentComposerFrame
            accentColor={colors.primary.gold}
            hint="Anonymous — only this text is visible to others. Avoid names, MRNs, or details that identify anyone."
            style={{ marginBottom: spacing.md }}
            footer={
              <AccentCharCount
                length={content.length}
                max={MAX_CHARS}
                accentColor={colors.primary.gold}
                warnWithin={120}
                hideWhenEmpty={false}
              />
            }
          >
            <TextInput
              style={styles.mainInput}
              value={content}
              onChangeText={setContent}
              placeholder="What's your confession? This is a safe, anonymous space..."
              placeholderTextColor={colors.form.placeholder}
              multiline
              autoFocus
              editable={!posting}
              maxLength={MAX_CHARS}
            />
          </AccentComposerFrame>

          <PHIGuardrailBanner findings={phiFindings} acknowledged={phiAck} onAcknowledge={() => setPhiAck(true)} />

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

          <View style={styles.footer}>
            <Ionicons name="shield-checkmark" size={iconSize.sm} color={colors.form.iconMuted} />
            <Text style={styles.footerText}>
              Your identity is protected. Only the content will be visible to others.
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.form.glassBorderInner,
  },
  title: { ...typography.sectionTitle, fontSize: 16, color: colors.dark.text },
  postBtn: { ...typography.button, fontSize: 15, fontWeight: '800', color: colors.primary.gold },
  postBtnDisabled: { opacity: 0.35 },
  content: { padding: layout.screenPadding },
  optionsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.form.glassSurface,
    borderRadius: borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.form.glassBorderInner,
  },
  optionText: { fontSize: 13, fontWeight: '600', color: colors.form.subtitle },
  optionChipActive: { borderColor: colors.primary.gold },
  anonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.form.glassSurface,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
    marginBottom: spacing.xl,
  },
  anonText: { color: colors.form.subtitle, fontSize: 13, fontWeight: '600' },
  mainInput: {
    ...typography.body,
    fontSize: 18,
    color: colors.dark.text,
    lineHeight: 28,
    minHeight: 200,
    textAlignVertical: 'top',
    paddingTop: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing['3xl'],
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.form.glassBorderInner,
  },
  footerText: { flex: 1, color: colors.form.hint, fontSize: 12, lineHeight: 18 },
});
