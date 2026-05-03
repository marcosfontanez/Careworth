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
        <Text style={styles.updated}>Last updated: May 1, 2026</Text>

        <Text style={styles.h2}>1. Information We Collect</Text>
        <Text style={styles.body}>
          We collect information you provide directly: name, email address, phone number, profile
          information (role, specialty, location), photos, and content you post. We also collect
          usage data including device information, IP address, and app interaction data.
        </Text>

        <Text style={styles.h2}>2. How We Use Your Information</Text>
        <Text style={styles.body}>
          We use your information to: (a) provide and improve the App; (b) personalize your feed
          and recommendations where we offer them; (c) deliver in‑app and (if you opt in on your
          device) push notifications about account activity or community updates; (d) enforce
          our Terms of Service and safety policies; (e) measure reliability and product usage so we
          can improve performance and features.
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
          We use technical and organizational measures designed to protect your information,
          including encryption in transit (TLS) for client connections, access controls, and secure
          authentication practices. No method of electronic transmission or storage is completely
          secure; we encourage strong passwords, device passcodes, and prompt reporting of suspected
          unauthorized access.
        </Text>

        <Text style={styles.h2}>6. Data Retention</Text>
        <Text style={styles.body}>
          We retain personal information for as long as your account is active and as needed to
          provide the service, comply with law, resolve disputes, and enforce our agreements.
          You may request deletion of your account and associated personal information by contacting
          privacy@pulseverse.app. We will respond within a reasonable time; some records may be
          retained where law or legitimate security / fraud‑prevention needs require it.
        </Text>

        <Text style={styles.h2}>7. Your Rights</Text>
        <Text style={styles.body}>
          Depending on your jurisdiction, you may have the right to: (a) access your personal data;
          (b) correct inaccurate data; (c) request deletion of your data; (d) object to processing;
          (e) data portability. California residents have additional rights under CCPA.
        </Text>

        <Text style={styles.h2}>8. Children’s privacy</Text>
        <Text style={styles.body}>
          PulseVerse is intended for adults. We do not knowingly collect personal information from
          children under 13 (or the minimum digital‑consent age in your jurisdiction, if higher).
          If you believe we collected a child’s information in error, contact us at
          privacy@pulseverse.app and we will take appropriate steps, which may include deletion.
        </Text>

        <Text style={styles.h2}>9. Push notifications</Text>
        <Text style={styles.body}>
          If you grant alert permission, we may send push notifications about account activity,
          messages, or community updates you subscribe to. You can turn off or fine‑tune alerts in
          your device settings at any time; doing so may limit certain real‑time features.
        </Text>

        <Text style={styles.h2}>10. Analytics and diagnostics</Text>
        <Text style={styles.body}>
          We collect product analytics and error diagnostics (for example, crash or stability
          reports) to improve reliability. Depending on the tool, data may be aggregated or may
          include pseudonymous identifiers (such as a device or install id). We do not sell your
          personal information as defined under applicable U.S. state privacy laws.
        </Text>

        <Text style={styles.h2}>11. Changes to this policy</Text>
        <Text style={styles.body}>
          We may update this Privacy Policy from time to time. When we make material changes, we will
          provide notice in‑app or by email where appropriate and update the “Last updated” date
          above. Continued use after the effective date means you acknowledge the revised policy.
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
