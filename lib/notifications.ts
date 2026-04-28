import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { supabase } from './supabase';
import { router } from 'expo-router';
import Constants from 'expo-constants';

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

  Notifications.setNotificationChannelAsync('jobs', {
    name: 'Jobs',
    description: 'Job alerts and application updates',
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: '#D4A63A',
  });

  Notifications.setNotificationChannelAsync('default', {
    name: 'General',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#1E4ED8',
  });
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
  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });

  return tokenData.data;
}

export async function savePushToken(userId: string, token: string) {
  try {
    await supabase.from('profiles').update({
      push_token: token,
      push_token_updated_at: new Date().toISOString(),
    } as any).eq('id', userId);
  } catch {}
}

export async function clearPushToken(userId: string) {
  try {
    await supabase.from('profiles').update({
      push_token: null,
    } as any).eq('id', userId);
  } catch {}
}

export async function initPushNotifications(userId: string) {
  const token = await registerForPushNotifications();
  if (token) {
    await savePushToken(userId, token);
  }

  const cleanup = addNotificationListeners({
    onTapped: (response) => {
      const data = response.notification.request.content.data;
      if (data?.postId) {
        router.push(`/post/${data.postId}`);
      } else if (data?.chatId) {
        router.push(`/messages/${data.chatId}`);
      } else if (data?.profileId) {
        router.push(`/profile/${data.profileId}`);
      } else if (data?.jobId) {
        router.push(`/jobs/${data.jobId}`);
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
