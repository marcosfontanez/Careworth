import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, spacing, typography } from '@/theme';
import { useAuth } from '@/contexts/AuthContext';
import { profilesService } from '@/services/supabase/profiles';
import { PatientPrivacyHipaaPanel } from '@/components/auth/PatientPrivacyHipaaPanel';
import { AuthBrandHero } from '@/components/auth/AuthBrandHero';
import { TERMS_PRIVACY_CHECKBOX_LABEL } from '@/constants/authLegal';
import { needsLegalAcknowledgment } from '@/lib/legalAck';

export default function LegalAckScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, profile, refreshProfile, signOut } = useAuth();
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (profile && !needsLegalAcknowledgment(profile)) {
      router.replace('/');
    }
  }, [profile, router]);

  const onContinue = async () => {
    if (!user?.id) {
      Alert.alert('Session error', 'Please sign in again.');
      return;
    }
    if (!accepted) {
      Alert.alert(
        'Confirmation required',
        'Please confirm that you have read and agree to the Terms, Privacy Policy, and patient privacy expectations.',
      );
      return;
    }
    setSubmitting(true);
    try {
      const at = new Date().toISOString();
      await profilesService.update(user.id, { terms_and_privacy_accepted_at: at });
      await refreshProfile();
      router.replace('/');
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (profile && !needsLegalAcknowledgment(profile)) {
    return null;
  }

  return (
    <LinearGradient
      colors={[colors.primary.navy, colors.dark.cardAlt]}
      style={[styles.flex, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg }]}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AuthBrandHero
          kicker="Almost there"
          title="Review and confirm"
          subtitle="Healthcare community standards apply to every account."
        />

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
          onPress={() => setAccepted((v) => !v)}
          activeOpacity={0.85}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: accepted }}
        >
          <View style={[styles.checkBox, accepted && styles.checkBoxOn]}>
            {accepted ? <Ionicons name="checkmark" size={16} color={colors.dark.bg} /> : null}
          </View>
          <Text style={styles.checkLabel}>{TERMS_PRIVACY_CHECKBOX_LABEL}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryBtn, (!accepted || submitting) && styles.primaryBtnDisabled]}
          onPress={onContinue}
          disabled={!accepted || submitting}
          activeOpacity={0.88}
        >
          {submitting ? (
            <ActivityIndicator color={colors.dark.text} />
          ) : (
            <Text style={styles.primaryBtnText}>Continue</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.signOut} onPress={() => void signOut()} hitSlop={12}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: spacing['2xl'],
    paddingBottom: spacing['3xl'],
    gap: spacing.lg,
  },
  linksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  link: { ...typography.bodySmall, color: colors.primary.teal, fontWeight: '700' },
  linkSep: { color: colors.form.hint },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, marginTop: spacing.xs },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.primary.teal + 'AA',
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.form.glassSurface,
  },
  checkBoxOn: { backgroundColor: colors.primary.teal, borderColor: colors.primary.teal },
  checkLabel: { ...typography.bodySmall, flex: 1, color: colors.dark.text, lineHeight: 20, fontWeight: '600' },
  primaryBtn: {
    backgroundColor: colors.primary.teal,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  primaryBtnDisabled: { opacity: 0.45 },
  primaryBtnText: { color: colors.dark.text, fontSize: 16, fontWeight: '800' },
  signOut: { alignSelf: 'center', paddingVertical: spacing.md },
  signOutText: { ...typography.bodySmall, color: colors.form.hint, fontWeight: '600' },
});
