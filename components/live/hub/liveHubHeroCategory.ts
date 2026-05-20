import type { LiveHubStream, LiveModeType } from '@/types/liveHub';

function modeLabel(mode: LiveModeType): string {
  switch (mode) {
    case 'casual':
      return 'Casual';
    case 'irl':
      return 'IRL';
    case 'gaming':
      return 'Gaming';
    case 'learn':
      return 'Learn';
    case 'shop':
      return 'Shop Live';
    default:
      return 'Live';
  }
}

/** Hero carousel category pill — Circle Live when tied to a community, else mode label. */
export function heroCategoryLabel(stream: LiveHubStream): string {
  if (stream.communityName?.trim()) return 'Circle Live';
  return modeLabel(stream.liveType);
}
