import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '@/theme';
import { useFeatureFlags } from '@/lib/featureFlags';
import {
  CREATOR_TEMPLATES,
  TEMPLATE_GROUP_ORDER,
  isTemplateAvailable,
  templateRoute,
  type CreatorTemplate,
  type CreatorTemplateGroup,
} from '@/lib/broll/creatorTemplates';

export default function CreatorTemplatesScreen() {
  const router = useRouter();
  const enabled = useFeatureFlags((s) => s.creatorTemplateStudio);
  const flags = useFeatureFlags((s) => s);

  const grouped = useMemo(() => {
    const available = CREATOR_TEMPLATES.filter((t) => isTemplateAvailable(t, flags));
    const out: { group: CreatorTemplateGroup; items: CreatorTemplate[] }[] = [];
    for (const group of TEMPLATE_GROUP_ORDER) {
      const items = available.filter((t) => t.group === group);
      if (items.length > 0) out.push({ group, items });
    }
    return out;
  }, [flags]);

  if (!enabled) {
    return <Redirect href="/(tabs)/create" />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={colors.dark.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Creator Templates</Text>
          <Text style={styles.subtitle}>Pick a layout and start faster.</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {grouped.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="sparkles-outline" size={30} color={colors.primary.teal} />
            <Text style={styles.emptyText}>No templates are available yet. Check back soon.</Text>
          </View>
        ) : (
          grouped.map(({ group, items }) => (
            <View key={group} style={styles.groupBlock}>
              <Text style={styles.groupLabel}>{group}</Text>
              {items.map((t) => (
                <View key={t.id} style={styles.card}>
                  <View style={styles.cardIcon}>
                    <Ionicons name={t.icon as never} size={24} color={colors.primary.teal} />
                  </View>
                  <View style={styles.cardText}>
                    <Text style={styles.cardName}>{t.name}</Text>
                    <Text style={styles.cardDesc}>{t.description}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.startBtn}
                    activeOpacity={0.85}
                    onPress={() => router.push(templateRoute(t) as never)}
                    accessibilityRole="button"
                    accessibilityLabel={`Start ${t.name}`}
                  >
                    <Text style={styles.startBtnText}>Start</Text>
                    <Ionicons name="arrow-forward" size={15} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.dark.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dark.border,
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.dark.text },
  subtitle: { fontSize: 12, color: colors.dark.textMuted, marginTop: 2 },
  scroll: { padding: 16, paddingBottom: 40, gap: 18 },
  emptyWrap: { alignItems: 'center', gap: 10, paddingVertical: 48 },
  emptyText: { fontSize: 13, color: colors.dark.textMuted, textAlign: 'center', maxWidth: 240 },
  groupBlock: { gap: 10 },
  groupLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.dark.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: 14,
  },
  cardIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(25,211,197,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(25,211,197,0.28)',
  },
  cardText: { flex: 1, gap: 3 },
  cardName: { fontSize: 14, fontWeight: '800', color: colors.dark.text },
  cardDesc: { fontSize: 12, color: colors.dark.textMuted, lineHeight: 16 },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: colors.primary.teal,
  },
  startBtnText: { fontSize: 13, fontWeight: '800', color: '#fff' },
});
