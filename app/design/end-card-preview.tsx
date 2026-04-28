import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { EXPORT_STING_MODULE } from '@/assets/audio/stingModule';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackScreenHeader } from '@/components/ui/StackScreenHeader';
import { EndCardPreview, PulseVerseEndCard, PulseVerseVideoEndCard } from '@/components/export-end-card';
import { colors, typography, spacing, layout, borderRadius } from '@/theme';
import type { ExportEndCardData, ExportEndCardLayoutVariant } from '@/types/exportEndCard';
import { getExportEndCardDurationSec } from '@/lib/exportEndCardIntegration';
import { useAuth } from '@/contexts/AuthContext';
import { buildExportEndCardDataFromProfile } from '@/components/export-end-card/attribution';

const SAMPLES: { id: string; label: string; data: ExportEndCardData }[] = [
  {
    id: 'nurse',
    label: 'ICU nurse',
    data: {
      creatorDisplayName: 'Jordan Kim',
      creatorHandle: 'nightshift.rn',
      profession: 'RN',
      specialty: 'ICU',
      useTagline: false,
    },
  },
  {
    id: 'physician',
    label: 'Emergency MD',
    data: {
      creatorDisplayName: 'Dr. Morgan Lee',
      creatorHandle: 'morganlee_md',
      profession: 'Physician',
      specialty: 'Emergency Medicine',
      useTagline: false,
    },
  },
  {
    id: 'pharm',
    label: 'Clinical pharmacist',
    data: {
      creatorDisplayName: 'Alex Rivera',
      creatorHandle: 'pharmbrain',
      profession: 'Clinical Pharmacist',
      specialty: 'Acute Care',
      useTagline: true,
      backgroundStyle: 'deepCanvas',
    },
  },
];

const LAYOUTS: { id: ExportEndCardLayoutVariant; label: string; note: string }[] = [
  { id: 'centered', label: 'A · Centered slate', note: 'Primary — 9:16 social export' },
  { id: 'split', label: 'B · Split credit', note: 'Brand left / creator right' },
  { id: 'minimal', label: 'C · Creator stamp', note: 'Creator-forward, corner brand' },
];

export default function ExportEndCardPreviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { profile } = useAuth();

  const [sampleId, setSampleId] = useState(SAMPLES[0].id);
  const [layout, setLayout] = useState<ExportEndCardLayoutVariant>('centered');
  const [useTagline, setUseTagline] = useState(false);
  const [showStub, setShowStub] = useState(true);
  const [useMe, setUseMe] = useState(false);
  const [useVideoMaster, setUseVideoMaster] = useState(true);

  const baseSample = SAMPLES.find((s) => s.id === sampleId) ?? SAMPLES[0];

  const data: ExportEndCardData = useMemo(() => {
    if (useMe && profile) {
      return {
        ...buildExportEndCardDataFromProfile(profile),
        useTagline,
        animationPreset: 'premium',
      };
    }
    return { ...baseSample.data, useTagline };
  }, [useMe, profile, baseSample.data, useTagline]);

  const fullBleedW = Math.min(width - spacing['2xl'] * 2, 420);
  const fullBleedH = (fullBleedW * 16) / 9;

  const previewAudioSting = async () => {
    if (!EXPORT_STING_MODULE) {
      Alert.alert(
        'Export sting',
        'Add pulseverse-export-sting.mp3 under assets/audio and set EXPORT_STING_MODULE in assets/audio/stingModule.ts. See theme/exportEndCard.ts for the brief.',
      );
      return;
    }
    try {
      const expoAudio = await import('expo-audio');
      await expoAudio.setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false });
      const player = expoAudio.createAudioPlayer(EXPORT_STING_MODULE);
      const sub = player.addListener('playbackStatusUpdate', (status: { isLoaded?: boolean; didJustFinish?: boolean }) => {
        if (status.isLoaded && status.didJustFinish) {
          try { sub.remove(); } catch { /* noop */ }
          try { player.release(); } catch { /* noop */ }
        }
      });
      player.play();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not play';
      Alert.alert('Audio', msg);
    }
  };

  return (
    <View style={styles.root}>
      <StackScreenHeader
        insetTop={insets.top}
        title="Export end card"
        onPressLeft={() => router.back()}
      />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + spacing['3xl'] },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lead}>
          PulseVerse export outro (~{getExportEndCardDurationSec().toFixed(2)}s target). Centered layout is the default for
          feed exports; split and minimal are alternates.
        </Text>

        <TouchableOpacity style={styles.stingBtn} onPress={() => void previewAudioSting()} activeOpacity={0.85}>
          <Text style={styles.stingBtnText}>Preview export audio sting</Text>
          <Text style={styles.stingBtnHint}>Requires MP3 wired in assets/audio/stingModule.ts</Text>
        </TouchableOpacity>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Layout</Text>
          {LAYOUTS.map((L) => (
            <TouchableOpacity
              key={L.id}
              style={[styles.chip, layout === L.id && styles.chipOn]}
              onPress={() => setLayout(L.id)}
              activeOpacity={0.85}
            >
              <Text style={[styles.chipTitle, layout === L.id && styles.chipTitleOn]}>{L.label}</Text>
              <Text style={styles.chipNote}>{L.note}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Sample creator</Text>
          <View style={styles.row}>
            {SAMPLES.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[styles.sampleChip, sampleId === s.id && !useMe && styles.sampleChipOn]}
                onPress={() => {
                  setUseMe(false);
                  setSampleId(s.id);
                }}
              >
                <Text style={[styles.sampleChipText, sampleId === s.id && !useMe && styles.sampleChipTextOn]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {profile ? (
            <TouchableOpacity
              style={[styles.meRow, useMe && styles.meRowOn]}
              onPress={() => setUseMe((v) => !v)}
              activeOpacity={0.85}
            >
              <Text style={styles.meLabel}>
                Use my profile ({profile.username ? `@${profile.username}` : profile.displayName})
              </Text>
            </TouchableOpacity>
          ) : null}
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Tagline</Text>
            <Switch value={useTagline} onValueChange={setUseTagline} trackColor={{ true: colors.primary.teal + '88' }} />
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Mock last frame</Text>
            <Switch value={showStub} onValueChange={setShowStub} trackColor={{ true: colors.primary.teal + '88' }} />
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Video master end card</Text>
            <Switch
              value={useVideoMaster}
              onValueChange={setUseVideoMaster}
              trackColor={{ true: colors.primary.teal + '88' }}
            />
          </View>
        </View>

        <Text style={styles.sectionLabelOut}>Preview (9:16)</Text>
        <View style={styles.previewWrap}>
          <EndCardPreview
            data={data}
            layoutVariant={layout}
            showMockVideoStub={showStub}
            useVideoMaster={useVideoMaster}
          />
        </View>

        <Text style={styles.sectionLabelOut}>Full-bleed end card</Text>
        <View style={[styles.fullBleed, { width: fullBleedW, height: fullBleedH }]}>
          {useVideoMaster ? (
            <PulseVerseVideoEndCard data={data} width={fullBleedW} height={fullBleedH} playing />
          ) : (
            <PulseVerseEndCard data={data} width={fullBleedW} height={fullBleedH} layoutVariant={layout} />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.dark.bg },
  scroll: { paddingHorizontal: layout.screenPadding, paddingTop: spacing.md },
  stingBtn: {
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.dark.border,
    backgroundColor: colors.dark.card,
  },
  stingBtnText: { ...typography.bodySmall, fontWeight: '700', color: colors.dark.text },
  stingBtnHint: { ...typography.caption, color: colors.dark.textMuted, marginTop: 4 },
  lead: {
    ...typography.bodySmall,
    color: colors.dark.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.dark.card,
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    ...typography.sectionLabel,
    color: colors.dark.textMuted,
    marginBottom: spacing.md,
  },
  sectionLabelOut: {
    ...typography.sectionLabel,
    color: colors.dark.textMuted,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  chip: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.dark.border,
    marginBottom: spacing.sm,
    backgroundColor: colors.dark.bg,
  },
  chipOn: {
    borderColor: colors.primary.teal + '66',
    backgroundColor: colors.primary.teal + '12',
  },
  chipTitle: { ...typography.bodySmall, fontWeight: '700', color: colors.dark.text },
  chipTitleOn: { color: colors.dark.text },
  chipNote: { ...typography.caption, color: colors.dark.textMuted, marginTop: 4 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  sampleChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.chip,
    borderWidth: 1,
    borderColor: colors.dark.border,
    backgroundColor: colors.dark.bg,
  },
  sampleChipOn: {
    borderColor: colors.primary.royal + '55',
    backgroundColor: colors.primary.royal + '14',
  },
  sampleChipText: { ...typography.caption, color: colors.dark.textSecondary, fontWeight: '600' },
  sampleChipTextOn: { color: colors.dark.text },
  meRow: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.dark.border,
    marginBottom: spacing.md,
  },
  meRowOn: {
    borderColor: colors.primary.teal + '55',
    backgroundColor: colors.primary.teal + '10',
  },
  meLabel: { ...typography.bodySmall, fontWeight: '600', color: colors.dark.text },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  toggleLabel: { ...typography.bodySmall, color: colors.dark.textSecondary },
  previewWrap: { alignItems: 'center', marginBottom: spacing['2xl'] },
  fullBleed: {
    alignSelf: 'center',
    borderRadius: borderRadius['2xl'],
    overflow: 'hidden',
    marginBottom: spacing['3xl'],
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
});
