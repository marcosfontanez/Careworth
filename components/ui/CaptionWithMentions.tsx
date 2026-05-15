import React from 'react';
import { type StyleProp, type TextStyle } from 'react-native';
import { CommentRichText } from '@/components/ui/CommentRichText';

interface Props {
  text: string;
  style?: StyleProp<TextStyle>;
  mentionStyle?: StyleProp<TextStyle>;
  /** Style for tappable PulseVerse URLs in captions (see `CommentRichText`). */
  linkStyle?: StyleProp<TextStyle>;
  numberOfLines?: number;
  /** When false, @handles are not tappable (e.g. anonymous posts — avoid profile deep links). */
  mentionsInteractive?: boolean;
  /** When false, in-app PulseVerse URLs render as plain text (no `parseAndNavigate` / browser). */
  linksInteractive?: boolean;
}

/**
 * Caption body with @mentions and the same PulseVerse URL handling as comments
 * (`parseCommentRichSegments` → `parseAndNavigate` → `openWebUrlSafely` only as fallback).
 */
export function CaptionWithMentions({
  text,
  style,
  mentionStyle,
  linkStyle,
  numberOfLines,
  mentionsInteractive = true,
  linksInteractive = true,
}: Props) {
  return (
    <CommentRichText
      text={text}
      style={style}
      mentionStyle={mentionStyle}
      linkStyle={linkStyle}
      numberOfLines={numberOfLines}
      mentionsInteractive={mentionsInteractive}
      linksInteractive={linksInteractive}
    />
  );
}
