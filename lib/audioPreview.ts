/**
 * App-wide single-track audio previewer.
 *
 * Used by the search screen (Sounds / Viral Songs rows) so the user can
 * audition a clip with one tap before deciding to film with it. We keep at
 * most one expo-audio AudioPlayer alive at a time -- tapping a different row
 * stops the previous track, which is the same UX pattern TikTok / Instagram
 * use.
 *
 * expo-audio is loaded lazily so a missing native module on web / dev builds
 * doesn't crash the search screen on import. State is exposed via a tiny
 * subscribe() pub/sub so React components can re-render without us having
 * to add Zustand boilerplate just for one module.
 */

type ExpoAudioModule = typeof import('expo-audio');

/** Subset of the expo-audio AudioPlayer surface we actually call. */
type AudioPlayerLike = {
  play: () => void;
  pause: () => void;
  release: () => void;
  addListener: (
    event: 'playbackStatusUpdate',
    cb: (status: AudioStatusLike) => void,
  ) => { remove: () => void };
};

type AudioStatusLike = {
  isLoaded?: boolean;
  playing?: boolean;
  didJustFinish?: boolean;
};

let expoAudioPromise: Promise<ExpoAudioModule | null> | null = null;
async function loadExpoAudio(): Promise<ExpoAudioModule | null> {
  if (!expoAudioPromise) {
    expoAudioPromise = (async () => {
      try {
        return await import('expo-audio');
      } catch {
        return null;
      }
    })();
  }
  return expoAudioPromise;
}

let audioModeConfigured = false;
async function ensureAudioMode(mod: ExpoAudioModule): Promise<void> {
  if (audioModeConfigured) return;
  audioModeConfigured = true;
  try {
    await mod.setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
    });
  } catch {
    audioModeConfigured = false;
  }
}

export interface AudioPreviewState {
  activeId: string | null;
  isPlaying: boolean;
  isLoading: boolean;
}

const listeners = new Set<(s: AudioPreviewState) => void>();
let state: AudioPreviewState = { activeId: null, isPlaying: false, isLoading: false };
let player: AudioPlayerLike | null = null;
let listenerSub: { remove: () => void } | null = null;
let loadToken = 0;

function setState(next: Partial<AudioPreviewState>) {
  state = { ...state, ...next };
  for (const cb of listeners) {
    try { cb(state); } catch { /* listener errors must not break others */ }
  }
}

function teardownPlayer() {
  const sub = listenerSub;
  listenerSub = null;
  if (sub) {
    try { sub.remove(); } catch { /* noop */ }
  }
  const p = player;
  player = null;
  if (p) {
    try { p.pause(); } catch { /* noop */ }
    try { p.release(); } catch { /* noop */ }
  }
}

export const audioPreview = {
  getState(): AudioPreviewState {
    return state;
  },

  subscribe(cb: (s: AudioPreviewState) => void): () => void {
    listeners.add(cb);
    return () => { listeners.delete(cb); };
  },

  /**
   * Toggle preview for a row. Behaviour:
   *   - same id, currently playing      -> pause
   *   - same id, currently paused/ready -> resume
   *   - different id                    -> stop previous, load and play new
   */
  async toggle(id: string, url: string | null | undefined): Promise<void> {
    if (!url) return;

    if (state.activeId === id && player) {
      try {
        if (state.isPlaying) {
          player.pause();
          setState({ isPlaying: false });
        } else {
          player.play();
          setState({ isPlaying: true });
        }
      } catch {
        teardownPlayer();
        setState({ activeId: null, isPlaying: false, isLoading: false });
      }
      return;
    }

    /** Different track -- guard against races by tagging this load and bailing
     *  if another toggle() supersedes it before the load finishes. */
    const myToken = ++loadToken;
    setState({ activeId: id, isPlaying: false, isLoading: true });
    teardownPlayer();
    if (myToken !== loadToken) return;

    const expoAudio = await loadExpoAudio();
    if (!expoAudio || myToken !== loadToken) {
      if (myToken === loadToken) setState({ isLoading: false, isPlaying: false, activeId: null });
      return;
    }

    await ensureAudioMode(expoAudio);
    if (myToken !== loadToken) return;

    try {
      const nextPlayer = expoAudio.createAudioPlayer(
        { uri: url },
        { updateInterval: 500 },
      ) as unknown as AudioPlayerLike;

      if (myToken !== loadToken) {
        try { nextPlayer.release(); } catch { /* noop */ }
        return;
      }

      player = nextPlayer;
      listenerSub = nextPlayer.addListener('playbackStatusUpdate', (status) => {
        if (!status?.isLoaded) return;
        if (status.didJustFinish) {
          setState({ isPlaying: false });
        } else if (typeof status.playing === 'boolean') {
          setState({ isPlaying: status.playing });
        }
      });
      nextPlayer.play();
      setState({ isLoading: false, isPlaying: true });
    } catch {
      if (myToken === loadToken) {
        teardownPlayer();
        setState({ isLoading: false, isPlaying: false, activeId: null });
      }
    }
  },

  /** Stop and tear down. Safe to call from screen unmount / blur handlers. */
  async stop(): Promise<void> {
    loadToken++;
    teardownPlayer();
    setState({ activeId: null, isPlaying: false, isLoading: false });
  },
};
