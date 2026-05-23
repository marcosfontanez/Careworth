const PREFIX = '[LiveInteraction]';

function log(phase: string, detail?: Record<string, unknown>) {
  if (!__DEV__) return;
  if (detail) console.log(`${PREFIX} ${phase}`, detail);
  else console.log(`${PREFIX} ${phase}`);
}

export const liveInteractionDebug = {
  chatSendRequested(streamId: string) {
    log('Chat send requested', { streamId });
  },
  chatSendOk(streamId: string) {
    log('Chat send ok', { streamId });
  },
  chatSendFailed(streamId: string, reason: string) {
    log('Chat send failed', { streamId, reason });
  },
  pollVoteRequested(pollId: string, optionId: string) {
    log('Poll vote requested', { pollId, optionId });
  },
  pollVoteOk(pollId: string) {
    log('Poll vote ok', { pollId });
  },
  pollVoteFailed(pollId: string, reason: string) {
    log('Poll vote failed', { pollId, reason });
  },
  giftSendRequested(streamId: string, giftId: string) {
    log('Gift send requested', { streamId, giftId });
  },
  giftSendOk(streamId: string, giftId: string) {
    log('Gift send ok', { streamId, giftId });
  },
  giftSendFailed(streamId: string, reason: string) {
    log('Gift send failed', { streamId, reason });
  },
};

export function mapLiveChatError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('not authenticated') || m.includes('jwt')) return 'not_authenticated';
  if (m.includes('42501') || m.includes('permission') || m.includes('policy') || m.includes('row-level security')) {
    return 'permission_denied';
  }
  if (m.includes('foreign key') || m.includes('violates')) return 'invalid_reference';
  return 'unknown';
}

export function friendlyLiveChatError(reason: string): string {
  switch (reason) {
    case 'not_authenticated':
      return 'Sign in to chat in live.';
    case 'permission_denied':
      return 'Chat is unavailable for this live.';
    case 'missing_profile':
      return 'Complete your profile before chatting in live.';
    case 'stream_not_live':
      return 'Chat opens once the host is broadcasting.';
    case 'empty_message':
      return 'Type a message first.';
    default:
      return 'Couldn\u2019t send message. Try again.';
  }
}

export function mapLiveGiftError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('insufficient') || m.includes('not_enough')) return 'insufficient_balance';
  if (m.includes('live_gift_unknown')) return 'gift_unknown';
  if (m.includes('stream_not_live') || m.includes('stream_not_broadcasting')) return 'stream_not_live';
  if (m.includes('self_gift')) return 'self_gift';
  if (m.includes('not_allowed') || m.includes('not_authenticated')) return 'not_authenticated';
  if (m.includes('42501') || m.includes('permission') || m.includes('policy')) return 'permission_denied';
  return 'unknown';
}

export function friendlyLiveGiftError(reason: string): string {
  switch (reason) {
    case 'insufficient_balance':
      return 'Not enough Sparks. Top up in Pulse Shop.';
    case 'gift_unknown':
      return 'That gift is unavailable right now.';
    case 'stream_not_live':
      return 'This stream is no longer accepting gifts.';
    case 'self_gift':
      return 'You can\u2019t send gifts to your own stream.';
    case 'not_authenticated':
      return 'Sign in to send gifts.';
    default:
      return 'Couldn\u2019t send gift. Try again.';
  }
}

export function friendlyLivePollError(reason?: string): string {
  switch (reason) {
    case 'already_voted':
      return 'You already voted on this poll.';
    case 'poll_not_active':
      return 'This poll has ended.';
    case 'not_authenticated':
      return 'Sign in to vote in polls.';
    case 'missing_fields':
      return 'Poll vote incomplete. Try again.';
    case 'option_mismatch':
      return 'Pick one option to vote.';
    default:
      return 'Couldn\u2019t record vote. Try again.';
  }
}

export const FALLBACK_GIFT_EMOJI = '🎁';
