import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Image, Dimensions,
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
import { SuccessAnimation } from '@/components/ui/SuccessAnimation';
import { useToast } from '@/components/ui/Toast';
import { saveDraft, loadDraft, clearDraft } from '@/lib/drafts';
import type { MediaAsset } from '@/lib/media';
import { queryClient } from '@/lib/queryClient';
import { invalidatePostRelatedQueries } from '@/lib/invalidatePostQueries';
import { communityKeys } from '@/lib/queryKeys';
import { scanForPhi, highestSeverity } from '@/lib/phiGuardrail';
import { loadBrandKit, saveBrandKit, type BrandKit, withAlpha } from '@/lib/brandKit';
import { tintForUri, type PaletteKey } from '@/lib/colorAnalysis';
import { type MoodPreset, type MoodPresetId } from '@/lib/moodPresets';
import { appendHashtag } from '@/lib/hashtagStudio';
import type { SeriesSelection } from '@/lib/seriesMode';
import type { PhotoFrameId } from '@/lib/photoFrames';

import { PHIGuardrailBanner } from '@/components/create/PHIGuardrailBanner';
import { EducationModeToggle, type EducationCitation } from '@/components/create/EducationModeToggle';
import { SeriesModePicker } from '@/components/create/SeriesModePicker';
import { SchedulePostPicker } from '@/components/create/SchedulePostPicker';
import { BrandKitEditor } from '@/components/create/BrandKitEditor';
import { CarouselColorMatch } from '@/components/create/CarouselColorMatch';
import { PhotoFramePicker } from '@/components/create/PhotoFramePicker';
import { PhotoFrameOverlay } from '@/components/create/PhotoFrameOverlay';
import { BeforeAfterPreview, BeforeAfterToggle } from '@/components/create/BeforeAfterEditor';
import { MoodPresetPicker } from '@/components/create/MoodPresetPicker';
import { SmartCoverHint } from '@/components/create/SmartCoverHint';
import { LayoutTemplatePicker, type PhotoLayoutPreset } from '@/components/create/LayoutTemplatePicker';

const SCREEN_W = Dimensions.get('window').width;
const SLIDE_W = SCREEN_W - 32;
const MAX_IMAGES = 10;

function buildSourcesBlock(citations: EducationCitation[]): string {
  if (citations.length === 0) return '';
  const lines = citations.map((c) => {
    const bits = [`· ${c.label}: ${c.url}`];
    if (c.doi?.trim()) bits.push(`  DOI ${c.doi.trim()}`);
    if (c.lastReviewed?.trim()) bits.push(`  Last reviewed: ${c.lastReviewed.trim()}`);
    return bits.join('\n');
  });
  return `\n\nSources\n${lines.join('\n')}`;
}

export default function CreateImageScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ communityId?: string; communityName?: string; communitySlug?: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const toast = useToast();
  const [headline, setHeadline] = useState('');
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [overlayLine, setOverlayLine] = useState('');
  const [images, setImages] = useState<MediaAsset[]>([]);
  const [posting, setPosting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [communityId] = useState(params.communityId ?? '');
  const [privacy, setPrivacy] = useState<'public' | 'followers'>('public');
  const [commentsOn, setCommentsOn] = useState(true);
  const carouselRef = useRef<ScrollView>(null);

  const [brandKit, setBrandKit] = useState<BrandKit | null>(null);
  const [brandKitOpen, setBrandKitOpen] = useState(false);
  const [colorMatchOn, setColorMatchOn] = useState(false);
  const [colorPalette, setColorPalette] = useState<PaletteKey>('brand');
  const [photoFrame, setPhotoFrame] = useState<PhotoFrameId>('none');
  const [moodId, setMoodId] = useState<MoodPresetId | null>(null);
  const [beforeAfter, setBeforeAfter] = useState(false);
  const [phiAck, setPhiAck] = useState(false);
  const [educationOn, setEducationOn] = useState(false);
  const [citations, setCitations] = useState<EducationCitation[]>([]);
  const [seriesSelection, setSeriesSelection] = useState<SeriesSelection | null>(null);
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);
  const [layoutPreset, setLayoutPreset] = useState<PhotoLayoutPreset>('carousel');
  const [brandBackdrop, setBrandBackdrop] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    loadBrandKit(user.id).then(setBrandKit);
  }, [user?.id]);

  useEffect(() => {
    loadDraft('image').then((draft) => {
      if (draft) {
        setHeadline((draft as { headline?: string }).headline ?? '');
        setCaption(draft.caption ?? '');
        setHashtags(draft.hashtags ?? '');
        setOverlayLine((draft as { overlayLine?: string }).overlayLine ?? '');
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
    if (caption || hashtags || images.length > 0 || headline || overlayLine) {
      saveDraft('image', {
        caption,
        hashtags,
        headline,
        overlayLine,
        mediaUris: images.map((m) => m.uri),
      });
    }
  }, [caption, hashtags, images, headline, overlayLine]);

  const phiFindings = useMemo(
    () => scanForPhi(caption, headline, overlayLine, hashtags),
    [caption, headline, overlayLine, hashtags],
  );
  const phiSev = highestSeverity(phiFindings);

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
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      setActiveIndex((ai) => {
        if (next.length === 0) return 0;
        if (index < ai) return ai - 1;
        if (index === ai) return Math.min(ai, next.length - 1);
        return ai;
      });
      return next;
    });
  };

  const moveImage = (from: number, delta: number) => {
    setImages((prev) => {
      const to = from + delta;
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [it] = next.splice(from, 1);
      next.splice(to, 0, it);
      setActiveIndex(to);
      requestAnimationFrame(() => {
        carouselRef.current?.scrollTo({ x: to * SLIDE_W, y: 0, animated: true });
      });
      return next;
    });
  };

  const smartCoverPick = () => {
    if (images.length < 2) return;
    let bestI = 0;
    let bestScore = -1;
    images.forEach((im, i) => {
      const w = im.width ?? 0;
      const h = im.height ?? 0;
      const score = w * h;
      if (score > bestScore) {
        bestScore = score;
        bestI = i;
      }
    });
    if (bestI === 0) {
      toast.show('Cover is already the highest-resolution photo', 'info');
      return;
    }
    moveImage(bestI, -bestI);
    toast.show('Moved best-resolution photo to cover', 'success');
  };

  const applyMood = (preset: MoodPreset | null) => {
    if (!preset) {
      setMoodId(null);
      return;
    }
    setMoodId(preset.id);
    preset.suggestedHashtags.forEach((t) => {
      setHashtags((h) => appendHashtag(h, t));
    });
  };

  const handlePost = async () => {
    if (!caption.trim() && images.length === 0 && !headline.trim()) {
      toast.show('Add a photo or caption', 'error');
      return;
    }

    if (phiFindings.length > 0 && !phiAck) {
      toast.show('Review the privacy banner and confirm before posting', 'error');
      return;
    }

    if (phiSev === 'high') {
      toast.show('High-risk PHI pattern — remove or reword before posting', 'error');
      return;
    }

    setPosting(true);
    try {
      if (!user) {
        toast.show('Not signed in', 'error');
        setPosting(false);
        return;
      }

      let tags = hashtags.split(/[\s,]+/).filter((t) => t.startsWith('#')).map((t) => t.slice(1));
      let cap = caption.trim();
      let head = headline.trim();
      let over = overlayLine.trim();

      const citeBlock =
        educationOn && citations.length > 0 ? buildSourcesBlock(citations.slice(0, 5)) : '';
      let composed = [head, over, cap].filter(Boolean).join('\n\n');
      if (beforeAfter && images.length >= 2) {
        composed = [composed, '📸 Before & After (swipe both in the carousel)'].filter(Boolean).join('\n\n');
      }
      composed = `${composed}${citeBlock}`.trim();

      let mediaUrl: string | undefined;
      const additionalUrls: string[] = [];

      if (images.length > 0) {
        const assets: MediaAsset[] = images;
        const uploadOne = async (asset: MediaAsset) => {
          const url = await storageService.uploadPostMedia(user.id!, {
            uri: asset.uri,
            type: asset.mimeType,
            name: asset.fileName ?? 'photo.jpg',
          });
          return url;
        };

        try {
          mediaUrl = await uploadOne(assets[0]!);
          for (let i = 1; i < assets.length; i += 1) {
            try {
              const u = await uploadOne(assets[i]!);
              if (u) additionalUrls.push(u);
            } catch {
              toast.show(`Extra photo ${i + 1} upload failed — skipped`, 'info');
            }
          }
        } catch (uploadErr: unknown) {
          console.warn('Upload failed:', uploadErr);
          toast.show('Image upload failed — posting as text', 'info');
        }
      }

      const scheduleIso = scheduledAt ? scheduledAt.toISOString() : null;

      await postsService.create({
        creator_id: user.id,
        type: mediaUrl ? 'image' : 'text',
        caption: composed,
        media_url: mediaUrl,
        additional_media: additionalUrls.length ? additionalUrls : undefined,
        hashtags: tags.length > 0 ? tags : undefined,
        communities: communityId ? [communityId] : undefined,
        feed_type_eligible: communityId ? ['community'] : ['forYou', 'following'],
        privacy_mode: privacy,
        is_education: educationOn || undefined,
        education_citations:
          educationOn && citations.length > 0
            ? citations.slice(0, 5).map((c) => ({
                label: c.label,
                url: c.url,
                ...(c.doi ? { doi: c.doi } : {}),
                ...(c.lastReviewed ? { last_reviewed: c.lastReviewed } : {}),
              }))
            : undefined,
        series_id: seriesSelection?.seriesId,
        series_part: seriesSelection?.seriesPart,
        series_total: seriesSelection?.seriesTotal,
        scheduled_at: scheduleIso,
        scheduled_status: scheduleIso ? 'scheduled' : 'live',
        mood_preset: moodId ?? undefined,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      clearDraft('image');
      await invalidatePostRelatedQueries(queryClient, { creatorId: user.id });
      if (communityId) {
        queryClient.invalidateQueries({ queryKey: communityKeys.postsAllViewers(communityId) });
      }
      setShowSuccess(true);
    } catch (err: unknown) {
      console.error('Post failed:', err);
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as Error).message) : 'Something went wrong';
      toast.show(msg, 'error');
    } finally {
      setPosting(false);
    }
  };

  const canPost = caption.trim().length > 0 || images.length > 0 || headline.trim().length > 0;
  const beforeAsset = images[0];
  const afterAsset = images[1];

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

      <BrandKitEditor
        visible={brandKitOpen}
        initial={brandKit ?? {}}
        onClose={() => setBrandKitOpen(false)}
        onSave={async (next) => {
          setBrandKit(next);
          if (user?.id) await saveBrandKit(user.id, next);
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

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
        {beforeAfter && beforeAsset && afterAsset ? (
          <View style={{ borderRadius: 12 }}>
            <BeforeAfterPreview before={beforeAsset} after={afterAsset} height={280} />
          </View>
        ) : images.length > 0 ? (
          <View style={{ borderRadius: 12 }}>
          <View
            style={[
              brandBackdrop && brandKit?.primary
                ? {
                    backgroundColor: withAlpha(brandKit.scrubs ?? brandKit.primary, 0.22),
                    borderRadius: 14,
                    padding: 8,
                  }
                : null,
            ]}
          >
            {layoutPreset === 'grid2' ? (
              <View style={{ width: SLIDE_W, alignSelf: 'center', marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' }}>
                  {images.slice(0, 4).map((item, index) => {
                    const cell = (SLIDE_W - 8) / 2;
                    const tint =
                      colorMatchOn && brandKit
                        ? withAlpha(brandKit.scrubs ?? brandKit.primary ?? '#14B8A6', 0.12)
                        : colorMatchOn
                          ? tintForUri(item.uri, colorPalette)
                          : undefined;
                    return (
                      <View
                        key={`${item.uri}|grid${index}`}
                        style={{
                          width: cell,
                          height: cell,
                          borderRadius: 12,
                          overflow: 'hidden',
                          backgroundColor: colors.dark.cardAlt,
                        }}
                      >
                        <Image source={{ uri: item.uri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                        {tint ? (
                          <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { backgroundColor: tint }]} />
                        ) : null}
                        {index === 0 ? <SmartCoverHint /> : null}
                      </View>
                    );
                  })}
                </View>
                {images.length > 4 ? (
                  <Text style={{ fontSize: 11, color: colors.dark.textMuted, marginTop: 8 }}>
                    +{images.length - 4} more photos follow in the posted carousel.
                  </Text>
                ) : null}
              </View>
            ) : layoutPreset === 'row3' ? (
              <View style={{ width: SLIDE_W, alignSelf: 'center', marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'space-between' }}>
                  {images.slice(0, 3).map((item, index) => {
                    const cell = (SLIDE_W - 12) / 3;
                    const tint =
                      colorMatchOn && brandKit
                        ? withAlpha(brandKit.scrubs ?? brandKit.primary ?? '#14B8A6', 0.12)
                        : colorMatchOn
                          ? tintForUri(item.uri, colorPalette)
                          : undefined;
                    return (
                      <View
                        key={`${item.uri}|row3${index}`}
                        style={{
                          width: cell,
                          height: cell * 1.2,
                          borderRadius: 12,
                          overflow: 'hidden',
                          backgroundColor: colors.dark.cardAlt,
                        }}
                      >
                        <Image source={{ uri: item.uri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                        {tint ? (
                          <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { backgroundColor: tint }]} />
                        ) : null}
                        {index === 0 ? <SmartCoverHint /> : null}
                      </View>
                    );
                  })}
                </View>
                {images.length > 3 ? (
                  <Text style={{ fontSize: 11, color: colors.dark.textMuted, marginTop: 8 }}>
                    +{images.length - 3} more photos follow in the posted carousel.
                  </Text>
                ) : null}
              </View>
            ) : (
            <ScrollView
              ref={carouselRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={{ width: SLIDE_W, alignSelf: 'center' }}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / SLIDE_W);
                setActiveIndex(idx);
              }}
            >
              {images.map((item, index) => {
                const tint =
                  colorMatchOn && brandKit
                    ? withAlpha(brandKit.scrubs ?? brandKit.primary ?? '#14B8A6', 0.12)
                    : colorMatchOn
                      ? tintForUri(item.uri, colorPalette)
                      : undefined;
                return (
                  <View key={`${item.uri}|${item.fileName ?? index}`} style={styles.imageSlide}>
                    <Image source={{ uri: item.uri }} style={styles.slideImage} resizeMode="cover" />
                    {tint ? (
                      <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { backgroundColor: tint }]} />
                    ) : null}
                    <PhotoFrameOverlay
                      frame={index === 0 ? photoFrame : 'none'}
                      caption={caption}
                      title={headline}
                    />
                    {index === 0 ? <SmartCoverHint /> : null}
                    {images.length > 1 && (
                      <View style={styles.reorderRow}>
                        <TouchableOpacity
                          style={[styles.reorderHit, index === 0 && styles.reorderHitDisabled]}
                          disabled={index === 0}
                          onPress={() => moveImage(index, -1)}
                          accessibilityLabel="Move photo earlier"
                        >
                          <Ionicons
                            name="chevron-back"
                            size={20}
                            color={index === 0 ? colors.dark.textMuted : colors.onVideo.primary}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.reorderHit, index === images.length - 1 && styles.reorderHitDisabled]}
                          disabled={index === images.length - 1}
                          onPress={() => moveImage(index, 1)}
                          accessibilityLabel="Move photo later"
                        >
                          <Ionicons
                            name="chevron-forward"
                            size={20}
                            color={index === images.length - 1 ? colors.dark.textMuted : colors.onVideo.primary}
                          />
                        </TouchableOpacity>
                      </View>
                    )}
                    <TouchableOpacity style={styles.removeBtn} onPress={() => removeImage(index)}>
                      <Ionicons name="close-circle" size={26} color={colors.onVideo.primary} />
                    </TouchableOpacity>
                    {overlayLine.trim() ? (
                      <View style={styles.stickerBar} pointerEvents="none">
                        <Text style={styles.stickerText}>{overlayLine.trim()}</Text>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </ScrollView>
            )}
            {layoutPreset !== 'grid2' && layoutPreset !== 'row3' && images.length > 1 && (
              <View style={styles.dots}>
                {images.map((_, i) => (
                  <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
                ))}
              </View>
            )}
            <Text style={styles.imageCount}>
              {images.length}/{MAX_IMAGES} photos{images.length > 1 ? ' · first is the cover' : ''}
            </Text>
            {images.length > 1 ? (
              <TouchableOpacity style={styles.smartCoverBtn} onPress={smartCoverPick} activeOpacity={0.85}>
                <Ionicons name="sparkles" size={16} color={colors.primary.teal} />
                <Text style={styles.smartCoverBtnText}>Smart cover — use highest-res photo first</Text>
              </TouchableOpacity>
            ) : null}
            <LayoutTemplatePicker value={layoutPreset} onChange={setLayoutPreset} />
          </View>
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

        <View style={styles.proPanel}>
          <Text style={styles.proLabel}>Creator tools</Text>
          <TouchableOpacity style={styles.toolLink} onPress={() => setBrandKitOpen(true)} activeOpacity={0.85}>
            <Ionicons name="color-wand" size={18} color={colors.primary.teal} />
            <Text style={styles.toolLinkText}>Edit brand kit (scrubs colors &amp; logo)</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.dark.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.toolLink}
            onPress={() => setBrandBackdrop(!brandBackdrop)}
            activeOpacity={0.85}
          >
            <Ionicons name="color-fill-outline" size={18} color={colors.primary.teal} />
            <Text style={styles.toolLinkText}>
              Brand tint behind carousel {brandBackdrop ? '(on)' : '(off)'}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.dark.textMuted} />
          </TouchableOpacity>
          <MoodPresetPicker
            selected={moodId}
            onSelect={(preset) => {
              if (!preset) setMoodId(null);
              else applyMood(preset);
            }}
          />
          <CarouselColorMatch
            enabled={colorMatchOn}
            palette={colorPalette}
            onToggle={setColorMatchOn}
            onPalette={setColorPalette}
          />
          <PhotoFramePicker selected={photoFrame} onSelect={setPhotoFrame} />
          <BeforeAfterToggle
            enabled={beforeAfter}
            onToggle={setBeforeAfter}
            hasTwoImages={images.length >= 2}
          />
          <View style={{ gap: 10 }}>
            <PHIGuardrailBanner findings={phiFindings} acknowledged={phiAck} onAcknowledge={() => setPhiAck(true)} />
            <EducationModeToggle
              enabled={educationOn}
              onToggle={setEducationOn}
              citations={citations}
              onChange={(next) => setCitations(next.slice(0, 5))}
            />
            <SeriesModePicker userId={user?.id ?? null} selection={seriesSelection} onChange={setSeriesSelection} />
            <SchedulePostPicker scheduledAt={scheduledAt} onChange={setScheduledAt} />
          </View>
        </View>

        <View style={styles.mediaActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={pickImages} disabled={images.length >= MAX_IMAGES} activeOpacity={0.8}>
            <LinearGradient colors={['#8B5CF620', '#7C3AED08']} style={styles.actionBtnInner}>
              <View style={styles.actionIconWrap}>
                <Ionicons name="images-outline" size={22} color={images.length >= MAX_IMAGES ? colors.dark.textMuted : '#8B5CF6'} />
              </View>
              <Text style={[styles.actionText, { color: images.length >= MAX_IMAGES ? colors.dark.textMuted : '#8B5CF6' }]}>
                {images.length === 0 ? 'Gallery' : 'Add More'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={takePhoto} disabled={images.length >= MAX_IMAGES} activeOpacity={0.8}>
            <LinearGradient colors={['#14B8A620', '#0D948808']} style={styles.actionBtnInner}>
              <View style={styles.actionIconWrap}>
                <Ionicons name="camera-outline" size={22} color={images.length >= MAX_IMAGES ? colors.dark.textMuted : colors.primary.teal} />
              </View>
              <Text style={[styles.actionText, { color: images.length >= MAX_IMAGES ? colors.dark.textMuted : colors.primary.teal }]}>
                Camera
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Headline (optional)</Text>
          <TextInput
            style={styles.input}
            value={headline}
            onChangeText={setHeadline}
            placeholder="Short punchy line above the caption"
            placeholderTextColor={colors.dark.textMuted}
            editable={!posting}
            maxLength={120}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>On-photo sticker text (optional)</Text>
          <TextInput
            style={styles.input}
            value={overlayLine}
            onChangeText={setOverlayLine}
            placeholder="Shows on the preview — also added when you post"
            placeholderTextColor={colors.dark.textMuted}
            editable={!posting}
            maxLength={80}
          />
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

  proPanel: {
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  proLabel: { fontSize: 14, fontWeight: '800', color: colors.dark.text },
  toolLink: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, paddingHorizontal: 10,
    borderRadius: 12, backgroundColor: colors.dark.cardAlt,
    borderWidth: 1, borderColor: colors.dark.border,
  },
  toolLinkText: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.dark.text },

  imageSlide: {
    width: SCREEN_W - 32, height: 280, borderRadius: 20, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.dark.border,
  },
  slideImage: { width: '100%', height: '100%' },
  removeBtn: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 13,
  },
  stickerBar: {
    position: 'absolute', bottom: 48, left: 12, right: 12, alignItems: 'center',
  },
  stickerText: {
    color: '#FFF', fontSize: 15, fontWeight: '900', textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.75)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  reorderRow: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  reorderHit: { padding: 6 },
  reorderHitDisabled: { opacity: 0.35 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.dark.textMuted },
  dotActive: { backgroundColor: colors.primary.teal, width: 20 },
  imageCount: { fontSize: 12, color: colors.dark.textMuted, textAlign: 'center', marginTop: 6, fontWeight: '600' },
  smartCoverBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 10, paddingVertical: 10, borderRadius: 12,
    backgroundColor: colors.primary.teal + '18', borderWidth: 1, borderColor: colors.primary.teal + '44',
  },
  smartCoverBtnText: { fontSize: 12, fontWeight: '800', color: colors.primary.teal },

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
