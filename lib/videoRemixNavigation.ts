import { Alert, ActionSheetIOS, Platform } from 'react-native';
import type { Router } from 'expo-router';
import type { Post } from '@/types';
import { canRemixPostWithCreatorSettings } from '@/lib/postCreatorPermissions';
import { isFeatureEnabled } from '@/lib/featureFlags';

/** Respects creator remix toggle; owner can remix own eligible video. */
export function canRemixVideoPost(
  post: Pick<
    Post,
    'type' | 'isAnonymous' | 'mediaUrl' | 'thumbnailUrl' | 'allowRemix' | 'creatorId'
  >,
  viewer?: { id?: string | null } | null,
): boolean {
  return canRemixPostWithCreatorSettings(post, viewer ?? null);
}

export type VideoRemixRouteKey = 'useSound' | 'duet' | 'stitch' | 'stitchBroll' | 'composer';

export function pushVideoRemixRoute(router: Pick<Router, 'push'>, post: Post, key: VideoRemixRouteKey): void {
  switch (key) {
    case 'useSound': {
      const soundPageId = post.soundSourcePostId?.trim() || post.id;
      router.push(`/create/video?soundPostId=${encodeURIComponent(soundPageId)}`);
      break;
    }
    case 'duet':
      router.push(`/create/video-camera?duetPostId=${encodeURIComponent(post.id)}`);
      break;
    case 'stitch':
      if (__DEV__) {
        console.log('[stitch] navigate composer', { stitchSourcePostId: post.id, variant: 'series' });
      }
      router.push(
        `/create/video?openStitch=series&stitchSourcePostId=${encodeURIComponent(post.id)}`,
      );
      break;
    case 'stitchBroll':
      if (__DEV__) {
        console.log('[stitch] navigate composer', { stitchSourcePostId: post.id, variant: 'broll' });
      }
      router.push(`/create/video?openStitch=broll&stitchSourcePostId=${encodeURIComponent(post.id)}`);
      break;
    case 'composer':
      router.push('/create/video');
      break;
    default:
      break;
  }
}

/**
 * Native sheet / alert — use from post detail and anywhere grid UX isn’t suitable.
 *
 * Beta-launch gating: Duet / Stitch / B-roll are hidden when the
 * `feedVideoRemixAdvanced` feature flag is off (default in production release
 * builds). See `defaultFeedVideoRemixAdvanced` for context. Use sound + Create
 * video remain because they are fully wired. Note: "Create video" used to be
 * labeled "Full editor" but was renamed to make it clear the entry opens a
 * blank composer (no source post is carried through).
 */
export function openVideoRemixMenu(
  post: Post,
  router: Pick<Router, 'push'>,
  viewer?: { id?: string | null } | null,
): void {
  if (!canRemixVideoPost(post, viewer)) return;

  const go = (key: VideoRemixRouteKey) => pushVideoRemixRoute(router, post, key);
  const advanced = isFeatureEnabled('feedVideoRemixAdvanced');

  const labels: string[] = ['Use sound'];
  const keys: VideoRemixRouteKey[] = ['useSound'];
  if (advanced) {
    labels.push('Duet', 'Stitch', 'B-roll');
    keys.push('duet', 'stitch', 'stitchBroll');
  }
  labels.push('Create video');
  keys.push('composer');

  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: [...labels, 'Cancel'],
        cancelButtonIndex: labels.length,
        title: 'Remix video',
      },
      (i) => {
        const picked = keys[i];
        if (picked) go(picked);
      },
    );
    return;
  }

  Alert.alert('Remix video', undefined, [
    ...labels.map((text, idx) => ({ text, onPress: () => go(keys[idx]) })),
    { text: 'Cancel', style: 'cancel' as const },
  ]);
}
