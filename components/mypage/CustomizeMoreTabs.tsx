import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { AccentComposerFrame } from '@/components/ui/AccentComposerFrame';
import { useProfileCustomization } from '@/store/useProfileCustomization';
import { profilesService } from '@/services/supabase';
import { usernamePassesContentPolicy } from '@/lib/handleContentPolicy';
import { sanitizeUsername, isValidUsername } from '@/utils/profileHandle';
import { profileNeedsPublicNameReview } from '@/lib/oauthProfilePlaceholders';
import type { UserProfile } from '@/types';
import type { User } from '@supabase/supabase-js';

export type CustomizeMoreTabsHandle = {
  save: () => Promise<boolean>;
};

type SongFieldsGetter = () => {
  title: string;
  artist: string;
  url: string;
  artworkUrl: string;
};

type Props = {
  user: User;
  profile: UserProfile;
  userEmail?: string | null;
  accentColor: string;
  refreshProfile: () => Promise<void>;
  getSongFields: SongFieldsGetter;
};

export const CustomizeMoreTabs = forwardRef<CustomizeMoreTabsHandle, Props>(function CustomizeMoreTabs(
  { user, profile, userEmail, accentColor, refreshProfile, getSongFields },
  ref,
) {
  const { setProfileSong } = useProfileCustomization();

  const [displayName, setDisplayName] = useState(profile.displayName ?? '');
  const [username, setUsername] = useState(profile.username ?? '');
  const [usernameStatus, setUsernameStatus] = useState<
    'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'yours' | 'disallowed'
  >('idle');
  const [firstName, setFirstName] = useState(profile.firstName ?? '');
  const [lastName, setLastName] = useState(profile.lastName ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDisplayName(profile.displayName ?? '');
    setFirstName(profile.firstName ?? '');
    setLastName(profile.lastName ?? '');
    setUsername(profile.username ?? '');
  }, [
    profile.id,
    profile.displayName,
    profile.firstName,
    profile.lastName,
    profile.username,
  ]);

  useEffect(() => {
    const raw = username.trim().toLowerCase();
    if (!raw) {
      setUsernameStatus('idle');
      return;
    }
    if (raw === (profile.username ?? '').toLowerCase()) {
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
  }, [username, profile.username]);

  const persist = useCallback(async () => {
    const usernameTrim = username.trim();
    if (usernameTrim && !isValidUsername(usernameTrim)) {
      Alert.alert(
        'Username',
        'Use 3–30 letters, numbers, underscores, or dots — no spaces. Example: lexi.rn',
      );
      return false;
    }
    if (usernameStatus === 'disallowed') {
      Alert.alert(
        'Username not allowed',
        'Reserved or staff-like names, impersonation, and prohibited language are not allowed in your @handle.',
      );
      return false;
    }
    if (usernameStatus === 'taken') {
      Alert.alert('Username taken', 'Please pick a different @handle.');
      return false;
    }
    const usernameNormalized = sanitizeUsername(usernameTrim);
    const { title: st, artist: sa, url: su, artworkUrl: sau } = getSongFields();
    const hasSong = Boolean(st.trim() || sa.trim());

    setSaving(true);
    try {
      await profilesService.update(user.id, {
        display_name: displayName.trim(),
        username: usernameNormalized,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        profile_song_title: hasSong ? (st.trim() || null) : null,
        profile_song_artist: hasSong ? (sa.trim() || null) : null,
        profile_song_url: hasSong ? (su.trim() || null) : null,
        profile_song_artwork_url: hasSong ? (sau.trim() || null) : null,
      });

      setProfileSong(
        hasSong ? { title: st.trim(), artist: sa.trim(), url: su.trim() || null } : null,
      );
      await refreshProfile();
      return true;
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save.');
      return false;
    } finally {
      setSaving(false);
    }
  }, [
    username,
    usernameStatus,
    getSongFields,
    user.id,
    displayName,
    firstName,
    lastName,
    setProfileSong,
    refreshProfile,
  ]);

  useImperativeHandle(ref, () => ({ save: persist }), [persist]);

  return (
    <View>
      <View style={styles.panel}>
        {profileNeedsPublicNameReview(profile, userEmail) ? (
          <View style={styles.appleRelayHint}>
            <Ionicons name="information-circle-outline" size={22} color={colors.primary.teal} />
            <Text style={styles.appleRelayHintText}>
              Apple may have used a private email or placeholder for your name. Update{' '}
              <Text style={styles.appleRelayHintStrong}>display name</Text>,{' '}
              <Text style={styles.appleRelayHintStrong}>first / last name</Text>, and your{' '}
              <Text style={styles.appleRelayHintStrong}>@handle</Text> below — then tap{' '}
              <Text style={styles.appleRelayHintStrong}>Save</Text> at the top.
            </Text>
          </View>
        ) : null}

        <Text style={styles.hintMuted}>
          Profile photo, banner, and music are on the <Text style={styles.hintStrong}>Look</Text> tab.
        </Text>

        <InputField accentColor={accentColor} label="Display Name" value={displayName} onChangeText={setDisplayName} />
        <InputField
          accentColor={accentColor}
          label="Username"
          value={username}
          onChangeText={(v) => setUsername(v.toLowerCase().replace(/[^a-z0-9._]/g, ''))}
          placeholder="lexi.rn"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <UsernameAvailabilityHint username={username} status={usernameStatus} />
        <InputField accentColor={accentColor} label="First Name" value={firstName} onChangeText={setFirstName} />
        <InputField accentColor={accentColor} label="Last Name" value={lastName} onChangeText={setLastName} />

        <View style={styles.bottomSpacer} />
      </View>

      {saving ? (
        <View style={styles.savingBar}>
          <ActivityIndicator size="small" color={accentColor} />
          <Text style={styles.savingBarText}>Saving profile…</Text>
        </View>
      ) : null}
    </View>
  );
});

function InputField({
  label,
  accentColor,
  value,
  onChangeText,
  multiline,
  keyboardType,
  placeholder,
  autoCapitalize,
  autoCorrect,
}: {
  label: string;
  accentColor: string;
  value: string;
  onChangeText: (v: string) => void;
  multiline?: boolean;
  keyboardType?: 'default' | 'number-pad' | 'url';
  placeholder?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
}) {
  return (
    <AccentComposerFrame
      accentColor={accentColor}
      hint={label}
      compact
      noShadow
      style={styles.fieldFrame}
    >
      <TextInput
        style={[styles.fieldInputPlain, multiline && styles.fieldMultiline]}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={colors.dark.textMuted}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
      />
    </AccentComposerFrame>
  );
}

function UsernameAvailabilityHint({
  username,
  status,
}: {
  username: string;
  status: 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'yours' | 'disallowed';
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
      {icon ? <Ionicons name={icon} size={13} color={tint} style={styles.handleHintIcon} /> : null}
      <Text style={[styles.fieldHint, { color: tint, flex: 1 }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { paddingHorizontal: 16, paddingTop: 4 },

  hintMuted: {
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.dark.textMuted,
    marginBottom: 14,
  },
  hintStrong: { fontWeight: '800', color: colors.dark.text },

  appleRelayHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    marginBottom: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(20,184,166,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(20,184,166,0.38)',
  },
  appleRelayHintText: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.dark.textSecondary,
  },
  appleRelayHintStrong: { fontWeight: '800', color: colors.dark.text },

  fieldFrame: { marginBottom: 16 },
  fieldHint: { fontSize: 12, color: colors.dark.textMuted, lineHeight: 17 },
  handleHintRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: -8,
    marginBottom: 16,
    paddingRight: 4,
  },
  handleHintIcon: { marginTop: 2 },
  fieldInputPlain: {
    paddingHorizontal: 4,
    paddingVertical: 6,
    fontSize: 15,
    color: colors.dark.text,
  },
  fieldMultiline: { height: 80, textAlignVertical: 'top' },

  bottomSpacer: { height: 32 },
  savingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  savingBarText: { fontSize: 13, fontWeight: '600', color: colors.dark.textMuted },
});
