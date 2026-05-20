import { Alert, ActionSheetIOS, Platform } from 'react-native';
import type { Router } from 'expo-router';
import type { Post } from '@/types';

/** Matches feed long-press: anonymous posts and non-video / missing media cannot remix. */
export function canRemixVideoPost(
  post: Pick<Post, 'type' | 'isAnonymous' | 'mediaUrl' | 'thumbnailUrl'>,
): boolean {
  if (post.isAnonymous) return false;
  if (post.type !== 'video') return false;
  return Boolean(post.mediaUrl?.trim() || post.thumbnailUrl?.trim());
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

/** Native sheet / alert — use from post detail and anywhere grid UX isn’t suitable. */
export function openVideoRemixMenu(post: Post, router: Pick<Router, 'push'>): void {
  if (!canRemixVideoPost(post)) return;

  const go = (key: VideoRemixRouteKey) => pushVideoRemixRoute(router, post, key);

  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ['Use sound', 'Duet', 'Stitch', 'B-roll', 'Full editor', 'Cancel'],
        cancelButtonIndex: 5,
        title: 'Remix video',
      },
      (i) => {
        const keys: VideoRemixRouteKey[] = ['useSound', 'duet', 'stitch', 'stitchBroll', 'composer'];
        const picked = keys[i];
        if (picked) go(picked);
      },
    );
    return;
  }

  Alert.alert('Remix video', undefined, [
    { text: 'Use sound', onPress: () => go('useSound') },
    { text: 'Duet', onPress: () => go('duet') },
    { text: 'Stitch', onPress: () => go('stitch') },
    { text: 'B-roll', onPress: () => go('stitchBroll') },
    { text: 'Full editor', onPress: () => go('composer') },
    { text: 'Cancel', style: 'cancel' },
  ]);
}
