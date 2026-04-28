import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, FlatList, Dimensions, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { colors } from '@/theme';
import { ROLES, SPECIALTIES, SHIFT_PREFERENCES, CONTENT_INTERESTS, US_STATES } from '@/constants';
import { useAuth } from '@/contexts/AuthContext';
import { profilesService } from '@/services/supabase';
import { pickImageFromGallery, type MediaAsset } from '@/lib/media';
import { storageService } from '@/lib/storage';
import { analytics } from '@/lib/analytics';
import type { Role, Specialty, ShiftPreference, ContentInterest } from '@/types';

const { width: SCREEN_W } = Dimensions.get('window');
const STEPS = ['Role', 'Details', 'Interests', 'Photo'];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const { user, refreshProfile } = useAuth();

  const [step, setStep] = useState(0);
  const [role, setRole] = useState<Role | null>(null);
  const [specialty, setSpecialty] = useState<Specialty | null>(null);
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [yearsExp, setYearsExp] = useState('');
  const [shiftPref, setShiftPref] = useState<ShiftPreference>('No Preference');
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState<Set<ContentInterest>>(new Set());
  const [avatarAsset, setAvatarAsset] = useState<MediaAsset | null>(null);
  const [saving, setSaving] = useState(false);

  const goTo = (s: number) => {
    setStep(s);
    scrollRef.current?.scrollTo({ x: s * SCREEN_W, animated: true });
  };

  const canNext = () => {
    if (step === 0) return !!role && !!specialty;
    if (step === 1) return !!city && !!state;
    if (step === 2) return interests.size >= 2;
    return true;
  };

  const toggleInterest = (i: ContentInterest) => {
    setInterests((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else if (next.size < 5) next.add(i);
      return next;
    });
  };

  const handlePickAvatar = async () => {
    const asset = await pickImageFromGallery();
    if (asset) setAvatarAsset(asset);
  };

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);
    try {
      let avatar_url: string | undefined;
      if (avatarAsset) {
        avatar_url = await storageService.uploadAvatar(user.id, {
          uri: avatarAsset.uri,
          type: avatarAsset.mimeType,
          name: avatarAsset.fileName,
        });
      }

      await profilesService.update(user.id, {
        role: role!,
        specialty: specialty!,
        city,
        state,
        years_experience: parseInt(yearsExp) || 0,
        shift_preference: shiftPref,
        bio: bio.trim(),
        ...(avatar_url ? { avatar_url } : {}),
      });

      const interestArr = Array.from(interests);
      const { supabase } = require('@/lib/supabase');
      for (const interest of interestArr) {
        await supabase.from('user_interests').upsert({
          user_id: user.id,
          interest,
        }, { onConflict: 'user_id,interest' });
      }

      analytics.track('sign_up', { role, specialty, interests: interestArr });
      await refreshProfile();
      router.replace('/(tabs)/feed');
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <LinearGradient colors={[colors.primary.navy, '#0D2847']} style={styles.container}>
      {/* Progress bar */}
      <View style={[styles.progressRow, { paddingTop: insets.top + 8 }]}>
        {STEPS.map((label, i) => (
          <View key={label} style={styles.progressItem}>
            <View style={[styles.progressDot, i <= step && styles.progressDotActive]} />
            <Text style={[styles.progressLabel, i <= step && styles.progressLabelActive]}>{label}</Text>
          </View>
        ))}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
      >
        {/* Step 1: Role & Specialty */}
        <View style={styles.page}>
          <Text style={styles.stepTitle}>What's your role?</Text>
          <Text style={styles.stepSub}>Select the title that best describes you</Text>
          <View style={styles.chipGrid}>
            {ROLES.map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.chip, role === r && styles.chipActive]}
                onPress={() => setRole(r)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, role === r && styles.chipTextActive]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.stepTitle, { marginTop: 24 }]}>Your specialty?</Text>
          <View style={styles.chipGrid}>
            {SPECIALTIES.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.chip, specialty === s && styles.chipActive]}
                onPress={() => setSpecialty(s)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, specialty === s && styles.chipTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Step 2: Details */}
        <View style={styles.page}>
          <Text style={styles.stepTitle}>Where are you based?</Text>
          <Text style={styles.stepSub}>Help us connect you with local nurses</Text>

          <TextInput
            style={styles.textInput}
            placeholder="City"
            placeholderTextColor={colors.form.placeholder}
            value={city}
            onChangeText={setCity}
          />

          <Text style={styles.fieldLabel}>State</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stateScroll}>
            <View style={styles.stateRow}>
              {US_STATES.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.stateChip, state === s && styles.chipActive]}
                  onPress={() => setState(s)}
                >
                  <Text style={[styles.chipText, state === s && styles.chipTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <TextInput
            style={styles.textInput}
            placeholder="Years of experience"
            placeholderTextColor={colors.form.placeholder}
            value={yearsExp}
            onChangeText={setYearsExp}
            keyboardType="number-pad"
          />

          <Text style={styles.fieldLabel}>Shift preference</Text>
          <View style={styles.chipGrid}>
            {SHIFT_PREFERENCES.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.chip, shiftPref === s && styles.chipActive]}
                onPress={() => setShiftPref(s)}
              >
                <Text style={[styles.chipText, shiftPref === s && styles.chipTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={[styles.textInput, styles.bioInput]}
            placeholder="Short bio (optional)"
            placeholderTextColor={colors.form.placeholder}
            value={bio}
            onChangeText={setBio}
            multiline
          />
        </View>

        {/* Step 3: Interests */}
        <View style={styles.page}>
          <Text style={styles.stepTitle}>Pick your interests</Text>
          <Text style={styles.stepSub}>Choose 2-5 topics to personalize your feed</Text>
          <View style={styles.interestGrid}>
            {CONTENT_INTERESTS.map((item) => {
              const active = interests.has(item.value);
              return (
                <TouchableOpacity
                  key={item.value}
                  style={[styles.interestCard, active && styles.interestCardActive]}
                  onPress={() => toggleInterest(item.value)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.interestEmoji}>{item.icon}</Text>
                  <Text style={[styles.interestLabel, active && styles.interestLabelActive]}>
                    {item.label}
                  </Text>
                  {active && (
                    <View style={styles.checkBadge}>
                      <Ionicons name="checkmark" size={12} color={colors.dark.text} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.countHint}>{interests.size}/5 selected</Text>
        </View>

        {/* Step 4: Avatar */}
        <View style={styles.page}>
          <Text style={styles.stepTitle}>Add a profile photo</Text>
          <Text style={styles.stepSub}>Help others recognize you (optional)</Text>

          <TouchableOpacity style={styles.avatarPicker} onPress={handlePickAvatar} activeOpacity={0.8}>
            {avatarAsset ? (
              <Image source={{ uri: avatarAsset.uri }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="camera-outline" size={40} color={colors.form.iconMuted} />
                <Text style={styles.avatarHint}>Tap to choose</Text>
              </View>
            )}
          </TouchableOpacity>

          {avatarAsset && (
            <TouchableOpacity onPress={() => setAvatarAsset(null)} activeOpacity={0.7}>
              <Text style={styles.removeText}>Remove photo</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Navigation buttons */}
      <View style={[styles.navRow, { paddingBottom: insets.bottom + 16 }]}>
        {step > 0 && (
          <TouchableOpacity style={styles.backBtn} onPress={() => goTo(step - 1)} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color={colors.dark.text} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }} />

        {step < STEPS.length - 1 ? (
          <TouchableOpacity
            style={[styles.nextBtn, !canNext() && styles.btnDisabled]}
            onPress={() => canNext() && goTo(step + 1)}
            activeOpacity={0.8}
            disabled={!canNext()}
          >
            <Text style={styles.nextText}>Next</Text>
            <Ionicons name="arrow-forward" size={20} color={colors.dark.text} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.finishBtn}
            onPress={handleFinish}
            activeOpacity={0.8}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={colors.dark.text} />
            ) : (
              <>
                <Text style={styles.nextText}>Let's Go!</Text>
                <Ionicons name="rocket-outline" size={20} color={colors.dark.text} />
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  progressRow: {
    flexDirection: 'row', justifyContent: 'center', gap: 24,
    paddingVertical: 16, paddingHorizontal: 24,
  },
  progressItem: { alignItems: 'center', gap: 4 },
  progressDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: colors.form.divider,
  },
  progressDotActive: { backgroundColor: colors.primary.teal },
  progressLabel: { fontSize: 11, color: colors.form.hint, fontWeight: '600' },
  progressLabelActive: { color: colors.dark.text },
  page: { width: SCREEN_W, paddingHorizontal: 24, paddingTop: 8 },
  stepTitle: { fontSize: 24, fontWeight: '800', color: colors.dark.text, marginBottom: 4 },
  stepSub: { fontSize: 14, color: colors.form.subtitle, marginBottom: 20 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
    backgroundColor: colors.form.glassSurface,
    borderWidth: 1, borderColor: colors.form.glassBorderInner,
  },
  chipActive: {
    backgroundColor: colors.primary.teal + '30',
    borderColor: colors.primary.teal,
  },
  chipText: { fontSize: 14, color: colors.form.socialLabel, fontWeight: '600' },
  chipTextActive: { color: colors.dark.text },
  textInput: {
    backgroundColor: colors.form.glassSurface,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: colors.dark.text, marginBottom: 16,
    borderWidth: 1, borderColor: colors.form.glassBorderInner,
  },
  bioInput: { height: 80, textAlignVertical: 'top' },
  fieldLabel: { fontSize: 14, color: colors.form.subtitle, fontWeight: '600', marginBottom: 8 },
  stateScroll: { marginBottom: 16, maxHeight: 44 },
  stateRow: { flexDirection: 'row', gap: 6 },
  stateChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16,
    backgroundColor: colors.form.glassSurface,
    borderWidth: 1, borderColor: colors.form.glassBorderInner,
  },
  interestGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  interestCard: {
    width: '47%' as any,
    padding: 16, borderRadius: 16,
    backgroundColor: colors.form.glassSurface,
    borderWidth: 1.5, borderColor: colors.form.glassBorderInner,
    alignItems: 'center', gap: 6,
  },
  interestCardActive: {
    borderColor: colors.primary.teal,
    backgroundColor: colors.primary.teal + '15',
  },
  interestEmoji: { fontSize: 28 },
  interestLabel: { fontSize: 13, fontWeight: '600', color: colors.form.subtitle, textAlign: 'center' },
  interestLabelActive: { color: colors.dark.text },
  checkBadge: {
    position: 'absolute', top: 8, right: 8,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: colors.primary.teal,
    alignItems: 'center', justifyContent: 'center',
  },
  countHint: { color: colors.form.hint, fontSize: 13, textAlign: 'center', marginTop: 12 },
  avatarPicker: {
    width: 160, height: 160, borderRadius: 80,
    alignSelf: 'center', marginTop: 24, marginBottom: 16,
    overflow: 'hidden',
  },
  avatarImage: { width: 160, height: 160, borderRadius: 80 },
  avatarPlaceholder: {
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: colors.form.glassSurface,
    borderWidth: 2, borderColor: colors.form.glassBorder,
    borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  avatarHint: { color: colors.form.iconMuted, fontSize: 13 },
  removeText: { color: colors.status.error, textAlign: 'center', fontSize: 14, fontWeight: '600' },
  navRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 12,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backText: { color: colors.dark.text, fontSize: 15, fontWeight: '600' },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.primary.royal,
    paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14,
  },
  finishBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.primary.teal,
    paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14,
  },
  btnDisabled: { opacity: 0.4 },
  nextText: { color: colors.dark.text, fontSize: 16, fontWeight: '800' },
});
