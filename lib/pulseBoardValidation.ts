/** Max characters for a Pulse Board visitor shoutout (V1 text-only). */
export const PULSE_BOARD_SHOUTOUT_MAX_LENGTH = 160;

const LINK_PATTERN = /https?:\/\/|www\./i;

export function sanitizePulseBoardBody(raw: string): string {
  return raw.trim();
}

export function validatePulseBoardBody(
  body: string,
): { ok: true; body: string } | { ok: false; message: string } {
  const trimmed = sanitizePulseBoardBody(body);
  if (!trimmed) {
    return { ok: false, message: 'Write a quick shoutout first.' };
  }
  if (trimmed.length > PULSE_BOARD_SHOUTOUT_MAX_LENGTH) {
    return {
      ok: false,
      message: `Keep it under ${PULSE_BOARD_SHOUTOUT_MAX_LENGTH} characters.`,
    };
  }
  if (LINK_PATTERN.test(trimmed)) {
    return { ok: false, message: 'Links are not allowed in shoutouts yet.' };
  }
  return { ok: true, body: trimmed };
}
