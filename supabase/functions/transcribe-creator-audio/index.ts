// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

import { edgeCorsHeaders } from '../_shared/edgeCors.ts';

const transcribeCors = () =>
  edgeCorsHeaders({
    'Access-Control-Allow-Headers': 'authorization, content-type',
  });

const jsonHeaders = () => ({
  'Content-Type': 'application/json',
  ...transcribeCors(),
});

/**
 * Placeholder: wire OPENAI_API_KEY (or similar) and accept uploaded audio/video URL.
 * Client currently calls with { stub: true } — returns guidance until keys exist.
 */
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: transcribeCors() });
  }
  try {
    const key = Deno.env.get('OPENAI_API_KEY');
    if (!key) {
      return new Response(
        JSON.stringify({
          text: '',
          message: 'Transcription not configured. Add OPENAI_API_KEY to this function.',
        }),
        { headers: jsonHeaders() },
      );
    }
    return new Response(
      JSON.stringify({
        text: '',
        message:
          'OPENAI_API_KEY present — next step: upload short audio extract from client and call Whisper here.',
      }),
      { headers: jsonHeaders() },
    );
  } catch (e) {
    return new Response(JSON.stringify({ text: '', message: String(e) }), {
      status: 500,
      headers: jsonHeaders(),
    });
  }
});
