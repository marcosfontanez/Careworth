/** Host-controlled live scene modes — synced via `live_streams.scene_mode`. */
export type LiveSceneMode =
  | 'live'
  | 'brb'
  | 'starting_soon'
  | 'ending_soon'
  | 'qna'
  | 'poll';

export const LIVE_SCENE_MODES: LiveSceneMode[] = [
  'live',
  'brb',
  'starting_soon',
  'ending_soon',
  'qna',
  'poll',
];

/** Modes host can pick in UI when no active poll (poll added conditionally). */
export const LIVE_SCENE_MODES_BASE: LiveSceneMode[] = [
  'live',
  'brb',
  'starting_soon',
  'ending_soon',
  'qna',
];

export function isLiveSceneMode(value: unknown): value is LiveSceneMode {
  return typeof value === 'string' && (LIVE_SCENE_MODES as string[]).includes(value);
}

export function liveSceneLabel(mode: LiveSceneMode): string {
  switch (mode) {
    case 'live':
      return 'Live Camera';
    case 'brb':
      return 'Be Right Back';
    case 'starting_soon':
      return 'Starting Soon';
    case 'ending_soon':
      return 'Ending Soon';
    case 'qna':
      return 'Q&A Mode';
    case 'poll':
      return 'Poll Mode';
    default:
      return 'Live';
  }
}

/** Full-bleed branded overlay replaces camera feed. */
export function sceneIsFullOverlay(mode: LiveSceneMode): boolean {
  return mode === 'brb' || mode === 'starting_soon' || mode === 'ending_soon';
}

/** Camera publishes when video should remain visible. */
export function sceneAllowsCamera(mode: LiveSceneMode): boolean {
  return mode === 'live' || mode === 'qna' || mode === 'poll';
}

export function sceneIsBrb(mode: LiveSceneMode): boolean {
  return mode === 'brb';
}

export function sceneStatusChipTone(
  mode: LiveSceneMode,
): 'default' | 'active' | 'warn' | 'purple' | 'danger' {
  switch (mode) {
    case 'live':
      return 'active';
    case 'brb':
      return 'purple';
    case 'starting_soon':
      return 'warn';
    case 'ending_soon':
      return 'danger';
    case 'qna':
      return 'purple';
    case 'poll':
      return 'active';
    default:
      return 'default';
  }
}

export function sceneStatusChipIcon(mode: LiveSceneMode): keyof typeof import('@expo/vector-icons').Ionicons.glyphMap {
  switch (mode) {
    case 'live':
      return 'videocam-outline';
    case 'brb':
      return 'pause-circle-outline';
    case 'starting_soon':
      return 'time-outline';
    case 'ending_soon':
      return 'flag-outline';
    case 'qna':
      return 'help-circle-outline';
    case 'poll':
      return 'stats-chart-outline';
    default:
      return 'radio-outline';
  }
}
