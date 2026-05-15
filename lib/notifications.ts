import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { supabase } from './supabase';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { parseAndNavigate } from './deepLink';
import { queryClient } from './queryClient';
import { commentKeys, postKeys } from './queryKeys';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('messages', {
    name: 'Messages',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#1E4ED8',
    sound: 'default',
  });

  Notifications.setNotificationChannelAsync('social', {
    name: 'Social',
    description: 'Likes, comments, and follows',
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: '#14B8A6',
  });

  Notifications.setNotificationChannelAsync('default', {
    name: 'General',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#1E4ED8',
  });
}

/** Expo push service occasionally returns 503 / connection timeouts — retry briefly, then fail soft (no throw). */
function isTransientExpoPushError(message: string): boolean {
  return /503|502|504|timeout|upstream connect|disconnect\/reset|ECONNRESET|network request failed/i.test(
    message,
  );
}

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  if (!Device.isDevice) {
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  const maxAttempts = 4;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      return tokenData.data;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const retry = isTransientExpoPushError(msg) && attempt < maxAttempts;
      if (retry) {
        await sleep(400 * 2 ** (attempt - 1));
        continue;
      }
      if (__DEV__) {
        console.warn('[PulseVerse] Expo push token unavailable (remote pushes disabled until next launch):', msg);
      }
      return null;
    }
  }

  return null;
}

export async function savePushToken(userId: string, token: string) {
  try {
    await supabase.from('profiles').update({
      push_token: token,
      push_token_updated_at: new Date().toISOString(),
    }).eq('id', userId);
  } catch {}
}

export async function clearPushToken(userId: string) {
  try {
    await supabase.from('profiles').update({
      push_token: null,
    }).eq('id', userId);
  } catch {}
}

export async function initPushNotifications(userId: string) {
  let token: string | null = null;
  try {
    token = await registerForPushNotifications();
  } catch {
    token = null;
  }
  if (token) {
    await savePushToken(userId, token);
  } else if (__DEV__ && Device.isDevice) {
    /** Permission denied, missing EAS projectId, or simulator — bell still works from DB. */
    console.warn(
      '[PulseVerse] No push token; in-app notifications only until you grant alerts on a device build. ' +
        'For remote pushes, wire a Database Webhook on public.notifications INSERT → notify-expo-push (see supabase/functions/notify-expo-push/README.md).',
    );
  }

  const cleanup = addNotificationListeners({
    onTapped: (response) => {
      const data = response.notification.request.content.data as
        | {
            postId?: string;
            chatId?: string;
            profileId?: string;
            circleSlug?: string;
            threadId?: string;
            url?: string;
          }
        | undefined;
      if (data?.postId) {
        /**
         * Invalidate the comments + post caches BEFORE navigating so the
         * thread the user is about to land on always refetches. Without
         * this, a previously-cached "no comments yet" snapshot survives
         * across the navigation and the user sees an empty thread even
         * though the notification proves a new comment exists.
         */
        queryClient.invalidateQueries({ queryKey: commentKeys.byPostPrefix(data.postId) });
        queryClient.invalidateQueries({ queryKey: postKeys.byId(data.postId) });
        router.push(`/post/${data.postId}`);
      } else if (data?.circleSlug && data?.threadId) {
        router.push(`/communities/${data.circleSlug}/thread/${data.threadId}` as any);
      } else if (typeof data?.url === 'string' && parseAndNavigate(data.url)) {
        return;
      } else if (data?.chatId) {
        router.push(`/messages/${data.chatId}`);
      } else if (data?.profileId) {
        router.push(`/profile/${data.profileId}`);
      } else {
        router.push('/notifications');
      }
    },
  });

  return cleanup;
}

export function addNotificationListeners(handlers: {
  onReceived?: (notification: Notifications.Notification) => void;
  onTapped?: (response: Notifications.NotificationResponse) => void;
}) {
  const subscriptions: Notifications.Subscription[] = [];

  if (handlers.onReceived) {
    subscriptions.push(
      Notifications.addNotificationReceivedListener(handlers.onReceived)
    );
  }

  if (handlers.onTapped) {
    subscriptions.push(
      Notifications.addNotificationResponseReceivedListener(handlers.onTapped)
    );
  }

  return () => subscriptions.forEach((s) => s.remove());
}

export async function sendLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>,
  channelId = 'default'
) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      ...(Platform.OS === 'android' ? { channelId } : {}),
    },
    trigger: null,
  });
}

export async function getBadgeCount(): Promise<number> {
  return Notifications.getBadgeCountAsync();
}

export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}
