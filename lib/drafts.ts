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
  /** Duet camera layout preference — restored when duetting from draft (migration 161). */
  videoDuetLayout?: 'strip' | 'floating';
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
  selectedCircleId?: string | null;
  pinToMyPulse?: boolean;
  selectedCircleSnapshot?: { id: string; name: string; slug: string };
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

/**
 * Browser blob URLs die on reload/navigation — never persist them as drafts.
 * Native `file://` clips may also go stale but are still worth restoring when present.
 */
export function isPersistableDraftMediaUri(uri: string | undefined | null): boolean {
  const u = uri?.trim();
  if (!u) return false;
  if (u.startsWith('blob:')) return false;
  return true;
}

export function filterPersistableDraftMediaUris(uris?: string[]): string[] | undefined {
  if (!uris?.length) return undefined;
  const out = uris.filter(isPersistableDraftMediaUri);
  return out.length ? out : undefined;
}

/** True when saved draft payload has meaningful creator content (hub badges / resume affordances). */
export function draftDataHasContent(data: DraftData | null | undefined): boolean {
  if (!data) return false;
  return !!(
    data.caption?.trim() ||
    data.hashtags?.trim() ||
    data.headline?.trim() ||
    data.overlayLine?.trim() ||
    data.shortTitle?.trim() ||
    data.soundTitle?.trim() ||
    data.content?.trim() ||
    (data.mediaUris?.length ?? 0) > 0 ||
    (data.followUpClipUris?.length ?? 0) > 0 ||
    data.seriesSelection != null ||
    data.clipQueueVariant != null ||
    data.trimStartSec != null ||
    data.trimEndSec != null ||
    data.soundAnchorSec != null ||
    data.scheduledAtIso?.trim() ||
    data.educationOnDraft === true ||
    (data.educationCitationsDraft?.length ?? 0) > 0 ||
    data.imageMoodId != null ||
    data.imageBeforeAfter === true ||
    data.imageColorMatch === true ||
    data.imageBrandBackdrop === true ||
    (data.imagePhotoFrame?.trim() && data.imagePhotoFrame !== 'none') ||
    (data.imageLayoutPreset?.trim() && data.imageLayoutPreset !== 'carousel')
  );
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
