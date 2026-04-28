import { create } from 'zustand';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  init: () => Promise<void>;
}

const THEME_KEY = 'pulseverse_theme';

function resolveIsDark(mode: ThemeMode): boolean {
  if (mode === 'system') {
    return Appearance.getColorScheme() === 'dark';
  }
  return mode === 'dark';
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'system',
  isDark: resolveIsDark('system'),

  setMode: (mode) => {
    const isDark = resolveIsDark(mode);
    set({ mode, isDark });
    AsyncStorage.setItem(THEME_KEY, mode).catch(() => {});
  },

  init: async () => {
    try {
      const saved = await AsyncStorage.getItem(THEME_KEY);
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        set({ mode: saved, isDark: resolveIsDark(saved) });
      }
    } catch {}

    Appearance.addChangeListener(({ colorScheme }) => {
      const { mode } = get();
      if (mode === 'system') {
        set({ isDark: colorScheme === 'dark' });
      }
    });
  },
}));

export const darkColors = {
  primary: {
    navy: '#0B1F3A',
    royal: '#4B7CF3',
    teal: '#2DD4BF',
    gold: '#E8B84A',
  },
  neutral: {
    white: '#111827',
    lightGray: '#1F2937',
    midGray: '#9CA3AF',
    darkText: '#F9FAFB',
    black: '#FFFFFF',
  },
  status: {
    success: '#2DD4BF',
    warning: '#FBBF24',
    accent: '#4B7CF3',
    premium: '#E8B84A',
    error: '#F87171',
  },
  overlay: {
    dark: 'rgba(0, 0, 0, 0.7)',
    medium: 'rgba(0, 0, 0, 0.4)',
    light: 'rgba(0, 0, 0, 0.15)',
  },
  bg: '#0F172A',
  card: '#1E293B',
  border: '#334155',
} as const;

export const lightColors = {
  bg: '#FFFFFF',
  card: '#FFFFFF',
  border: '#F1F5F9',
} as const;
