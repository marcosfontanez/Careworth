/** In-app + push notification types that open a Live room. */
export const LIVE_ROOM_NOTIFICATION_TYPES = ['live_go_live', 'live_stream_live'] as const;

export type LiveRoomNotificationType = (typeof LIVE_ROOM_NOTIFICATION_TYPES)[number];

export function isLiveRoomNotificationType(type: string): type is LiveRoomNotificationType {
  return (LIVE_ROOM_NOTIFICATION_TYPES as readonly string[]).includes(type);
}

export function liveNotificationStreamId(input: {
  type: string;
  targetId?: string | null;
}): string | null {
  if (!isLiveRoomNotificationType(input.type)) return null;
  const id = input.targetId?.trim();
  return id || null;
}
