/** Demo / founder-preview streams served by `liveHubService` (no `live_streams` row). */
export function isDemoLiveStreamId(id: string | undefined | null): boolean {
  return typeof id === 'string' && id.startsWith('demo-live-');
}
