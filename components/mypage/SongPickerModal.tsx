import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors, borderRadius, spacing } from '@/theme';
import {
  searchITunesSongs,
  searchITunesAlbums,
  searchITunesArtists,
  lookupITunesSongs,
  type ITunesSongHit,
  type ITunesAlbumHit,
  type ITunesArtistHit,
} from '@/lib/music/itunesSearch';
import { audioPreview, type AudioPreviewState } from '@/lib/audioPreview';

export interface PickedSong {
  title: string;
  artist: string;
  /** Direct 30-second .m4a URL (plays in-app). */
  previewUrl: string;
  /** 600x600 album artwork from iTunes. */
  artworkUrl: string;
  /** Apple deep link, kept as an external-open fallback. */
  trackViewUrl: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (song: PickedSong) => void;
  /** Optional initial search — usually the current song's title. */
  initialQuery?: string;
}

/** Max per iTunes Search request (API allows up to 200; 50 is a practical page). */
const PAGE_SIZE = 50;

type BrowseTab = 'songs' | 'albums' | 'artists';

type Drill =
  | { kind: 'album'; collectionId: number; title: string }
  | { kind: 'artist'; artistId: number; name: string };

type ListRow =
  | { kind: 'song'; song: ITunesSongHit }
  | { kind: 'album'; album: ITunesAlbumHit }
  | { kind: 'artist'; artist: ITunesArtistHit };

/**
 * Current Vibe song picker.
 *
 * Opens as a full-screen modal with debounced iTunes search, artwork-rich
 * rows, and a one-tap 30-second preview. Modes: **Songs** (paginated),
 * **Albums** and **Artists** (search → pick a row → previewable tracks).
 */
export function SongPickerModal({ visible, onClose, onSelect, initialQuery }: Props) {
  const [query, setQuery] = useState(initialQuery ?? '');
  const [browseTab, setBrowseTab] = useState<BrowseTab>('songs');
  const [drill, setDrill] = useState<Drill | null>(null);
  const [songs, setSongs] = useState<ITunesSongHit[]>([]);
  const [albums, setAlbums] = useState<ITunesAlbumHit[]>([]);
  const [artists, setArtists] = useState<ITunesArtistHit[]>([]);
  const [songNextOffset, setSongNextOffset] = useState(0);
  const [songHasMore, setSongHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ITunesSongHit | null>(null);
  const [audioState, setAudioState] = useState<AudioPreviewState>(audioPreview.getState());

  const searchTokenRef = useRef(0);
  const drillTokenRef = useRef(0);
  const inputRef = useRef<TextInput | null>(null);

  useEffect(() => {
    if (!visible) return;
    const unsub = audioPreview.subscribe(setAudioState);
    return () => {
      unsub();
    };
  }, [visible]);

  useEffect(() => {
    if (visible) {
      setQuery(initialQuery ?? '');
      setBrowseTab('songs');
      setDrill(null);
      setSongs([]);
      setAlbums([]);
      setArtists([]);
      setSongNextOffset(0);
      setSongHasMore(false);
      setError(null);
      setSelected(null);
      void audioPreview.stop();
      const t = setTimeout(() => inputRef.current?.focus(), 250);
      return () => clearTimeout(t);
    }
    void audioPreview.stop();
    return undefined;
  }, [visible, initialQuery]);

  /** Search / browse (disabled while drilling into an album or artist). */
  useEffect(() => {
    if (!visible || drill) return;
    const q = query.trim();
    if (!q) {
      setSongs([]);
      setAlbums([]);
      setArtists([]);
      setSongNextOffset(0);
      setSongHasMore(false);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const myToken = ++searchTokenRef.current;
    const timer = setTimeout(async () => {
      if (browseTab === 'songs') {
        const hits = await searchITunesSongs(q, { limit: PAGE_SIZE, offset: 0 });
        if (myToken !== searchTokenRef.current) return;
        setSongs(hits);
        setSongNextOffset(PAGE_SIZE);
        setSongHasMore(hits.length === PAGE_SIZE);
        setError(
          hits.length === 0 ? 'No songs with previews found. Try Albums / Artists or another query.' : null,
        );
      } else if (browseTab === 'albums') {
        const hits = await searchITunesAlbums(q, { limit: PAGE_SIZE, offset: 0 });
        if (myToken !== searchTokenRef.current) return;
        setAlbums(hits);
        setError(hits.length === 0 ? 'No albums found. Try another title.' : null);
      } else {
        const hits = await searchITunesArtists(q, { limit: PAGE_SIZE, offset: 0 });
        if (myToken !== searchTokenRef.current) return;
        setArtists(hits);
        setError(hits.length === 0 ? 'No artists found. Try another name.' : null);
      }
      setLoading(false);
    }, 350);

    return () => clearTimeout(timer);
  }, [query, visible, browseTab, drill]);

  /** Load tracks after user picks an album or artist. */
  useEffect(() => {
    if (!visible || !drill) return;
    const myToken = ++drillTokenRef.current;
    setLoading(true);
    setError(null);
    setSelected(null);
    void audioPreview.stop();
    void (async () => {
      const hits =
        drill.kind === 'album'
          ? await lookupITunesSongs({ collectionId: drill.collectionId, limit: 200 })
          : await lookupITunesSongs({ artistId: drill.artistId, limit: 200 });
      if (myToken !== drillTokenRef.current) return;
      setSongs(hits);
      setSongHasMore(false);
      setError(
        hits.length === 0
          ? 'No tracks with previews for this selection. Try another album or artist.'
          : null,
      );
      setLoading(false);
    })();
  }, [visible, drill]);

  const listRows: ListRow[] = useMemo(() => {
    if (drill || browseTab === 'songs') {
      return songs.map((song) => ({ kind: 'song' as const, song }));
    }
    if (browseTab === 'albums') {
      return albums.map((album) => ({ kind: 'album' as const, album }));
    }
    return artists.map((artist) => ({ kind: 'artist' as const, artist }));
  }, [drill, browseTab, songs, albums, artists]);

  const onLoadMoreSongs = useCallback(async () => {
    if (!visible || drill || browseTab !== 'songs' || loading || loadingMore || !songHasMore) {
      return;
    }
    const q = query.trim();
    if (!q) return;
    setLoadingMore(true);
    const hits = await searchITunesSongs(q, { limit: PAGE_SIZE, offset: songNextOffset });
    setSongs((prev) => [...prev, ...hits]);
    setSongNextOffset((o) => o + PAGE_SIZE);
    setSongHasMore(hits.length === PAGE_SIZE);
    setLoadingMore(false);
  }, [visible, drill, browseTab, loading, loadingMore, songHasMore, query, songNextOffset]);

  const exitDrill = useCallback(() => {
    Haptics.selectionAsync().catch(() => undefined);
    void audioPreview.stop();
    setSelected(null);
    setDrill(null);
    setSongs([]);
  }, []);

  const onPickTab = useCallback((tab: BrowseTab) => {
    Haptics.selectionAsync().catch(() => undefined);
    void audioPreview.stop();
    setSelected(null);
    setDrill(null);
    setBrowseTab(tab);
    setSongs([]);
    setAlbums([]);
    setArtists([]);
    setSongNextOffset(0);
    setSongHasMore(false);
    setError(null);
  }, []);

  const onRowTogglePreview = useCallback(async (hit: ITunesSongHit) => {
    Haptics.selectionAsync().catch(() => undefined);
    setSelected(hit);
    await audioPreview.toggle(hit.id, hit.previewUrl);
  }, []);

  const onConfirm = useCallback(() => {
    if (!selected) return;
    void audioPreview.stop();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    onSelect({
      title: selected.title,
      artist: selected.artist,
      previewUrl: selected.previewUrl,
      artworkUrl: selected.artworkUrl,
      trackViewUrl: selected.trackViewUrl,
    });
    onClose();
  }, [selected, onSelect, onClose]);

  const canConfirm = Boolean(selected);

  const renderRow = useCallback(
    ({ item }: { item: ListRow }) => {
      if (item.kind === 'song') {
        const hit = item.song;
        const isSelected = selected?.id === hit.id;
        const isActivePreview = audioState.activeId === hit.id && audioState.isPlaying;
        const isLoadingPreview = audioState.activeId === hit.id && audioState.isLoading;

        return (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => onRowTogglePreview(hit)}
            style={[styles.row, isSelected && styles.rowSelected]}
          >
            <View style={styles.rowArtworkWrap}>
              {hit.artworkUrl ? (
                <Image
                  source={{ uri: hit.artworkUrl }}
                  style={styles.rowArtwork}
                  contentFit="cover"
                  transition={120}
                />
              ) : (
                <View style={[styles.rowArtwork, styles.rowArtworkPh]}>
                  <Ionicons name="musical-notes" size={20} color="#FFF" />
                </View>
              )}
              <View style={styles.rowArtworkOverlay}>
                {isLoadingPreview ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Ionicons name={isActivePreview ? 'pause' : 'play'} size={18} color="#FFF" />
                )}
              </View>
            </View>

            <View style={styles.rowText}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {hit.title || 'Untitled'}
              </Text>
              <Text style={styles.rowArtist} numberOfLines={1}>
                {hit.artist || 'Unknown artist'}
              </Text>
            </View>

            {isSelected ? (
              <View style={styles.checkPill}>
                <Ionicons name="checkmark" size={14} color={colors.primary.teal} />
              </View>
            ) : null}
          </TouchableOpacity>
        );
      }

      if (item.kind === 'album') {
        const a = item.album;
        return (
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.row}
            onPress={() => {
              Haptics.selectionAsync().catch(() => undefined);
              void audioPreview.stop();
              setSelected(null);
              setDrill({ kind: 'album', collectionId: a.collectionId, title: a.title });
            }}
          >
            <View style={styles.rowArtworkWrap}>
              {a.artworkUrl ? (
                <Image
                  source={{ uri: a.artworkUrl }}
                  style={styles.rowArtwork}
                  contentFit="cover"
                  transition={120}
                />
              ) : (
                <View style={[styles.rowArtwork, styles.rowArtworkPh]}>
                  <Ionicons name="albums-outline" size={20} color="#FFF" />
                </View>
              )}
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {a.title}
              </Text>
              <Text style={styles.rowArtist} numberOfLines={1}>
                {a.artist || 'Album'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.dark.textMuted} />
          </TouchableOpacity>
        );
      }

      const ar = item.artist;
      return (
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.row}
          onPress={() => {
            Haptics.selectionAsync().catch(() => undefined);
            void audioPreview.stop();
            setSelected(null);
            setDrill({ kind: 'artist', artistId: ar.artistId, name: ar.name });
          }}
        >
          <View style={styles.rowArtworkWrap}>
            {ar.artworkUrl ? (
              <Image
                source={{ uri: ar.artworkUrl }}
                style={styles.rowArtwork}
                contentFit="cover"
                transition={120}
              />
            ) : (
              <View style={[styles.rowArtwork, styles.rowArtworkPh]}>
                <Ionicons name="person-outline" size={20} color="#FFF" />
              </View>
            )}
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {ar.name}
            </Text>
            <Text style={styles.rowArtist} numberOfLines={1}>
              Artist
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.dark.textMuted} />
        </TouchableOpacity>
      );
    },
    [audioState, onRowTogglePreview, selected],
  );

  const keyExtractor = useCallback((item: ListRow) => {
    if (item.kind === 'song') return `s-${item.song.id}`;
    if (item.kind === 'album') return `a-${item.album.id}`;
    return `r-${item.artist.id}`;
  }, []);

  const listHeader = useMemo(
    () => (
      <View style={styles.searchWrap}>
        {drill ? (
          <TouchableOpacity style={styles.drillBack} onPress={exitDrill} activeOpacity={0.85}>
            <Ionicons name="chevron-back" size={22} color={colors.primary.teal} />
            <Text style={styles.drillBackText} numberOfLines={1}>
              {drill.kind === 'album' ? drill.title : drill.name}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.modeRow}>
            {(
              [
                { key: 'songs' as const, label: 'Songs' },
                { key: 'albums' as const, label: 'Albums' },
                { key: 'artists' as const, label: 'Artists' },
              ] as const
            ).map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[styles.modeChip, browseTab === key && styles.modeChipOn]}
                onPress={() => onPickTab(key)}
                activeOpacity={0.85}
              >
                <Text style={[styles.modeChipText, browseTab === key && styles.modeChipTextOn]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={colors.dark.textMuted} />
          <TextInput
            ref={inputRef}
            style={[styles.searchInput, drill && styles.searchInputDisabled]}
            value={query}
            onChangeText={setQuery}
            placeholder={drill ? 'Search disabled — go back to browse' : 'Search songs, albums, or artists'}
            placeholderTextColor={colors.dark.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            editable={!drill}
          />
          {query.length > 0 && !drill ? (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.dark.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
        <Text style={styles.searchHint}>
          {drill
            ? 'Tracks below have 30s previews when available in your region.'
            : browseTab === 'songs'
              ? `Up to ${PAGE_SIZE} per page — load more at the bottom. Only songs with previews can be your vibe.`
              : browseTab === 'albums'
                ? 'Pick an album, then choose a track with a preview.'
                : 'Pick an artist, then choose a track with a preview.'}
        </Text>
      </View>
    ),
    [query, browseTab, drill, exitDrill, onPickTab],
  );

  const listFooter = useMemo(() => {
    if (drill || browseTab !== 'songs' || !songHasMore || !query.trim()) return null;
    return (
      <TouchableOpacity
        style={styles.loadMoreBtn}
        onPress={onLoadMoreSongs}
        disabled={loadingMore}
        activeOpacity={0.85}
      >
        {loadingMore ? (
          <ActivityIndicator color={colors.primary.teal} />
        ) : (
          <Text style={styles.loadMoreText}>Load more songs</Text>
        )}
      </TouchableOpacity>
    );
  }, [drill, browseTab, songHasMore, query, loadingMore, onLoadMoreSongs]);

  const emptyHintForTab = !drill
    ? browseTab === 'songs'
      ? 'Search for a song or artist, or switch to Albums / Artists.'
      : browseTab === 'albums'
        ? 'Search for an album name, then open it to see tracks.'
        : 'Search for an artist, then open them to see tracks.'
    : 'Try another album or artist — not every release has preview clips.';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.sheet}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <LinearGradient
          colors={['rgba(20,184,166,0.14)', 'rgba(15,28,48,0.98)', colors.dark.bg]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.headerBtn}>
            <Ionicons name="close" size={24} color={colors.dark.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <View style={styles.headerKicker}>
              <Ionicons name="musical-notes" size={11} color={colors.primary.teal} />
              <Text style={styles.headerKickerText}>Current Vibe</Text>
            </View>
            <Text style={styles.headerTitle}>Pick your song</Text>
          </View>
          <TouchableOpacity
            onPress={onConfirm}
            disabled={!canConfirm}
            hitSlop={12}
            style={[styles.headerBtn, styles.doneBtn, !canConfirm && styles.doneBtnDisabled]}
          >
            <Text style={[styles.doneText, !canConfirm && styles.doneTextDisabled]}>Set</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={listRows}
          keyExtractor={keyExtractor}
          renderItem={renderRow}
          ListHeaderComponent={listHeader}
          ListHeaderComponentStyle={styles.headerSpacer}
          ListFooterComponent={listFooter}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              {loading ? (
                <>
                  <ActivityIndicator color={colors.primary.teal} />
                  <Text style={styles.emptyText}>Searching…</Text>
                </>
              ) : error ? (
                <>
                  <Ionicons name="musical-note-outline" size={28} color={colors.dark.textMuted} />
                  <Text style={styles.emptyText}>{error}</Text>
                </>
              ) : (
                <>
                  <Ionicons name="musical-notes-outline" size={28} color={colors.dark.textMuted} />
                  <Text style={styles.emptyText}>
                    {query.trim() ? 'Nothing to show yet.' : 'Search for music to get started.'}
                  </Text>
                  <Text style={styles.emptyHint}>{emptyHintForTab}</Text>
                </>
              )}
            </View>
          }
        />

        {selected ? (
          <View style={styles.selectedBar}>
            <Image source={{ uri: selected.artworkUrl }} style={styles.selectedArt} contentFit="cover" />
            <View style={styles.selectedText}>
              <Text style={styles.selectedTitle} numberOfLines={1}>
                {selected.title}
              </Text>
              <Text style={styles.selectedArtist} numberOfLines={1}>
                {selected.artist}
              </Text>
            </View>
            <TouchableOpacity style={styles.selectedConfirm} onPress={onConfirm} activeOpacity={0.85}>
              <LinearGradient
                colors={[colors.primary.teal, '#0EA39A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.selectedConfirmInner}
              >
                <Ionicons name="checkmark" size={16} color="#FFF" />
                <Text style={styles.selectedConfirmText}>Set as Vibe</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: colors.dark.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  headerBtn: {
    minWidth: 46,
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  headerKicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.chip,
    backgroundColor: 'rgba(20,184,166,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(20,184,166,0.35)',
  },
  headerKickerText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary.teal,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  headerTitle: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '800',
    color: colors.dark.text,
    letterSpacing: -0.2,
  },
  doneBtn: {
    alignItems: 'flex-end',
  },
  doneBtnDisabled: {
    opacity: 0.45,
  },
  doneText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary.teal,
    letterSpacing: 0.3,
  },
  doneTextDisabled: {
    color: colors.dark.textMuted,
  },

  headerSpacer: {
    paddingBottom: 4,
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  modeChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  modeChipOn: {
    backgroundColor: 'rgba(20,184,166,0.14)',
    borderColor: 'rgba(20,184,166,0.45)',
  },
  modeChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.dark.textMuted,
  },
  modeChipTextOn: {
    color: colors.primary.teal,
  },
  drillBack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  drillBackText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: colors.dark.text,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.dark.text,
    padding: 0,
  },
  searchInputDisabled: {
    opacity: 0.55,
  },
  searchHint: {
    marginTop: 8,
    marginBottom: 10,
    fontSize: 12,
    color: colors.dark.textMuted,
    lineHeight: 17,
  },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 140,
  },

  loadMoreBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 4,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary.teal,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 8,
  },
  rowSelected: {
    backgroundColor: 'rgba(20,184,166,0.12)',
    borderColor: 'rgba(20,184,166,0.55)',
  },
  rowArtworkWrap: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  rowArtwork: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.dark.cardAlt,
  },
  rowArtworkPh: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.teal + '55',
  },
  rowArtworkOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: colors.dark.text,
    letterSpacing: -0.1,
  },
  rowArtist: {
    marginTop: 2,
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.dark.textSecondary,
  },
  checkPill: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20,184,166,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(20,184,166,0.55)',
  },

  emptyWrap: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 50,
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.dark.text,
    textAlign: 'center',
  },
  emptyHint: {
    marginTop: -4,
    fontSize: 12,
    color: colors.dark.textMuted,
    textAlign: 'center',
    lineHeight: 17,
    maxWidth: 280,
  },

  selectedBar: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
    paddingRight: 6,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: 'rgba(20,184,166,0.45)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.35,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 10 },
    }),
  },
  selectedArt: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.dark.cardAlt,
  },
  selectedText: {
    flex: 1,
    minWidth: 0,
  },
  selectedTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: colors.dark.text,
  },
  selectedArtist: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: colors.dark.textMuted,
  },
  selectedConfirm: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  selectedConfirmInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  selectedConfirmText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.3,
  },
});
