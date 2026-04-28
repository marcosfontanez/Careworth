import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

type IonName = ComponentProps<typeof Ionicons>['name'];

/** Legend row on My Pulse — aligned with update type colors */
export const MY_PULSE_LEGEND: { icon: IonName; color: string; label: string }[] = [
  { icon: 'chatbubble-ellipses-outline', color: colors.primary.teal, label: 'Thoughts' },
  { icon: 'document-text-outline', color: '#34D399', label: 'Text' },
  { icon: 'play-circle', color: '#FBBF24', label: 'Video' },
  { icon: 'link-outline', color: '#60A5FA', label: 'Links' },
  { icon: 'people-outline', color: '#C084FC', label: 'Community' },
];
