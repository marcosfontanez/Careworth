import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackScreenHeader } from '@/components/ui/StackScreenHeader';
import { colors, layout, spacing, typography } from '@/theme';
import { useAuth } from '@/contexts/AuthContext';

const SECTIONS: { id: string; title: string; body: string }[] = [
  {
    id: 'pulse',
    title: 'Pulse+',
    body:
      'CareWorth layers clinical context on top of short video: evidence links, shift-aware surfacing, and wellbeing breaks without losing the fast feed.',
  },
  {
    id: 'evidence',
    title: 'Evidence',
    body:
      'Creators can attach a vetted link and label on duets and educational clips. Viewers see a pill on the video and can open the source in one tap.',
  },
  {
    id: 'shift',
    title: 'Shift mode',
    body:
      'Tag posts as day, night, weekend, or any so peers in the same rhythm find them faster — especially useful for night-shift nursing content.',
  },
  {
    id: 'wellbeing',
    title: 'Wellbeing',
    body:
      'Use “Not interested” and “Hide creator” from the long-press menu to tune your feed. More break reminders and reduced-motion prefs are on the roadmap.',
  },
  {
    id: 'mentor',
    title: 'Mentor clips',
    body:
      'Short reaction videos from mentors (stub pipeline) can attach to parent posts so trainees see human context next to the original teaching moment.',
  },
];

export default function InnovationHubScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const tabKey = typeof tab === 'string' ? tab : Array.isArray(tab) ? tab[0] : undefined;
  const initial = SECTIONS.find((s) => s.id === tabKey);

  return (
    <View style={styles.container}>
      <StackScreenHeader insetTop={insets.top} title="Pulse+ hub" onPressLeft={() => router.back()} />
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing['3xl'] }]}>
        {initial ? (
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>{initial.title}</Text>
            <Text style={styles.heroBody}>{initial.body}</Text>
          </View>
        ) : null}
        {SECTIONS.map((s) => (
          <View key={s.id} style={styles.card}>
            <Text style={styles.cardTitle}>{s.title}</Text>
            <Text style={styles.cardBody}>{s.body}</Text>
          </View>
        ))}
        {user ? (
          <TouchableOpacity
            style={styles.appealBtn}
            activeOpacity={0.85}
            onPress={() => router.push('/my-posts')}
          >
            <Text style={styles.appealBtnText}>My posts · request review</Text>
            <Text style={styles.appealHint}>Open a post, then use the overflow menu to appeal moderation when available.</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  body: { paddingHorizontal: layout.screenPadding, gap: spacing.lg, paddingTop: spacing.md },
  hero: {
    padding: spacing.lg,
    borderRadius: 16,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.primary.teal + '44',
    gap: spacing.sm,
  },
  heroTitle: { ...typography.h3, color: colors.dark.text },
  heroBody: { ...typography.body, color: colors.dark.textSecondary, lineHeight: 22 },
  card: {
    padding: spacing.lg,
    borderRadius: 14,
    backgroundColor: colors.dark.cardAlt,
    borderWidth: 1,
    borderColor: colors.dark.border,
    gap: spacing.xs,
  },
  cardTitle: { ...typography.sectionLabel, color: colors.primary.teal },
  cardBody: { ...typography.bodySmall, color: colors.dark.textSecondary, lineHeight: 20 },
  appealBtn: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: 14,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
    gap: spacing.xs,
  },
  appealBtnText: { ...typography.sectionLabel, color: colors.dark.text },
  appealHint: { ...typography.caption, color: colors.dark.textMuted, lineHeight: 18 },
});
