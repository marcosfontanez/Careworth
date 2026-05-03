import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, Pressable,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '@/theme';
import { getGiftsByTier } from '@/services/live/gifts';
import type { LiveGift, LiveGiftTier } from '@/types';

interface Props {
  visible: boolean;
  coinBalance: number;
  onSendGift: (gift: LiveGift, quantity: number) => void;
  onClose: () => void;
  /** When omitted (v1 launch), coin balance is display-only — no “buy coins”. */
  onBuyCoins?: () => void;
  sending?: boolean;
}

const TABS: { key: LiveGiftTier; label: string; icon: string }[] = [
  { key: 'free', label: 'Free', icon: 'heart' },
  { key: 'standard', label: 'Standard', icon: 'star' },
  { key: 'premium', label: 'Premium', icon: 'diamond' },
  { key: 'legendary', label: 'Legendary', icon: 'trophy' },
];

export function GiftPicker({ visible, coinBalance, onSendGift, onClose, onBuyCoins, sending }: Props) {
  const [tab, setTab] = useState<LiveGiftTier>('free');
  const [selected, setSelected] = useState<LiveGift | null>(null);
  const [quantity, setQuantity] = useState(1);

  const gifts = getGiftsByTier(tab);
  const canAfford = selected ? selected.coinCost * quantity <= coinBalance || selected.coinCost === 0 : false;

  const handleSend = () => {
    if (!selected) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSendGift(selected, quantity);
    setSelected(null);
    setQuantity(1);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <Text style={styles.title}>Send a Gift</Text>
            {onBuyCoins ? (
              <TouchableOpacity style={styles.coinBadge} onPress={onBuyCoins} activeOpacity={0.7}>
                <Ionicons name="logo-bitcoin" size={14} color={colors.status.premium} />
                <Text style={styles.coinText}>{coinBalance.toLocaleString()}</Text>
                <Ionicons name="add-circle" size={16} color={colors.status.premium} />
              </TouchableOpacity>
            ) : (
              <View style={styles.coinBadge}>
                <Ionicons name="logo-bitcoin" size={14} color={colors.status.premium} />
                <Text style={styles.coinText}>{coinBalance.toLocaleString()}</Text>
              </View>
            )}
          </View>

          <View style={styles.tabs}>
            {TABS.map((t) => (
              <TouchableOpacity
                key={t.key}
                style={[styles.tab, tab === t.key && styles.tabActive]}
                onPress={() => { setTab(t.key); setSelected(null); setQuantity(1); }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={t.icon as any}
                  size={14}
                  color={tab === t.key ? '#FFF' : colors.dark.textMuted}
                />
                <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.giftScroll}
          >
            {gifts.map((gift) => {
              const isSelected = selected?.id === gift.id;
              return (
                <TouchableOpacity
                  key={gift.id}
                  style={[styles.giftCard, isSelected && styles.giftCardSelected]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelected(gift);
                    setQuantity(1);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.giftEmoji}>{gift.emoji}</Text>
                  <Text style={styles.giftName} numberOfLines={1}>{gift.name}</Text>
                  {gift.coinCost > 0 ? (
                    <View style={styles.giftCostRow}>
                      <Ionicons name="logo-bitcoin" size={10} color={colors.status.premium} />
                      <Text style={styles.giftCost}>{gift.coinCost}</Text>
                    </View>
                  ) : (
                    <Text style={styles.giftFreeLabel}>FREE</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {selected && (
            <View style={styles.sendSection}>
              <View style={styles.quantityRow}>
                <Text style={styles.quantityLabel}>Quantity:</Text>
                {[1, 5, 10, 25, 99].map((q) => (
                  <TouchableOpacity
                    key={q}
                    style={[styles.qBtn, quantity === q && styles.qBtnActive]}
                    onPress={() => setQuantity(q)}
                  >
                    <Text style={[styles.qBtnText, quantity === q && styles.qBtnTextActive]}>
                      {q === 99 ? '99+' : q}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  !canAfford && styles.sendBtnDisabled,
                  sending && styles.sendBtnDisabled,
                ]}
                onPress={handleSend}
                disabled={!canAfford || sending}
                activeOpacity={0.8}
              >
                {sending ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <Text style={styles.sendEmoji}>{selected.emoji}</Text>
                    <Text style={styles.sendBtnText}>
                      Send {quantity > 1 ? `x${quantity} ` : ''}
                      {selected.coinCost > 0
                        ? `(${(selected.coinCost * quantity).toLocaleString()} coins)`
                        : ''}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {!canAfford && selected.coinCost > 0 && (
                <TouchableOpacity style={styles.buyMoreBtn} onPress={onBuyCoins} activeOpacity={0.7}>
                  <Text style={styles.buyMoreText}>Not enough coins — Tap to buy more</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.dark.card,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 12, paddingBottom: 36, paddingHorizontal: 16,
    maxHeight: '55%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.dark.border, alignSelf: 'center', marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 14, paddingHorizontal: 4,
  },
  title: { fontSize: 18, fontWeight: '800', color: '#FFF' },
  coinBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.dark.cardAlt, paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: colors.status.premium + '30',
  },
  coinIcon: { fontSize: 14 },
  coinText: { fontSize: 14, fontWeight: '700', color: colors.status.premium },

  tabs: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: 8, borderRadius: 12, backgroundColor: colors.dark.cardAlt,
  },
  tabActive: { backgroundColor: colors.primary.royal },
  tabText: { fontSize: 11, fontWeight: '600', color: colors.dark.textMuted },
  tabTextActive: { color: '#FFF' },

  giftScroll: { paddingBottom: 8, gap: 10 },
  giftCard: {
    width: 84, alignItems: 'center', padding: 12,
    backgroundColor: colors.dark.cardAlt, borderRadius: 14,
    borderWidth: 2, borderColor: 'transparent',
  },
  giftCardSelected: { borderColor: colors.status.premium },
  giftEmoji: { fontSize: 32, marginBottom: 6 },
  giftName: { fontSize: 10, fontWeight: '600', color: colors.dark.textSecondary, textAlign: 'center' },
  giftCostRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  coinMini: { fontSize: 10 },
  giftCost: { fontSize: 12, fontWeight: '800', color: colors.status.premium },
  giftFreeLabel: { fontSize: 10, fontWeight: '800', color: colors.status.success, marginTop: 4 },

  sendSection: { marginTop: 12 },
  quantityRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12,
  },
  quantityLabel: { fontSize: 13, fontWeight: '600', color: colors.dark.textSecondary, marginRight: 4 },
  qBtn: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10,
    backgroundColor: colors.dark.cardAlt,
  },
  qBtnActive: { backgroundColor: colors.primary.royal },
  qBtnText: { fontSize: 13, fontWeight: '700', color: colors.dark.textMuted },
  qBtnTextActive: { color: '#FFF' },

  sendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.status.premium, paddingVertical: 14, borderRadius: 14,
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendEmoji: { fontSize: 20 },
  sendBtnText: { fontSize: 16, fontWeight: '800', color: '#FFF' },

  buyMoreBtn: {
    alignItems: 'center', marginTop: 10, paddingVertical: 8,
  },
  buyMoreText: { fontSize: 13, fontWeight: '600', color: colors.primary.royal },
});
