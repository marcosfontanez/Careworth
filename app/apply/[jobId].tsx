import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { StackScreenHeader } from '@/components/ui/StackScreenHeader';
import { borderRadius, colors, iconSize, layout, spacing, typography } from '@/theme';
import { useJob } from '@/hooks/useQueries';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { analytics } from '@/lib/analytics';
import { useToast } from '@/components/ui/Toast';
import { SuccessAnimation } from '@/components/ui/SuccessAnimation';
import { AccentComposerFrame } from '@/components/ui/AccentComposerFrame';

export default function ApplyScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const { data: job } = useJob(jobId);
  const toast = useToast();

  const [fullName, setFullName] = useState(
    profile ? `${profile.firstName} ${profile.lastName ?? ''}`.trim() : ''
  );
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const canSubmit = fullName.trim() && email.trim();

  const handleSubmit = async () => {
    if (!canSubmit || !user || !jobId) return;
    setSubmitting(true);
    try {
      await supabase.from('job_applications').insert({
        job_id: jobId,
        user_id: user.id,
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        cover_letter: coverLetter.trim() || null,
        status: 'submitted',
      });

      analytics.track('job_applied', { jobId, jobTitle: job?.title });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowSuccess(true);
    } catch (err: any) {
      toast.show(err.message ?? 'Application failed. Please try again.', 'error');
    }
    setSubmitting(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SuccessAnimation
        visible={showSuccess}
        message="Applied!"
        onComplete={() => router.back()}
      />

      <StackScreenHeader
        insetTop={insets.top}
        title="Quick Apply"
        onPressLeft={() => router.back()}
        leftIcon="close"
        leftAccessibilityLabel="Close"
      />

      {job && (
        <View style={styles.jobPreview}>
          <Text style={styles.jobTitle}>{job.title}</Text>
          <Text style={styles.jobCompany}>
            {job.employerName} · {job.city}, {job.state}
          </Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <AccentComposerFrame accentColor={colors.primary.teal} hint="Full name (required)" compact noShadow>
          <TextInput
            style={styles.inputPlain}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Your full name"
            placeholderTextColor={colors.dark.textMuted}
          />
        </AccentComposerFrame>

        <AccentComposerFrame accentColor={colors.primary.teal} hint="Email (required)" compact noShadow>
          <TextInput
            style={styles.inputPlain}
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            placeholderTextColor={colors.dark.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </AccentComposerFrame>

        <AccentComposerFrame accentColor={colors.primary.teal} hint="Phone (optional)" compact noShadow>
          <TextInput
            style={styles.inputPlain}
            value={phone}
            onChangeText={setPhone}
            placeholder="(555) 000-0000"
            placeholderTextColor={colors.dark.textMuted}
            keyboardType="phone-pad"
          />
        </AccentComposerFrame>

        <AccentComposerFrame accentColor={colors.primary.teal} hint="Cover letter (optional)" compact noShadow>
          <TextInput
            style={[styles.inputPlain, styles.textArea]}
            value={coverLetter}
            onChangeText={setCoverLetter}
            placeholder="Tell the employer why you're a great fit for this role..."
            placeholderTextColor={colors.dark.textMuted}
            multiline
            textAlignVertical="top"
          />
        </AccentComposerFrame>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={iconSize.md} color={colors.primary.teal} />
          <Text style={styles.infoText}>
            Your PulseVerse profile, including your specialty, experience, and certifications, will be
            shared with the employer.
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.md }]}>
        <TouchableOpacity
          style={[styles.submitBtn, !canSubmit && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit || submitting}
          activeOpacity={0.7}
        >
          {submitting ? (
            <ActivityIndicator color={colors.dark.text} size="small" />
          ) : (
            <Text style={styles.submitText}>Submit Application</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  jobPreview: {
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.md - 2,
    backgroundColor: colors.primary.royal + '12',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dark.border,
  },
  jobTitle: { ...typography.sectionTitle, fontSize: 16, color: colors.dark.text },
  jobCompany: { ...typography.bodySmall, color: colors.dark.textMuted, marginTop: 2 },
  form: { padding: layout.screenPadding, gap: spacing.md, paddingBottom: spacing['4xl'] },
  inputPlain: {
    fontSize: 15,
    color: colors.dark.text,
    paddingVertical: 4,
  },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  infoBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary.teal + '10',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.primary.teal + '25',
  },
  infoText: {
    flex: 1,
    ...typography.caption,
    color: colors.dark.textSecondary,
    lineHeight: 18,
  },
  bottomBar: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.dark.border,
    backgroundColor: colors.dark.bg,
  },
  submitBtn: {
    backgroundColor: colors.primary.royal,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  submitDisabled: { opacity: 0.4 },
  submitText: { ...typography.button, fontSize: 16, fontWeight: '800', color: colors.dark.text },
});
