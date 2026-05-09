import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
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
import { schedulePostSignInNavigation } from '@/lib/postSignInNavigation';

/** Pixels from bottom of scroll content to treat as “read through.” */
const SCROLL_END_TOLERANCE_PX = 56;

export default function LegalAckScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, profile, refreshProfile, applyProfilePatch, signOut } = useAuth();
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [viewportH, setViewportH] = useState(0);
  const [contentH, setContentH] = useState(0);
  const [hasReadToEnd, setHasReadToEnd] = useState(false);

  useEffect(() => {
    setAccepted(false);
    setHasReadToEnd(false);
  }, [user?.id]);

  useEffect(() => {
    if (viewportH > 0 && contentH > 0 && contentH <= viewportH + 16) {
      setHasReadToEnd(true);
    }
  }, [viewportH, contentH]);

  useEffect(() => {
    if (profile && !needsLegalAcknowledgment(profile)) {
      schedulePostSignInNavigation(router);
    }
  }, [profile, router]);

  const onContinue = async () => {
    if (!user?.id) {
      Alert.alert('Session error', 'Please sign in again.');
      return;
    }
    if (!hasReadToEnd) {
      Alert.alert(
        'Scroll to continue',
        'Scroll to the bottom of this page first so you can review patient privacy expectations and open the full Terms of Service and Privacy Policy.',
      );
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
      const updated = await profilesService.update(user.id, { terms_and_privacy_accepted_at: at });
      applyProfilePatch({
        termsPrivacyAcceptedAt: updated.termsPrivacyAcceptedAt ?? at,
      });
      schedulePostSignInNavigation(router);
      /** Full hydrate can hang on slow PostgREST; don’t block the button — same timeout as cold boot. */
      void refreshProfile();
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    const y = contentOffset.y + layoutMeasurement.height;
    if (y >= contentSize.height - SCROLL_END_TOLERANCE_PX) {
      setHasReadToEnd(true);
    }
  }, []);

  if (profile && !needsLegalAcknowledgment(profile)) {
    return null;
  }

  return (
    <LinearGradient
      colors={[colors.primary.navy, colors.dark.cardAlt]}
      style={[styles.flex, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg }]}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
        onLayout={(e) => setViewportH(e.nativeEvent.layout.height)}
        onContentSizeChange={(_, h) => setContentH(h)}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <AuthBrandHero
          kicker="Almost there"
          title="Review and confirm"
          subtitle="Scroll through patient privacy expectations, then open Terms and Privacy Policy before you accept."
        />

        <PatientPrivacyHipaaPanel />

        <Text style={styles.linksLead}>
          Read the full documents — tap each link below (scroll this screen to the bottom when you’re done).
        </Text>

        <View style={styles.linksRow}>
          <TouchableOpacity onPress={() => router.push('/legal/terms')} activeOpacity={0.7}>
            <Text style={styles.link}>Terms of Service</Text>
          </TouchableOpacity>
          <Text style={styles.linkSep}>·</Text>
          <TouchableOpacity onPress={() => router.push('/legal/privacy')} activeOpacity={0.7}>
            <Text style={styles.link}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>

        {!hasReadToEnd ? (
          <View style={styles.scrollHintBox}>
            <Ionicons name="arrow-down-circle-outline" size={22} color={colors.primary.teal} />
            <Text style={styles.scrollHintText}>
              Scroll down on this page to the bottom — then you can check the box and accept.
            </Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.checkRow, !hasReadToEnd && styles.checkRowDisabled]}
          onPress={() => {
            if (!hasReadToEnd) {
              Alert.alert(
                'Scroll first',
                'Please scroll to the bottom of this page after reviewing privacy expectations and the Terms / Privacy links.',
              );
              return;
            }
            setAccepted((v) => !v);
          }}
          activeOpacity={0.85}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: accepted, disabled: !hasReadToEnd }}
        >
          <View style={[styles.checkBox, accepted && styles.checkBoxOn, !hasReadToEnd && styles.checkBoxMuted]}>
            {accepted ? <Ionicons name="checkmark" size={16} color={colors.dark.bg} /> : null}
          </View>
          <Text style={[styles.checkLabel, !hasReadToEnd && styles.checkLabelMuted]}>
            {TERMS_PRIVACY_CHECKBOX_LABEL}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.primaryBtn,
            (!accepted || !hasReadToEnd || submitting) && styles.primaryBtnDisabled,
          ]}
          onPress={onContinue}
          disabled={!accepted || !hasReadToEnd || submitting}
          activeOpacity={0.88}
        >
          {submitting ? (
            <ActivityIndicator color={colors.dark.text} />
          ) : (
            <Text style={styles.primaryBtnText}>Accept and continue</Text>
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
  scrollView: { flex: 1 },
  scroll: {
    paddingHorizontal: spacing['2xl'],
    paddingBottom: spacing['3xl'],
    gap: spacing.lg,
  },
  linksLead: {
    ...typography.bodySmall,
    color: colors.dark.textSecondary,
    lineHeight: 20,
    fontWeight: '600',
  },
  scrollHintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(20, 184, 166, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.35)',
  },
  scrollHintText: {
    ...typography.bodySmall,
    flex: 1,
    color: colors.dark.text,
    fontWeight: '600',
    lineHeight: 20,
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
  checkRowDisabled: { opacity: 0.7 },
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
  checkBoxMuted: { opacity: 0.55 },
  checkLabel: { ...typography.bodySmall, flex: 1, color: colors.dark.text, lineHeight: 20, fontWeight: '600' },
  checkLabelMuted: { color: colors.dark.textMuted },
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
