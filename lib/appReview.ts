import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const REVIEW_KEY = 'pulseverse_review_state';
const MIN_SESSIONS = 5;
const MIN_DAYS = 7;
const COOLDOWN_DAYS = 90;

interface ReviewState {
  sessionCount: number;
  firstOpenAt: string;
  lastPromptAt: string | null;
  hasRated: boolean;
}

async function getState(): Promise<ReviewState> {
  try {
    const raw = await AsyncStorage.getItem(REVIEW_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    sessionCount: 0,
    firstOpenAt: new Date().toISOString(),
    lastPromptAt: null,
    hasRated: false,
  };
}

async function setState(state: ReviewState) {
  await AsyncStorage.setItem(REVIEW_KEY, JSON.stringify(state));
}

export async function trackAppOpen() {
  const state = await getState();
  state.sessionCount++;
  await setState(state);
}

export async function shouldPromptReview(): Promise<boolean> {
  const state = await getState();

  if (state.hasRated) return false;

  if (state.sessionCount < MIN_SESSIONS) return false;

  const daysSinceFirst = (Date.now() - new Date(state.firstOpenAt).getTime()) / 86400000;
  if (daysSinceFirst < MIN_DAYS) return false;

  if (state.lastPromptAt) {
    const daysSincePrompt = (Date.now() - new Date(state.lastPromptAt).getTime()) / 86400000;
    if (daysSincePrompt < COOLDOWN_DAYS) return false;
  }

  return true;
}

export async function promptReview() {
  const ready = await shouldPromptReview();
  if (!ready) return;

  const state = await getState();
  state.lastPromptAt = new Date().toISOString();
  await setState(state);

  if (Platform.OS === 'web') return;

  try {
    let StoreReview: any = null;
    try {
      StoreReview = require('expo-store-review');
    } catch {}

    if (StoreReview && await StoreReview.isAvailableAsync()) {
      await StoreReview.requestReview();
      state.hasRated = true;
      await setState(state);
      return;
    }
  } catch {}

  Alert.alert(
    'Enjoying PulseVerse?',
    'If you like the app, would you mind taking a moment to rate it? It really helps!',
    [
      { text: 'Not Now', style: 'cancel' },
      {
        text: 'Rate PulseVerse',
        onPress: async () => {
          state.hasRated = true;
          await setState(state);
          try {
            const StoreReview = require('expo-store-review');
            if (Platform.OS === 'ios') {
              StoreReview.requestReview();
            }
          } catch {}
        },
      },
      {
        text: 'Never Ask Again',
        onPress: async () => {
          state.hasRated = true;
          await setState(state);
        },
      },
    ]
  );
}
