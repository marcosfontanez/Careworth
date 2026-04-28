import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/theme';
import { useFeatureFlags } from '@/lib/featureFlags';
import { PLANS, subscriptionService } from '@/services/monetization/subscriptions';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toast';
import type { SubscriptionTier } from '@/types';

export default function ProScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const toast = useToast();
  const proEnabled = useFeatureFlags((s) => s.pulseversePro);
  const [selected, setSelected] = useState<SubscriptionTier>('pro_yearly');
  const [loading, setLoading] = useState(false);

  if (!proEnabled) {
    return (
      <View style={styles.container}>
        <View style={[styles.closedState, { paddingTop: insets.top + 8 }]}>
          <Ionicons name="lock-closed" size={64} color={colors.dark.textMuted} />
          <Text style={styles.closedTitle}>Coming Soon</Text>
          <Text style={styles.closedSub}>PulseVerse Pro is not available yet.</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const proMonthly = PLANS.find((p) => p.tier === 'pro_monthly')!;
  const proYearly = PLANS.find((p) => p.tier === 'pro_yearly')!;

  const handleSubscribe = async () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to subscribe.');
      return;
    }

    setLoading(true);
    try {
      // RevenueCat integration placeholder — in production this would
      // call Purchases.purchasePackage() and then sync with our backend
      const success = await subscriptionService.activateSubscription(user.id, selected);
      if (success) {
        toast.show('Welcome to PulseVerse Pro!', 'success');
        router.back();
      } else {
        toast.show('Something went wrong', 'error');
      }
    } catch {
      toast.show('Purchase failed', 'error');
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.dark.bg, '#0D1B2A', colors.primary.navy]}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="close" size={28} color={colors.dark.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.proBadge}>
            <Ionicons name="diamond" size={20} color={colors.status.premium} />
            <Text style={styles.proBadgeText}>PRO</Text>
          </View>
          <Text style={styles.heroTitle}>Upgrade to{'\n'}PulseVerse Pro</Text>
          <Text style={styles.heroSub}>Unlock the full experience</Text>
        </View>

        <View style={styles.features}>
          {proMonthly.features.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={20} color={colors.status.premium} />
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        <View style={styles.plans}>
          <TouchableOpacity
            style={[styles.planCard, selected === 'pro_yearly' && styles.planCardSelected]}
            onPress={() => setSelected('pro_yearly')}
            activeOpacity={0.8}
          >
            <View style={styles.planSaveBadge}>
              <Text style={styles.planSaveText}>SAVE 33%</Text>
            </View>
            <View style={styles.planRadio}>
              <View style={[styles.radioOuter, selected === 'pro_yearly' && styles.radioOuterSelected]}>
                {selected === 'pro_yearly' && <View style={styles.radioInner} />}
              </View>
            </View>
            <View style={styles.planInfo}>
              <Text style={styles.planName}>Annual</Text>
              <Text style={styles.planPrice}>${proYearly.price}<Text style={styles.planPer}>/year</Text></Text>
              <Text style={styles.planMonthly}>${(proYearly.price / 12).toFixed(2)}/mo</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.planCard, selected === 'pro_monthly' && styles.planCardSelected]}
            onPress={() => setSelected('pro_monthly')}
            activeOpacity={0.8}
          >
            <View style={styles.planRadio}>
              <View style={[styles.radioOuter, selected === 'pro_monthly' && styles.radioOuterSelected]}>
                {selected === 'pro_monthly' && <View style={styles.radioInner} />}
              </View>
            </View>
            <View style={styles.planInfo}>
              <Text style={styles.planName}>Monthly</Text>
              <Text style={styles.planPrice}>${proMonthly.price}<Text style={styles.planPer}>/month</Text></Text>
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.subscribeBtn, loading && styles.subscribeBtnDisabled]}
          onPress={handleSubscribe}
          disabled={loading}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[colors.status.premium, '#B8860B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.subscribeBtnGrad}
          >
            <Ionicons name="diamond" size={18} color={colors.dark.text} />
            <Text style={styles.subscribeBtnText}>
              {loading ? 'Processing...' : 'Subscribe Now'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.terms}>
          Subscription auto-renews. Cancel anytime in settings.{'\n'}
          By subscribing you agree to our Terms of Service.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  header: {
    flexDirection: 'row', justifyContent: 'flex-end',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  hero: { alignItems: 'center', marginTop: 20, marginBottom: 32 },
  proBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(212,166,58,0.15)',
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    marginBottom: 16,
  },
  proBadgeText: {
    fontSize: 14, fontWeight: '900', color: colors.status.premium,
    letterSpacing: 2,
  },
  heroTitle: {
    fontSize: 32, fontWeight: '900', color: colors.dark.text,
    textAlign: 'center', lineHeight: 38, letterSpacing: -0.5,
  },
  heroSub: {
    fontSize: 16, color: colors.dark.textSecondary,
    textAlign: 'center', marginTop: 8,
  },
  features: { gap: 14, marginBottom: 32 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureText: { fontSize: 15, color: colors.dark.text, fontWeight: '500', flex: 1 },

  plans: { gap: 12, marginBottom: 24 },
  planCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.dark.card, borderRadius: 16, padding: 20,
    borderWidth: 2, borderColor: 'transparent',
  },
  planCardSelected: { borderColor: colors.status.premium },
  planSaveBadge: {
    position: 'absolute', top: -10, right: 16,
    backgroundColor: colors.status.premium, paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 8,
  },
  planSaveText: { fontSize: 10, fontWeight: '900', color: colors.dark.text, letterSpacing: 0.5 },
  planRadio: { marginRight: 16 },
  radioOuter: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: colors.dark.textMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  radioOuterSelected: { borderColor: colors.status.premium },
  radioInner: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: colors.status.premium,
  },
  planInfo: { flex: 1 },
  planName: { fontSize: 16, fontWeight: '700', color: colors.dark.text },
  planPrice: { fontSize: 24, fontWeight: '900', color: colors.dark.text, marginTop: 4 },
  planPer: { fontSize: 14, fontWeight: '500', color: colors.dark.textSecondary },
  planMonthly: { fontSize: 13, color: colors.dark.textMuted, marginTop: 2 },

  subscribeBtn: { borderRadius: 16, overflow: 'hidden' },
  subscribeBtnDisabled: { opacity: 0.6 },
  subscribeBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 16, borderRadius: 16,
  },
  subscribeBtnText: { fontSize: 18, fontWeight: '800', color: colors.dark.text },
  terms: {
    fontSize: 11, color: colors.dark.textMuted, textAlign: 'center',
    marginTop: 16, lineHeight: 16,
  },

  closedState: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32,
  },
  closedTitle: { fontSize: 24, fontWeight: '800', color: colors.dark.text },
  closedSub: { fontSize: 15, color: colors.dark.textSecondary, textAlign: 'center' },
  backBtn: {
    marginTop: 16, backgroundColor: colors.primary.royal,
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12,
  },
  backBtnText: { fontSize: 15, fontWeight: '700', color: colors.dark.text },
});
