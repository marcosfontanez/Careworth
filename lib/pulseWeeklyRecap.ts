/** Parsed weekly recap payload from get_my_pulse_weekly_recap RPC. */

export type PulseWeeklyRecapHighlight = {
  kind: 'post' | 'profile_update';
  id: string;
  type: string;
  label: string;
  likeCount: number;
  thumbnailUrl?: string | null;
};

export type PulseWeeklyRecapTopMoment = {
  kind: 'post';
  id: string;
  type: string;
  caption: string;
  likeCount: number;
  commentCount: number;
  thumbnailUrl?: string | null;
};

export type PulseWeeklyRecapMostCommented = {
  kind: 'post';
  id: string;
  type: string;
  caption: string;
  commentCount: number;
  thumbnailUrl?: string | null;
};

export type PulseWeeklyRecapFeaturedMoment = {
  id: string;
  type: string;
  label: string;
  createdAt: string;
};

export type PulseWeeklyRecapScore = {
  overall: number;
  tier: string;
};

export type PulseWeeklyRecapMonthAgo = {
  kind: 'post' | 'profile_update';
  id: string;
  label: string;
  likeCount: number;
  createdAt: string;
};

export type PulseWeeklyRecap = {
  weekStart: string;
  hasActivity: boolean;
  topMoment?: PulseWeeklyRecapTopMoment;
  mostPulsed?: PulseWeeklyRecapHighlight;
  mostCommented?: PulseWeeklyRecapMostCommented;
  newFollowers: number;
  newShoutouts: number;
  newComments: number;
  newPulses: number;
  newMedia: number;
  pulseUpdatesThisWeek: number;
  featuredMoment?: PulseWeeklyRecapFeaturedMoment;
  pulseScore?: PulseWeeklyRecapScore;
  monthAgo?: PulseWeeklyRecapMonthAgo;
};

export type PulseWeeklyRecapRow = {
  key: string;
  icon: string;
  title: string;
  detail: string;
  badge?: string;
};

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function num(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function mapHighlight(raw: Record<string, unknown> | null | undefined): PulseWeeklyRecapHighlight | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const id = str(raw.id);
  if (!id) return undefined;
  const kind = raw.kind === 'profile_update' ? 'profile_update' : 'post';
  return {
    kind,
    id,
    type: str(raw.type) || kind,
    label: str(raw.label) || str(raw.caption),
    likeCount: num(raw.like_count),
    thumbnailUrl: str(raw.thumbnail_url) || null,
  };
}

/** Map RPC JSON into a typed recap object. Returns null when payload is empty. */
export function parsePulseWeeklyRecap(raw: unknown): PulseWeeklyRecap | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;

  const topRaw = o.top_moment as Record<string, unknown> | null | undefined;
  const topId = topRaw ? str(topRaw.id) : '';
  const topMoment = topId
    ? {
        kind: 'post' as const,
        id: topId,
        type: str(topRaw?.type) || 'text',
        caption: str(topRaw?.caption),
        likeCount: num(topRaw?.like_count),
        commentCount: num(topRaw?.comment_count),
        thumbnailUrl: str(topRaw?.thumbnail_url) || null,
      }
    : undefined;

  const commentedRaw = o.most_commented as Record<string, unknown> | null | undefined;
  const commentedId = commentedRaw ? str(commentedRaw.id) : '';
  const mostCommented = commentedId
    ? {
        kind: 'post' as const,
        id: commentedId,
        type: str(commentedRaw?.type) || 'text',
        caption: str(commentedRaw?.caption),
        commentCount: num(commentedRaw?.comment_count),
        thumbnailUrl: str(commentedRaw?.thumbnail_url) || null,
      }
    : undefined;

  const featuredRaw = o.featured_moment as Record<string, unknown> | null | undefined;
  const featuredId = featuredRaw ? str(featuredRaw.id) : '';
  const featuredMoment = featuredId
    ? {
        id: featuredId,
        type: str(featuredRaw?.type),
        label: str(featuredRaw?.label),
        createdAt: str(featuredRaw?.created_at) || new Date().toISOString(),
      }
    : undefined;

  const scoreRaw = o.pulse_score as Record<string, unknown> | null | undefined;
  const pulseScore =
    scoreRaw && typeof scoreRaw === 'object'
      ? { overall: num(scoreRaw.overall), tier: str(scoreRaw.tier) || 'murmur' }
      : undefined;

  const monthRaw = o.month_ago as Record<string, unknown> | null | undefined;
  const monthId = monthRaw ? str(monthRaw.id) : '';
  const monthAgo = monthId
    ? {
        kind: monthRaw?.kind === 'profile_update' ? ('profile_update' as const) : ('post' as const),
        id: monthId,
        label: str(monthRaw?.label),
        likeCount: num(monthRaw?.like_count),
        createdAt: str(monthRaw?.created_at) || new Date().toISOString(),
      }
    : undefined;

  return {
    weekStart: str(o.week_start) || new Date().toISOString(),
    hasActivity: o.has_activity === true,
    topMoment,
    mostPulsed: mapHighlight(o.most_pulsed as Record<string, unknown> | null | undefined),
    mostCommented,
    newFollowers: num(o.new_followers),
    newShoutouts: num(o.new_shoutouts),
    newComments: num(o.new_comments),
    newPulses: num(o.new_pulses),
    newMedia: num(o.new_media),
    pulseUpdatesThisWeek: num(o.pulse_updates_this_week),
    featuredMoment,
    pulseScore,
    monthAgo,
  };
}

/** Build visible recap rows — skips empty metrics and dedupes overlapping highlights. */
export function buildPulseWeeklyRecapRows(recap: PulseWeeklyRecap): PulseWeeklyRecapRow[] {
  const rows: PulseWeeklyRecapRow[] = [];
  const usedIds = new Set<string>();

  if (recap.topMoment) {
    usedIds.add(`post:${recap.topMoment.id}`);
    const caption = recap.topMoment.caption || 'Your post';
    rows.push({
      key: 'top_moment',
      icon: 'sparkles',
      title: 'Your top moment',
      detail: caption,
      badge:
        recap.topMoment.likeCount + recap.topMoment.commentCount > 0
          ? `${recap.topMoment.likeCount} pulsed · ${recap.topMoment.commentCount} comments`
          : undefined,
    });
  }

  if (
    recap.mostPulsed &&
    recap.mostPulsed.likeCount > 0 &&
    !usedIds.has(`${recap.mostPulsed.kind}:${recap.mostPulsed.id}`)
  ) {
    usedIds.add(`${recap.mostPulsed.kind}:${recap.mostPulsed.id}`);
    rows.push({
      key: 'most_pulsed',
      icon: 'heart',
      title: 'Most pulsed',
      detail: recap.mostPulsed.label || (recap.mostPulsed.kind === 'profile_update' ? 'My Pulse update' : 'Post'),
      badge: `${recap.mostPulsed.likeCount} pulse${recap.mostPulsed.likeCount === 1 ? '' : 's'}`,
    });
  }

  if (
    recap.mostCommented &&
    recap.mostCommented.commentCount > 0 &&
    !usedIds.has(`post:${recap.mostCommented.id}`)
  ) {
    rows.push({
      key: 'most_commented',
      icon: 'chatbubble-ellipses',
      title: 'Most commented',
      detail: recap.mostCommented.caption || 'Your post',
      badge: `${recap.mostCommented.commentCount} comment${recap.mostCommented.commentCount === 1 ? '' : 's'}`,
    });
  }

  if (recap.newShoutouts > 0) {
    rows.push({
      key: 'new_shoutouts',
      icon: 'megaphone',
      title: 'New shoutouts',
      detail: `${recap.newShoutouts} new Pulse Board shoutout${recap.newShoutouts === 1 ? '' : 's'} this week`,
    });
  }

  if (recap.newFollowers > 0) {
    rows.push({
      key: 'new_followers',
      icon: 'people',
      title: 'New followers',
      detail: `${recap.newFollowers} new follower${recap.newFollowers === 1 ? '' : 's'} joined your Pulse`,
    });
  }

  if (recap.featuredMoment) {
    rows.push({
      key: 'featured_moment',
      icon: 'pin',
      title: 'Featured moment',
      detail: recap.featuredMoment.label || 'Pinned at the top of your Pulse',
    });
  }

  if (recap.pulseUpdatesThisWeek > 0) {
    const hadOtherRows = rows.length > 0;
    rows.push({
      key: 'keep_going',
      icon: 'trending-up',
      title: 'Keep it going',
      detail: hadOtherRows
        ? `${recap.pulseUpdatesThisWeek} update${recap.pulseUpdatesThisWeek === 1 ? '' : 's'} shared this week`
        : `${recap.pulseUpdatesThisWeek} My Pulse update${recap.pulseUpdatesThisWeek === 1 ? '' : 's'} this week`,
    });
  }

  if (recap.monthAgo && recap.monthAgo.label) {
    rows.push({
      key: 'month_ago',
      icon: 'time',
      title: 'One month ago',
      detail: recap.monthAgo.label,
      badge:
        recap.monthAgo.likeCount > 0
          ? `${recap.monthAgo.likeCount} pulse${recap.monthAgo.likeCount === 1 ? '' : 's'}`
          : undefined,
    });
  }

  return rows;
}

export function pulseWeeklyRecapHasVisibleContent(recap: PulseWeeklyRecap): boolean {
  return buildPulseWeeklyRecapRows(recap).length > 0;
}
