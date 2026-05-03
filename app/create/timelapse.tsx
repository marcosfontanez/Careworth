import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StackScreenHeader } from '@/components/ui/StackScreenHeader';
import { colors, borderRadius, layout, spacing, typography } from '@/theme';

export default function TimelapsePlaceholderScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.dark.bg, '#0a1628']} style={StyleSheet.absoluteFill} />
      <StackScreenHeader
        insetTop={insets.top}
        title="Photo → timelapse"
        onPressLeft={() => router.back()}
      />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Ionicons name="images-outline" size={48} color={colors.primary.teal} />
        <Text style={styles.h1}>Coming in a fast follow</Text>
        <Text style={styles.p}>
          We need on-device or server encoding to cross-fade 8–20 photos into a 3–5s MP4 with audio. Until then, use
          your favorite editor or screen record a carousel, then upload with <Text style={styles.bold}>Upload Video</Text>.
        </Text>
        <TouchableOpacity style={styles.cta} onPress={() => router.replace('/create/video?mode=upload')} activeOpacity={0.9}>
          <Text style={styles.ctaText}>Open video upload</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.dark.text} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  body: {
    padding: layout.screenPadding,
    paddingTop: spacing.xl,
    gap: spacing.md,
    alignItems: 'center',
  },
  h1: { ...typography.h2, color: colors.dark.text, textAlign: 'center' },
  p: { ...typography.body, color: colors.dark.textSecondary, textAlign: 'center', lineHeight: 22 },
  bold: { fontWeight: '800', color: colors.dark.text },
  cta: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary.teal,
  },
  ctaText: { fontSize: 15, fontWeight: '800', color: colors.dark.text },
});
