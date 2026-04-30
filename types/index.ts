export type Role =
  | 'RN'
  | 'CNA'
  | 'PCT'
  | 'LPN'
  | 'LVN'
  | 'Student Nurse'
  | 'Travel Nurse'
  | 'Charge Nurse'
  | 'Nurse Leader';

export type Specialty =
  | 'ICU'
  | 'Emergency'
  | 'Med Surg'
  | 'Operating Room'
  | 'Telemetry'
  | 'Pediatrics'
  | 'Labor & Delivery'
  | 'Oncology'
  | 'Cardiac'
  | 'NICU'
  | 'PACU'
  | 'Home Health'
  | 'Psych'
  | 'Rehab'
  | 'General';

export type PostType =
  | 'video'
  | 'image'
  | 'text'
  | 'discussion'
  | 'confession';

export type PrivacyMode = 'public' | 'followers' | 'alias' | 'private';

/** `community` = circle-only surface; excluded from main For You / Following / Friends / Top Today feeds */
export type FeedType = 'forYou' | 'following' | 'friends' | 'topToday' | 'community';

export type ShiftPreference = 'Day' | 'Night' | 'Rotating' | 'No Preference';

export type EmploymentType = 'Full-Time' | 'Part-Time' | 'Contract' | 'Travel' | 'Per Diem' | 'PRN';

export type NotificationType =
  | 'new_follower'
  | 'like'
  | 'save'
  | 'share'
  | 'comment'
  | 'reply'
  | 'mention'
  | 'community_invite'
  | 'job_alert'
  | 'badge_earned'
  | 'tier_up';

export type ContentInterest =
  | 'humor'
  | 'education'
  | 'career_tips'
  | 'shift_stories'
  | 'new_grad'
  | 'local_jobs'
  | 'travel_nursing'
  | 'leadership'
  | 'gear_tools'
  | 'certifications';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: 'verification' | 'specialty' | 'achievement' | 'community';
}

export type AvatarType = 'photo' | 'emoji' | 'gradient' | 'illustrated';

export type DiceBearStyle =
  | 'adventurer'
  | 'avataaars'
  | 'lorelei'
  | 'notionists'
  | 'big-ears'
  | 'open-peeps'
  | 'bottts'
  | 'thumbs';

export type ProfileTheme = 'default' | 'ocean' | 'sunset' | 'midnight' | 'emerald' | 'rose' | 'custom';

export type ProfileWidgetType =
  | 'pinned_post'
  | 'shift_log'
  | 'now_playing'
  | 'links'
  | 'certifications'
  | 'quick_stats'
  | 'favorite_community'
  | 'mood';

export interface ProfileWidget {
  type: ProfileWidgetType;
  enabled: boolean;
  order: number;
  data?: Record<string, any>;
}

export interface EmojiAvatar {
  face: string;
  skin: string;
  hair: string;
  accessory: string;
  bg: string;
}

export interface GradientAvatar {
  colors: [string, string];
  initials: string;
}

export interface IllustratedAvatar {
  style: DiceBearStyle;
  seed: string;
  backgroundColor: string;
  flip: boolean;
}

export interface HighlightReel {
  id: string;
  title: string;
  icon: string;
  coverColor: string;
  postIds: string[];
}

export interface ShiftLogEntry {
  date: string;
  department: string;
  hours: number;
  mood: 'great' | 'good' | 'tough' | 'rough';
}

export interface ProfileCustomization {
  theme: ProfileTheme;
  accentColor: string;
  avatarType: AvatarType;
  emojiAvatar?: EmojiAvatar;
  gradientAvatar?: GradientAvatar;
  coverImageUrl?: string;
  profileSong?: { title: string; artist: string; url?: string | null };
  widgets: ProfileWidget[];
  highlightReels: HighlightReel[];
  statusEmoji?: string;
  statusText?: string;
  featuredBadgeId?: string;
  linkTree: { label: string; url: string; icon: string }[];
  shiftLog: ShiftLogEntry[];
}

/** Featured audio identity on profile (conceptual — licensing integration later). */
export interface FeaturedSound {
  id: string;
  title: string;
  artist: string;
  artworkUrl?: string;
  /** 0–1 samples for a simple visualizer */
  waveformData?: number[];
  moodLabel?: string;
}

/**
 * Raw DB-level enum. Keep every legacy value readable for backwards compatibility
 * with existing rows — but the *user-facing* UI now only creates four types:
 * thought / link_post (Clip) / media_note (Link) / pics. See
 * {@link ProfileUpdateDisplayType} and `utils/myPulseDisplayType.ts` for the
 * mapping used by My Pulse cards.
 */
export type ProfileUpdateType =
  | 'thought'
  | 'status'
  | 'link_post'
  | 'link_circle'
  | 'link_live'
  | 'media_note'
  | 'pics';

/**
 * Card types surfaced in the PulseVerse UI. The first four are creator-
 * composable via the "Add to your Pulse" row (Thought / Clip / Link / Pics).
 * `circle` is a **share-only** type — it only appears on My Pulse when the
 * owner pins a Circles discussion via ShareToMyPulseButton, so it's not
 * listed in the composer chips or the /create/my-pulse hub.
 */
export type ProfileUpdateDisplayType =
  | 'thought'
  | 'clip'
  | 'link'
  | 'pics'
  | 'circle';

/** Circle thread surfaced in My Pulse “link circle” picker. */
export interface EligibleCircleDiscussion {
  id: string;
  circleSlug: string;
  circleName: string;
  title: string;
  replyCount: number;
  lastActiveAt: string;
}

/** My Pulse — latest thoughts / updates on a profile (max 5 surfaced). */
export interface ProfileUpdate {
  id: string;
  userId: string;
  type: ProfileUpdateType;
  /** Primary text (thought body, status line, or caption for linked items). */
  content: string;
  /** Short line for dense UI; falls back to truncated `content` when absent. */
  previewText?: string;
  linkedPostId?: string;
  /** Legacy id reference */
  linkedCircleId?: string;
  /** Route slug for `/communities/[slug]` */
  linkedCircleSlug?: string;
  /** Optional discussion title when linking a circle thread */
  linkedDiscussionTitle?: string;
  /** Deep link to `/communities/[slug]/thread/[threadId]` when set */
  linkedThreadId?: string;
  linkedLiveId?: string;
  /** Thumbnail for media_note or linked visual */
  mediaThumb?: string;
  /** External URL for “Link” style My Pulse rows */
  linkedUrl?: string;
  /**
   * Ordered photo URLs for `pics` type My Pulse rows (1–4 visible, overflow
   * pill shown when more). Also read from `mediaThumb` as a single-item
   * fallback for legacy rows.
   */
  picsUrls?: string[];
  /** Short mood tag for thought/status (e.g. “Grateful”) */
  mood?: string;
  createdAt: string;
  updatedAt?: string;
  /**
   * Server-stamped timestamp of the most recent body edit (content,
   * mood, pics, linked URL, etc.). Populated by
   * `trg_profile_updates_stamp_edited_at` (migration 057). Separate
   * from `updatedAt` so engagement ticks / pin flips don't look like
   * content edits in the UI.
   */
  editedAt?: string;
  /** Surface engagement on My Pulse rows (optional; defaults in UI when absent). */
  likeCount?: number;
  commentCount?: number;
  shareCount?: number;
  /**
   * Viewer-specific flag indicating the currently signed-in user has
   * already liked (Pulsed) this update. Hydrated by the DB service when
   * an `authUserId` is available; left undefined for anonymous views or
   * when the viewer identity couldn't be determined.
   */
  liked?: boolean;
  /**
   * Pinned rows sit permanently at the top of the owner's My Pulse — the
   * usual "latest 5" ordering applies to the other four slots. At most one
   * pin per user is enforced server-side by a partial unique index
   * (see migration 050).
   */
  isPinned?: boolean;
}

/**
 * A comment on a `ProfileUpdate` (My Pulse post). Mirrors the shape of
 * `Comment` in this file (used for feed-post comments) so UI components
 * can share rendering logic where sensible. Threaded one level deep via
 * `parentId`; deeper nesting isn't surfaced in UI yet but the model
 * already supports it because `profile_update_comments.parent_id` is a
 * self-referential FK.
 */
export interface ProfileUpdateComment {
  id: string;
  updateId: string;
  authorId: string;
  authorName?: string;
  authorUsername?: string;
  authorAvatarUrl?: string;
  parentId?: string;
  content: string;
  createdAt: string;
  /**
   * Server-stamped timestamp of the most recent body edit. Populated by
   * `trg_profile_update_comments_stamp_edited_at` (migration 057). The
   * My Pulse comment row uses this to append "· edited" after the
   * created-at label.
   */
  editedAt?: string;
}

export interface UserProfile {
  id: string;
  displayName: string;
  /** @handle style, no @ stored */
  username?: string;
  firstName: string;
  lastName?: string;
  role: Role;
  specialty: Specialty;
  city: string;
  state: string;
  yearsExperience: number;
  bio: string;
  avatarUrl: string;
  followerCount: number;
  followingCount: number;
  likeCount: number;
  postCount: number;
  /** Wide My Pulse header — min ~1200×400 (3:1) recommended */
  bannerUrl?: string;
  /** Total shares across posts / profile surface */
  profileShareCount?: number;
  badges: Badge[];
  communitiesJoined: string[];
  /** Preferred name for joined spaces (alias of community ids); falls back to communitiesJoined */
  circlesJoined?: string[];
  privacyMode: PrivacyMode;
  interests: ContentInterest[];
  isVerified: boolean;
  /** When true, user can open in-app staff routes (e.g. `/admin`). Mirrors `profiles.role_admin`. */
  roleAdmin?: boolean;
  shiftPreference: ShiftPreference;
  /** Identity capsules — vibe, humor, role culture */
  identityTags?: string[];
  /** Visual header preset: night_shift | neon_pulse | sunset_scrubs | minimal_pulse | galaxy_vibes | ocean_calm */
  bannerTheme?: string;
  /** Primary featured sound card (overrides profileSong* when set) */
  featuredSound?: FeaturedSound | null;
  /** Persisted "Now Playing" — title + artist shown on profile; optional listen link */
  profileSongTitle?: string | null;
  profileSongArtist?: string | null;
  profileSongUrl?: string | null;
  /**
   * Album artwork URL for Current Vibe (populated by the Song Picker;
   * usually an iTunes 600x600 JPG). Used by `FeaturedSoundCard` to show
   * cover art when no full `featuredSound` object is set.
   */
  profileSongArtworkUrl?: string | null;
  /**
   * When true, the owner does not see the horizontal recent-posts strip on the My Pulse tab.
   * Visitors opening this profile still see recent public (and followers-only if they follow) posts.
   */
  hideRecentPostsOnMyPage?: boolean;
  isFollowed?: boolean;
  isFriend?: boolean;
  customization?: ProfileCustomization;
  /**
   * Denormalized Pulse Score v2 identity columns, kept in sync by
   * migration 059's `pulse_sync_profile_and_notify` trigger. Let the
   * feed / search / leaderboard surfaces render a tier badge without
   * firing per-user RPCs.
   */
  pulseTier?: string;
  pulseScoreCurrent?: number;
}

export interface CreatorSummary {
  id: string;
  displayName: string;
  /** Public @handle (lowercase), when set on profiles */
  username?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl: string;
  role: Role;
  specialty: Specialty;
  city: string;
  state: string;
  isVerified: boolean;
  /** Denormalized Pulse Score v2 tier (see migration 059). */
  pulseTier?: string;
  pulseScoreCurrent?: number;
}

export interface Post {
  id: string;
  creatorId: string;
  creator: CreatorSummary;
  type: PostType;
  caption: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  /** Trend / original audio label for feed */
  audioReference?: string;
  soundTitle?: string;
  /** When set, audio is attributed to another post (remix / use sound) */
  soundSourcePostId?: string;
  /** Source post media URL used to play attributed audio over a muted video track */
  soundSourceMediaUrl?: string;
  /** Side-by-side / layout duet: points at original clip */
  duetParentId?: string;
  evidenceUrl?: string;
  evidenceLabel?: string;
  /** day | night | weekend — shift-aware ranking hint */
  shiftContext?: string;
  hashtags: string[];
  communities: string[];
  isAnonymous: boolean;
  privacyMode: PrivacyMode;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  viewCount: number;
  saveCount: number;
  createdAt: string;
  rankingScore: number;
  feedTypeEligible: FeedType[];
  roleContext: Role;
  specialtyContext: Specialty;
  locationContext: string;
  isLiked?: boolean;
  isSaved?: boolean;
  isSponsored?: boolean;
  sponsorInfo?: SponsorInfo;
  /**
   * Server-stamped timestamp of the most recent caption/hashtag edit.
   * Populated by `trg_posts_stamp_edited_at` (migration 057). Post
   * detail surfaces use this to render "· edited" after the relative
   * time so viewers can tell a caption has been revised.
   */
  editedAt?: string;
}

export interface SponsorInfo {
  advertiserName: string;
  advertiserLogo?: string;
  ctaLabel: string;
  ctaUrl: string;
  campaignId: string;
  impressionTrackingUrl?: string;
}

export interface Community {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  accentColor: string;
  bannerUrl?: string;
  memberCount: number;
  postCount: number;
  isJoined: boolean;
  categories: string[];
  trendingTopics: string[];
  /**
   * Admin-curated position on Circles featured carousel (`featured_order` in DB).
   * `null` / `undefined` = not in the curated featured strip (falls back to legacy logic if none set).
   */
  featuredOrder?: number | null;
  /** Recently active members (e.g. last 30m), from `get_community_card_stats` */
  onlineCount?: number;
  /** Up to 5 avatar URLs for presence strip on featured cards */
  presenceAvatars?: string[];
}

/** Circles tab — same shape as Community in MVP. */
export type Circle = Community;

export type CircleThreadKind = 'question' | 'story' | 'advice' | 'meme' | 'media';

export interface CircleThread {
  id: string;
  circleId: string;
  circleSlug: string;
  authorId: string;
  /** Present when loaded from API with author join */
  author?: CreatorSummary;
  kind: CircleThreadKind;
  title: string;
  body: string;
  mediaThumbUrl?: string;
  linkedPostId?: string;
  createdAt: string;
  updatedAt?: string;
  replyCount: number;
  reactionCount: number;
  shareCount?: number;
}

export interface CircleReply {
  id: string;
  threadId: string;
  authorId: string;
  author?: CreatorSummary;
  body: string;
  createdAt: string;
  reactionCount?: number;
}

/** Circles home — top items across all rooms in the last 24h (threads and/or community posts). */
export interface TrendingTopic24h {
  id: string;
  /** Circle discussion — navigate to thread */
  threadId?: string;
  /** Community wall post — navigate to `/post/[id]` */
  postId?: string;
  circleId: string;
  circleSlug: string;
  circleName: string;
  title: string;
  preview: string;
  /** Thread: replies; post: comment count (shown as comments in UI). */
  replyCount: number;
  reactionCount: number;
  shareCount?: number;
  lastActiveAt: string;
}

export interface Job {
  id: string;
  title: string;
  employerName: string;
  employerLogo?: string;
  city: string;
  state: string;
  role: Role;
  specialty: Specialty;
  payMin: number;
  payMax: number;
  shift: string;
  employmentType: EmploymentType;
  description: string;
  requirements: string[];
  benefits: string[];
  isSaved: boolean;
  isFeatured: boolean;
  isNew: boolean;
  createdAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  author: CreatorSummary;
  /**
   * The current body shown to the viewer. When `isDeleted` is true the
   * server `content` will be replaced by the client-rendered tombstone
   * copy (e.g. "User Removed Their Comment") so we never echo whatever
   * was typed before the author removed it.
   */
  content: string;
  likeCount: number;
  replyCount: number;
  createdAt: string;
  /**
   * Server-stamped timestamp of the last time the author edited this
   * comment's body. Populated by the `trg_comments_stamp_edited_at`
   * trigger (migration 057). `null` / `undefined` means "never edited";
   * comment surfaces use this to render an "· edited" tag next to the
   * time so replies can be trusted as authoritative.
   */
  editedAt?: string;
  isPinned?: boolean;
  isLiked?: boolean;
  /**
   * True when the author soft-deleted this comment. Replies are
   * preserved underneath; the body is replaced with a tombstone and
   * actions (like / reply) are suppressed in every comment surface.
   */
  isDeleted?: boolean;
  replies: Comment[];
}

export interface NotificationItem {
  id: string;
  type: NotificationType;
  actor: CreatorSummary;
  message: string;
  createdAt: string;
  read: boolean;
  targetId?: string;
}

/** Original video post whose audio others can attach when filming (sound library). Curated entries in `sound_catalog` rank higher in `search_sound_library`. */
export interface SoundLibraryRow {
  postId: string;
  soundTitle: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  creatorId: string;
  creatorDisplayName: string;
  creatorAvatarUrl?: string;
  /** Times any clip has used this post as `sound_source_post_id` (all time). */
  remixCount: number;
}

/**
 * Same source ranked by how many clips used this sound in the last 7 days
 * (TikTok-style weekly velocity; production charts also weight views and region).
 */
export interface ViralSoundRow {
  postId: string;
  soundTitle: string;
  remixCount7d: number;
  lastRemixAt?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  creatorId: string;
  creatorDisplayName: string;
  creatorAvatarUrl?: string;
}

export type StreamStatus = 'live' | 'scheduled' | 'ended';

export type StreamCategory =
  | 'shift-talk'
  | 'study-session'
  | 'q-and-a'
  | 'day-in-the-life'
  | 'clinical-skills'
  | 'career-advice'
  | 'debrief'
  | 'chill'
  | 'other';

export interface LiveStream {
  id: string;
  hostId: string;
  host: CreatorSummary;
  title: string;
  description?: string;
  category: StreamCategory;
  thumbnailUrl?: string;
  status: StreamStatus;
  viewerCount: number;
  peakViewerCount: number;
  startedAt: string;
  scheduledFor?: string;
  endedAt?: string;
  tags: string[];
  communityId?: string;
  communityName?: string;
  isFollowingHost?: boolean;
}

export type StreamMessageType = 'chat' | 'gift' | 'system' | 'poll' | 'raid' | 'pinned';

export interface StreamMessage {
  id: string;
  streamId: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  content: string;
  role?: Role;
  isHost: boolean;
  isModerator: boolean;
  isSubscriber?: boolean;
  createdAt: string;
  messageType?: StreamMessageType;
  giftData?: LiveGiftEvent;
  pollData?: StreamPoll;
}

export type LiveGiftTier = 'free' | 'standard' | 'premium' | 'legendary';

export interface LiveGift {
  id: string;
  name: string;
  emoji: string;
  coinCost: number;
  tier: LiveGiftTier;
  animation?: 'float' | 'burst' | 'rain' | 'fullscreen';
  color: string;
}

export interface LiveGiftEvent {
  id: string;
  streamId: string;
  gift: LiveGift;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  quantity: number;
  comboCount: number;
  createdAt: string;
}

export interface StreamGiftLeaderboard {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  totalCoins: number;
  giftCount: number;
  rank: number;
}

export interface StreamPoll {
  id: string;
  streamId: string;
  question: string;
  options: StreamPollOption[];
  totalVotes: number;
  endsAt: string;
  isActive: boolean;
  createdBy: string;
}

export interface StreamPollOption {
  id: string;
  text: string;
  votes: number;
  percentage: number;
}

export interface StreamRaid {
  id: string;
  fromStreamId: string;
  toStreamId: string;
  fromHostName: string;
  viewerCount: number;
  createdAt: string;
}

export interface StreamPinnedMessage {
  id: string;
  streamId: string;
  content: string;
  pinnedBy: string;
  pinnedByName: string;
  createdAt: string;
}

export interface OnboardingData {
  firstName: string;
  lastName?: string;
  displayName: string;
  role: Role;
  specialty: Specialty;
  city: string;
  state: string;
  yearsExperience: number;
  shiftPreference: ShiftPreference;
  avatarUrl?: string;
  bio?: string;
  interests: ContentInterest[];
  communitiesToFollow: string[];
  privacyMode: PrivacyMode;
}

// ─── Monetization Types (hidden behind feature flags) ───

export type SubscriptionTier = 'free' | 'pro_monthly' | 'pro_yearly';

export interface SubscriptionPlan {
  id: string;
  tier: SubscriptionTier;
  name: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  revenueCatProductId?: string;
}

export type JobListingTier = 'basic' | 'standard' | 'premium' | 'featured';

export interface JobListingPricing {
  tier: JobListingTier;
  name: string;
  price: number;
  durationDays: number;
  features: string[];
  maxApplicants?: number;
  badge?: string;
}

export type TipAmount = 1 | 5 | 10 | 25 | 50 | 100;

export interface CreatorTip {
  id: string;
  fromUserId: string;
  toCreatorId: string;
  amount: TipAmount;
  message?: string;
  postId?: string;
  createdAt: string;
}

export interface CreatorEarnings {
  creatorId: string;
  totalTips: number;
  totalViews: number;
  totalLikes: number;
  monthlyEarnings: number;
  lifetimeEarnings: number;
  pendingPayout: number;
  lastPayoutAt?: string;
}

export type {
  ExportEndCardData,
  ExportEndCardBrandVariant,
  ExportEndCardBackgroundStyle,
  ExportEndCardAnimationPreset,
  ExportEndCardLayoutVariant,
  EndCardTheme,
} from './exportEndCard';
export { defaultEndCardTheme, resolveEndCardTheme } from './exportEndCard';

export interface AdCampaign {
  id: string;
  advertiserName: string;
  advertiserLogo?: string;
  title: string;
  description: string;
  mediaUrl: string;
  ctaLabel: string;
  ctaUrl: string;
  targetRoles: Role[];
  targetSpecialties: Specialty[];
  targetStates: string[];
  budgetTotal: number;
  budgetSpent: number;
  cpmRate: number;
  startDate: string;
  endDate: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  impressions: number;
  clicks: number;
}
