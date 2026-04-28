import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import { StackScreenHeader } from '@/components/ui/StackScreenHeader';
import { borderRadius, colors, layout, spacing, typography, shadows } from '@/theme';
import { STREAM_CATEGORIES } from '@/constants/streamCategories';
import { streamsLiveService } from '@/services/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { isFeatureEnabled } from '@/lib/featureFlags';
import type { StreamCategory } from '@/types';

export default function GoLiveScreen() {
  if (!isFeatureEnabled('liveStreaming')) {
    return <Redirect href="/(tabs)/feed" />;
  }

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const showToast = useToast((s) => s.show);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<StreamCategory>('shift-talk');
  const [tags, setTags] = useState('');
  const [creating, setCreating] = useState(false);
  const [facing, setFacing] = useState<CameraType>('front');

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const parsedTags = tags
    .split(',')
    .map((t) => t.trim().replace(/^#/, ''))
    .filter(Boolean)
    .slice(0, 8);

  const handleStartStream = async () => {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Give your stream a title so viewers know what to expect.');
      return;
    }
    if (!user?.id) {
      showToast('Sign in to go live.', 'info');
      return;
    }

    setCreating(true);
    try {
      const stream = await streamsLiveService.createStream({
        hostId: user.id,
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        tags: parsedTags,
        // thumbnailUrl will be filled in by the video provider when integrated;
        // until then, the host avatar is a sensible placeholder for discovery.
        thumbnailUrl: profile?.avatarUrl || undefined,
      });

      if (!stream) {
        showToast('Couldn\u2019t start your stream. Try again.', 'error');
        return;
      }

      // Success — jump into the viewer room as the host.
      router.replace(`/live/${stream.id}` as any);
    } catch (err) {
      if (__DEV__) console.warn('[go-live]', err);
      showToast('Something went wrong. Try again.', 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      <StackScreenHeader
        insetTop={insets.top}
        title="Go Live"
        onPressLeft={() => router.back()}
        leftIcon="close"
        leftAccessibilityLabel="Close"
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ────────── Camera preview ────────── */}
        <View style={styles.previewCard}>
          {!permission ? (
            <View style={styles.cameraPreview}>
              <ActivityIndicator color={colors.primary.teal} />
            </View>
          ) : !permission.granted ? (
            <View style={styles.cameraPreview}>
              <Ionicons name="videocam-off-outline" size={40} color={colors.dark.textMuted} />
              <Text style={styles.previewText}>Camera access needed</Text>
              <TouchableOpacity
                style={styles.permBtn}
                onPress={requestPermission}
                activeOpacity={0.85}
              >
                <Text style={styles.permBtnText}>Grant access</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <CameraView
                ref={cameraRef}
                style={styles.cameraPreview}
                facing={facing}
                mode="video"
              />
              <TouchableOpacity
                style={styles.flipBtn}
                onPress={() =>
                  setFacing((f) => (f === 'front' ? 'back' : 'front'))
                }
                activeOpacity={0.8}
              >
                <Ionicons name="camera-reverse-outline" size={18} color={colors.dark.text} />
              </TouchableOpacity>
            </>
          )}
        </View>

        <Text style={styles.label}>Stream Title</Text>
        <TextInput
          style={styles.input}
          placeholder="What are you streaming about?"
          placeholderTextColor={colors.dark.textMuted}
          value={title}
          onChangeText={setTitle}
          maxLength={100}
        />
        <Text style={styles.charCount}>{title.length}/100</Text>

        <Text style={styles.label}>Description (optional)</Text>
        <TextInput
          style={[styles.input, styles.inputMulti]}
          placeholder="Tell viewers what to expect..."
          placeholderTextColor={colors.dark.textMuted}
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={300}
        />

        <Text style={styles.label}>Category</Text>
        <View style={styles.catGrid}>
          {STREAM_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={[styles.catPill, category === cat.key && styles.catPillActive]}
              onPress={() => setCategory(cat.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={cat.icon as any}
                size={16}
                color={category === cat.key ? colors.primary.teal : colors.dark.textMuted}
              />
              <Text style={[styles.catText, category === cat.key && styles.catTextActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Tags</Text>
        <TextInput
          style={styles.input}
          placeholder="nightshift, icu, studywithme"
          placeholderTextColor={colors.dark.textMuted}
          value={tags}
          onChangeText={setTags}
        />
        <Text style={styles.hint}>Separate with commas. Helps viewers find your stream.</Text>

        <TouchableOpacity
          style={[styles.startBtn, creating && styles.startBtnBusy]}
          onPress={handleStartStream}
          activeOpacity={0.85}
          disabled={creating}
        >
          {creating ? (
            <ActivityIndicator color={colors.dark.text} />
          ) : (
            <>
              <View style={styles.startDot} />
              <Text style={styles.startText}>Start Streaming</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Video broadcast is connected through our partner provider (coming in the next release).
          Your stream settings, chat, gifts, and audience will be fully live the moment you start.
        </Text>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  scroll: { paddingHorizontal: layout.screenPadding },
  bottomSpacer: { height: spacing['3xl'] },

  previewCard: {
    marginTop: spacing.xl,
    marginBottom: spacing['2xl'],
    borderRadius: borderRadius.card,
    overflow: 'hidden',
    backgroundColor: colors.dark.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.dark.border,
    ...shadows.card,
  },
  cameraPreview: {
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#000',
  },
  previewText: { ...typography.body, fontSize: 14, color: colors.dark.textMuted },
  permBtn: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.button,
    backgroundColor: colors.primary.teal + '20',
    borderWidth: 1,
    borderColor: colors.primary.teal + '55',
  },
  permBtnText: {
    ...typography.button,
    fontSize: 13,
    color: colors.primary.teal,
  },
  flipBtn: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,28,48,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },

  label: {
    ...typography.label,
    color: colors.dark.textSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  input: {
    backgroundColor: colors.dark.card,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.dark.text,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.dark.border,
  },
  inputMulti: { height: 80, textAlignVertical: 'top' },
  charCount: {
    ...typography.caption,
    color: colors.dark.textMuted,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  hint: { ...typography.bodySmall, color: colors.dark.textMuted, marginTop: spacing.xs },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    backgroundColor: colors.dark.card,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.dark.border,
  },
  catPillActive: {
    backgroundColor: colors.primary.teal + '18',
    borderColor: colors.primary.teal,
  },
  catText: { fontSize: 13, fontWeight: '600', color: colors.dark.textMuted },
  catTextActive: { color: colors.primary.teal },

  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.status.error,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    marginTop: spacing['3xl'],
    ...shadows.card,
  },
  startBtnBusy: { opacity: 0.7 },
  startDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.dark.text,
  },
  startText: { ...typography.button, fontSize: 16, fontWeight: '800', color: colors.dark.text },

  disclaimer: {
    ...typography.bodySmall,
    color: colors.dark.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 18,
  },
});
