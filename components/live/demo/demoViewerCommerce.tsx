import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Pressable,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, typography, pulseverse } from '@/theme';
import type { LiveProduct } from '@/types/liveHub';

const SCREEN_H = Dimensions.get('window').height;

export function DemoFlashDealBanner({ endsAt }: { endsAt: string }) {
  const [sec, setSec] = useState(0);
  useEffect(() => {
    const tick = () => {
      const ms = Math.max(0, new Date(endsAt).getTime() - Date.now());
      setSec(Math.floor(ms / 1000));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  const mm = String(Math.floor(sec / 60)).padStart(2, '0');
  const ss = String(sec % 60).padStart(2, '0');
  return (
    <View style={styles.flashBanner}>
      <Ionicons name="flash" size={14} color={colors.primary.gold} />
      <Text style={styles.flashTxt}>Live Deal Ends in {mm}:{ss}</Text>
    </View>
  );
}

export function DemoAffiliateDisclosurePill({ type }: { type: 'affiliate' | 'sponsored' }) {
  const label =
    type === 'affiliate' ? 'Host may earn commission' : 'Sponsored product';
  return (
    <View style={styles.disclosurePill}>
      <Ionicons name="shield-checkmark-outline" size={12} color={colors.dark.textSecondary} />
      <Text style={styles.disclosureTxt}>{label}</Text>
    </View>
  );
}

export function DemoSellerTrustRow() {
  return (
    <View style={styles.trustRow}>
      <Ionicons name="ribbon-outline" size={14} color={colors.primary.teal} />
      <Text style={styles.trustTxt}>Verified Seller · Approved Product</Text>
    </View>
  );
}

export function DemoPinnedProductRow({
  product,
  onOpen,
  onBag,
  onQuickAdd,
}: {
  product: LiveProduct;
  onOpen: () => void;
  onBag: () => void;
  onQuickAdd: () => void;
}) {
  return (
    <View style={styles.pinnedRow}>
      <View style={styles.pinnedCard}>
        <Pressable style={styles.pinnedMainPress} onPress={onOpen}>
          <Image source={{ uri: product.image }} style={styles.pinnedImg} contentFit="cover" />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.pinnedTitle} numberOfLines={1}>
              {product.title}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.pinnedPrice}>{product.liveDealPrice ?? product.price}</Text>
              {product.originalPrice ? (
                <Text style={styles.pinnedWas}>{product.originalPrice}</Text>
              ) : null}
            </View>
          </View>
        </Pressable>
        <View style={styles.pinnedActions}>
          <TouchableOpacity style={styles.quickAddBtn} onPress={onQuickAdd}>
            <Text style={styles.quickAddBtnTxt}>Add</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.buyBtn} onPress={onOpen}>
            <Text style={styles.buyBtnTxt}>View</Text>
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity style={styles.bagFab} onPress={onBag} accessibilityLabel="Open shop bag">
        <Ionicons name="bag-handle" size={22} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

export function DemoLiveProductTrayModal({
  visible,
  onClose,
  products,
  bottomInset,
  onQuickAdd,
  onViewProduct,
}: {
  visible: boolean;
  onClose: () => void;
  products: LiveProduct[];
  bottomInset: number;
  onQuickAdd: (item: LiveProduct) => void;
  onViewProduct: (item: LiveProduct) => void | Promise<void>;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={[styles.traySheet, { paddingBottom: bottomInset + 16 }]}>
          <Text style={styles.trayTitle}>Products in this live</Text>
          <FlatList
            data={products.length ? products : []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ gap: 12 }}
            renderItem={({ item }) => (
              <View style={styles.trayCard}>
                <Image source={{ uri: item.image }} style={styles.trayImg} contentFit="cover" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.trayName}>{item.title}</Text>
                  <Text style={styles.trayPrice}>{item.price}</Text>
                  <Text style={styles.traySeller}>{item.sellerName}</Text>
                </View>
                <View style={styles.trayActions}>
                  <TouchableOpacity
                    style={styles.trayQuickAdd}
                    onPress={() => onQuickAdd(item)}
                  >
                    <Text style={styles.trayQuickAddTxt}>Add</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.trayCta}
                    onPress={() => void onViewProduct(item)}
                  >
                    <Text style={styles.trayCtaTxt}>View</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.trayEmpty}>No products — run `liveShopService` mock seed.</Text>
            }
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  disclosurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.65)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
  },
  disclosureTxt: { fontSize: 11, fontWeight: '600', color: colors.dark.textSecondary },

  flashBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(251,191,36,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.35)',
  },
  flashTxt: { fontSize: 13, fontWeight: '800', color: colors.primary.gold },

  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    marginTop: 8,
  },
  trustTxt: { fontSize: 12, fontWeight: '600', color: colors.dark.textSecondary },

  pinnedRow: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, marginTop: 10, gap: 10 },
  pinnedCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(15,23,42,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.25)',
  },
  pinnedMainPress: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  pinnedActions: { flexDirection: 'column', gap: 6, justifyContent: 'center' },
  quickAddBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: pulseverse.electric + '88',
    backgroundColor: 'rgba(56,189,248,0.12)',
    alignItems: 'center',
  },
  quickAddBtnTxt: { fontSize: 11, fontWeight: '800', color: pulseverse.electric },
  pinnedImg: { width: 52, height: 52, borderRadius: 12 },
  pinnedTitle: { fontSize: 14, fontWeight: '800', color: '#FFF' },
  pinnedPrice: { fontSize: 15, fontWeight: '900', color: colors.primary.gold },
  pinnedWas: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.dark.textMuted,
    textDecorationLine: 'line-through',
  },
  buyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: pulseverse.electric,
  },
  buyBtnTxt: { fontSize: 12, fontWeight: '900', color: colors.dark.bg },
  bagFab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },

  traySheet: {
    maxHeight: SCREEN_H * 0.55,
    backgroundColor: colors.dark.card,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.15)',
  },
  trayTitle: { ...typography.h3, fontSize: 17, color: colors.dark.text, marginBottom: 12 },
  trayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.12)',
    backgroundColor: 'rgba(15,23,42,0.55)',
  },
  trayImg: { width: 56, height: 56, borderRadius: 12 },
  trayName: { fontSize: 15, fontWeight: '800', color: colors.dark.text },
  trayPrice: { fontSize: 14, fontWeight: '800', color: colors.primary.gold, marginTop: 2 },
  traySeller: { fontSize: 12, color: colors.dark.textMuted, marginTop: 2 },
  trayActions: { flexDirection: 'column', gap: 8, alignItems: 'stretch', minWidth: 72 },
  trayQuickAdd: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: pulseverse.electric + '66',
    backgroundColor: 'rgba(56,189,248,0.08)',
    alignItems: 'center',
  },
  trayQuickAddTxt: { fontSize: 11, fontWeight: '800', color: pulseverse.electric },
  trayCta: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: pulseverse.electric,
  },
  trayCtaTxt: { fontSize: 12, fontWeight: '900', color: colors.dark.bg },
  trayEmpty: { ...typography.caption, color: colors.dark.textMuted, textAlign: 'center', padding: 20 },
});
