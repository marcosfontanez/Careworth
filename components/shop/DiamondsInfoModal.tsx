import React from 'react';
import { Modal, View, Text, StyleSheet, ScrollView, Pressable, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, borderRadius, pulseverse, typography } from '@/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function DiamondsInfoModal({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <LinearGradient colors={['#0F172A', '#020617']} style={StyleSheet.absoluteFill} />
          <View style={styles.sheetInner}>
            <View style={styles.dragHint} />
            <View style={styles.headerRow}>
              <View style={styles.titleRow}>
                <Ionicons name="diamond-outline" size={26} color={colors.primary.gold} />
                <Text style={styles.title}>Diamonds</Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={26} color={colors.dark.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
              <Text style={styles.lede}>
                Diamonds are creator earnings. When someone spends Sparks on you—during live, on a post, or from your
                profile—that support becomes Diamonds in your balance.
              </Text>

              <Text style={styles.sectionLabel}>How it works</Text>
              <Text style={styles.p}>
                Sparks are bought with money and spent as gifts. When you receive those gifts, you earn Diamonds
                (minus platform share where applicable). Some amounts may show as pending for a short hold, then
                move to available.
              </Text>

              <Text style={styles.sectionLabel}>Cash out</Text>
              <Text style={styles.p}>
                Cash out will use your available Diamonds when we enable payouts. You’ll complete identity verification
                (KYC) before your first withdrawal—that keeps the community safe and meets banking rules.
              </Text>

              <Text style={styles.sectionLabel}>Need help?</Text>
              <Text style={styles.pMuted}>
                Balances update from the server after gifts are processed. If something looks off, pull to refresh on
                the shop screen or check back shortly.
              </Text>
            </ScrollView>

            <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.9}>
              <Text style={styles.doneBtnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.62)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    overflow: 'hidden',
    maxHeight: Platform.OS === 'web' ? '85%' : '88%',
    borderWidth: 1,
    borderColor: 'rgba(212,166,58,0.22)',
  },
  sheetInner: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  dragHint: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(148,163,184,0.35)',
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: {
    ...typography.h4,
    fontSize: 22,
    fontWeight: '900',
    color: colors.dark.text,
    letterSpacing: -0.3,
  },
  body: { paddingBottom: 16 },
  lede: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    color: colors.dark.textSecondary,
    marginBottom: 22,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.primary.gold,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 4,
  },
  p: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    color: colors.dark.textSecondary,
    marginBottom: 16,
  },
  pMuted: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
    color: colors.dark.textMuted,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  doneBtn: {
    marginTop: 8,
    paddingVertical: 16,
    borderRadius: borderRadius.lg,
    backgroundColor: pulseverse.electric,
    alignItems: 'center',
  },
  doneBtnText: { fontSize: 16, fontWeight: '900', color: pulseverse.onElectric },
});
