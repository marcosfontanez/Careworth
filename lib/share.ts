import { Share, Platform, ActionSheetIOS, Alert } from 'react-native';
import { analytics } from './analytics';
import { supabase } from './supabase';
import { postsService } from '@/services/supabase';
import { profileUpdatesService } from '@/services/profileUpdates';
import { enqueueAction } from './offlineQueue';
import { bumpPostCount } from './postCacheUpdates';
import { profileUpdateKeys } from './queryKeys';
import type { Post } from '@/types';
import { LAUNCH_LINKS } from '@/constants/launch';

/**
 * Canonical "where to get PulseVerse" landing page. Redirects to the
 * right app store based on the recipient's device so a single URL works
 * in SMS / email / DMs / link-previews without us having to branch on
 * iOS vs Android in every share target. Keep this in sync with the
 * marketing site — if the domain or path ever moves, update here only.
 */
const PULSEVERSE_DOWNLOAD_URL = 'https://pulseverse.app/get';

/**
 * Compose a recipient-friendly share body. Every external share now
 * ends with an explicit "Get PulseVerse" call-to-action so someone who
 * receives the text / email / DM without the app installed knows
 * exactly where to go — solves the silent-drop problem where a raw
 * `pulseverse.app/post/…` link looked broken on devices that hadn't
 * registered the universal-link handler yet.
 *
 * iOS's share sheet renders `url` as a rich preview + tacks the url
 * onto the body depending on the chosen target, so we keep the body
 * clean and pass `url` separately. Android has no concept of a
 * dedicated share URL, so we inline the link + the CTA in the text.
 */
function buildShareBody(args: {
  headline: string;
  link: string;
  /** Trailing line, e.g. "Watch it on PulseVerse". Defaults to "Open it on PulseVerse". */
  ctaVerb?: string;
}): { message: string; url: string } {
  const headline = args.headline.trim();
  const link = args.link.trim();
  const verb = args.ctaVerb?.trim() || 'Open it on PulseVerse';
  /**
   * Keep the CTA block compact (three lines max) so it doesn't
   * overflow SMS previews / push notifications. The explicit
   * "Don't have the app?" phrasing plus a separate download link is
   * what tested cleanest in internal review — recipients consistently
   * understood they needed to install PulseVerse to view the content.
   */
  const ctaBlock = [
    `${verb}: ${link}`,
    `Don't have the app? Get PulseVerse free: ${PULSEVERSE_DOWNLOAD_URL}`,
  ].join('\n');

  const body = headline ? `${headline}\n\n${ctaBlock}` : ctaBlock;
  /**
   * On iOS we still pass `url` separately so the link-preview card
   * renders on iMessage / Mail. Body already includes the link too,
   * which is harmless (iMessage dedupes).
   */
  return { message: body, url: link };
}

/**
 * Append the PulseVerse "get the app" CTA to an arbitrary message
 * body. Used by one-off Share.share() callsites (My Pulse card shell,
 * My Pulse detail screen) that don't have a canonical deep-link URL
 * to lean on but still want recipients to know where to install the
 * app. Idempotent — if the CTA is already present in the text we
 * short-circuit so we never double-append on re-share.
 */
export function withPulseVerseCta(message: string): string {
  const trimmed = (message ?? '').trim();
  if (trimmed.includes(PULSEVERSE_DOWNLOAD_URL)) return trimmed;
  return `${trimmed}\n\nGet PulseVerse free: ${PULSEVERSE_DOWNLOAD_URL}`.trim();
}

/**
 * Persist the share to Supabase so posts.share_count tallies and the user's
 * My Pulse total reflects it. Best-effort: if the network call fails we
 * stash the action in the offline queue so it replays on reconnect.
 *
 * Reads the current user from the cached auth session (no network round-trip)
 * so we don't have to plumb userId through every callsite.
 */
async function persistShare(postId: string, channel?: string) {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id ?? null;
    if (!userId) return; // unauthenticated viewer -- nothing to credit
    try {
      await postsService.recordShare(userId, postId, channel);
    } catch {
      enqueueAction({
        type: 'share_post',
        payload: { postId, userId, channel: channel ?? null },
      }).catch(() => {});
    }
  } catch {
    /* getSession failure is unrecoverable here; the user can re-share later. */
  }
}

export async function sharePost(
  postId: string,
  caption: string,
  opts?: { anonymous?: boolean },
) {
  try {
    const link = `https://pulseverse.app/post/${postId}`;
    /**
     * Anonymous rooms deliberately scrub the caption so we don't leak
     * any identifying content in the recipient's text thread. We still
     * append the standard download CTA via buildShareBody so the
     * recipient knows what app to install.
     */
    const headline = opts?.anonymous
      ? 'An anonymous post shared from PulseVerse.'
      : (caption ?? '').trim();
    const { message, url } = buildShareBody({
      headline,
      link,
      ctaVerb: 'Watch it on PulseVerse',
    });

    const result = await Share.share({
      message,
      url,
      title: 'Check this out on PulseVerse',
    });

    /**
     * iOS reports `action === sharedAction` only when the user actually
     * picks a target (cancel returns `dismissedAction`). Android always
     * reports `sharedAction` once the sheet is opened -- we accept that as
     * the share intent on Android since the platform doesn't expose more.
     */
    if (result.action === Share.sharedAction) {
      const activityType =
        result.activityType != null ? String(result.activityType) : undefined;
      analytics.track('post_shared', {
        postId,
        anonymous: Boolean(opts?.anonymous),
        ...(activityType ? { shareChannel: activityType } : {}),
      });
      /**
       * Optimistically tick the cached post.shareCount so the paper-plane
       * count updates the moment the user picks a share target. The DB
       * trigger on post_shares (migration 040) is the source of truth and
       * will reconcile on next pull-to-refresh; persistShare below is what
       * actually writes the row (with offline-queue fallback).
       */
      bumpPostCount(postId, 'shareCount', 1);
      await persistShare(postId, activityType);
    }
  } catch {}
}

/**
 * Share a Pulse Score highlight (e.g. tier-up deep-link celebration).
 * Links to the profile so recipients can see the live score.
 */
export async function shareTierUp(opts: {
  userId: string;
  displayName: string;
  /** Optional legacy analytics / subtitle */
  tierLabel?: string;
  score?: number | null;
}) {
  try {
    const link = `https://pulseverse.app/profile/${opts.userId}`;
    const scorePart =
      typeof opts.score === 'number' && Number.isFinite(opts.score)
        ? ` — ${Math.round(opts.score)}/100 this month`
        : '';
    const headline = `My Pulse Score on PulseVerse${scorePart}.`;
    const { message, url } = buildShareBody({
      headline,
      link,
      ctaVerb: 'See my Pulse on PulseVerse',
    });

    const result = await Share.share({
      message,
      url,
      title: `@${opts.displayName} on PulseVerse`,
    });

    if (result.action === Share.sharedAction) {
      const activityType =
        result.activityType != null ? String(result.activityType) : undefined;
      analytics.track('tier_shared', {
        userId: opts.userId,
        ...(opts.tierLabel ? { tier: opts.tierLabel } : {}),
        score: typeof opts.score === 'number' ? opts.score : undefined,
        ...(activityType ? { shareChannel: activityType } : {}),
      });
    }
  } catch {}
}

export async function shareProfile(userId: string, displayName: string) {
  try {
    const link = `https://pulseverse.app/profile/${userId}`;
    const { message, url } = buildShareBody({
      headline: `Check out @${displayName} on PulseVerse.`,
      link,
      ctaVerb: 'See their Pulse',
    });

    await Share.share({
      message,
      url,
      title: `@${displayName} on PulseVerse`,
    });

    analytics.track('profile_viewed', { userId, shared: true });
  } catch {}
}

export async function shareJob(jobId: string, title: string, employer: string) {
  try {
    const link = `https://pulseverse.app/job/${jobId}`;
    const { message, url } = buildShareBody({
      headline: `${title} at ${employer}`,
      link,
      ctaVerb: 'Apply on PulseVerse',
    });

    await Share.share({
      message,
      url,
      title: `${title} - PulseVerse Jobs`,
    });
  } catch {}
}

/**
 * Pin a feed or circle post to the current user's My Pulse as a Clip. Used
 * by the share-sheet "Share to My Pulse" option so anyone can surface a
 * clip they love from their feed or a room on their own profile — not just
 * the original creator.
 *
 * Writes a `link_post` row into `profile_updates` and invalidates the
 * viewer's pulse cache so the new clip appears instantly in the My Pulse 5.
 * When `circleSlug` is provided we persist it alongside the linked post id
 * so the pin remembers it came from a room (detail screen uses this to
 * apply the right accent / anonymous masking when the viewer taps in).
 *
 * @returns `true` on success, `false` if the viewer is signed out.
 */
export async function shareToMyPulseAsClip(
  post: Post,
  opts?: {
    queryClient?: { invalidateQueries: (args: any) => unknown };
    /** Circle slug to carry through when the source lives in a room. */
    circleSlug?: string;
  },
): Promise<boolean> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id ?? null;
  if (!userId) return false;

  const baseText = (post.caption ?? '').trim().slice(0, 160) ||
    `Clip by @${post.creator.displayName}`;

  await profileUpdatesService.add(userId, {
    type: 'link_post',
    content: baseText,
    previewText: baseText.slice(0, 160),
    linkedPostId: post.id,
    linkedCircleSlug: opts?.circleSlug?.trim() || undefined,
  });

  analytics.track('post_pinned_to_my_pulse', {
    postId: post.id,
    ...(opts?.circleSlug ? { source: 'circle' } : {}),
  });

  if (opts?.queryClient) {
    opts.queryClient
      .invalidateQueries({ queryKey: profileUpdateKeys.forUser(userId) });
  }

  return true;
}

/**
 * Premium share chooser that replaces the bare native share sheet. Offers
 * two actions — "Share to My Pulse" (pins the post on the viewer's profile)
 * and "Share via…" (native OS sheet). Falls back cleanly to the native sheet
 * if the viewer is signed out.
 *
 * Pass `circleSlug` when sharing a post that originated in a room so the
 * pin persists the slug (detail screen can then preserve anonymous masking
 * and room accent on re-open). Pass `allowPulseShare: false` for anonymous
 * rooms where pinning to a public profile would out the author — in that
 * case we skip straight to the native sheet without the chooser.
 */
export async function sharePostMenu(
  post: Post,
  opts?: {
    toast?: (msg: string, kind?: 'success' | 'error' | 'info') => void;
    queryClient?: { invalidateQueries: (args: any) => unknown };
    circleSlug?: string;
    allowPulseShare?: boolean;
  },
): Promise<void> {
  const toast = opts?.toast;
  const allowPulseShare = opts?.allowPulseShare !== false;

  const runNativeShare = () =>
    sharePost(post.id, post.caption ?? '', { anonymous: post.isAnonymous });

  // Anonymous rooms short-circuit the chooser — the whole point is that the
  // poster stays invisible, and pinning to a public Pulse page would break
  // that contract. We hand off to the native share sheet directly.
  if (!allowPulseShare) {
    await runNativeShare();
    return;
  }

  const runPulseShare = async () => {
    try {
      const ok = await shareToMyPulseAsClip(post, {
        queryClient: opts?.queryClient,
        circleSlug: opts?.circleSlug,
      });
      if (ok) {
        toast?.('Added to your My Pulse', 'success');
      } else {
        toast?.('Sign in to pin to My Pulse', 'info');
      }
    } catch {
      toast?.('Couldn’t pin to My Pulse — try again', 'error');
    }
  };

  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ['Share to My Pulse', 'Share via…', 'Cancel'],
        cancelButtonIndex: 2,
        title: 'Share this post',
      },
      (i) => {
        if (i === 0) void runPulseShare();
        else if (i === 1) void runNativeShare();
      },
    );
    return;
  }

  // Android: Alert with three buttons.
  Alert.alert('Share this post', undefined, [
    { text: 'Share to My Pulse', onPress: () => void runPulseShare() },
    { text: 'Share via…', onPress: () => void runNativeShare() },
    { text: 'Cancel', style: 'cancel' },
  ]);
}

export async function shareCommunity(slug: string, name: string) {
  try {
    /** Canonical web URL: verified App / Universal Links host (`pulseverse.app` by default). */
    const base = LAUNCH_LINKS.marketingBaseUrl.replace(/\/$/, '');
    const link = `${base}/communities/${slug}`;
    const { message, url } = buildShareBody({
      headline: `Join the ${name} community on PulseVerse.`,
      link,
      ctaVerb: 'Open the Circle',
    });

    await Share.share({
      message,
      url,
      title: `${name} - PulseVerse`,
    });
  } catch {}
}

/** Deep link into a Circle discussion (matches app route communities/[slug]/thread/[threadId]). */
export async function shareCircleThread(slug: string, threadId: string, title: string) {
  try {
    const base = LAUNCH_LINKS.marketingBaseUrl.replace(/\/$/, '');
    const link = `${base}/communities/${slug}/thread/${threadId}`;
    const { message, url } = buildShareBody({
      headline: title.trim() || 'Circle discussion on PulseVerse',
      link,
      ctaVerb: 'Open discussion',
    });
    await Share.share({
      message,
      url,
      title: 'PulseVerse · Circle',
    });
  } catch {}
}
