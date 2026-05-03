// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

/**
 * Placeholder: wire OPENAI_API_KEY (or similar) and accept uploaded audio/video URL.
 * Client currently calls with { stub: true } — returns guidance until keys exist.
 */
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    });
  }
  try {
    const key = Deno.env.get('OPENAI_API_KEY');
    if (!key) {
      return new Response(
        JSON.stringify({
          text: '',
          message: 'Transcription not configured. Add OPENAI_API_KEY to this function.',
        }),
        { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } },
      );
    }
    return new Response(
      JSON.stringify({
        text: '',
        message:
          'OPENAI_API_KEY present — next step: upload short audio extract from client and call Whisper here.',
      }),
      { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ text: '', message: String(e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
