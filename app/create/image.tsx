import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Image, Dimensions,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '@/theme';
import { AccentComposerFrame, AccentCharCount } from '@/components/ui/AccentComposerFrame';
import { useAuth } from '@/contexts/AuthContext';
import { storageService } from '@/lib/storage';
import { postsService } from '@/services/supabase';
import { SuccessAnimation } from '@/components/ui/SuccessAnimation';
import { useToast } from '@/components/ui/Toast';
import { saveDraft, loadDraft, clearDraft, type DraftData } from '@/lib/drafts';
import { subscribeComposerDraftFlush } from '@/lib/draftAppStateFlush';
import type { MediaAsset } from '@/lib/media';
import { analytics } from '@/lib/analytics';
import { queryClient } from '@/lib/queryClient';
import { invalidatePostRelatedQueries } from '@/lib/invalidatePostQueries';
import { communityKeys } from '@/lib/queryKeys';
import { checkRateLimit } from '@/lib/rateLimit';
import { scanForPhi, highestSeverity } from '@/lib/phiGuardrail';
import { loadBrandKit, saveBrandKit, type BrandKit, withAlpha } from '@/lib/brandKit';
import { tintForUri, type PaletteKey } from '@/lib/colorAnalysis';
import { MOOD_PRESETS, type MoodPreset, type MoodPresetId } from '@/lib/moodPresets';
import { appendHashtag } from '@/lib/hashtagStudio';
import { parseHashtagsFromText, syncHashtagsToString, HASHTAG_MAX } from '@/lib/hashtags';
import { HashtagInput } from '@/components/create/HashtagInput';
import type { SeriesSelection } from '@/lib/seriesMode';
import { PHOTO_FRAMES, type PhotoFrameId } from '@/lib/photoFrames';

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
import { PreviewOnlyCallout } from '@/components/create/PreviewOnlyCallout';

const SCREEN_W = Dimensions.get('window').width;
const SLIDE_W = SCREEN_W - 32;
const MAX_IMAGES = 10;

const PHOTO_LAYOUT_IDS = new Set<string>(['carousel', 'filmstrip', 'grid2', 'stack', 'row3']);
const PHOTO_FRAME_IDS = new Set<string>(PHOTO_FRAMES.map((f) => f.id));
const MOOD_IDS = new Set<string>(MOOD_PRESETS.map((p) => p.id));

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
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ communityId?: string; communityName?: string; communitySlug?: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const toast = useToast();
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
  /** Avoid autosave / clearDraft races before `loadDraft('image')` finishes. */
  const [draftBootstrapped, setDraftBootstrapped] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    loadBrandKit(user.id).then(setBrandKit);
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;
    setDraftBootstrapped(false);
    (async () => {
      const draft = await loadDraft('image');
      if (cancelled) return;
      if (draft) {
        let restoredCaption = draft.caption ?? '';
        const legacyHeadline = draft.headline?.trim();
        if (legacyHeadline) {
          restoredCaption = restoredCaption.trim()
            ? `${legacyHeadline}\n\n${restoredCaption.trim()}`
            : legacyHeadline;
        }
        setCaption(restoredCaption);
        setHashtags(draft.hashtags ?? '');
        setOverlayLine(draft.overlayLine ?? '');
        if (draft.mediaUris?.length) {
          setImages(
            draft.mediaUris.map((uri: string, i: number) => ({
              uri,
              type: 'image' as const,
              mimeType: 'image/jpeg',
              fileName: `draft_${i}.jpg`,
            })),
          );
        }
        if (draft.seriesSelection?.seriesId) setSeriesSelection(draft.seriesSelection);
        if (draft.scheduledAtIso) {
          const d = new Date(draft.scheduledAtIso);
          if (!Number.isNaN(d.getTime())) setScheduledAt(d);
        }
        if (typeof draft.educationOnDraft === 'boolean') setEducationOn(draft.educationOnDraft);
        if (draft.educationCitationsDraft?.length) {
          setCitations(draft.educationCitationsDraft as EducationCitation[]);
        }
        const lp = draft.imageLayoutPreset;
        if (lp && PHOTO_LAYOUT_IDS.has(lp)) setLayoutPreset(lp as PhotoLayoutPreset);
        const pf = draft.imagePhotoFrame;
        if (pf && PHOTO_FRAME_IDS.has(pf)) setPhotoFrame(pf as PhotoFrameId);
        if (typeof draft.imageBrandBackdrop === 'boolean') setBrandBackdrop(draft.imageBrandBackdrop);
        if (typeof draft.imageColorMatch === 'boolean') setColorMatchOn(draft.imageColorMatch);
        if (typeof draft.imageBeforeAfter === 'boolean') setBeforeAfter(draft.imageBeforeAfter);
        const mid = draft.imageMoodId;
        if (mid === null) setMoodId(null);
        else if (typeof mid === 'string' && MOOD_IDS.has(mid)) setMoodId(mid as MoodPresetId);
        if (draft.privacyPhoto === 'public' || draft.privacyPhoto === 'followers') {
          setPrivacy(draft.privacyPhoto);
        }
        if (typeof draft.commentsOnPhoto === 'boolean') setCommentsOn(draft.commentsOnPhoto);
      }
      if (!cancelled) setDraftBootstrapped(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasComposerDraft = useMemo(() => {
    if (caption.trim() || hashtags.trim() || overlayLine.trim()) return true;
    if (images.length > 0) return true;
    if (privacy === 'followers') return true;
    if (!commentsOn) return true;
    if (scheduledAt) return true;
    if (educationOn || citations.length > 0) return true;
    if (seriesSelection) return true;
    if (layoutPreset !== 'carousel') return true;
    if (photoFrame !== 'none') return true;
    if (brandBackdrop) return true;
    if (colorMatchOn) return true;
    if (beforeAfter) return true;
    if (moodId) return true;
    return false;
  }, [
    caption,
    hashtags,
    overlayLine,
    images.length,
    privacy,
    commentsOn,
    scheduledAt,
    educationOn,
    citations.length,
    seriesSelection,
    layoutPreset,
    photoFrame,
    brandBackdrop,
    colorMatchOn,
    beforeAfter,
    moodId,
  ]);

  const unsavedLeaveRef = useRef(hasComposerDraft);
  unsavedLeaveRef.current = hasComposerDraft;

  const buildImageDraftData = useCallback((): DraftData => {
    const payload: DraftData = {
      caption,
      hashtags,
      overlayLine,
      mediaUris: images.length > 0 ? images.map((m) => m.uri) : undefined,
      seriesSelection: seriesSelection ?? undefined,
      privacyPhoto: privacy,
      commentsOnPhoto: commentsOn,
      educationOnDraft: educationOn,
      imageLayoutPreset: layoutPreset,
      imagePhotoFrame: photoFrame,
      imageBrandBackdrop: brandBackdrop,
      imageColorMatch: colorMatchOn,
      imageBeforeAfter: beforeAfter,
      imageMoodId: moodId,
    };
    if (scheduledAt) payload.scheduledAtIso = scheduledAt.toISOString();
    if (citations.length > 0) payload.educationCitationsDraft = citations;
    return payload;
  }, [
    caption,
    hashtags,
    overlayLine,
    images,
    seriesSelection,
    privacy,
    commentsOn,
    scheduledAt,
    educationOn,
    citations,
    layoutPreset,
    photoFrame,
    brandBackdrop,
    colorMatchOn,
    beforeAfter,
    moodId,
  ]);

  useEffect(() => {
    if (!draftBootstrapped) return;
    if (!hasComposerDraft) {
      void clearDraft('image');
      return;
    }
    saveDraft('image', buildImageDraftData());
  }, [draftBootstrapped, hasComposerDraft, buildImageDraftData]);

  useEffect(() => {
    return subscribeComposerDraftFlush(() => {
      if (!draftBootstrapped || !hasComposerDraft) return null;
      return { ready: true, type: 'image', data: buildImageDraftData() };
    });
  }, [draftBootstrapped, hasComposerDraft, buildImageDraftData]);

  useEffect(() => {
    if (!draftBootstrapped) return;
    const sub = navigation.addListener('beforeRemove', (e) => {
      if (posting || showSuccess) return;
      if (!unsavedLeaveRef.current) return;
      e.preventDefault();
      Alert.alert(
        'Leave composer?',
        'You have unsaved work (photos, caption, or other edits). Discard and leave?',
        [
          { text: 'Keep editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              void clearDraft('image');
              navigation.dispatch(e.data.action);
            },
          },
        ],
      );
    });
    return sub;
  }, [navigation, draftBootstrapped, posting, showSuccess]);

  const phiFindings = useMemo(
    () => scanForPhi(caption, overlayLine, hashtags),
    [caption, overlayLine, hashtags],
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
    if (!caption.trim() && images.length === 0) {
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

    if (!checkRateLimit('post')) return;

    if (!user) {
      toast.show('Not signed in', 'error');
      return;
    }

    setPosting(true);
    try {
      let tags = parseHashtagsFromText(hashtags);
      let cap = caption.trim();

      const citeBlock =
        educationOn && citations.length > 0 ? buildSourcesBlock(citations.slice(0, 5)) : '';
      /** On-photo sticker uses `video_overlay_text` in feed — keep out of caption (WYSIWYG). */
      let composed = cap;
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
        video_overlay_text: overlayLine.trim() ? overlayLine.trim().slice(0, 80) : undefined,
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
        comments_disabled: !commentsOn || undefined,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      analytics.track('post_created', { type: mediaUrl ? 'image' : 'text' });
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

  const canPost = caption.trim().length > 0 || images.length > 0;
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
        message={scheduledAt ? 'Scheduled!' : 'Posted!'}
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
            <PreviewOnlyCallout
              title="Preview only — feed shows plain photos"
              body="Frames, layout guides, color-match tints, and brand backdrop are composer previews. Followers see standard carousel images until feed rendering adds these treatments."
            />
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

        {/* Beta-stability cleanup (Creator Hub audit issue #3): the previous
            "Creator tools" panel surfaced Edit brand kit, Brand tint, Mood
            presets, Auto color match, Photo frames, and Before/After. Smoke
            tests called the section "cluttered/jumbled" and the visual polish
            tools weren't fully wired through to the published post. We removed
            the polish controls for beta and kept only the publishing controls
            (PHI safety banner, Education citations, Series, Schedule). The
            unused state + modal stay in place so they can be re-introduced
            behind a flag once the polish pipeline is QA'd end-to-end. */}
        <View style={styles.proPanel}>
          <Text style={styles.proLabel}>Publish settings</Text>
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
          <AccentComposerFrame
            accentColor={colors.primary.teal}
            hint="On-photo sticker (optional)"
            compact
            noShadow
            footer={
              <AccentCharCount
                length={overlayLine.length}
                max={80}
                accentColor={colors.primary.teal}
                warnWithin={12}
                hideWhenEmpty={false}
              />
            }
          >
            <TextInput
              style={styles.inputPlain}
              value={overlayLine}
              onChangeText={setOverlayLine}
              placeholder="Shows on the preview — also added when you post"
              placeholderTextColor={colors.dark.textMuted}
              editable={!posting}
              maxLength={80}
            />
          </AccentComposerFrame>
        </View>

        <View style={styles.fieldGroup}>
          <AccentComposerFrame accentColor={colors.primary.teal} hint="Caption" noShadow>
            <TextInput
              style={styles.captionPlain}
              value={caption}
              onChangeText={setCaption}
              placeholder="Describe your photo..."
              placeholderTextColor={colors.dark.textMuted}
              multiline
              editable={!posting}
            />
          </AccentComposerFrame>
        </View>

        <View style={styles.fieldGroup}>
          {/* Hashtag composer (Creator Hub audit issue #8). Caps at 5,
              suggests tags from `public.search_hashtags` RPC, dedups,
              normalizes. Derives string[] from the persisted-as-string
              `hashtags` field so draft persistence + PHI scan are unchanged. */}
          <HashtagInput
            value={parseHashtagsFromText(hashtags)}
            onChange={(next) => setHashtags(syncHashtagsToString(next))}
            disabled={posting}
            maxTags={HASHTAG_MAX}
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
  proTruthHint: { fontSize: 11, lineHeight: 15, color: colors.dark.textMuted, marginBottom: 6 },
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
  inputPlain: {
    paddingHorizontal: 6,
    paddingVertical: 8,
    fontSize: 15,
    color: colors.dark.text,
  },
  captionPlain: {
    paddingHorizontal: 6,
    paddingVertical: 8,
    fontSize: 15,
    color: colors.dark.text,
    minHeight: 110,
    textAlignVertical: 'top',
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
