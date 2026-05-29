import { isDemoLiveStreamId } from '@/lib/liveDemoStreams';
import { filterActiveLiveStreams } from '@/lib/live/activeLiveStreams';
import type { LiveStream } from '@/types';

type FeedLiveRow = Pick<
  LiveStream,
  'id' | 'status' | 'endedAt' | 'broadcastStartedAt' | 'hostLastSeenAt' | 'startedAt'
>;

/** Active real broadcasts for Feed injection — excludes demo-live-* preview rows. */
export function filterFeedLiveStreams<T extends FeedLiveRow>(streams: T[]): T[] {
  return filterActiveLiveStreams(streams).filter((stream) => !isDemoLiveStreamId(stream.id));
}
