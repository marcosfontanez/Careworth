import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'pulseverse_search_history';
const MAX_ITEMS = 15;

export async function getSearchHistory(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function addSearchQuery(query: string): Promise<void> {
  const trimmed = query.trim();
  if (!trimmed) return;

  try {
    const history = await getSearchHistory();
    const filtered = history.filter((q) => q.toLowerCase() !== trimmed.toLowerCase());
    filtered.unshift(trimmed);
    await AsyncStorage.setItem(KEY, JSON.stringify(filtered.slice(0, MAX_ITEMS)));
  } catch {}
}

export async function removeSearchQuery(query: string): Promise<void> {
  try {
    const history = await getSearchHistory();
    const filtered = history.filter((q) => q !== query);
    await AsyncStorage.setItem(KEY, JSON.stringify(filtered));
  } catch {}
}

export async function clearSearchHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {}
}
