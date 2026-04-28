import * as jose from 'jose';

const encoder = new TextEncoder();

let cachedJwks: ReturnType<typeof jose.createRemoteJWKSet> | null = null;
let cachedJwksUrl: string | null = null;

function getJwks(): ReturnType<typeof jose.createRemoteJWKSet> | null {
  const supabaseUrl = process.env.SUPABASE_URL?.trim().replace(/\/$/, '');
  if (!supabaseUrl) return null;
  const url = `${supabaseUrl}/auth/v1/.well-known/jwks.json`;
  if (cachedJwks && cachedJwksUrl === url) return cachedJwks;
  cachedJwks = jose.createRemoteJWKSet(new URL(url));
  cachedJwksUrl = url;
  return cachedJwks;
}

function decodeHeader(token: string): { alg?: string; kid?: string } {
  try {
    return jose.decodeProtectedHeader(token) as { alg?: string; kid?: string };
  } catch {
    return {};
  }
}

export async function verifySupabaseJwt(authHeader: string | undefined): Promise<{ sub: string }> {
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthError(401, 'Missing bearer token');
  }
  const token = authHeader.slice(7).trim();
  const header = decodeHeader(token);
  const alg = header.alg ?? 'HS256';

  try {
    let payload: jose.JWTPayload;

    if (alg === 'HS256') {
      const secret = process.env.SUPABASE_JWT_SECRET?.trim();
      if (!secret) {
        throw new AuthError(500, 'SUPABASE_JWT_SECRET not configured for HS256 token');
      }
      ({ payload } = await jose.jwtVerify(token, encoder.encode(secret), {
        algorithms: ['HS256'],
      }));
    } else {
      const jwks = getJwks();
      if (!jwks) {
        throw new AuthError(500, 'SUPABASE_URL not configured for asymmetric JWT verification');
      }
      ({ payload } = await jose.jwtVerify(token, jwks, {
        algorithms: ['RS256', 'ES256', 'EdDSA'],
      }));
    }

    const sub = typeof payload.sub === 'string' ? payload.sub : null;
    if (!sub) throw new AuthError(401, 'Invalid token (no subject)');
    return { sub };
  } catch (e) {
    if (e instanceof AuthError) throw e;
    const reason = e instanceof Error ? e.message : 'unknown';
    console.warn(`[auth] verify failed alg=${alg} kid=${header.kid ?? 'none'}: ${reason}`);
    throw new AuthError(401, `Invalid or expired token (alg=${alg})`);
  }
}

export class AuthError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}
