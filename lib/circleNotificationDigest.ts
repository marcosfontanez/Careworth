/** Mirrors SQL {@link format_circle_digest_message} for tests + app copy. */
export function formatCircleDigestMessage(args: {
  postCount: number;
  communityName?: string | null;
  isConfessions: boolean;
}): string {
  const count = Math.max(1, Math.floor(args.postCount));
  const name = args.communityName?.trim() || 'a circle you joined';

  if (args.isConfessions) {
    if (count <= 1) return 'New activity in Confessions';
    return `${count} new posts in Confessions`;
  }

  if (count <= 1) return `New post in ${name}`;
  return `${count} new posts in ${name}`;
}

export function isCirclePostDigestType(type: string): boolean {
  return type === 'circle_post_digest';
}

/** Digest rows route to the Circle room — not a profile or single post. */
export function circleDigestNotificationHasActorProfile(type: string): boolean {
  return !isCirclePostDigestType(type);
}
