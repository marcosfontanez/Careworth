import { AppState, type AppStateStatus } from 'react-native';
import { saveDraft, type DraftData } from '@/lib/drafts';

/** Snapshot used while backgrounding / killing the app — persists compose drafts ASAP */
export type ComposerDraftSnapshot = {
  ready: boolean;
  type: string;
  data: DraftData;
};

/**
 * Flush composer drafts when the app moves away from `active` (home swipe, task switcher crash windows).
 * Pairs with `draftBootstrapped` so we don't wipe/re-save empty payloads mid-mount.
 */
export function subscribeComposerDraftFlush(getSnapshot: () => ComposerDraftSnapshot | null) {
  const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
    if (next === 'active') return;
    const snap = getSnapshot();
    if (!snap?.ready || !snap.data) return;
    void saveDraft(snap.type, snap.data);
  });
  return () => sub.remove();
}
