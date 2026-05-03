import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackScreenHeader } from '@/components/ui/StackScreenHeader';
import { colors, layout, spacing, typography } from '@/theme';
import { HIPAA_ENFORCEMENT_SUMMARY } from '@/constants/authLegal';

export default function TermsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StackScreenHeader insetTop={insets.top} title="Terms of Service" onPressLeft={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.updated}>Last updated: May 1, 2026</Text>

        <Text style={styles.h2}>1. Acceptance of Terms</Text>
        <Text style={styles.body}>
          By accessing or using the PulseVerse mobile application ("App"), you agree to be bound by
          these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the App.
        </Text>

        <Text style={styles.h2}>2. Description of Service</Text>
        <Text style={styles.body}>
          PulseVerse is a social platform designed for nurses, CNAs, patient care technicians, and
          healthcare professionals. The App provides community features, short‑form media, and
          professional networking tools. We may add or retire specific modules (for example,
          careers or education) over time; availability can vary by build, region, or account.
        </Text>

        <Text style={styles.h2}>3. User Accounts</Text>
        <Text style={styles.body}>
          You must provide accurate, current, and complete information during registration. You are
          responsible for maintaining the confidentiality of your account credentials and for all
          activities that occur under your account. You must notify us immediately of any unauthorized
          use of your account.
        </Text>

        <Text style={styles.h2}>4. User Content</Text>
        <Text style={styles.body}>
          You retain ownership of content you post ("User Content"). By posting User Content, you
          grant PulseVerse a non-exclusive, worldwide, royalty-free license to use, display, and
          distribute your content within the App. You are solely responsible for your User Content
          and must not post content that is unlawful, defamatory, harassing, or that violates the
          rights of others.
        </Text>

        <Text style={styles.h2}>5. Professional Disclaimer</Text>
        <Text style={styles.body}>
          PulseVerse does not provide medical advice. Content shared on the platform is for
          informational and community purposes only and must not be used as a substitute for
          professional medical judgment, facility policy, or licensure obligations. If the App
          surfaces third‑party opportunities or links, PulseVerse does not verify employers,
          compensation, or postings unless we expressly say otherwise.
        </Text>

        <Text style={styles.h2}>6. Prohibited Conduct</Text>
        <Text style={styles.body}>
          You may not: (a) impersonate any person or entity; (b) share protected health information
          (PHI) or violate HIPAA; (c) harass, threaten, or bully other users; (d) post spam or
          misleading content; (e) attempt to circumvent security features; (f) use automated tools
          to access the service.
        </Text>

        <Text style={styles.h2}>7. Content Moderation</Text>
        <Text style={styles.body}>
          PulseVerse reserves the right to remove any content that violates these Terms and to
          suspend or terminate accounts of repeat violators. Users may report inappropriate content
          using the in-app reporting feature.
        </Text>

        <Text style={styles.h2}>8. Termination</Text>
        <Text style={styles.body}>
          We may terminate or suspend your account at our sole discretion, without prior notice, for
          conduct that we believe violates these Terms or is harmful to other users, us, or third
          parties.
        </Text>

        <Text style={styles.h2}>9. Limitation of Liability</Text>
        <Text style={styles.body}>
          To the maximum extent permitted by law, PulseVerse shall not be liable for any indirect,
          incidental, special, consequential, or punitive damages arising from your use of the App.
        </Text>

        <Text style={styles.h2}>10. Changes to Terms</Text>
        <Text style={styles.body}>
          We may update these Terms from time to time. For material changes, we will provide notice
          in‑app (for example, a banner or consent prompt) or by email to the address on your
          account where appropriate. Your continued use of the App after the effective date of
          updated Terms constitutes acceptance. If you do not agree, stop using the App and, where
          available, delete your account.
        </Text>

        <Text style={styles.h2}>11. Contact</Text>
        <Text style={styles.body}>
          For questions about these Terms, please contact us at legal@pulseverse.app.
        </Text>

        <Text style={styles.h2}>12. Patient privacy, HIPAA, and enforcement</Text>
        <Text style={styles.body}>
          The following summarizes the expectations that apply to everyone using PulseVerse in connection with patient
          information. It is part of these Terms; the full Privacy Policy also describes how we handle data.
        </Text>
        <Text style={styles.body}>{HIPAA_ENFORCEMENT_SUMMARY}</Text>

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
