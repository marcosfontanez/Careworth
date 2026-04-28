import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, iconSize, spacing, typography } from '@/theme';
import { useAuth } from '@/contexts/AuthContext';

export default function SignupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signUpWithEmail, signInWithGoogle, signInWithApple } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!name || !email || !password) {
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    const { error } = await signUpWithEmail(email.trim(), password, name.trim());
    setLoading(false);
    if (error) {
      Alert.alert('Sign up failed', error.message);
    } else {
      Alert.alert('Check your email', 'We sent a confirmation link to verify your account.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    const { error } = await signInWithGoogle();
    setLoading(false);
    if (error) Alert.alert('Google sign-up failed', error.message);
  };

  const handleAppleSignup = async () => {
    setLoading(true);
    const { error } = await signInWithApple();
    setLoading(false);
    if (error) Alert.alert('Apple sign-up failed', error.message);
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient
        colors={[colors.primary.navy, colors.dark.cardAlt]}
        style={[styles.container, { paddingTop: insets.top + spacing.xl }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={iconSize.lg} color={colors.dark.text} />
        </TouchableOpacity>

        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join the nursing community</Text>

        <View style={styles.form}>
          <View style={styles.inputWrap}>
            <Ionicons name="person-outline" size={iconSize.md} color={colors.form.iconMuted} />
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor={colors.form.placeholder}
              value={name}
              onChangeText={setName}
              editable={!loading}
            />
          </View>
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
          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={iconSize.md} color={colors.form.iconMuted} />
            <TextInput
              style={styles.input}
              placeholder="Password (min 6 characters)"
              placeholderTextColor={colors.form.placeholder}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
            />
          </View>

          <TouchableOpacity style={styles.signupBtn} onPress={handleSignup} activeOpacity={0.8} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={colors.dark.text} />
            ) : (
              <Text style={styles.signupText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or sign up with</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialRow}>
            <TouchableOpacity style={styles.socialBtn} onPress={handleGoogleSignup} disabled={loading}>
              <Ionicons name="logo-google" size={iconSize.md} color={colors.dark.text} />
              <Text style={styles.socialBtnText}>Google</Text>
            </TouchableOpacity>
            {Platform.OS === 'ios' && (
              <TouchableOpacity style={styles.socialBtn} onPress={handleAppleSignup} disabled={loading}>
                <Ionicons name="logo-apple" size={iconSize.md} color={colors.dark.text} />
                <Text style={styles.socialBtnText}>Apple</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.legalFooter}>
          <Text style={styles.legalText}>By signing up, you agree to our </Text>
          <TouchableOpacity onPress={() => router.push('/legal/terms')} activeOpacity={0.7}>
            <Text style={styles.legalLink}>Terms</Text>
          </TouchableOpacity>
          <Text style={styles.legalText}> and </Text>
          <TouchableOpacity onPress={() => router.push('/legal/privacy')} activeOpacity={0.7}>
            <Text style={styles.legalLink}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing['2xl'] }]}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={styles.loginLink}>Log In</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
  signupBtn: {
    backgroundColor: colors.primary.teal,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  signupText: { color: colors.dark.text, fontSize: 16, fontWeight: '800' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.xs },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.form.divider },
  dividerText: { ...typography.bodySmall, color: colors.form.hint },
  socialRow: { flexDirection: 'row', gap: spacing.md, justifyContent: 'center' },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.form.glassSurface,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md + spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.form.glassBorder,
  },
  socialBtnText: { color: colors.form.socialLabel, fontSize: 14, fontWeight: '600' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  legalFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
    marginTop: spacing.xl,
  },
  legalText: { ...typography.caption, color: colors.form.hint },
  legalLink: { color: colors.primary.teal, fontSize: 12, fontWeight: '600' },
  footerText: { ...typography.body, fontSize: 14, color: colors.form.footerMuted },
  loginLink: { color: colors.primary.teal, fontSize: 14, fontWeight: '700' },
});
