import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackScreenHeader } from '@/components/ui/StackScreenHeader';
import { colors, layout, spacing, typography } from '@/theme';

export default function PrivacyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StackScreenHeader insetTop={insets.top} title="Privacy Policy" onPressLeft={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.updated}>Last updated: April 18, 2026</Text>

        <Text style={styles.h2}>1. Information We Collect</Text>
        <Text style={styles.body}>
          We collect information you provide directly: name, email address, phone number, profile
          information (role, specialty, location), photos, and content you post. We also collect
          usage data including device information, IP address, and app interaction data.
        </Text>

        <Text style={styles.h2}>2. How We Use Your Information</Text>
        <Text style={styles.body}>
          We use your information to: (a) provide and improve our services; (b) personalize your
          feed and job recommendations; (c) send notifications about activity on your account;
          (d) enforce our Terms of Service; (e) analyze usage patterns to improve the App.
        </Text>

        <Text style={styles.h2}>3. Information Sharing</Text>
        <Text style={styles.body}>
          We do not sell your personal information. We may share your information with: (a) other
          users as part of normal App functionality (e.g., your profile, posts); (b) service
          providers who help us operate the App (e.g., hosting, analytics); (c) law enforcement
          when required by law.
        </Text>

        <Text style={styles.h2}>4. HIPAA Compliance</Text>
        <Text style={styles.body}>
          PulseVerse is not a covered entity under HIPAA. However, we take privacy seriously and
          prohibit users from sharing any Protected Health Information (PHI) about patients on the
          platform. Any such content will be removed immediately.
        </Text>

        <Text style={styles.h2}>5. Data Security</Text>
        <Text style={styles.body}>
          We implement industry-standard security measures including encryption in transit (TLS) and
          at rest, secure authentication tokens, and regular security audits. However, no method of
          electronic transmission or storage is 100% secure.
        </Text>

        <Text style={styles.h2}>6. Data Retention</Text>
        <Text style={styles.body}>
          We retain your data for as long as your account is active. You can request deletion of
          your account and associated data at any time by contacting us at privacy@pulseverse.app.
          We will process deletion requests within 30 days.
        </Text>

        <Text style={styles.h2}>7. Your Rights</Text>
        <Text style={styles.body}>
          Depending on your jurisdiction, you may have the right to: (a) access your personal data;
          (b) correct inaccurate data; (c) request deletion of your data; (d) object to processing;
          (e) data portability. California residents have additional rights under CCPA.
        </Text>

        <Text style={styles.h2}>8. Children's Privacy</Text>
        <Text style={styles.body}>
          PulseVerse is not intended for users under 18 years of age. We do not knowingly collect
          personal information from children. If we learn that we have collected information from a
          child under 18, we will delete it promptly.
        </Text>

        <Text style={styles.h2}>9. Push Notifications</Text>
        <Text style={styles.body}>
          We may send push notifications about activity on your account, new job matches, and
          community updates. You can disable push notifications at any time through your device
          settings.
        </Text>

        <Text style={styles.h2}>10. Analytics</Text>
        <Text style={styles.body}>
          We collect anonymous usage analytics to improve the App experience. This data is
          aggregated and cannot be used to identify individual users.
        </Text>

        <Text style={styles.h2}>11. Changes to This Policy</Text>
        <Text style={styles.body}>
          We may update this Privacy Policy periodically. We will notify you of material changes
          through the App or via email. Continued use after changes constitutes acceptance.
        </Text>

        <Text style={styles.h2}>12. Contact Us</Text>
        <Text style={styles.body}>
          For privacy-related questions or data requests, contact us at privacy@pulseverse.app.
        </Text>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  content: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.md,
    paddingBottom: spacing['4xl'],
  },
  updated: { ...typography.bodySmall, color: colors.dark.textMuted, marginBottom: spacing.xl },
  h2: {
    ...typography.sectionTitle,
    fontSize: 16,
    color: colors.primary.teal,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  body: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 22,
    color: colors.dark.textSecondary,
  },
  bottomSpacer: { height: spacing['3xl'] },
});
