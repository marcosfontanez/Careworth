import { describe, expect, it } from 'vitest';

import {
  isLiveRoomNotificationType,
  liveNotificationStreamId,
} from '@/lib/liveNotificationRouting';

describe('liveNotificationRouting', () => {
  it('recognizes live room notification types', () => {
    expect(isLiveRoomNotificationType('live_go_live')).toBe(true);
    expect(isLiveRoomNotificationType('live_stream_live')).toBe(true);
    expect(isLiveRoomNotificationType('comment')).toBe(false);
  });

  it('extracts stream id from target_id', () => {
    const streamId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    expect(
      liveNotificationStreamId({ type: 'live_go_live', targetId: streamId }),
    ).toBe(streamId);
    expect(liveNotificationStreamId({ type: 'like', targetId: streamId })).toBeNull();
    expect(liveNotificationStreamId({ type: 'live_go_live', targetId: '  ' })).toBeNull();
  });
});
