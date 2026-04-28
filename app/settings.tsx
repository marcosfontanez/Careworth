import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Switch, Alert, ActivityIndicator, Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing, layout, borderRadius, shadows } from '@/theme';
import { iconSize } from '@/theme/sizes';
import { StackScreenHeader } from '@/components/ui/StackScreenHeader';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { clearImageCache } from '@/lib/imageCache';
import { useToast } from '@/components/ui/Toast';
import Constants from 'expo-constants';
import { LAUNCH_LINKS } from '@/constants/launch';
import { sendSentryTestEvent } from '@/lib/monitoring';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, profile, signOut } = useAuth();
  const toast = useToast();

  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [privateProfile, setPrivateProfile] = useState(profile?.privacyMode === 'private');
  const [deleting, setDeleting] = useState(false);

  const handleSignOut = async () => {
    await signOut();
  };

  const handleClearCache = async () => {
    await clearImageCache();
    toast.show('Cache cleared', 'success');
  };

  const openTerms = () => {
    const url = LAUNCH_LINKS.termsOfServiceUrl;
    if (url) void Linking.openURL(url);
    else router.push('/legal/terms');
  };

  const openPrivacy = () => {
    const url = LAUNCH_LINKS.privacyPolicyUrl;
    if (url) void Linking.openURL(url);
    else router.push('/legal/privacy');
  };

  const openSupport = () => {
    void Linking.openURL(
      `mailto:${LAUNCH_LINKS.supportEmail}?subject=${encodeURIComponent('PulseVerse support')}`,
    );
  };

  const handleSentryTest = () => {
    const r = sendSentryTestEvent();
    if (r.sent) {
      toast.show('Sent a test error to Sentry — check Issues in ~30s.', 'success');
    } else {
      toast.show(r.reason, 'error');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete My Account',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              if (user) {
                await supabase.from('profiles').delete().eq('id', user.id);
              }
              await signOut();
            } catch (err: any) {
              Alert.alert('Error', err.message ?? 'Failed to delete account. Please contact support.');
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StackScreenHeader
        insetTop={insets.top}
        title="Settings"
        leftIcon="close"
        leftAccessibilityLabel="Close settings"
        onPressLeft={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* PulseVerse Pro Upsell */}
        <TouchableOpacity
          onPress={() => router.push('/pro')}
          activeOpacity={0.88}
          style={styles.proWrap}
        >
          <LinearGradient
            colors={[colors.primary.gold + '22', colors.primary.gold + '0A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.proCard}
          >
            <View style={styles.proLeft}>
              <View style={styles.proIcon}>
                <Ionicons name="diamond" size={20} color={colors.primary.gold} />
              </View>
              <View>
                <Text style={styles.proTitle}>PulseVerse Pro</Text>
                <Text style={styles.proSub}>Analytics, priority support, and more</Text>
              </View>
            </View>
            <View style={styles.proArrow}>
              <Ionicons name="chevron-forward" size={iconSize.sm} color={colors.primary.gold} />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Quick Links */}
        <View style={styles.quickLinks}>
          <TouchableOpacity style={styles.quickLink} onPress={() => router.push('/earnings')} activeOpacity={0.7}>
            <Ionicons name="wallet-outline" size={20} color={colors.primary.teal} />
            <Text style={styles.quickLinkText}>Earnings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickLink} onPress={() => router.push('/saved')} activeOpacity={0.7}>
            <Ionicons name="bookmark-outline" size={iconSize.sm} color={colors.primary.royal} />
            <Text style={styles.quickLinkText}>Saved</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickLink} onPress={() => router.push('/(tabs)/jobs' as any)} activeOpacity={0.7}>
            <Ionicons name="briefcase-outline" size={iconSize.sm} color={colors.primary.gold} />
            <Text style={styles.quickLinkText}>Jobs</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.card}>
          <SettingRow
            icon="notifications-outline"
            label="Push Notifications"
            right={<Switch value={pushEnabled} onValueChange={setPushEnabled} trackColor={{ true: colors.primary.teal }} />}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="mail-outline"
            label="Email Notifications"
            right={<Switch value={emailNotifs} onValueChange={setEmailNotifs} trackColor={{ true: colors.primary.teal }} />}
          />
        </View>

        <Text style={styles.sectionTitle}>Privacy</Text>
        <View style={styles.card}>
          <SettingRow
            icon="lock-closed-outline"
            label="Private Profile"
            subtitle="Only approved followers can see your posts"
            right={<Switch value={privateProfile} onValueChange={setPrivateProfile} trackColor={{ true: colors.primary.teal }} />}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="people-outline"
            label="Blocked Users"
            onPress={() => router.push('/blocked-users')}
            right={<Ionicons name="chevron-forward" size={iconSize.sm} color={colors.dark.textMuted} />}
          />
        </View>

        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <SettingRow
            icon="sparkles-outline"
            label="My Pulse — banner, photo & bio"
            subtitle="Customize how your profile looks"
            onPress={() => router.push('/my-pulse-appearance')}
            right={<Ionicons name="chevron-forward" size={iconSize.sm} color={colors.dark.textMuted} />}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="key-outline"
            label="Change Password"
            onPress={() => router.push('/change-password')}
            right={<Ionicons name="chevron-forward" size={iconSize.sm} color={colors.dark.textMuted} />}
          />
        </View>

        <Text style={styles.sectionTitle}>Storage</Text>
        <View style={styles.card}>
          <SettingRow
            icon="trash-bin-outline"
            label="Clear Cache"
            subtitle="Free up storage space"
            onPress={handleClearCache}
            right={<Ionicons name="chevron-forward" size={iconSize.sm} color={colors.dark.textMuted} />}
          />
        </View>

        <Text style={styles.sectionTitle}>Support</Text>
        <View style={styles.card}>
          <SettingRow
            icon="mail-outline"
            label="Contact support"
            subtitle={LAUNCH_LINKS.supportEmail}
            onPress={openSupport}
            right={<Ionicons name="chevron-forward" size={iconSize.sm} color={colors.dark.textMuted} />}
          />
        </View>

        <Text style={styles.sectionTitle}>Legal</Text>
        <View style={styles.card}>
          <SettingRow
            icon="document-text-outline"
            label="Terms of Service"
            subtitle={LAUNCH_LINKS.termsOfServiceUrl ? 'Opens in browser' : 'In-app'}
            onPress={openTerms}
            right={<Ionicons name="chevron-forward" size={iconSize.sm} color={colors.dark.textMuted} />}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="shield-outline"
            label="Privacy Policy"
            subtitle={LAUNCH_LINKS.privacyPolicyUrl ? 'Opens in browser' : 'In-app'}
            onPress={openPrivacy}
            right={<Ionicons name="chevron-forward" size={iconSize.sm} color={colors.dark.textMuted} />}
          />
        </View>

        <View style={{ height: 24 }} />

        <View style={styles.card}>
          <TouchableOpacity style={styles.actionRow} onPress={handleSignOut} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={iconSize.sm} color={colors.primary.teal} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.deleteRow} onPress={handleDeleteAccount} disabled={deleting} activeOpacity={0.7}>
          {deleting ? (
            <ActivityIndicator size="small" color={colors.status.error} />
          ) : (
            <>
              <Ionicons name="trash-outline" size={iconSize.sm} color={colors.status.error} />
              <Text style={styles.deleteText}>Delete Account</Text>
            </>
          )}
        </TouchableOpacity>

        {__DEV__ ? (
          <View style={styles.devLinks}>
            <TouchableOpacity
              style={styles.devPreviewLink}
              onPress={() => router.push('/design/end-card-preview')}
              activeOpacity={0.85}
            >
              <Text style={styles.devPreviewText}>Design · Export end card preview</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.devPreviewLink}
              onPress={handleSentryTest}
              activeOpacity={0.85}
            >
              <Text style={styles.devPreviewText}>Dev · Send Sentry test error</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <Text style={styles.version}>PulseVerse v{Constants.expoConfig?.version ?? '1.0.0'}</Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function SettingRow({ icon, iconColor, label, subtitle, right, onPress }: {
  icon: string; iconColor?: string; label: string; subtitle?: string; right?: React.ReactNode; onPress?: () => void;
}) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon as any} size={iconSize.sm} color={iconColor ?? colors.dark.textMuted} />
      <View style={styles.rowBody}>
        <Text style={styles.rowLabel}>{label}</Text>
        {subtitle && <Text style={styles.rowSub}>{subtitle}</Text>}
      </View>
      {right}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  scroll: { paddingHorizontal: layout.screenPadding },

  sectionTitle: {
    ...typography.label,
    color: colors.dark.textMuted,
    marginTop: spacing.xl + spacing.sm,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },

  card: {
    backgroundColor: colors.dark.card,
    borderRadius: borderRadius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.dark.borderInner,
    ...shadows.subtle,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md + spacing.xs,
    paddingHorizontal: layout.screenPadding,
  },
  rowBody: { flex: 1 },
  rowLabel: { ...typography.body, fontWeight: '500', color: colors.dark.text },
  rowSub: { ...typography.caption, color: colors.dark.textMuted, marginTop: 2 },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.dark.border, marginLeft: 48 },

  actionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14,
  },
  signOutText: { fontSize: 15, fontWeight: '600', color: colors.primary.teal },

  deleteRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, marginTop: 12,
  },
  deleteText: { fontSize: 14, fontWeight: '500', color: colors.status.error },

  devLinks: { marginTop: 20, gap: 10 },
  devPreviewLink: {
    marginTop: 0,
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.dark.border,
    backgroundColor: colors.dark.card,
  },
  devPreviewText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.dark.textSecondary,
  },

  version: {
    textAlign: 'center', fontSize: 12, color: colors.dark.textMuted,
    marginTop: 24,
  },

  proWrap: {
    marginTop: spacing.lg,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.primary.gold + '38',
    ...shadows.card,
  },
  proCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  proLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  proIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primary.gold + '1F',
    borderWidth: 1, borderColor: colors.primary.gold + '38',
    alignItems: 'center', justifyContent: 'center',
  },
  proEmoji: { fontSize: 28 },
  proTitle: { ...typography.subtitle, fontSize: 16, fontWeight: '800', color: colors.primary.gold, letterSpacing: -0.2 },
  proSub: { ...typography.caption, fontSize: 12, color: colors.dark.textSecondary, marginTop: 2 },
  proArrow: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.primary.gold + '1A',
    alignItems: 'center', justifyContent: 'center',
  },

  quickLinks: {
    flexDirection: 'row',
    gap: spacing.sm + spacing.xs,
    marginTop: spacing.lg,
  },
  quickLink: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md + spacing.xs,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.borderInner,
    ...shadows.subtle,
  },
  quickLinkText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
    color: colors.dark.textSecondary,
  },
});
