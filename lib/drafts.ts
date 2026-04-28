import AsyncStorage from '@react-native-async-storage/async-storage';

const DRAFT_PREFIX = '@pulseverse_draft_';

export interface DraftData {
  caption?: string;
  hashtags?: string;
  /** Optional creator-set name for an original sound (video upload screen). */
  soundTitle?: string;
  mediaUris?: string[];
  content?: string;
  updatedAt?: string;
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
