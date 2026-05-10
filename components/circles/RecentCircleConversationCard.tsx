import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { colors, borderRadius, typography } from '@/theme';
import { pulseImageListThumbProps } from '@/lib/pulseImage';
import { formatCount, timeAgo } from '@/utils/format';
import { isDemoCatalogMediaUrl } from '@/utils/postPreviewMedia';
import type { RecentCircleActivity } from '@/types';

type IonName = ComponentProps<typeof Ionicons>['name'];

type Props = {
  item: RecentCircleActivity;
  accent: string;
  onPress: () => void;
};

function listPreviewUri(url: string | undefined | null): string | undefined {
  const t = url?.trim();
  if (!t || isDemoCatalogMediaUrl(t)) return undefined;
  return t;
}

function PreviewLead({
  uri,
  accent,
  fallbackIcon,
}: {
  uri: string | undefined;
  accent: string;
  fallbackIcon: IonName;
}) {
  const show = Boolean(uri);
  return (
    <View style={[styles.leadWrap, { borderColor: accent + '44' }]}>
      {show ? (
        <Image source={{ uri: uri! }} style={styles.leadImage} contentFit="cover" {...pulseImageListThumbProps} />
      ) : (
        <Ionicons name={fallbackIcon} size={22} color={accent} />
      )}
    </View>
  );
}

export function RecentCircleConversationCard({ item, accent, onPress }: Props) {
  if (item.kind === 'thread') {
    const { thread, lastInvolvedAt } = item;
    const previewRaw = (thread.body ?? '').trim().slice(0, 100);
    const circleLabel = thread.circleName?.trim() || thread.circleSlug || 'Circle';
    const thumbUri = listPreviewUri(thread.mediaThumbUrl);
    return (
      <TouchableOpacity activeOpacity={0.88} onPress={onPress} style={styles.touch}>
        <View style={[styles.card, { borderColor: colors.dark.border }]}>
          <PreviewLead uri={thumbUri} accent={accent} fallbackIcon="chatbubbles-outline" />
          <View style={styles.body}>
            <Text style={styles.title} numberOfLines={2}>
              {thread.title}
            </Text>
            {previewRaw.length > 0 ? (
              <Text style={styles.preview} numberOfLines={1}>
                {previewRaw}
                {previewRaw.length >= 100 ? '…' : ''}
              </Text>
            ) : null}
            <View style={styles.metaRow}>
              <Text style={[styles.circle, { color: accent }]} numberOfLines={1}>
                {circleLabel}
              </Text>
              <Text style={styles.dot}>·</Text>
              <Text style={styles.meta}>
                {formatCount(thread.replyCount)} {thread.replyCount === 1 ? 'reply' : 'replies'}
              </Text>
              <Text style={styles.dot}>·</Text>
              <Text style={styles.time}>{timeAgo(lastInvolvedAt)}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={17} color={colors.dark.textMuted} />
        </View>
      </TouchableOpacity>
    );
  }

  const w = item;
  const circleLabel = w.communityName?.trim() || w.communitySlug || 'Circle';
  const previewTrim = w.preview.trim();
  const thumbUri = listPreviewUri(w.previewThumbUrl);
  return (
    <TouchableOpacity activeOpacity={0.88} onPress={onPress} style={styles.touch}>
      <View style={[styles.card, { borderColor: colors.dark.border }]}>
        <PreviewLead uri={thumbUri} accent={accent} fallbackIcon="images-outline" />
        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={2}>
            {w.title}
          </Text>
          {previewTrim.length > 0 && previewTrim !== w.title ? (
            <Text style={styles.preview} numberOfLines={1}>
              {previewTrim}
            </Text>
          ) : null}
          <View style={styles.metaRow}>
            <Text style={[styles.circle, { color: accent }]} numberOfLines={1}>
              {circleLabel}
            </Text>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.meta}>
              {formatCount(w.commentCount)} {w.commentCount === 1 ? 'comment' : 'comments'}
            </Text>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.time}>{timeAgo(w.lastInvolvedAt)}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={17} color={colors.dark.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touch: { borderRadius: borderRadius['2xl'] },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius['2xl'],
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 10,
    borderWidth: 1,
    backgroundColor: colors.dark.cardAlt,
  },
  leadWrap: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dark.bg,
    overflow: 'hidden',
  },
  leadImage: {
    width: '100%',
    height: '100%',
  },
  body: { flex: 1, minWidth: 0 },
  title: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '800',
    color: colors.dark.text,
    letterSpacing: -0.2,
  },
  preview: {
    fontSize: 12,
    color: colors.dark.textSecondary,
    marginTop: 4,
    lineHeight: 16,
    opacity: 0.9,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  circle: {
    fontSize: 11,
    fontWeight: '800',
    maxWidth: '46%',
  },
  dot: { fontSize: 11, color: colors.dark.textMuted, opacity: 0.7 },
  meta: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.dark.text,
  },
  time: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.dark.textMuted,
  },
});
