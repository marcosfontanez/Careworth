import { supabase } from '@/lib/supabase';

export type LiveKitMintRole = 'host' | 'viewer';

export interface LiveKitMintResponse {
  token: string;
  serverUrl: string;
  roomName: string;
  participantIdentity: string;
  role: LiveKitMintRole;
  streamId: string;
  videoProvider?: string;
  expiresAt: number;
}

/**
 * Mints a LiveKit participant JWT via Supabase Edge (`livekit-token`).
 * Role is determined server-side from `live_streams.host_id` vs caller.
 */
export async function mintLiveKitCredentials(streamId: string): Promise<LiveKitMintResponse | null> {
  if (!streamId.trim()) return null;

  const { data, error } = await supabase.functions.invoke<LiveKitMintResponse>('livekit-token', {
    body: { streamId: streamId.trim() },
  });

  if (error) {
    if (__DEV__) console.warn('[liveKitToken]', error.message);
    return null;
  }

  if (!data?.token || !data.serverUrl || !data.roomName) {
    if (__DEV__) console.warn('[liveKitToken] incomplete payload');
    return null;
  }

  return data;
}
