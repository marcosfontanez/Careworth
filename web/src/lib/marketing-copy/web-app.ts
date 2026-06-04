import type { Locale } from "@/lib/i18n";

/** Primary navigation entries for the PulseVerse Web shell. */
export type WebAppNavKey =
  | "feed"
  | "circles"
  | "live"
  | "myPulse"
  | "creatorHub"
  | "notifications"
  | "settings";

export type WebAppNavCopy = Record<WebAppNavKey, string>;

export type WebAppShellCopy = {
  /** Slim brand wordmark in the top bar. */
  wordmark: string;
  /** Top-bar create button. */
  createLabel: string;
  /** Centered top-bar search field placeholder. */
  searchPlaceholder: string;
  /** Generic "View all" affordance for rail section headers. */
  viewAll: string;
  /** Members suffix for rail circle rows. */
  membersLabel: string;
  /** Open the full app in a standalone tab. */
  openNewTab: string;
  /** Account menu — open full profile / my pulse. */
  accountProfile: string;
  /** Sign out action label. */
  signOut: string;
  nav: WebAppNavCopy;
  /** Right contextual rail. */
  railTitle: string;
  railTips: string[];
  /** Dynamic "Trending Circles" rail card. */
  railCirclesTitle: string;
  /** Dynamic "Suggested creators" rail card. */
  railCreatorsTitle: string;
  railSafetyTitle: string;
  railSafetyBody: string;
  railSafetyLink: string;
  railGetAppTitle: string;
  railGetAppBody: string;
  railGetAppLink: string;
};

/** Per-surface "coming soon to web" copy for not-yet-native routes. */
export type WebAppComingSoonCopy = {
  badge: string;
  title: string;
  body: string;
  openInApp: string;
  goToFeed: string;
};

export type WebAppFeedCopy = {
  title: string;
  subtitle: string;
  tabForYou: string;
  tabFollowing: string;
  tabTop: string;
  emptyTitle: string;
  emptyBody: string;
  /** Shown on the Following tab when the viewer follows no one (or no recent posts). */
  followingEmptyTitle: string;
  followingEmptyBody: string;
  errorTitle: string;
  errorBody: string;
  retry: string;
  openInApp: string;
  /** Card affordances. */
  anonymousLabel: string;
  openPost: string;
  videoBadge: string;
  liveBadge: string;
  /** Short-form video theater controls. */
  commentsLabel: string;
  shareLabel: string;
  copiedLabel: string;
  moreLabel: string;
  soundOnLabel: string;
  soundOffLabel: string;
  playLabel: string;
  pauseLabel: string;
  nextLabel: string;
  prevLabel: string;
  textPostLabel: string;
  fullscreenLabel: string;
  /** Read-only comments panel (Phase 4A). */
  commentsPanelTitle: string;
  commentsLoading: string;
  commentsEmptyTitle: string;
  commentsEmptyBody: string;
  commentsErrorTitle: string;
  commentsErrorBody: string;
  commentsRetry: string;
  commentsReplyCta: string;
  commentsReplyNote: string;
  commentsCloseLabel: string;
  repliesLabel: string;
  editedLabel: string;
  commentsMediaLabel: string;
  viewCommentsLabel: string;
  /** Comment composer (Phase 4D). */
  composerPlaceholder: string;
  composerSubmit: string;
  composerPosting: string;
  composerError: string;
  composerLoginCta: string;
};

export type WebAppLandingCopy = {
  kicker: string;
  title: string;
  subtitle: string;
  loginCta: string;
  getAppCta: string;
  /** Reassurance line under the CTAs. */
  ctaNote: string;
  /** Feature highlight cards. */
  features: { title: string; body: string }[];
};

/** Native My Pulse / public Pulse Page copy. */
export type WebAppProfileCopy = {
  ownerTitle: string;
  ownerSubtitle: string;
  /** Stat strip labels. */
  statFollowers: string;
  statFollowing: string;
  statPulse: string;
  pulseScoreLabel: string;
  /** Section headers. */
  pulseUpdatesTitle: string;
  pulseUpdatesEmpty: string;
  viewAllUpdates: string;
  gridView: string;
  listView: string;
  postsTitle: string;
  postsEmptyOwner: string;
  postsEmptyVisitor: string;
  /** My Pulse rolling feed (mirrors the native "My Pulse" section). */
  myPulseKicker: string;
  myPulseSubtitleOwner: string;
  myPulseSubtitleVisitor: string;
  /** Media Hub (videos / favorites / photos library). */
  mediaHubKicker: string;
  mediaHubTitle: string;
  mediaHubSubtitleOwner: string;
  mediaHubSubtitleVisitor: string;
  mediaTabVideos: string;
  mediaTabFavorites: string;
  mediaTabPhotos: string;
  mediaEmptyVideosOwner: string;
  mediaEmptyVideosVisitor: string;
  mediaEmptyPhotosOwner: string;
  mediaEmptyPhotosVisitor: string;
  mediaEmptyFavorites: string;
  /** Read-only / locked states. */
  privateTitle: string;
  privateBody: string;
  blockedTitle: string;
  blockedBody: string;
  unavailableTitle: string;
  unavailableBody: string;
  /** Affordances. */
  editProfile: string;
  openInApp: string;
  backToFeed: string;
  goToFeed: string;
  openPost: string;
  videoBadge: string;
  verifiedLabel: string;
  errorTitle: string;
  errorBody: string;
};

/** Native Circles read views copy. */
export type WebAppCirclesCopy = {
  indexTitle: string;
  indexSubtitle: string;
  pinnedLabel: string;
  membersLabel: string;
  postsLabel: string;
  indexEmptyTitle: string;
  indexEmptyBody: string;
  /** Index browse affordances. */
  searchPlaceholder: string;
  searchEmpty: string;
  viewLabel: string;
  joinedLabel: string;
  featuredKicker: string;
  /** Circle detail. */
  postsSectionTitle: string;
  threadsTitle: string;
  threadsEmpty: string;
  aboutTitle: string;
  /** Thread detail. */
  repliesTitle: string;
  repliesEmpty: string;
  anonymousLabel: string;
  confessionLabel: string;
  confessionNote: string;
  /** Affordances + posting deferral. */
  openInApp: string;
  postInApp: string;
  replyInApp: string;
  joinInApp: string;
  backToCircles: string;
  backToCircle: string;
  goToFeed: string;
  openThread: string;
  unavailableTitle: string;
  unavailableBody: string;
  errorTitle: string;
  errorBody: string;
  /** Reply composer (Phase 4E). */
  replyComposerPlaceholder: string;
  replyComposerSubmit: string;
  replyComposerPosting: string;
  replyComposerError: string;
  replyComposerLoginCta: string;
  /** Membership-gated reply (web has no join flow yet). */
  replyMembersOnly: string;
  /** Reply blocked because of a block relationship with the thread author. */
  replyBlocked: string;
  /** Native web join / leave (unlocks replying). */
  joinToReplyTitle: string;
  joinToReplyBody: string;
  joinCta: string;
  joinPending: string;
  joinError: string;
  joinedCta: string;
  leaveCta: string;
  /** My Circles section. */
  myCirclesTitle: string;
  myCirclesEmptyTitle: string;
  myCirclesEmptyBody: string;
  exploreCirclesCta: string;
  discoverTitle: string;
  /** Wall-post comment toggle. */
  wallCommentLabel: string;
};

/** Shared engagement (follow / like) action labels. */
export type WebAppEngagementCopy = {
  follow: string;
  following: string;
  followError: string;
  like: string;
  liked: string;
  likeError: string;
};

export type WebAppCreatorHubCopy = {
  title: string;
  subtitle: string;
  /** Create tiles. */
  createTitle: string;
  uploadVideo: string;
  goLive: string;
  brollStudio: string;
  clipStudio: string;
  newPost: string;
  createNote: string;
  /** Analytics. */
  analyticsTitle: string;
  statFollowers: string;
  statFollowing: string;
  statPulse: string;
  /** Uploads. */
  uploadsTitle: string;
  uploadsEmpty: string;
  draftsTitle: string;
  draftsNote: string;
  openInApp: string;
  /** Phase 6 dashboard additions. */
  statPosts: string;
  statLikes: string;
  statComments: string;
  recentEngagementNote: string;
  contentStatusTitle: string;
  statusLive: string;
  statusProcessing: string;
  statusFailed: string;
  statusScheduled: string;
  toolsTitle: string;
  brollTitle: string;
  brollBody: string;
  shopTitle: string;
  shopBody: string;
  shopCta: string;
  equippedBorder: string;
  createTileTitle: string;
  createTileBody: string;
  createTileCta: string;
  errorTitle: string;
  errorBody: string;
};

export type WebAppCreateCopy = {
  title: string;
  subtitle: string;
  textTitle: string;
  textBody: string;
  textPlaceholder: string;
  moodPlaceholder: string;
  postCta: string;
  postingCta: string;
  successTitle: string;
  successBody: string;
  viewMyPulse: string;
  composeAnother: string;
  errorGeneric: string;
  emptyError: string;
  tooLongError: string;
  imageTitle: string;
  imageBody: string;
  videoTitle: string;
  videoBody: string;
  circleTitle: string;
  circleBody: string;
  openInApp: string;
  inAppNote: string;
};

export type WebAppShopCopy = {
  title: string;
  subtitle: string;
  bordersTitle: string;
  equipped: string;
  equip: string;
  equipping: string;
  unequip: string;
  equipError: string;
  noBordersTitle: string;
  noBordersBody: string;
  purchaseTitle: string;
  purchaseBody: string;
  purchaseCta: string;
  monetizationTitle: string;
  monetizationBody: string;
  errorTitle: string;
  errorBody: string;
  retry: string;
  rarityLabel: string;
};

export type WebAppNotificationsCopy = {
  title: string;
  subtitle: string;
  markAllRead: string;
  emptyTitle: string;
  emptyBody: string;
  errorTitle: string;
  errorBody: string;
  retry: string;
  newBadge: string;
  goToFeed: string;
};

export type WebAppLiveCopy = {
  title: string;
  subtitle: string;
  liveNowTitle: string;
  upcomingTitle: string;
  liveBadge: string;
  viewersLabel: string;
  startedLabel: string;
  scheduledLabel: string;
  joinCta: string;
  viewLabel: string;
  hostFallback: string;
  emptyTitle: string;
  emptyBody: string;
  errorTitle: string;
  errorBody: string;
  safetyTitle: string;
  safetyBody: string;
  /** Live detail page (/web-app/live/[id]). */
  watchInApp: string;
  backToLive: string;
  endedTitle: string;
  endedBody: string;
  scheduledStartsLabel: string;
  moreLiveTitle: string;
  detailUnavailableTitle: string;
  detailUnavailableBody: string;
  watchNote: string;
};

export type WebAppPageCopy = {
  metaTitle: string;
  metaDescription: string;
  shell: WebAppShellCopy;
  comingSoon: Record<Exclude<WebAppNavKey, "feed">, WebAppComingSoonCopy>;
  feed: WebAppFeedCopy;
  profile: WebAppProfileCopy;
  circles: WebAppCirclesCopy;
  creatorHub: WebAppCreatorHubCopy;
  create: WebAppCreateCopy;
  notifications: WebAppNotificationsCopy;
  shop: WebAppShopCopy;
  live: WebAppLiveCopy;
  engagement: WebAppEngagementCopy;
  landing: WebAppLandingCopy;
};

const copy: Record<Locale, WebAppPageCopy> = {
  en: {
    metaTitle: "PulseVerse Web · Beta",
    metaDescription:
      "PulseVerse Web beta — browse Feed, Circles, Live, My Pulse, Creator Hub, and Notifications in your browser. Sign in with your PulseVerse account; rich creation and Settings still work best in the mobile app.",
    shell: {
      wordmark: "PulseVerse Web",
      createLabel: "Create",
      searchPlaceholder: "Search PulseVerse",
      viewAll: "View all",
      membersLabel: "members",
      openNewTab: "Open in app",
      accountProfile: "My Pulse",
      signOut: "Sign out",
      nav: {
        feed: "Feed",
        circles: "Circles",
        live: "Live",
        myPulse: "My Pulse",
        creatorHub: "Creator Hub",
        notifications: "Notifications",
        settings: "Settings",
      },
      railTitle: "PulseVerse Web · Beta",
      railTips: [
        "Feed, Circles, Live, My Pulse, Creator Hub, and Notifications work in this browser preview today.",
        "Video upload, Live broadcasting, and full account Settings still work best in the mobile app.",
        "Everything stays in sync with your PulseVerse account on iOS and Android.",
      ],
      railCirclesTitle: "Trending Circles",
      railCreatorsTitle: "Suggested creators",
      railSafetyTitle: "Healthy, respectful community",
      railSafetyBody:
        "Confessions stay anonymous, private posts stay private, and blocked accounts stay hidden — on web too.",
      railSafetyLink: "Community guidelines",
      railGetAppTitle: "Prefer mobile?",
      railGetAppBody: "Get the full PulseVerse app for iOS and Android.",
      railGetAppLink: "Get the app",
    },
    comingSoon: {
      circles: {
        badge: "Available on web beta",
        title: "Circles on PulseVerse Web",
        body: "Browse communities, threads, and replies in your browser. Join and post with the same privacy rules as the mobile app.",
        openInApp: "Open Circles in app",
        goToFeed: "Go to Feed",
      },
      live: {
        badge: "Available on web beta",
        title: "Live on PulseVerse Web",
        body: "See who is live and open rooms from the browser. Watching and hosting still work best in the mobile app.",
        openInApp: "Open Live in app",
        goToFeed: "Go to Feed",
      },
      myPulse: {
        badge: "Available on web beta",
        title: "My Pulse on PulseVerse Web",
        body: "Your profile, updates, and Media Hub are available in the browser beta today.",
        openInApp: "Open My Pulse in app",
        goToFeed: "Go to Feed",
      },
      creatorHub: {
        badge: "Available on web beta",
        title: "Creator Hub on PulseVerse Web",
        body: "Dashboard and text posting work on web. Rich video, B-roll, and go-live tools remain in the mobile app.",
        openInApp: "Open Creator Hub in app",
        goToFeed: "Go to Feed",
      },
      notifications: {
        badge: "Available on web beta",
        title: "Notifications on PulseVerse Web",
        body: "Recent activity across your posts, Circles, and follows is available in the browser beta today.",
        openInApp: "Open Notifications in app",
        goToFeed: "Go to Feed",
      },
      settings: {
        badge: "Coming soon to web",
        title: "Settings are coming to the web",
        body: "Account and privacy controls are getting a desktop home. For now, manage settings in the app.",
        openInApp: "Open Settings in app",
        goToFeed: "Go to Feed",
      },
    },
    feed: {
      title: "Your Feed",
      subtitle: "The latest from across PulseVerse.",
      tabForYou: "For You",
      tabFollowing: "Following",
      tabTop: "Top Today",
      emptyTitle: "Your feed is warming up",
      emptyBody:
        "There’s nothing to show here yet. Follow a few creators or open the app to get started.",
      followingEmptyTitle: "Nothing from your follows yet",
      followingEmptyBody:
        "Follow a few creators to see their latest here, or explore For You and Top Today.",
      errorTitle: "We couldn’t load your feed",
      errorBody:
        "Something went wrong fetching your feed. Try again in a moment, or open the full app.",
      retry: "Try again",
      openInApp: "Open in app",
      anonymousLabel: "Anonymous",
      openPost: "Open post",
      videoBadge: "Video",
      liveBadge: "Live",
      commentsLabel: "Comments",
      shareLabel: "Share",
      copiedLabel: "Copied",
      moreLabel: "More",
      soundOnLabel: "Unmute",
      soundOffLabel: "Mute",
      playLabel: "Play",
      pauseLabel: "Pause",
      nextLabel: "Next",
      prevLabel: "Previous",
      textPostLabel: "Post",
      fullscreenLabel: "Fullscreen",
      commentsPanelTitle: "Comments",
      commentsLoading: "Loading comments…",
      commentsEmptyTitle: "No comments yet",
      commentsEmptyBody: "Be the first to join the conversation — open the app to reply.",
      commentsErrorTitle: "Couldn’t load comments",
      commentsErrorBody: "Something went wrong. Try again in a moment.",
      commentsRetry: "Try again",
      commentsReplyCta: "Open in app to reply",
      commentsReplyNote: "Replies are read-only on web for now.",
      commentsCloseLabel: "Close comments",
      repliesLabel: "replies",
      editedLabel: "edited",
      commentsMediaLabel: "Shared a photo",
      viewCommentsLabel: "View comments",
      composerPlaceholder: "Add a comment…",
      composerSubmit: "Post",
      composerPosting: "Posting…",
      composerError: "Couldn’t post your comment. Try again.",
      composerLoginCta: "Log in to comment",
    },
    profile: {
      ownerTitle: "My Pulse",
      ownerSubtitle: "Your profile, updates, and media.",
      statFollowers: "Followers",
      statFollowing: "Following",
      statPulse: "Pulse",
      pulseScoreLabel: "Pulse Score",
      pulseUpdatesTitle: "My Pulse",
      pulseUpdatesEmpty: "No Pulse updates yet.",
      viewAllUpdates: "View all updates",
      gridView: "Grid view",
      listView: "List view",
      postsTitle: "Posts",
      postsEmptyOwner: "You haven’t posted anything yet. Create your first post in the app.",
      postsEmptyVisitor: "Nothing to show here yet.",
      myPulseKicker: "Activity",
      myPulseSubtitleOwner: "Your latest 5 updates. Always fresh.",
      myPulseSubtitleVisitor: "Their latest 5 updates. Always fresh.",
      mediaHubKicker: "Library",
      mediaHubTitle: "Media Hub",
      mediaHubSubtitleOwner: "Your videos, saves, and photos in one place.",
      mediaHubSubtitleVisitor: "Videos, favorites, and photos they share.",
      mediaTabVideos: "Videos",
      mediaTabFavorites: "Favorites",
      mediaTabPhotos: "Photos",
      mediaEmptyVideosOwner: "No videos yet. Share a clip in the app and it shows up here.",
      mediaEmptyVideosVisitor: "No videos to show yet.",
      mediaEmptyPhotosOwner: "No photos yet. Add a photo post or Pics update in the app.",
      mediaEmptyPhotosVisitor: "No photos to show yet.",
      mediaEmptyFavorites: "No favorites saved. Tap the bookmark on any post to save it here.",
      privateTitle: "This profile is private",
      privateBody: "This member keeps their posts and updates private.",
      blockedTitle: "Content hidden",
      blockedBody: "You’ve blocked this member, so their posts and updates are hidden here.",
      unavailableTitle: "User unavailable",
      unavailableBody: "This profile can’t be shown. It may have been removed or is not available right now.",
      editProfile: "Edit in app",
      openInApp: "Open in app",
      backToFeed: "Back to Feed",
      goToFeed: "Go to Feed",
      openPost: "Open post",
      videoBadge: "Video",
      verifiedLabel: "Verified",
      errorTitle: "We couldn’t load this profile",
      errorBody: "Something went wrong. Try again in a moment, or open the full app.",
    },
    circles: {
      indexTitle: "Circles",
      indexSubtitle: "Communities and conversations across PulseVerse.",
      pinnedLabel: "Pinned",
      membersLabel: "members",
      postsLabel: "posts",
      indexEmptyTitle: "No circles yet",
      indexEmptyBody: "Circles will appear here as communities grow. Open the app to explore.",
      searchPlaceholder: "Search circles",
      searchEmpty: "No circles match your search.",
      viewLabel: "View",
      joinedLabel: "Joined",
      featuredKicker: "Featured",
      postsSectionTitle: "Circle posts",
      threadsTitle: "Discussions",
      threadsEmpty: "No discussions yet in this Circle.",
      aboutTitle: "About",
      repliesTitle: "Replies",
      repliesEmpty: "No replies yet.",
      anonymousLabel: "Anonymous",
      confessionLabel: "Confession",
      confessionNote:
        "Confessions are anonymous. Identities are hidden from other members on web too.",
      openInApp: "Open in app",
      postInApp: "Post in app",
      replyInApp: "Reply in app",
      joinInApp: "Join in app",
      backToCircles: "All Circles",
      backToCircle: "Back to Circle",
      goToFeed: "Go to Feed",
      openThread: "Open thread",
      unavailableTitle: "Circle unavailable",
      unavailableBody: "This Circle can’t be shown. It may have been removed or is not available right now.",
      errorTitle: "We couldn’t load Circles",
      errorBody: "Something went wrong. Try again in a moment, or open the full app.",
      replyComposerPlaceholder: "Write a reply…",
      replyComposerSubmit: "Reply",
      replyComposerPosting: "Posting…",
      replyComposerError: "Couldn’t post your reply. Try again.",
      replyComposerLoginCta: "Log in to reply",
      replyMembersOnly: "Join this Circle to reply.",
      replyBlocked: "You can’t reply to this thread because of a block.",
      joinToReplyTitle: "Join to reply",
      joinToReplyBody: "Join this Circle to post your reply. You can leave anytime.",
      joinCta: "Join Circle",
      joinPending: "Joining…",
      joinError: "Couldn’t join. Try again.",
      joinedCta: "Joined",
      leaveCta: "Leave",
      myCirclesTitle: "My Circles",
      myCirclesEmptyTitle: "You haven’t joined any Circles yet.",
      myCirclesEmptyBody: "Join Circles in the app to see them here and jump back in fast.",
      exploreCirclesCta: "Explore Circles",
      discoverTitle: "Discover",
      wallCommentLabel: "Comments",
    },
    creatorHub: {
      title: "Creator Hub",
      subtitle: "Create, manage, and grow your PulseVerse.",
      createTitle: "Create",
      uploadVideo: "Upload Video",
      goLive: "Go Live",
      brollStudio: "B-roll Studio",
      clipStudio: "Clip Studio",
      newPost: "New Post",
      createNote: "Creation tools live in the PulseVerse app — tap any tile to continue there.",
      analyticsTitle: "Your stats",
      statFollowers: "Followers",
      statFollowing: "Following",
      statPulse: "Pulse Score",
      uploadsTitle: "Recent content",
      uploadsEmpty: "Nothing published yet. Share your first post from the web or the app.",
      draftsTitle: "Drafts",
      draftsNote: "Drafts are managed in the app.",
      openInApp: "Open in app",
      statPosts: "Posts",
      statLikes: "Recent likes",
      statComments: "Recent comments",
      recentEngagementNote: "Across your most recent posts.",
      contentStatusTitle: "Content status",
      statusLive: "Live",
      statusProcessing: "Processing",
      statusFailed: "Needs attention",
      statusScheduled: "Scheduled",
      toolsTitle: "Creator tools",
      brollTitle: "B-roll Studio",
      brollBody: "Layer cutaways, overlays, green screen, and templates. The full editor lives in the app.",
      shopTitle: "Shop & monetization",
      shopBody: "View your owned borders and cosmetics. Purchases are managed in the app.",
      shopCta: "Manage cosmetics",
      equippedBorder: "Equipped border",
      createTileTitle: "Create a post",
      createTileBody: "Share a quick thought now, or open the app for photo and video.",
      createTileCta: "Start creating",
      errorTitle: "We couldn’t load your Creator Hub",
      errorBody: "Something went wrong. Try again in a moment, or open the full app.",
    },
    create: {
      title: "Create",
      subtitle: "Share a quick update from the web, or open the app for richer tools.",
      textTitle: "Pulse update",
      textBody: "Post a text update to your My Pulse — visible to your followers.",
      textPlaceholder: "What’s on your mind?",
      moodPlaceholder: "Mood (optional)",
      postCta: "Post update",
      postingCta: "Posting…",
      successTitle: "Posted to My Pulse",
      successBody: "Your update is live on your Pulse page.",
      viewMyPulse: "View My Pulse",
      composeAnother: "Write another",
      errorGeneric: "Couldn’t post your update. Try again.",
      emptyError: "Write something first.",
      tooLongError: "That’s a bit long — keep it under 500 characters.",
      imageTitle: "Photo post",
      imageBody: "Carousels and filters are crafted in the app.",
      videoTitle: "Video",
      videoBody: "Upload, trim, captions, and effects live in the app.",
      circleTitle: "Circle post",
      circleBody: "Start a discussion or confession from the app.",
      openInApp: "Open in app",
      inAppNote: "Photo, video, and Circle posting are available in the PulseVerse app while we bring them to the web.",
    },
    notifications: {
      title: "Notifications",
      subtitle: "Recent activity across your posts, Circles, and follows.",
      markAllRead: "Mark all read",
      emptyTitle: "You’re all caught up",
      emptyBody: "New follows, likes, comments, and Circle activity will show up here.",
      errorTitle: "We couldn’t load your notifications",
      errorBody: "Something went wrong. Try again in a moment.",
      retry: "Try again",
      newBadge: "New",
      goToFeed: "Go to Feed",
    },
    shop: {
      title: "Shop & cosmetics",
      subtitle: "Your owned borders and items. Purchases are managed in the app.",
      bordersTitle: "Your borders",
      equipped: "Equipped",
      equip: "Equip",
      equipping: "Equipping…",
      unequip: "Remove",
      equipError: "Couldn’t update your border. Try again.",
      noBordersTitle: "No borders yet",
      noBordersBody: "Earn or claim borders in the PulseVerse app to show them on your Pulse page.",
      purchaseTitle: "Buy borders & Sparks",
      purchaseBody: "Purchases are handled securely through the App Store and Google Play in the PulseVerse app.",
      purchaseCta: "Open PulseVerse app to purchase",
      monetizationTitle: "Creator monetization",
      monetizationBody: "Gifts, diamonds, and payouts are managed in the app.",
      errorTitle: "We couldn’t load your shop",
      errorBody: "Something went wrong. Try again in a moment.",
      retry: "Try again",
      rarityLabel: "Rarity",
    },
    live: {
      title: "Live",
      subtitle: "Real-time rooms from PulseVerse creators.",
      liveNowTitle: "Live now",
      upcomingTitle: "Upcoming",
      liveBadge: "LIVE",
      viewersLabel: "watching",
      startedLabel: "Started",
      scheduledLabel: "Starts",
      joinCta: "Join in app",
      viewLabel: "Watch",
      hostFallback: "Host",
      emptyTitle: "No live rooms right now",
      emptyBody: "Nobody’s live at the moment. Check back soon, or open the app to start your own.",
      errorTitle: "We couldn’t load Live",
      errorBody: "Something went wrong. Try again in a moment, or open the full app.",
      safetyTitle: "Live, kept safe",
      safetyBody:
        "Streams follow the same community rules — blocked accounts stay hidden and private rooms stay private.",
      watchInApp: "Watch in app",
      backToLive: "All Live",
      endedTitle: "This stream has ended",
      endedBody: "The broadcast wrapped up. Browse who’s live now, or catch the next one in the app.",
      scheduledStartsLabel: "Starts",
      moreLiveTitle: "More live now",
      detailUnavailableTitle: "Stream unavailable",
      detailUnavailableBody: "This stream can’t be shown. It may have ended or isn’t available right now.",
      watchNote: "Live video plays in the PulseVerse app — tap watch to jump straight into the room.",
    },
    engagement: {
      follow: "Follow",
      following: "Following",
      followError: "Couldn’t update. Tap to retry.",
      like: "Like",
      liked: "Liked",
      likeError: "Couldn’t update like.",
    },
    landing: {
      kicker: "PulseVerse Web · Beta",
      title: "PulseVerse in your browser — beta preview",
      subtitle:
        "Sign in to browse Feed, Circles, Live, My Pulse, Creator Hub, and Notifications on the web. Video creation, Live broadcasting, and account Settings still work best in the mobile app.",
      loginCta: "Log in to PulseVerse Web beta",
      getAppCta: "Get the mobile app",
      ctaNote: "Sign in with your PulseVerse email. New here? Create your account in the mobile app first.",
      features: [
        { title: "Feed", body: "Scroll videos and posts in a desktop-friendly column — available now on web." },
        {
          title: "Circles",
          body: "Browse communities, threads, and replies with the same privacy rules — available now on web.",
        },
        {
          title: "Live",
          body: "See who is live and open rooms from the browser — watching and hosting still work best in the app.",
        },
        { title: "My Pulse", body: "Your profile, updates, and Media Hub — available now on web." },
        {
          title: "Creator Hub",
          body: "Dashboard and text posting on web; rich video, B-roll, and go-live tools in the app.",
        },
        {
          title: "Browser + app sync",
          body: "The same account across web beta and mobile. Settings on web are still coming soon.",
        },
      ],
    },
  },
  es: {
    metaTitle: "PulseVerse Web · Beta",
    metaDescription:
      "PulseVerse Web beta — explora Feed, Círculos, En vivo, My Pulse, Creator Hub y Notificaciones en el navegador. Inicia sesión con tu cuenta; la creación avanzada y Ajustes funcionan mejor en la app móvil.",
    shell: {
      wordmark: "PulseVerse Web",
      createLabel: "Crear",
      searchPlaceholder: "Buscar en PulseVerse",
      viewAll: "Ver todo",
      membersLabel: "miembros",
      openNewTab: "Abrir en la app",
      accountProfile: "My Pulse",
      signOut: "Cerrar sesión",
      nav: {
        feed: "Feed",
        circles: "Círculos",
        live: "En vivo",
        myPulse: "My Pulse",
        creatorHub: "Creator Hub",
        notifications: "Notificaciones",
        settings: "Ajustes",
      },
      railTitle: "PulseVerse Web · Beta",
      railTips: [
        "Feed, Círculos, En vivo, My Pulse, Creator Hub y Notificaciones funcionan hoy en esta vista previa del navegador.",
        "Subir vídeo, emitir en vivo y los Ajustes completos de cuenta funcionan mejor en la app móvil.",
        "Todo se mantiene sincronizado con tu cuenta de PulseVerse en iOS y Android.",
      ],
      railCirclesTitle: "Círculos en tendencia",
      railCreatorsTitle: "Creadores sugeridos",
      railSafetyTitle: "Comunidad sana y respetuosa",
      railSafetyBody:
        "Las confesiones siguen siendo anónimas, las publicaciones privadas siguen privadas y las cuentas bloqueadas se ocultan — también en la web.",
      railSafetyLink: "Normas de la comunidad",
      railGetAppTitle: "¿Prefieres el móvil?",
      railGetAppBody: "Consigue la app completa de PulseVerse para iOS y Android.",
      railGetAppLink: "Obtener la app",
    },
    comingSoon: {
      circles: {
        badge: "Disponible en la web beta",
        title: "Círculos en PulseVerse Web",
        body: "Explora comunidades, hilos y respuestas en el navegador. Únete y publica con las mismas reglas de privacidad que en la app móvil.",
        openInApp: "Abrir Círculos en la app",
        goToFeed: "Ir al Feed",
      },
      live: {
        badge: "Disponible en la web beta",
        title: "En vivo en PulseVerse Web",
        body: "Mira quién está en vivo y abre salas desde el navegador. Ver y emitir funcionan mejor en la app móvil.",
        openInApp: "Abrir En vivo en la app",
        goToFeed: "Ir al Feed",
      },
      myPulse: {
        badge: "Disponible en la web beta",
        title: "My Pulse en PulseVerse Web",
        body: "Tu perfil, novedades y Media Hub están disponibles hoy en la beta del navegador.",
        openInApp: "Abrir My Pulse en la app",
        goToFeed: "Ir al Feed",
      },
      creatorHub: {
        badge: "Disponible en la web beta",
        title: "Creator Hub en PulseVerse Web",
        body: "El panel y las publicaciones de texto funcionan en la web. Vídeo avanzado, B-roll y herramientas en vivo siguen en la app móvil.",
        openInApp: "Abrir Creator Hub en la app",
        goToFeed: "Ir al Feed",
      },
      notifications: {
        badge: "Disponible en la web beta",
        title: "Notificaciones en PulseVerse Web",
        body: "La actividad reciente en tus publicaciones, Círculos y seguidores está disponible hoy en la beta del navegador.",
        openInApp: "Abrir Notificaciones en la app",
        goToFeed: "Ir al Feed",
      },
      settings: {
        badge: "Pronto en la web",
        title: "Los ajustes llegarán pronto a la web",
        body: "Los controles de cuenta y privacidad tendrán su espacio en el escritorio. Por ahora, gestiona los ajustes en la app.",
        openInApp: "Abrir Ajustes en la app",
        goToFeed: "Ir al Feed",
      },
    },
    feed: {
      title: "Tu Feed",
      subtitle: "Lo último de todo PulseVerse.",
      tabForYou: "Para ti",
      tabFollowing: "Siguiendo",
      tabTop: "Top de hoy",
      emptyTitle: "Tu feed se está preparando",
      emptyBody:
        "Aún no hay nada que mostrar aquí. Sigue a algunos creadores o abre la app para empezar.",
      followingEmptyTitle: "Aún no hay nada de tus seguidos",
      followingEmptyBody:
        "Sigue a algunos creadores para ver lo último aquí, o explora Para ti y Top de hoy.",
      errorTitle: "No pudimos cargar tu feed",
      errorBody:
        "Algo salió mal al cargar tu feed. Inténtalo de nuevo en un momento o abre la app completa.",
      retry: "Reintentar",
      openInApp: "Abrir en la app",
      anonymousLabel: "Anónimo",
      openPost: "Abrir publicación",
      videoBadge: "Vídeo",
      liveBadge: "En vivo",
      commentsLabel: "Comentarios",
      shareLabel: "Compartir",
      copiedLabel: "Copiado",
      moreLabel: "Más",
      soundOnLabel: "Activar sonido",
      soundOffLabel: "Silenciar",
      playLabel: "Reproducir",
      pauseLabel: "Pausar",
      nextLabel: "Siguiente",
      prevLabel: "Anterior",
      textPostLabel: "Publicación",
      fullscreenLabel: "Pantalla completa",
      commentsPanelTitle: "Comentarios",
      commentsLoading: "Cargando comentarios…",
      commentsEmptyTitle: "Aún no hay comentarios",
      commentsEmptyBody: "Sé el primero en participar — abre la app para responder.",
      commentsErrorTitle: "No se pudieron cargar los comentarios",
      commentsErrorBody: "Algo salió mal. Inténtalo de nuevo en un momento.",
      commentsRetry: "Reintentar",
      commentsReplyCta: "Abrir en la app para responder",
      commentsReplyNote: "Las respuestas son de solo lectura en la web por ahora.",
      commentsCloseLabel: "Cerrar comentarios",
      repliesLabel: "respuestas",
      editedLabel: "editado",
      commentsMediaLabel: "Compartió una foto",
      viewCommentsLabel: "Ver comentarios",
      composerPlaceholder: "Añade un comentario…",
      composerSubmit: "Publicar",
      composerPosting: "Publicando…",
      composerError: "No se pudo publicar tu comentario. Inténtalo de nuevo.",
      composerLoginCta: "Inicia sesión para comentar",
    },
    profile: {
      ownerTitle: "My Pulse",
      ownerSubtitle: "Tu perfil, novedades y contenido.",
      statFollowers: "Seguidores",
      statFollowing: "Siguiendo",
      statPulse: "Pulse",
      pulseScoreLabel: "Pulse Score",
      pulseUpdatesTitle: "Mi Pulse",
      pulseUpdatesEmpty: "Aún no hay novedades de Pulse.",
      viewAllUpdates: "Ver todas las novedades",
      gridView: "Vista de cuadrícula",
      listView: "Vista de lista",
      postsTitle: "Publicaciones",
      postsEmptyOwner: "Aún no has publicado nada. Crea tu primera publicación en la app.",
      postsEmptyVisitor: "Aún no hay nada que mostrar aquí.",
      myPulseKicker: "Actividad",
      myPulseSubtitleOwner: "Tus últimas 5 novedades. Siempre frescas.",
      myPulseSubtitleVisitor: "Sus últimas 5 novedades. Siempre frescas.",
      mediaHubKicker: "Biblioteca",
      mediaHubTitle: "Centro multimedia",
      mediaHubSubtitleOwner: "Tus videos, guardados y fotos en un solo lugar.",
      mediaHubSubtitleVisitor: "Videos, favoritos y fotos que comparte.",
      mediaTabVideos: "Videos",
      mediaTabFavorites: "Favoritos",
      mediaTabPhotos: "Fotos",
      mediaEmptyVideosOwner: "Aún no hay videos. Comparte un clip en la app y aparecerá aquí.",
      mediaEmptyVideosVisitor: "Aún no hay videos para mostrar.",
      mediaEmptyPhotosOwner: "Aún no hay fotos. Agrega una publicación con foto o una novedad de Fotos en la app.",
      mediaEmptyPhotosVisitor: "Aún no hay fotos para mostrar.",
      mediaEmptyFavorites: "No has guardado favoritos. Toca el marcador en cualquier publicación para guardarlo aquí.",
      privateTitle: "Este perfil es privado",
      privateBody: "Este miembro mantiene sus publicaciones y novedades en privado.",
      blockedTitle: "Contenido oculto",
      blockedBody: "Has bloqueado a este miembro, así que sus publicaciones y novedades están ocultas aquí.",
      unavailableTitle: "Usuario no disponible",
      unavailableBody: "No se puede mostrar este perfil. Es posible que se haya eliminado o que no esté disponible ahora mismo.",
      editProfile: "Editar en la app",
      openInApp: "Abrir en la app",
      backToFeed: "Volver al Feed",
      goToFeed: "Ir al Feed",
      openPost: "Abrir publicación",
      videoBadge: "Vídeo",
      verifiedLabel: "Verificado",
      errorTitle: "No pudimos cargar este perfil",
      errorBody: "Algo salió mal. Inténtalo de nuevo en un momento o abre la app completa.",
    },
    circles: {
      indexTitle: "Círculos",
      indexSubtitle: "Comunidades y conversaciones en todo PulseVerse.",
      pinnedLabel: "Fijado",
      membersLabel: "miembros",
      postsLabel: "publicaciones",
      indexEmptyTitle: "Aún no hay círculos",
      indexEmptyBody: "Los círculos aparecerán aquí a medida que crezcan las comunidades. Abre la app para explorar.",
      searchPlaceholder: "Buscar círculos",
      searchEmpty: "Ningún círculo coincide con tu búsqueda.",
      viewLabel: "Ver",
      joinedLabel: "Unido",
      featuredKicker: "Destacado",
      postsSectionTitle: "Publicaciones del Círculo",
      threadsTitle: "Conversaciones",
      threadsEmpty: "Aún no hay conversaciones en este Círculo.",
      aboutTitle: "Acerca de",
      repliesTitle: "Respuestas",
      repliesEmpty: "Aún no hay respuestas.",
      anonymousLabel: "Anónimo",
      confessionLabel: "Confesión",
      confessionNote:
        "Las confesiones son anónimas. Las identidades se ocultan a los demás miembros también en la web.",
      openInApp: "Abrir en la app",
      postInApp: "Publicar en la app",
      replyInApp: "Responder en la app",
      joinInApp: "Unirse en la app",
      backToCircles: "Todos los Círculos",
      backToCircle: "Volver al Círculo",
      goToFeed: "Ir al Feed",
      openThread: "Abrir conversación",
      unavailableTitle: "Círculo no disponible",
      unavailableBody: "No se puede mostrar este Círculo. Es posible que se haya eliminado o que no esté disponible ahora mismo.",
      errorTitle: "No pudimos cargar los Círculos",
      errorBody: "Algo salió mal. Inténtalo de nuevo en un momento o abre la app completa.",
      replyComposerPlaceholder: "Escribe una respuesta…",
      replyComposerSubmit: "Responder",
      replyComposerPosting: "Publicando…",
      replyComposerError: "No se pudo publicar tu respuesta. Inténtalo de nuevo.",
      replyComposerLoginCta: "Inicia sesión para responder",
      replyMembersOnly: "Únete a este Círculo para responder.",
      replyBlocked: "No puedes responder a este hilo debido a un bloqueo.",
      joinToReplyTitle: "Únete para responder",
      joinToReplyBody: "Únete a este Círculo para publicar tu respuesta. Puedes salir cuando quieras.",
      joinCta: "Unirme al Círculo",
      joinPending: "Uniéndote…",
      joinError: "No se pudo unir. Inténtalo de nuevo.",
      joinedCta: "Unido",
      leaveCta: "Salir",
      myCirclesTitle: "Mis Círculos",
      myCirclesEmptyTitle: "Aún no te has unido a ningún Círculo.",
      myCirclesEmptyBody: "Únete a Círculos en la app para verlos aquí y volver rápido.",
      exploreCirclesCta: "Explorar Círculos",
      discoverTitle: "Descubrir",
      wallCommentLabel: "Comentarios",
    },
    creatorHub: {
      title: "Creator Hub",
      subtitle: "Crea, gestiona y haz crecer tu PulseVerse.",
      createTitle: "Crear",
      uploadVideo: "Subir vídeo",
      goLive: "Emitir en vivo",
      brollStudio: "Estudio B-roll",
      clipStudio: "Estudio de clips",
      newPost: "Nueva publicación",
      createNote: "Las herramientas de creación están en la app de PulseVerse — toca cualquier tarjeta para continuar allí.",
      analyticsTitle: "Tus estadísticas",
      statFollowers: "Seguidores",
      statFollowing: "Siguiendo",
      statPulse: "Pulse Score",
      uploadsTitle: "Contenido reciente",
      uploadsEmpty: "Aún no has publicado nada. Comparte tu primera publicación desde la web o la app.",
      draftsTitle: "Borradores",
      draftsNote: "Los borradores se gestionan en la app.",
      openInApp: "Abrir en la app",
      statPosts: "Publicaciones",
      statLikes: "Me gusta recientes",
      statComments: "Comentarios recientes",
      recentEngagementNote: "En tus publicaciones más recientes.",
      contentStatusTitle: "Estado del contenido",
      statusLive: "En vivo",
      statusProcessing: "Procesando",
      statusFailed: "Requiere atención",
      statusScheduled: "Programado",
      toolsTitle: "Herramientas de creador",
      brollTitle: "Estudio B-roll",
      brollBody: "Superpón cortes, overlays, croma y plantillas. El editor completo está en la app.",
      shopTitle: "Tienda y monetización",
      shopBody: "Mira tus bordes y cosméticos. Las compras se gestionan en la app.",
      shopCta: "Gestionar cosméticos",
      equippedBorder: "Borde equipado",
      createTileTitle: "Crear una publicación",
      createTileBody: "Comparte una idea rápida ahora o abre la app para foto y vídeo.",
      createTileCta: "Empezar a crear",
      errorTitle: "No pudimos cargar tu Creator Hub",
      errorBody: "Algo salió mal. Inténtalo de nuevo en un momento o abre la app completa.",
    },
    create: {
      title: "Crear",
      subtitle: "Comparte una actualización rápida desde la web o abre la app para más herramientas.",
      textTitle: "Actualización de Pulse",
      textBody: "Publica una actualización de texto en tu My Pulse, visible para tus seguidores.",
      textPlaceholder: "¿Qué tienes en mente?",
      moodPlaceholder: "Estado de ánimo (opcional)",
      postCta: "Publicar",
      postingCta: "Publicando…",
      successTitle: "Publicado en My Pulse",
      successBody: "Tu actualización está activa en tu página de Pulse.",
      viewMyPulse: "Ver My Pulse",
      composeAnother: "Escribir otra",
      errorGeneric: "No se pudo publicar tu actualización. Inténtalo de nuevo.",
      emptyError: "Escribe algo primero.",
      tooLongError: "Es un poco largo — mantenlo por debajo de 500 caracteres.",
      imageTitle: "Publicación de foto",
      imageBody: "Los carruseles y filtros se crean en la app.",
      videoTitle: "Vídeo",
      videoBody: "Subir, recortar, subtítulos y efectos están en la app.",
      circleTitle: "Publicación en Círculo",
      circleBody: "Inicia una discusión o confesión desde la app.",
      openInApp: "Abrir en la app",
      inAppNote: "La publicación de foto, vídeo y Círculo está disponible en la app de PulseVerse mientras la llevamos a la web.",
    },
    notifications: {
      title: "Notificaciones",
      subtitle: "Actividad reciente en tus publicaciones, Círculos y seguidores.",
      markAllRead: "Marcar todo como leído",
      emptyTitle: "Estás al día",
      emptyBody: "Aquí aparecerán nuevos seguidores, me gusta, comentarios y actividad de Círculos.",
      errorTitle: "No pudimos cargar tus notificaciones",
      errorBody: "Algo salió mal. Inténtalo de nuevo en un momento.",
      retry: "Reintentar",
      newBadge: "Nuevo",
      goToFeed: "Ir al Feed",
    },
    shop: {
      title: "Tienda y cosméticos",
      subtitle: "Tus bordes y artículos. Las compras se gestionan en la app.",
      bordersTitle: "Tus bordes",
      equipped: "Equipado",
      equip: "Equipar",
      equipping: "Equipando…",
      unequip: "Quitar",
      equipError: "No se pudo actualizar tu borde. Inténtalo de nuevo.",
      noBordersTitle: "Aún no tienes bordes",
      noBordersBody: "Gana o reclama bordes en la app de PulseVerse para mostrarlos en tu página de Pulse.",
      purchaseTitle: "Comprar bordes y Sparks",
      purchaseBody: "Las compras se realizan de forma segura a través de App Store y Google Play en la app de PulseVerse.",
      purchaseCta: "Abrir la app de PulseVerse para comprar",
      monetizationTitle: "Monetización de creadores",
      monetizationBody: "Los regalos, diamantes y pagos se gestionan en la app.",
      errorTitle: "No pudimos cargar tu tienda",
      errorBody: "Algo salió mal. Inténtalo de nuevo en un momento.",
      retry: "Reintentar",
      rarityLabel: "Rareza",
    },
    live: {
      title: "En vivo",
      subtitle: "Salas en tiempo real de creadores de PulseVerse.",
      liveNowTitle: "En vivo ahora",
      upcomingTitle: "Próximas",
      liveBadge: "EN VIVO",
      viewersLabel: "viendo",
      startedLabel: "Comenzó",
      scheduledLabel: "Comienza",
      joinCta: "Unirse en la app",
      viewLabel: "Ver",
      hostFallback: "Anfitrión",
      emptyTitle: "No hay salas en vivo ahora",
      emptyBody: "Nadie está en vivo en este momento. Vuelve pronto o abre la app para iniciar la tuya.",
      errorTitle: "No pudimos cargar En vivo",
      errorBody: "Algo salió mal. Inténtalo de nuevo en un momento o abre la app completa.",
      safetyTitle: "En vivo, con seguridad",
      safetyBody:
        "Las transmisiones siguen las mismas reglas de la comunidad: las cuentas bloqueadas permanecen ocultas y las salas privadas siguen siendo privadas.",
      watchInApp: "Ver en la app",
      backToLive: "Todo En vivo",
      endedTitle: "Esta transmisión terminó",
      endedBody: "La transmisión finalizó. Mira quién está en vivo ahora o atrapa la próxima en la app.",
      scheduledStartsLabel: "Comienza",
      moreLiveTitle: "Más en vivo ahora",
      detailUnavailableTitle: "Transmisión no disponible",
      detailUnavailableBody: "No se puede mostrar esta transmisión. Es posible que haya terminado o no esté disponible ahora.",
      watchNote: "El video en vivo se reproduce en la app de PulseVerse: toca ver para entrar directo a la sala.",
    },
    engagement: {
      follow: "Seguir",
      following: "Siguiendo",
      followError: "No se pudo actualizar. Toca para reintentar.",
      like: "Me gusta",
      liked: "Te gusta",
      likeError: "No se pudo actualizar el me gusta.",
    },
    landing: {
      kicker: "PulseVerse Web · Beta",
      title: "PulseVerse en tu navegador — vista previa beta",
      subtitle:
        "Inicia sesión para explorar Feed, Círculos, En vivo, My Pulse, Creator Hub y Notificaciones en la web. La creación de vídeo, emitir en vivo y los Ajustes de cuenta funcionan mejor en la app móvil.",
      loginCta: "Iniciar sesión en PulseVerse Web beta",
      getAppCta: "Obtener la app móvil",
      ctaNote: "Inicia sesión con tu correo de PulseVerse. ¿Nuevo aquí? Crea tu cuenta primero en la app móvil.",
      features: [
        { title: "Feed", body: "Desliza vídeos y publicaciones en una columna para escritorio — disponible ya en la web." },
        {
          title: "Círculos",
          body: "Explora comunidades, hilos y respuestas con las mismas reglas de privacidad — disponible ya en la web.",
        },
        {
          title: "En vivo",
          body: "Mira quién está en vivo y abre salas desde el navegador — ver y emitir funcionan mejor en la app.",
        },
        { title: "My Pulse", body: "Tu perfil, novedades y Media Hub — disponible ya en la web." },
        {
          title: "Creator Hub",
          body: "Panel y publicaciones de texto en la web; vídeo avanzado, B-roll y herramientas en vivo en la app.",
        },
        {
          title: "Navegador + app sincronizados",
          body: "La misma cuenta en la beta web y el móvil. Los Ajustes en la web llegarán pronto.",
        },
      ],
    },
  },
};

export function getWebAppPageCopy(locale: Locale): WebAppPageCopy {
  return copy[locale];
}
