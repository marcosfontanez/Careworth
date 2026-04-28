import React, { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Linking,
  Alert,
  AppState,
  ActivityIndicator,
  type AppStateStatus,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { colors, borderRadius, spacing } from '@/theme';
import type { UserProfile } from '@/types';
import { isLikelyDirectAudioUrl } from '@/lib/profileAudio';
import { searchITunesSongs } from '@/lib/music/itunesSearch';

const SKIP_MS = 15_000;
const WAVE_BAR_COUNT = 44;

/**
 * Session-level cache of `"<title>|<artist>" -> artworkUrl` iTunes lookups so
 * we only hit the network once per track across mounts. Module scope keeps it
 * alive while the JS bundle is loaded but resets on full reload.
 */
const artworkLookupCache = new Map<string, string>();

/** Lazy so a missing expo-audio native module never crashes the bundle. */
async function loadExpoAudio(): Promise<typeof import('expo-audio') | null> {
  try {
    return await import('expo-audio');
  } catch {
    return null;
  }
}

type AudioPlayerLike = {
  play: () => void;
  pause: () => void;
  release: () => void;
  seekTo: (seconds: number) => Promise<void> | void;
  readonly currentTime: number;
  readonly duration: number;
  readonly playing: boolean;
  readonly isLoaded: boolean;
  /**
   * `expo-audio` exposes `loop` as a writable property on the player.
   * Setting `player.loop = true` makes the track seamlessly restart at
   * the end, which is exactly what we want for the 30-second iTunes
   * preview clips used by Current Vibe.
   */
  loop: boolean;
  addListener: (
    event: 'playbackStatusUpdate',
    cb: (status: AudioStatusLike) => void,
  ) => { remove: () => void };
};

type AudioStatusLike = {
  isLoaded?: boolean;
  playing?: boolean;
  currentTime?: number;
  duration?: number;
  didJustFinish?: boolean;
};

interface Props {
  user: UserProfile;
  accent: string;
  profileViewAutoplay?: boolean;
  /** Show placeholder for owner when no song set. */
  alwaysShow?: boolean;
  onCustomize?: () => void;
}

/**
 * Current Vibe — a premium mini music player surfaced at the top of every
 * Pulse Page. Layout matches the reference mockup: kicker chip + overflow
 * at the top, artwork on the left, title/artist + progress waveform +
 * timestamps in the middle column, and prev/play/next transport on the right.
 */
export function FeaturedSoundCard({
  user,
  accent,
  profileViewAutoplay = true,
  alwaysShow = false,
  onCustomize,
}: Props) {
  const fs = user.featuredSound;
  const title = fs?.title ?? user.profileSongTitle ?? '';
  const artist = fs?.artist ?? user.profileSongArtist ?? '';
  const listenUrl = user.profileSongUrl?.trim() || '';
  /**
   * Cover art resolution order:
   *   1. `featuredSound.artworkUrl` (when a full sound object is attached)
   *   2. `profile.profileSongArtworkUrl` (set by the iTunes Song Picker)
   *   3. On-the-fly iTunes lookup using title + artist — rescues Current
   *      Vibes that were saved BEFORE the artwork column was added to the
   *      DB (so the user doesn't need to re-pick the song just to get art).
   *
   * The lookup lives behind a module-level cache keyed by title|artist so
   * we only make the network call once per unique track across mounts.
   */
  const persistedArtworkUrl = fs?.artworkUrl ?? user.profileSongArtworkUrl ?? '';
  const [lookedUpArtworkUrl, setLookedUpArtworkUrl] = useState('');
  const artworkUrl = persistedArtworkUrl || lookedUpArtworkUrl;
  const hasTrack = Boolean(title.trim() || artist.trim());

  useEffect(() => {
    const needsLookup = !persistedArtworkUrl && hasTrack;
    if (!needsLookup) {
      if (lookedUpArtworkUrl) setLookedUpArtworkUrl('');
      return;
    }
    const key = `${title.trim().toLowerCase()}|${artist.trim().toLowerCase()}`;
    const cached = artworkLookupCache.get(key);
    if (cached) {
      setLookedUpArtworkUrl(cached);
      return;
    }
    let cancelled = false;
    (async () => {
      const query = [title, artist].filter(Boolean).join(' ').trim();
      if (!query) return;
      try {
        const hits = await searchITunesSongs(query, 5);
        if (cancelled) return;
        const best = hits.find(
          (h) =>
            h.title.toLowerCase() === title.trim().toLowerCase() &&
            h.artist.toLowerCase() === artist.trim().toLowerCase(),
        ) ?? hits[0];
        const url = best?.artworkUrl ?? '';
        if (!url) return;
        artworkLookupCache.set(key, url);
        setLookedUpArtworkUrl(url);
      } catch {
        /* noop — fall through to gradient placeholder */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [persistedArtworkUrl, hasTrack, title, artist, lookedUpArtworkUrl]);

  const playerRef = useRef<AudioPlayerLike | null>(null);
  const listenerSubRef = useRef<{ remove: () => void } | null>(null);
  const seekingRef = useRef(false);
  /**
   * Mirror of the latest `looping` state so the boot effect can read it
   * without having to include `looping` in its dependency array (which
   * would tear down & rebuild the player on every toggle).
   */
  const loopingRef = useRef(true);

  const [playing, setPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [streamLoading, setStreamLoading] = useState(false);
  const [streamReady, setStreamReady] = useState(false);
  /**
   * Default the player to looping. iTunes previews are 30 seconds — without
   * looping the track stops mid-vibe, which feels broken on a profile that's
   * meant to be ambient. The user can tap the loop icon to toggle it off.
   */
  const [looping, setLooping] = useState(true);
  /**
   * True when the `expo-audio` native module couldn't be resolved at runtime
   * (typically happens in dev clients that were built before `expo-audio`
   * was added as a dependency). We use this to swap the play-button fallback
   * from "open URL in Safari" (bad UX for an `.m4a` preview — Safari just
   * downloads it) to an informative alert telling the owner how to fix it.
   */
  const [audioModuleMissing, setAudioModuleMissing] = useState(false);

  const streamable = Boolean(listenUrl && isLikelyDirectAudioUrl(listenUrl));
  const normalizedUrl = listenUrl.startsWith('http')
    ? listenUrl
    : listenUrl
      ? `https://${listenUrl}`
      : '';

  const onPlaybackStatus = useCallback((status: AudioStatusLike) => {
    if (!status.isLoaded) return;
    if (!seekingRef.current && typeof status.currentTime === 'number') {
      setPositionMs(Math.max(0, Math.round(status.currentTime * 1000)));
    }
    if (typeof status.duration === 'number' && status.duration > 0) {
      setDurationMs(Math.round(status.duration * 1000));
    }
    // When looping, the native player keeps `playing: true` and wraps
    // currentTime back to 0, so we don't clobber the playing flag on finish.
    if (status.didJustFinish && !playerRef.current?.loop) {
      setPlaying(false);
      setPositionMs(0);
    } else {
      setPlaying(Boolean(status.playing));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    function teardown() {
      try { listenerSubRef.current?.remove(); } catch { /* noop */ }
      listenerSubRef.current = null;
      const p = playerRef.current;
      playerRef.current = null;
      if (p) {
        try { p.pause(); } catch { /* noop */ }
        try { p.release(); } catch { /* noop */ }
      }
    }

    async function boot() {
      teardown();
      setPlaying(false);
      setPositionMs(0);
      setDurationMs(0);
      setStreamReady(false);
      setStreamLoading(false);

      if (!streamable || !normalizedUrl || !hasTrack) return;

      setStreamLoading(true);
      const expoAudio = await loadExpoAudio();
      if (!expoAudio) {
        // Native module missing from the installed dev client — any play
        // attempt will need to surface a rebuild hint instead of opening
        // Safari with a bare `.m4a` URL.
        setAudioModuleMissing(true);
        setStreamLoading(false);
        return;
      }
      if (cancelled) {
        setStreamLoading(false);
        return;
      }

      try {
        await expoAudio.setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: false,
        });

        const player = expoAudio.createAudioPlayer(
          { uri: normalizedUrl },
          { updateInterval: 500 },
        ) as unknown as AudioPlayerLike;

        if (cancelled) {
          try { player.release(); } catch { /* noop */ }
          return;
        }

        // Apply the current loop preference to the freshly created player.
        try { player.loop = loopingRef.current; } catch { /* noop */ }

        listenerSubRef.current = player.addListener('playbackStatusUpdate', onPlaybackStatus);
        playerRef.current = player;
        setAudioModuleMissing(false);
        setStreamReady(true);
        setStreamLoading(false);

        if (profileViewAutoplay) {
          try { player.play(); } catch { /* noop */ }
          setPlaying(true);
        }
      } catch {
        teardown();
        setStreamLoading(false);
        setStreamReady(false);
      }
    }

    void boot();

    return () => {
      cancelled = true;
      teardown();
    };
  }, [normalizedUrl, streamable, hasTrack, profileViewAutoplay, onPlaybackStatus]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next !== 'active' && playerRef.current) {
        try { playerRef.current.pause(); } catch { /* noop */ }
      }
    });
    return () => sub.remove();
  }, []);

  /**
   * Keep the live player's `loop` flag in sync with the toggle without
   * tearing the whole player down (which would stop playback). The native
   * module handles the seamless wrap-around itself once `loop` is true.
   */
  useEffect(() => {
    loopingRef.current = looping;
    const p = playerRef.current;
    if (!p) return;
    try { p.loop = looping; } catch { /* noop */ }
  }, [looping]);

  /**
   * Pause playback whenever the hosting screen loses focus (tab switch,
   * navigating to another route, modal pushed on top). Without this the
   * Current Vibe track keeps playing while the user scrolls Feed / Circles
   * / Live / etc., which is disorienting and violates the "ambient on your
   * page, silent everywhere else" contract.
   *
   * The cleanup function runs on blur AND on unmount, which is exactly what
   * we want — one hook covers both cases.
   */
  useFocusEffect(
    useCallback(() => {
      return () => {
        const p = playerRef.current;
        if (!p) return;
        try {
          if (p.isLoaded && p.playing) p.pause();
        } catch {
          /* noop */
        }
        setPlaying(false);
      };
    }, []),
  );

  const openExternalListen = useCallback(async () => {
    if (!listenUrl) return;
    const u = listenUrl.startsWith('http') ? listenUrl : `https://${listenUrl}`;
    try {
      const ok = await Linking.canOpenURL(u);
      if (ok) await Linking.openURL(u);
      else Alert.alert('Cannot open link', 'Check the listen URL in Customize My Pulse.');
    } catch {
      Alert.alert('Cannot open link', 'Check the listen URL in Customize My Pulse.');
    }
  }, [listenUrl]);

  const togglePlayback = useCallback(async () => {
    if (!hasTrack) {
      onCustomize?.();
      return;
    }
    const p = playerRef.current;
    if (streamable && p) {
      try {
        if (p.isLoaded) {
          if (p.playing) p.pause();
          else p.play();
        }
      } catch {
        Alert.alert('Playback', 'Could not play this audio URL.');
      }
      return;
    }

    /**
     * Streamable URL (direct `.m4a` / `.mp3`) but the native audio module
     * isn't available in this dev client build. Opening the URL in Safari
     * would just download a silent `.m4a` — useless — so we show a
     * rebuild hint instead.
     */
    if (streamable && audioModuleMissing) {
      Alert.alert(
        'In-app playback unavailable',
        'Your dev client build doesn\'t include the audio module. Rebuild the dev client (`npx expo run:ios` or an EAS dev build) to enable Current Vibe playback. The song picker will still work.',
      );
      return;
    }

    /**
     * Non-streamable link (Spotify / Apple Music / YouTube / etc.) — these
     * are designed to open in their own app and have a real UI there.
     */
    if (listenUrl && !streamable) {
      await openExternalListen();
      return;
    }

    Alert.alert(
      'Current Vibe',
      'Pick a song from ⋯ → Customize My Pulse → Current vibe to enable in-app playback.',
    );
  }, [hasTrack, streamable, listenUrl, openExternalListen, onCustomize, audioModuleMissing]);

  const skipBy = useCallback(async (deltaMs: number) => {
    const p = playerRef.current;
    if (!p || !streamReady) return;
    try {
      if (!p.isLoaded) return;
      const currentMs = Math.round((p.currentTime ?? 0) * 1000);
      const playerDurMs = Math.round((p.duration ?? 0) * 1000);
      const dur = (playerDurMs > 0 ? playerDurMs : durationMs) || 0;
      const next = Math.max(0, Math.min(dur || Number.MAX_SAFE_INTEGER, currentMs + deltaMs));
      await p.seekTo(next / 1000);
      setPositionMs(next);
    } catch {
      /* noop */
    }
  }, [streamReady, durationMs]);

  if (!hasTrack && !alwaysShow) return null;

  const displayTitle =
    title.trim() || (alwaysShow && !hasTrack ? 'Add your Current Vibe' : '');
  const displayArtist =
    artist.trim() || (alwaysShow && !hasTrack ? 'Use ⋯ → Customize My Pulse' : '');

  const iconName = playing ? 'pause' : 'play';
  const progress =
    durationMs > 0 ? Math.min(1, Math.max(0, positionMs / durationMs)) : 0;

  return (
    <View
      style={[
        styles.card,
        { borderColor: 'rgba(255,255,255,0.09)' },
        Platform.OS === 'ios'
          ? {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.22,
              shadowRadius: 20,
            }
          : { elevation: 6 },
      ]}
    >
      <LinearGradient
        colors={['rgba(20,184,166,0.10)', 'rgba(15,28,48,0.96)', colors.dark.card]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.inner}
      >
        <View style={styles.headRow}>
          <View style={styles.kickerChip}>
            <Ionicons name="musical-notes" size={12} color={colors.primary.teal} />
            <Text style={styles.kickerText}>Current Vibe</Text>
            {playing ? <LiveEqIndicator accent={colors.primary.teal} /> : null}
          </View>
          <View style={styles.headActions}>
            <TouchableOpacity
              style={[
                styles.loopBtn,
                looping && {
                  backgroundColor: accent + '22',
                  borderColor: accent + '88',
                },
              ]}
              onPress={() => setLooping((v) => !v)}
              hitSlop={8}
              accessibilityLabel={looping ? 'Disable repeat' : 'Enable repeat'}
            >
              <Ionicons
                name="repeat"
                size={13}
                color={looping ? accent : colors.dark.textMuted}
              />
            </TouchableOpacity>
            {onCustomize ? (
              <TouchableOpacity
                style={styles.menuBtn}
                onPress={onCustomize}
                hitSlop={10}
                accessibilityLabel="Customize Current Vibe"
              >
                <Ionicons
                  name="ellipsis-horizontal"
                  size={16}
                  color={colors.dark.textMuted}
                />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <View style={styles.mainRow}>
          <View style={styles.artworkWrap}>
            {/* Soft accent halo behind the artwork */}
            <View
              style={[
                styles.artworkHalo,
                { backgroundColor: accent + '22', shadowColor: accent },
              ]}
            />
            <View style={styles.artwork}>
              {streamLoading ? (
                <View style={[styles.art, styles.artLoading]}>
                  <ActivityIndicator color={accent} />
                </View>
              ) : artworkUrl ? (
                <Image source={{ uri: artworkUrl }} style={styles.art} contentFit="cover" />
              ) : (
                <LinearGradient
                  colors={[accent + 'AA', accent + '33', colors.dark.cardAlt]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.art}
                >
                  <Ionicons name="musical-notes" size={28} color="#FFF" />
                </LinearGradient>
              )}
              {/* Subtle sheen overlay for premium feel */}
              <LinearGradient
                colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.artSheen}
              />
            </View>
          </View>

          <View style={styles.middle}>
            <Text
              style={[styles.title, !hasTrack && styles.placeholderText]}
              numberOfLines={1}
            >
              {displayTitle || 'Nothing playing'}
            </Text>
            <Text
              style={[styles.artist, !hasTrack && styles.placeholderMuted]}
              numberOfLines={1}
            >
              {displayArtist}
            </Text>

            <Waveform progress={progress} accent={accent} samples={fs?.waveformData} />
          </View>

          <View style={styles.transport}>
            <TouchableOpacity
              style={styles.skipBtn}
              onPress={() => skipBy(-SKIP_MS)}
              hitSlop={8}
              disabled={!streamReady}
              accessibilityLabel="Skip back 15s"
            >
              <Ionicons
                name="play-skip-back"
                size={18}
                color={streamReady ? colors.dark.text : colors.dark.textMuted}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.playBtn,
                { borderColor: accent + '66', shadowColor: accent },
              ]}
              activeOpacity={0.85}
              onPress={togglePlayback}
              accessibilityLabel={playing ? 'Pause' : 'Play'}
            >
              <LinearGradient
                colors={[accent, '#0EA39A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.playBtnInner}
              >
                <Ionicons name={iconName} size={20} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.skipBtn}
              onPress={() => skipBy(SKIP_MS)}
              hitSlop={8}
              disabled={!streamReady}
              accessibilityLabel="Skip forward 15s"
            >
              <Ionicons
                name="play-skip-forward"
                size={18}
                color={streamReady ? colors.dark.text : colors.dark.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

/** Tiny three-bar equalizer that animates subtly while playback is active. */
function LiveEqIndicator({ accent }: { accent: string }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => (t + 1) % 4), 220);
    return () => clearInterval(id);
  }, []);
  const heights = useMemo(
    () => [
      [6, 10, 14, 8][tick % 4],
      [12, 6, 10, 14][tick % 4],
      [8, 14, 6, 12][tick % 4],
    ],
    [tick],
  );
  return (
    <View style={eqStyles.row}>
      {heights.map((h, i) => (
        <View
          key={i}
          style={[eqStyles.bar, { height: h, backgroundColor: accent }]}
        />
      ))}
    </View>
  );
}

function Waveform({
  progress,
  accent,
  samples,
}: {
  progress: number;
  accent: string;
  samples?: number[];
}) {
  const bars = useMemo(() => {
    if (samples?.length) return samples.slice(0, WAVE_BAR_COUNT);
    // Deterministic pseudo-waveform so the visualization feels stable (no flicker).
    const out: number[] = [];
    for (let i = 0; i < WAVE_BAR_COUNT; i += 1) {
      const t = i / WAVE_BAR_COUNT;
      out.push(
        0.35 +
          0.4 * Math.abs(Math.sin(t * Math.PI * 3.1)) +
          0.2 * Math.abs(Math.cos(t * Math.PI * 4.7)),
      );
    }
    return out;
  }, [samples]);

  return (
    <View style={waveStyles.row}>
      {bars.map((h, i) => {
        const playheadIndex = progress * bars.length;
        const playheadDist = Math.abs(i - playheadIndex);
        const isHead = playheadDist < 0.7;
        const played = i / bars.length <= progress;
        // Now drives a much taller, more expressive waveform. We push the
        // amplitude range harder (min 6, max ~28) so the visualization reads
        // as the primary progress indicator — matching the reference mockup
        // where the waveform replaces the MM:SS clock line entirely.
        const baseHeight = 6 + h * 22;
        const height = isHead ? Math.min(32, baseHeight + 4) : baseHeight;
        return (
          <View
            key={i}
            style={[
              waveStyles.bar,
              {
                height,
                backgroundColor: played
                  ? isHead
                    ? '#FFFFFF'
                    : accent
                  : 'rgba(255,255,255,0.18)',
                opacity: played ? 1 : 0.85,
                ...(played
                  ? Platform.select({
                      ios: {
                        shadowColor: accent,
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.55,
                        shadowRadius: 3,
                      },
                      android: { elevation: 0 },
                    })
                  : null),
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
    borderRadius: borderRadius['3xl'],
    borderWidth: 1,
    overflow: 'hidden',
  },
  inner: {
    paddingHorizontal: 14,
    paddingTop: 11,
    paddingBottom: 14,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  kickerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.chip,
    backgroundColor: 'rgba(20,184,166,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(20,184,166,0.35)',
  },
  kickerText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: colors.primary.teal,
    textTransform: 'uppercase',
  },
  menuBtn: {
    padding: 4,
  },
  headActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  loopBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  artworkWrap: {
    position: 'relative',
    width: 74,
    height: 74,
  },
  artworkHalo: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: -1,
    bottom: -1,
    borderRadius: borderRadius.xl,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.45,
        shadowRadius: 18,
      },
      android: { elevation: 8 },
    }),
  },
  artwork: {
    width: 74,
    height: 74,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  art: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  artSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
    pointerEvents: 'none',
  },
  artLoading: {
    backgroundColor: colors.dark.cardAlt,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  middle: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 15.5,
    fontWeight: '800',
    color: colors.dark.text,
    letterSpacing: -0.2,
  },
  placeholderText: { opacity: 0.85 },
  artist: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: colors.dark.textSecondary,
    letterSpacing: 0.1,
  },
  placeholderMuted: { opacity: 0.7 },
  transport: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  skipBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.45,
        shadowRadius: 10,
      },
      android: { elevation: 6 },
    }),
  },
  playBtnInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const eqStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    marginLeft: 4,
    height: 14,
  },
  bar: {
    width: 2,
    borderRadius: 1,
    minHeight: 4,
  },
});

const waveStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 10,
    height: 36,
    paddingHorizontal: 0,
  },
  bar: {
    flex: 1,
    maxWidth: 3,
    borderRadius: 1.5,
    minHeight: 4,
  },
});
