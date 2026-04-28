import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useJob } from '@/hooks/useQueries';
import { useAppStore } from '@/store/useAppStore';
import { LoadingState } from '@/components/ui/LoadingState';
import { StackScreenHeader } from '@/components/ui/StackScreenHeader';
import { borderRadius, colors, iconSize, layout, spacing, typography } from '@/theme';
import { formatPayRange } from '@/utils/format';
import * as Haptics from 'expo-haptics';
import { shareJob } from '@/lib/share';

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: job, isLoading } = useJob(id);
  const toggleSave = useAppStore((s) => s.toggleSaveJob);
  const savedIds = useAppStore((s) => s.savedJobIds);

  if (isLoading || !job) return <LoadingState />;

  const isSaved = savedIds.has(job.id);

  return (
    <View style={styles.container}>
      <StackScreenHeader
        insetTop={insets.top}
        title="Job"
        onPressLeft={() => router.back()}
        right={
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              toggleSave(job.id);
            }}
            activeOpacity={0.7}
            hitSlop={12}
          >
            <Ionicons
              name={isSaved ? 'bookmark' : 'bookmark-outline'}
              size={iconSize.lg}
              color={isSaved ? colors.primary.gold : colors.dark.textMuted}
            />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.logoWrap}>
          <Ionicons name="business" size={iconSize.xl + 4} color={colors.primary.royal} />
        </View>

        <Text style={styles.title}>{job.title}</Text>
        <Text style={styles.employer}>{job.employerName}</Text>

        <View style={styles.chips}>
          <DetailChip icon="location" text={`${job.city}, ${job.state}`} />
          <DetailChip icon="cash" text={formatPayRange(job.payMin, job.payMax)} />
          <DetailChip icon="time" text={job.shift} />
          <DetailChip icon="briefcase" text={job.employmentType} />
        </View>

        <View style={styles.tags}>
          <Tag label={job.specialty} color={colors.primary.royal} />
          <Tag label={job.role} color={colors.primary.teal} />
          {job.isFeatured && <Tag label="Featured" color={colors.primary.gold} />}
          {job.isNew && <Tag label="New" color={colors.status.error} />}
        </View>

        <Section title="About This Role">
          <Text style={styles.bodyText}>{job.description}</Text>
        </Section>

        <Section title="Requirements">
          {job.requirements.map((req, i) => (
            <View key={i} style={styles.bulletRow}>
              <View style={styles.bullet} />
              <Text style={styles.bulletText}>{req}</Text>
            </View>
          ))}
        </Section>

        <Section title="Benefits">
          {job.benefits.map((b, i) => (
            <View key={i} style={styles.bulletRow}>
              <Text style={styles.benefitIcon}>✓</Text>
              <Text style={styles.bulletText}>{b}</Text>
            </View>
          ))}
        </Section>

        <View style={styles.scrollBottomInset} />
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.md }]}>
        <View style={styles.bottomRow}>
          <TouchableOpacity style={styles.applyBtn} onPress={() => router.push(`/apply/${job.id}`)} activeOpacity={0.8}>
            <Text style={styles.applyText}>Quick Apply</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.shareBtn}
            onPress={() => shareJob(job.id, job.title, job.employerName)}
            activeOpacity={0.7}
          >
            <Ionicons name="share-outline" size={iconSize.md} color={colors.primary.royal} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function DetailChip({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.detailChip}>
      <Ionicons name={`${icon}-outline` as any} size={16} color={colors.dark.textMuted} />
      <Text style={styles.detailText}>{text}</Text>
    </View>
  );
}

function Tag({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.tag, { backgroundColor: color + '18' }]}>
      <Text style={[styles.tagText, { color }]}>{label}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  content: { paddingHorizontal: layout.screenPadding },
  scrollBottomInset: { height: 100 },
  logoWrap: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.md + 4,
    backgroundColor: colors.dark.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    alignSelf: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.dark.border,
  },
  title: { ...typography.h1, fontSize: 24, color: colors.dark.text, textAlign: 'center' },
  employer: { ...typography.body, color: colors.dark.textMuted, textAlign: 'center', marginTop: spacing.xs },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.xl,
    justifyContent: 'center',
  },
  detailChip: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  detailText: { ...typography.body, fontSize: 14, color: colors.dark.textMuted },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
    justifyContent: 'center',
  },
  tag: { paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: borderRadius.sm },
  tagText: { fontSize: 12, fontWeight: '700' },
  section: { marginTop: spacing.xl + spacing.sm },
  sectionTitle: { ...typography.h2, fontSize: 18, color: colors.dark.text, marginBottom: spacing.md },
  bodyText: { ...typography.body, color: colors.dark.textSecondary, lineHeight: 24 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary.royal,
    marginTop: 7,
  },
  benefitIcon: { color: colors.primary.teal, fontWeight: '700', fontSize: 14 },
  bulletText: { flex: 1, ...typography.body, fontSize: 14, color: colors.dark.textSecondary, lineHeight: 22 },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.dark.bg,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.dark.border,
  },
  bottomRow: { flexDirection: 'row', gap: spacing.md },
  applyBtn: {
    flex: 1,
    backgroundColor: colors.primary.royal,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  applyText: { ...typography.button, fontSize: 16, fontWeight: '800', color: colors.dark.text },
  shareBtn: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary.royal + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
