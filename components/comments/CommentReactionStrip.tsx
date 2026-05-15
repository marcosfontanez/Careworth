import React from 'react';
import { ReactionChainWithPicker } from '@/components/reactions/ReactionChainWithPicker';
import type { PostReactionCounts, PostReactionKind } from '@/types';

interface Props {
  counts: PostReactionCounts;
  viewerReaction: PostReactionKind | null;
  accentColor: string;
  onPick: (kind: PostReactionKind) => void;
}

export function CommentReactionStrip(props: Props) {
  return <ReactionChainWithPicker {...props} />;
}
