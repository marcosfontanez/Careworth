import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
  ImageBackground,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { colors, borderRadius, iconSize, spacing, typography } from '@/theme';
import { useAuth } from '@/contexts/AuthContext';
import { profilesService } from '@/services/supabase';
import { usernamePassesContentPolicy } from '@/lib/handleContentPolicy';
import { sanitizeUsername, isValidUsername } from '@/utils/profileHandle';
import { PatientPrivacyHipaaPanel } from '@/components/auth/PatientPrivacyHipaaPanel';
import { TERMS_PRIVACY_CHECKBOX_LABEL } from '@/constants/authLegal';

const CYAN = '#22d3ee';

const AUTH_SPLASH_BG = require('@/assets/images/auth-splash-background.png');
const AUTH_LOGO_MARK = require('@/assets/images/pulseverse-premium-logo.png');

/** Smooth full-width capsule (same tap target for Log In / Create account / phone CTAs). */
const PRIMARY_PILL_H = 52;
const PRIMARY_PILL_RADIUS = PRIMARY_PILL_H / 2;

type AuthTab = 'login' | 'signup';

function PrimaryActionButton({
  label,
  onPress,
  disabled,
  busy,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      disabled={disabled || busy}
      style={styles.primaryTouch}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={[styles.primaryPillShadow, { borderRadius: PRIMARY_PILL_RADIUS }]}>
        <LinearGradient
          colors={['#2563eb', '#0891b2', '#06b6d4']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[
            styles.primaryGradient,
            { minHeight: PRIMARY_PILL_H, borderRadius: PRIMARY_PILL_RADIUS },
            Platform.OS === 'ios' && styles.primaryPillCurve,
            disabled && !busy && styles.primaryDisabled,
          ]}
        >
          {busy ? (
            <View style={styles.primaryBusyInner}>
              <ActivityIndicator color={colors.dark.text} size="large" />
            </View>
          ) : (
            <View style={styles.primaryPillRow}>
              <View style={styles.primaryPillSideSlot} />
              <Text style={styles.primaryLabel} numberOfLines={1}>
                {label}
              </Text>
              <View style={styles.primaryPillSideSlot}>
                <View style={styles.primaryEcg}>
                  <Svg width={40} height={18} viewBox="0 0 40 18">
                    <Path
                      d="M0 9 L6 9 L8 4 L10 14 L12 6 L15 9 L40 9"
                      fill="none"
                      stroke="rgba(255,255,255,0.45)"
                      strokeWidth={1.2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </View>
              </View>
            </View>
          )}
        </LinearGradient>
      </View>
    </TouchableOpacity>
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  const params = useLocalSearchParams<{ mode?: string }>();
  const mode = useMemo(() => (typeof params.mode === 'string' ? params.mode : undefined), [params.mode]);

  const {
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signInWithApple,
    isLoading,
  } = useAuth();

  const [authTab, setAuthTab] = useState<AuthTab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [handle, setHandle] = useState('');
  const [handleStatus, setHandleStatus] = useState<
    'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'disallowed'
  >('idle');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPhoneLogin, setShowPhoneLogin] = useState(false);

  useEffect(() => {
    if (mode === 'signup') setAuthTab('signup');
  }, [mode]);

  useEffect(() => {
    if (authTab === 'login') {
      setConfirmPassword('');
      setHandle('');
      setHandleStatus('idle');
    }
  }, [authTab]);

  useEffect(() => {
    if (authTab !== 'signup') return;
    let cancelled = false;
    const raw = handle.trim().toLowerCase();
    const kick = async () => {
      if (!raw) {
        setHandleStatus('idle');
        return;
      }
      if (!isValidUsername(raw)) {
        setHandleStatus('invalid');
        return;
      }
      if (!usernamePassesContentPolicy(raw)) {
        setHandleStatus('disallowed');
        return;
      }
      setHandleStatus('checking');
      const ok = await profilesService.isUsernameAvailable(raw);
      if (!cancelled) setHandleStatus(ok ? 'available' : 'taken');
    };
    const t = setTimeout(() => void kick(), 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [handle, authTab]);

  const signupHandleBlocked =
    authTab === 'signup' &&
    (!handle.trim() || handleStatus === 'disallowed' || handleStatus !== 'available');

  const busy = loading || isLoading;

  const requireLegal = (forLabel: string) => {
    if (acceptedTerms) return true;
    Alert.alert(
      'Agree to Terms and privacy expectations',
      `Please read the patient privacy section and confirm the checkbox before ${forLabel}.`,
    );
    return false;
  };

  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    const { error } = await signInWithEmail(email.trim(), password);
    setLoading(false);
    if (error) Alert.alert('Login failed', error.message);
    else router.replace('/');
  };

  const handleSignup = async () => {
    if (!fullName || !email || !password || !confirmPassword || !handle.trim()) {
      Alert.alert('Missing fields', 'Please fill in all fields, including your @handle.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Please re-enter your password and confirmation so they match.');
      return;
    }
    if (!requireLegal('creating your account')) return;
    if (password.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters.');
      return;
    }
    const preferred = sanitizeUsername(handle);
    if (!preferred) {
      Alert.alert(
        'Invalid handle',
        'Use 3–30 characters: lowercase letters, numbers, dots, and underscores. No leading/trailing dot.',
      );
      return;
    }
    if (handleStatus === 'disallowed') {
      Alert.alert(
        'Handle not allowed',
        'Reserved words (such as PulseVerse or staff names), impersonation, or prohibited language are not allowed in your handle. Pick a different @handle.',
      );
      return;
    }
    if (handleStatus !== 'available') {
      Alert.alert('Handle not available', 'Pick a different @handle or wait until the availability check finishes.');
      return;
    }
    setLoading(true);
    const termsAt = new Date().toISOString();
    const { error } = await signUpWithEmail(
      email.trim(),
      password,
      fullName.trim(),
      termsAt,
      preferred,
    );
    setLoading(false);
    if (error) Alert.alert('Sign up failed', error.message);
    else {
      Alert.alert('Check your email', 'We sent a confirmation link to verify your account.');
    }
  };

  const handleGoogle = async () => {
    if (authTab === 'signup' && !requireLegal('continuing with Google')) return;
    setLoading(true);
    const { error } = await signInWithGoogle();
    setLoading(false);
    if (error) Alert.alert('Google failed', error.message);
    else router.replace('/');
  };

  const handleApple = async () => {
    if (authTab === 'signup' && !requireLegal('continuing with Apple')) return;
    setLoading(true);
    const { error } = await signInWithApple();
    setLoading(false);
    if (error) Alert.alert('Apple failed', error.message);
    else router.replace('/');
  };

  const socialDisabledSignup = authTab === 'signup' && !acceptedTerms;

  const logoW = Math.min(winW - spacing['2xl'] * 2, 340);
  const logoH = logoW * 0.75;

  return (
    <ImageBackground
      source={AUTH_SPLASH_BG}
      style={styles.flex}
      resizeMode="cover"
    >
      <LinearGradient
        colors={['rgba(2,6,23,0.2)', 'rgba(2,6,23,0.45)', 'rgba(2,6,23,0.78)']}
        locations={[0, 0.38, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing['3xl'] },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoWrap} accessibilityRole="header">
            <Image
              source={AUTH_LOGO_MARK}
              style={{ width: logoW, height: logoH }}
              contentFit="contain"
              accessibilityLabel="PulseVerse — Built for Healthcare Life."
            />
          </View>

          <View style={styles.segmentShell}>
            <TouchableOpacity
              style={styles.segmentTap}
              onPress={() => setAuthTab('login')}
              accessibilityRole="button"
              accessibilityState={{ selected: authTab === 'login' }}
            >
              {authTab === 'login' ? (
                <LinearGradient
                  colors={['#1d4ed8', '#0e7490']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.segmentActive}
                >
                  <Text style={styles.segmentTextOn}>Log In</Text>
                </LinearGradient>
              ) : (
                <View style={styles.segmentIdle}>
                  <Text style={styles.segmentTextOff}>Log In</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.segmentTap}
              onPress={() => setAuthTab('signup')}
              accessibilityRole="button"
              accessibilityState={{ selected: authTab === 'signup' }}
            >
              {authTab === 'signup' ? (
                <LinearGradient
                  colors={['#1d4ed8', '#0e7490']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.segmentActive}
                >
                  <Text style={styles.segmentTextOn}>Sign Up</Text>
                </LinearGradient>
              ) : (
                <View style={styles.segmentIdle}>
                  <Text style={styles.segmentTextOff}>Sign Up</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {!showPhoneLogin ? (
            <View style={styles.form}>
              {authTab === 'signup' && (
                <View style={styles.inputWrap}>
                  <Ionicons name="person-outline" size={iconSize.md} color={CYAN} />
                  <TextInput
                    style={styles.input}
                    placeholder="Full name"
                    placeholderTextColor={colors.form.placeholder}
                    value={fullName}
                    onChangeText={setFullName}
                    editable={!busy}
                  />
                </View>
              )}

              {authTab === 'signup' && (
                <View style={styles.inputWrap}>
                  <Text style={styles.atPrefix}>@</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="your.handle"
                    placeholderTextColor={colors.form.placeholder}
                    value={handle}
                    onChangeText={(t) => setHandle(t.replace(/^@+/, '').toLowerCase())}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="username"
                    editable={!busy}
                    maxLength={30}
                  />
                </View>
              )}

              {authTab === 'signup' ? <SignupHandleHint handle={handle} status={handleStatus} /> : null}

              <View style={styles.inputWrap}>
                <Ionicons name="mail-outline" size={iconSize.md} color={CYAN} />
                <TextInput
                  style={styles.input}
                  placeholder="Email address"
                  placeholderTextColor={colors.form.placeholder}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!busy}
                />
              </View>

              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={iconSize.md} color={CYAN} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={colors.form.placeholder}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  editable={!busy}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((v) => !v)}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color={CYAN}
                  />
                </TouchableOpacity>
              </View>

              {authTab === 'signup' && (
                <View style={styles.inputWrap}>
                  <Ionicons name="lock-closed-outline" size={iconSize.md} color={CYAN} />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm password"
                    placeholderTextColor={colors.form.placeholder}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showPassword}
                    editable={!busy}
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="newPassword"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword((v) => !v)}
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={22}
                      color={CYAN}
                    />
                  </TouchableOpacity>
                </View>
              )}

              {authTab === 'login' && (
                <TouchableOpacity onPress={() => router.push('/auth/forgot-password')} activeOpacity={0.7}>
                  <Text style={styles.forgot}>Forgot password?</Text>
                </TouchableOpacity>
              )}

              {authTab === 'signup' && (
                <>
                  <PatientPrivacyHipaaPanel />
                  <View style={styles.linksRow}>
                    <TouchableOpacity onPress={() => router.push('/legal/terms')} activeOpacity={0.7}>
                      <Text style={styles.link}>Terms of Service</Text>
                    </TouchableOpacity>
                    <Text style={styles.linkSep}>·</Text>
                    <TouchableOpacity onPress={() => router.push('/legal/privacy')} activeOpacity={0.7}>
                      <Text style={styles.link}>Privacy Policy</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    style={styles.checkRow}
                    onPress={() => setAcceptedTerms((v) => !v)}
                    activeOpacity={0.85}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: acceptedTerms }}
                  >
                    <View style={[styles.checkBox, acceptedTerms && styles.checkBoxOn]}>
                      {acceptedTerms ? (
                        <Ionicons name="checkmark" size={16} color={colors.dark.bg} />
                      ) : null}
                    </View>
                    <Text style={styles.checkLabel}>{TERMS_PRIVACY_CHECKBOX_LABEL}</Text>
                  </TouchableOpacity>
                </>
              )}

              {authTab === 'login' ? (
                <PrimaryActionButton label="Log In" onPress={handleEmailLogin} busy={busy} disabled={busy} />
              ) : (
                <PrimaryActionButton
                  label="Create account"
                  onPress={handleSignup}
                  busy={busy}
                  disabled={busy || !acceptedTerms || signupHandleBlocked}
                />
              )}

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or continue with</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.socialRow}>
                <TouchableOpacity
                  style={[styles.socialBtn, socialDisabledSignup && styles.socialBtnDisabled]}
                  onPress={handleGoogle}
                  disabled={busy || socialDisabledSignup}
                >
                  <Ionicons name="logo-google" size={20} color={colors.dark.text} />
                  <Text style={styles.socialBtnText}>Google</Text>
                </TouchableOpacity>
                {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    style={[styles.socialBtn, socialDisabledSignup && styles.socialBtnDisabled]}
                    onPress={handleApple}
                    disabled={busy || socialDisabledSignup}
                  >
                    <Ionicons name="logo-apple" size={20} color={colors.dark.text} />
                    <Text style={styles.socialBtnText}>Apple</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.socialBtn, socialDisabledSignup && styles.socialBtnDisabled]}
                  onPress={() => setShowPhoneLogin(true)}
                  disabled={busy || socialDisabledSignup}
                >
                  <Ionicons name="call-outline" size={20} color={colors.dark.text} />
                  <Text style={styles.socialBtnText}>Phone</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <PhoneLoginForm phoneBusy={busy} onBack={() => setShowPhoneLogin(false)} />
          )}

          <View style={styles.secureRow}>
            <Ionicons name="shield-checkmark" size={20} color={CYAN} />
            <Text style={styles.secureText}>
              Your data is protected with enterprise-grade encryption and secure authentication.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

function SignupHandleHint({
  handle,
  status,
}: {
  handle: string;
  status: 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'disallowed';
}) {
  const raw = handle.trim().toLowerCase();
  let icon: keyof typeof Ionicons.glyphMap | null = null;
  let tint: string = colors.form.hint;
  let message =
    'This is your public @handle — you can change it later in Edit profile. Others use it to mention you.';

  if (!raw) {
    message = 'Choose a unique handle (3–30 characters). Shown as @handle on your profile.';
  } else if (status === 'checking') {
    icon = 'ellipsis-horizontal';
    tint = colors.dark.textMuted;
    message = 'Checking availability…';
  } else if (status === 'invalid') {
    icon = 'alert-circle';
    tint = colors.status.error;
    message =
      'Use 3–30 characters: lowercase letters, numbers, dots, underscores. No leading/trailing dot, no ..';
  } else if (status === 'disallowed') {
    icon = 'shield-outline';
    tint = colors.status.error;
    message =
      'This handle is not allowed — no PulseVerse/staff-style names, impersonation, or hate, slurs, or abusive language.';
  } else if (status === 'taken') {
    icon = 'close-circle';
    tint = colors.status.error;
    message = `@${raw} is already taken — try another.`;
  } else if (status === 'available') {
    icon = 'checkmark-circle';
    tint = colors.primary.teal;
    message = `@${raw} is available.`;
  }

  return (
    <View style={styles.handleHintRow}>
      {icon ? <Ionicons name={icon} size={14} color={tint} style={styles.handleHintIcon} /> : null}
      <Text style={[styles.handleHintText, { color: tint }]}>{message}</Text>
    </View>
  );
}

function PhoneLoginForm({ phoneBusy, onBack }: { phoneBusy: boolean; onBack: () => void }) {
  const router = useRouter();
  const { signInWithPhone, verifyOtp } = useAuth();
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const busy = loading || phoneBusy;

  const handleSendOtp = async () => {
    if (!phone) return;
    setLoading(true);
    const { error } = await signInWithPhone(phone.trim());
    setLoading(false);
    if (error) Alert.alert('Error', error.message);
    else setOtpSent(true);
  };

  const handleVerify = async () => {
    if (!otp) return;
    setLoading(true);
    const { error } = await verifyOtp(phone.trim(), otp.trim());
    setLoading(false);
    if (error) Alert.alert('Verification failed', error.message);
    else router.replace('/');
  };

  return (
    <View style={styles.form}>
      <TouchableOpacity onPress={onBack} style={styles.phoneBack} hitSlop={12}>
        <Ionicons name="arrow-back" size={24} color={colors.dark.text} />
      </TouchableOpacity>
      <Text style={styles.phoneTitle}>{otpSent ? 'Enter verification code' : 'Sign in with phone'}</Text>

      {!otpSent ? (
        <>
          <View style={styles.inputWrap}>
            <Ionicons name="call-outline" size={iconSize.md} color={CYAN} />
            <TextInput
              style={styles.input}
              placeholder="+1 (555) 123-4567"
              placeholderTextColor={colors.form.placeholder}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              editable={!busy}
            />
          </View>
          <PrimaryActionButton
            label="Send code"
            onPress={handleSendOtp}
            disabled={!phone}
            busy={loading}
          />
        </>
      ) : (
        <>
          <View style={styles.inputWrap}>
            <Ionicons name="keypad-outline" size={iconSize.md} color={CYAN} />
            <TextInput
              style={styles.input}
              placeholder="6-digit code"
              placeholderTextColor={colors.form.placeholder}
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
              editable={!busy}
            />
          </View>
          <PrimaryActionButton label="Verify" onPress={handleVerify} disabled={!otp} busy={loading} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  logoWrap: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  scroll: { paddingHorizontal: spacing['2xl'], gap: spacing.lg },
  segmentShell: {
    flexDirection: 'row',
    borderRadius: borderRadius.lg + 2,
    padding: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.28)',
    gap: 4,
    marginBottom: spacing.sm,
  },
  segmentTap: { flex: 1 },
  segmentActive: {
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  segmentIdle: {
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  segmentTextOn: { color: colors.dark.text, fontSize: 15, fontWeight: '800' },
  segmentTextOff: { color: 'rgba(255,255,255,0.55)', fontSize: 15, fontWeight: '700' },
  form: { gap: spacing.md },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: 'rgba(8,15,30,0.72)',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 4,
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.4)',
    shadowColor: CYAN,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  input: { flex: 1, fontSize: 16, color: colors.dark.text },
  atPrefix: {
    fontSize: 17,
    fontWeight: '800',
    color: CYAN,
    marginRight: 2,
  },
  handleHintRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: -4,
    paddingHorizontal: 4,
  },
  handleHintIcon: { marginTop: 2 },
  handleHintText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  forgot: {
    color: CYAN,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
    marginTop: -spacing.xs,
  },
  primaryTouch: {
    marginTop: spacing.sm,
    alignSelf: 'stretch',
    width: '100%',
  },
  primaryPillShadow: {
    overflow: 'visible',
    shadowColor: '#2563eb',
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  primaryPillCurve: {
    borderCurve: 'continuous',
  },
  primaryGradient: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
  },
  primaryBusyInner: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: PRIMARY_PILL_H - spacing.sm * 2,
  },
  primaryPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  /** Same width as ECG (40) so label stays visually centered in the pill. */
  primaryPillSideSlot: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryDisabled: { opacity: 0.55 },
  primaryLabel: {
    flex: 1,
    textAlign: 'center',
    color: colors.dark.text,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  primaryEcg: { opacity: 0.95 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(34,211,238,0.2)' },
  dividerText: { ...typography.bodySmall, color: 'rgba(255,255,255,0.45)', fontSize: 12 },
  socialRow: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(8,15,30,0.75)',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md + 2,
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.35)',
  },
  socialBtnDisabled: { opacity: 0.42 },
  socialBtnText: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '600' },
  linksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  link: { ...typography.bodySmall, color: CYAN, fontWeight: '700' },
  linkSep: { color: colors.form.hint },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: `${CYAN}AA`,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  checkBoxOn: { backgroundColor: colors.primary.teal, borderColor: colors.primary.teal },
  checkLabel: {
    ...typography.bodySmall,
    flex: 1,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 20,
    fontWeight: '600',
  },
  secureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.md,
  },
  secureText: {
    flex: 1,
    ...typography.bodySmall,
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(165,210,230,0.9)',
    fontWeight: '600',
  },
  phoneBack: { marginBottom: spacing.xs, alignSelf: 'flex-start' },
  phoneTitle: { ...typography.h3, color: colors.dark.text, marginBottom: spacing.xs },
});
