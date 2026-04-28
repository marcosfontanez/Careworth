import { useSyncExternalStore } from 'react';
import { audioPreview, type AudioPreviewState } from '@/lib/audioPreview';

/**
 * React binding for the singleton in lib/audioPreview.ts. Re-renders the
 * caller whenever the active preview track / playback state changes.
 *
 * Exposes the same surface as the underlying controller plus a couple of
 * derived booleans (`isActive`, `isPreviewPlaying`) scoped to a given id so
 * row components can read their state without re-checking activeId === id
 * each time.
 */
export function useAudioPreview(id?: string) {
  const state = useSyncExternalStore<AudioPreviewState>(
    (cb) => audioPreview.subscribe(cb),
    () => audioPreview.getState(),
    () => audioPreview.getState(),
  );

  const isActive = !!id && state.activeId === id;
  const isPreviewPlaying = isActive && state.isPlaying;
  const isPreviewLoading = isActive && state.isLoading;

  return {
    activeId: state.activeId,
    isPlaying: state.isPlaying,
    isLoading: state.isLoading,
    isActive,
    isPreviewPlaying,
    isPreviewLoading,
    toggle: audioPreview.toggle,
    stop: audioPreview.stop,
  };
}
