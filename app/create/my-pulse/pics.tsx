import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Image } from 'expo-image';
import { Redirect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useAppStore } from '@/store/useAppStore';
import { profileUpdatesService } from '@/services/profileUpdates';
import { useToast } from '@/components/ui/Toast';
import { MentionAutocomplete } from '@/components/ui/MentionAutocomplete';
import { storageService } from '@/lib/storage';
import { colors, borderRadius, typography, shadows } from '@/theme';
import { profileUpdateKeys } from '@/lib/queryKeys';

const MAX_PICS = 4;

interface LocalAsset {
  uri: string;
  mimeType: string;
  fileName: string;
  /** Set after the asset has been uploaded to Supabase storage. */
  publicUrl?: string;
  uploading?: boolean;
  error?: boolean;
}

/**
 * Pics composer — photo-first My Pulse entry.
 *
 * Supports up to 4 images (single or multiple), with an optional caption.
 * Each picked asset uploads in the background via {@link storageService};
 * the "Add" button stays disabled until every selected asset has a public
 * URL so we never persist a half-uploaded post.
 */
export default function MyPulsePicsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const showToast = useToast((s) => s.show);
  const { profile } = useAuth();
  const storeUser = useAppStore((s) => s.currentUser);
  const user = profile ?? storeUser;

  const [caption, setCaption] = useState('');
  const [assets, setAssets] = useState<LocalAsset[]>([]);

  const uploadedUrls = useMemo(
    () => assets.map((a) => a.publicUrl).filter((u): u is string => !!u),
    [assets],
  );

  const uploading = assets.some((a) => a.uploading);
  const canSubmit = uploadedUrls.length > 0 && !uploading;

  const uploadAsset = useCallback(
    async (asset: LocalAsset) => {
      if (!user?.id) return;
      setAssets((prev) =>
        prev.map((a) =>
          a.uri === asset.uri
            ? { ...a, uploading: true, error: false }
            : a,
        ),
      );
      try {
        const url = await storageService.uploadPostMedia(user.id, {
          uri: asset.uri,
          type: asset.mimeType,
          name: asset.fileName,
        });
        setAssets((prev) =>
          prev.map((a) =>
            a.uri === asset.uri
              ? { ...a, publicUrl: url, uploading: false }
              : a,
          ),
        );
      } catch (e) {
        console.warn('Pics upload failed', e);
        setAssets((prev) =>
          prev.map((a) =>
            a.uri === asset.uri
              ? { ...a, uploading: false, error: true }
              : a,
          ),
        );
        showToast('Upload failed — tap retry', 'error');
      }
    },
    [user?.id, showToast],
  );

  const pickImages = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showToast('Photo library access needed', 'error');
      return;
    }

    const remaining = MAX_PICS - assets.length;
    if (remaining <= 0) {
      showToast(`Max ${MAX_PICS} photos per update`, 'info');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: remaining > 1,
      selectionLimit: remaining,
      quality: 0.85,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets?.length) return;

    Haptics.selectionAsync().catch(() => undefined);

    const next: LocalAsset[] = result.assets.map((a) => {
      const ext = (a.uri.split('.').pop() ?? 'jpg').toLowerCase();
      const mime = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
      return {
        uri: a.uri,
        mimeType: mime,
        fileName: `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`,
      };
    });

    setAssets((prev) => [...prev, ...next].slice(0, MAX_PICS));
    for (const a of next) void uploadAsset(a);
  }, [assets.length, uploadAsset, showToast]);

  const takePhoto = useCallback(async () => {
    if (assets.length >= MAX_PICS) {
      showToast(`Max ${MAX_PICS} photos per update`, 'info');
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showToast('Camera access needed', 'error');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const a = result.assets[0];
    const ext = (a.uri.split('.').pop() ?? 'jpg').toLowerCase();
    const asset: LocalAsset = {
      uri: a.uri,
      mimeType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
      fileName: `${Date.now()}.${ext}`,
    };
    setAssets((prev) => [...prev, asset].slice(0, MAX_PICS));
    void uploadAsset(asset);
  }, [assets.length, uploadAsset, showToast]);

  const removeAsset = useCallback((uri: string) => {
    setAssets((prev) => prev.filter((a) => a.uri !== uri));
  }, []);

  const retryAsset = useCallback(
    (asset: LocalAsset) => {
      void uploadAsset(asset);
    },
    [uploadAsset],
  );

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not signed in');
      if (uploadedUrls.length === 0) throw new Error('No photos uploaded');
      const body = caption.trim();
      return profileUpdatesService.add(user.id, {
        type: 'pics',
        content: body || 'Photo update',
        previewText: body ? body.slice(0, 160) : undefined,
        picsUrls: uploadedUrls,
        mediaThumb: uploadedUrls[0],
      });
    },
    onSuccess: async () => {
      if (user?.id)
        await queryClient.invalidateQueries({
          queryKey: profileUpdateKeys.forUser(user.id),
        });
      showToast('Photos added to My Pulse', 'success');
      router.replace('/(tabs)/my-pulse');
    },
    onError: (e: any) => {
      showToast(e?.message ?? 'Could not post', 'error');
    },
  });

  const submit = useCallback(() => {
    if (!canSubmit) return;
    mutation.mutate();
  }, [canSubmit, mutation]);

  if (!user) return <Redirect href="/auth/login" />;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pics</Text>
        <TouchableOpacity
          onPress={submit}
          disabled={!canSubmit || mutation.isPending}
          hitSlop={6}
        >
          {mutation.isPending ? (
            <ActivityIndicator size="small" color={colors.primary.teal} />
          ) : (
            <Text
              style={[
                styles.postBtn,
                (!canSubmit || mutation.isPending) && styles.postBtnOff,
              ]}
            >
              Add
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.hint}>
          Share a photo moment — single shot or up to {MAX_PICS} together. Great
          for day-to-day culture and shift life.
        </Text>

        <View style={styles.mediaActions}>
          <TouchableOpacity
            style={styles.pickBtn}
            onPress={pickImages}
            activeOpacity={0.85}
            disabled={assets.length >= MAX_PICS}
          >
            <Ionicons
              name="images-outline"
              size={18}
              color={colors.primary.gold}
            />
            <Text style={styles.pickBtnText}>
              {assets.length === 0 ? 'Choose photos' : 'Add more'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.pickBtn}
            onPress={takePhoto}
            activeOpacity={0.85}
            disabled={assets.length >= MAX_PICS}
          >
            <Ionicons
              name="camera-outline"
              size={18}
              color={colors.primary.teal}
            />
            <Text style={[styles.pickBtnText, { color: colors.primary.teal }]}>
              Camera
            </Text>
          </TouchableOpacity>
        </View>

        {assets.length > 0 ? (
          <View style={styles.grid}>
            {assets.map((a) => (
              <View key={a.uri} style={styles.tile}>
                <Image source={{ uri: a.uri }} style={styles.tileImg} />
                {a.uploading ? (
                  <View style={styles.tileOverlay}>
                    <ActivityIndicator color="#FFF" />
                  </View>
                ) : a.error ? (
                  <TouchableOpacity
                    style={styles.tileOverlay}
                    onPress={() => retryAsset(a)}
                  >
                    <Ionicons name="refresh" size={22} color="#FFF" />
                    <Text style={styles.tileRetry}>Retry</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => removeAsset(a.uri)}
                  hitSlop={6}
                  accessibilityLabel="Remove photo"
                >
                  <Ionicons name="close" size={16} color="#FFF" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyPreview}>
            <Ionicons
              name="images-outline"
              size={36}
              color={colors.dark.textMuted}
            />
            <Text style={styles.emptyText}>No photos yet</Text>
            <Text style={styles.emptySub}>
              Pick up to {MAX_PICS} photos or use the camera.
            </Text>
          </View>
        )}

        <Text style={styles.fieldLbl}>Caption (optional)</Text>
        <MentionAutocomplete
          style={styles.captionInput}
          placeholder="Morning walk — tag friends with @"
          placeholderTextColor={colors.dark.textMuted}
          value={caption}
          onChangeText={setCaption}
          multiline
          textAlignVertical="top"
          maxLength={200}
        />
        <Text style={styles.count}>{caption.length}/200</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.bg,
    paddingHorizontal: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerTitle: { ...typography.h3, color: colors.dark.text },
  postBtn: { fontSize: 16, fontWeight: '800', color: colors.primary.teal },
  postBtnOff: { opacity: 0.35 },
  scroll: { paddingBottom: 64 },
  hint: {
    fontSize: 13,
    color: colors.dark.textSecondary,
    lineHeight: 19,
    marginBottom: 14,
  },
  mediaActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  pickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: borderRadius.button,
    borderWidth: 1,
    borderColor: colors.dark.borderSubtle,
    backgroundColor: colors.dark.card,
    ...shadows.subtle,
  },
  pickBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: colors.primary.gold,
    letterSpacing: 0.1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  tile: {
    width: '48.5%',
    aspectRatio: 1,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: colors.dark.cardAlt,
  },
  tileImg: { width: '100%', height: '100%' },
  tileOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.48)',
    gap: 4,
  },
  tileRetry: { fontSize: 11.5, fontWeight: '700', color: '#FFF' },
  removeBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  emptyPreview: {
    marginBottom: 18,
    paddingVertical: 32,
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.dark.borderSubtle,
    backgroundColor: colors.dark.card,
    gap: 6,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.dark.text,
    marginTop: 6,
  },
  emptySub: {
    fontSize: 12,
    color: colors.dark.textMuted,
    textAlign: 'center',
  },
  fieldLbl: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.dark.textMuted,
    marginBottom: 8,
  },
  captionInput: {
    minHeight: 96,
    fontSize: 15,
    lineHeight: 22,
    color: colors.dark.text,
    backgroundColor: colors.dark.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: 14,
  },
  count: {
    alignSelf: 'flex-end',
    marginTop: 8,
    fontSize: 12,
    color: colors.dark.textMuted,
  },
});
