import { supabase } from '@/lib/supabase';
import { feedPerfLane, feedPerfLog, feedPerfNow } from '@/lib/feedPerf';
import { finalizePostsForViewer } from '@/lib/postViewerPrivacy';
import { hydratePostRowsWithProfiles, stripProfileEmbeds } from '@/lib/postgrestViewerSafeEmbeds';
import { normalizeDuetLayoutMode } from '@/lib/duetLayoutMode';
import { clampVideoOverlayText } from '@/lib/videoOverlayText';
import { parseOverlayStyle, serializeOverlayStyle, type VideoOverlayStyle } from '@/lib/videoOverlayStyle';
import { normalizeVideoLookId } from '@/lib/videoFilters';
import { enrichPostsWithLinkedCommunityMeta } from '@/lib/enrichPostsLinkedCommunity';
import { COMMUNITY_WALL_PAGE_SIZE } from '@/lib/communityWallPostsCache';
import { mergePinnedCommunityPosts, type CommunityPostPinRow } from '@/lib/communityPostPins';
import type { Post, FeedType, PostType, SoundLibraryRow, ViralSoundRow, Role, Specialty, PostReactionCounts, PostReactionKind } from '@/types';
import { normalizePostReactionKind } from '@/lib/postReactions';
import { escapePostgrestIlike } from '@/lib/searchQuery';
import { feedSignalsService } from '@/services/supabase/feedSignals';
import { profilesService } from '@/services/supabase/profiles';
import { getBlockRelationship } from '@/services/supabase/blocks';
import { profileRowToCreatorSummary, unknownCreatorSummary } from '@/services/supabase/profileRowMapper';

/** Read path masks anonymous creator_id (migration 215). Writes stay on `posts`. */
function fromPostsViewerSafe() {
  return supabase.from('posts_viewer_safe');
}

/** Batches `post_views` inserts — cuts HTTPS round-trips during feed scroll (see Query Performance). */
type PostViewRow = { post_id: string; viewer_id: string; view_duration_ms: number };
const postViewQueue: PostViewRow[] = [];
let postViewFlushTimer: ReturnType<typeof setTimeout> | null = null;
const POST_VIEW_FLUSH_MS = 3500;
const POST_VIEW_BATCH_MAX = 8;

async function flushPostViewQueueInternal(): Promise<void> {
  if (postViewFlushTimer) {
    clearTimeout(postViewFlushTimer);
    postViewFlushTimer = null;
  }
  if (postViewQueue.length === 0) return;
  const batch = postViewQueue.splice(0, postViewQueue.length);
  try {
    const { error } = await supabase.from('post_views').insert(batch);
    if (error && __DEV__) console.warn('[postsService.trackView batch]', error.message);
  } catch (e) {
    if (__DEV__) console.warn('[postsService.trackView batch]', e);
    postViewQueue.unshift(...batch);
  }
}

function enqueuePostView(row: PostViewRow) {
  postViewQueue.push(row);
  if (postViewQueue.length >= POST_VIEW_BATCH_MAX) {
    void flushPostViewQueueInternal();
    return;
  }
  if (!postViewFlushTimer) {
    postViewFlushTimer = setTimeout(() => {
      postViewFlushTimer = null;
      void flushPostViewQueueInternal();
    }, POST_VIEW_FLUSH_MS);
  }
}

function normalizePostType(raw: unknown): PostType {
  const s = String(raw ?? 'text').toLowerCase();
  if (s === 'video' || s === 'image' || s === 'text' || s === 'discussion' || s === 'confession') return s;
  return 'text';
}

function normalizeMediaUrl(raw: unknown): string | undefined {
  if (raw == null) return undefined;
  let s = String(raw).trim();
  if (s.length === 0) return undefined;
  if (s.startsWith('http://')) s = `https://${s.slice(7)}`;
  return s;
}

/** DB may still store legacy `friends`; we normalize to `following` (same surface in-app). */
function normalizeFeedTypeEligibleTags(raw: unknown): string[] {
  const arr = Array.isArray(raw) ? raw : [];
  const mapped = arr.map((s) => {
    const t = String(s).trim();
    if (/^for\s*you$/i.test(t) || t.replace(/\s/g, '').toLowerCase() === 'foryou') return 'forYou';
    if (t.toLowerCase() === 'following') return 'following';
    if (t.toLowerCase() === 'friends') return 'following';
    if (t.toLowerCase() === 'toptoday' || t === 'topToday') return 'topToday';
    if (t.toLowerCase() === 'community') return 'community';
    return t;
  });
  return [...new Set(mapped)];
}

/** Only `live` posts belong in public algorithmic feeds (scheduled / sending / failed stay off-feed). */
function postIsLiveForPublicSurface(p: Post): boolean {
  const s = (p.scheduledStatus ?? 'live').trim().toLowerCase();
  return s === 'live';
}

/** Posts tagged only for circles must not appear in For You, Following, or Top Today (incl. author prepended slice). */
function postAppearsInMainFeeds(p: Post): boolean {
  if (!postIsLiveForPublicSurface(p)) return false;
  const proc = (p.mediaProcessingStatus ?? '').trim().toLowerCase();
  if (proc === 'queued' || proc === 'running' || proc === 'failed') return false;
  const tags = p.feedTypeEligible ?? [];
  return tags.some((x) => x === 'forYou' || x === 'following' || x === 'topToday');
}

function normalizeEducationCitations(
  raw: unknown,
): { label?: string; url?: string; doi?: string; lastReviewed?: string }[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: { label?: string; url?: string; doi?: string; lastReviewed?: string }[] = [];
  for (const item of raw) {
    if (item && typeof item === 'object') {
      const o = item as Record<string, unknown>;
      const label = o.label != null ? String(o.label).trim() : undefined;
      const url = o.url != null ? String(o.url).trim() : undefined;
      const doi = o.doi != null ? String(o.doi).trim() : undefined;
      const lastReviewed =
        o.lastReviewed != null
          ? String(o.lastReviewed).trim()
          : o.last_reviewed != null
            ? String(o.last_reviewed).trim()
            : undefined;
      if (label || url) {
        out.push({
          label,
          url,
          ...(doi ? { doi } : {}),
          ...(lastReviewed ? { lastReviewed } : {}),
        });
      }
    }
  }
  return out.length ? out : undefined;
}

function normalizeAdditionalMedia(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const urls = raw
    .map((x) => normalizeMediaUrl(x))
    .filter((u): u is string => Boolean(u?.trim()));
  return urls.length ? urls : undefined;
}

function rowToReactionCounts(row: Record<string, unknown>): PostReactionCounts {
  return {
    heart: Number(row.reaction_heart_count ?? 0),
    haha: Number(row.reaction_haha_count ?? 0),
    wow: Number(row.reaction_wow_count ?? 0),
    sad: Number(row.reaction_sad_count ?? 0),
    angry: Number(row.reaction_angry_count ?? 0),
  };
}

function rowToPost(row: any): Post {
  const creator = row.profiles
    ? profileRowToCreatorSummary(row.profiles)
    : unknownCreatorSummary(row.creator_id);

  const duetLay = normalizeDuetLayoutMode(row.duet_layout_mode);
  const videoLook = normalizeVideoLookId(row.video_look_id);

  return {
    id: row.id,
    creatorId: row.creator_id,
    creator,
    type: normalizePostType(row.type),
    caption: row.caption,
    mediaUrl: normalizeMediaUrl(row.media_url),
    thumbnailUrl: normalizeMediaUrl(row.thumbnail_url),
    hashtags: row.hashtags ?? [],
    communities: row.communities ?? [],
    isAnonymous: row.is_anonymous,
    privacyMode: row.privacy_mode,
    likeCount: row.like_count,
    reactionCounts: rowToReactionCounts(row),
    commentCount: row.comment_count,
    shareCount: row.share_count,
    viewCount: row.view_count,
    saveCount: row.save_count,
    createdAt: row.created_at,
    rankingScore: Number(row.ranking_score ?? 0),
    feedTypeEligible: normalizeFeedTypeEligibleTags(row.feed_type_eligible ?? []) as FeedType[],
    roleContext: (String(row.role_context ?? '').trim() || '') as Role,
    specialtyContext: (String(row.specialty_context ?? '').trim() || '') as Specialty,
    locationContext: row.location_context != null ? String(row.location_context) : '',
    soundTitle: row.sound_title?.trim() || undefined,
    soundSourcePostId: row.sound_source_post_id ?? undefined,
    stitchSourcePostId: row.stitch_source_post_id ? String(row.stitch_source_post_id) : undefined,
    sourceLiveStreamId: row.source_live_stream_id ? String(row.source_live_stream_id) : undefined,
    sourcePostId: row.source_post_id ? String(row.source_post_id) : undefined,
    sourceCreatorId: row.source_creator_id ? String(row.source_creator_id) : undefined,
    clipStartSeconds:
      row.clip_start_seconds != null && Number.isFinite(Number(row.clip_start_seconds))
        ? Number(row.clip_start_seconds)
        : undefined,
    clipEndSeconds:
      row.clip_end_seconds != null && Number.isFinite(Number(row.clip_end_seconds))
        ? Number(row.clip_end_seconds)
        : undefined,
    soundSourceMediaUrl: normalizeMediaUrl(row.sound_source_media_url),
    duetParentId: row.duet_parent_id ? String(row.duet_parent_id) : undefined,
    ...(duetLay ? { duetLayoutMode: duetLay } : {}),
    evidenceUrl: row.evidence_url?.trim() || undefined,
    evidenceLabel: row.evidence_label?.trim() || undefined,
    shiftContext: row.shift_context?.trim() || undefined,
    /**
     * Server-stamped by the trigger installed in migration 057
     * whenever the author edits `caption` or `hashtags`. The post
     * detail screen uses this to render "· edited" next to the time
     * so viewers know the caption has changed.
     */
    editedAt: row.edited_at ?? undefined,
    additionalMedia: normalizeAdditionalMedia(row.additional_media),
    isEducation: Boolean(row.is_education),
    educationCitations: normalizeEducationCitations(row.education_citations),
    seriesId: row.series_id ? String(row.series_id) : undefined,
    seriesPart: row.series_part != null ? Number(row.series_part) : undefined,
    seriesTotal: row.series_total != null ? Number(row.series_total) : undefined,
    scheduledAt: row.scheduled_at ?? undefined,
    scheduledStatus: row.scheduled_status != null ? String(row.scheduled_status) : undefined,
    coverAltUrl: normalizeMediaUrl(row.cover_alt_url),
    ...(videoLook ? { videoLookId: videoLook } : {}),
    videoOverlayText: typeof row.video_overlay_text === 'string'
      ? row.video_overlay_text.trim() || undefined
      : undefined,
    videoOverlayStyle: parseOverlayStyle(
      (row as { video_overlay_style?: unknown }).video_overlay_style,
    ),
    commentsDisabled: Boolean(row.comments_disabled),
    allowViewerClips: row.allow_viewer_clips !== false,
    allowRemix: row.allow_remix !== false,
    allowClipDownloads: row.allow_clip_downloads === true,
    mediaProcessingStatus:
      row.media_processing_status != null && String(row.media_processing_status).trim()
        ? String(row.media_processing_status).trim()
        : undefined,
    mediaProcessingJobId:
      row.media_processing_job_id != null ? String(row.media_processing_job_id) : undefined,
    mediaProcessingError:
      typeof row.media_processing_error === 'string' ? row.media_processing_error.trim() || undefined : undefined,
  };
}

/**
 * Explicit column list for every `posts` SELECT.
 *
 * We deliberately enumerate every column `rowToPost` reads (rather than
 * using `select *`) for three reasons:
 *
 *   1. **Wire-size discipline.** `*` ships every column on the row,
 *      including any future internal columns we never render (analytics
 *      metadata, soft-delete timestamps, moderation flags, etc.). At
 *      feed scale every byte multiplies — a 16-row first page that's
 *      10% smaller is 10% less to parse on the JS thread before the
 *      first cell mounts.
 *   2. **Explicit contract.** When someone adds a column to `posts`,
 *      they must also decide whether the client needs it. That keeps
 *      the feed payload from quietly growing.
 *   3. **Easier to split list-vs-detail later.** Today every callsite
 *      below uses the same shape because `rowToPost` is the single
 *      mapper. If we later need a slimmer "feed cell" projection that
 *      drops, say, `evidence_*` and `shift_context` (post-detail-only
 *      fields), we can introduce `POST_SELECT_LIST` without touching
 *      `rowToPost` — just feed it a partial row.
 *
 * Profile join columns are also explicit for the same reasons —
 * `profiles.*` would also pull `email`, `push_token`, etc. that the
 * client never needs.
 */
const POST_SELECT = [
  // Core identity
  'id',
  'creator_id',
  'type',
  'caption',
  'created_at',
  'edited_at',
  // Media
  'media_url',
  'thumbnail_url',
  'additional_media',
  // Taxonomy / discovery
  'hashtags',
  'communities',
  'feed_type_eligible',
  'role_context',
  'specialty_context',
  'location_context',
  // Privacy
  'is_anonymous',
  'privacy_mode',
  // Engagement counters (denormalized for fast cell render)
  'like_count',
  'comment_count',
  'share_count',
  'view_count',
  'save_count',
  'reaction_heart_count',
  'reaction_haha_count',
  'reaction_wow_count',
  'reaction_sad_count',
  'reaction_angry_count',
  // Ranking
  'ranking_score',
  // Sound attribution (TikTok-style original-sound credit)
  'sound_title',
  'sound_source_post_id',
  'sound_source_media_url',
  'stitch_source_post_id',
  'source_live_stream_id',
  'source_post_id',
  'source_creator_id',
  'clip_start_seconds',
  'clip_end_seconds',
  // Duet / evidence / shift context (Innovation feed)
  'duet_parent_id',
  'duet_layout_mode',
  'evidence_url',
  'evidence_label',
  'shift_context',
  // Creator tools (education, series, schedule, mood, cover A/B)
  'is_education',
  'education_citations',
  'series_id',
  'series_part',
  'series_total',
  'scheduled_at',
  'scheduled_status',
  'cover_alt_url',
  'video_look_id',
  // On-video sticker text (rendered as <Text> overlay on the feed video)
  'video_overlay_text',
  // On-video sticker STYLE (migration 237) — font/size/color/x_norm/y_norm
  'video_overlay_style',
  'comments_disabled',
  'allow_viewer_clips',
  'allow_remix',
  'allow_clip_downloads',
  'media_processing_status',
  'media_processing_job_id',
  'media_processing_error',
  // Joined creator profile — explicit columns to avoid shipping email,
  // push tokens, role_admin flag, etc. to the client.
  // Joined creator profile — explicit FK hint required since migration 213 added
  // posts.source_creator_id → profiles (second relationship).
  'profiles!posts_creator_id_fkey(id, display_name, first_name, last_name, username, avatar_url, identity_tags, role, specialty, city, state, is_verified, pulse_tier, pulse_score_current, selected_pulse_avatar_frame_id, pulse_avatar_frame:pulse_avatar_frames!profiles_selected_pulse_avatar_frame_id_fkey(id, slug, label, subtitle, prize_tier, rarity_tier, acquisition_tag, month_start, ring_color, glow_color, ring_caption))',
].join(', ');

/**
 * Slimmer projection for main-feed list responses only (`getFeed`, `getFeedContinuation`,
 * ranked/trending hydrations). Drops columns feed cells never render and omits
 * `pulse_score_current` on the profile embed (badge doesn’t use score on the feed).
 * Detail routes (`getById`, `getByIds`, …) keep {@link POST_SELECT}.
 */
const POST_SELECT_FEED = [
  'id',
  'creator_id',
  'type',
  'caption',
  'created_at',
  'media_url',
  'thumbnail_url',
  'additional_media',
  'hashtags',
  'communities',
  'feed_type_eligible',
  'is_anonymous',
  'privacy_mode',
  'like_count',
  'comment_count',
  'share_count',
  'view_count',
  'save_count',
  'sound_title',
  'sound_source_post_id',
  'sound_source_media_url',
  'stitch_source_post_id',
  'source_live_stream_id',
  'source_post_id',
  'source_creator_id',
  'clip_start_seconds',
  'clip_end_seconds',
  'duet_parent_id',
  'duet_layout_mode',
  'evidence_url',
  'evidence_label',
  'is_education',
  'education_citations',
  'series_id',
  'series_part',
  'series_total',
  'scheduled_at',
  'scheduled_status',
  'cover_alt_url',
  'video_look_id',
  'video_overlay_text',
  'video_overlay_style',
  'comments_disabled',
  'allow_viewer_clips',
  'allow_remix',
  'allow_clip_downloads',
  'media_processing_status',
  'media_processing_job_id',
  'media_processing_error',
  'profiles!posts_creator_id_fkey(id, display_name, first_name, last_name, username, avatar_url, identity_tags, role, specialty, city, state, is_verified, pulse_tier, selected_pulse_avatar_frame_id, pulse_avatar_frame:pulse_avatar_frames!profiles_selected_pulse_avatar_frame_id_fkey(id, slug, label, subtitle, prize_tier, rarity_tier, acquisition_tag, month_start, ring_color, glow_color, ring_caption))',
].join(', ');

/** Loads posts and preserves caller id order (PostgREST `.in()` order is undefined). */
async function fetchPostsByIdsOrdered(
  ids: string[],
  selectSql: string = POST_SELECT,
  useViewerSafe = true,
): Promise<Post[]> {
  if (ids.length === 0) return [];
  const source = useViewerSafe ? fromPostsViewerSafe() : supabase.from('posts');
  const sql = useViewerSafe ? '*' : selectSql;
  const { data, error } = await source.select(sql).in('id', ids);
  if (error) throw error;
  const rows = useViewerSafe ? await hydratePostRowsWithProfiles(data ?? []) : (data ?? []);
  const byId = new Map<string, Post>(rows.map((row: any) => [row.id, rowToPost(row)]));
  const out: Post[] = [];
  for (const id of ids) {
    const p = byId.get(id);
    if (p) out.push(p);
  }
  return out;
}

/** Chronological For You slice via RPC `get_for_you_post_ids` (correct filter semantics). Falls back to REST if RPC missing. */
async function fetchForYouPostsChronological(viewerId: string, limit: number): Promise<Post[]> {
  const { data: idRows, error: rpcErr } = await supabase.rpc('get_for_you_post_ids', {
    viewer_uuid: viewerId,
    result_limit: limit,
  });

  if (!rpcErr && idRows != null && (idRows as { id: string }[]).length > 0) {
    const ids = (idRows as { id: string }[]).map((r) => r.id);
    try {
      const ordered = await fetchPostsByIdsOrdered(ids, POST_SELECT_FEED);
      return ordered.filter(postAppearsInMainFeeds);
    } catch (e: any) {
      if (__DEV__) {
        console.warn('fetchForYouPostsChronological hydrate failed, using REST fallback:', e?.message);
      }
    }
  }

  if (__DEV__ && rpcErr) {
    console.warn('get_for_you_post_ids unavailable, using REST fallback:', rpcErr.message);
  }

  let q = supabase.from('posts').select(POST_SELECT_FEED).contains('feed_type_eligible', ['forYou']);
  q = withFeedPrivacy(q, viewerId);
  const { data, error } = await q.order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []).map(rowToPost).filter(postAppearsInMainFeeds);
}

/**
 * Viewer’s own posts (newest first). Prepended to For You so uploads are not buried by global ranking
 * or missing `forYou` in `feed_type_eligible` (still shown to the author here).
 */
async function fetchOwnRecentPosts(viewerId: string, limit: number): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select(POST_SELECT_FEED)
    .eq('creator_id', viewerId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    if (__DEV__) console.warn('fetchOwnRecentPosts:', error.message);
    return [];
  }
  return (data ?? []).map(rowToPost);
}

function mergeOwnPostsFirst(own: Post[], rest: Post[], maxLen: number): Post[] {
  const seen = new Set<string>();
  const out: Post[] = [];
  for (const p of own) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(p);
    if (out.length >= maxLen) return out;
  }
  for (const p of rest) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(p);
    if (out.length >= maxLen) break;
  }
  return out;
}

/** Limit how many slots a single creator can take in the first band (TikTok-style diversity). */
function diversifyByCreator(posts: Post[], maxTotal: number, maxPerCreator = 3): Post[] {
  const count = new Map<string, number>();
  const primary: Post[] = [];
  for (const p of posts) {
    const n = count.get(p.creatorId) ?? 0;
    if (n >= maxPerCreator) continue;
    count.set(p.creatorId, n + 1);
    primary.push(p);
    if (primary.length >= maxTotal) return primary;
  }
  for (const p of posts) {
    if (primary.length >= maxTotal) break;
    if (!primary.some((x) => x.id === p.id)) primary.push(p);
  }
  return primary.slice(0, maxTotal);
}

type FeedExclusionSets = { hiddenPostIds: Set<string>; hiddenCreatorIds: Set<string> };

function emptyFeedExclusions(): FeedExclusionSets {
  return { hiddenPostIds: new Set<string>(), hiddenCreatorIds: new Set<string>() };
}

/** Resolve hide creator / not interested / blocks in parallel with feed SQL (see getFeed). */
function loadFeedExclusions(viewerId?: string | null): Promise<FeedExclusionSets> {
  if (!viewerId?.trim()) return Promise.resolve(emptyFeedExclusions());
  return feedPerfLane('feedExclusions', () =>
    feedSignalsService.listExclusions(viewerId).catch(() => emptyFeedExclusions()),
  );
}

async function applyViewerFeedFilters(
  posts: Post[],
  viewerId?: string,
  preloaded?: FeedExclusionSets,
): Promise<Post[]> {
  if (!viewerId?.trim()) return posts;
  try {
    const { hiddenPostIds, hiddenCreatorIds } = preloaded ?? (await feedSignalsService.listExclusions(viewerId));
    return posts.filter((p) => !hiddenPostIds.has(p.id) && !hiddenCreatorIds.has(p.creatorId));
  } catch {
    return posts;
  }
}

function withFeedPrivacy(query: any, viewerId?: string) {
  if (viewerId) {
    return query.or(`privacy_mode.eq.public,creator_id.eq.${viewerId}`);
  }
  return query.eq('privacy_mode', 'public');
}

/** Circle wall rows — prefer posts_viewer_safe; fall back to base posts table on PostgREST/view errors. */
async function fetchCommunityWallRows(
  communityId: string,
  limit: number,
  cursor: string | null,
  viewerId?: string | null,
): Promise<Record<string, unknown>[]> {
  let q = fromPostsViewerSafe()
    .select('*')
    .contains('communities', [communityId])
    .order('created_at', { ascending: false })
    .limit(limit);
  if (cursor) q = q.lt('created_at', cursor);

  const { data, error } = await q;
  if (!error) return (data ?? []) as Record<string, unknown>[];

  if (__DEV__) {
    console.warn(
      '[postsService.fetchCommunityWallRows] posts_viewer_safe failed, using posts table',
      error.message,
    );
  }

  let q2 = supabase
    .from('posts')
    .select(stripProfileEmbeds(POST_SELECT))
    .contains('communities', [communityId]);
  q2 = withFeedPrivacy(q2, viewerId ?? undefined);
  q2 = q2.order('created_at', { ascending: false }).limit(limit);
  if (cursor) q2 = q2.lt('created_at', cursor);

  const { data: data2, error: error2 } = await q2;
  if (error2) throw error2;
  return (data2 ?? []) as unknown as Record<string, unknown>[];
}

/** Profile-level private mode + blocks — used before reading posts on Pulse Page. */
async function profilePostsReadableForViewer(
  profileUserId: string,
  viewerId?: string | null,
): Promise<boolean> {
  if (!profileUserId) return false;
  if (viewerId && viewerId === profileUserId) return true;

  const { data: owner, error: ownerErr } = await supabase
    .from('profiles')
    .select('privacy_mode')
    .eq('id', profileUserId)
    .maybeSingle();

  if (ownerErr || !owner) return false;

  if (viewerId) {
    const block = await getBlockRelationship(viewerId, profileUserId);
    if (block !== 'none') return false;

    if (owner.privacy_mode === 'private') {
      const { data: isAdmin } = await supabase.rpc('current_user_role_admin');
      return Boolean(isAdmin);
    }
    return true;
  }

  return owner.privacy_mode !== 'private';
}

/** PostgREST `in` payloads stay smaller than giant URLs; merge chunks client-side. */
const FOLLOWING_FEED_CREATOR_CHUNK = 100;

/**
 * Chronological posts from creators the viewer follows only.
 *
 * Defense-in-depth filter stack (matches beta-launch audit requirement #7):
 *   - SQL `feed_type_eligible` contains `'following'` → opted-out posts stay out.
 *   - SQL `withFeedPrivacy` → public OR own (no private leaks).
 *   - SQL `creator_id IN followed` → only followed creators.
 *   - JS `postAppearsInMainFeeds` → rejects scheduled != live and
 *     media_processing_status IN (queued, running, failed); also requires the
 *     post to still carry a main-feed eligibility tag.
 *   - Caller `applyViewerFeedFilters` → applies blocked / hide_creator /
 *     not_interested exclusions from feedSignalsService.
 *   - Caller `finalizePostsForViewer` → anonymous identity redaction.
 */
async function fetchFollowingFeedPosts(args: {
  viewerId: string;
  limit: number;
  cursor?: string | null;
  excludeIds?: Set<string>;
}): Promise<Post[]> {
  const { viewerId, limit, cursor, excludeIds } = args;
  const followed = await profilesService.getFollowedIdsForUser(viewerId);
  const idList = [...followed];
  if (idList.length === 0) return [];

  const fetchChunk = async (creatorIds: string[]) => {
    let q = supabase.from('posts').select(POST_SELECT_FEED);
    q = withFeedPrivacy(q, viewerId);
    q = q.contains('feed_type_eligible', ['following']).in('creator_id', creatorIds);
    if (cursor) q = q.lt('created_at', cursor);
    const { data, error } = await q.order('created_at', { ascending: false }).limit(limit);
    if (error) throw error;
    return (data ?? []).map(rowToPost).filter(postAppearsInMainFeeds);
  };

  let merged: Post[];
  if (idList.length <= FOLLOWING_FEED_CREATOR_CHUNK) {
    merged = await fetchChunk(idList);
  } else {
    const chunks: string[][] = [];
    for (let i = 0; i < idList.length; i += FOLLOWING_FEED_CREATOR_CHUNK) {
      chunks.push(idList.slice(i, i + FOLLOWING_FEED_CREATOR_CHUNK));
    }
    const parts = await Promise.all(chunks.map(fetchChunk));
    merged = parts.flat();
  }

  merged.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));

  const out: Post[] = [];
  const seen = new Set<string>();
  for (const p of merged) {
    if (excludeIds?.has(p.id)) continue;
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(p);
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * Personalized ranker call with documented fallback chain.
 *
 * Try order (each tier is additive on the prior):
 *   0. get_ranked_feed_v4  (migration 278) — v3 + seen-aware soft exclusion with
 *                                            backfill (don't replay watched/liked
 *                                            posts unless content is scarce;
 *                                            re-shows rotate) + per-open jitter
 *                                            so the feed varies on every open.
 *   1. get_ranked_feed_v3  (migration 234) — paginatable via exclude_post_ids;
 *                                            SQL-level viewer exclusions;
 *                                            graduated quick-skip penalty;
 *                                            cold-start cohort blend.
 *   2. get_ranked_feed_v2  (migration 042/051/160/211) — personalization layer
 *                                            but no exclude_post_ids → page 2+
 *                                            must dedupe client-side.
 *   3. get_ranked_feed     (migration 006/023/160/211) — baseline scorer only.
 *
 * Chronological fallback (no ranker at all) is handled one level up in
 * runRankedForYouFeed / runRankedForYouContinuation.
 *
 * `excludeIds`: ids the caller has already shown (page 2+). Used directly by
 * v3; client-deduped against v2/v1 results.
 */
async function callRankedRpc(
  viewerId: string,
  feedLimit: number,
  excludeIds: readonly string[] = [],
): Promise<{ post_id: string; score: number; source?: string }[]> {
  const excludeArray = excludeIds.length
    ? Array.from(new Set(excludeIds))
    : ([] as string[]);
  const excludeSet = new Set(excludeArray);
  const headroom = excludeArray.length;

  /* Tier 0: v4 — preferred. Seen-aware (won't replay watched/liked posts unless
     content is scarce; re-shows rotate) + per-open jitter for variety. Supports
     exclude_post_ids natively, same as v3.
     Cast: get_ranked_feed_v4 is newer than the committed lib/database.types.ts;
     run `npm run db:types` after applying migration 278 to drop this cast. */
  const v4 = await supabase.rpc('get_ranked_feed_v4' as never, {
    viewer_id: viewerId,
    feed_limit: feedLimit,
    exclude_post_ids: excludeArray,
  } as never);
  if (!v4.error && (v4.data as unknown[] | null)?.length) {
    return v4.data as { post_id: string; score: number; source?: string }[];
  }
  if (__DEV__ && v4.error) {
    console.warn('get_ranked_feed_v4 unavailable, falling back to v3:', v4.error.message);
  }

  /* Tier 1: v3. Supports exclude_post_ids natively. */
  const v3 = await supabase.rpc('get_ranked_feed_v3', {
    viewer_id: viewerId,
    feed_limit: feedLimit,
    exclude_post_ids: excludeArray,
  });
  if (!v3.error && v3.data?.length) {
    return v3.data as { post_id: string; score: number; source?: string }[];
  }
  if (__DEV__ && v3.error) {
    console.warn('get_ranked_feed_v3 unavailable, falling back to v2:', v3.error.message);
  }

  /* Tier 2: v2 — personalization without exclude_post_ids. Ask for headroom
     equal to the number of already-seen ids so dedupe leaves enough rows. */
  const v2 = await supabase.rpc('get_ranked_feed_v2', {
    viewer_id: viewerId,
    feed_limit: feedLimit + headroom,
  });
  if (!v2.error && v2.data?.length) {
    const rows = v2.data as { post_id: string; score: number }[];
    return rows.filter((r) => !excludeSet.has(r.post_id));
  }
  if (__DEV__ && v2.error) {
    console.warn('get_ranked_feed_v2 unavailable, falling back to v1:', v2.error.message);
  }

  /* Tier 3: v1 — baseline scorer. */
  const v1 = await supabase.rpc('get_ranked_feed', {
    viewer_id: viewerId,
    feed_limit: feedLimit + headroom,
  });
  if (v1.error) throw v1.error;
  const v1Rows = (v1.data ?? []) as { post_id: string; score: number }[];
  return v1Rows.filter((r) => !excludeSet.has(r.post_id));
}

/** Lightweight Top-Today fetch for stitching trending posts into the For You stream. */
async function fetchTrendingForInjection(maxCount: number): Promise<Post[]> {
  try {
    const { data: ranked, error: rpcError } = await supabase
      .rpc('get_top_today', { feed_limit: maxCount });
    if (rpcError || !ranked?.length) return [];
    const ids = (ranked as { post_id: string }[]).map((r) => r.post_id);
    const { data } = await supabase.from('posts').select(POST_SELECT_FEED).in('id', ids);
    if (!data?.length) return [];
    const scoreMap = new Map(
      (ranked as { post_id: string; score: number }[]).map((r) => [r.post_id, r.score]),
    );
    return data
      .map(rowToPost)
      .filter(postAppearsInMainFeeds)
      .sort((a, b) => ((scoreMap.get(b.id) ?? 0) as number) - ((scoreMap.get(a.id) ?? 0) as number));
  } catch {
    return [];
  }
}

/**
 * Splice trending posts into a personalized list every `every` slots. Trending
 * items already in the personalized stream are skipped so users never see the
 * same post twice in one session.
 */
function stitchTrending(personal: Post[], trending: Post[], every = 7): Post[] {
  if (!trending.length) return personal;
  const seen = new Set(personal.map((p) => p.id));
  const queue = trending.filter((t) => !seen.has(t.id));
  if (!queue.length) return personal;
  const out: Post[] = [];
  let qi = 0;
  for (let i = 0; i < personal.length; i++) {
    out.push(personal[i]);
    if ((i + 1) % every === 0 && qi < queue.length) out.push(queue[qi++]);
  }
  return out;
}

/**
 * Module-level (no `this`) so Hermes never sees unresolved identifiers if `getFeed` is called unbound
 * or Metro Fast Refresh leaves a stale query closure after refactors.
 *
 * Tier 1 feed pipeline (PAGE 1 ONLY — see runRankedForYouContinuation for page 2+):
 *   1. Fetch own / recent / ranked / trending in parallel (each lane is independent).
 *   2. Hydrate ranked rows by id (RPC returns ids+scores only).
 *   3. Cap creator concentration in the personalized band (max 2 per creator).
 *   4. Stitch one trending post every 7 personalized slots.
 *   5. Prepend AT MOST 1 own post — only if it is <24h old. Acts as a soft
 *      "your post is live" confirmation without flooding the discovery feed.
 *      Older own posts still compete in the ranked band by score.
 *
 * Fallback chain (worst→best resolution):
 *   ranked RPC (v3 → v2 → v1) > chronological getForYouPostIds > REST chrono
 *   When ranked + recent both die, we still try a wider chronological pull;
 *   if even that fails, we return own posts or empty.
 */
async function runRankedForYouFeed(viewerId: string): Promise<Post[]> {
  const rankedRunT0 = feedPerfNow();
  const RECENT_FIRST = 15;
  const MAX_FEED = 50;
  /* Own-post prepend cap. PRE-BETA: was 20, which flooded the top of For You
     with the viewer's own uploads on accounts with many posts. Capped to 1 +
     a 24h freshness window so we only ever show a single "your post is live"
     confirmation at most. My Pulse remains the primary place to browse own
     content. See requirement #3 in the feed beta-readiness audit. */
  const OWN_PREPEND_CAP = 1;
  const OWN_PREPEND_MAX_AGE_MS = 24 * 60 * 60 * 1000;
  const RPC_LIMIT = 60;          // small headroom so the diversity cap has alternates to swap in
  const TRENDING_BUDGET = 12;    // worst case ~7 injections at every:7 across 50 slots

  const [ownRecent, recentPosts, rankedRpc, trendingPosts] = await Promise.all([
    feedPerfLane('ownRecent', () =>
      fetchOwnRecentPosts(viewerId, OWN_PREPEND_CAP)
        .then((p) => p.filter(postAppearsInMainFeeds))
        .then((p) => {
          /* Only prepend if the most-recent own post is fresh enough to be a
             "your post is live" confirmation. Older own posts still appear via
             the ranker because the SQL filter is (privacy=public OR creator=viewer). */
          const cutoff = Date.now() - OWN_PREPEND_MAX_AGE_MS;
          return p.filter((post) => {
            const t = new Date(post.createdAt).getTime();
            return Number.isFinite(t) && t > cutoff;
          });
        })
        .catch((e: any) => {
          if (__DEV__) console.warn('getRankedFeed own slice failed:', e?.message);
          return [] as Post[];
        }),
    ),
    feedPerfLane('recentChrono', () =>
      fetchForYouPostsChronological(viewerId, RECENT_FIRST).catch((e: any) => {
        if (__DEV__) console.warn('getRankedFeed recent slice failed:', e?.message);
        return [] as Post[];
      }),
    ),
    feedPerfLane('rankedRpc', () =>
      callRankedRpc(viewerId, RPC_LIMIT).catch((e: any) => {
        if (__DEV__) console.warn('get_ranked_feed RPC failed, falling back:', e?.message);
        return [] as { post_id: string; score: number; source?: string }[];
      }),
    ),
    feedPerfLane('trendingInject', () => fetchTrendingForInjection(TRENDING_BUDGET)),
  ]);
  feedPerfLog('ranked:afterParallelLanes', rankedRunT0);

  const hydrateT0 = feedPerfNow();
  let rankedPosts: Post[] = [];
  if (rankedRpc.length) {
    try {
      const ids = rankedRpc.map((r) => r.post_id);
      const { data } = await supabase.from('posts').select(POST_SELECT_FEED).in('id', ids);
      if (data?.length) {
        const scoreMap = new Map(rankedRpc.map((r) => [r.post_id, r.score]));
        rankedPosts = data
          .map(rowToPost)
          .filter(postAppearsInMainFeeds)
          .sort((a, b) => ((scoreMap.get(b.id) ?? 0) as number) - ((scoreMap.get(a.id) ?? 0) as number));
      }
    } catch (e: any) {
      if (__DEV__) console.warn('getRankedFeed hydrate failed:', e?.message);
    }
  }
  feedPerfLog('ranked:hydrateRankedPosts', hydrateT0);

  /* Last-ditch fallback: ranker dead AND fresh chronological dead -> try a wider chronological pull. */
  if (!rankedPosts.length && !recentPosts.length) {
    try {
      const fbT0 = feedPerfNow();
      const chronological = await fetchForYouPostsChronological(viewerId, MAX_FEED);
      feedPerfLog('ranked:fallbackChronoOnly', fbT0);
      return mergeOwnPostsFirst(ownRecent, chronological, MAX_FEED);
    } catch (e: any) {
      if (ownRecent.length) {
        if (__DEV__) console.warn('getRankedFeed chronological failed, returning own only:', e?.message);
        return ownRecent.slice(0, MAX_FEED);
      }
      if (__DEV__) console.warn('getRankedFeed chronological failed, returning empty:', e?.message);
      return [];
    }
  }

  const mergeT0 = feedPerfNow();
  /* Order: seen-aware, jittered RANKED band leads (v4 already gives brand-new
     posts a strong recency + freshness boost, so fresh content surfaces here
     while the order varies on each open and watched posts are de-prioritized).
     The chronological `recentPosts` slice is appended only as a DEDUP BACKFILL
     so any brand-new post the ranker missed still appears — but it no longer
     pins the same newest clip to the very top on every app open. */
  const seen = new Set<string>();
  const merged: Post[] = [];
  for (const p of rankedPosts) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    merged.push(p);
  }
  for (const p of recentPosts) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    merged.push(p);
  }

  /* Cap any single creator to 2 slots in the personalized band -- avoids "all five
     posts from the one creator I follow" steamrolling everyone else. Own posts are
     prepended after, so they're not affected by this cap. */
  const diversified = diversifyByCreator(merged, MAX_FEED, 2);

  /* Inject trending every 7 slots so users always see fresh breakout content,
     even when the personalization layer hasn't warmed up yet. */
  const stitched = stitchTrending(diversified, trendingPosts, 7);

  const out = mergeOwnPostsFirst(ownRecent, stitched, MAX_FEED);
  feedPerfLog('ranked:mergeDiversifyStitch', mergeT0);
  feedPerfLog('ranked:pipelineTotal', rankedRunT0, `posts=${out.length}`);
  return out;
}

/**
 * For You page 2+ continuation — keeps personalized ranking across pagination
 * (requirement #1 in feed beta-readiness audit). Previously this path went
 * straight to chronological tail, which made the feed feel smart on page 1
 * and random thereafter.
 *
 * Fallback chain (best→worst):
 *   1. callRankedRpc(viewerId, limit + 8, seenIds)
 *        - v3 honors exclude_post_ids natively (no dupes possible).
 *        - v2/v1 dedupe client-side against seenIds.
 *   2. If ranked returns <50% of requested rows, top up with chronological
 *      tail after `cursor` (excluding seenIds).
 *   3. If ranked returns 0 rows AND chronological tail also fails, return
 *      empty so the infinite query terminates instead of looping.
 */
async function runRankedForYouContinuation(
  viewerId: string,
  seenIds: readonly string[],
  limit: number,
  cursor: string | null,
): Promise<{ posts: Post[]; nextCursor: string | null }> {
  const seen = new Set(seenIds);
  const t0 = feedPerfNow();

  /* Tier 1: ranked RPC with exclude_post_ids (v3) or client-dedupe (v2/v1). */
  let ranked: { post_id: string; score: number }[] = [];
  try {
    ranked = await callRankedRpc(viewerId, limit + 8, seenIds);
  } catch (e: any) {
    if (__DEV__) console.warn('runRankedForYouContinuation ranked RPC failed:', e?.message);
  }

  let rankedPosts: Post[] = [];
  if (ranked.length) {
    try {
      const ids = ranked.map((r) => r.post_id).filter((id) => !seen.has(id));
      if (ids.length) {
        const { data } = await supabase.from('posts').select(POST_SELECT_FEED).in('id', ids);
        if (data?.length) {
          const scoreMap = new Map(ranked.map((r) => [r.post_id, r.score]));
          rankedPosts = data
            .map(rowToPost)
            .filter(postAppearsInMainFeeds)
            .filter((p) => !seen.has(p.id))
            .sort(
              (a, b) =>
                ((scoreMap.get(b.id) ?? 0) as number) -
                ((scoreMap.get(a.id) ?? 0) as number),
            );
          rankedPosts = diversifyByCreator(rankedPosts, limit, 2);
        }
      }
    } catch (e: any) {
      if (__DEV__) console.warn('runRankedForYouContinuation hydrate failed:', e?.message);
    }
  }

  /* Tier 2: top up with chronological tail when ranked is thin. */
  if (rankedPosts.length < Math.ceil(limit / 2) && cursor) {
    try {
      let q = supabase
        .from('posts')
        .select(POST_SELECT_FEED)
        .contains('feed_type_eligible', ['forYou'])
        .lt('created_at', cursor)
        .order('created_at', { ascending: false })
        .limit(limit * 2);
      q = withFeedPrivacy(q, viewerId);
      const { data, error } = await q;
      if (!error && data?.length) {
        const chronoTail = (data as any[])
          .map(rowToPost)
          .filter((p) => !seen.has(p.id) && !rankedPosts.some((r) => r.id === p.id) && postAppearsInMainFeeds(p));
        rankedPosts = [...rankedPosts, ...chronoTail];
        if (__DEV__ && ranked.length === 0) {
          console.warn('runRankedForYouContinuation: ranker empty, using pure chronological tail');
        }
      }
    } catch (e: any) {
      if (__DEV__) console.warn('runRankedForYouContinuation chrono tail failed:', e?.message);
    }
  }

  const sliced = rankedPosts.slice(0, limit);
  /* nextCursor: use the oldest createdAt in this batch so Tier 2 chronological
     fallback still works on the next call even if the ranker remains empty. */
  let nextCursor: string | null = null;
  if (sliced.length) {
    let oldest = sliced[0].createdAt;
    for (const p of sliced) {
      if (p.createdAt < oldest) oldest = p.createdAt;
    }
    nextCursor = oldest;
  } else if (cursor) {
    nextCursor = null; // signal end-of-feed
  }

  feedPerfLog('forYou:continuation', t0, `returned=${sliced.length}, hadRanked=${ranked.length > 0}`);
  return { posts: sliced, nextCursor };
}

async function runTopTodayFeed(viewerId?: string | null): Promise<Post[]> {
  const dayAgoIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  /** Mirrors `get_top_today` in supabase/migrations/006_feed_algorithm.sql (RPC path). */
  const topTodayScore = (p: Post) =>
    p.likeCount * 1.0 +
    p.commentCount * 2.0 +
    p.shareCount * 3.0 +
    p.saveCount * 2.5 +
    Math.log(Math.max(p.viewCount, 1) + 1) * 2.0;

  /* Tier 1: get_top_today_v2 (migration 234) — quality lifts + safety penalties
     + viewer-aware exclusions when signed in. */
  try {
    const v2 = await supabase.rpc('get_top_today_v2', {
      viewer_uuid: viewerId ?? undefined,
      feed_limit: 50,
      exclude_post_ids: [] as string[],
    });
    if (!v2.error && v2.data?.length) {
      const ids = (v2.data as { post_id: string }[]).map((r) => r.post_id);
      const { data, error } = await supabase
        .from('posts')
        .select(POST_SELECT_FEED)
        .in('id', ids);
      if (!error && data?.length) {
        const scoreMap = new Map(
          (v2.data as { post_id: string; score: number }[]).map((r) => [r.post_id, r.score]),
        );
        const sorted = data
          .map(rowToPost)
          .filter(postAppearsInMainFeeds)
          .sort((a, b) => ((scoreMap.get(b.id) ?? 0) as number) - ((scoreMap.get(a.id) ?? 0) as number));
        return diversifyByCreator(sorted, 50, 3);
      }
    } else if (__DEV__ && v2.error) {
      console.warn('get_top_today_v2 unavailable, falling back to v1:', v2.error.message);
    }
  } catch (e: any) {
    if (__DEV__) console.warn('get_top_today_v2 threw, falling back to v1:', e?.message);
  }

  /* Tier 2: get_top_today (v1) — engagement-only scorer. */
  try {
    const { data: ranked, error: rpcError } = await supabase
      .rpc('get_top_today', { feed_limit: 50 });

    if (!rpcError && ranked?.length) {
      const ids = ranked.map((r: any) => r.post_id);
      const { data, error } = await supabase
        .from('posts')
        .select(POST_SELECT_FEED)
        .in('id', ids);

      if (!error && data?.length) {
        const scoreMap = new Map(ranked.map((r: any) => [r.post_id, r.score]));
        const sorted = data
          .map(rowToPost)
          .filter(postAppearsInMainFeeds)
          .sort((a, b) => ((scoreMap.get(b.id) ?? 0) as number) - ((scoreMap.get(a.id) ?? 0) as number));
        return diversifyByCreator(sorted, 50, 3);
      }
    }
  } catch {}

  const { data, error } = await supabase
    .from('posts')
    .select(POST_SELECT_FEED)
    .eq('privacy_mode', 'public')
    .gte('created_at', dayAgoIso)
    .order('created_at', { ascending: false })
    .limit(120);
  if (error) throw error;
  const mapped = (data ?? []).map(rowToPost).filter(postAppearsInMainFeeds);
  mapped.sort((a, b) => topTodayScore(b) - topTodayScore(a));
  return diversifyByCreator(mapped, 50, 3);
}

async function fetchLikedPostIdsForUser(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('post_likes')
    .select('post_id')
    .eq('user_id', userId)
    .limit(2000);
  if (error) {
    if (__DEV__) console.warn('[fetchLikedPostIdsForUser]', error.message);
    return new Set();
  }
  return new Set((data ?? []).map((r: { post_id: string }) => r.post_id));
}

export const postsService = {
  async getFeed(type: FeedType, userId?: string): Promise<Post[]> {
    const __feedT0 = __DEV__ && typeof performance !== 'undefined' ? performance.now() : 0;
    try {
      if (type === 'community') return [];

      const exclusionsPromise = loadFeedExclusions(userId);
      let posts: Post[];

      if (type === 'forYou' && userId) {
        const fyT0 = feedPerfNow();
        const [merged, ex] = await Promise.all([runRankedForYouFeed(userId), exclusionsPromise]);
        feedPerfLog('getFeed:forYou ranked+exclusions settled', fyT0);
        const filterT0 = feedPerfNow();
        posts = await applyViewerFeedFilters(merged, userId, ex);
        feedPerfLog('getFeed:forYou applyFilters', filterT0);
        const finT0 = feedPerfNow();
        const finalized = finalizePostsForViewer(posts, userId);
        feedPerfLog('getFeed:forYou finalize', finT0);
        return finalized;
      }

      if (type === 'topToday') {
        const [p, ex] = await Promise.all([runTopTodayFeed(userId ?? null), exclusionsPromise]);
        posts = await applyViewerFeedFilters(p, userId, ex);
        return finalizePostsForViewer(posts, userId);
      }

      if (type === 'following') {
        if (!userId?.trim()) {
          return finalizePostsForViewer([], userId);
        }
        const foT0 = feedPerfNow();
        const [rawPosts, ex] = await Promise.all([
          fetchFollowingFeedPosts({ viewerId: userId.trim(), limit: 50 }),
          exclusionsPromise,
        ]);
        feedPerfLog('getFeed:following fetched', foT0);
        posts = await applyViewerFeedFilters(rawPosts, userId, ex);
        return finalizePostsForViewer(posts, userId);
      }

      // Anonymous For You — chronological public posts eligible for the main feed.
      if (type === 'forYou' && !userId) {
        let query = supabase.from('posts').select(POST_SELECT_FEED);
        query = withFeedPrivacy(query, userId);
        query = query.contains('feed_type_eligible', ['forYou']);
        query = query.order('created_at', { ascending: false }).limit(50);

        const [result, ex] = await Promise.all([query, exclusionsPromise]);
        const { data, error } = result;
        if (error) {
          if (__DEV__) console.error('getFeed error:', error);
          throw error;
        }
        posts = await applyViewerFeedFilters(
          (data ?? []).map(rowToPost).filter(postAppearsInMainFeeds),
          userId,
          ex,
        );
        return finalizePostsForViewer(posts, userId);
      }

      return finalizePostsForViewer([], userId);
    } finally {
      if (__DEV__ && typeof performance !== 'undefined' && type !== 'community') {
        console.log(
          `[perf] postsService.getFeed(${type}) ${(performance.now() - __feedT0).toFixed(0)}ms`,
        );
      }
    }
  },

  async getLikedPostIdsForUser(userId: string): Promise<Set<string>> {
    return fetchLikedPostIdsForUser(userId);
  },

  async getSavedPostIdsForUser(userId: string): Promise<Set<string>> {
    const { data, error } = await supabase.from('saved_posts').select('post_id').eq('user_id', userId).limit(2000);
    if (error) {
      if (__DEV__) console.warn('[getSavedPostIdsForUser]', error.message);
      return new Set();
    }
    return new Set((data ?? []).map((r: { post_id: string }) => r.post_id));
  },

  async getFeedContinuation(args: {
    type: FeedType;
    viewerId?: string;
    cursor: string;
    excludeIds: string[];
    limit?: number;
  }): Promise<{ posts: Post[]; nextCursor: string | null }> {
    const __contT0 = __DEV__ && typeof performance !== 'undefined' ? performance.now() : 0;
    const { type, viewerId, cursor, excludeIds } = args;
    const limit = args.limit ?? 18;
    const exclude = new Set(excludeIds);

    try {
      if (type === 'community') return { posts: [], nextCursor: null };

      if (type === 'following') {
        if (!viewerId?.trim()) {
          return { posts: [], nextCursor: null };
        }
        const [rawPosts, exclusions] = await Promise.all([
          fetchFollowingFeedPosts({
            viewerId: viewerId.trim(),
            limit,
            cursor,
            excludeIds: exclude,
          }),
          loadFeedExclusions(viewerId),
        ]);
        let posts = finalizePostsForViewer(
          await applyViewerFeedFilters(rawPosts, viewerId, exclusions),
          viewerId,
        );
        posts = posts.slice(0, limit);
        const nextCursor = posts.length === limit ? posts[posts.length - 1].createdAt : null;
        return { posts, nextCursor };
      }

      /* For You page 2+: keep personalized ranking across pagination
         (requirement #1 in feed beta-readiness audit). Previously dropped to a
         pure chronological tail here, which made the feed feel smart on page 1
         and random after. runRankedForYouContinuation owns the fallback chain:
           ranked v3 (exclude_post_ids) → ranked v2/v1 (client dedupe) →
           chronological tail (last resort). */
      if (type === 'forYou' && viewerId?.trim()) {
        const [{ posts: rawPosts, nextCursor: rankedCursor }, exclusions] = await Promise.all([
          runRankedForYouContinuation(viewerId.trim(), excludeIds, limit, cursor),
          loadFeedExclusions(viewerId),
        ]);
        let posts = finalizePostsForViewer(
          await applyViewerFeedFilters(rawPosts, viewerId, exclusions),
          viewerId,
        );
        posts = posts.slice(0, limit);
        /* Prefer ranked-derived cursor; fall back to oldest in the batch. */
        const nextCursor =
          posts.length === limit
            ? rankedCursor ?? posts[posts.length - 1].createdAt
            : null;
        return { posts, nextCursor };
      }

      /* Top Today + anonymous For You: chronological tail (no ranker). */
      let query = supabase
        .from('posts')
        .select(POST_SELECT_FEED)
        .lt('created_at', cursor)
        .order('created_at', { ascending: false })
        .limit(limit * 2);

      query = withFeedPrivacy(query, viewerId);

      if (type === 'forYou') {
        query = query.contains('feed_type_eligible', ['forYou']);
      } else if (type === 'topToday') {
        const dayAgoIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('created_at', dayAgoIso);
      }

      const [result, exclusions] = await Promise.all([query, loadFeedExclusions(viewerId)]);
      const { data, error } = result;
      if (error) throw error;
      let posts = (data ?? [])
        .map(rowToPost)
        .filter((p) => !exclude.has(p.id) && postAppearsInMainFeeds(p));
      posts = finalizePostsForViewer(await applyViewerFeedFilters(posts, viewerId, exclusions), viewerId);
      posts = posts.slice(0, limit);
      const nextCursor = posts.length === limit ? posts[posts.length - 1].createdAt : null;
      return { posts, nextCursor };
    } finally {
      if (__DEV__ && typeof performance !== 'undefined' && type !== 'community') {
        console.log(
          `[perf] postsService.getFeedContinuation(${type}) ${(performance.now() - __contT0).toFixed(0)}ms`,
        );
      }
    }
  },

  async getPostsByHashtag(tag: string, limit = 40, viewerId?: string | null): Promise<Post[]> {
    const raw = tag.replace(/^#/, '').trim().toLowerCase();
    if (!raw) return [];
    const { data, error } = await supabase
      .from('posts')
      .select(POST_SELECT)
      .not('hashtags', 'eq', '{}')
      .eq('privacy_mode', 'public')
      .order('created_at', { ascending: false })
      .limit(180);
    if (error) throw error;
    const rows = (data ?? []).map(rowToPost);
    const filtered = rows.filter(
      (p) => postIsLiveForPublicSurface(p) && (p.hashtags ?? []).some((h) => String(h).toLowerCase() === raw),
    );
    return finalizePostsForViewer(filtered.slice(0, limit), viewerId);
  },

  async getPostsUsingSoundSource(sourcePostId: string, limit = 30, viewerId?: string | null): Promise<Post[]> {
    const { data, error } = await supabase
      .from('posts')
      .select(POST_SELECT)
      .eq('sound_source_post_id', sourcePostId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return finalizePostsForViewer(
      (data ?? []).map(rowToPost).filter(postIsLiveForPublicSurface),
      viewerId,
    );
  },

  getRankedFeed: runRankedForYouFeed,
  getTopToday: runTopTodayFeed,

  async trackView(postId: string, viewerId: string, durationMs: number): Promise<void> {
    enqueuePostView({
      post_id: postId,
      viewer_id: viewerId,
      view_duration_ms: durationMs,
    });
  },

  /** Flush queued view rows (e.g. tab unmount) so completion signals are not lost. */
  async flushPostViewQueue(): Promise<void> {
    await flushPostViewQueueInternal();
  },

  async getFeedPaginated(
    type: FeedType,
    cursor?: string,
    limit = 20,
    viewerId?: string,
  ): Promise<{ posts: Post[]; nextCursor: string | null }> {
    let query = supabase
      .from('posts')
      .select(POST_SELECT)
      .contains('feed_type_eligible', [type])
      .order('created_at', { ascending: false })
      .limit(limit);

    query = withFeedPrivacy(query, viewerId);

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data, error } = await query;
    if (error) throw error;

    const posts = finalizePostsForViewer(
      (data ?? []).map(rowToPost).filter(postIsLiveForPublicSurface),
      viewerId,
    );
    const nextCursor = posts.length === limit ? posts[posts.length - 1].createdAt : null;
    return { posts, nextCursor };
  },

  async getById(id: string, viewerId?: string | null): Promise<Post | null> {
    const { data, error } = await fromPostsViewerSafe()
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    const [hydrated] = await hydratePostRowsWithProfiles([data]);
    const mapped = rowToPost(hydrated);
    if (!postIsLiveForPublicSurface(mapped) && viewerId !== mapped.creatorId) return null;
    return finalizePostsForViewer([mapped], viewerId)[0] ?? null;
  },

  /**
   * Minimal fetch for comment error handlers / offline replay. Does not apply
   * full viewer privacy shaping — only whether `comments_disabled` is set.
   * Returns `null` when the row isn't readable (deleted, blocked, session gap).
   */
  async getCommentsDisabledSnapshot(postId: string): Promise<boolean | null> {
    const { data, error } = await supabase
      .from('posts')
      .select('comments_disabled')
      .eq('id', postId)
      .maybeSingle();
    if (error || data == null) return null;
    return data.comments_disabled === true;
  },

  /**
   * Batch fetch posts by id, preserving caller order and applying viewer
   * privacy filters in one round-trip. Designed for prefetching feed
   * sub-resources (sound sources, duet parents, linked-post pins) in a
   * single query instead of N parallel `getById` calls.
   *
   * Returns a `Map<id, Post>` so callers can resolve by id without
   * caring about ordering. Missing ids (deleted, blocked, RLS-filtered)
   * are simply absent from the map.
   */
  async getByIds(
    ids: readonly string[],
    viewerId?: string | null,
  ): Promise<Map<string, Post>> {
    const unique = Array.from(new Set(ids.filter((x) => !!x && x.trim().length > 0)));
    if (unique.length === 0) return new Map();

    const ordered = await fetchPostsByIdsOrdered(unique);
    const finalized = finalizePostsForViewer(ordered, viewerId);

    const map = new Map<string, Post>();
    for (const p of finalized) map.set(p.id, p);
    return map;
  },

  async getByUser(profileUserId: string, viewerId?: string | null): Promise<Post[]> {
    const readable = await profilePostsReadableForViewer(profileUserId, viewerId);
    if (!readable) return [];

    const { data, error } = await fromPostsViewerSafe()
      .select('*')
      .eq('creator_id', profileUserId)
      .order('created_at', { ascending: false });

    if (error) {
      if (__DEV__) console.warn('[postsService.getByUser]', error.message);
      return [];
    }

    const hydrated = await hydratePostRowsWithProfiles(data ?? []);
    let posts = hydrated.map(rowToPost);
    if (viewerId && viewerId !== profileUserId) {
      // Visitors never see another creator's still-processing / failed server-render
      // posts (stitch/broll/video_composition) — those carry a provisional/un-composited
      // media_url until the worker patches. Owners still see them (with a placeholder).
      posts = posts.filter((p) => {
        if (p.isAnonymous || !postIsLiveForPublicSurface(p)) return false;
        const proc = (p.mediaProcessingStatus ?? '').trim().toLowerCase();
        if (proc === 'queued' || proc === 'running' || proc === 'failed') return false;
        return true;
      });
    }
    posts = finalizePostsForViewer(posts, viewerId);

    const viewerKey = viewerId?.trim();
    if (viewerKey && posts.length > 0) {
      const likedIds = await fetchLikedPostIdsForUser(viewerKey);
      posts = posts.map((p) => ({
        ...p,
        isLiked: likedIds.has(p.id),
      }));
    }

    posts = await enrichPostsWithLinkedCommunityMeta(posts);

    return posts;
  },

  async getByCommunity(
    communityId: string,
    viewerId?: string | null,
    opts?: { limit?: number; cursor?: string | null },
  ): Promise<Post[]> {
    const limit = opts?.limit ?? COMMUNITY_WALL_PAGE_SIZE;
    const cursor = opts?.cursor?.trim() || null;
    const isFirstPage = !cursor;

    const wallRows = await fetchCommunityWallRows(communityId, limit, cursor, viewerId);

    const pinsPromise = isFirstPage
      ? supabase
          .from('community_post_pins')
          .select('post_id, sort_order')
          .eq('community_id', communityId)
      : Promise.resolve({ data: [] as CommunityPostPinRow[], error: null });

    const pinsResult = await pinsPromise;

    let pins: CommunityPostPinRow[] = [];
    if (!pinsResult.error && pinsResult.data) {
      pins = pinsResult.data as CommunityPostPinRow[];
    } else if (pinsResult.error && __DEV__) {
      console.warn('[postsService.getByCommunity] community_post_pins:', pinsResult.error.message);
    }

    const hydrated = await hydratePostRowsWithProfiles(wallRows);
    let posts = finalizePostsForViewer(
      hydrated.map(rowToPost).filter(postIsLiveForPublicSurface),
      viewerId,
    );
    if (isFirstPage) {
      posts = mergePinnedCommunityPosts(posts, pins);
    }
    return posts;
  },

  /** Circle-tagged posts from the last 24h (for Circles home trending merge). */
  async getCommunityPostCandidates24h(maxFetch = 100): Promise<Post[]> {
    return this.getCommunityPostCandidatesSince(24 * 60 * 60 * 1000, maxFetch);
  },

  /**
   * Community posts within `windowMs` of now, or (when `windowMs <= 0`)
   * the most recent community posts overall. Companion to
   * `circleThreadsDb.trendingThreadCandidatesSince` — used to backfill
   * trending topics when the 24h window is too sparse.
   */
  async getCommunityPostCandidatesSince(
    windowMs: number,
    maxFetch = 100,
  ): Promise<Post[]> {
    let q = supabase
      .from('posts')
      .select(POST_SELECT)
      .eq('privacy_mode', 'public')
      .order('created_at', { ascending: false })
      .limit(maxFetch);

    if (windowMs > 0) {
      const since = new Date(Date.now() - windowMs).toISOString();
      q = q.gte('created_at', since);
    }

    const { data, error } = await q;
    if (error) throw error;
    return (data ?? [])
      .map(rowToPost)
      .filter((p) => (p.communities ?? []).length > 0 && postIsLiveForPublicSurface(p));
  },

  /**
   * Search original video sounds (posts with their own audio, not borrowing another clip).
   * Prefer RPC `search_sound_library`; falls back to REST if the migration is not applied yet.
   */
  async searchSoundLibrary(query: string, limit = 25): Promise<SoundLibraryRow[]> {
    const q = query.trim();
    const { data, error } = await supabase.rpc('search_sound_library', {
      p_query: q,
      p_limit: limit,
    } as never);

    if (!error && data != null) {
      return (data as any[]).map((r) => ({
        postId: String(r.post_id),
        soundTitle: String(r.sound_title ?? 'Original sound'),
        mediaUrl: normalizeMediaUrl(r.media_url),
        thumbnailUrl: normalizeMediaUrl(r.thumbnail_url),
        creatorId: String(r.creator_id),
        creatorDisplayName: String(r.creator_display_name ?? ''),
        creatorAvatarUrl: r.creator_avatar_url ? String(r.creator_avatar_url) : undefined,
        remixCount: Number(r.remix_count ?? 0),
      }));
    }

    if (__DEV__ && error) {
      console.warn('[postsService.searchSoundLibrary] RPC failed, using REST fallback:', error.message);
    }

    const esc = escapePostgrestIlike(q);
    let qb = supabase
      .from('posts')
      .select(POST_SELECT)
      .eq('type', 'video')
      .not('media_url', 'is', null)
      .is('sound_source_post_id', null)
      .eq('is_anonymous', false)
      .order('created_at', { ascending: false })
      .limit(Math.min(Math.max(limit, 1), 50));

    if (q.length >= 2) {
      qb = qb.or(`sound_title.ilike.%${esc}%,caption.ilike.%${esc}%`);
    }

    const { data: rows, error: restErr } = await qb;
    if (restErr) throw restErr;
    return (rows ?? []).map((row: any) => {
      const p = rowToPost(row);
      return {
        postId: p.id,
        soundTitle: p.soundTitle ?? (p.caption?.trim() ? p.caption.trim().slice(0, 120) : 'Original sound'),
        mediaUrl: p.mediaUrl,
        thumbnailUrl: p.thumbnailUrl,
        creatorId: p.creatorId,
        creatorDisplayName: p.creator.displayName,
        creatorAvatarUrl: p.creator.avatarUrl,
        remixCount: 0,
      };
    });
  },

  /**
   * Weekly viral chart: source posts ranked by new remix clips in the last 7 days.
   * Optional `titleFilter` narrows the chart (search while on Viral Songs tab).
   */
  async getViralSoundsThisWeek(opts?: { limit?: number; titleFilter?: string }): Promise<ViralSoundRow[]> {
    const limit = opts?.limit ?? 10;
    const titleFilter = opts?.titleFilter?.trim() || null;
    const { data, error } = await supabase.rpc('get_viral_sounds_this_week', {
      p_limit: limit,
      p_title_filter: titleFilter,
    } as never);

    if (error) {
      if (__DEV__) console.warn('[postsService.getViralSoundsThisWeek]', error.message);
      return [];
    }

    return (data as any[] | null)?.map((r) => ({
      postId: String(r.source_post_id),
      soundTitle: String(r.sound_title ?? 'Original sound'),
      remixCount7d: Number(r.remix_count_7d ?? 0),
      lastRemixAt: r.last_remix_at ? String(r.last_remix_at) : undefined,
      mediaUrl: normalizeMediaUrl(r.media_url),
      thumbnailUrl: normalizeMediaUrl(r.thumbnail_url),
      creatorId: String(r.creator_id),
      creatorDisplayName: String(r.creator_display_name ?? ''),
      creatorAvatarUrl: r.creator_avatar_url ? String(r.creator_avatar_url) : undefined,
    })) ?? [];
  },

  /** Distinct hashtag tokens containing the search substring (server-side). */
  async searchHashtags(term: string, limit = 40): Promise<string[]> {
    const t = term.trim();
    if (!t) return [];
    const { data, error } = await supabase.rpc('search_hashtags', {
      p_term: t,
      p_limit: limit,
    } as never);
    if (error) {
      if (__DEV__) console.warn('[postsService.searchHashtags]', error.message);
      return [];
    }
    return ((data as { tag: string }[] | null) ?? []).map((r) => r.tag).filter(Boolean);
  },

  async create(post: {
    creator_id: string;
    type: string;
    caption: string;
    media_url?: string;
    thumbnail_url?: string;
    hashtags?: string[];
    communities?: string[];
    is_anonymous?: boolean;
    privacy_mode?: string;
    feed_type_eligible?: string[];
    role_context?: string;
    specialty_context?: string;
    location_context?: string;
    sound_title?: string | null;
    sound_source_post_id?: string | null;
    sound_source_media_url?: string | null;
    /** Migration 183 — feed stitch / combine Part 1 attribution. */
    stitch_source_post_id?: string | null;
    /** Migration 207/210 — live or feed clip lineage. */
    source_live_stream_id?: string | null;
    source_post_id?: string | null;
    source_creator_id?: string | null;
    clip_start_seconds?: number | null;
    clip_end_seconds?: number | null;
    duet_parent_id?: string | null;
    /** Migration 161 — strip vs floating parent chrome in feed. */
    duet_layout_mode?: 'strip' | 'floating' | null;
    evidence_url?: string | null;
    evidence_label?: string | null;
    shift_context?: string | null;
    /** Creator-tools (require migration 090). All optional and stripped on retry if the columns aren't present. */
    is_education?: boolean;
    education_citations?: { label?: string; url: string }[] | null;
    series_id?: string | null;
    series_part?: number | null;
    series_total?: number | null;
    scheduled_at?: string | null;
    scheduled_status?: 'live' | 'scheduled' | 'sending' | 'failed' | 'cancelled' | null;
    cover_alt_url?: string | null;
    /** Read-side color grade on feed video (migration 162). */
    video_look_id?: string | null;
    additional_media?: string[] | null;
    /** On-video sticker line (<=80 chars). Rendered live on the feed video; not baked. */
    video_overlay_text?: string | null;
    /** On-video sticker style metadata (font, size, color, x_norm, y_norm). Migration 237. */
    video_overlay_style?: VideoOverlayStyle | Record<string, unknown> | null;
    /** When true, new comments are rejected for this post (migration 156). */
    comments_disabled?: boolean;
    allow_viewer_clips?: boolean;
    allow_remix?: boolean;
    allow_clip_downloads?: boolean;
    /** Stitch/export pipeline (migration 159). Omit unless concat job is in flight. */
    media_processing_status?: 'queued' | 'running' | 'failed' | null;
    media_processing_job_id?: string | null;
    media_processing_error?: string | null;
    /** Attribution to a Circle "This Week" prompt (migration 274). Optional;
     *  stripped on retry if the column isn't present yet. */
    weekly_prompt_id?: string | null;
  }): Promise<Post> {
    let roleCtx = post.role_context;
    let specCtx = post.specialty_context;
    let locCtx = post.location_context;

    if (!roleCtx || !specCtx) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, specialty, state')
          .eq('id', post.creator_id)
          .single();
        if (profile) {
          roleCtx = roleCtx || profile.role;
          specCtx = specCtx || profile.specialty;
          locCtx = locCtx || profile.state;
        }
      } catch {}
    }

    const {
      sound_title: soundTitleIn,
      sound_source_post_id: soundSourceIn,
      sound_source_media_url: soundMediaIn,
      stitch_source_post_id: stitchSourcePostIdIn,
      source_live_stream_id: sourceLiveStreamIdIn,
      source_post_id: sourcePostIdIn,
      source_creator_id: sourceCreatorIdIn,
      clip_start_seconds: clipStartSecondsIn,
      clip_end_seconds: clipEndSecondsIn,
      duet_parent_id: duetParentIn,
      duet_layout_mode: duetLayoutModeIn,
      evidence_url: evidenceUrlIn,
      evidence_label: evidenceLabelIn,
      shift_context: shiftCtxIn,
      is_education: isEducationIn,
      education_citations: educationCitationsIn,
      series_id: seriesIdIn,
      series_part: seriesPartIn,
      series_total: seriesTotalIn,
      scheduled_at: scheduledAtIn,
      scheduled_status: scheduledStatusIn,
      cover_alt_url: coverAltUrlIn,
      video_look_id: videoLookIdIn,
      additional_media: additionalMediaIn,
      video_overlay_text: videoOverlayTextIn,
      video_overlay_style: videoOverlayStyleIn,
      comments_disabled: commentsDisabledIn,
      allow_viewer_clips: allowViewerClipsIn,
      allow_remix: allowRemixIn,
      allow_clip_downloads: allowClipDownloadsIn,
      media_processing_status: mediaProcessingStatusIn,
      media_processing_job_id: mediaProcessingJobIdIn,
      media_processing_error: mediaProcessingErrorIn,
      weekly_prompt_id: weeklyPromptIdIn,
      ...postRest
    } = post;

    const insertPayload: Record<string, unknown> = {
      ...postRest,
      media_url: post.media_url ?? null,
      thumbnail_url: post.thumbnail_url ?? null,
      feed_type_eligible: normalizeFeedTypeEligibleTags(
        post.feed_type_eligible?.length ? post.feed_type_eligible : ['forYou', 'following'],
      ),
      role_context: roleCtx,
      specialty_context: specCtx,
      location_context: locCtx,
    };

    const st = soundTitleIn != null ? String(soundTitleIn).trim() : '';
    const sid = soundSourceIn != null ? String(soundSourceIn).trim() : '';
    const sm = soundMediaIn != null ? String(soundMediaIn).trim() : '';
    if (st) insertPayload.sound_title = st;
    if (sid) insertPayload.sound_source_post_id = sid;
    if (sm) {
      const normalizedSound = normalizeMediaUrl(sm);
      if (normalizedSound) insertPayload.sound_source_media_url = normalizedSound;
    }

    const dp = duetParentIn != null ? String(duetParentIn).trim() : '';
    if (dp) insertPayload.duet_parent_id = dp;

    const evu = evidenceUrlIn != null ? String(evidenceUrlIn).trim() : '';
    if (evu) insertPayload.evidence_url = evu;
    const evl = evidenceLabelIn != null ? String(evidenceLabelIn).trim() : '';
    if (evl) insertPayload.evidence_label = evl;
    const sh = shiftCtxIn != null ? String(shiftCtxIn).trim().toLowerCase() : '';
    if (sh && ['day', 'night', 'weekend', 'any'].includes(sh)) insertPayload.shift_context = sh;

    /**
     * Creator-tools fields (migration 090). We collect the new keys into a
     * separate map so we can retry without them if the columns aren't present.
     */
    const extensionPayload: Record<string, unknown> = {};
    if (isEducationIn === true) extensionPayload.is_education = true;
    if (educationCitationsIn != null) {
      const safe = (Array.isArray(educationCitationsIn) ? educationCitationsIn : [])
        .map((c) => {
          const row = c as Record<string, unknown>;
          const doiRaw = row.doi != null ? String(row.doi).trim().slice(0, 160) : '';
          const lrRaw =
            row.lastReviewed != null
              ? String(row.lastReviewed).trim().slice(0, 40)
              : row.last_reviewed != null
                ? String(row.last_reviewed).trim().slice(0, 40)
                : '';
          return {
            label: typeof row.label === 'string' ? row.label.slice(0, 80) : null,
            url: typeof row.url === 'string' ? String(row.url).trim().slice(0, 500) : '',
            ...(doiRaw ? { doi: doiRaw } : {}),
            ...(lrRaw ? { last_reviewed: lrRaw } : {}),
          };
        })
        .filter((c) => c.url);
      if (safe.length) extensionPayload.education_citations = safe;
    }
    const sid2 = typeof seriesIdIn === 'string' ? seriesIdIn.trim() : '';
    if (sid2) extensionPayload.series_id = sid2;
    if (typeof seriesPartIn === 'number' && Number.isFinite(seriesPartIn)) {
      extensionPayload.series_part = Math.max(1, Math.min(99, Math.floor(seriesPartIn)));
    }
    if (typeof seriesTotalIn === 'number' && Number.isFinite(seriesTotalIn)) {
      extensionPayload.series_total = Math.max(1, Math.min(99, Math.floor(seriesTotalIn)));
    }
    const schAt = typeof scheduledAtIn === 'string' ? scheduledAtIn.trim() : '';
    if (schAt) extensionPayload.scheduled_at = schAt;
    if (scheduledStatusIn && ['live', 'scheduled', 'sending', 'failed', 'cancelled'].includes(scheduledStatusIn)) {
      extensionPayload.scheduled_status = scheduledStatusIn;
    }
    const cau = typeof coverAltUrlIn === 'string' ? coverAltUrlIn.trim() : '';
    if (cau) extensionPayload.cover_alt_url = cau;
    if (Array.isArray(additionalMediaIn) && additionalMediaIn.length) {
      insertPayload.additional_media = additionalMediaIn;
    }
    /**
     * Goes into `extensionPayload` (retried-stripped on missing column) so
     * environments that haven't run migration 153 yet still let the post
     * through — they'll just lose the on-video sticker line.
     */
    const vot = typeof videoOverlayTextIn === 'string' ? videoOverlayTextIn.trim() : '';
    if (vot) extensionPayload.video_overlay_text = clampVideoOverlayText(vot);

    /** Overlay style is only meaningful when overlay text exists. Empty text →
     *  null style so we don't accumulate orphan rows with positions for no-op
     *  overlays. Re-serialize so the DB receives a clean shape. */
    if (vot && videoOverlayStyleIn) {
      const parsed = parseOverlayStyle(videoOverlayStyleIn);
      if (parsed) extensionPayload.video_overlay_style = serializeOverlayStyle(parsed);
    }

    const vlk = normalizeVideoLookId(videoLookIdIn);
    if (vlk) extensionPayload.video_look_id = vlk;

    if (commentsDisabledIn === true) extensionPayload.comments_disabled = true;

    if (allowViewerClipsIn === false) extensionPayload.allow_viewer_clips = false;
    else if (allowViewerClipsIn === true) extensionPayload.allow_viewer_clips = true;

    if (allowRemixIn === false) extensionPayload.allow_remix = false;
    else if (allowRemixIn === true) extensionPayload.allow_remix = true;

    if (allowClipDownloadsIn === true) extensionPayload.allow_clip_downloads = true;
    else if (allowClipDownloadsIn === false) extensionPayload.allow_clip_downloads = false;

    const mps =
      mediaProcessingStatusIn != null ? String(mediaProcessingStatusIn).trim().toLowerCase() : '';
    if (mps === 'queued' || mps === 'running' || mps === 'failed') {
      extensionPayload.media_processing_status = mps;
    }
    const mpjid =
      mediaProcessingJobIdIn != null ? String(mediaProcessingJobIdIn).trim() : '';
    if (mpjid) extensionPayload.media_processing_job_id = mpjid;
    const mperr =
      mediaProcessingErrorIn != null ? String(mediaProcessingErrorIn).trim() : '';
    if (mperr) extensionPayload.media_processing_error = mperr.slice(0, 500);

    if (dp) {
      extensionPayload.duet_layout_mode = duetLayoutModeIn === 'floating' ? 'floating' : 'strip';
    }

    const stitchSrc =
      stitchSourcePostIdIn != null ? String(stitchSourcePostIdIn).trim() : '';
    if (stitchSrc) extensionPayload.stitch_source_post_id = stitchSrc;

    const liveSrc = sourceLiveStreamIdIn != null ? String(sourceLiveStreamIdIn).trim() : '';
    if (liveSrc) extensionPayload.source_live_stream_id = liveSrc;

    const feedClipSrc = sourcePostIdIn != null ? String(sourcePostIdIn).trim() : '';
    if (feedClipSrc) extensionPayload.source_post_id = feedClipSrc;

    const feedClipCreator =
      sourceCreatorIdIn != null ? String(sourceCreatorIdIn).trim() : '';
    if (feedClipCreator) extensionPayload.source_creator_id = feedClipCreator;

    if (clipStartSecondsIn != null && Number.isFinite(Number(clipStartSecondsIn))) {
      extensionPayload.clip_start_seconds = Number(clipStartSecondsIn);
    }
    if (clipEndSecondsIn != null && Number.isFinite(Number(clipEndSecondsIn))) {
      extensionPayload.clip_end_seconds = Number(clipEndSecondsIn);
    }

    const weeklyPromptId = weeklyPromptIdIn != null ? String(weeklyPromptIdIn).trim() : '';
    if (weeklyPromptId) extensionPayload.weekly_prompt_id = weeklyPromptId;

    const fullPayload = { ...insertPayload, ...extensionPayload };

    let inserted: { data: unknown; error: unknown } = await supabase
      .from('posts')
      .insert(fullPayload as any)
      .select(POST_SELECT)
      .single();

    /**
     * If the migration adding creator-tools columns hasn't been run yet, the
     * insert will fail with a "column ... does not exist" Postgres error.
     * We strip the extension fields and retry once so the post still goes
     * through.
     */
    const errAny = inserted.error as { code?: string; message?: string } | null;
    const isUnknownColumn =
      errAny &&
      (errAny.code === '42703' ||
        /column .* does not exist|could not find .* column/i.test(errAny.message ?? ''));

    if (isUnknownColumn && Object.keys(extensionPayload).length > 0) {
      if (__DEV__) {
        console.warn(
          '[postsService.create] creator-tools columns missing; retrying without them.',
          errAny?.message,
        );
      }
      inserted = await supabase
        .from('posts')
        .insert(insertPayload as any)
        .select(POST_SELECT)
        .single();
    }

    if (inserted.error) throw inserted.error;
    return finalizePostsForViewer([rowToPost(inserted.data as never)], post.creator_id)[0]!;
  },

  async toggleLike(userId: string, postId: string): Promise<boolean> {
    const { data: existing } = await supabase
      .from('post_likes')
      .select('id')
      .eq('user_id', userId)
      .eq('post_id', postId)
      .single();

    if (existing) {
      await supabase.from('post_likes').delete().eq('id', existing.id);
      return false;
    } else {
      await supabase.from('post_likes').insert({ user_id: userId, post_id: postId, reaction: 'heart' });
      return true;
    }
  },

  /**
   * Circle wall: one reaction row per user; `null` removes. Feed still uses {@link toggleLike} (heart).
   */
  async setPostReaction(userId: string, postId: string, kind: PostReactionKind | null): Promise<void> {
    if (!kind) {
      const { error } = await supabase.from('post_likes').delete().eq('user_id', userId).eq('post_id', postId);
      if (error) throw error;
      return;
    }
    const { data: existing, error: exErr } = await supabase
      .from('post_likes')
      .select('id')
      .eq('user_id', userId)
      .eq('post_id', postId)
      .maybeSingle();
    if (exErr) throw exErr;
    if (existing) {
      const { error } = await supabase
        .from('post_likes')
        .update({ reaction: kind })
        .eq('id', (existing as { id: string }).id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('post_likes')
        .insert({ user_id: userId, post_id: postId, reaction: kind });
      if (error) throw error;
    }
  },

  /** Viewer-scoped reaction pick for a batch of posts (circle room cards). */
  async getViewerReactionsForPosts(
    userId: string,
    postIds: string[],
  ): Promise<Partial<Record<string, PostReactionKind>>> {
    if (postIds.length === 0) return {};
    const { data, error } = await supabase
      .from('post_likes')
      .select('post_id, reaction')
      .eq('user_id', userId)
      .in('post_id', postIds);
    if (error) throw error;
    const out: Partial<Record<string, PostReactionKind>> = {};
    for (const row of data ?? []) {
      const r = row as { post_id: string; reaction: string };
      const k = normalizePostReactionKind(r.reaction);
      if (k) out[r.post_id] = k;
    }
    return out;
  },

  async getSavedPosts(userId: string): Promise<Post[]> {
    const { data, error } = await supabase
      .from('saved_posts')
      .select('post_id, posts(*, profiles!posts_creator_id_fkey(id, display_name, avatar_url, role, specialty, city, state, is_verified, pulse_tier, pulse_score_current))')
      .eq('user_id', userId)
      .order('saved_at', { ascending: false });

    if (error) throw error;
    let posts = finalizePostsForViewer(
      (data ?? [])
        .filter((r: any) => r.posts)
        .map((r: any) => rowToPost(r.posts)),
      userId,
    );
    const likedIds = await fetchLikedPostIdsForUser(userId);
    posts = posts.map((p) => ({ ...p, isLiked: likedIds.has(p.id) }));
    return enrichPostsWithLinkedCommunityMeta(posts);
  },

  async getLikedPosts(userId: string): Promise<Post[]> {
    const { data, error } = await supabase
      .from('post_likes')
      .select('created_at, posts(*, profiles!posts_creator_id_fkey(id, display_name, avatar_url, role, specialty, city, state, is_verified, pulse_tier, pulse_score_current))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return finalizePostsForViewer(
      (data ?? [])
        .filter((r: any) => r.posts)
        .map((r: any) => rowToPost(r.posts)),
      userId,
    );
  },

  /**
   * IMPORTANT: insert/delete errors must throw -- otherwise a failed save
   * leaves the optimistic UI in a "saved" state forever (gold bookmark, +1
   * count) while the row never lands in saved_posts, so the post never
   * appears in the user's Saved screen. Throwing lets feed.tsx's catch
   * block enqueue an offline retry and surface a toast.
   *
   * Uses upsert(ignoreDuplicates) for the save path so a second tap (or a
   * replayed offline action) doesn't error on the unique(user_id,post_id)
   * constraint -- making the operation idempotent end-to-end.
   */
  async toggleSave(userId: string, postId: string): Promise<boolean> {
    const { data: existing, error: existsErr } = await supabase
      .from('saved_posts')
      .select('id')
      .eq('user_id', userId)
      .eq('post_id', postId)
      .maybeSingle();

    if (existsErr) throw existsErr;

    if (existing) {
      const { error } = await supabase.from('saved_posts').delete().eq('id', existing.id);
      if (error) throw error;
      return false;
    }

    const { error } = await supabase
      .from('saved_posts')
      .upsert(
        { user_id: userId, post_id: postId },
        { onConflict: 'user_id,post_id', ignoreDuplicates: true },
      );
    if (error) throw error;
    return true;
  },

  /**
   * Persist a share so posts.share_count and the user's My Pulse total
   * actually tally. The DB trigger in 040 bumps share_count automatically.
   * Throws on failure so callers can fall through to the offline queue.
   */
  async recordShare(userId: string | null, postId: string, channel?: string): Promise<void> {
    const { error } = await supabase.from('post_shares').insert({
      user_id: userId,
      post_id: postId,
      channel: channel ?? null,
    } as never);
    if (error) throw error;
  },

  /** Delete own post (My Pulse recent videos). */
  async deleteOwnPost(postId: string, creatorId: string): Promise<void> {
    const { error } = await supabase.from('posts').delete().eq('id', postId).eq('creator_id', creatorId);
    if (error) throw error;
  },

  /**
   * Author-only edit for a feed post's caption and/or hashtags. The
   * BEFORE-UPDATE trigger installed in migration 057 stamps
   * `edited_at = now()` for us any time either field drifts, so the
   * returned row comes back with a fresh timestamp the post detail
   * screen can render as "· edited".
   *
   * Scope is intentionally narrow — media, post type, circle
   * attribution, and privacy stay immutable. Larger changes should
   * delete + repost so viewers don't get confused by a caption that
   * no longer matches the underlying video.
   */
  async updateOwnPost(
    postId: string,
    creatorId: string,
    patch: {
      caption?: string;
      hashtags?: string[];
      commentsDisabled?: boolean;
      allowViewerClips?: boolean;
      allowRemix?: boolean;
      allowClipDownloads?: boolean;
    },
  ): Promise<Post> {
    const updates: Record<string, string | string[] | boolean | null> = {};
    if (Object.prototype.hasOwnProperty.call(patch, 'caption')) {
      /**
       * We allow empty captions (some posts are pure media) but trim
       * whitespace so the UI doesn't render a stray line. Length cap
       * is enforced DB-side; no need to duplicate it here.
       */
      updates.caption = (patch.caption ?? '').trim();
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'hashtags')) {
      updates.hashtags = Array.isArray(patch.hashtags)
        ? patch.hashtags.map((t) => t.trim()).filter(Boolean)
        : [];
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'commentsDisabled')) {
      updates.comments_disabled = patch.commentsDisabled === true;
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'allowViewerClips')) {
      updates.allow_viewer_clips = patch.allowViewerClips === true;
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'allowRemix')) {
      updates.allow_remix = patch.allowRemix === true;
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'allowClipDownloads')) {
      updates.allow_clip_downloads = patch.allowClipDownloads === true;
    }

    if (Object.keys(updates).length === 0) {
      const current = await this.getById(postId);
      if (!current) throw new Error('Post not found');
      return current;
    }

    const { data, error } = await supabase
      .from('posts')
      .update(updates as never)
      .eq('id', postId)
      .eq('creator_id', creatorId)
      .select(POST_SELECT)
      .single();
    if (error || !data) throw error ?? new Error('Update failed');
    return rowToPost(data);
  },

  /**
   * Author-only patch for stitch/export pipeline fields (migration 159).
   * Used after enqueueing creator_media_jobs or on client-side failure before worker runs.
   */
  async updateOwnPostMediaProcessing(
    postId: string,
    creatorId: string,
    patch: {
      mediaProcessingJobId?: string | null;
      mediaProcessingStatus?: 'queued' | 'running' | 'failed' | null;
      mediaProcessingError?: string | null;
      mediaUrl?: string | null;
    },
  ): Promise<void> {
    const updates: Record<string, unknown> = {};
    if (Object.prototype.hasOwnProperty.call(patch, 'mediaProcessingJobId')) {
      const v = patch.mediaProcessingJobId;
      updates.media_processing_job_id =
        v != null && String(v).trim() ? String(v).trim() : null;
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'mediaProcessingStatus')) {
      const v = patch.mediaProcessingStatus;
      if (v == null) updates.media_processing_status = null;
      else {
        const s = String(v).trim().toLowerCase();
        if (s === 'queued' || s === 'running' || s === 'failed') updates.media_processing_status = s;
      }
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'mediaProcessingError')) {
      const v = patch.mediaProcessingError;
      updates.media_processing_error =
        v != null && String(v).trim() ? String(v).trim().slice(0, 500) : null;
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'mediaUrl')) {
      const v = patch.mediaUrl;
      updates.media_url = v != null && String(v).trim() ? String(v).trim() : null;
    }
    if (Object.keys(updates).length === 0) return;

    const { error } = await supabase
      .from('posts')
      .update(updates as never)
      .eq('id', postId)
      .eq('creator_id', creatorId);
    if (error) throw error;
  },

  /** Top hashtags from recent public posts (Discover + Search empty-query browse). */
  async getTrendingHashtagsFromPosts(limit = 24): Promise<string[]> {
    const { data } = await supabase
      .from('posts')
      .select('hashtags')
      .eq('privacy_mode', 'public')
      .not('hashtags', 'eq', '{}')
      .order('created_at', { ascending: false })
      .limit(280);
    const tagCounts = new Map<string, number>();
    for (const row of data ?? []) {
      for (const tag of (row as { hashtags: string[] }).hashtags ?? []) {
        const k = String(tag).trim();
        if (!k) continue;
        tagCounts.set(k, (tagCounts.get(k) ?? 0) + 1);
      }
    }
    return [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, Math.max(1, Math.min(limit, 48)))
      .map(([t]) => t);
  },

  /**
   * Vertical shelves for Discover: clinician-native surfaces competitors won't copy.
   * `learn` = education-flagged posts; `night` = night shift context.
   */
  async getDiscoverShelf(kind: 'learn' | 'night', limit = 14): Promise<Post[]> {
    let q = supabase
      .from('posts')
      .select(POST_SELECT)
      .eq('privacy_mode', 'public')
      .contains('feed_type_eligible', ['forYou'])
      .order('created_at', { ascending: false })
      .limit(48);

    if (kind === 'learn') q = q.eq('is_education', true);
    if (kind === 'night') q = q.eq('shift_context', 'night');

    const { data, error } = await q;
    if (error) throw error;
    return (data ?? [])
      .map(rowToPost)
      .filter((p) => postIsLiveForPublicSurface(p) && postAppearsInMainFeeds(p))
      .slice(0, Math.max(1, Math.min(limit, 24)));
  },
};

/** Postgres / PostgREST failures that usually mean RLS `WITH CHECK` rejected the row. */
export function looksLikeRlsPolicyDenial(err: unknown): boolean {
  if (err == null || typeof err !== 'object') return false;
  const code = String((err as { code?: string }).code ?? '');
  const msg = String((err as { message?: string }).message ?? '').toLowerCase();
  if (code === '42501') return true;
  if (msg.includes('row-level security')) return true;
  if (msg.includes('violates row-level security')) return true;
  return false;
}
