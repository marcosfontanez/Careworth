import type { StreamCategory } from '@/types';

/** Go Live / stream picker — product labels (not mock data). */
export const STREAM_CATEGORIES: { key: StreamCategory; label: string; icon: string }[] = [
  { key: 'shift-talk', label: 'Shift Talk', icon: 'chatbubbles' },
  { key: 'study-session', label: 'Study Session', icon: 'book' },
  { key: 'q-and-a', label: 'Q&A', icon: 'help-circle' },
  { key: 'day-in-the-life', label: 'Day in the Life', icon: 'sunny' },
  { key: 'clinical-skills', label: 'Clinical Skills', icon: 'medkit' },
  { key: 'career-advice', label: 'Career Advice', icon: 'trending-up' },
  { key: 'debrief', label: 'Debrief', icon: 'heart' },
  { key: 'chill', label: 'Chill', icon: 'musical-notes' },
  { key: 'other', label: 'Other', icon: 'ellipsis-horizontal' },
];
