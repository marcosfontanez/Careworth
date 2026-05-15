import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, borderRadius } from '@/theme';
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
import { CustomizeRowsCard } from '@/components/mypage/CustomizeRowsCard';
import { CustomizeTextEditorSheet } from '@/components/mypage/CustomizeTextEditorSheet';
import { EquippedBorderPanel } from '@/components/borders/EquippedBorderPanel';
import { BordersCollectionStrip } from '@/components/borders/inventory/BordersCollectionStrip';
import { useOwnedBorderEntries } from '@/hooks/useOwnedBorderEntries';
import { AvatarDisplay, pulseFrameFromUser } from '@/components/profile/AvatarBuilder';
import { useProfileCustomization } from '@/store/useProfileCustomization';
import { tierMeta } from '@/utils/pulseScore';

const DEFAULT_BANNER =
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&q=80';
const DEFAULT_AVATAR_PLACEHOLDER =
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80';

/**
 * Parse a free-form "RN, ICU, Night shift" string into clean pill tokens.
 * Combined character budget keeps the row to a single line beside the
 * avatar; tokens past the budget are dropped silently.
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

/**
 * Inner strip that fetches the user's owned-border count so the equipped
 * panel can show "X unlocked" without making the parent screen own the
 * query. Kept separate from `BordersCollectionStrip` because the strip
 * does its own fetch and we don't want a duplicate one mounted twice.
 */
function EquippedBorderHero({
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
    <EquippedBorderPanel
      frame={equippedFrame}
      avatarUrl={avatarUrl ?? undefined}
      ownedCount={entries.length}
    />
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
  const [mainTab, setMainTab] = useState<'look' | 'profile'>('look');

  const focusBorders =
    params.focus === 'borders' || (Array.isArray(params.focus) && params.focus[0] === 'borders');

  useEffect(() => {
    didScrollToBorders.current = false;
  }, [focusBorders]);

  useEffect(() => {
    if (focusBorders) setMainTab('look');
  }, [focusBorders]);

  const uid = user?.id ?? '';

  /**
   * Source-of-truth state for every editable field. Populated from the
   * loaded profile and updated either inline (banner / avatar / vibe via
   * pickers) or via the text-editor sheet (tags / intro). All saves are
   * row-scoped, so there is no global "Save" button on the Look tab —
   * each editor commits its own change to Supabase.
   */
  const [songTitle, setSongTitle] = useState('');
  const [songArtist, setSongArtist] = useState('');
  const [songUrl, setSongUrl] = useState('');
  const [songArtworkUrl, setSongArtworkUrl] = useState('');
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [moreSaving, setMoreSaving] = useState(false);
  const [uploading, setUploading] = useState<'banner' | 'avatar' | null>(null);
  const [avatarCropAsset, setAvatarCropAsset] = useState<MediaAsset | null>(null);
  const [identityTagsInput, setIdentityTagsInput] = useState('');
  const [pageIntroLine, setPageIntroLine] = useState('');
  const [hideRecentPostsStrip, setHideRecentPostsStrip] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  /** Per-field editor sheets for the text rows. */
  const [tagsSheetOpen, setTagsSheetOpen] = useState(false);
  const [introSheetOpen, setIntroSheetOpen] = useState(false);
  const [savingTags, setSavingTags] = useState(false);
  const [savingIntro, setSavingIntro] = useState(false);
  /** Light debounce for the recent-posts switch so a quick toggle doesn't double-fire. */
  const hideStripPendingRef = useRef<NodeJS.Timeout | null>(null);

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
          `${supabaseMessage(e)}\n\nIf you see the file in the bucket, the failure is almost always saving \`profiles.banner_url\` (RLS, missing column, or session). Public URL:\n${url}`,
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

  /** Save tags and intro independently — each opens its own editor sheet. */
  const handleSaveTags = useCallback(
    async (raw: string) => {
      setSavingTags(true);
      try {
        const tags = parseIdentityTags(raw);
        await profilesService.update(uid, { identity_tags: tags });
        setIdentityTagsInput(raw);
        await refreshProfile();
        setTagsSheetOpen(false);
      } catch (e: unknown) {
        Alert.alert('Could not save tags', supabaseMessage(e));
      } finally {
        setSavingTags(false);
      }
    },
    [uid, refreshProfile],
  );

  const handleSaveIntro = useCallback(
    async (raw: string) => {
      setSavingIntro(true);
      try {
        const trimmed = raw.trim();
        await profilesService.update(uid, { bio: trimmed });
        setPageIntroLine(trimmed);
        await refreshProfile();
        setIntroSheetOpen(false);
      } catch (e: unknown) {
        Alert.alert('Could not save intro', supabaseMessage(e));
      } finally {
        setSavingIntro(false);
      }
    },
    [uid, refreshProfile],
  );

  const persistVibe = useCallback(
    async (next: { title: string; artist: string; url: string; artworkUrl: string }) => {
      try {
        await profilesService.update(uid, {
          profile_song_title: next.title.trim() || null,
          profile_song_artist: next.artist.trim() || null,
          profile_song_url: next.url.trim() || null,
          profile_song_artwork_url: next.artworkUrl.trim() || null,
        });
        await refreshProfile();
      } catch (e: unknown) {
        Alert.alert('Could not save song', supabaseMessage(e));
      }
    },
    [uid, refreshProfile],
  );

  const onPickSong = (song: PickedSong) => {
    setSongTitle(song.title);
    setSongArtist(song.artist);
    setSongUrl(song.previewUrl);
    setSongArtworkUrl(song.artworkUrl);
    void persistVibe({
      title: song.title,
      artist: song.artist,
      url: song.previewUrl,
      artworkUrl: song.artworkUrl,
    });
  };

  const clearSong = () => {
    setSongTitle('');
    setSongArtist('');
    setSongUrl('');
    setSongArtworkUrl('');
    void persistVibe({ title: '', artist: '', url: '', artworkUrl: '' });
  };

  /**
   * Recent-posts toggle: optimistic local update + debounced persist so
   * tapping the switch feels instant and we don't fire two writes for a
   * quick double-toggle.
   */
  const onToggleHideRecentPosts = useCallback(
    (next: boolean) => {
      setHideRecentPostsStrip(next);
      if (hideStripPendingRef.current) clearTimeout(hideStripPendingRef.current);
      hideStripPendingRef.current = setTimeout(async () => {
        try {
          await profilesService.update(uid, { hide_recent_posts_on_my_page: next });
          await refreshProfile();
        } catch (e: unknown) {
          Alert.alert('Could not save preference', supabaseMessage(e));
          /** Revert the optimistic update so the UI matches the server. */
          setHideRecentPostsStrip(!next);
        }
      }, 220);
    },
    [uid, refreshProfile],
  );

  /**
   * Profile tab still has bulk fields (handle, name, role, etc.) so it
   * keeps a global Save button. Look tab saves per-row, so the header
   * action is hidden when the Look tab is active.
   */
  const handleHeaderSave = async () => {
    if (mainTab === 'look') return;
    setMoreSaving(true);
    try {
      const ok = await moreRef.current?.save();
      if (ok) {
        Alert.alert('Saved', 'Your profile was updated.');
        router.back();
      }
    } finally {
      setMoreSaving(false);
    }
  };

  const parsedTags = parseIdentityTags(identityTagsInput);
  const showSaveAction = mainTab === 'profile';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Customize My Pulse</Text>
        {showSaveAction ? (
          <TouchableOpacity onPress={handleHeaderSave} disabled={moreSaving} hitSlop={8}>
            {moreSaving ? (
              <ActivityIndicator color={colors.primary.teal} />
            ) : (
              <Text style={styles.saveTxt}>Save</Text>
            )}
          </TouchableOpacity>
        ) : (
          <View style={{ width: 26 }} />
        )}
      </View>

      <View style={[styles.mainTabBar, { paddingHorizontal: 16 }]}>
        <TabPill
          label="Profile"
          active={mainTab === 'profile'}
          onPress={() => setMainTab('profile')}
        />
        <TabPill label="Look" active={mainTab === 'look'} onPress={() => setMainTab('look')} />
      </View>

      <ScrollView
        ref={lookScrollRef}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
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
                    Sign in with Apple sometimes uses a private relay email, which can show up as
                    your display name or suggest a random @handle. Open the{' '}
                    <Text style={{ fontWeight: '800' }}>Profile</Text> tab above, then{' '}
                    <Text style={{ fontWeight: '800' }}>Save</Text>.
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Identity hero — avatar (with current border) + display name + level chip. */}
            <View style={styles.identityHero}>
              <AvatarDisplay
                size={84}
                avatarUrl={avatarPreview ?? profile.avatarUrl ?? undefined}
                prioritizeRemoteAvatar
                ringColor={colors.primary.teal}
                pulseFrame={
                  profile.pulseAvatarFrame ? pulseFrameFromUser(profile.pulseAvatarFrame) : null
                }
              />
              <View style={styles.identityCopy}>
                <Text style={styles.identityName} numberOfLines={1}>
                  {profile.displayName?.trim() || 'Your name'}
                </Text>
                <View style={styles.identityLevelRow}>
                  <Ionicons name="sparkles" size={12} color="#67E8F9" />
                  <Text style={styles.identityLevel} numberOfLines={1}>
                    {tierMeta(profile.pulseTier).label}
                  </Text>
                </View>
              </View>
            </View>

            <CustomizeRowsCard
              bannerPreview={bannerPreview}
              avatarPreview={avatarPreview}
              fallbackBannerUrl={DEFAULT_BANNER}
              fallbackAvatarUrl={DEFAULT_AVATAR_PLACEHOLDER}
              neonTags={parsedTags}
              pageIntroValue={pageIntroLine}
              songTitle={songTitle}
              songArtist={songArtist}
              songArtworkUrl={songArtworkUrl}
              hideRecentPostsStrip={hideRecentPostsStrip}
              uploadingBanner={uploading === 'banner'}
              uploadingAvatar={uploading === 'avatar'}
              onChangeBanner={pickBanner}
              onChangePhoto={pickAvatar}
              onEditNeonTags={() => setTagsSheetOpen(true)}
              onEditPageIntro={() => setIntroSheetOpen(true)}
              onChangeVibe={() => setPickerOpen(true)}
              onClearVibe={clearSong}
              onToggleHideRecentPosts={onToggleHideRecentPosts}
            />

            <View
              style={styles.bordersZone}
              onLayout={(e) => {
                if (!focusBorders || didScrollToBorders.current) return;
                const y = e.nativeEvent.layout.y;
                didScrollToBorders.current = true;
                requestAnimationFrame(() => {
                  lookScrollRef.current?.scrollTo({ y: Math.max(0, y - 16), animated: true });
                });
              }}
            >
              <EquippedBorderHero
                uid={uid}
                avatarUrl={avatarPreview ?? profile.avatarUrl ?? null}
                equippedFrame={profile.pulseAvatarFrame ?? null}
              />
              <BordersCollectionStrip onInventoryChanged={() => void refreshProfile()} />
            </View>

            <View style={{ height: 36 }} />
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

      <CustomizeTextEditorSheet
        visible={tagsSheetOpen}
        title="Neon tags"
        kicker="Show off"
        helperText={`Short labels that live on a single row beside your avatar. Separate with commas — keep the combined text under ${MY_PULSE_TAGS_CHAR_BUDGET} characters.`}
        initialValue={identityTagsInput}
        placeholder="RN, ICU, Coffee addict..."
        maxLength={MY_PULSE_TAGS_CHAR_BUDGET + 20}
        showCounter
        saving={savingTags}
        onCancel={() => setTagsSheetOpen(false)}
        onSave={handleSaveTags}
        formatPreview={(value) => {
          const tags = parseIdentityTags(value);
          if (tags.length === 0) return null;
          return tags.map((t) => (
            <View key={t} style={styles.previewChip}>
              <Text style={styles.previewChipText} numberOfLines={1}>
                {t}
              </Text>
            </View>
          ));
        }}
      />

      <CustomizeTextEditorSheet
        visible={introSheetOpen}
        title="Page intro"
        kicker="Your space"
        helperText="One or two short lines that appear under your tags on My Pulse — who you are, what you create, or your vibe."
        initialValue={pageIntroLine}
        placeholder="Aspiring nurse creator · Night shift · Coffee first"
        maxLength={200}
        multiline
        showCounter
        saving={savingIntro}
        onCancel={() => setIntroSheetOpen(false)}
        onSave={handleSaveIntro}
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

function TabPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  if (active) {
    return (
      <LinearGradient
        colors={['rgba(34,211,238,0.55)', 'rgba(34,211,238,0.18)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.tabPill, styles.tabPillOn]}
      >
        <TouchableOpacity style={styles.tabPillInner} onPress={onPress} activeOpacity={0.85}>
          <Text style={styles.tabPillTextOn}>{label}</Text>
        </TouchableOpacity>
      </LinearGradient>
    );
  }
  return (
    <TouchableOpacity
      style={[styles.tabPill, styles.tabPillIdle]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={styles.tabPillText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#040712' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  muted: { color: colors.dark.textMuted },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.dark.text, letterSpacing: -0.2 },
  saveTxt: { fontSize: 16, fontWeight: '800', color: colors.primary.teal },
  mainTabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    paddingBottom: 14,
  },
  tabPill: {
    flex: 1,
    borderRadius: 999,
    overflow: 'hidden',
  },
  tabPillIdle: {
    paddingVertical: 11,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.32)',
    backgroundColor: 'rgba(15,23,42,0.65)',
  },
  tabPillOn: {
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.6)',
  },
  tabPillInner: {
    paddingVertical: 11,
    alignItems: 'center',
  },
  tabPillText: {
    fontSize: 13,
    fontWeight: '800',
    color: 'rgba(203,213,225,0.95)',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  tabPillTextOn: {
    fontSize: 13,
    fontWeight: '900',
    color: '#06121F',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  scroll: { paddingHorizontal: 16, paddingBottom: 48 },
  identityHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 4,
    marginBottom: 18,
  },
  identityCopy: { flex: 1, minWidth: 0 },
  identityName: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.dark.text,
    letterSpacing: -0.6,
  },
  identityLevelRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  identityLevel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#67E8F9',
    letterSpacing: 0.2,
  },
  bordersZone: { marginTop: 26 },
  oauthPublicNameCallout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    marginBottom: 18,
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
  previewChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.4)',
    backgroundColor: 'rgba(251,191,36,0.10)',
  },
  previewChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FDE68A',
    letterSpacing: 0.1,
  },
});
