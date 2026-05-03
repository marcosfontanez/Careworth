import React, { useCallback, useMemo } from 'react';
import { Linking, Text, type StyleProp, type TextStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/theme';
import { parseAndNavigate } from '@/lib/deepLink';
import { parseCommentRichSegments } from '@/lib/commentRichSegments';

interface Props {
  text: string;
  style?: StyleProp<TextStyle>;
  mentionStyle?: StyleProp<TextStyle>;
  linkStyle?: StyleProp<TextStyle>;
  numberOfLines?: number;
  /** When false, @handles are not tappable (e.g. anonymous circles). */
  mentionsInteractive?: boolean;
  /** When false, links render as plain text (same style as body). */
  linksInteractive?: boolean;
}

export function CommentRichText({
  text,
  style,
  mentionStyle,
  linkStyle,
  numberOfLines,
  mentionsInteractive = true,
  linksInteractive = true,
}: Props) {
  const router = useRouter();
  const segments = useMemo(() => parseCommentRichSegments(text ?? ''), [text]);

  const onMention = useCallback(
    (handle: string) => {
      router.push(`/profile/u/${encodeURIComponent(handle)}` as any);
    },
    [router],
  );

  const onLink = useCallback((url: string) => {
    if (!parseAndNavigate(url)) {
      void Linking.openURL(url).catch(() => {});
    }
  }, []);

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {segments.map((seg, i) => {
        if (seg.type === 'text') {
          return <Text key={i}>{seg.value}</Text>;
        }
        if (seg.type === 'mention') {
          if (mentionsInteractive) {
            return (
              <Text
                key={i}
                onPress={() => onMention(seg.handle)}
                style={[{ color: colors.primary.teal, fontWeight: '700' }, mentionStyle]}
              >
                @{seg.handle}
              </Text>
            );
          }
          return (
            <Text
              key={i}
              style={[{ color: colors.dark.textSecondary, fontWeight: '600' }, mentionStyle]}
            >
              @{seg.handle}
            </Text>
          );
        }
        if (linksInteractive) {
          return (
            <Text
              key={i}
              onPress={() => onLink(seg.url)}
              style={[
                {
                  color: colors.primary.royal,
                  fontWeight: '700',
                  textDecorationLine: 'underline',
                },
                linkStyle,
              ]}
            >
              {seg.display}
            </Text>
          );
        }
        return (
          <Text key={i} style={linkStyle}>
            {seg.display}
          </Text>
        );
      })}
    </Text>
  );
}
