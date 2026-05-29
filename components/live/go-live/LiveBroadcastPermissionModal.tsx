import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { borderRadius, colors, pulseverse, shadows, spacing, typography } from '@/theme';
import {
  missingPermissionLabel,
  type LiveBroadcastPermissionKind,
} from '@/lib/live/liveBroadcastPermissions';

type Props = {
  visible: boolean;
  missing: LiveBroadcastPermissionKind[];
  blocked: LiveBroadcastPermissionKind[];
  requesting?: boolean;
  onGrantAccess: () => void;
  onOpenSettings: () => void;
  onCancel: () => void;
};

export function LiveBroadcastPermissionModal({
  visible,
  missing,
  blocked,
  requesting = false,
  onGrantAccess,
  onOpenSettings,
  onCancel,
}: Props) {
  const showSettings = blocked.length > 0;
  const missingLabel = missingPermissionLabel(missing.length ? missing : ['camera', 'microphone']);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.cardWrap} onPress={(e) => e.stopPropagation()}>
          <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFillObject} />
          <LinearGradient
            colors={['rgba(12,18,32,0.94)', 'rgba(18,26,44,0.98)']}
            style={StyleSheet.absoluteFillObject}
          />
          <LinearGradient
            colors={['rgba(34,211,238,0.35)', 'rgba(56,189,248,0.08)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.accentStripe}
          />

          <View style={styles.iconRow}>
            <View style={[styles.iconOrb, missing.includes('camera') && styles.iconOrbWarn]}>
              <Ionicons name="videocam-outline" size={22} color={pulseverse.electricSoft} />
            </View>
            <View style={[styles.iconOrb, missing.includes('microphone') && styles.iconOrbWarn]}>
              <Ionicons name="mic-outline" size={22} color={pulseverse.electricSoft} />
            </View>
          </View>

          <Text style={styles.title}>Camera & microphone needed</Text>
          <Text style={styles.body}>
            PulseVerse needs camera and microphone access to start a live stream.
          </Text>
          <Text style={styles.missingLine}>
            Missing: <Text style={styles.missingStrong}>{missingLabel}</Text>
          </Text>
          {showSettings ? (
            <Text style={styles.settingsHint}>
              Access was blocked in your phone settings. Open Settings, find PulseVerse, and turn on{' '}
              {missingLabel}.
            </Text>
          ) : (
            <Text style={styles.settingsHint}>Tap Grant Access to allow PulseVerse to use your camera and mic.</Text>
          )}

          <View style={styles.actions}>
            {showSettings ? (
              <TouchableOpacity style={styles.primaryBtn} onPress={onOpenSettings} activeOpacity={0.88}>
                <Ionicons name="settings-outline" size={18} color={pulseverse.onElectric} />
                <Text style={styles.primaryBtnTxt}>Open Settings</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.primaryBtn, requesting && styles.btnDisabled]}
                onPress={onGrantAccess}
                disabled={requesting}
                activeOpacity={0.88}
              >
                <Ionicons name="shield-checkmark-outline" size={18} color={pulseverse.onElectric} />
                <Text style={styles.primaryBtnTxt}>{requesting ? 'Requesting…' : 'Grant Access'}</Text>
              </TouchableOpacity>
            )}
            {!showSettings ? (
              <TouchableOpacity style={styles.secondaryBtn} onPress={onOpenSettings} activeOpacity={0.88}>
                <Text style={styles.secondaryBtnTxt}>Open Settings</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={styles.ghostBtn} onPress={onCancel} activeOpacity={0.88}>
              <Text style={styles.ghostBtnTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5,8,14,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  cardWrap: {
    width: '100%',
    maxWidth: 380,
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.22)',
    overflow: 'hidden',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    ...shadows.card,
  },
  accentStripe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  iconRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  iconOrb: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,28,48,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
  },
  iconOrbWarn: {
    borderColor: 'rgba(251,191,36,0.55)',
    backgroundColor: 'rgba(127,29,29,0.18)',
  },
  title: {
    ...typography.h3,
    fontSize: 20,
    color: colors.dark.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  body: {
    ...typography.body,
    color: colors.dark.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  missingLine: {
    marginTop: spacing.md,
    ...typography.bodySmall,
    color: colors.dark.textMuted,
    textAlign: 'center',
  },
  missingStrong: {
    color: pulseverse.electricSoft,
    fontWeight: '800',
  },
  settingsHint: {
    marginTop: spacing.sm,
    ...typography.bodySmall,
    color: colors.dark.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  actions: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: pulseverse.electric,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    ...shadows.ctaSoft,
  },
  primaryBtnTxt: {
    ...typography.button,
    fontWeight: '800',
    color: pulseverse.onElectric,
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.35)',
    backgroundColor: 'rgba(15,28,48,0.55)',
  },
  secondaryBtnTxt: {
    ...typography.button,
    fontWeight: '700',
    color: pulseverse.electricSoft,
  },
  ghostBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  ghostBtnTxt: {
    ...typography.button,
    color: colors.dark.textMuted,
    fontWeight: '600',
  },
  btnDisabled: { opacity: 0.65 },
});
