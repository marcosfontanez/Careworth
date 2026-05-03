import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Switch,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { ROLES, SPECIALTIES, US_STATES, SHIFT_PREFERENCES } from '@/constants';
import { useAuth } from '@/contexts/AuthContext';
import { profilesService } from '@/services/supabase';
import { pickImageFromGallery, type MediaAsset } from '@/lib/media';
import { storageService } from '@/lib/storage';
import { useProfileCustomization, getWidgetMeta, DEFAULT_WIDGETS } from '@/store/useProfileCustomization';
import { AvatarDisplay } from '@/components/profile/AvatarBuilder';
import { usernamePassesContentPolicy } from '@/lib/handleContentPolicy';
import { sanitizeUsername, isValidUsername } from '@/utils/profileHandle';
import type { Role, Specialty, ShiftPreference, ProfileWidgetType } from '@/types';
import {
  connectSpotify,
  disconnectSpotify,
  getSpotifyNowPlaying,
  hasSpotifySession,
  isSpotifyConfigured,
  searchAppleMusicSongs,
  type AppleMusicSongHit,
} from '@/lib/music';

const STATUS_PRESETS = [
  { icon: 'fitness', text: 'On shift and crushing it' },
  { icon: 'cafe', text: 'Need coffee STAT' },
  { icon: 'book', text: 'Studying for boards' },
  { icon: 'moon', text: 'Night shift mode' },
  { icon: 'sunny', text: 'Days off!' },
  { icon: 'bed', text: 'Post-shift recovery' },
  { icon: 'medkit', text: 'In the trenches' },
  { icon: 'airplane', text: 'Travel assignment' },
];

export default function EditProfileScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user, profile, refreshProfile } = useAuth();
  const {
    statusText, setStatus,
    widgets, toggleWidget,
    linkTree, addLink, removeLink,
    accentColor,
    setProfileSong,
  } = useProfileCustomization();

  const goBack = () => {
    if (navigation.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/my-pulse');
    }
  };

  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [username, setUsername] = useState(profile?.username ?? '');
  const [usernameStatus, setUsernameStatus] = useState<
    'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'yours' | 'disallowed'
  >('idle');
  const [firstName, setFirstName] = useState(profile?.firstName ?? '');
  const [lastName, setLastName] = useState(profile?.lastName ?? '');
  const [role, setRole] = useState<Role>(profile?.role ?? 'RN');
  const [specialty, setSpecialty] = useState<Specialty>(profile?.specialty ?? 'General');
  const [city, setCity] = useState(profile?.city ?? '');
  const [state, setStateName] = useState(profile?.state ?? '');
  const [yearsExp, setYearsExp] = useState(String(profile?.yearsExperience ?? 0));
  const [shiftPref, setShiftPref] = useState<ShiftPreference>(profile?.shiftPreference ?? 'No Preference');
  const [avatarAsset, setAvatarAsset] = useState<MediaAsset | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<'basic' | 'status' | 'widgets' | 'links'>('basic');

  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');

  const [songTitle, setSongTitle] = useState(profile?.profileSongTitle ?? '');
  const [songArtist, setSongArtist] = useState(profile?.profileSongArtist ?? '');
  const [songUrl, setSongUrl] = useState(profile?.profileSongUrl ?? '');

  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [spotifyBusy, setSpotifyBusy] = useState(false);
  const [appleQuery, setAppleQuery] = useState('');
  const [appleResults, setAppleResults] = useState<AppleMusicSongHit[]>([]);
  const [appleSearching, setAppleSearching] = useState(false);
  const [savingSongOnly, setSavingSongOnly] = useState(false);

  useEffect(() => {
    hasSpotifySession().then(setSpotifyConnected);
  }, []);

  useEffect(() => {
    if (!profile) return;
    setSongTitle(profile.profileSongTitle ?? '');
    setSongArtist(profile.profileSongArtist ?? '');
    setSongUrl(profile.profileSongUrl ?? '');
    setUsername(profile.username ?? '');
  }, [profile?.id, profile?.profileSongTitle, profile?.profileSongArtist, profile?.profileSongUrl, profile?.username]);

  // Debounced @handle availability — keeps the CHECK constraint in migration 048
  // and the UI in perfect agreement.
  useEffect(() => {
    const raw = username.trim().toLowerCase();
    if (!raw) {
      setUsernameStatus('idle');
      return;
    }
    if (raw === (profile?.username ?? '').toLowerCase()) {
      setUsernameStatus('yours');
      return;
    }
    if (!isValidUsername(raw)) {
      setUsernameStatus('invalid');
      return;
    }
    if (!usernamePassesContentPolicy(raw)) {
      setUsernameStatus('disallowed');
      return;
    }
    setUsernameStatus('checking');
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const ok = await profilesService.isUsernameAvailable(raw);
        if (!cancelled) setUsernameStatus(ok ? 'available' : 'taken');
      } catch {
        if (!cancelled) setUsernameStatus('idle');
      }
    }, 380);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [username, profile?.username]);

  const handlePickAvatar = async () => {
    try {
      const asset = await pickImageFromGallery();
      if (asset) setAvatarAsset(asset);
    } catch {
      Alert.alert('Error', 'Could not open photo picker.');
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      let avatar_url: string | undefined;
      if (avatarAsset) {
        try {
          avatar_url = await storageService.uploadAvatar(user.id, {
            uri: avatarAsset.uri,
            type: avatarAsset.mimeType,
            name: avatarAsset.fileName,
          });
        } catch {
          console.warn('Avatar upload failed');
        }
      }

      const st = songTitle.trim();
      const sa = songArtist.trim();
      const su = songUrl.trim();
      const hasSong = Boolean(st || sa || su);

      const usernameTrim = username.trim();
      if (usernameTrim && !isValidUsername(usernameTrim)) {
        Alert.alert(
          'Username',
          'Use 3–30 letters, numbers, underscores, or dots — no spaces. Example: lexi.rn',
        );
        setSaving(false);
        return;
      }
      if (usernameStatus === 'disallowed') {
        Alert.alert(
          'Username not allowed',
          'Reserved or staff-like names, impersonation, and prohibited language are not allowed in your @handle.',
        );
        setSaving(false);
        return;
      }
      if (usernameStatus === 'taken') {
        Alert.alert('Username taken', 'Please pick a different @handle.');
        setSaving(false);
        return;
      }
      const usernameNormalized = sanitizeUsername(usernameTrim);

      await profilesService.update(user.id, {
        display_name: displayName.trim(),
        username: usernameNormalized,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        role,
        specialty,
        city: city.trim(),
        state,
        years_experience: parseInt(yearsExp) || 0,
        shift_preference: shiftPref,
        profile_song_title: hasSong ? (st || null) : null,
        profile_song_artist: hasSong ? (sa || null) : null,
        profile_song_url: hasSong ? (su || null) : null,
        ...(avatar_url ? { avatar_url } : {}),
      });

      setProfileSong(
        hasSong
          ? { title: st, artist: sa, url: su || null }
          : null,
      );

      await refreshProfile();
      Alert.alert('Saved!', 'Your profile has been updated.');
      goBack();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleAppleSearch = async () => {
    setAppleSearching(true);
    try {
      const hits = await searchAppleMusicSongs(appleQuery);
      setAppleResults(hits);
      if (hits.length === 0) {
        Alert.alert(
          'No results',
          'Try another query, or ensure the apple-music-developer-token Edge Function is deployed with Apple API keys.',
        );
      }
    } catch (e: any) {
      Alert.alert('Apple Music', e?.message ?? 'Search failed');
      setAppleResults([]);
    } finally {
      setAppleSearching(false);
    }
  };

  const handleSaveSongOnly = async () => {
    if (!user) return;
    const st = songTitle.trim();
    const sa = songArtist.trim();
    const su = songUrl.trim();
    if (!st && !sa && !su) {
      Alert.alert('Nothing to save', 'Add a song title, artist, or link first (or use Clear).');
      return;
    }
    setSavingSongOnly(true);
    try {
      const hasSong = Boolean(st || sa || su);
      await profilesService.update(user.id, {
        profile_song_title: hasSong ? (st || null) : null,
        profile_song_artist: hasSong ? (sa || null) : null,
        profile_song_url: hasSong ? (su || null) : null,
      });
      setProfileSong(hasSong ? { title: st, artist: sa, url: su || null } : null);
      await refreshProfile();
      Alert.alert('Saved', 'Your now playing was updated on your profile.');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not save.');
    } finally {
      setSavingSongOnly(false);
    }
  };

  const currentAvatar = avatarAsset?.uri ?? profile?.avatarUrl;

  const sections = [
    { key: 'basic', label: 'Profile', icon: 'person-outline' },
    { key: 'status', label: 'Status', icon: 'happy-outline' },
    { key: 'widgets', label: 'Widgets', icon: 'grid-outline' },
    { key: 'links', label: 'Links', icon: 'link-outline' },
  ] as const;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={goBack} activeOpacity={0.7}>
          <Ionicons name="close" size={24} color={colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} activeOpacity={0.7}>
          {saving ? (
            <ActivityIndicator size="small" color={accentColor} />
          ) : (
            <Text style={[styles.saveText, { color: accentColor }]}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Section Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sectionTabs}>
        {sections.map((s) => (
          <TouchableOpacity
            key={s.key}
            style={[styles.sectionTab, activeSection === s.key && { backgroundColor: accentColor + '15', borderColor: accentColor + '40' }]}
            onPress={() => setActiveSection(s.key)}
            activeOpacity={0.7}
          >
            <Ionicons name={s.icon as any} size={16} color={activeSection === s.key ? accentColor : colors.dark.textMuted} />
            <Text style={[styles.sectionTabText, activeSection === s.key && { color: accentColor }]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {activeSection === 'basic' && (
          <>
            <TouchableOpacity style={styles.avatarWrap} onPress={handlePickAvatar} activeOpacity={0.8}>
              <AvatarDisplay size={100} avatarUrl={currentAvatar} showEdit onPress={handlePickAvatar} />
            </TouchableOpacity>

            <InputField label="Display Name" value={displayName} onChange={setDisplayName} />
            <InputField
              label="Username"
              value={username}
              onChange={(v) => setUsername(v.toLowerCase().replace(/[^a-z0-9._]/g, ''))}
              placeholder="lexi.rn"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <UsernameAvailabilityHint
              username={username}
              status={usernameStatus}
            />
            <InputField label="First Name" value={firstName} onChange={setFirstName} />
            <InputField label="Last Name" value={lastName} onChange={setLastName} />

            <Text style={styles.sectionLabel}>Role</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                {ROLES.map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.chip, role === r && { backgroundColor: accentColor + '15', borderColor: accentColor }]}
                    onPress={() => setRole(r)}
                  >
                    <Text style={[styles.chipText, role === r && { color: accentColor }]}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={styles.sectionLabel}>Specialty</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                {SPECIALTIES.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.chip, specialty === s && { backgroundColor: accentColor + '15', borderColor: accentColor }]}
                    onPress={() => setSpecialty(s)}
                  >
                    <Text style={[styles.chipText, specialty === s && { color: accentColor }]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <InputField label="City" value={city} onChange={setCity} />

            <Text style={styles.sectionLabel}>State</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                {US_STATES.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.chip, state === s && { backgroundColor: accentColor + '15', borderColor: accentColor }]}
                    onPress={() => setStateName(s)}
                  >
                    <Text style={[styles.chipText, state === s && { color: accentColor }]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <InputField label="Years Experience" value={yearsExp} onChange={setYearsExp} keyboardType="number-pad" />

            <Text style={styles.sectionLabel}>Shift Preference</Text>
            <View style={styles.chipRow}>
              {SHIFT_PREFERENCES.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.chip, shiftPref === s && { backgroundColor: accentColor + '15', borderColor: accentColor }]}
                  onPress={() => setShiftPref(s)}
                >
                  <Text style={[styles.chipText, shiftPref === s && { color: accentColor }]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {activeSection === 'status' && (
          <>
            <Text style={styles.editSectionTitle}>Current Status</Text>
            <View style={styles.currentStatus}>
              <Ionicons name="pulse" size={22} color={accentColor} />
              <Text style={styles.currentStatusText}>{statusText || 'No status set'}</Text>
            </View>

            <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Quick Set</Text>
            <View style={styles.statusGrid}>
              {STATUS_PRESETS.map((s, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.statusPreset,
                    statusText === s.text && { borderColor: accentColor, backgroundColor: accentColor + '10' },
                  ]}
                  onPress={() => setStatus('', s.text)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={s.icon as any} size={20} color={statusText === s.text ? accentColor : colors.dark.textMuted} />
                  <Text style={styles.statusPresetText}>{s.text}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.editSectionTitle, { marginTop: 28 }]}>Now playing</Text>
            <Text style={styles.editSectionSub}>
              Shown on your profile when the widget is enabled. Add an optional link to Spotify, Apple Music, or any URL.
            </Text>

            <View style={styles.streamCard}>
              <Text style={styles.streamCardTitle}>Spotify</Text>
              <Text style={styles.streamCardHint}>
                Connect to import what you are playing (requires Spotify Premium for live playback data).
              </Text>
              <View style={styles.streamActions}>
                {spotifyConnected ? (
                  <>
                    <TouchableOpacity
                      style={[styles.streamBtn, { backgroundColor: accentColor }]}
                      onPress={async () => {
                        setSpotifyBusy(true);
                        try {
                          const np = await getSpotifyNowPlaying();
                          if (!np) {
                            Alert.alert(
                              'Nothing playing',
                              'Start playback in Spotify, or nothing is available for this account.',
                            );
                            return;
                          }
                          setSongTitle(np.title);
                          setSongArtist(np.artist);
                          if (np.spotifyUrl) setSongUrl(np.spotifyUrl);
                        } finally {
                          setSpotifyBusy(false);
                        }
                      }}
                      disabled={spotifyBusy}
                      activeOpacity={0.8}
                    >
                      {spotifyBusy ? (
                        <ActivityIndicator color="#FFF" size="small" />
                      ) : (
                        <>
                          <Ionicons name="musical-notes" size={18} color="#FFF" />
                          <Text style={styles.streamBtnText}>Fill from Spotify</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.streamBtnSecondary}
                      onPress={async () => {
                        await disconnectSpotify();
                        setSpotifyConnected(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.streamBtnSecondaryText}>Disconnect</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.streamBtn,
                      { backgroundColor: isSpotifyConfigured() ? accentColor : colors.dark.border },
                    ]}
                    onPress={async () => {
                      setSpotifyBusy(true);
                      try {
                        const r = await connectSpotify();
                        if (r.ok) {
                          setSpotifyConnected(true);
                        } else if (r.error && r.error !== 'Cancelled') {
                          Alert.alert('Spotify', r.error);
                        }
                      } finally {
                        setSpotifyBusy(false);
                      }
                    }}
                    disabled={spotifyBusy || !isSpotifyConfigured()}
                    activeOpacity={0.8}
                  >
                    {spotifyBusy ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <>
                        <Ionicons name="musical-notes" size={18} color="#FFF" />
                        <Text style={styles.streamBtnText}>Connect Spotify</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
              {!isSpotifyConfigured() && (
                <Text style={styles.streamWarn}>
                  Set EXPO_PUBLIC_SPOTIFY_CLIENT_ID and add redirect URI{' '}
                  <Text style={{ fontWeight: '700' }}>pulseverse://spotify</Text> in the Spotify Developer Dashboard.
                </Text>
              )}
            </View>

            <View style={styles.streamCard}>
              <Text style={styles.streamCardTitle}>Apple Music</Text>
              <Text style={styles.streamCardHint}>
                Search the catalog and pick a song. Live “now playing” from Apple requires MusicKit on iOS (not available here).
              </Text>
              <View style={styles.appleSearchRow}>
                <TextInput
                  style={styles.appleSearchInput}
                  value={appleQuery}
                  onChangeText={setAppleQuery}
                  placeholder="Search song or artist"
                  placeholderTextColor={colors.dark.textMuted}
                  onSubmitEditing={handleAppleSearch}
                  returnKeyType="search"
                />
                <TouchableOpacity
                  style={[styles.appleSearchGo, { backgroundColor: accentColor }]}
                  onPress={handleAppleSearch}
                  disabled={appleSearching}
                  activeOpacity={0.85}
                >
                  {appleSearching ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Ionicons name="search" size={20} color="#FFF" />
                  )}
                </TouchableOpacity>
              </View>
              {appleResults.length > 0 && (
                <View style={styles.appleResults}>
                  {appleResults.map((hit) => (
                    <TouchableOpacity
                      key={hit.id}
                      style={styles.appleHit}
                      onPress={() => {
                        setSongTitle(hit.title);
                        setSongArtist(hit.artist);
                        setSongUrl(hit.url ?? '');
                        setAppleResults([]);
                        setAppleQuery('');
                      }}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="musical-note" size={18} color={accentColor} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.appleHitTitle} numberOfLines={1}>
                          {hit.title}
                        </Text>
                        <Text style={styles.appleHitArtist} numberOfLines={1}>
                          {hit.artist}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.dark.textMuted} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <InputField label="Song title" value={songTitle} onChange={setSongTitle} placeholder="e.g. Unstoppable" />
            <InputField label="Artist" value={songArtist} onChange={setSongArtist} placeholder="e.g. Sia" />
            <InputField
              label="Listen link (optional)"
              value={songUrl}
              onChange={setSongUrl}
              placeholder="https://open.spotify.com/..."
              keyboardType="url"
            />
            <TouchableOpacity
              style={[styles.saveSongOnlyBtn, { borderColor: accentColor }]}
              onPress={handleSaveSongOnly}
              disabled={savingSongOnly}
              activeOpacity={0.85}
            >
              {savingSongOnly ? (
                <ActivityIndicator size="small" color={accentColor} />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={18} color={accentColor} />
                  <Text style={[styles.saveSongOnlyText, { color: accentColor }]}>
                    Save now playing to profile
                  </Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.clearMusicBtn}
              onPress={() => {
                setSongTitle('');
                setSongArtist('');
                setSongUrl('');
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={18} color={colors.status.error} />
              <Text style={styles.clearMusicText}>Clear music from profile</Text>
            </TouchableOpacity>
          </>
        )}

        {activeSection === 'widgets' && (
          <>
            <Text style={styles.editSectionTitle}>Profile Widgets</Text>
            <Text style={styles.editSectionSub}>Toggle which sections appear on your profile</Text>
            <View style={styles.widgetList}>
              {widgets.map((w) => {
                const meta = getWidgetMeta(w.type);
                return (
                  <View key={w.type} style={styles.widgetRow}>
                    <Ionicons name={meta.icon as any} size={22} color={accentColor} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.widgetLabel}>{meta.label}</Text>
                      <Text style={styles.widgetDesc}>{meta.desc}</Text>
                    </View>
                    <Switch
                      value={w.enabled}
                      onValueChange={() => toggleWidget(w.type)}
                      trackColor={{ true: accentColor }}
                    />
                  </View>
                );
              })}
            </View>
          </>
        )}

        {activeSection === 'links' && (
          <>
            <Text style={styles.editSectionTitle}>Your Links</Text>
            <Text style={styles.editSectionSub}>Add links to your profile for others to see</Text>

            {linkTree.map((link, i) => (
              <View key={i} style={styles.linkItem}>
                <Ionicons name={(link.icon || 'globe-outline') as any} size={18} color={accentColor} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.linkItemLabel}>{link.label}</Text>
                  <Text style={styles.linkItemUrl}>{link.url}</Text>
                </View>
                <TouchableOpacity onPress={() => removeLink(i)} activeOpacity={0.7}>
                  <Ionicons name="trash-outline" size={18} color={colors.status.error} />
                </TouchableOpacity>
              </View>
            ))}

            <View style={styles.addLinkCard}>
              <Text style={styles.addLinkTitle}>Add New Link</Text>
              <InputField label="Label" value={newLinkLabel} onChange={setNewLinkLabel} placeholder="My Website" />
              <InputField label="URL" value={newLinkUrl} onChange={setNewLinkUrl} placeholder="https://..." />
              <TouchableOpacity
                style={[styles.addLinkBtn, { backgroundColor: accentColor }]}
                onPress={() => {
                  if (newLinkLabel.trim() && newLinkUrl.trim()) {
                    addLink({ label: newLinkLabel.trim(), url: newLinkUrl.trim(), icon: 'globe-outline' });
                    setNewLinkLabel('');
                    setNewLinkUrl('');
                  }
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={18} color="#FFF" />
                <Text style={styles.addLinkBtnText}>Add Link</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function InputField({
  label,
  value,
  onChange,
  multiline,
  keyboardType,
  placeholder,
  autoCapitalize,
  autoCorrect,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  keyboardType?: any;
  placeholder?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, multiline && styles.fieldMultiline]}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={colors.dark.textMuted}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
      />
    </View>
  );
}

function UsernameAvailabilityHint({
  username,
  status,
}: {
  username: string;
  status:
    | 'idle'
    | 'checking'
    | 'available'
    | 'taken'
    | 'invalid'
    | 'yours'
    | 'disallowed';
}) {
  const trimmed = username.trim();
  const preview = trimmed || 'handle';

  let icon: keyof typeof Ionicons.glyphMap | null = null;
  let tint: string = colors.dark.textMuted;
  let message = 'Shown as @' + preview + ' on your page. Others can @mention you in posts.';

  if (!trimmed) {
    tint = colors.dark.textMuted;
  } else if (status === 'checking') {
    icon = 'ellipsis-horizontal';
    tint = colors.dark.textMuted;
    message = 'Checking availability…';
  } else if (status === 'invalid') {
    icon = 'alert-circle';
    tint = colors.status.error;
    message = '3–30 chars, lowercase letters / numbers / dots / underscores. No leading or trailing dot.';
  } else if (status === 'disallowed') {
    icon = 'shield-outline';
    tint = colors.status.error;
    message =
      'This @handle is not allowed — no PulseVerse/staff-style segments, impersonation, or abusive or hateful language.';
  } else if (status === 'taken') {
    icon = 'close-circle';
    tint = colors.status.error;
    message = '@' + trimmed + ' is taken. Try another.';
  } else if (status === 'available') {
    icon = 'checkmark-circle';
    tint = colors.primary.teal;
    message = '@' + trimmed + ' is available.';
  } else if (status === 'yours') {
    icon = 'at';
    tint = colors.dark.textSecondary;
    message = 'This is your current @handle.';
  }

  return (
    <View style={styles.handleHintRow}>
      {icon ? (
        <Ionicons name={icon} size={13} color={tint} style={styles.handleHintIcon} />
      ) : null}
      <Text style={[styles.fieldHint, { color: tint, flex: 1 }]}>{message}</Text>
    </View>
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
  saveText: { fontSize: 16, fontWeight: '700' },

  sectionTabs: { paddingHorizontal: 16, paddingVertical: 14, gap: 10, minHeight: 56 },
  sectionTab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
    backgroundColor: colors.dark.card, borderWidth: 1, borderColor: colors.dark.border,
  },
  sectionTabText: { fontSize: 14, fontWeight: '600', color: colors.dark.textMuted },

  scroll: { paddingHorizontal: 16, paddingTop: 12 },
  avatarWrap: { alignSelf: 'center', marginBottom: 24 },

  fieldWrap: { marginBottom: 16 },
  fieldHint: {
    fontSize: 12,
    color: colors.dark.textMuted,
    lineHeight: 17,
  },
  handleHintRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: -8,
    marginBottom: 16,
    paddingRight: 4,
  },
  handleHintIcon: {
    marginTop: 2,
  },
  fieldLabel: {
    fontSize: 13, fontWeight: '700', color: colors.dark.textMuted,
    marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.3,
  },
  fieldInput: {
    backgroundColor: colors.dark.card,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: colors.dark.text,
    borderWidth: 1, borderColor: colors.dark.border,
  },
  fieldMultiline: { height: 80, textAlignVertical: 'top' },
  sectionLabel: {
    fontSize: 13, fontWeight: '700', color: colors.dark.textMuted,
    marginBottom: 8, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.3,
  },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
    backgroundColor: colors.dark.card,
    borderWidth: 1.5, borderColor: colors.dark.border,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.dark.textMuted },

  editSectionTitle: { fontSize: 18, fontWeight: '800', color: colors.dark.text, marginBottom: 4 },
  editSectionSub: { fontSize: 13, color: colors.dark.textMuted, marginBottom: 16 },

  currentStatus: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.dark.card, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: colors.dark.border,
  },
  currentStatusText: { fontSize: 15, fontWeight: '600', color: colors.dark.text, flex: 1 },

  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusPreset: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    width: '48%' as any, padding: 12, borderRadius: 12,
    backgroundColor: colors.dark.card, borderWidth: 1, borderColor: colors.dark.border,
  },
  statusPresetText: { fontSize: 12, fontWeight: '600', color: colors.dark.textSecondary, flex: 1 },

  saveSongOnlyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  saveSongOnlyText: { fontSize: 15, fontWeight: '700' },

  clearMusicBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
    marginBottom: 8,
  },
  clearMusicText: { fontSize: 14, fontWeight: '600', color: colors.status.error },

  streamCard: {
    backgroundColor: colors.dark.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.dark.border,
    marginBottom: 16,
  },
  streamCardTitle: { fontSize: 15, fontWeight: '800', color: colors.dark.text, marginBottom: 4 },
  streamCardHint: { fontSize: 12, color: colors.dark.textMuted, marginBottom: 12, lineHeight: 17 },
  streamActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  streamBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
    minHeight: 44,
  },
  streamBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  streamBtnSecondary: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  streamBtnSecondaryText: { fontSize: 14, fontWeight: '600', color: colors.dark.textMuted },
  streamWarn: { fontSize: 12, color: colors.status.warning, marginTop: 10, lineHeight: 17 },

  appleSearchRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  appleSearchInput: {
    flex: 1,
    backgroundColor: colors.dark.bg,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: colors.dark.text,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  appleSearchGo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appleResults: { marginTop: 10, gap: 6 },
  appleHit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: colors.dark.bg,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  appleHitTitle: { fontSize: 14, fontWeight: '700', color: colors.dark.text },
  appleHitArtist: { fontSize: 12, color: colors.dark.textMuted, marginTop: 2 },

  widgetList: { gap: 6 },
  widgetRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.dark.card, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: colors.dark.border,
  },
  widgetLabel: { fontSize: 14, fontWeight: '700', color: colors.dark.text },
  widgetDesc: { fontSize: 12, color: colors.dark.textMuted, marginTop: 2 },

  linkItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.dark.card, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: colors.dark.border, marginBottom: 8,
  },
  linkItemLabel: { fontSize: 14, fontWeight: '700', color: colors.dark.text },
  linkItemUrl: { fontSize: 12, color: colors.dark.textMuted, marginTop: 2 },

  addLinkCard: {
    backgroundColor: colors.dark.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: colors.dark.border, marginTop: 8,
  },
  addLinkTitle: { fontSize: 14, fontWeight: '700', color: colors.dark.text, marginBottom: 12 },
  addLinkBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: 12, marginTop: 8,
  },
  addLinkBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
});
