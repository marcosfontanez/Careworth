import * as Linking from 'expo-linking';

export type RichSegment =
  | { type: 'text'; value: string }
  | { type: 'mention'; handle: string }
  | { type: 'link'; url: string; display: string };

const PULSE_URL_RE = /(https?:\/\/(?:www\.)?pulseverse\.app\/[^\s]+|pulseverse:\/\/[^\s]+)/gi;
const MENTION_RE = /@([a-zA-Z0-9_.]+)/g;

export function normalizePulseVerseUrlForNav(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  if (t.startsWith('pulseverse://')) return t;
  if (/^https?:\/\//i.test(t)) return t;
  if (/^pulseverse\.app\//i.test(t)) return `https://${t}`;
  return t;
}

function parseMentionsInChunk(text: string): RichSegment[] {
  if (!text) return [];
  const out: RichSegment[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(MENTION_RE.source, 'g');
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ type: 'text', value: text.slice(last, m.index) });
    out.push({ type: 'mention', handle: m[1].toLowerCase() });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ type: 'text', value: text.slice(last) });
  return out.length ? out : [{ type: 'text', value: text }];
}

function linkDisplayLabel(raw: string): string {
  const normalized = normalizePulseVerseUrlForNav(raw);
  try {
    const parsed = Linking.parse(normalized);
    let path = (parsed.path ?? '').replace(/^\/+/, '');
    const qs = parsed.queryParams
      ? '?' +
        Object.entries(parsed.queryParams)
          .map(([k, v]) => `${k}=${v}`)
          .join('&')
      : '';
    path = `${path}${qs}`;
    if (path.length > 42) return path.slice(0, 39) + '…';
    return path || 'Link';
  } catch {
    return 'Link';
  }
}

/**
 * Splits comment/thread text into plain runs, @mentions, and in-app PulseVerse URLs
 * so `CommentRichText` can render tappable profile + navigation targets.
 */
export function parseCommentRichSegments(text: string): RichSegment[] {
  if (!text) return [];
  const matches = [...text.matchAll(new RegExp(PULSE_URL_RE.source, 'gi'))];
  if (!matches.length) return parseMentionsInChunk(text);

  const out: RichSegment[] = [];
  let last = 0;
  for (const m of matches) {
    const idx = m.index ?? 0;
    if (idx > last) out.push(...parseMentionsInChunk(text.slice(last, idx)));
    const raw = m[0];
    out.push({
      type: 'link',
      url: normalizePulseVerseUrlForNav(raw),
      display: linkDisplayLabel(raw),
    });
    last = idx + raw.length;
  }
  if (last < text.length) out.push(...parseMentionsInChunk(text.slice(last)));
  return out;
}
