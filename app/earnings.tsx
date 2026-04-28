import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/theme';
import { useFeatureFlags } from '@/lib/featureFlags';
import { creatorTipsService } from '@/services/monetization/creatorTips';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toast';
import type { CreatorEarnings, CreatorTip } from '@/types';

export default function EarningsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const toast = useToast();
  const tipsEnabled = useFeatureFlags((s) => s.creatorTips);

  const [earnings, setEarnings] = useState<CreatorEarnings | null>(null);
  const [recentTips, setRecentTips] = useState<CreatorTip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !tipsEnabled) return;
    loadData();
  }, [user, tipsEnabled]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    const [e, tips] = await Promise.all([
      creatorTipsService.getCreatorEarnings(user.id),
      creatorTipsService.getRecentTips(user.id),
    ]);
    setEarnings(e);
    setRecentTips(tips);
    setLoading(false);
  };

  const handlePayout = async () => {
    if (!user || !earnings) return;
    if (earnings.pendingPayout < 25) {
      Alert.alert('Minimum $25', 'You need at least $25 in pending earnings to request a payout.');
      return;
    }
    const success = await creatorTipsService.requestPayout(user.id);
    if (success) {
      toast.show('Payout requested! Processing in 3-5 business days.', 'success');
      loadData();
    } else {
      toast.show('Failed to request payout', 'error');
    }
  };

  if (!tipsEnabled) {
    return (
      <View style={styles.container}>
        <View style={[styles.closedState, { paddingTop: insets.top + 8 }]}>
          <Ionicons name="wallet-outline" size={64} color={colors.dark.textMuted} />
          <Text style={styles.closedTitle}>Coming Soon</Text>
          <Text style={styles.closedSub}>Creator earnings are not available yet.</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.dark.bg, '#0D1B2A']}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Earnings</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.status.premium} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Text style={styles.balanceAmount}>
              ${(earnings?.pendingPayout ?? 0).toFixed(2)}
            </Text>
            <TouchableOpacity style={styles.payoutBtn} onPress={handlePayout} activeOpacity={0.8}>
              <Ionicons name="cash-outline" size={16} color={colors.dark.text} />
              <Text style={styles.payoutBtnText}>Request Payout</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>${(earnings?.lifetimeEarnings ?? 0).toFixed(2)}</Text>
              <Text style={styles.statLabel}>Lifetime</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>${(earnings?.monthlyEarnings ?? 0).toFixed(2)}</Text>
              <Text style={styles.statLabel}>This Month</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{earnings?.totalTips ?? 0}</Text>
              <Text style={styles.statLabel}>Total Tips</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Recent Tips</Text>
          {recentTips.length === 0 ? (
            <View style={styles.emptyTips}>
              <Ionicons name="gift-outline" size={32} color={colors.dark.textMuted} />
              <Text style={styles.emptyTipsText}>No tips yet. Keep creating!</Text>
            </View>
          ) : (
            recentTips.map((tip) => (
              <View key={tip.id} style={styles.tipRow}>
                <View style={styles.tipEmoji}>
                  <Text style={styles.tipEmojiText}>
                    {tip.amount >= 100 ? '👑' : tip.amount >= 50 ? '🔥' : tip.amount >= 25 ? '🏆' : tip.amount >= 10 ? '💎' : '☕'}
                  </Text>
                </View>
                <View style={styles.tipInfo}>
                  <Text style={styles.tipAmount}>${tip.amount}</Text>
                  {tip.message && <Text style={styles.tipMessage} numberOfLines={1}>{tip.message}</Text>}
                  <Text style={styles.tipDate}>{new Date(tip.createdAt).toLocaleDateString()}</Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.dark.text },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },

  balanceCard: {
    backgroundColor: colors.dark.card, borderRadius: 20, padding: 24,
    alignItems: 'center', marginTop: 12, marginBottom: 20,
    borderWidth: 1, borderColor: colors.status.premium + '30',
  },
  balanceLabel: { fontSize: 14, color: colors.dark.textSecondary, marginBottom: 4 },
  balanceAmount: { fontSize: 42, fontWeight: '900', color: colors.status.premium },
  payoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.primary.royal, paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 12, marginTop: 16,
  },
  payoutBtnText: { fontSize: 14, fontWeight: '700', color: colors.dark.text },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statCard: {
    flex: 1, backgroundColor: colors.dark.card, borderRadius: 14,
    padding: 16, alignItems: 'center',
  },
  statValue: { fontSize: 18, fontWeight: '800', color: colors.dark.text },
  statLabel: { fontSize: 11, color: colors.dark.textMuted, marginTop: 4 },

  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.dark.text, marginBottom: 12 },

  emptyTips: {
    alignItems: 'center', paddingVertical: 32, gap: 8,
    backgroundColor: colors.dark.card, borderRadius: 14,
  },
  emptyTipsText: { fontSize: 14, color: colors.dark.textMuted },

  tipRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: colors.dark.card, borderRadius: 12, padding: 14,
    marginBottom: 8,
  },
  tipEmoji: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.dark.cardAlt, alignItems: 'center', justifyContent: 'center',
  },
  tipEmojiText: { fontSize: 22 },
  tipInfo: { flex: 1 },
  tipAmount: { fontSize: 16, fontWeight: '800', color: colors.status.premium },
  tipMessage: { fontSize: 13, color: colors.dark.textSecondary, marginTop: 2 },
  tipDate: { fontSize: 11, color: colors.dark.textMuted, marginTop: 2 },

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
