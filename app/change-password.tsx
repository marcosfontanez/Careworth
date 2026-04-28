import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StackScreenHeader } from '@/components/ui/StackScreenHeader';
import { colors, borderRadius, iconSize, layout, spacing, typography } from '@/theme';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const canSave = newPassword.length >= 8 && newPassword === confirmPassword;

  const handleSave = async () => {
    if (!canSave) return;

    if (newPassword.length < 8) {
      toast.show('Password must be at least 8 characters', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.show('Passwords do not match', 'error');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.show('Password updated successfully', 'success');
      router.back();
    } catch (err: any) {
      toast.show(err.message ?? 'Failed to update password', 'error');
    }
    setSaving(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StackScreenHeader insetTop={insets.top} title="Change Password" onPressLeft={() => router.back()} />

      <View style={styles.form}>
        <Text style={styles.label}>New Password</Text>
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Enter new password"
            placeholderTextColor={colors.dark.textMuted}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} activeOpacity={0.7}>
            <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={iconSize.md} color={colors.dark.textMuted} />
          </TouchableOpacity>
        </View>

        {newPassword.length > 0 && newPassword.length < 8 && (
          <Text style={styles.hint}>Must be at least 8 characters</Text>
        )}

        <Text style={[styles.label, styles.labelSpaced]}>Confirm Password</Text>
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm new password"
            placeholderTextColor={colors.dark.textMuted}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />
        </View>

        {confirmPassword.length > 0 && newPassword !== confirmPassword && (
          <Text style={styles.hint}>Passwords do not match</Text>
        )}

        <View style={styles.strengthRow}>
          <View style={[styles.strengthBar, newPassword.length >= 8 && styles.strengthGood]} />
          <View style={[styles.strengthBar, newPassword.length >= 12 && styles.strengthGood]} />
          <View
            style={[
              styles.strengthBar,
              /[A-Z]/.test(newPassword) && /\d/.test(newPassword) && styles.strengthGood,
            ]}
          />
        </View>
        <Text style={styles.strengthText}>
          {newPassword.length === 0
            ? ''
            : newPassword.length < 8
              ? 'Weak'
              : newPassword.length < 12
                ? 'Good'
                : 'Strong'}
        </Text>

        <TouchableOpacity
          style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!canSave || saving}
          activeOpacity={0.7}
        >
          {saving ? (
            <ActivityIndicator color={colors.dark.text} size="small" />
          ) : (
            <Text style={styles.saveBtnText}>Update Password</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  form: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.lg,
  },
  label: { ...typography.sectionLabel, color: colors.dark.textSecondary, marginBottom: spacing.sm },
  labelSpaced: { marginTop: spacing.xl },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    backgroundColor: colors.dark.card,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.dark.border,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md + spacing.xs,
    fontSize: 15,
    color: colors.dark.text,
  },
  hint: { ...typography.caption, color: colors.status.error, marginTop: spacing.xs },
  strengthRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.lg },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.dark.border,
  },
  strengthGood: { backgroundColor: colors.primary.teal },
  strengthText: {
    ...typography.caption,
    color: colors.dark.textMuted,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  saveBtn: {
    backgroundColor: colors.primary.royal,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing['3xl'],
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { ...typography.button, fontSize: 16, fontWeight: '800', color: colors.dark.text },
});
