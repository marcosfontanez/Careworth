import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, iconSize, spacing, typography } from '@/theme';
import { useAuth } from '@/contexts/AuthContext';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!email) {
      Alert.alert('Missing email', 'Please enter your email address.');
      return;
    }
    setLoading(true);
    const { error } = await resetPassword(email.trim());
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setSent(true);
    }
  };

  return (
    <LinearGradient
      colors={[colors.primary.navy, colors.dark.cardAlt]}
      style={[styles.container, { paddingTop: insets.top + spacing.xl }]}
    >
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={iconSize.lg} color={colors.dark.text} />
      </TouchableOpacity>

      <Text style={styles.title}>Reset Password</Text>
      <Text style={styles.subtitle}>
        {sent ? 'Check your email for a reset link' : 'Enter your email to receive a password reset link'}
      </Text>

      {!sent ? (
        <View style={styles.form}>
          <View style={styles.inputWrap}>
            <Ionicons name="mail-outline" size={iconSize.md} color={colors.form.iconMuted} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.form.placeholder}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />
          </View>
          <TouchableOpacity style={styles.resetBtn} onPress={handleReset} activeOpacity={0.8} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={colors.dark.text} />
            ) : (
              <Text style={styles.resetText}>Send Reset Link</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.sentWrap}>
          <Ionicons name="checkmark-circle" size={64} color={colors.primary.teal} />
          <Text style={styles.sentText}>Email sent! Check your inbox.</Text>
          <TouchableOpacity style={styles.backToLogin} onPress={() => router.back()} activeOpacity={0.8}>
            <Text style={styles.backToLoginText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing['2xl'] },
  backBtn: { marginBottom: spacing.xl },
  title: { ...typography.h1, color: colors.dark.text },
  subtitle: {
    ...typography.body,
    fontSize: 15,
    color: colors.form.subtitle,
    marginTop: spacing.xs,
    marginBottom: spacing['3xl'],
  },
  form: { gap: spacing.lg },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.form.glassSurface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.form.glassBorderInner,
  },
  input: { flex: 1, fontSize: 16, color: colors.dark.text },
  resetBtn: {
    backgroundColor: colors.primary.royal,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  resetText: { color: colors.dark.text, fontSize: 16, fontWeight: '800' },
  sentWrap: { alignItems: 'center', marginTop: spacing['4xl'], gap: spacing.lg },
  sentText: { fontSize: 16, color: colors.form.bodyStrong, fontWeight: '600' },
  backToLogin: {
    backgroundColor: colors.form.glassSurface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing['3xl'],
    paddingVertical: spacing.md + spacing.xs,
    marginTop: spacing.sm,
  },
  backToLoginText: { color: colors.dark.text, fontSize: 14, fontWeight: '700' },
});
