import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { PVPageBackground } from '@/components/pv/PVPageBackground';
import { useAuth } from '@/contexts/AuthContext';
import {
  AUDIENCE_ROLE_OPTIONS,
  MEDICAL_SAFETY_CHECKBOX,
  MEDICAL_SAFETY_DISCLAIMER,
  ONBOARDING_INTEREST_OPTIONS,
  ONBOARDING_INTEREST_SUGGESTED_MAX,
} from '@/lib/onboarding/constants';
import {
  blurbForOnboardingCircleSlug,
  labelForOnboardingCircleSlug,
  suggestOnboardingCircleSlugs,
} from '@/lib/onboarding/circleSuggestions';
import {
  isHealthcareProfessionalPath,
  needsMedicalSafetyStep,
  canSkipOnboardingWithoutSafety,
} from '@/lib/onboarding/needsOnboarding';
import { schedulePostSignInNavigation } from '@/lib/postSignInNavigation';
import { analytics } from '@/lib/analytics';
import { onboardingService } from '@/services/onboarding';
import { communitiesService } from '@/services/supabase/communities';
import { profilesService } from '@/services/supabase/profiles';
import { ROLES, SPECIALTIES } from '@/constants';
import type { AudienceRole, Community, ContentInterest } from '@/types';
import { colors, borderRadius, pulseverse, spacing, gradients, shadows } from '@/theme';

type Step = 'audience' | 'interests' | 'circles' | 'profile' | 'safety';

const STEPS: Step[] = ['audience', 'interests', 'circles', 'profile', 'safety'];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, profile, refreshProfile, applyProfilePatch } = useAuth();

  const [step, setStep] = useState<Step>('audience');
  const [submitting, setSubmitting] = useState(false);
  const [audienceRole, setAudienceRole] = useState<AudienceRole | null>(null);
  const [interests, setInterests] = useState<ContentInterest[]>([]);
  const [selectedCircleIds, setSelectedCircleIds] = useState<string[]>([]);
  const [circleOptions, setCircleOptions] = useState<Community[]>([]);
  const [circlesLoading, setCirclesLoading] = useState(false);

  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [username, setUsername] = useState(profile?.username ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [city, setCity] = useState(profile?.city ?? '');
  const [state, setState] = useState(profile?.state ?? '');
  const [role, setRole] = useState(profile?.role ?? '');
  const [specialty, setSpecialty] = useState(profile?.specialty ?? '');
  const [yearsExperience, setYearsExperience] = useState(
    profile?.yearsExperience ? String(profile.yearsExperience) : '',
  );
  const [safetyAccepted, setSafetyAccepted] = useState(false);

  const showProFields = isHealthcareProfessionalPath(audienceRole);
  const showSafetyStep = useMemo(
    () => needsMedicalSafetyStep({ audienceRole, interests }),
    [audienceRole, interests],
  );
  const canSkipAll = useMemo(
    () => canSkipOnboardingWithoutSafety({ audienceRole, interests }),
    [audienceRole, interests],
  );

  const activeSteps = useMemo(
    () => (showSafetyStep ? STEPS : STEPS.filter((s) => s !== 'safety')),
    [showSafetyStep],
  );
  const stepIndex = activeSteps.indexOf(step);
  const progress = activeSteps.length > 0 ? (stepIndex + 1) / activeSteps.length : 1;

  useEffect(() => {
    analytics.track(
      'onboarding_step',
      {
        step,
        step_index: stepIndex,
        step_count: activeSteps.length,
        audience_role: audienceRole,
        interest_count: interests.length,
      },
      'onboarding',
    );
  }, [step, stepIndex, activeSteps.length, audienceRole, interests.length]);

  useEffect(() => {
    if (profile?.displayName) setDisplayName(profile.displayName);
    if (profile?.username) setUsername(profile.username);
  }, [profile?.displayName, profile?.username]);

  useEffect(() => {
    if (step !== 'circles') return;
    let cancelled = false;
    setCirclesLoading(true);
    const slugs = suggestOnboardingCircleSlugs({ audienceRole, interests, limit: 8 });
    void communitiesService.getBySlugsOrdered(slugs).then((rows) => {
      if (!cancelled) {
        setCircleOptions(rows);
        setCirclesLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [step, audienceRole, interests]);

  const toggleInterest = (key: ContentInterest) => {
    setInterests((prev) => {
      if (prev.includes(key)) return prev.filter((i) => i !== key);
      if (prev.length >= ONBOARDING_INTEREST_SUGGESTED_MAX) return prev;
      return [...prev, key];
    });
  };

  const toggleCircle = (id: string) => {
    setSelectedCircleIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const goNext = () => {
    const idx = activeSteps.indexOf(step);
    if (idx < activeSteps.length - 1) setStep(activeSteps[idx + 1]!);
  };

  const goBack = () => {
    const idx = activeSteps.indexOf(step);
    if (idx > 0) setStep(activeSteps[idx - 1]!);
  };

  const finish = useCallback(async () => {
    if (!user?.id) return;
    if (showSafetyStep && !safetyAccepted) {
      Alert.alert('Almost there', 'Please confirm the safety note to continue.');
      return;
    }
    if (!displayName.trim()) {
      Alert.alert('Display name', 'Add a display name so people know who you are.');
      return;
    }
    setSubmitting(true);
    try {
      const handle = username.replace(/^@+/, '').trim().toLowerCase();
      if (handle && handle !== (profile?.username ?? '')) {
        const result = await profilesService.checkUsernameAvailability(handle);
        if (result.status === 'taken') {
          Alert.alert('Handle taken', 'That @handle is already in use. Try another.');
          setSubmitting(false);
          return;
        }
        if (result.status === 'error') {
          Alert.alert(
            'Could not verify handle',
            'We could not check whether that handle is available. Check your connection and try again.',
          );
          setSubmitting(false);
          return;
        }
        if (result.status !== 'available') {
          Alert.alert('Invalid handle', 'Pick a valid @handle and try again.');
          setSubmitting(false);
          return;
        }
      }
      await onboardingService.completeOnboarding(user.id, {
        audienceRole,
        interests,
        circleIds: selectedCircleIds,
        displayName: displayName.trim(),
        username: handle || profile?.username || null,
        bio: bio.trim(),
        city: city.trim(),
        state: state.trim(),
        role: showProFields ? role : undefined,
        specialty: showProFields ? specialty : undefined,
        yearsExperience: showProFields && yearsExperience.trim()
          ? Math.max(0, parseInt(yearsExperience, 10) || 0)
          : undefined,
        medicalSafetyAcknowledged: showSafetyStep ? safetyAccepted : undefined,
      });
      const at = new Date().toISOString();
      applyProfilePatch({
        displayName: displayName.trim(),
        username: handle || profile?.username,
        audienceRole,
        interests,
        onboardingCompletedAt: at,
        medicalSafetyAcknowledgedAt: showSafetyStep && safetyAccepted ? at : profile?.medicalSafetyAcknowledgedAt,
      });
      analytics.track(
        'onboarding_complete',
        {
          audience_role: audienceRole,
          interest_count: interests.length,
          circle_count: selectedCircleIds.length,
          had_safety_step: showSafetyStep,
        },
        'onboarding',
      );
      await refreshProfile();
      schedulePostSignInNavigation(router);
    } catch (e) {
      Alert.alert('Could not finish setup', e instanceof Error ? e.message : 'Try again in a moment.');
    } finally {
      setSubmitting(false);
    }
  }, [
    applyProfilePatch,
    audienceRole,
    bio,
    city,
    displayName,
    interests,
    profile?.medicalSafetyAcknowledgedAt,
    profile?.username,
    refreshProfile,
    role,
    router,
    safetyAccepted,
    selectedCircleIds,
    showProFields,
    showSafetyStep,
    specialty,
    state,
    user?.id,
    username,
    yearsExperience,
  ]);

  const skipAll = async () => {
    if (!user?.id) return;
    if (!canSkipAll) {
      Alert.alert(
        'Safety note required',
        'Your selections include education or caregiver paths — please review the safety note before entering PulseVerse.',
      );
      if (activeSteps.includes('safety')) setStep('safety');
      return;
    }
    setSubmitting(true);
    try {
      await onboardingService.skipOnboarding(user.id);
      applyProfilePatch({ onboardingCompletedAt: new Date().toISOString() });
      analytics.track('onboarding_skip', { last_step: step, step_index: stepIndex }, 'onboarding');
      await refreshProfile();
      schedulePostSignInNavigation(router);
    } catch {
      Alert.alert('Could not skip', 'Try again in a moment.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'audience':
        return (
          <>
            <Text style={styles.title}>What brings you to PulseVerse?</Text>
            <Text style={styles.subtitle}>
              Healthcare professionals are the heart of PulseVerse — and everyone curious about
              healthcare is welcome.
            </Text>
            {AUDIENCE_ROLE_OPTIONS.map((opt) => {
              const active = audienceRole === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setAudienceRole(opt.value)}
                  style={[styles.optionCard, active && styles.optionCardActive]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                >
                  <Ionicons
                    name={opt.icon as keyof typeof Ionicons.glyphMap}
                    size={22}
                    color={active ? pulseverse.accentCyan : colors.dark.textMuted}
                  />
                  <View style={styles.optionCopy}>
                    <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
                      {opt.label}
                    </Text>
                    <Text style={[styles.optionSub, active && styles.optionSubActive]}>{opt.subtitle}</Text>
                  </View>
                  <Ionicons
                    name={active ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={active ? pulseverse.accentCyan : 'rgba(148,163,184,0.35)'}
                  />
                </Pressable>
              );
            })}
          </>
        );
      case 'interests':
        return (
          <>
            <Text style={styles.title}>What do you want to see?</Text>
            <Text style={styles.subtitle}>Pick a few — we will tune your Feed and Circle suggestions.</Text>
            <View style={styles.chipWrap}>
              {ONBOARDING_INTEREST_OPTIONS.map((opt) => {
                const active = interests.includes(opt.feedKey);
                return (
                  <Pressable
                    key={opt.feedKey}
                    onPress={() => toggleInterest(opt.feedKey)}
                    style={[styles.chip, active && styles.chipActive]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: active }}
                  >
                    <Text style={styles.chipIcon}>{opt.icon}</Text>
                    <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{opt.label}</Text>
                    {active ? (
                      <Ionicons name="checkmark-circle" size={16} color={pulseverse.accentCyan} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </>
        );
      case 'circles':
        return (
          <>
            <Text style={styles.title}>Choose your starting Circles</Text>
            <Text style={styles.subtitle}>Join a few rooms to get started — you can explore more anytime.</Text>
            {circlesLoading ? (
              <ActivityIndicator color={pulseverse.accentCyan} style={{ marginTop: 24 }} />
            ) : (
              circleOptions.map((c) => {
                const active = selectedCircleIds.includes(c.id);
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => toggleCircle(c.id)}
                    style={[styles.optionCard, active && styles.optionCardActive]}
                  >
                    <Ionicons
                      name={active ? 'checkmark-circle' : 'ellipse-outline'}
                      size={22}
                      color={active ? pulseverse.accentCyan : colors.dark.textMuted}
                    />
                    <View style={styles.optionCopy}>
                      <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
                        {labelForOnboardingCircleSlug(c.slug)}
                      </Text>
                      <Text style={[styles.optionSub, active && styles.optionSubActive]}>
                        {blurbForOnboardingCircleSlug(c.slug)}
                      </Text>
                    </View>
                  </Pressable>
                );
              })
            )}
          </>
        );
      case 'profile':
        return (
          <>
            <Text style={styles.title}>Set up your profile</Text>
            <Text style={styles.subtitle}>Just the basics — you can customize your Pulse Page later.</Text>
            <Text style={styles.fieldLabel}>Display name *</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="How you appear on PulseVerse"
              placeholderTextColor={colors.dark.textMuted}
            />
            <Text style={styles.fieldLabel}>@handle</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              placeholder="yourname"
              placeholderTextColor={colors.dark.textMuted}
            />
            <Text style={styles.fieldLabel}>Bio (optional)</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={bio}
              onChangeText={setBio}
              multiline
              placeholder="A line about you"
              placeholderTextColor={colors.dark.textMuted}
            />
            <View style={styles.row}>
              <View style={styles.rowField}>
                <Text style={styles.fieldLabel}>City</Text>
                <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="Optional" />
              </View>
              <View style={styles.rowField}>
                <Text style={styles.fieldLabel}>State</Text>
                <TextInput style={styles.input} value={state} onChangeText={setState} placeholder="Optional" />
              </View>
            </View>
            {showProFields ? (
              <>
                <Text style={styles.sectionHint}>Optional professional details (helps personalize your Feed)</Text>
                <Text style={styles.fieldLabel}>Role</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
                  {ROLES.filter(Boolean).map((r) => (
                    <Pressable
                      key={r}
                      onPress={() => setRole(r)}
                      style={[styles.miniPill, role === r && styles.miniPillActive]}
                    >
                      <Text style={[styles.miniPillText, role === r && styles.miniPillTextActive]}>{r}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
                <Text style={styles.fieldLabel}>Specialty</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
                  {SPECIALTIES.filter(Boolean).map((s) => (
                    <Pressable
                      key={s}
                      onPress={() => setSpecialty(s)}
                      style={[styles.miniPill, specialty === s && styles.miniPillActive]}
                    >
                      <Text style={[styles.miniPillText, specialty === s && styles.miniPillTextActive]}>{s}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
                <Text style={styles.fieldLabel}>Years of experience</Text>
                <TextInput
                  style={styles.input}
                  value={yearsExperience}
                  onChangeText={setYearsExperience}
                  keyboardType="number-pad"
                  placeholder="Optional"
                />
              </>
            ) : null}
          </>
        );
      case 'safety':
        return (
          <>
            <Text style={styles.title}>Community & safety</Text>
            <Text style={styles.subtitle}>{MEDICAL_SAFETY_DISCLAIMER}</Text>
            <View style={styles.safetyBox}>
              <Ionicons name="information-circle-outline" size={20} color={pulseverse.accentCyan} />
              <Text style={styles.safetyBoxText}>
                PulseVerse is a place to learn, laugh, and connect — not for emergencies or personal
                treatment plans.
              </Text>
            </View>
            <Pressable
              style={[styles.checkRow, safetyAccepted && styles.checkRowActive]}
              onPress={() => setSafetyAccepted((v) => !v)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: safetyAccepted }}
            >
              <Ionicons
                name={safetyAccepted ? 'checkbox' : 'square-outline'}
                size={22}
                color={safetyAccepted ? pulseverse.accentCyan : colors.dark.textMuted}
              />
              <Text style={styles.checkLabel}>{MEDICAL_SAFETY_CHECKBOX}</Text>
            </Pressable>
          </>
        );
      default:
        return null;
    }
  };

  const isLastStep = stepIndex === activeSteps.length - 1;
  const canSkipStep = step === 'audience' || step === 'interests' || step === 'circles';

  return (
    <PVPageBackground style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <View style={styles.progressTrack}>
            <LinearGradient
              colors={[pulseverse.accentCyan, pulseverse.accentBlue]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]}
            />
          </View>
          {canSkipAll ? (
            <TouchableOpacity onPress={() => void skipAll()} disabled={submitting} style={styles.skipTop}>
              <Text style={styles.skipTopText}>Skip for now</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]}
          keyboardShouldPersistTaps="handled"
        >
          {renderStep()}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.footerRow}>
            {stepIndex > 0 ? (
              <TouchableOpacity style={styles.secondaryBtn} onPress={goBack} disabled={submitting}>
                <Text style={styles.secondaryBtnText}>Back</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.footerSpacer} />
            )}
            {canSkipStep ? (
              <TouchableOpacity style={styles.secondaryBtn} onPress={goNext} disabled={submitting}>
                <Text style={styles.secondaryBtnText}>Skip step</Text>
              </TouchableOpacity>
            ) : null}
            <Pressable
              style={[styles.primaryBtnWrap, submitting && styles.primaryBtnDisabled]}
              onPress={() => (isLastStep ? void finish() : goNext())}
              disabled={submitting}
              accessibilityRole="button"
            >
              <LinearGradient
                colors={[...gradients.ctaSheet]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryBtn}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>{isLastStep ? 'Enter PulseVerse' : 'Continue'}</Text>
                )}
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </PVPageBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(148,163,184,0.2)',
    overflow: 'hidden',
  },
  progressFill: { height: '100%' },
  skipTop: { alignSelf: 'flex-end', marginTop: spacing.sm, paddingVertical: 6 },
  skipTopText: { color: colors.dark.textMuted, fontWeight: '700', fontSize: 13 },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  title: { fontSize: 26, fontWeight: '800', color: '#F8FAFC', letterSpacing: -0.4 },
  subtitle: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    fontSize: 14,
    lineHeight: 20,
    color: colors.dark.textSecondary,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    marginBottom: 10,
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(12,18,32,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.18)',
  },
  optionCardActive: {
    borderWidth: 2,
    borderColor: pulseverse.accentCyan,
    backgroundColor: 'rgba(56,189,248,0.16)',
    ...Platform.select({
      ios: {
        shadowColor: pulseverse.accentCyan,
        shadowOpacity: 0.35,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 0 },
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  optionCopy: { flex: 1 },
  optionLabel: { fontSize: 15, fontWeight: '800', color: '#E2E8F0' },
  optionLabelActive: { color: '#F0FDFA' },
  optionSub: { marginTop: 4, fontSize: 12, lineHeight: 17, color: colors.dark.textMuted },
  optionSubActive: { color: 'rgba(224,242,254,0.88)' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
    backgroundColor: 'rgba(12,18,32,0.72)',
  },
  chipActive: {
    borderWidth: 2,
    borderColor: pulseverse.accentCyan,
    backgroundColor: 'rgba(56,189,248,0.22)',
  },
  chipIcon: { fontSize: 14 },
  chipLabel: { fontSize: 12, fontWeight: '700', color: colors.dark.textSecondary },
  chipLabelActive: { color: '#E0F2FE' },
  fieldLabel: {
    marginTop: spacing.md,
    marginBottom: 6,
    fontSize: 12,
    fontWeight: '700',
    color: colors.dark.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  input: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.28)',
    backgroundColor: 'rgba(12,18,32,0.82)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#F8FAFC',
    fontSize: 15,
  },
  inputMultiline: { minHeight: 72, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 10 },
  rowField: { flex: 1 },
  sectionHint: { marginTop: spacing.lg, fontSize: 13, color: colors.dark.textMuted },
  pillScroll: { marginBottom: 4 },
  miniPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
  },
  miniPillActive: {
    borderWidth: 2,
    borderColor: pulseverse.accentCyan,
    backgroundColor: 'rgba(56,189,248,0.22)',
  },
  miniPillText: { fontSize: 12, fontWeight: '700', color: colors.dark.textMuted },
  miniPillTextActive: { color: '#E0F2FE' },
  safetyBox: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(12,18,32,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.25)',
  },
  safetyBoxText: { flex: 1, fontSize: 13, lineHeight: 19, color: '#CBD5E1' },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: spacing.lg,
    padding: 14,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
    backgroundColor: 'rgba(12,18,32,0.72)',
  },
  checkRowActive: {
    borderWidth: 2,
    borderColor: pulseverse.accentCyan,
    backgroundColor: 'rgba(56,189,248,0.16)',
  },
  checkLabel: { flex: 1, fontSize: 14, lineHeight: 20, color: '#E2E8F0', fontWeight: '600' },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: 12,
    backgroundColor: 'rgba(4,8,18,0.96)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(56,189,248,0.28)',
  },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  footerSpacer: { flex: 1 },
  secondaryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.28)',
  },
  secondaryBtnText: { color: colors.dark.textSecondary, fontWeight: '700', fontSize: 13 },
  primaryBtnWrap: {
    flex: 1,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    ...shadows.cta,
  },
  primaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16, letterSpacing: 0.2 },
});
