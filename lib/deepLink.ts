import { router } from 'expo-router';
import * as Linking from 'expo-linking';

export function parseAndNavigate(url: string) {
  try {
    const parsed = Linking.parse(url);
    const path = (parsed.path ?? '').replace(/^\/+/, '');
    const params = parsed.queryParams ?? {};

    // e.g. pulseverse:/// with no path — do not navigate (avoids Unmatched Route noise).
    if (!path) return false;

    if (path.startsWith('post/')) {
      const postId = path.replace('post/', '');
      router.push(`/comments/${postId}`);
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
