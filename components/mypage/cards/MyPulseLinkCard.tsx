import React, { useCallback } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius } from '@/theme';
import { relativeMyPulse } from '@/utils/format';
import type { ProfileUpdate } from '@/types';
import { MyPulseCardShell } from './MyPulseCardShell';
import { CaptionWithMentions } from '@/components/ui/CaptionWithMentions';

interface Props {
  update: ProfileUpdate;
  onDelete?: () => Promise<void> | void;
  readOnly?: boolean;
  onPress?: () => void;
  onLike?: () => void;
  onComment?: () => void;
  /** Owner-only pin toggle forwarded to the shared shell menu. */
  onTogglePin?: () => Promise<void> | void;
  onEdit?: (nextContent: string) => Promise<void>;
  editContent?: string;
  wasEdited?: boolean;
}

const LINK_ACCENT = '#C084FC';

function extractDomain(raw?: string): string | undefined {
  const url = raw?.trim();
  if (!url) return undefined;
  try {
    const href = url.startsWith('http') ? url : `https://${url}`;
    const u = new URL(href);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/^https?:\/\//i, '').split('/')[0];
  }
}

/**
 * Link = an external URL with optional personal commentary. Hierarchy:
 *   1. Commentary (if present) — the user's take, styled as a pull-quote.
 *   2. Preview card — domain kicker → title → outbound affordance.
 */
export function MyPulseLinkCard({
  update: u,
  onDelete,
  onTogglePin,
  readOnly,
  onPress,
  onLike,
  onComment,
  onEdit,
  editContent,
  wasEdited,
}: Props) {
  const commentary = (u.content?.trim() || '').slice(0, 280);
  const previewTitle =
    u.previewText?.trim() || u.linkedDiscussionTitle?.trim() || 'External link';
  const domain = extractDomain(u.linkedUrl) ?? 'external.link';

  const openLink = useCallback(() => {
    if (onPress) {
      onPress();
      return;
    }
    const raw = u.linkedUrl?.trim();
    if (!raw) return;
    const href = raw.startsWith('http') ? raw : `https://${raw}`;
    Linking.openURL(href).catch(() => undefined);
  }, [onPress, u.linkedUrl]);

  return (
    <MyPulseCardShell
      displayType="link"
      timeLabel={relativeMyPulse(u.createdAt)}
      onPress={openLink}
      onDelete={onDelete}
      readOnly={readOnly}
      onLike={onLike}
      onComment={onComment}
      shareMessage={`${commentary || previewTitle}${u.linkedUrl ? `\n${u.linkedUrl}` : ''}`}
      liked={u.liked === true}
      likeCount={u.likeCount ?? 0}
      commentCount={u.commentCount ?? 0}
      isPinned={u.isPinned}
      onTogglePin={onTogglePin}
      onEdit={onEdit}
      editContent={editContent}
      wasEdited={wasEdited}
    >
      {commentary ? (
        <View style={styles.commentaryWrap}>
          <View style={styles.quoteBar} />
          <CaptionWithMentions
            text={commentary}
            style={styles.commentary}
            numberOfLines={3}
          />
        </View>
      ) : null}

      <View style={styles.linkBox}>
        <View style={styles.linkIconWrap}>
          {u.mediaThumb ? (
            <ExpoImage
              source={{ uri: u.mediaThumb }}
              style={styles.favicon}
              contentFit="cover"
            />
          ) : (
            <Ionicons name="link" size={16} color={LINK_ACCENT} />
          )}
        </View>

        <View style={styles.linkMeta}>
          <Text style={styles.linkDomain} numberOfLines={1}>
            {domain}
          </Text>
          <Text style={styles.linkTitle} numberOfLines={2}>
            {previewTitle}
          </Text>
        </View>

        <View style={styles.openChip}>
          <Ionicons name="arrow-forward" size={14} color={LINK_ACCENT} />
        </View>
      </View>
    </MyPulseCardShell>
  );
}

const styles = StyleSheet.create({
  commentaryWrap: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  quoteBar: {
    width: 2,
    alignSelf: 'stretch',
    borderRadius: 1,
    backgroundColor: 'rgba(192,132,252,0.55)',
  },
  commentary: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.dark.text,
    fontWeight: '600',
    letterSpacing: -0.1,
    fontStyle: 'italic',
  },
  linkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(192,132,252,0.08)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(192,132,252,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  linkIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(192,132,252,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  favicon: {
    width: '100%',
    height: '100%',
  },
  linkMeta: {
    flex: 1,
    minWidth: 0,
  },
  linkDomain: {
    fontSize: 10,
    fontWeight: '800',
    color: LINK_ACCENT,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  linkTitle: {
    marginTop: 2,
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.dark.text,
    letterSpacing: -0.05,
    lineHeight: 18,
  },
  openChip: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(192,132,252,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(192,132,252,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
