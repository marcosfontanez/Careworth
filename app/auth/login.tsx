import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, spacing, typography } from '@/theme';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signInWithEmail, signInWithGoogle, signInWithApple, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPhoneLogin, setShowPhoneLogin] = useState(false);
  const [phone, setPhone] = useState('');

  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    const { error } = await signInWithEmail(email.trim(), password);
    setLoading(false);
    if (error) {
      Alert.alert('Login failed', error.message);
    } else {
      router.replace('/(tabs)/feed');
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await signInWithGoogle();
    setLoading(false);
    if (error) Alert.alert('Google sign-in failed', error.message);
  };

  const handleAppleLogin = async () => {
    setLoading(true);
    const { error } = await signInWithApple();
    setLoading(false);
    if (error) Alert.alert('Apple sign-in failed', error.message);
  };

  const busy = loading || isLoading;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient colors={[colors.dark.bg, colors.dark.card, colors.dark.bg]} locations={[0, 0.35, 1]} style={[styles.container, { paddingTop: insets.top + 40 }]}>
        <View style={styles.logoWrap}>
          <LinearGradient
            colors={[colors.primary.teal, colors.primary.royal]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoIcon}
          >
            <Text style={styles.logoLetter}>P</Text>
            <View style={styles.pulseWrap}>
              <Ionicons name="pulse" size={18} color={colors.primary.teal} />
            </View>
          </LinearGradient>
          <Text style={styles.logoTitle}>PulseVerse</Text>
          <View style={styles.taglineWrap}>
            <View style={styles.taglineAccent} />
            <Text style={styles.tagline}>Built for Healthcare Life.</Text>
            <View style={styles.taglineAccent} />
          </View>
        </View>

        {!showPhoneLogin ? (
          <View style={styles.form}>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={20} color={colors.form.iconMuted} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={colors.form.placeholder}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!busy}
              />
            </View>

            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.form.iconMuted} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={colors.form.placeholder}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!busy}
              />
            </View>

            <TouchableOpacity onPress={() => router.push('/auth/forgot-password')} activeOpacity={0.7}>
              <Text style={styles.forgot}>Forgot password?</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.loginBtn} onPress={handleEmailLogin} activeOpacity={0.8} disabled={busy}>
              {busy ? <ActivityIndicator color={colors.dark.text} /> : <Text style={styles.loginText}>Log In</Text>}
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialRow}>
              <TouchableOpacity style={styles.socialBtn} onPress={handleGoogleLogin} disabled={busy}>
                <Ionicons name="logo-google" size={22} color={colors.dark.text} />
                <Text style={styles.socialBtnText}>Google</Text>
              </TouchableOpacity>
              {Platform.OS === 'ios' && (
                <TouchableOpacity style={styles.socialBtn} onPress={handleAppleLogin} disabled={busy}>
                  <Ionicons name="logo-apple" size={22} color={colors.dark.text} />
                  <Text style={styles.socialBtnText}>Apple</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.socialBtn} onPress={() => setShowPhoneLogin(true)} disabled={busy}>
                <Ionicons name="call-outline" size={22} color={colors.dark.text} />
                <Text style={styles.socialBtnText}>Phone</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <PhoneLoginForm
            phone={phone}
            setPhone={setPhone}
            onBack={() => setShowPhoneLogin(false)}
            busy={busy}
          />
        )}

        <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/auth/signup')} activeOpacity={0.7}>
            <Text style={styles.signupLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

function PhoneLoginForm({
  phone, setPhone, onBack, busy,
}: {
  phone: string; setPhone: (v: string) => void; onBack: () => void; busy: boolean;
}) {
  const { signInWithPhone, verifyOtp } = useAuth();
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    if (!phone) return;
    setLoading(true);
    const { error } = await signInWithPhone(phone.trim());
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setOtpSent(true);
    }
  };

  const handleVerify = async () => {
    if (!otp) return;
    setLoading(true);
    const { error } = await verifyOtp(phone.trim(), otp.trim());
    setLoading(false);
    if (error) Alert.alert('Verification failed', error.message);
  };

  return (
    <View style={styles.form}>
      <TouchableOpacity onPress={onBack} style={{ marginBottom: 8 }}>
        <Ionicons name="arrow-back" size={24} color={colors.dark.text} />
      </TouchableOpacity>
      <Text style={styles.phoneTitle}>{otpSent ? 'Enter verification code' : 'Sign in with phone'}</Text>

      {!otpSent ? (
        <>
          <View style={styles.inputWrap}>
            <Ionicons name="call-outline" size={20} color={colors.form.iconMuted} />
            <TextInput
              style={styles.input}
              placeholder="+1 (555) 123-4567"
              placeholderTextColor={colors.form.placeholder}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              editable={!loading && !busy}
            />
          </View>
          <TouchableOpacity style={styles.loginBtn} onPress={handleSendOtp} disabled={loading || busy}>
            {loading ? <ActivityIndicator color={colors.dark.text} /> : <Text style={styles.loginText}>Send Code</Text>}
          </TouchableOpacity>
        </>
      ) : (
        <>
          <View style={styles.inputWrap}>
            <Ionicons name="keypad-outline" size={20} color={colors.form.iconMuted} />
            <TextInput
              style={styles.input}
              placeholder="6-digit code"
              placeholderTextColor={colors.form.placeholder}
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
              editable={!loading && !busy}
            />
          </View>
          <TouchableOpacity style={styles.loginBtn} onPress={handleVerify} disabled={loading || busy}>
            {loading ? <ActivityIndicator color={colors.dark.text} /> : <Text style={styles.loginText}>Verify</Text>}
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, paddingHorizontal: spacing['2xl'] },
  logoWrap: { alignItems: 'center', marginBottom: 48 },
  logoIcon: {
    width: 88, height: 88, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16, position: 'relative',
  },
  logoLetter: {
    fontSize: 52, fontWeight: '900', color: colors.dark.text, marginTop: -2,
  },
  pulseWrap: {
    position: 'absolute', bottom: -4, right: -4,
    backgroundColor: colors.dark.bg, borderRadius: 12, padding: 3,
  },
  logoTitle: {
    fontSize: 32, fontWeight: '900', color: colors.dark.text,
    letterSpacing: -0.5, marginBottom: 4,
  },
  taglineWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6,
  },
  taglineAccent: {
    width: 24, height: 2, backgroundColor: colors.primary.teal, opacity: 0.5, borderRadius: 1,
  },
  tagline: { fontSize: 14, color: colors.dark.textSecondary, fontWeight: '500' },
  form: { gap: 16 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.dark.card,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + spacing.xs,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  input: { flex: 1, fontSize: 16, color: colors.dark.text },
  forgot: { color: colors.primary.teal, fontSize: 14, fontWeight: '600', textAlign: 'right' },
  loginBtn: {
    backgroundColor: colors.primary.royal,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  loginText: { color: colors.dark.text, fontSize: 16, fontWeight: '800' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.dark.border },
  dividerText: { color: colors.dark.textMuted, fontSize: 13 },
  socialRow: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
  socialBtn: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.dark.card,
    borderRadius: 14, paddingVertical: 14,
    borderWidth: 1, borderColor: colors.dark.border,
  },
  socialBtnText: { color: colors.dark.text, fontSize: 14, fontWeight: '600' },
  phoneTitle: { ...typography.h3, color: colors.dark.text, marginBottom: spacing.sm },
  footer: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    position: 'absolute', bottom: 0, left: 0, right: 0,
  },
  footerText: { color: colors.dark.textMuted, fontSize: 14 },
  signupLink: { color: colors.primary.teal, fontSize: 14, fontWeight: '700' },
});
