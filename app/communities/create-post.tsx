import React, { useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useQuery } from '@tanstack/react-query';
import { colors, borderRadius } from '@/theme';
import { useAuth } from '@/contexts/AuthContext';
import { storageService } from '@/lib/storage';
import { postsService, communitiesService } from '@/services/supabase';
import { profileUpdatesService } from '@/services/profileUpdates';
import { queryClient } from '@/lib/queryClient';
import { invalidatePostRelatedQueries } from '@/lib/invalidatePostQueries';
import { useToast } from '@/components/ui/Toast';
import { SuccessAnimation } from '@/components/ui/SuccessAnimation';
import { saveDraft, loadDraft, clearDraft } from '@/lib/drafts';
import { getCircleAccent } from '@/lib/circleAccents';
import {
  CirclePostTypeChips,
  type CirclePostType,
} from '@/components/circles/CirclePostTypeChips';
import {
  CircleSettingsCard,
  type CirclePostSettings,
} from '@/components/circles/CircleSettingsCard';
import { CircleContextFooter } from '@/components/circles/CircleContextFooter';

/** Draft slot reused by the circle composer (under @pulseverse_draft_circle). */
const DRAFT_TYPE = 'circle';

export default function CommunityCreatePostScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    communityId: string;
    communityName: string;
    communitySlug: string;
    intent?: string;
  }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const toast = useToast();

  const communityName = params.communityName ?? 'Community';
  const slug = (params.communitySlug ?? '').toLowerCase();
  const accent = useMemo(() => getCircleAccent(slug), [slug]);
  const initialType: CirclePostType = useMemo(() => {
    if (params.intent === 'meme') return 'meme';
    if (params.intent === 'thread') return 'thread';
    return slug === 'memes' || slug === 'funny-medical-memes' ? 'meme' : 'thread';
  }, [params.intent, slug]);

  const { data: community } = useQuery({
    queryKey: ['communityForCompose', params.communityId],
    queryFn: () => communitiesService.getById(params.communityId!),
    enabled: !!params.communityId,
    staleTime: 60_000,
  });

  const [postType, setPostType] = useState<CirclePostType>(initialType);
  const [body, setBody] = useState('');
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaKind, setMediaKind] = useState<'image' | 'video' | null>(null);
  const [posting, setPosting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [settings, setSettings] = useState<CirclePostSettings>({
    /* Default ON for memes/threads — the brief calls Share to My Pulse the
     * key bridge between the room and the user's profile. */
    shareToMyPulse: true,
    allowComments: true,
    pinToHighlights: false,
  });

  React.useEffect(() => {
    /** Hydrate any in-progress draft from disk so a closed-app interruption
     *  doesn't lose typing. Stored under DRAFT_TYPE='text' since the create
     *  flow ultimately produces text-or-image posts (video is out-of-scope
     *  for this composer). */
    (async () => {
      const draft = await loadDraft(DRAFT_TYPE);
      if (draft?.content) setBody(draft.content);
    })();
  }, []);

  React.useEffect(() => {
    /* Persist body so re-opens restore the in-progress text. */
    if (body.trim().length === 0) return;
    saveDraft(DRAFT_TYPE, { content: body, caption: body });
  }, [body]);

  const placeholder = postType === 'question'
    ? 'What do you want to ask the room?'
    : postType === 'thread'
      ? 'Start a discussion…'
      : postType === 'video'
        ? 'Add a caption for your video…'
        : 'What\u2019s worth sharing today?';

  const allowsMedia = postType === 'meme' || postType === 'video';

  const pickMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const wantVideos = postType === 'video';
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: wantVideos ? ['videos'] : ['images'],
      allowsEditing: !wantVideos,
      quality: 0.85,
      videoMaxDuration: 60,
    });
    if (!result.canceled && result.assets?.[0]) {
      setMediaUri(result.assets[0].uri);
      setMediaKind(wantVideos ? 'video' : 'image');
    }
  };

  const removeMedia = () => {
    setMediaUri(null);
    setMediaKind(null);
  };

  const onChangeSettings = (next: Partial<CirclePostSettings>) =>
    setSettings((prev) => ({ ...prev, ...next }));

  const handlePost = async () => {
    if (!body.trim() && !mediaUri) {
      toast.show('Add some content for your post', 'error');
      return;
    }
    if (!user) {
      toast.show('Not signed in', 'error');
      return;
    }

    setPosting(true);
    try {
      let mediaUrl: string | undefined;
      let postKind: 'image' | 'video' | 'text' = 'text';
      if (mediaUri) {
        try {
          const isVideo = mediaKind === 'video';
          mediaUrl = await storageService.uploadPostMedia(user.id, {
            uri: mediaUri,
            type: isVideo ? 'video/mp4' : 'image/jpeg',
            name: `community_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`,
          });
          postKind = isVideo ? 'video' : 'image';
        } catch {
          toast.show('Media upload failed — posting as text', 'info');
        }
      }

      /* Auto-tag with the post type so circle highlights / search can group
       * memes vs. questions vs. threads without storing a separate column. */
      const tags = [postType];

      const isConfessions = slug === 'confessions';

      const created = await postsService.create({
        creator_id: user.id,
        type: postKind,
        caption: body.trim(),
        media_url: mediaUrl,
        hashtags: tags,
        communities: params.communityId ? [params.communityId] : undefined,
        /* Circle posts stay in the community feed; if Share to My Pulse is
         * on, we mirror the row into profile_updates below so it surfaces
         * on the user's Pulse Page without duplicating it on the main For
         * You / Following feeds. */
        feed_type_eligible: ['community'],
        privacy_mode: 'public',
        is_anonymous: isConfessions,
      });

      /* My Pulse mirror — only when the user explicitly opted in.
       * Deliberately swallow errors so the post itself isn't lost if the
       * Pulse insert fails (the user can re-pin later from their profile). */
      if (settings.shareToMyPulse && created?.id) {
        try {
          await profileUpdatesService.add(user.id, {
            type: 'link_post',
            content: body.trim().slice(0, 180) || `New post in ${communityName}`,
            previewText: body.trim().slice(0, 140),
            linkedPostId: created.id,
            linkedCircleSlug: params.communitySlug,
          });
        } catch {
          /* Non-fatal: post still went through. */
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['communityPosts', params.communityId] }),
        invalidatePostRelatedQueries(queryClient, { creatorId: user.id }),
      ]);
      await clearDraft(DRAFT_TYPE);
      setShowSuccess(true);
    } catch (err: any) {
      toast.show(err.message ?? 'Failed to post', 'error');
    } finally {
      setPosting(false);
    }
  };

  const handleSaveDraft = async () => {
    await saveDraft(DRAFT_TYPE, { content: body, caption: body });
    toast.show('Draft saved', 'success');
    router.back();
  };

  const canPost = body.trim().length > 0 || !!mediaUri;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SuccessAnimation
        visible={showSuccess}
        message="Posted!"
        onComplete={() => {
          if (params.communitySlug) router.replace(`/communities/${params.communitySlug}`);
          else router.back();
        }}
      />

      {/* ============================ HEADER ============================
          Three-stop accent bleed (stronger at top, fades into the page)
          so the composer feels like an extension of the room banner —
          not a generic form screen. The "Posting in Circle" label is
          now a small accent-tinted pill so the room identity is the
          first thing the user reads above their typing. */}
      <LinearGradient
        colors={[`${accent.color}38`, `${accent.color}12`, 'transparent']}
        locations={[0, 0.6, 1]}
        style={[styles.header, { paddingTop: insets.top + 6 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} hitSlop={6}>
            <Ionicons name="arrow-back" size={22} color={colors.dark.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <View
              style={[
                styles.headerIcon,
                { backgroundColor: `${accent.color}26`, borderColor: `${accent.color}55` },
              ]}
            >
              <Text style={{ fontSize: 18 }}>{community?.icon ?? '💬'}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.headerTitle} numberOfLines={1}>{communityName}</Text>
              <View
                style={[
                  styles.postingPill,
                  { backgroundColor: `${accent.color}1A`, borderColor: `${accent.color}55` },
                ]}
              >
                <View style={[styles.headerDot, { backgroundColor: accent.color }]} />
                <Text style={[styles.postingPillText, { color: accent.color }]}>
                  Posting in Circle
                </Text>
              </View>
            </View>
          </View>
          <View style={{ width: 36 }} />
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollPad}
        keyboardShouldPersistTaps="handled"
      >
        {/* ===================== POST TYPE CHIPS ===================== */}
        <CirclePostTypeChips active={postType} accent={accent} onSelect={setPostType} />

        {/* ===================== MAIN COMPOSER ======================
            The composer is the hero of this screen — give it a quiet
            accent presence on the leading edge so it visually belongs to
            the room (not a generic dark card). The room's prompt sits
            above the input with a subtle accent dot, then the field
            with character count. Premium without being decorative. */}
        <View style={[styles.composer, { borderLeftColor: accent.color, borderLeftWidth: 3 }]}>
          <View style={styles.composerHintRow}>
            <View style={[styles.composerHintDot, { backgroundColor: accent.color }]} />
            <Text style={styles.composerHint}>{accent.composerPrompt}</Text>
          </View>
          <TextInput
            style={styles.composerInput}
            value={body}
            onChangeText={setBody}
            placeholder={placeholder}
            placeholderTextColor={colors.dark.textMuted}
            multiline
            maxLength={500}
            textAlignVertical="top"
          />
          <View style={styles.composerFooter}>
            {/* Char count is now a soft indicator that warms toward the
                accent as the user approaches the cap, instead of a flat
                grey number. Reads as part of the room's voice. */}
            <Text
              style={[
                styles.charCount,
                body.length > 400 && { color: accent.color, fontWeight: '700' },
              ]}
            >
              {body.length}/500
            </Text>
          </View>
        </View>

        {/* ====================== MEDIA TILES ======================= */}
        {allowsMedia && (
          <View style={styles.mediaTiles}>
            {mediaUri ? (
              <View style={styles.mediaTile}>
                <Image source={{ uri: mediaUri }} style={styles.mediaImg} contentFit="cover" />
                {mediaKind === 'video' && (
                  <View style={styles.playOverlay}>
                    <Ionicons name="play-circle" size={36} color="#FFFFFFE6" />
                  </View>
                )}
                <TouchableOpacity style={styles.removeBtn} onPress={removeMedia}>
                  <Ionicons name="close" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={[styles.mediaTile, styles.mediaTilePlaceholder]} />
            )}
            <TouchableOpacity
              style={[styles.mediaTile, styles.mediaAddTile]}
              onPress={pickMedia}
              activeOpacity={0.85}
            >
              <View style={styles.mediaAddIcon}>
                <Ionicons name="image" size={22} color={colors.dark.textMuted} />
                <View style={styles.mediaAddPlus}>
                  <Ionicons name="add" size={12} color="#FFF" />
                </View>
              </View>
              <Text style={styles.mediaAddText}>{mediaKind === 'video' || postType === 'video' ? 'Add Video' : 'Add Photo'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ====================== CONTENT TOOLS =====================
            Roadmap chips. Every tool here is upcoming, so we surface
            them as honest "Soon" pills rather than tappable buttons
            that fire a toast. This reads as intentional roadmap, not
            broken affordances — the screen feels finished even though
            the tools are stubbed. When a tool ships, drop the `soon`
            flag and wire `onPress`; the chip will start tapping. */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.toolsRow}
        >
          <ToolChip icon="pricetag-outline" label="Tags" soon />
          <ToolChip icon="happy-outline" label="Reactions" soon />
          <ToolChip icon="stats-chart" label="Poll" soon />
          <ToolChip icon="film-outline" label="GIF" soon />
        </ScrollView>

        {/* ====================== POST SETTINGS =====================
            The Circle confirmation row that used to live here was a
            duplicate of the CircleContextFooter below — removed to keep
            the settings card focused on actual decisions, not labels. */}
        <View style={styles.settingsWrap}>
          <CircleSettingsCard
            settings={settings}
            onChange={onChangeSettings}
          />
        </View>

        {/* ===================== CONTEXT FOOTER ===================== */}
        <View style={styles.footerWrap}>
          <CircleContextFooter
            circleIcon={community?.icon ?? '💬'}
            circleAccent={accent.color}
            memberCount={community?.memberCount ?? 0}
            onlineCount={0}
            etiquette={accent.etiquette}
          />
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* ======================= BOTTOM CTA BAR =======================
          A thin accent gradient line sits above the bar so the CTA reads
          as part of the room's identity, not a generic system bar. The
          Save Draft secondary stays small and quiet so the Post button
          is unambiguously the hero. */}
      <View style={[styles.ctaWrap, { paddingBottom: insets.bottom + 10 }]}>
        <LinearGradient
          colors={[`${accent.color}00`, `${accent.color}66`, `${accent.color}00`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.ctaTopLine}
          pointerEvents="none"
        />
        <View style={styles.ctaBar}>
          <TouchableOpacity
            style={styles.draftBtn}
            onPress={handleSaveDraft}
            activeOpacity={0.85}
            disabled={posting}
          >
            <Ionicons name="bookmark-outline" size={15} color={colors.dark.textSecondary} />
            <Text style={styles.draftText}>Draft</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.postWrap}
            onPress={handlePost}
            disabled={posting || !canPost}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={canPost ? [accent.color, accent.colorAlt] : [colors.dark.cardAlt, colors.dark.cardAlt]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.postBtn, !canPost && { opacity: 0.7 }]}
            >
              {posting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="paper-plane" size={15} color="#FFFFFF" />
                  <Text style={styles.postText}>Post to Circle</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function ToolChip({
  icon,
  label,
  onPress,
  soon,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress?: () => void;
  /** When true the chip renders as a passive "coming soon" indicator —
   *  a small soft pill suffix keeps the chip honest without firing a
   *  noisy toast on every tap. */
  soon?: boolean;
}) {
  const inner = (
    <View style={[styles.toolChip, soon && styles.toolChipSoon]}>
      <Ionicons name={icon} size={14} color={soon ? colors.dark.textMuted : colors.dark.textSecondary} />
      <Text style={[styles.toolText, soon && styles.toolTextSoon]}>{label}</Text>
      {soon ? (
        <View style={styles.toolSoonBadge}>
          <Text style={styles.toolSoonText}>Soon</Text>
        </View>
      ) : null}
    </View>
  );
  if (soon || !onPress) return inner;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      {inner}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },

  /* ---- Header ---- */
  header: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.dark.text, letterSpacing: -0.3 },
  /** "Posting in Circle" is now an accent-tinted pill instead of an
   *  inline subtitle. Reads as a quiet status badge — small, but it
   *  immediately tells the user where their post is going. */
  postingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  postingPillText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  headerDot: { width: 5, height: 5, borderRadius: 2.5 },

  /* ---- Body ---- */
  scrollPad: { paddingBottom: 24, gap: 14 },

  composer: {
    marginHorizontal: 14,
    backgroundColor: colors.dark.card,
    borderRadius: borderRadius.card ?? 16,
    borderWidth: 1,
    borderColor: colors.dark.border,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 8,
    /* Subtle elevation so the composer reads as the page's primary
       surface — matches the lifted feel of room post cards. */
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.22,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
      default: {},
    }),
  },
  composerHintRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  composerHintDot: { width: 6, height: 6, borderRadius: 3 },
  composerHint: { fontSize: 13, color: colors.dark.textMuted, fontWeight: '700', letterSpacing: 0.1 },
  composerInput: {
    minHeight: 130,
    fontSize: 16,
    color: colors.dark.text,
    lineHeight: 22,
    paddingTop: 4,
  },
  composerFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  charCount: { fontSize: 11, color: colors.dark.textQuiet },

  /* ---- Media Tiles ---- */
  mediaTiles: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
  },
  mediaTile: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: borderRadius.card ?? 14,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
    overflow: 'hidden',
    position: 'relative',
  },
  mediaTilePlaceholder: { backgroundColor: 'transparent', borderColor: 'transparent' },
  mediaImg: { width: '100%', height: '100%' },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  removeBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaAddTile: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderStyle: 'dashed',
  },
  mediaAddIcon: { position: 'relative' },
  mediaAddPlus: {
    position: 'absolute',
    right: -6,
    bottom: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.dark.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  mediaAddText: { fontSize: 12, fontWeight: '700', color: colors.dark.textMuted },

  /* ---- Tools row ---- */
  toolsRow: {
    paddingHorizontal: 14,
    gap: 8,
  },
  toolChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.dark.card,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  /** "Soon" chips read quieter than active chips — slightly lower
   *  background contrast and dashed-style edge so the eye doesn't
   *  treat them as primary actions. */
  toolChipSoon: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: 'rgba(255,255,255,0.06)',
  },
  toolText: { fontSize: 12.5, fontWeight: '700', color: colors.dark.textSecondary },
  toolTextSoon: { color: colors.dark.textMuted },
  toolSoonBadge: {
    marginLeft: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  toolSoonText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: colors.dark.textMuted,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

  /* ---- Settings + footer ---- */
  settingsWrap: { paddingHorizontal: 14 },
  footerWrap: { paddingHorizontal: 14, paddingTop: 4 },

  /* ---- Bottom CTA bar ---- */
  ctaWrap: {
    backgroundColor: colors.dark.bg,
  },
  /** Hairline accent gradient — fades in/out so it reads as a curated
   *  edge rather than a flat system divider. */
  ctaTopLine: {
    height: 1,
    width: '100%',
  },
  ctaBar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  /** Save Draft is a quieter secondary — icon-led pill so the eye lands
   *  on the gradient Post button, not a competing button. */
  draftBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: borderRadius.button ?? 24,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  draftText: { fontSize: 13, fontWeight: '700', color: colors.dark.textSecondary },
  postWrap: {
    flex: 1,
    borderRadius: borderRadius.button ?? 24,
    overflow: 'hidden',
    /* Soft elevation on the hero CTA. */
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.30,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  postBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: borderRadius.button ?? 24,
  },
  postText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.2 },
});
