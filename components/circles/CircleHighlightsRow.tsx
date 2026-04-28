import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius } from '@/theme';
import { formatCount } from '@/utils/format';
import type { CircleAccent } from '@/lib/circleAccents';
import type { CircleThread, Post } from '@/types';

type Props = {
  posts: Post[];
  threads: CircleThread[];
  accent: CircleAccent;
  onSeeAll?: () => void;
  onSelectPost?: (postId: string) => void;
  onSelectThread?: (threadId: string) => void;
  onSelectCreator?: (userId: string) => void;
  /**
   * Anonymous rooms (confessions) shouldn't surface a "Top Creator" — the
   * whole point is that posters are invisible. When true the creator card
   * is suppressed and the row collapses to two highlights.
   */
  hideTopCreator?: boolean;
};

type Highlight = {
  key: 'shared' | 'thread' | 'creator';
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  title: string;
  meta: string;
  onPress?: () => void;
};

/**
 * Curated row that lifts the room above a generic forum:
 *  - Most Shared Today: post with the highest share count in the last 24h
 *  - Hot Thread: thread with the highest replies+reactions
 *  - Top Creator: creator who posted the most engaged content this week
 *
 * Everything is computed client-side from data the room already fetched, so
 * no new RPCs are required to ship this. If a slot has no eligible data we
 * fall back to a neutral placeholder so the row never collapses or feels
 * empty after a fresh app install.
 */
export function CircleHighlightsRow({
  posts,
  threads,
  accent,
  onSeeAll,
  onSelectPost,
  onSelectThread,
  onSelectCreator,
  hideTopCreator,
}: Props) {
  const highlights = useMemo<Highlight[]>(() => {
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    /* 1. Most Shared Today — last 24h, max shareCount. */
    const recentPosts = posts.filter((p) => new Date(p.createdAt).getTime() >= dayAgo);
    const mostShared = recentPosts
      .slice()
      .sort((a, b) => (b.shareCount ?? 0) - (a.shareCount ?? 0))[0];
    const sharedHighlight: Highlight = mostShared
      ? {
          key: 'shared',
          icon: 'flame',
          label: 'Most Shared Today',
          title: titleFromCaption(mostShared.caption),
          meta: `${formatCount(mostShared.shareCount ?? 0)} shares`,
          onPress: onSelectPost ? () => onSelectPost(mostShared.id) : undefined,
        }
      : {
          key: 'shared',
          icon: 'flame',
          label: 'Most Shared Today',
          title: 'No shares yet',
          meta: 'Be the first',
        };

    /* 2. Hot Thread — top by replies+reactions across all time on screen.
     *    When the room has no Q&A threads yet (very common on a fresh
     *    install) we fall back to the post with the most discussion so
     *    the slot is never a dead "No threads yet" tile. The label flips
     *    to "Hot Discussion" so the user understands what's being shown. */
    const hottest = threads
      .slice()
      .sort(
        (a, b) =>
          (b.replyCount ?? 0) * 2 + (b.reactionCount ?? 0) -
          ((a.replyCount ?? 0) * 2 + (a.reactionCount ?? 0)),
      )[0];

    let threadHighlight: Highlight;
    if (hottest) {
      threadHighlight = {
        key: 'thread',
        icon: 'chatbubbles',
        label: 'Hot Thread',
        title: hottest.title,
        meta: `${formatCount(hottest.replyCount ?? 0)} replies`,
        onPress: onSelectThread ? () => onSelectThread(hottest.id) : undefined,
      };
    } else {
      const mostDiscussed = posts
        .slice()
        .sort((a, b) => (b.commentCount ?? 0) - (a.commentCount ?? 0))[0];
      threadHighlight = mostDiscussed && (mostDiscussed.commentCount ?? 0) > 0
        ? {
            key: 'thread',
            icon: 'chatbubbles',
            label: 'Hot Discussion',
            title: titleFromCaption(mostDiscussed.caption),
            meta: `${formatCount(mostDiscussed.commentCount ?? 0)} comments`,
            onPress: onSelectPost ? () => onSelectPost(mostDiscussed.id) : undefined,
          }
        : {
            key: 'thread',
            icon: 'chatbubbles',
            label: 'Hot Thread',
            title: 'No threads yet',
            meta: 'Start one',
          };
    }

    /* 3. Top Creator — most aggregated engagement this week. */
    const recentForCreator = posts.filter((p) => new Date(p.createdAt).getTime() >= weekAgo);
    const creatorTotals = new Map<
      string,
      { id: string; name: string; role?: string; score: number }
    >();
    for (const p of recentForCreator) {
      const id = p.creatorId;
      if (!id) continue;
      const score =
        (p.likeCount ?? 0) +
        (p.commentCount ?? 0) * 2 +
        (p.shareCount ?? 0) * 3 +
        (p.saveCount ?? 0) * 1.5;
      const existing = creatorTotals.get(id);
      if (existing) {
        existing.score += score;
      } else {
        creatorTotals.set(id, {
          id,
          name: p.creator?.displayName ?? 'Member',
          role: p.creator?.role,
          score,
        });
      }
    }
    const topCreator = Array.from(creatorTotals.values()).sort((a, b) => b.score - a.score)[0];
    const creatorHighlight: Highlight = topCreator
      ? {
          key: 'creator',
          icon: 'star',
          label: 'Top Creator',
          title: topCreator.name,
          meta: topCreator.role ? `${topCreator.role} · ${formatCount(topCreator.score)} pts` : `${formatCount(topCreator.score)} pts`,
          onPress: onSelectCreator ? () => onSelectCreator(topCreator.id) : undefined,
        }
      : {
          key: 'creator',
          icon: 'star',
          label: 'Top Creator',
          title: 'TBD',
          meta: 'Post to qualify',
        };

    /** Anonymous rooms drop the creator card entirely so we don't even hint
     *  at attributing posts. The row shrinks to two cards which still
     *  scroll/scan cleanly. */
    if (hideTopCreator) return [sharedHighlight, threadHighlight];
    return [sharedHighlight, threadHighlight, creatorHighlight];
  }, [posts, threads, onSelectPost, onSelectThread, onSelectCreator, hideTopCreator]);

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={[styles.headerIconWrap, { backgroundColor: `${accent.color}1A` }]}>
            <Ionicons name="sparkles" size={12} color={accent.color} />
          </View>
          <Text style={styles.headerLabel}>Highlights</Text>
        </View>
        {onSeeAll && (
          <TouchableOpacity onPress={onSeeAll} hitSlop={6}>
            <Text style={[styles.seeAll, { color: accent.color }]}>See all</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Edge-to-edge row that splits the viewport evenly across all
          highlights (2 for anonymous rooms, 3 for everything else) so
          every tile is visible at a glance — no horizontal swipe needed.
          Each card uses `flex: 1` with a tight gap, so the layout scales
          cleanly from compact phones up to tablets. */}
      <View style={styles.grid}>
        {highlights.map((h) => (
          <TouchableOpacity
            key={h.key}
            style={styles.cardShadow}
            activeOpacity={0.88}
            onPress={h.onPress}
            disabled={!h.onPress}
          >
            <LinearGradient
              colors={[`${accent.color}24`, `${accent.color}0A`, 'rgba(0,0,0,0.18)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.card, { borderColor: `${accent.color}66` }]}
            >
              {/* Top accent bar — identity stripe matching the room's color
                  so each tile still reads as "part of this room" even at
                  the tighter width. */}
              <View style={[styles.topBar, { backgroundColor: accent.color }]} />

              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.cardIconChip,
                    { backgroundColor: `${accent.color}1F`, borderColor: `${accent.color}55` },
                  ]}
                >
                  <Ionicons name={h.icon} size={11} color={accent.color} />
                </View>
                <Text
                  style={[styles.cardLabel, { color: accent.color }]}
                  numberOfLines={1}
                >
                  {h.label}
                </Text>
              </View>

              <Text style={styles.cardTitle} numberOfLines={2}>
                {h.title}
              </Text>

              <View style={styles.cardFooter}>
                <Text style={styles.cardMeta} numberOfLines={1}>
                  {h.meta}
                </Text>
                {h.onPress ? (
                  <Ionicons name="chevron-forward" size={11} color={`${accent.color}AA`} />
                ) : null}
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

/** Strip leading "**Title**" wrapping that the older create flow used. */
function titleFromCaption(caption: string): string {
  if (!caption) return 'Untitled';
  if (caption.startsWith('**')) {
    const first = caption.split('\n')[0].replace(/\*\*/g, '').trim();
    if (first) return first;
  }
  const oneLine = caption.replace(/\s+/g, ' ').trim();
  return oneLine.length > 60 ? `${oneLine.slice(0, 57)}…` : oneLine;
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 16 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  /** Tiny accent-tinted chip behind the sparkle gives the section header
   *  a small but premium "branded badge" feel rather than a stray icon. */
  headerIconWrap: {
    width: 20,
    height: 20,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.dark.text,
    letterSpacing: 0.2,
  },
  seeAll: { fontSize: 12, fontWeight: '700' },

  /**
   * Equal-width grid row. `flex: 1` on every tile (set on `cardShadow`
   * below) lets the layout split the available viewport evenly across
   * 2 or 3 highlights without any horizontal overflow — same rectangular
   * tile look as before, just sized to fit the screen.
   */
  grid: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 8,
    paddingBottom: 4,
  },
  cardShadow: {
    flex: 1,
    minWidth: 0,
    borderRadius: borderRadius.card ?? 14,
    backgroundColor: colors.dark.card,
    /* Premium drop shadow — pulls the card off the dark background like
     *  the mockup's elevated highlight tiles. */
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: { elevation: 5 },
      default: {},
    }),
  },
  card: {
    borderRadius: borderRadius.card ?? 14,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 6,
    overflow: 'hidden',
    minHeight: 110,
  },
  /** Identity stripe at the top — matches the room accent. */
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  /** Accent-tinted icon chip instead of a bare icon — pairs with the
   *  uppercase label so the header reads as a small branded tag. */
  cardIconChip: {
    width: 18,
    height: 18,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cardLabel: {
    flex: 1,
    minWidth: 0,
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.35,
    textTransform: 'uppercase',
  },
  cardTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.dark.text,
    lineHeight: 16,
  },
  cardFooter: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  cardMeta: {
    flex: 1,
    minWidth: 0,
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.dark.textMuted,
  },
});
