/**
 * Anonymous-mode helpers. We can't run face/voice ML on-device today, so this
 * module is the consent + flag layer:
 *  - Sets the post's `is_anonymous` true
 *  - Strips creator-identifying signals from the composed caption (handle, name)
 *  - Surfaces an explicit checklist so the creator confirms what was hidden
 *
 * When we add face-blur (vision) and voice-pitch (audio) later, the gate is
 * already here; they plug into `anonymousChecklist` and `prepareAnonymousCaption`.
 */

export interface AnonymousChecklistItem {
  id: string;
  label: string;
  /** Whether the system can enforce this automatically today. */
  automated: boolean;
  done: boolean;
}

export function defaultAnonymousChecklist(): AnonymousChecklistItem[] {
  return [
    { id: 'username', label: 'Hide my @handle and display name', automated: true, done: true },
    {
      id: 'metadata',
      label: 'Strip image EXIF / location metadata on upload (re-encoded JPEG)',
      automated: true,
      done: true,
    },
    {
      id: 'face',
      label: 'No identifiable faces — use Strong blur on preview or edit externally',
      automated: false,
      done: false,
    },
    {
      id: 'voice',
      label: 'Voice not recognizable (edit audio externally; server pitch-shift planned)',
      automated: false,
      done: false,
    },
    { id: 'location', label: "Don't mention specific hospital, unit, or city", automated: false, done: false },
  ];
}

export interface AnonymousPrepareResult {
  caption: string;
  hashtags: string[];
}

export function prepareAnonymousCaption(
  caption: string,
  hashtags: string[],
  displayName: string | null | undefined,
  username: string | null | undefined,
): AnonymousPrepareResult {
  let next = caption;
  if (displayName) {
    const re = new RegExp(`\\b${escapeRegExp(displayName)}\\b`, 'gi');
    next = next.replace(re, '[redacted]');
  }
  if (username) {
    const re = new RegExp(`@${escapeRegExp(username)}\\b`, 'gi');
    next = next.replace(re, '[redacted]');
  }
  const cleanedTags = hashtags.filter((h) => {
    const lower = h.toLowerCase();
    if (username && lower.includes(username.toLowerCase())) return false;
    return true;
  });
  return { caption: next, hashtags: cleanedTags };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
