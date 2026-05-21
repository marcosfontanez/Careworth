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
async function edgeFunctionErrorMessage(error: { message: string; context?: Response }): Promise<string> {
  try {
    const ctx = error.context;
    if (ctx && typeof ctx.json === 'function') {
      const body = (await ctx.json()) as { error?: string };
      if (typeof body?.error === 'string' && body.error.trim()) return body.error.trim();
    }
  } catch {
    // Fall back to generic invoke error text.
  }
  return error.message || 'Could not connect to live video';
}

export async function mintLiveKitCredentials(streamId: string): Promise<LiveKitMintResponse | null> {
  if (!streamId.trim()) return null;

  const { data, error } = await supabase.functions.invoke<LiveKitMintResponse>('livekit-token', {
    body: { streamId: streamId.trim() },
  });

  if (error) {
    const detail = await edgeFunctionErrorMessage(error);
    if (__DEV__) console.warn('[liveKitToken]', detail);
    throw new Error(detail);
  }

  if (!data?.token || !data.serverUrl || !data.roomName) {
    if (__DEV__) console.warn('[liveKitToken] incomplete payload');
    throw new Error('Live video session incomplete — try again');
  }

  return data;
}
