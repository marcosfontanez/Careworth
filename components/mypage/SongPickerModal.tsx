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
import { searchITunesSongs, type ITunesSongHit } from '@/lib/music/itunesSearch';
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

/**
 * Current Vibe song picker.
 *
 * Opens as a full-screen modal with a debounced iTunes search, artwork-rich
 * result rows, and a one-tap 30-second preview so the owner hears the
 * track before committing. "Set as Current Vibe" returns the selected
 * track to the parent screen, which persists it onto the profile.
 *
 * Why iTunes Search (vs Spotify / Apple Music API)?
 *   - Free, no auth, global availability
 *   - Public `.m4a` preview URLs autoplay in our `FeaturedSoundCard`
 *     without needing SDK integration
 *   - Artwork, canonical track names, and Apple deep-links come for free
 */
export function SongPickerModal({ visible, onClose, onSelect, initialQuery }: Props) {
  const [query, setQuery] = useState(initialQuery ?? '');
  const [results, setResults] = useState<ITunesSongHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ITunesSongHit | null>(null);
  const [audioState, setAudioState] = useState<AudioPreviewState>(audioPreview.getState());

  const searchTokenRef = useRef(0);
  const inputRef = useRef<TextInput | null>(null);

  useEffect(() => {
    if (!visible) return;
    const unsub = audioPreview.subscribe(setAudioState);
    return () => {
      unsub();
    };
  }, [visible]);

  /**
   * Reset state on every modal open so the user always starts from a
   * clean slate. Also stop any preview that was still playing from a
   * previous session — the search screen uses the same `audioPreview`
   * singleton and we don't want to resume its track here.
   */
  useEffect(() => {
    if (visible) {
      setQuery(initialQuery ?? '');
      setResults([]);
      setError(null);
      setSelected(null);
      void audioPreview.stop();
      const t = setTimeout(() => inputRef.current?.focus(), 250);
      return () => clearTimeout(t);
    } else {
      void audioPreview.stop();
    }
  }, [visible, initialQuery]);

  /**
   * Debounced search. We tag each request with a monotonic token and
   * discard any response whose token no longer matches the most
   * recent keystroke so fast typing can't clobber newer results with
   * older ones.
   */
  useEffect(() => {
    if (!visible) return;
    const q = query.trim();
    if (!q) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const myToken = ++searchTokenRef.current;
    const timer = setTimeout(async () => {
      const hits = await searchITunesSongs(q, 25);
      if (myToken !== searchTokenRef.current) return;
      setResults(hits);
      setError(hits.length === 0 ? 'No songs found. Try a different title or artist.' : null);
      setLoading(false);
    }, 350);

    return () => clearTimeout(timer);
  }, [query, visible]);

  const onRowTogglePreview = useCallback(async (hit: ITunesSongHit) => {
    Haptics.selectionAsync().catch(() => undefined);
    setSelected(hit);
    await audioPreview.toggle(hit.id, hit.previewUrl);
  }, []);

  const onConfirm = useCallback(() => {
    if (!selected) return;
    void audioPreview.stop();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => undefined,
    );
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

  const renderItem = useCallback(
    ({ item }: { item: ITunesSongHit }) => {
      const isSelected = selected?.id === item.id;
      const isActivePreview =
        audioState.activeId === item.id && audioState.isPlaying;
      const isLoadingPreview =
        audioState.activeId === item.id && audioState.isLoading;

      return (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => onRowTogglePreview(item)}
          style={[styles.row, isSelected && styles.rowSelected]}
        >
          <View style={styles.rowArtworkWrap}>
            {item.artworkUrl ? (
              <Image
                source={{ uri: item.artworkUrl }}
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
                <Ionicons
                  name={isActivePreview ? 'pause' : 'play'}
                  size={18}
                  color="#FFF"
                />
              )}
            </View>
          </View>

          <View style={styles.rowText}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {item.title || 'Untitled'}
            </Text>
            <Text style={styles.rowArtist} numberOfLines={1}>
              {item.artist || 'Unknown artist'}
            </Text>
          </View>

          {isSelected ? (
            <View style={styles.checkPill}>
              <Ionicons name="checkmark" size={14} color={colors.primary.teal} />
            </View>
          ) : null}
        </TouchableOpacity>
      );
    },
    [audioState, onRowTogglePreview, selected],
  );

  const keyExtractor = useCallback((item: ITunesSongHit) => item.id, []);

  const listHeader = useMemo(
    () => (
      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={colors.dark.textMuted} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search for a song, artist, or album"
            placeholderTextColor={colors.dark.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 ? (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.dark.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
        <Text style={styles.searchHint}>
          Previews are 30 seconds. The full track will be what auto-plays when someone visits your Pulse Page.
        </Text>
      </View>
    ),
    [query],
  );

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
          colors={[
            'rgba(20,184,166,0.14)',
            'rgba(15,28,48,0.98)',
            colors.dark.bg,
          ]}
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
            <Text style={[styles.doneText, !canConfirm && styles.doneTextDisabled]}>
              Set
            </Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={results}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ListHeaderComponent={listHeader}
          ListHeaderComponentStyle={styles.headerSpacer}
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
                    Search for anything — an artist, a song, a lyric, a vibe.
                  </Text>
                  <Text style={styles.emptyHint}>
                    Tap a song to hear a preview. Tap “Set” to make it your Current Vibe.
                  </Text>
                </>
              )}
            </View>
          }
        />

        {selected ? (
          <View style={styles.selectedBar}>
            <Image
              source={{ uri: selected.artworkUrl }}
              style={styles.selectedArt}
              contentFit="cover"
            />
            <View style={styles.selectedText}>
              <Text style={styles.selectedTitle} numberOfLines={1}>
                {selected.title}
              </Text>
              <Text style={styles.selectedArtist} numberOfLines={1}>
                {selected.artist}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.selectedConfirm}
              onPress={onConfirm}
              activeOpacity={0.85}
            >
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
