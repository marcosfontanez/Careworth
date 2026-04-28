import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import type { StreamGiftLeaderboard } from '@/types';

const RANK_EMOJIS = ['👑', '🥈', '🥉'];
const RANK_COLORS = [colors.status.premium, '#94A3B8', '#CD7F32'];

interface Props {
  visible: boolean;
  leaderboard: StreamGiftLeaderboard[];
  onClose: () => void;
}

export function GiftLeaderboard({ visible, leaderboard, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <Ionicons name="trophy" size={20} color={colors.status.premium} />
            <Text style={styles.title}>Gift Leaderboard</Text>
          </View>

          {leaderboard.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="gift-outline" size={32} color={colors.dark.textMuted} />
              <Text style={styles.emptyText}>No gifts yet — be the first!</Text>
            </View>
          ) : (
            <FlatList
              data={leaderboard}
              keyExtractor={(item) => item.userId}
              renderItem={({ item, index }) => (
                <View style={[styles.row, index < 3 && styles.rowTop]}>
                  <View style={[styles.rankBadge, { backgroundColor: index < 3 ? RANK_COLORS[index] + '20' : colors.dark.cardAlt }]}>
                    {index < 3 ? (
                      <Text style={styles.rankEmoji}>{RANK_EMOJIS[index]}</Text>
                    ) : (
                      <Text style={styles.rankNum}>#{item.rank}</Text>
                    )}
                  </View>

                  <View style={styles.avatarWrap}>
                    {item.avatarUrl ? (
                      <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatar, styles.avatarPlaceholder]}>
                        <Ionicons name="person" size={16} color={colors.dark.textMuted} />
                      </View>
                    )}
                  </View>

                  <View style={styles.info}>
                    <Text style={styles.name} numberOfLines={1}>{item.displayName}</Text>
                    <Text style={styles.giftCount}>{item.giftCount} gifts</Text>
                  </View>

                  <View style={styles.coinCol}>
                    <Ionicons name="logo-bitcoin" size={14} color={colors.status.premium} />
                    <Text style={[styles.coinAmount, index === 0 && styles.coinAmountGold]}>
                      {item.totalCoins.toLocaleString()}
                    </Text>
                  </View>
                </View>
              )}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function MiniLeaderboard({ top3 }: { top3: StreamGiftLeaderboard[] }) {
  if (top3.length === 0) return null;

  return (
    <View style={styles.mini}>
      {top3.map((item, i) => (
        <View key={item.userId} style={styles.miniItem}>
          <Text style={styles.miniEmoji}>{RANK_EMOJIS[i] ?? `#${i + 1}`}</Text>
          <View style={styles.miniAvatarWrap}>
            {item.avatarUrl ? (
              <Image source={{ uri: item.avatarUrl }} style={styles.miniAvatar} />
            ) : (
              <View style={[styles.miniAvatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={10} color={colors.dark.textMuted} />
              </View>
            )}
          </View>
          <Text style={styles.miniName} numberOfLines={1}>{item.displayName.slice(0, 8)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.dark.card,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 12, paddingBottom: 36, maxHeight: '60%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.dark.border, alignSelf: 'center', marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: '800', color: '#FFF' },

  list: { paddingHorizontal: 16, gap: 6 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.dark.cardAlt, borderRadius: 12, padding: 12,
  },
  rowTop: { borderWidth: 1, borderColor: colors.status.premium + '20' },
  rankBadge: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  rankEmoji: { fontSize: 18 },
  rankNum: { fontSize: 12, fontWeight: '800', color: colors.dark.textMuted },
  avatarWrap: {},
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarPlaceholder: {
    backgroundColor: colors.dark.card, alignItems: 'center', justifyContent: 'center',
  },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  giftCount: { fontSize: 11, color: colors.dark.textMuted, marginTop: 1 },
  coinCol: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  coinIcon: { fontSize: 12 },
  coinAmount: { fontSize: 14, fontWeight: '800', color: colors.dark.textSecondary },
  coinAmountGold: { color: colors.status.premium },

  empty: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyEmoji: { fontSize: 40 },
  emptyText: { fontSize: 14, color: colors.dark.textMuted },

  // Mini inline leaderboard
  mini: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 16,
  },
  miniItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  miniEmoji: { fontSize: 12 },
  miniAvatarWrap: {},
  miniAvatar: { width: 20, height: 20, borderRadius: 10 },
  miniName: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
});
