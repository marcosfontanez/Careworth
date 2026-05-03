import { router } from 'expo-router';
import * as Linking from 'expo-linking';

export function parseAndNavigate(url: string) {
  try {
    const parsed = Linking.parse(url);
    const path = (parsed.path ?? '').replace(/^\/+/, '').split('?')[0];

    // e.g. pulseverse:/// with no path — do not navigate (avoids Unmatched Route noise).
    if (!path) return false;

    /** `https://pulseverse.app/communities/:slug/thread/:id` (see shareCircleThread) */
    if (path.startsWith('communities/')) {
      const segments = path.slice('communities/'.length).split('/').filter(Boolean);
      if (segments.length >= 3 && segments[1] === 'thread' && segments[2]) {
        const slug = decodeURIComponent(segments[0]);
        const threadId = decodeURIComponent(segments[2]);
        router.push(`/communities/${slug}/thread/${threadId}` as any);
        return true;
      }
      if (segments.length === 1 && segments[0]) {
        router.push(`/communities/${decodeURIComponent(segments[0])}` as any);
        return true;
      }
    }

    if (path === 'my-pulse' || path.startsWith('my-pulse/')) {
      router.push('/(tabs)/my-pulse' as any);
      return true;
    }

    if (path.startsWith('post/')) {
      const postId = path.replace('post/', '').split('/')[0];
      router.push(`/post/${postId}` as any);
      return true;
    }

    if (path.startsWith('profile/')) {
      const userId = path.replace('profile/', '');
      router.push(`/profile/${userId}`);
      return true;
    }

    if (path.startsWith('job/')) {
      const jobId = path.replace('job/', '');
      router.push(`/jobs/${jobId}`);
      return true;
    }

    if (path.startsWith('community/')) {
      const slug = path.replace('community/', '');
      router.push(`/communities/${slug}`);
      return true;
    }

    if (path.startsWith('chat/')) {
      const conversationId = path.replace('chat/', '');
      router.push(`/messages/${conversationId}`);
      return true;
    }
  } catch {}

  return false;
}

export function setupDeepLinkHandler() {
  const subscription = Linking.addEventListener('url', ({ url }) => {
    parseAndNavigate(url);
  });

  Linking.getInitialURL().then((url) => {
    if (url) parseAndNavigate(url);
  });

  return () => subscription.remove();
}
