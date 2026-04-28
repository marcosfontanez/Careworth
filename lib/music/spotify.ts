import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import { SPOTIFY_ACCESS_KEY, SPOTIFY_REFRESH_KEY, SPOTIFY_EXPIRES_KEY } from './storage';
import type { TokenResponse } from 'expo-auth-session';

const SPOTIFY_CLIENT_ID = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID ?? '';

const discovery: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

export function getSpotifyRedirectUri(): string {
  return AuthSession.makeRedirectUri({
    scheme: 'pulseverse',
    path: 'spotify',
  });
}

export function isSpotifyConfigured(): boolean {
  return Boolean(SPOTIFY_CLIENT_ID?.trim());
}

async function persistTokenResponse(tr: TokenResponse) {
  await SecureStore.setItemAsync(SPOTIFY_ACCESS_KEY, tr.accessToken);
  if (tr.refreshToken) {
    await SecureStore.setItemAsync(SPOTIFY_REFRESH_KEY, tr.refreshToken);
  }
  const expMs = Date.now() + (tr.expiresIn ?? 3600) * 1000 - 60_000;
  await SecureStore.setItemAsync(SPOTIFY_EXPIRES_KEY, String(expMs));
}

export async function clearSpotifySession() {
  await SecureStore.deleteItemAsync(SPOTIFY_ACCESS_KEY);
  await SecureStore.deleteItemAsync(SPOTIFY_REFRESH_KEY);
  await SecureStore.deleteItemAsync(SPOTIFY_EXPIRES_KEY);
}

export async function hasSpotifySession(): Promise<boolean> {
  const refresh = await SecureStore.getItemAsync(SPOTIFY_REFRESH_KEY);
  const access = await SecureStore.getItemAsync(SPOTIFY_ACCESS_KEY);
  return Boolean(refresh || access);
}

async function getValidAccessToken(): Promise<string | null> {
  if (!SPOTIFY_CLIENT_ID) return null;

  const expStr = await SecureStore.getItemAsync(SPOTIFY_EXPIRES_KEY);
  const expiresAt = expStr ? parseInt(expStr, 10) : 0;
  const access = await SecureStore.getItemAsync(SPOTIFY_ACCESS_KEY);
  const refresh = await SecureStore.getItemAsync(SPOTIFY_REFRESH_KEY);

  if (access && expiresAt > Date.now()) {
    return access;
  }

  if (!refresh) return null;

  try {
    const tr = await AuthSession.refreshAsync(
      {
        clientId: SPOTIFY_CLIENT_ID,
        refreshToken: refresh,
      },
      discovery,
    );
    await persistTokenResponse(tr);
    return tr.accessToken;
  } catch {
    await clearSpotifySession();
    return null;
  }
}

/**
 * Opens Spotify login (PKCE). Add redirect URI in Spotify Dashboard:
 * - `pulseverse://spotify` (dev build / production)
 * - Expo Go: copy URI from __DEV__ log or use `npx uri-scheme list`
 */
export async function connectSpotify(): Promise<{ ok: boolean; error?: string }> {
  if (!SPOTIFY_CLIENT_ID) {
    return { ok: false, error: 'Spotify is not configured (missing EXPO_PUBLIC_SPOTIFY_CLIENT_ID).' };
  }

  const redirectUri = getSpotifyRedirectUri();

  const request = new AuthSession.AuthRequest({
    clientId: SPOTIFY_CLIENT_ID,
    scopes: ['user-read-currently-playing', 'user-read-playback-state'],
    redirectUri,
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
  });

  const result = await request.promptAsync(discovery);

  if (result.type !== 'success' || !('params' in result) || !result.params.code) {
    if (result.type === 'dismiss') return { ok: false, error: 'Cancelled' };
    return { ok: false, error: 'Authorization failed' };
  }

  const codeVerifier = request.codeVerifier;
  if (!codeVerifier) {
    return { ok: false, error: 'PKCE verifier missing' };
  }

  try {
    const tokenResponse = await AuthSession.exchangeCodeAsync(
      {
        clientId: SPOTIFY_CLIENT_ID,
        code: result.params.code,
        redirectUri,
        extraParams: {
          code_verifier: codeVerifier,
        },
      },
      discovery,
    );
    await persistTokenResponse(tokenResponse);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'Token exchange failed' };
  }
}

export type SpotifyNowPlaying = {
  title: string;
  artist: string;
  spotifyUrl: string | null;
};

export async function getSpotifyNowPlaying(): Promise<SpotifyNowPlaying | null> {
  const token = await getValidAccessToken();
  if (!token) return null;

  const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401) {
    await clearSpotifySession();
    return null;
  }

  if (res.status === 204) {
    return null;
  }

  if (!res.ok) {
    return null;
  }

  const data = (await res.json()) as {
    item?: {
      name?: string;
      artists?: { name: string }[];
      external_urls?: { spotify?: string };
    };
  };

  const item = data.item;
  if (!item) return null;

  const title = item.name ?? '';
  const artist = item.artists?.map((a) => a.name).filter(Boolean).join(', ') ?? '';
  const spotifyUrl = item.external_urls?.spotify ?? null;

  if (!title && !artist) return null;

  return { title, artist, spotifyUrl };
}

export async function disconnectSpotify() {
  await clearSpotifySession();
}
