import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors, borderRadius, spacing, typography, shadows } from '@/theme';
import {
  coinPurchaseService,
  type CoinPack,
} from '@/services/live/coinPurchase';

interface Props {
  visible: boolean;
  userId: string | undefined;
  currentBalance: number;
  onClose: () => void;
  /** Fired with the new balance after a successful purchase. */
  onPurchased: (newBalance: number) => void;
}

/**
 * Sheet for buying coin packs. Currently backed by `MockCoinPurchaseProvider`
 * — swapping to a real IAP provider is a one-line change in `coinPurchase.ts`
 * and doesn't require touching this component.
 */
export function CoinShopModal({
  visible,
  userId,
  currentBalance,
  onClose,
  onPurchased,
}: Props) {
  const [packs, setPacks] = useState<CoinPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingSku, setBuyingSku] = useState<string | null>(null);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      await coinPurchaseService.init();
      const list = await coinPurchaseService.listPacks();
      if (!cancelled) {
        setPacks(list);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const handleBuy = async (pack: CoinPack) => {
    if (!userId) {
      setFlashMessage('Sign in to buy coins.');
      return;
    }
    if (buyingSku) return;

    setBuyingSku(pack.sku);
    setFlashMessage(null);

    try {
      const result = await coinPurchaseService.purchase(pack.sku, userId);
      if (result.success && result.coinsCredited) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const next = currentBalance + result.coinsCredited;
        onPurchased(next);
        setFlashMessage(`+${result.coinsCredited} coins added`);
        setTimeout(() => setFlashMessage(null), 1600);
      } else {
        setFlashMessage(result.error ?? 'Purchase failed. Try again.');
      }
    } catch {
      setFlashMessage('Purchase failed. Try again.');
    } finally {
      setBuyingSku(null);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.sheet}>
          <View style={styles.grip} />

          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Coin Shop</Text>
              <Text style={styles.subtitle}>
                Coins power gifts, tips, and shout-outs to creators.
              </Text>
            </View>
            <View style={styles.balancePill}>
              <Ionicons name="logo-bitcoin" size={14} color={colors.status.premium} />
              <Text style={styles.balanceText}>{currentBalance.toLocaleString()}</Text>
            </View>
          </View>

          {flashMessage ? (
            <View style={styles.flash}>
              <Text style={styles.flashText}>{flashMessage}</Text>
            </View>
          ) : null}

          {loading ? (
            <View style={styles.loadingBlock}>
              <ActivityIndicator color={colors.primary.teal} />
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.packList}
              showsVerticalScrollIndicator={false}
            >
              {packs.map((pack) => {
                const busy = buyingSku === pack.sku;
                return (
                  <TouchableOpacity
                    key={pack.sku}
                    style={[styles.packCard, pack.popular && styles.packPopular]}
                    onPress={() => handleBuy(pack)}
                    activeOpacity={0.85}
                    disabled={!!buyingSku}
                  >
                    {pack.popular ? (
                      <LinearGradient
                        colors={[colors.status.premium + '20', 'transparent']}
                        style={StyleSheet.absoluteFillObject}
                      />
                    ) : null}

                    <View style={styles.packIconWrap}>
                      <Ionicons
                        name="logo-bitcoin"
                        size={24}
                        color={colors.status.premium}
                      />
                    </View>

                    <View style={styles.packMeta}>
                      <View style={styles.packHeadRow}>
                        <Text style={styles.packName}>{pack.name}</Text>
                        {pack.popular ? (
                          <View style={styles.popularBadge}>
                            <Text style={styles.popularText}>POPULAR</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.packCoins}>
                        {pack.coins.toLocaleString()} coins
                        {pack.bonus ? (
                          <Text style={styles.bonus}> · {pack.bonus}</Text>
                        ) : null}
                      </Text>
                    </View>

                    <View style={styles.priceCol}>
                      {busy ? (
                        <ActivityIndicator color={colors.primary.teal} />
                      ) : (
                        <Text style={styles.priceText}>{pack.priceLabel}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}

              <Text style={styles.legal}>
                Demo mode: coins are credited instantly. Real purchases will be
                processed through Apple / Google once in-app payments are
                enabled.
              </Text>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.dark.card,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderTopWidth: 1,
    borderColor: colors.dark.borderInner,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    maxHeight: '82%',
    ...shadows.sheet,
  },
  grip: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.dark.borderInner,
    marginBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h2,
    fontSize: 20,
    color: colors.dark.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.dark.textMuted,
    marginTop: 2,
    lineHeight: 18,
  },
  balancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.status.premium + '18',
    borderWidth: 1,
    borderColor: colors.status.premium + '40',
  },
  balanceText: {
    ...typography.button,
    fontSize: 13,
    color: colors.status.premium,
  },
  flash: {
    backgroundColor: colors.primary.teal + '20',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary.teal + '40',
  },
  flashText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary.teal,
    textAlign: 'center',
  },
  loadingBlock: { paddingVertical: spacing['2xl'], alignItems: 'center' },
  packList: { paddingBottom: spacing.lg },
  packCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.dark.elevated,
    borderRadius: borderRadius.card,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.dark.borderInner,
    overflow: 'hidden',
  },
  packPopular: { borderColor: colors.status.premium + '60' },
  packIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.status.premium + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  packMeta: { flex: 1, minWidth: 0 },
  packHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  packName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.dark.text,
  },
  popularBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: colors.status.premium + '28',
  },
  popularText: {
    fontSize: 9,
    fontWeight: '900',
    color: colors.status.premium,
    letterSpacing: 0.5,
  },
  packCoins: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.dark.textSecondary,
    marginTop: 2,
  },
  bonus: { color: colors.status.premium, fontWeight: '800' },
  priceCol: { alignItems: 'flex-end', minWidth: 64 },
  priceText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.dark.text,
  },
  legal: {
    ...typography.caption,
    color: colors.dark.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 16,
  },
});
