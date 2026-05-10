import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, layout, pulseverse, gradients, semantic } from '@/theme';

type Props = {
  visible: boolean;
  variant: 'success' | 'pending' | 'error';
  title: string;
  message?: string;
  primaryLabel?: string;
  onPrimary?: () => void | Promise<void>;
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Optional third action (e.g. open My Borders after purchase). */
  tertiaryLabel?: string;
  onTertiary?: () => void;
  onClose: () => void;
};

export function ShopResultModal({
  visible,
  variant,
  title,
  message,
  primaryLabel,
  onPrimary,
  secondaryLabel = 'Close',
  onSecondary,
  tertiaryLabel,
  onTertiary,
  onClose,
}: Props) {
  const icon =
    variant === 'success' ? 'checkmark-circle' : variant === 'pending' ? 'sync-outline' : 'alert-circle';
  const iconColor =
    variant === 'success' ? '#4ADE80' : variant === 'pending' ? semantic.warning : semantic.danger;
  const accentColors =
    variant === 'success'
      ? (['rgba(74,222,128,0.4)', 'rgba(34,211,238,0.2)'] as const)
      : variant === 'pending'
        ? (['rgba(251,191,36,0.45)', 'rgba(56,189,248,0.18)'] as const)
        : (['rgba(251,113,133,0.45)', 'rgba(99,102,241,0.18)'] as const);

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.fill} onPress={variant === 'pending' ? undefined : onClose}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={32} tint="dark" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.androidDim]} />
        )}
        <View style={styles.center} pointerEvents="box-none">
          <Pressable onPress={(e) => e.stopPropagation()} style={styles.cardOuter}>
            <LinearGradient colors={accentColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cardGlow}>
              <View style={styles.cardInner}>
                {variant === 'pending' ? (
                  <>
                    <ActivityIndicator size="large" color={pulseverse.electric} style={{ marginBottom: 14 }} />
                    <Text style={styles.pendingHint}>Securing your purchase…</Text>
                  </>
                ) : (
                  <View style={[styles.iconWrap, { borderColor: iconColor + '44' }]}>
                    <Ionicons name={icon} size={40} color={iconColor} />
                  </View>
                )}
                <Text style={styles.title}>{title}</Text>
                {message ? <Text style={styles.body}>{message}</Text> : null}
                {primaryLabel && onPrimary ? (
                  <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={() => void onPrimary()}
                    activeOpacity={0.88}
                  >
                    <LinearGradient
                      colors={[...gradients.ctaSheet]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.primaryGrad}
                    >
                      <Text style={styles.primaryBtnText}>{primaryLabel}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={onSecondary ?? onClose}
                  activeOpacity={0.88}
                >
                  <Text style={styles.secondaryBtnText}>{secondaryLabel}</Text>
                </TouchableOpacity>
                {tertiaryLabel && onTertiary ? (
                  <TouchableOpacity style={styles.tertiaryBtn} onPress={onTertiary} activeOpacity={0.88}>
                    <Text style={styles.tertiaryBtnText}>{tertiaryLabel}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </LinearGradient>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  androidDim: { backgroundColor: semantic.modalScrim },
  center: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    paddingHorizontal: layout.screenPadding,
  },
  cardOuter: {
    borderRadius: borderRadius.sheet,
    overflow: 'hidden',
  },
  cardGlow: {
    padding: 2,
    borderRadius: borderRadius.sheet,
  },
  cardInner: {
    backgroundColor: 'rgba(12,20,36,0.94)',
    borderRadius: borderRadius.xl,
    paddingVertical: 26,
    paddingHorizontal: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  pendingHint: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.dark.textMuted,
    marginBottom: 4,
  },
  title: {
    fontSize: 19,
    fontWeight: '900',
    color: colors.dark.text,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  body: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 21,
    color: colors.dark.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  primaryBtn: {
    marginTop: 22,
    alignSelf: 'stretch',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  primaryGrad: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryBtnText: { fontSize: 15, fontWeight: '900', color: pulseverse.onElectric },
  secondaryBtn: {
    marginTop: 12,
    alignSelf: 'stretch',
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryBtnText: { fontSize: 14, fontWeight: '700', color: colors.dark.textMuted },
  tertiaryBtn: {
    marginTop: 8,
    alignSelf: 'stretch',
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.35)',
  },
  tertiaryBtnText: { fontSize: 14, fontWeight: '800', color: pulseverse.electric },
});
