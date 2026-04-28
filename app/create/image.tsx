import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Image, FlatList, Dimensions,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '@/theme';
import { useAuth } from '@/contexts/AuthContext';
import { storageService } from '@/lib/storage';
import { postsService } from '@/services/supabase';
import { checkRateLimit } from '@/lib/rateLimit';
import { analytics } from '@/lib/analytics';
import { SuccessAnimation } from '@/components/ui/SuccessAnimation';
import { useToast } from '@/components/ui/Toast';
import { saveDraft, loadDraft, clearDraft } from '@/lib/drafts';
import type { MediaAsset } from '@/lib/media';
import { queryClient } from '@/lib/queryClient';
import { invalidatePostRelatedQueries } from '@/lib/invalidatePostQueries';

const SCREEN_W = Dimensions.get('window').width;
const MAX_IMAGES = 10;

export default function CreateImageScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ communityId?: string; communityName?: string; communitySlug?: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const toast = useToast();
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [images, setImages] = useState<MediaAsset[]>([]);
  const [posting, setPosting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [community, setCommunity] = useState(params.communityName ?? '');
  const [communityId] = useState(params.communityId ?? '');
  const [privacy, setPrivacy] = useState<'public' | 'followers'>('public');
  const [commentsOn, setCommentsOn] = useState(true);

  useEffect(() => {
    loadDraft('image').then((draft) => {
      if (draft) {
        setCaption(draft.caption ?? '');
        setHashtags(draft.hashtags ?? '');
        if (draft.mediaUris?.length) {
          setImages(draft.mediaUris.map((uri: string, i: number) => ({
            uri, type: 'image' as const, mimeType: 'image/jpeg',
            fileName: `draft_${i}.jpg`,
          })));
        }
      }
    });
  }, []);

  useEffect(() => {
    if (caption || hashtags || images.length > 0) {
      saveDraft('image', {
        caption, hashtags,
        mediaUris: images.map((m) => m.uri),
      });
    }
  }, [caption, hashtags, images]);

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      toast.show('Photo library access needed', 'error');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES - images.length,
      quality: 0.85,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets?.length) {
      const newAssets: MediaAsset[] = result.assets.map((a) => {
        const ext = a.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
        return {
          uri: a.uri,
          type: 'image' as const,
          mimeType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
          fileName: `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`,
          width: a.width,
          height: a.height,
        };
      });
      setImages((prev) => [...prev, ...newAssets].slice(0, MAX_IMAGES));
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      toast.show('Camera access needed', 'error');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.85,
    });

    if (!result.canceled && result.assets?.[0]) {
      const a = result.assets[0];
      const ext = a.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      setImages((prev) => [...prev, {
        uri: a.uri, type: 'image' as const,
        mimeType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
        fileName: `${Date.now()}.${ext}`,
        width: a.width, height: a.height,
      }].slice(0, MAX_IMAGES));
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    if (activeIndex >= images.length - 1 && activeIndex > 0) setActiveIndex(activeIndex - 1);
  };

  const handlePost = async () => {
    if (!caption.trim() && images.length === 0) {
      toast.show('Add a photo or caption', 'error');
      return;
    }

    setPosting(true);
    try {
      let mediaUrl: string | undefined;

      if (user && images.length > 0) {
        try {
          console.log('Starting image upload...', images[0].fileName);
          const uploadPromise = storageService.uploadPostMedia(user.id, {
            uri: images[0].uri,
            type: images[0].mimeType,
            name: images[0].fileName,
          });
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Upload timed out after 30s')), 30000)
          );
          mediaUrl = await Promise.race([uploadPromise, timeoutPromise]);
          console.log('Upload succeeded:', mediaUrl);
        } catch (uploadErr: any) {
          console.warn('Upload failed:', uploadErr?.message);
          toast.show('Image upload failed — posting as text', 'info');
        }
      }

      if (!user) {
        toast.show('Not signed in', 'error');
        setPosting(false);
        return;
      }

      const tags = hashtags.split(/[\s,]+/).filter((t) => t.startsWith('#')).map((t) => t.slice(1));
      await postsService.create({
        creator_id: user.id,
        type: mediaUrl ? 'image' : 'text',
        caption: caption.trim(),
        media_url: mediaUrl,
        hashtags: tags.length > 0 ? tags : undefined,
        communities: communityId ? [communityId] : undefined,
        feed_type_eligible: communityId ? ['community'] : ['forYou', 'following'],
        privacy_mode: privacy,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      clearDraft('image');
      await invalidatePostRelatedQueries(queryClient, { creatorId: user.id });
      if (communityId) {
        queryClient.invalidateQueries({ queryKey: ['communityPosts', communityId] });
      }
      setShowSuccess(true);
    } catch (err: any) {
      console.error('Post failed:', err);
      toast.show(err.message ?? 'Something went wrong', 'error');
    } finally {
      setPosting(false);
    }
  };

  const canPost = caption.trim().length > 0 || images.length > 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <SuccessAnimation
        visible={showSuccess}
        message="Posted!"
        onComplete={() => {
          if (params.communitySlug) {
            router.replace(`/communities/${params.communitySlug}`);
          } else {
            router.replace('/(tabs)/feed');
          }
        }}
      />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Photo Post</Text>
        <TouchableOpacity onPress={handlePost} activeOpacity={0.7} disabled={posting || !canPost}>
          {posting ? (
            <ActivityIndicator size="small" color={colors.primary.teal} />
          ) : (
            <LinearGradient
              colors={canPost ? [colors.primary.teal, colors.primary.royal] : [colors.dark.cardAlt, colors.dark.cardAlt]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.postBtnGradient}
            >
              <Text style={[styles.postBtnText, !canPost && { opacity: 0.4 }]}>Post</Text>
            </LinearGradient>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {images.length > 0 ? (
          <View>
            <FlatList
              data={images}
              keyExtractor={(_, i) => i.toString()}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / (SCREEN_W - 32));
                setActiveIndex(idx);
              }}
              renderItem={({ item, index }) => (
                <View style={styles.imageSlide}>
                  <Image source={{ uri: item.uri }} style={styles.slideImage} resizeMode="cover" />
                  <TouchableOpacity style={styles.removeBtn} onPress={() => removeImage(index)}>
                    <Ionicons name="close-circle" size={26} color={colors.onVideo.primary} />
                  </TouchableOpacity>
                </View>
              )}
            />
            {images.length > 1 && (
              <View style={styles.dots}>
                {images.map((_, i) => (
                  <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
                ))}
              </View>
            )}
            <Text style={styles.imageCount}>{images.length}/{MAX_IMAGES} photos</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.emptyPreview} onPress={pickImages} activeOpacity={0.8}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="image" size={48} color={colors.dark.textMuted} />
            </View>
            <Text style={styles.emptyText}>Tap to select photos</Text>
            <Text style={styles.emptySubtext}>Up to {MAX_IMAGES} images per post</Text>
          </TouchableOpacity>
        )}

        <View style={styles.mediaActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={pickImages} disabled={images.length >= MAX_IMAGES} activeOpacity={0.8}>
            <LinearGradient
              colors={['#8B5CF620', '#7C3AED08']}
              style={styles.actionBtnInner}
            >
              <View style={styles.actionIconWrap}>
                <Ionicons
                  name="images-outline"
                  size={22}
                  color={images.length >= MAX_IMAGES ? colors.dark.textMuted : '#8B5CF6'}
                />
              </View>
              <Text style={[styles.actionText, { color: images.length >= MAX_IMAGES ? colors.dark.textMuted : '#8B5CF6' }]}>
                {images.length === 0 ? 'Gallery' : 'Add More'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={takePhoto} disabled={images.length >= MAX_IMAGES} activeOpacity={0.8}>
            <LinearGradient
              colors={['#14B8A620', '#0D948808']}
              style={styles.actionBtnInner}
            >
              <View style={styles.actionIconWrap}>
                <Ionicons
                  name="camera-outline"
                  size={22}
                  color={images.length >= MAX_IMAGES ? colors.dark.textMuted : colors.primary.teal}
                />
              </View>
              <Text style={[styles.actionText, { color: images.length >= MAX_IMAGES ? colors.dark.textMuted : colors.primary.teal }]}>
                Camera
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Caption</Text>
          <TextInput
            style={styles.captionInput}
            value={caption}
            onChangeText={setCaption}
            placeholder="Describe your photo..."
            placeholderTextColor={colors.dark.textMuted}
            multiline
            editable={!posting}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Hashtags</Text>
          <TextInput
            style={styles.input}
            value={hashtags}
            onChangeText={setHashtags}
            placeholder="#NurseLife #ICU #WorkDay"
            placeholderTextColor={colors.dark.textMuted}
            editable={!posting}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Community (optional)</Text>
          <TextInput
            style={styles.input}
            value={community}
            onChangeText={setCommunity}
            placeholder="Post to a community..."
            placeholderTextColor={colors.dark.textMuted}
            editable={!posting}
          />
        </View>

        <View style={styles.optionsRow}>
          <TouchableOpacity
            style={[styles.optionChip, privacy === 'followers' && styles.optionChipActive]}
            activeOpacity={0.7}
            onPress={() => setPrivacy(privacy === 'public' ? 'followers' : 'public')}
          >
            <Ionicons
              name={privacy === 'public' ? 'earth-outline' : 'people-outline'}
              size={18}
              color={privacy === 'public' ? colors.dark.textSecondary : colors.primary.teal}
            />
            <Text style={[styles.optionText, privacy === 'followers' && styles.optionTextActive]}>
              {privacy === 'public' ? 'Public' : 'Followers'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.optionChip, !commentsOn && styles.optionChipActive]}
            activeOpacity={0.7}
            onPress={() => setCommentsOn(!commentsOn)}
          >
            <Ionicons
              name={commentsOn ? 'chatbubble-outline' : 'chatbubble-ellipses-outline'}
              size={18}
              color={commentsOn ? colors.dark.textSecondary : '#EF4444'}
            />
            <Text style={[styles.optionText, !commentsOn && { color: '#EF4444' }]}>
              {commentsOn ? 'Comments On' : 'Comments Off'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: colors.dark.border,
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.dark.text },
  postBtnGradient: {
    paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20,
  },
  postBtnText: { fontSize: 14, fontWeight: '800', color: colors.dark.text },
  content: { padding: 16, gap: 20, paddingBottom: 100 },

  imageSlide: {
    width: SCREEN_W - 32, height: 280, borderRadius: 20, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.dark.border,
  },
  slideImage: { width: '100%', height: '100%' },
  removeBtn: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 13,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.dark.textMuted },
  dotActive: { backgroundColor: colors.primary.teal, width: 20 },
  imageCount: { fontSize: 12, color: colors.dark.textMuted, textAlign: 'center', marginTop: 6, fontWeight: '600' },

  emptyPreview: {
    height: 220, borderRadius: 20, overflow: 'hidden',
    backgroundColor: colors.dark.card, borderWidth: 1, borderColor: colors.dark.border,
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  emptyIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.dark.cardAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyText: { fontSize: 15, color: colors.dark.textSecondary, fontWeight: '600' },
  emptySubtext: { fontSize: 12, color: colors.dark.textMuted },

  mediaActions: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1 },
  actionBtnInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 14,
    borderWidth: 1, borderColor: colors.dark.border,
  },
  actionIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  actionText: { fontSize: 14, fontWeight: '700' },

  fieldGroup: { gap: 8 },
  label: { fontSize: 13, fontWeight: '700', color: colors.dark.textSecondary, marginLeft: 4 },
  captionInput: {
    backgroundColor: colors.dark.card, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 15,
    color: colors.dark.text, height: 110, textAlignVertical: 'top',
    borderWidth: 1, borderColor: colors.dark.border,
  },
  input: {
    backgroundColor: colors.dark.card, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 15,
    color: colors.dark.text, borderWidth: 1, borderColor: colors.dark.border,
  },

  optionsRow: { flexDirection: 'row', gap: 10 },
  optionChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.dark.card, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: colors.dark.border,
  },
  optionText: { fontSize: 13, fontWeight: '600', color: colors.dark.textSecondary },
  optionChipActive: { borderColor: colors.primary.teal },
  optionTextActive: { color: colors.primary.teal },
});
