export const colors = {
  primary: {
    navy: '#0B1F3A',
    royal: '#1E4ED8',
    teal: '#14B8A6',
    gold: '#D4A63A',
  },
  dark: {
    bg: '#060E1A',
    /** Slightly lifted surfaces — less muddy than pure blue-on-blue */
    card: '#0F1C30',
    cardAlt: '#152A42',
    border: '#243B5C',
    /** Hairline / muted dividers (cards-on-cards, row separators) */
    borderSubtle: 'rgba(255,255,255,0.06)',
    /** Slightly stronger inner border for elevated chips & pills */
    borderInner: 'rgba(255,255,255,0.08)',
    elevated: '#182F4A',
    text: '#FFFFFF',
    /** Body / secondary labels */
    textSecondary: '#A8B8D4',
    /** Quiet metadata, counts */
    textMuted: '#6B829E',
    /** Tertiary — timestamps, hints */
    textQuiet: '#4A6280',
  },
  /** Auth / glass inputs on gradients */
  form: {
    iconMuted: 'rgba(255,255,255,0.5)',
    placeholder: 'rgba(255,255,255,0.4)',
    subtitle: 'rgba(255,255,255,0.6)',
    hint: 'rgba(255,255,255,0.4)',
    glassSurface: 'rgba(255,255,255,0.1)',
    /** Softer rim on gradient glass fields */
    glassBorderInner: 'rgba(255,255,255,0.1)',
    glassBorder: 'rgba(255,255,255,0.15)',
    divider: 'rgba(255,255,255,0.15)',
    socialLabel: 'rgba(255,255,255,0.85)',
    footerMuted: 'rgba(255,255,255,0.5)',
    /** Success / emphasis body on gradient */
    bodyStrong: 'rgba(255,255,255,0.8)',
  },
  neutral: {
    white: '#FFFFFF',
    lightGray: '#F4F7FB',
    midGray: '#5B6B7F',
    darkText: '#111827',
    black: '#000000',
  },
  status: {
    success: '#14B8A6',
    warning: '#F59E0B',
    accent: '#1E4ED8',
    premium: '#D4A63A',
    error: '#EF4444',
    live: '#EF4444',
    /** Online presence dot (chats, profile, room highlights) */
    online: '#22C55E',
    /** Unread / activity badge fill — defaults to teal accent for less visual fatigue than red */
    unread: '#14B8A6',
    /** Used for invite / community-purple chips & badges */
    invite: '#8B5CF6',
  },
  overlay: {
    dark: 'rgba(11, 31, 58, 0.7)',
    medium: 'rgba(11, 31, 58, 0.4)',
    light: 'rgba(11, 31, 58, 0.15)',
  },
  /** Full-bleed video surfaces (OLED-friendly) */
  media: {
    videoCanvas: '#000000',
  },
  /** Feed top chrome over video */
  feed: {
    chromeScrim: 'rgba(0,0,0,0.22)',
    tabInactive: 'rgba(255,255,255,0.45)',
    emptyIcon: 'rgba(255,255,255,0.4)',
    emptySubtext: 'rgba(255,255,255,0.6)',
  },
  /** Half-screen video overlays — progress, mute, captions */
  glass: {
    faint: 'rgba(0,0,0,0.12)',
    countPill: 'rgba(0,0,0,0.2)',
    sm: 'rgba(0,0,0,0.28)',
    md: 'rgba(0,0,0,0.35)',
    mdStrong: 'rgba(0,0,0,0.45)',
    lg: 'rgba(0,0,0,0.5)',
    heavy: 'rgba(0,0,0,0.6)',
    progressScrim: 'rgba(0,0,0,0.4)',
  },
  /** Text / controls on top of video */
  onVideo: {
    primary: '#FFFFFF',
    muted: 'rgba(255,255,255,0.45)',
    mutedStrong: 'rgba(255,255,255,0.62)',
    soft: 'rgba(255,255,255,0.5)',
    tag: 'rgba(255,255,255,0.7)',
    live: 'rgba(255,255,255,0.88)',
    emphasis: 'rgba(255,255,255,0.9)',
    progressTrack: 'rgba(255,255,255,0.3)',
    progressFill: 'rgba(255,255,255,0.85)',
    borderSoft: 'rgba(255,255,255,0.14)',
    borderAvatar: 'rgba(255,255,255,0.4)',
  },
  community: {
    nurses: '#1E4ED8',
    pctCna: '#14B8A6',
    doctors: '#0B1F3A',
    newGrads: '#6366F1',
    memes: '#F97316',
    confessions: '#6B21A8',
    nursingStudents: '#EC4899',
    medicalStudents: '#6366F1',
    study: '#3B82F6',
    pharmacists: '#10B981',
  },
} as const;
