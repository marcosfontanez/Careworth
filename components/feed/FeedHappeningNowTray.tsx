import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LivePill } from '@/components/live/LivePill';
import { LiveViewerBadge } from '@/components/live/LiveViewerBadge';
import { feedCreatorHandleIdentityLine } from '@/lib/feedCreatorIdentityLine';
import { pulseColors, pulseRadius, pulseSpacing, pulseTypography } from '@/lib/theme/pulseTheme';
import { pulseImageListThumbProps } from '@/lib/pulseImage';
import type { LiveHubStream } from '@/types/liveHub';

/** Vertical offset below safe-area + feed tab chrome. */
export const FEED_LIVE_TRAY_TOP_OFFSET = 52;

type Props = {
  streams: LiveHubStream[];
  onOpenStream: (streamId: string) => void;
  insetTop: number;
  onDismiss?: () => void;
};

function hostIdentity(stream: LiveHubStream): string {
  return feedCreatorHandleIdentityLine(stream.host) || stream.host.displayName;
}

/** Compact horizontal tray — floats over the first For You page without changing FlatList layout. */
export function FeedHappeningNowTray({ streams, onOpenStream, insetTop, onDismiss }: Props) {
  if (streams.length === 0) return null;

  return (
    <View
      style={[styles.host, { top: insetTop + FEED_LIVE_TRAY_TOP_OFFSET }]}
      pointerEvents="box-none"
      accessibilityRole="list"
      accessibilityLabel="Happening now live streams"
    >
      <View style={styles.headerRow}>
        <View style={styles.headerLabel} pointerEvents="none">
          <Ionicons name="radio-outline" size={14} color={pulseColors.teal} />
          <Text style={styles.headerTitle}>Happening Now</Text>
        </View>
        {onDismiss ? (
          <Pressable
            style={styles.dismissBtn}
            onPress={onDismiss}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Hide happening now tray"
          >
            <Ionicons name="close" size={16} color={pulseColors.textQuiet} />
          </Pressable>
        ) : null}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {streams.map((stream) => {
          const avatarUri = stream.host.avatarUrl?.trim();
          const circleLabel = stream.communityName?.trim();
          return (
            <Pressable
              key={stream.id}
              style={styles.card}
              onPress={() => onOpenStream(stream.id)}
              accessibilityRole="button"
              accessibilityLabel={`${stream.title}, live with ${hostIdentity(stream)}`}
            >
              <View style={styles.cardTop}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatar} {...pulseImageListThumbProps} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]} />
                )}
                <View style={styles.meta}>
                  <Text style={styles.hostLine} numberOfLines={1}>
                    {hostIdentity(stream)}
                  </Text>
                  <Text style={styles.title} numberOfLines={1}>
                    {stream.title}
                  </Text>
                  {circleLabel ? (
                    <View style={styles.circleRow}>
                      <Ionicons name="people-outline" size={10} color={pulseColors.textQuiet} />
                      <Text style={styles.circleText} numberOfLines={1}>
                        {circleLabel}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
              <View style={styles.cardBottom}>
                <LivePill size="sm" />
                <LiveViewerBadge count={stream.viewerCount} size="sm" />
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const CARD_W = 196;

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 25,
    paddingBottom: pulseSpacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: pulseSpacing.lg,
    marginBottom: pulseSpacing.xs,
  },
  headerLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  dismissBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: pulseColors.glass,
    borderWidth: 1,
    borderColor: pulseColors.border,
  },
  headerTitle: {
    ...pulseTypography.caption,
    fontWeight: '800',
    color: pulseColors.text,
    letterSpacing: 0.3,
    ...Platform.select({
      default: {
        textShadowColor: 'rgba(0,0,0,0.55)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
      },
    }),
  },
  scrollContent: {
    paddingHorizontal: pulseSpacing.lg,
    gap: pulseSpacing.sm,
  },
  card: {
    width: CARD_W,
    padding: pulseSpacing.sm,
    borderRadius: pulseRadius.lg,
    borderWidth: 1,
    borderColor: pulseColors.borderAccent,
    backgroundColor: pulseColors.glassStrong,
    gap: pulseSpacing.sm,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: pulseSpacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: pulseColors.border,
  },
  avatarFallback: {
    backgroundColor: pulseColors.glass,
  },
  meta: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  hostLine: {
    ...pulseTypography.caption,
    fontWeight: '700',
    color: pulseColors.text,
  },
  title: {
    ...pulseTypography.caption,
    color: pulseColors.mutedText,
  },
  circleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  circleText: {
    ...pulseTypography.caption,
    fontSize: 10,
    color: pulseColors.textQuiet,
    flexShrink: 1,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
