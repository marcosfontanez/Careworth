// Deploy: npx supabase functions deploy apple-music-developer-token
// Secrets: APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_P8_KEY (see README.txt in functions folder)
import { SignJWT, importPKCS8 } from 'npm:jose@5';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const teamId = Deno.env.get('APPLE_TEAM_ID');
    const keyId = Deno.env.get('APPLE_KEY_ID');
    let p8 = Deno.env.get('APPLE_P8_KEY');

    if (!teamId || !keyId || !p8) {
      return json({ error: 'Apple Music is not configured on the server.' }, 503);
    }

    p8 = p8.replace(/\\n/g, '\n').trim();
    const key = await importPKCS8(p8, 'ES256');

    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'ES256', kid: keyId })
      .setIssuer(teamId)
      .setIssuedAt()
      .setExpirationTime('150d')
      .sign(key);

    return json({ token, expires_in: 12_960_000 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return json({ error: message }, 500);
  }
});
