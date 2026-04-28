import React, { useMemo, useCallback } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/theme';

type Segment = { type: 'text'; value: string } | { type: 'mention'; handle: string };

function parseCaption(text: string): Segment[] {
  if (!text) return [];
  const re = /@([a-zA-Z0-9_.]+)/g;
  const out: Segment[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ type: 'text', value: text.slice(last, m.index) });
    out.push({ type: 'mention', handle: m[1].toLowerCase() });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ type: 'text', value: text.slice(last) });
  return out.length ? out : [{ type: 'text', value: text }];
}

interface Props {
  text: string;
  style?: StyleProp<TextStyle>;
  mentionStyle?: StyleProp<TextStyle>;
  numberOfLines?: number;
  /** When false, @handles are not tappable (e.g. anonymous posts — avoid profile deep links). */
  mentionsInteractive?: boolean;
}

export function CaptionWithMentions({
  text,
  style,
  mentionStyle,
  numberOfLines,
  mentionsInteractive = true,
}: Props) {
  const router = useRouter();
  const segments = useMemo(() => parseCaption(text), [text]);

  const onMention = useCallback(
    (handle: string) => {
      router.push(`/profile/u/${encodeURIComponent(handle)}` as any);
    },
    [router],
  );

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {segments.map((seg, i) =>
        seg.type === 'text' ? (
          <Text key={i}>{seg.value}</Text>
        ) : mentionsInteractive ? (
          <Text
            key={i}
            onPress={() => onMention(seg.handle)}
            style={[{ color: colors.primary.teal, fontWeight: '700' }, mentionStyle]}
          >
            @{seg.handle}
          </Text>
        ) : (
          <Text key={i} style={[{ color: colors.dark.textSecondary, fontWeight: '600' }, mentionStyle]}>
            @{seg.handle}
          </Text>
        ),
      )}
    </Text>
  );
}
