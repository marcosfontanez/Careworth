import { create } from 'zustand';
import type {
  ProfileTheme, AvatarType, ProfileWidget, ProfileWidgetType,
  HighlightReel, EmojiAvatar, GradientAvatar, IllustratedAvatar,
  ShiftLogEntry, DiceBearStyle,
} from '@/types';

export const PROFILE_THEMES: Record<ProfileTheme, { label: string; gradient: [string, string]; accent: string }> = {
  default: { label: 'PulseVerse', gradient: ['#0A1628', '#0F2035'], accent: '#14B8A6' },
  ocean: { label: 'Ocean', gradient: ['#0C2340', '#1A4B6E'], accent: '#38BDF8' },
  sunset: { label: 'Sunset', gradient: ['#2D1B35', '#4A1C40'], accent: '#F97316' },
  midnight: { label: 'Midnight', gradient: ['#0F0F23', '#1A1A3E'], accent: '#A78BFA' },
  emerald: { label: 'Emerald', gradient: ['#0A2818', '#0F3D28'], accent: '#34D399' },
  rose: { label: 'Rose', gradient: ['#2D1520', '#3D1A2D'], accent: '#FB7185' },
  custom: { label: 'Custom', gradient: ['#0A1628', '#0F2035'], accent: '#14B8A6' },
};

export const AVATAR_BGS = ['#14B8A6', '#1E4ED8', '#8B5CF6', '#EF4444', '#F59E0B', '#EC4899', '#6366F1'];

export const DICEBEAR_STYLES: { key: DiceBearStyle; label: string; desc: string }[] = [
  { key: 'adventurer', label: 'Adventurer', desc: 'Cute illustrated faces' },
  { key: 'avataaars', label: 'Avataaars', desc: 'Cartoon style (Bitmoji-like)' },
  { key: 'lorelei', label: 'Lorelei', desc: 'Modern minimalist' },
  { key: 'notionists', label: 'Notionists', desc: 'Notion-style characters' },
  { key: 'big-ears', label: 'Big Ears', desc: 'Fun and playful' },
  { key: 'open-peeps', label: 'Open Peeps', desc: 'Hand-drawn people' },
  { key: 'bottts', label: 'Bottts', desc: 'Cute robot avatars' },
  { key: 'thumbs', label: 'Thumbs', desc: 'Thumbs up characters' },
];

export const DICEBEAR_BG_COLORS = [
  'b6e3f4', 'c0aede', 'd1d4f9', 'ffd5dc', 'ffdfbf',
  '0a1628', '14b8a6', '1e4ed8', '8b5cf6', 'ef4444',
  'f59e0b', 'ec4899', '22c55e', 'transparent',
];

export function buildDiceBearUrl(avatar: IllustratedAvatar, size = 256): string {
  const bg = avatar.backgroundColor === 'transparent' ? 'transparent' : avatar.backgroundColor;
  const params = new URLSearchParams({
    seed: avatar.seed,
    size: String(size),
    backgroundColor: bg,
    ...(avatar.flip ? { flip: 'true' } : {}),
  });
  return `https://api.dicebear.com/9.x/${avatar.style}/png?${params.toString()}`;
}

export const DEFAULT_WIDGETS: ProfileWidget[] = [
  { type: 'quick_stats', enabled: true, order: 0 },
  { type: 'pinned_post', enabled: false, order: 1 },
  { type: 'shift_log', enabled: true, order: 2 },
  { type: 'certifications', enabled: true, order: 3 },
  { type: 'now_playing', enabled: false, order: 4 },
  { type: 'links', enabled: false, order: 5 },
  { type: 'favorite_community', enabled: false, order: 6 },
  { type: 'mood', enabled: true, order: 7 },
];

const WIDGET_META: Record<ProfileWidgetType, { label: string; icon: string; desc: string }> = {
  pinned_post: { label: 'Pinned Post', icon: 'pin', desc: 'Feature your best content' },
  shift_log: { label: 'Shift Log', icon: 'medkit', desc: 'Show your shift history' },
  now_playing: { label: 'Now Playing', icon: 'musical-notes', desc: 'Share what you\'re listening to' },
  links: { label: 'Link Tree', icon: 'link', desc: 'Your important links' },
  certifications: { label: 'Certifications', icon: 'document-text', desc: 'Show your credentials' },
  quick_stats: { label: 'Quick Stats', icon: 'stats-chart', desc: 'Your activity overview' },
  favorite_community: { label: 'Top Community', icon: 'star', desc: 'Your favorite community' },
  mood: { label: 'Mood Check', icon: 'pulse', desc: 'How you\'re feeling' },
};

export function getWidgetMeta(type: ProfileWidgetType) {
  return WIDGET_META[type];
}

interface ProfileCustomizationStore {
  theme: ProfileTheme;
  accentColor: string;
  avatarType: AvatarType;
  emojiAvatar: EmojiAvatar;
  gradientAvatar: GradientAvatar;
  illustratedAvatar: IllustratedAvatar;
  widgets: ProfileWidget[];
  highlightReels: HighlightReel[];
  statusEmoji: string;
  statusText: string;
  linkTree: { label: string; url: string; icon: string }[];
  shiftLog: ShiftLogEntry[];
  profileSong: { title: string; artist: string; url?: string | null } | null;
  coverImageUrl: string | null;

  setTheme: (theme: ProfileTheme) => void;
  setAccentColor: (color: string) => void;
  setAvatarType: (type: AvatarType) => void;
  setEmojiAvatar: (avatar: Partial<EmojiAvatar>) => void;
  setGradientAvatar: (avatar: Partial<GradientAvatar>) => void;
  setIllustratedAvatar: (avatar: Partial<IllustratedAvatar>) => void;
  randomizeSeed: () => void;
  toggleWidget: (type: ProfileWidgetType) => void;
  reorderWidget: (type: ProfileWidgetType, direction: 'up' | 'down') => void;
  setStatus: (emoji: string, text: string) => void;
  addHighlight: (reel: HighlightReel) => void;
  removeHighlight: (id: string) => void;
  addLink: (link: { label: string; url: string; icon: string }) => void;
  removeLink: (index: number) => void;
  addShiftLog: (entry: ShiftLogEntry) => void;
  setProfileSong: (song: { title: string; artist: string; url?: string | null } | null) => void;
  setCoverImage: (url: string | null) => void;
}

export const useProfileCustomization = create<ProfileCustomizationStore>((set) => ({
  theme: 'default',
  accentColor: '#14B8A6',
  avatarType: 'illustrated',
  emojiAvatar: { face: '🧑‍⚕️', skin: '#FFDBB4', hair: '🟫', accessory: '🩺', bg: '#14B8A6' },
  gradientAvatar: { colors: ['#14B8A6', '#1E4ED8'], initials: 'PV' },
  illustratedAvatar: { style: 'adventurer', seed: 'PulseVerse-Nurse', backgroundColor: 'b6e3f4', flip: false },
  widgets: DEFAULT_WIDGETS,
  highlightReels: [
    { id: 'h1', title: 'Shift Life', icon: 'medkit', coverColor: '#1E4ED8', postIds: [] },
    { id: 'h2', title: 'Wins', icon: 'trophy', coverColor: '#D4A63A', postIds: [] },
    { id: 'h3', title: 'Study', icon: 'book', coverColor: '#8B5CF6', postIds: [] },
  ],
  statusEmoji: '',
  statusText: 'On shift and crushing it',
  linkTree: [
    { label: 'My Blog', url: 'https://example.com', icon: 'create' },
    { label: 'LinkedIn', url: 'https://linkedin.com', icon: 'briefcase' },
  ],
  shiftLog: [
    { date: '2026-04-17', department: 'ICU', hours: 12, mood: 'good' },
    { date: '2026-04-16', department: 'ICU', hours: 12, mood: 'great' },
    { date: '2026-04-15', department: 'ER', hours: 8, mood: 'tough' },
    { date: '2026-04-14', department: 'ICU', hours: 12, mood: 'good' },
    { date: '2026-04-12', department: 'ICU', hours: 12, mood: 'great' },
    { date: '2026-04-11', department: 'ER', hours: 8, mood: 'rough' },
    { date: '2026-04-10', department: 'ICU', hours: 12, mood: 'good' },
  ],
  profileSong: null,
  coverImageUrl: null,

  setTheme: (theme) => set({ theme, accentColor: PROFILE_THEMES[theme].accent }),
  setAccentColor: (accentColor) => set({ accentColor }),
  setAvatarType: (avatarType) => set({ avatarType }),
  setEmojiAvatar: (partial) => set((s) => ({ emojiAvatar: { ...s.emojiAvatar, ...partial } })),
  setGradientAvatar: (partial) => set((s) => ({ gradientAvatar: { ...s.gradientAvatar, ...partial } })),
  setIllustratedAvatar: (partial) => set((s) => ({ illustratedAvatar: { ...s.illustratedAvatar, ...partial } })),
  randomizeSeed: () => set((s) => ({
    illustratedAvatar: { ...s.illustratedAvatar, seed: `PV-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` },
  })),
  toggleWidget: (type) => set((s) => ({
    widgets: s.widgets.map((w) => w.type === type ? { ...w, enabled: !w.enabled } : w),
  })),
  reorderWidget: (type, direction) => set((s) => {
    const idx = s.widgets.findIndex((w) => w.type === type);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= s.widgets.length) return s;
    const next = [...s.widgets];
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    return { widgets: next.map((w, i) => ({ ...w, order: i })) };
  }),
  setStatus: (statusEmoji, statusText) => set({ statusEmoji, statusText }),
  addHighlight: (reel) => set((s) => ({ highlightReels: [...s.highlightReels, reel] })),
  removeHighlight: (id) => set((s) => ({ highlightReels: s.highlightReels.filter((r) => r.id !== id) })),
  addLink: (link) => set((s) => ({ linkTree: [...s.linkTree, link] })),
  removeLink: (index) => set((s) => ({ linkTree: s.linkTree.filter((_, i) => i !== index) })),
  addShiftLog: (entry) => set((s) => ({ shiftLog: [entry, ...s.shiftLog].slice(0, 30) })),
  setProfileSong: (profileSong) => set({ profileSong }),
  setCoverImage: (coverImageUrl) => set({ coverImageUrl }),
}));
