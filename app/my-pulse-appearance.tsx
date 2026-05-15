import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius } from '@/theme';
import { AccentComposerFrame, AccentCharCount } from '@/components/ui/AccentComposerFrame';
import { pulseImageFeedHeroProps, pulseImageListThumbProps } from '@/lib/pulseImage';
import { MY_PULSE_MAX_IDENTITY_TAGS, MY_PULSE_TAGS_CHAR_BUDGET } from '@/constants';
import { useAuth } from '@/contexts/AuthContext';
import {
  pickAvatarImageRawFromGallery,
  pickBannerImageFromGallery,
  normalizeRasterForUpload,
  type MediaAsset,
} from '@/lib/media';
import { storageService } from '@/lib/storage';
import { profilesService } from '@/services/supabase';
import { supabaseMessage } from '@/utils/supabaseErrors';
import { profileNeedsPublicNameReview } from '@/lib/oauthProfilePlaceholders';
import { SongPickerModal, type PickedSong } from '@/components/mypage/SongPickerModal';
import { CircularAvatarCropModal } from '@/components/profile/CircularAvatarCropModal';
import {
  CustomizeMoreTabs,
  type CustomizeMoreTabsHandle,
} from '@/components/mypage/CustomizeMoreTabs';
import { MyBordersScreen } from '@/components/borders/inventory/MyBordersScreen';
import { EquippedBorderPanel } from '@/components/borders/EquippedBorderPanel';
import { useOwnedBorderEntries } from '@/hooks/useOwnedBorderEntries';
import { useProfileCustomization } from '@/store/useProfileCustomization';

const DEFAULT_BANNER =
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&q=80';

/**
 * Parse a free-form "RN, ICU, Night shift" string into clean pill tokens.
 * We apply a combined character budget (not a count cap) because the pills
 * live on a single row beside the avatar — what matters is whether the
 * text fits on one line, not how many commas the user typed. Tokens are
 * accepted in order until the next one would blow the budget; anything
 * after that is dropped so the on-screen row can never wrap.
 */
function parseIdentityTags(raw: string): string[] {
  const all = raw
    .split(/[,،、]|\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const kept: string[] = [];
  let charsUsed = 0;
  for (const t of all) {
    if (kept.length >= MY_PULSE_MAX_IDENTITY_TAGS) break;
    if (charsUsed + t.length > MY_PULSE_TAGS_CHAR_BUDGET) break;
    kept.push(t);
    charsUsed += t.length;
  }
  return kept;
}

/** Total characters across accepted tags — what the counter UI displays. */
function tagsCharCount(tags: string[]): number {
  return tags.reduce((n, t) => n + t.length, 0);
}

/**
 * Lightweight wrapper that fetches the owned-border count and renders the
 * shared `EquippedBorderPanel` above the embedded vault. Kept as a tiny
 * inner component so the hook fires only once the Borders area is mounted.
 */
function BorderEquippedPanelStrip({
  uid,
  avatarUrl,
  equippedFrame,
}: {
  uid: string;
  avatarUrl: string | null;
  equippedFrame: import('@/types').PulseAvatarFrame | null;
}) {
  const { entries } = useOwnedBorderEntries(uid);
  return (
    <View style={{ marginBottom: 12 }}>
      <EquippedBorderPanel
        frame={equippedFrame}
        avatarUrl={avatarUrl ?? undefined}
        ownedCount={entries.length}
      />
    </View>
  );
}

export default function MyPageAppearanceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ focus?: string; collectionId?: string }>();
  const insets = useSafeAreaInsets();
  const { user, profile, refreshProfile } = useAuth();
  const { accentColor } = useProfileCustomization();
  const moreRef = useRef<CustomizeMoreTabsHandle>(null);
  const lookScrollRef = useRef<ScrollView>(null);
  const didScrollToBorders = useRef(false);
  const [mainTab, setMainTab] = useState<'look' | 'more'>('look');

  const focusBorders =
    params.focus === 'borders' || (Array.isArray(params.focus) && params.focus[0] === 'borders');

  useEffect(() => {
    didScrollToBorders.current = false;
  }, [focusBorders]);

  useEffect(() => {
    if (focusBorders) setMainTab('look');
  }, [focusBorders]);

  const uid = user?.id ?? '';

  const [songTitle, setSongTitle] = useState('');
  const [songArtist, setSongArtist] = useState('');
  const [songUrl, setSongUrl] = useState('');
  const [songArtworkUrl, setSongArtworkUrl] = useState('');
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<'banner' | 'avatar' | null>(null);
  const [avatarCropAsset, setAvatarCropAsset] = useState<MediaAsset | null>(null);
  const [identityTagsInput, setIdentityTagsInput] = useState('');
  const [pageIntroLine, setPageIntroLine] = useState('');
  const [hideRecentPostsStrip, setHideRecentPostsStrip] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const getSongFields = useCallback(
    () => ({
      title: songTitle,
      artist: songArtist,
      url: songUrl,
      artworkUrl: songArtworkUrl,
    }),
    [songTitle, songArtist, songUrl, songArtworkUrl],
  );

  useEffect(() => {
    if (!profile) return;
    setSongTitle(profile.profileSongTitle ?? '');
    setSongArtist(profile.profileSongArtist ?? '');
    setSongUrl(profile.profileSongUrl ?? '');
    setSongArtworkUrl(profile.profileSongArtworkUrl ?? '');
    setBannerPreview(profile.bannerUrl ?? null);
    setAvatarPreview(profile.avatarUrl || null);
    setIdentityTagsInput((profile.identityTags ?? []).join(', '));
    setPageIntroLine(profile.bio?.trim() ? profile.bio : '');
    setHideRecentPostsStrip(Boolean(profile.hideRecentPostsOnMyPage));
  }, [profile]);

  if (!uid || !profile) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.muted}>Sign in to edit your page.</Text>
      </View>
    );
  }

  const pickBanner = async () => {
    try {
      setUploading('banner');
      const asset = await pickBannerImageFromGallery();
      if (!asset) return;

      let url: string;
      try {
        url = await storageService.uploadProfileBanner(uid, {
          uri: asset.uri,
          type: asset.mimeType,
          name: asset.fileName,
        });
      } catch (e: unknown) {
        Alert.alert('Couldn’t upload image', supabaseMessage(e));
        return;
      }

      setBannerPreview(url);

      try {
        await profilesService.update(uid, { banner_url: url });
        await refreshProfile();
      } catch (e: unknown) {
        Alert.alert(
          'Photo saved in Storage — profile row didn’t update',
          `${supabaseMessage(e)}\n\nIf you see the file in the bucket, the failure is almost always this step: saving \`profiles.banner_url\` (RLS, missing column, or session). Public URL:\n${url}`,
        );
      }
    } finally {
      setUploading(null);
    }
  };

  const pickAvatar = async () => {
    try {
      const raw = await pickAvatarImageRawFromGallery();
      if (!raw) return;
      setAvatarCropAsset(raw);
    } catch (e: unknown) {
      Alert.alert('Could not open photo', supabaseMessage(e));
    }
  };

  const onAvatarCropComplete = useCallback(
    async (asset: MediaAsset) => {
      setAvatarCropAsset(null);
      try {
        setUploading('avatar');
        const normalized = await normalizeRasterForUpload(asset, 'avatar');
        const url = await storageService.uploadAvatar(uid, {
          uri: normalized.uri,
          type: normalized.mimeType,
          name: normalized.fileName,
        });
        setAvatarPreview(url);
        await profilesService.update(uid, { avatar_url: url });
        await refreshProfile();
      } catch (e: unknown) {
        Alert.alert('Upload failed', supabaseMessage(e));
      } finally {
        setUploading(null);
      }
    },
    [uid, refreshProfile],
  );

  const saveCopyAndSong = async () => {
    const tags = parseIdentityTags(identityTagsInput);
    setSaving(true);
    try {
      await profilesService.update(uid, {
        bio: pageIntroLine.trim(),
        identity_tags: tags,
        profile_song_title: songTitle.trim() || null,
        profile_song_artist: songArtist.trim() || null,
        profile_song_url: songUrl.trim() || null,
        profile_song_artwork_url: songArtworkUrl.trim() || null,
        hide_recent_posts_on_my_page: hideRecentPostsStrip,
      });
      await refreshProfile();
      Alert.alert('Saved', 'Your My Pulse details were updated.');
      router.back();
    } catch (e: unknown) {
      Alert.alert('Could not save', supabaseMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const handleHeaderSave = async () => {
    if (mainTab === 'look') {
      await saveCopyAndSong();
      return;
    }
    const ok = await moreRef.current?.save();
    if (ok) {
      Alert.alert('Saved', 'Your profile was updated.');
      router.back();
    }
  };

  /** Wire the picker: populate local state so the preview below and the
   *  final save payload both reflect the newly chosen track. */
  const onPickSong = (song: PickedSong) => {
    setSongTitle(song.title);
    setSongArtist(song.artist);
    setSongUrl(song.previewUrl);
    setSongArtworkUrl(song.artworkUrl);
  };

  const clearSong = () => {
    setSongTitle('');
    setSongArtist('');
    setSongUrl('');
    setSongArtworkUrl('');
  };

  const hasSong = Boolean(songTitle.trim() || songArtist.trim());

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={26} color={colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Customize My Pulse</Text>
        <TouchableOpacity onPress={handleHeaderSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator color={colors.primary.teal} />
          ) : (
            <Text style={styles.saveTxt}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={[styles.mainTabBar, { paddingHorizontal: 16, borderBottomColor: colors.dark.border }]}>
        <TouchableOpacity
          style={[styles.mainTabChip, mainTab === 'look' && styles.mainTabChipOn]}
          onPress={() => setMainTab('look')}
          activeOpacity={0.85}
        >
          <Text style={[styles.mainTabChipText, mainTab === 'look' && styles.mainTabChipTextOn]}>Look</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.mainTabChip, mainTab === 'more' && styles.mainTabChipOn]}
          onPress={() => setMainTab('more')}
          activeOpacity={0.85}
        >
          <Text style={[styles.mainTabChipText, mainTab === 'more' && styles.mainTabChipTextOn]}>Profile & more</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={lookScrollRef}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {mainTab === 'look' ? (
          <>
        {profileNeedsPublicNameReview(profile, user?.email) ? (
          <View style={styles.oauthPublicNameCallout} accessibilityRole="text">
            <View style={styles.oauthPublicNameIconWrap}>
              <Ionicons name="person-circle-outline" size={26} color={colors.primary.teal} />
            </View>
            <View style={styles.oauthPublicNameTextWrap}>
              <Text style={styles.oauthPublicNameTitle}>Fix your name & @handle</Text>
              <Text style={styles.oauthPublicNameBody}>
                Sign in with Apple sometimes uses a private relay email, which can show up as your display name or
                suggest a random @handle. Open the <Text style={{ fontWeight: '800' }}>Profile & more</Text> tab
                above, then <Text style={{ fontWeight: '800' }}>Save</Text>.
              </Text>
            </View>
          </View>
        ) : null}

        <Text style={styles.sectionLabel}>Banner</Text>
        <Text style={styles.hint}>
          Recommended: wide image at least <Text style={styles.hintBold}>1200 × 400 px</Text> (about 3:1). Like a
          YouTube banner — keep faces and text inside the center so it crops nicely on phones.
        </Text>
        <TouchableOpacity activeOpacity={0.9} onPress={pickBanner} disabled={!!uploading}>
          <Image
            source={{ uri: bannerPreview ?? DEFAULT_BANNER }}
            style={styles.bannerPreview}
            contentFit="cover"
            {...pulseImageFeedHeroProps}
          />
          <View style={styles.bannerFab}>
            {uploading === 'banner' ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="image-outline" size={18} color="#FFF" />
                <Text style={styles.bannerFabText}>Change banner</Text>
              </>
            )}
          </View>
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>Profile photo</Text>
        <Text style={styles.hint}>
          You&apos;ll adjust the photo inside a <Text style={styles.hintBold}>circle</Text> so it matches how it appears
          everywhere in the app. Any image works; pinch to zoom and drag to frame your face.
        </Text>
        <View style={styles.avatarRow}>
          <Image
            source={{ uri: avatarPreview ?? profile.avatarUrl }}
            style={styles.avatarImg}
            contentFit="cover"
            {...pulseImageListThumbProps}
          />
          <TouchableOpacity style={styles.secondaryBtn} onPress={pickAvatar} disabled={!!uploading}>
            {uploading === 'avatar' ? (
              <ActivityIndicator color={colors.primary.teal} />
            ) : (
              <>
                <Ionicons name="camera-outline" size={20} color={colors.primary.teal} />
                <Text style={styles.secondaryBtnText}>Upload photo</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>Neon tags</Text>
        <Text style={styles.hint}>
          Short labels that live on a single row beside your photo. Separate with commas — keep the combined text
          under <Text style={styles.hintBold}>{MY_PULSE_TAGS_CHAR_BUDGET} characters</Text> so the row never
          wraps to a second line. Three short tags (e.g. <Text style={styles.hintBold}>RN, ICU, Night shift</Text>)
          usually looks best. Leave empty to show your role & specialty instead.
        </Text>
        <AccentComposerFrame
          accentColor={colors.primary.teal}
          hint="Neon tags"
          compact
          noShadow
        >
          <TextInput
            style={styles.inputPlain}
            value={identityTagsInput}
            onChangeText={setIdentityTagsInput}
            placeholder="RN, ICU, Coffee addict..."
            placeholderTextColor={colors.dark.textMuted}
          />
        </AccentComposerFrame>
        {(() => {
          const parsed = parseIdentityTags(identityTagsInput);
          const used = tagsCharCount(parsed);
          const near = used >= MY_PULSE_TAGS_CHAR_BUDGET - 4;
          return (
            <Text
              style={[
                styles.counter,
                near && { color: colors.status.warning ?? colors.primary.teal },
              ]}
            >
              {used}/{MY_PULSE_TAGS_CHAR_BUDGET} characters · {parsed.length} tag{parsed.length === 1 ? '' : 's'}
            </Text>
          );
        })()}

        <Text style={styles.sectionLabel}>Page intro</Text>
        <Text style={styles.hint}>
          One or two short lines under your neon tags on My Pulse — who you are, what you create, or your vibe. Leave
          empty if you prefer only tags + stats.
        </Text>
        <AccentComposerFrame
          accentColor={colors.primary.teal}
          hint="Page intro"
          noShadow
          footer={
            <AccentCharCount
              length={pageIntroLine.length}
              max={200}
              accentColor={colors.primary.teal}
              warnWithin={30}
              hideWhenEmpty={false}
            />
          }
        >
          <TextInput
            style={styles.inputIntro}
            value={pageIntroLine}
            onChangeText={setPageIntroLine}
            placeholder="Aspiring nurse creator · Night shift · Coffee first"
            placeholderTextColor={colors.dark.textMuted}
            multiline
            maxLength={200}
            scrollEnabled
          />
        </AccentComposerFrame>

        <Text style={styles.sectionLabel}>Current vibe (music)</Text>
        <Text style={styles.hint}>
          Pick any song. A short preview will auto-play when someone opens your Pulse Page — artwork, title, and artist
          show on your mini music player.
        </Text>

        {hasSong ? (
          <View style={styles.songPreview}>
            {songArtworkUrl ? (
              <Image
                source={{ uri: songArtworkUrl }}
                style={styles.songArt}
                contentFit="cover"
                {...pulseImageListThumbProps}
              />
            ) : (
              <View style={[styles.songArt, styles.songArtPh]}>
                <Ionicons name="musical-notes" size={22} color="#FFF" />
              </View>
            )}
            <View style={styles.songMeta}>
              <Text style={styles.songTitle} numberOfLines={1}>
                {songTitle || 'Untitled'}
              </Text>
              <Text style={styles.songArtist} numberOfLines={1}>
                {songArtist || 'Unknown artist'}
              </Text>
              <View style={styles.songActions}>
                <TouchableOpacity
                  style={styles.songActionPrimary}
                  onPress={() => setPickerOpen(true)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="swap-horizontal" size={13} color={colors.primary.teal} />
                  <Text style={styles.songActionPrimaryText}>Change</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.songActionGhost}
                  onPress={clearSong}
                  activeOpacity={0.85}
                >
                  <Ionicons name="close" size={13} color={colors.dark.textMuted} />
                  <Text style={styles.songActionGhostText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.pickSongCta}
            onPress={() => setPickerOpen(true)}
            activeOpacity={0.9}
          >
            <View style={styles.pickSongIcon}>
              <Ionicons name="musical-notes" size={22} color={colors.primary.teal} />
            </View>
            <View style={styles.pickSongText}>
              <Text style={styles.pickSongTitle}>Pick a song</Text>
              <Text style={styles.pickSongSubtitle}>
                Search any artist or track — we&apos;ll stream the preview on your page.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.primary.teal} />
          </TouchableOpacity>
        )}

        <Text style={styles.sectionLabel}>Recent posts on My Pulse</Text>
        <Text style={styles.hint}>
          Turn off the horizontal strip on your My Pulse tab only. Visitors still see your posts here unless you set your
          account to a private profile in Settings.
        </Text>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Hide strip on my tab</Text>
          <Switch
            value={hideRecentPostsStrip}
            onValueChange={setHideRecentPostsStrip}
            trackColor={{ false: colors.dark.border, true: colors.primary.teal + '88' }}
            thumbColor={hideRecentPostsStrip ? colors.primary.teal : colors.dark.textMuted}
          />
        </View>

        <View
          onLayout={(e) => {
            if (!focusBorders || didScrollToBorders.current) return;
            const y = e.nativeEvent.layout.y;
            didScrollToBorders.current = true;
            requestAnimationFrame(() => {
              lookScrollRef.current?.scrollTo({ y: Math.max(0, y - 16), animated: true });
            });
          }}
        >
          <Text style={styles.sectionLabel}>Profile borders</Text>
          <Text style={styles.hint}>
            Shop purchases, gifts, leaderboard prizes, beta rewards, and events — equip anything you&apos;ve unlocked.
            Top-five monthly Pulse winners get exclusive rings; those live here alongside Pulse Shop borders.
          </Text>
          <BorderEquippedPanelStrip
            uid={uid}
            avatarUrl={avatarPreview ?? profile.avatarUrl ?? null}
            equippedFrame={profile.pulseAvatarFrame ?? null}
          />
          <MyBordersScreen embedded onInventoryChanged={() => void refreshProfile()} />
        </View>

        <View style={{ height: 40 }} />
          </>
        ) : (
          <CustomizeMoreTabs
            ref={moreRef}
            user={user!}
            profile={profile}
            userEmail={user?.email}
            accentColor={accentColor}
            refreshProfile={refreshProfile}
            getSongFields={getSongFields}
          />
        )}
      </ScrollView>

      <SongPickerModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={onPickSong}
        initialQuery={songTitle}
      />

      <CircularAvatarCropModal
        visible={avatarCropAsset != null}
        asset={avatarCropAsset}
        onDismiss={() => setAvatarCropAsset(null)}
        onComplete={onAvatarCropComplete}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  centered: { justifyContent: 'center', alignItems: 'center' },
  muted: { color: colors.dark.textMuted },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.dark.text },
  saveTxt: { fontSize: 16, fontWeight: '800', color: colors.primary.teal },
  mainTabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    backgroundColor: colors.dark.bg,
  },
  mainTabChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
    alignItems: 'center',
  },
  mainTabChipOn: {
    borderColor: colors.primary.teal,
    backgroundColor: 'rgba(20,184,166,0.12)',
  },
  mainTabChipText: { fontSize: 13, fontWeight: '700', color: colors.dark.textMuted },
  mainTabChipTextOn: { color: colors.primary.teal },
  scroll: { padding: 16, paddingBottom: 48 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.dark.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 8,
    marginBottom: 6,
  },
  hint: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.dark.textMuted,
    marginBottom: 10,
  },
  hintBold: { fontWeight: '800', color: colors.dark.textSecondary },
  bannerPreview: {
    width: '100%',
    height: 120,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.dark.cardAlt,
  },
  bannerFab: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: borderRadius.xl,
  },
  bannerFabText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 8 },
  avatarImg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: colors.primary.teal,
    backgroundColor: colors.dark.cardAlt,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.primary.teal + '55',
    backgroundColor: colors.dark.card,
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '800', color: colors.primary.teal },
  inputPlain: {
    paddingHorizontal: 6,
    paddingVertical: 8,
    fontSize: 15,
    color: colors.dark.text,
    marginBottom: 4,
  },
  inputIntro: {
    paddingHorizontal: 6,
    paddingVertical: 8,
    fontSize: 15,
    color: colors.dark.text,
    minHeight: 72,
    textAlignVertical: 'top',
    marginBottom: 4,
  },
  counter: {
    alignSelf: 'flex-end',
    fontSize: 12,
    color: colors.dark.textMuted,
    marginTop: 4,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
    marginBottom: 8,
  },
  switchLabel: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.dark.text, paddingRight: 12 },

  oauthPublicNameCallout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    marginBottom: 20,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(20,184,166,0.5)',
    backgroundColor: 'rgba(20,184,166,0.12)',
  },
  oauthPublicNameIconWrap: {
    marginTop: 2,
  },
  oauthPublicNameTextWrap: { flex: 1, minWidth: 0 },
  oauthPublicNameTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.dark.text,
    letterSpacing: -0.2,
  },
  oauthPublicNameBody: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: colors.dark.textSecondary,
  },

  /**
   * Empty-state CTA that opens the Song Picker. Styled as a clearly
   * tappable card so the owner sees this is an action, not a text field.
   */
  pickSongCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(20,184,166,0.45)',
    backgroundColor: 'rgba(20,184,166,0.10)',
    marginBottom: 10,
  },
  pickSongIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20,184,166,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(20,184,166,0.4)',
  },
  pickSongText: {
    flex: 1,
    minWidth: 0,
  },
  pickSongTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.dark.text,
    letterSpacing: -0.1,
  },
  pickSongSubtitle: {
    marginTop: 2,
    fontSize: 12.5,
    color: colors.dark.textMuted,
    lineHeight: 17,
  },
  /**
   * Rich "now picked" summary once a track is chosen. Mirrors the mini
   * music player so the user can see what visitors will see.
   */
  songPreview: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(20,184,166,0.4)',
    backgroundColor: colors.dark.card,
    marginBottom: 10,
  },
  songArt: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.md,
    backgroundColor: colors.dark.cardAlt,
  },
  songArtPh: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.teal + '55',
  },
  songMeta: {
    flex: 1,
    minWidth: 0,
  },
  songTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.dark.text,
    letterSpacing: -0.1,
  },
  songArtist: {
    marginTop: 2,
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.dark.textSecondary,
  },
  songActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  songActionPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.chip,
    backgroundColor: 'rgba(20,184,166,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(20,184,166,0.4)',
  },
  songActionPrimaryText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: colors.primary.teal,
    letterSpacing: 0.3,
  },
  songActionGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.chip,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  songActionGhostText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.dark.textMuted,
    letterSpacing: 0.2,
  },
});
