import AsyncStorage from '@react-native-async-storage/async-storage';

const DRAFT_PREFIX = '@pulseverse_draft_';

export interface DraftData {
  caption?: string;
  hashtags?: string;
  headline?: string;
  overlayLine?: string;
  /** Shorts-style headline on the video composer (distinct from photo `headline` when both exist). */
  shortTitle?: string;
  /** Optional creator-set name for an original sound (video upload screen). */
  soundTitle?: string;
  mediaUris?: string[];
  /** Queued follow-up clips (series or B-roll flow) — URIs only; may be stale after OS cache eviction. */
  followUpClipUris?: string[];
  clipQueueVariant?: 'series' | 'broll';
  seriesSelection?: { seriesId: string; seriesPart: number; seriesTotal: number };
  content?: string;
  updatedAt?: string;
  /** Video composer trim sliders (seconds); upload still sends full file until server trim. */
  trimStartSec?: number;
  trimEndSec?: number;
  /** Video composer — borrowed sound beat/hook planner marker on waveform (seconds). */
  soundAnchorSec?: number;
  privacyVideo?: 'public' | 'followers';
  commentsOnVideo?: boolean;
  /** Photo composer (`saveDraft('image', …)`) — kept separate from video fields. */
  privacyPhoto?: 'public' | 'followers';
  commentsOnPhoto?: boolean;
  /** Photo composer extras (crash restore). */
  scheduledAtIso?: string;
  educationOnDraft?: boolean;
  educationCitationsDraft?: Array<{ label: string; url: string; doi?: string; lastReviewed?: string }>;
  imageLayoutPreset?: string;
  imagePhotoFrame?: string;
  imageBrandBackdrop?: boolean;
  imageColorMatch?: boolean;
  imageBeforeAfter?: boolean;
  imageMoodId?: string | null;
}

export async function saveDraft(type: string, data: DraftData): Promise<void> {
  try {
    await AsyncStorage.setItem(
      `${DRAFT_PREFIX}${type}`,
      JSON.stringify({ ...data, updatedAt: new Date().toISOString() })
    );
  } catch {}
}

export async function loadDraft(type: string): Promise<DraftData | null> {
  try {
    const raw = await AsyncStorage.getItem(`${DRAFT_PREFIX}${type}`);
    if (!raw) return null;
    const data = JSON.parse(raw) as DraftData;
    if (data.updatedAt) {
      const age = Date.now() - new Date(data.updatedAt).getTime();
      if (age > 7 * 24 * 60 * 60 * 1000) {
        await clearDraft(type);
        return null;
      }
    }
    return data;
  } catch {
    return null;
  }
}

export async function clearDraft(type: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(`${DRAFT_PREFIX}${type}`);
  } catch {}
}

export async function getAllDrafts(): Promise<{ type: string; data: DraftData }[]> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const draftKeys = keys.filter((k) => k.startsWith(DRAFT_PREFIX));
    if (draftKeys.length === 0) return [];

    const pairs = await AsyncStorage.multiGet(draftKeys);
    return pairs
      .filter(([, val]) => val)
      .map(([key, val]) => ({
        type: key.replace(DRAFT_PREFIX, ''),
        data: JSON.parse(val!) as DraftData,
      }));
  } catch {
    return [];
  }
}
