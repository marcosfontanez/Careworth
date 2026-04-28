import { TextStyle } from 'react-native';

export const typography: Record<string, TextStyle> = {
  h1: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  h3: { fontSize: 18, fontWeight: '700' },
  /**
   * Card / section sub-headings sitting between h3 and sectionTitle.
   * Fills the scale gap for things like leaderboard column headers.
   */
  h4: { fontSize: 15, fontWeight: '700', letterSpacing: -0.1 },
  h5: { fontSize: 13, fontWeight: '700', letterSpacing: -0.05 },
  /** Main screen titles (Communities, Create, etc.) */
  screenTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.4 },
  /** Modal / stack navigation title (settings, notifications, …) */
  navTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  /** Section headers inside screens */
  sectionTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  /** Feed / card section labels */
  sectionLabel: { fontSize: 13, fontWeight: '600', letterSpacing: -0.1 },
  subtitle: { fontSize: 16, fontWeight: '600' },
  /** Creator display name */
  creatorName: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  /** Role, specialty, location on cards */
  metadata: { fontSize: 12, fontWeight: '500', lineHeight: 16 },
  body: { fontSize: 15, fontWeight: '400', lineHeight: 22 },
  bodySmall: { fontSize: 13, fontWeight: '400', lineHeight: 18 },
  caption: { fontSize: 12, fontWeight: '500' },
  /** Counts on action rails, stats */
  count: { fontSize: 11, fontWeight: '600', letterSpacing: 0.2 },
  /** Uppercase micro labels */
  label: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  button: { fontSize: 15, fontWeight: '700' },
  stat: { fontSize: 20, fontWeight: '800' },
  /** TikTok-style overlay caption */
  captionOverlay: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
  /** Overlay hashtags / micro links on video */
  overlayMicro: { fontSize: 11, fontWeight: '600', letterSpacing: 0.1 },
  /** Quiet overlay metadata (location, views line) */
  overlayQuiet: { fontSize: 11, fontWeight: '500', letterSpacing: 0.05 },
};
