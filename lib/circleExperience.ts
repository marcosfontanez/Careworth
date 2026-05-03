import AsyncStorage from '@react-native-async-storage/async-storage';

const MUTED = '@pulseverse_circles_muted_ids';
const RECENT_SEARCH = '@pulseverse_circles_recent_search';
const QUESTIONS_HINT = '@pulseverse_circles_questions_hint_v1';
const THREAD_READ_PREFIX = '@pulseverse_circle_thread_read_';

function parseJsonSet(raw: string | null): Set<string> {
  if (!raw) return new Set();
  try {
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export async function getMutedCommunityIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(MUTED);
    return parseJsonSet(raw);
  } catch {
    return new Set();
  }
}

export async function setCommunityMuted(communityId: string, muted: boolean): Promise<void> {
  const s = await getMutedCommunityIds();
  if (muted) s.add(communityId);
  else s.delete(communityId);
  await AsyncStorage.setItem(MUTED, JSON.stringify([...s]));
}

export async function isCommunityMuted(communityId: string): Promise<boolean> {
  const s = await getMutedCommunityIds();
  return s.has(communityId);
}

const RECENT_MAX = 8;

export async function getRecentCircleSearches(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENT_SEARCH);
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string' && x.trim()) : [];
  } catch {
    return [];
  }
}

export async function addRecentCircleSearch(query: string): Promise<void> {
  const q = query.trim();
  if (q.length < 2) return;
  const prev = await getRecentCircleSearches();
  const next = [q, ...prev.filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, RECENT_MAX);
  await AsyncStorage.setItem(RECENT_SEARCH, JSON.stringify(next));
}

export async function clearRecentCircleSearches(): Promise<void> {
  await AsyncStorage.removeItem(RECENT_SEARCH);
}

export async function hasSeenCircleQuestionsHint(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(QUESTIONS_HINT)) === '1';
  } catch {
    return true;
  }
}

export async function setCircleQuestionsHintSeen(): Promise<void> {
  await AsyncStorage.setItem(QUESTIONS_HINT, '1');
}

/** Last seen reply count for a thread — if current count is higher, show “new” in UI. */
export async function getThreadReadReplyCount(threadId: string): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(THREAD_READ_PREFIX + threadId);
    if (raw == null) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export async function setThreadReadReplyCount(threadId: string, replyCount: number): Promise<void> {
  try {
    await AsyncStorage.setItem(THREAD_READ_PREFIX + threadId, String(replyCount));
  } catch {}
}
