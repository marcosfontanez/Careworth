import { create } from 'zustand';
import type { Post } from '@/types';

export type MediaExportOverlayMode = 'hidden' | 'progress' | 'success' | 'error';

type State = {
  mode: MediaExportOverlayMode;
  headline: string;
  detail: string;
  /** 0–1, or null when indeterminate */
  progress: number | null;
  successLocalUri: string | null;
  /** True when the file was already written to the user's photo library. */
  successSavedToPhotos: boolean;
  errorMessage: string | null;
  fallbackPost: Post | null;
  fallbackRemote: string | null;
  activePostId: string | null;
  /** Returns null if a download is already in progress (caller should not start another). */
  begin: (post: Post, remote: string) => AbortSignal | null;
  /** True if a download is currently being prepared. */
  isBusy: () => boolean;
  setProgress: (headline: string, detail: string, progress: number | null) => void;
  setSuccess: (localUri: string, savedToPhotos: boolean) => void;
  setError: (message: string) => void;
  dismiss: () => void;
  cancelInFlight: () => void;
};

let abortRef: AbortController | null = null;

export const useMediaExportUiStore = create<State>((set, get) => ({
  mode: 'hidden',
  headline: '',
  detail: '',
  progress: null,
  successLocalUri: null,
  successSavedToPhotos: false,
  errorMessage: null,
  fallbackPost: null,
  fallbackRemote: null,
  activePostId: null,

  begin: (post, remote) => {
    // Refuse to clobber an in-flight job. Callers (postMediaActions) gate on this too,
    // but enforcing here means any future call site is automatically safe as well.
    if (get().mode === 'progress') {
      return null;
    }
    abortRef = new AbortController();
    set({
      mode: 'progress',
      headline: 'Preparing your clip',
      detail: 'Sending to PulseVerse export…',
      progress: 0.06,
      successLocalUri: null,
      successSavedToPhotos: false,
      errorMessage: null,
      fallbackPost: post,
      fallbackRemote: remote,
      activePostId: post.id,
    });
    return abortRef.signal;
  },

  isBusy: () => get().mode === 'progress',

  setProgress: (headline, detail, progress) => {
    if (get().mode !== 'progress') return;
    set({ headline, detail, progress });
  },

  setSuccess: (localUri, savedToPhotos) =>
    set({
      mode: 'success',
      headline: 'Download Complete',
      detail: savedToPhotos
        ? 'Saved to Photos.'
        : 'Saved to your app cache. Build a development build to auto-save into Photos.',
      progress: 1,
      successLocalUri: localUri,
      successSavedToPhotos: savedToPhotos,
      errorMessage: null,
    }),

  setError: (message) =>
    set({
      mode: 'error',
      headline: "Couldn't finish export",
      detail: message,
      progress: null,
      errorMessage: message,
    }),

  dismiss: () => {
    abortRef = null;
    set({
      mode: 'hidden',
      headline: '',
      detail: '',
      progress: null,
      successLocalUri: null,
      successSavedToPhotos: false,
      errorMessage: null,
      fallbackPost: null,
      fallbackRemote: null,
      activePostId: null,
    });
  },

  cancelInFlight: () => {
    abortRef?.abort();
    abortRef = null;
  },
}));
