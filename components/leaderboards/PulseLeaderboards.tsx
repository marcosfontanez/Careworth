import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { colors, spacing, typography } from '@/theme';
import { communitiesService, pulseScoresService } from '@/services/supabase';
import {
  formatPulseStat,
  PulseLeaderboardRow,
  PulseLifetimeLeaderboardRow,
  tierMeta,
} from '@/utils/pulseScore';
import { useAuth } from '@/contexts/AuthContext';
import { avatarThumb } from '@/lib/storage';
import type { Community } from '@/types';

type Tab = 'current' | 'lifetime';
type Scope =
  | { kind: 'global' }
  | { kind: 'circle'; circleId: string; circleName: string };

interface Props {
  /** How many rows each leaderboard shows. Defaults to 5. */
  limit?: number;
}

/**
 * Pulse leaderboards card for the Create tab.
 *
 * Two tabs:
 *   - **This Month** — top N by current-month overall Pulse Score
 *   - **Lifetime Leaders** — top N by cumulative finalized monthly score
 *
 * Each tab has a scope toggle: **Global** (across all of PulseVerse) or
 * one of **Your Circles** (the viewer's joined communities). Global is
 * the default so visitors without a Circle membership still see a board.
 */
export function PulseLeaderboards({ limit = 5 }: Props) {
  const { user: authUser } = useAuth();
  const viewerId = authUser?.id ?? null;
  const [tab, setTab] = useState<Tab>('current');
  const [scope, setScope] = useState<Scope>({ kind: 'global' });

  /**
   * Viewer's joined communities — only loaded when they're signed in.
   * Anonymous viewers only see the Global tab (no circle switcher).
   */
  const { data: joinedCircles } = useQuery({
    queryKey: ['leaderboardJoinedCircles', viewerId],
    queryFn: () => (viewerId ? communitiesService.getJoined(viewerId) : []),
    enabled: !!viewerId,
    staleTime: 5 * 60_000,
  });

  const scopeCircleId = scope.kind === 'circle' ? scope.circleId : null;

  const {
    data: currentRows,
    isLoading: currentLoading,
  } = useQuery({
    queryKey: ['pulseLbCurrent', scopeCircleId ?? 'global', limit],
    queryFn: () => pulseScoresService.getTopCurrent(limit, scopeCircleId),
    enabled: tab === 'current',
    staleTime: 60_000,
  });

  const {
    data: lifetimeRows,
    isLoading: lifetimeLoading,
  } = useQuery({
    queryKey: ['pulseLbLifetime', scopeCircleId ?? 'global', limit],
    queryFn: () => pulseScoresService.getTopLifetime(limit, scopeCircleId),
    enabled: tab === 'lifetime',
    staleTime: 60_000,
  });

  const loading = tab === 'current' ? currentLoading : lifetimeLoading;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerIcon}>
          <Ionicons name="trophy" size={14} color="#F59E0B" />
        </View>
        <View style={styles.headerTextCol}>
          <Text style={styles.headerTitle}>Pulse Leaderboards</Text>
          <Text style={styles.headerSubtitle}>
            Who's resonating on PulseVerse
          </Text>
        </View>
      </View>

      {/* Tab toggle (This Month | Lifetime) */}
      <View style={styles.tabRow}>
        <TabButton
          active={tab === 'current'}
          label="This Month"
          icon="flame"
          accent="#F59E0B"
          onPress={() => setTab('current')}
        />
        <TabButton
          active={tab === 'lifetime'}
          label="Lifetime"
          icon="infinite"
          accent="#A855F7"
          onPress={() => setTab('lifetime')}
        />
      </View>

      {/* Scope switcher (Global + each joined Circle) */}
      <ScopeSwitcher
        scope={scope}
        onChange={setScope}
        circles={joinedCircles ?? []}
        hasViewer={!!viewerId}
      />

      {/* List */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary.teal} />
        </View>
      ) : tab === 'current' ? (
        <CurrentBoard rows={currentRows ?? []} scope={scope} />
      ) : (
        <LifetimeBoard rows={lifetimeRows ?? []} scope={scope} />
      )}
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────────────

function TabButton({
  active,
  label,
  icon,
  accent,
  onPress,
}: {
  active: boolean;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.tabBtn,
        active && {
          backgroundColor: `${accent}1C`,
          borderColor: `${accent}66`,
        },
      ]}
      accessibilityRole="tab"
    >
      <Ionicons
        name={icon}
        size={12}
        color={active ? accent : colors.dark.textMuted}
      />
      <Text
        style={[
          styles.tabBtnText,
          { color: active ? accent : colors.dark.textMuted },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ScopeSwitcher({
  scope,
  onChange,
  circles,
  hasViewer,
}: {
  scope: Scope;
  onChange: (s: Scope) => void;
  circles: Community[];
  hasViewer: boolean;
}) {
  /**
   * Horizontally scrollable chip row: Global + one chip per joined
   * Circle. Kept compact so the leaderboard card doesn't eat the
   * Create-tab scroll.
   */
  if (!hasViewer || circles.length === 0) {
    // Global-only when the viewer has no joined Circles.
    return (
      <View style={styles.scopeRow}>
        <ScopeChip
          label="Global"
          icon="globe-outline"
          active
          onPress={() => onChange({ kind: 'global' })}
        />
      </View>
    );
  }

  return (
    <View style={styles.scopeRow}>
      <ScopeChip
        label="Global"
        icon="globe-outline"
        active={scope.kind === 'global'}
        onPress={() => onChange({ kind: 'global' })}
      />
      {circles.slice(0, 6).map((c) => (
        <ScopeChip
          key={c.id}
          label={c.name}
          icon="people-outline"
          active={scope.kind === 'circle' && scope.circleId === c.id}
          onPress={() =>
            onChange({ kind: 'circle', circleId: c.id, circleName: c.name })
          }
        />
      ))}
    </View>
  );
}

function ScopeChip({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.scopeChip, active && styles.scopeChipActive]}
    >
      <Ionicons
        name={icon}
        size={10}
        color={active ? colors.primary.teal : colors.dark.textMuted}
      />
      <Text
        style={[
          styles.scopeChipText,
          { color: active ? colors.primary.teal : colors.dark.textMuted },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function CurrentBoard({
  rows,
  scope,
}: {
  rows: PulseLeaderboardRow[];
  scope: Scope;
}) {
  if (rows.length === 0) {
    return <EmptyBoard scope={scope} kind="current" />;
  }
  return (
    <View style={styles.listBlock}>
      {rows.map((row, i) => (
        <CurrentRow key={row.userId} rank={i + 1} row={row} />
      ))}
    </View>
  );
}

function LifetimeBoard({
  rows,
  scope,
}: {
  rows: PulseLifetimeLeaderboardRow[];
  scope: Scope;
}) {
  if (rows.length === 0) {
    return <EmptyBoard scope={scope} kind="lifetime" />;
  }
  return (
    <View style={styles.listBlock}>
      {rows.map((row, i) => (
        <LifetimeRow key={row.userId} rank={i + 1} row={row} />
      ))}
    </View>
  );
}

// ── Leaderboard rows ─────────────────────────────────────────────────

function CurrentRow({
  rank,
  row,
}: {
  rank: number;
  row: PulseLeaderboardRow;
}) {
  const router = useRouter();
  const tier = tierMeta(row.tier);
  return (
    <Pressable
      onPress={() => router.push(`/profile/${row.userId}` as any)}
      style={styles.row}
      accessibilityRole="button"
      accessibilityLabel={`Open profile for ${row.username ?? 'creator'}`}
    >
      <RankBadge rank={rank} />
      <Avatar url={row.avatarUrl} />
      <View style={styles.rowMetaCol}>
        <Text style={styles.rowName} numberOfLines={1}>
          {row.displayName || row.username || 'Creator'}
        </Text>
        <Text style={styles.rowHandle} numberOfLines={1}>
          {row.username ? `@${row.username}` : '\u00A0'}
        </Text>
      </View>
      <View style={styles.rowScoreCol}>
        <Text style={styles.rowScore}>{row.overall}</Text>
        <View
          style={[
            styles.rowTierPill,
            {
              backgroundColor: `${tier.accent}22`,
              borderColor: `${tier.accent}66`,
            },
          ]}
        >
          <Text style={[styles.rowTierText, { color: tier.accent }]}>
            {tier.label.toUpperCase()}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function LifetimeRow({
  rank,
  row,
}: {
  rank: number;
  row: PulseLifetimeLeaderboardRow;
}) {
  const router = useRouter();
  const best = tierMeta(row.bestTier);
  return (
    <Pressable
      onPress={() => router.push(`/profile/${row.userId}` as any)}
      style={styles.row}
      accessibilityRole="button"
      accessibilityLabel={`Open profile for ${row.username ?? 'creator'}`}
    >
      <RankBadge rank={rank} />
      <Avatar url={row.avatarUrl} />
      <View style={styles.rowMetaCol}>
        <Text style={styles.rowName} numberOfLines={1}>
          {row.displayName || row.username || 'Creator'}
        </Text>
        <Text style={styles.rowHandle} numberOfLines={1}>
          {row.monthsActive} mo · best {best.label}
        </Text>
      </View>
      <View style={styles.rowScoreCol}>
        <Text style={styles.rowScoreLifetime}>
          {formatPulseStat(row.lifetimeTotal)}
        </Text>
        <Text style={styles.rowScoreLifetimeUnit}>POINTS</Text>
      </View>
    </Pressable>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const accent =
    rank === 1
      ? '#F59E0B' // gold
      : rank === 2
      ? '#94A3B8' // silver
      : rank === 3
      ? '#B45309' // bronze
      : colors.dark.textMuted;
  return (
    <View
      style={[
        styles.rankBadge,
        {
          backgroundColor: `${accent}22`,
          borderColor: `${accent}66`,
        },
      ]}
    >
      <Text style={[styles.rankText, { color: accent }]}>{rank}</Text>
    </View>
  );
}

function Avatar({ url }: { url: string | null | undefined }) {
  if (url) {
    return (
      <ExpoImage
        source={{ uri: avatarThumb(url, 32) }}
        style={styles.avatar}
        contentFit="cover"
        transition={120}
      />
    );
  }
  return (
    <View style={[styles.avatar, styles.avatarFallback]}>
      <Ionicons name="person" size={14} color={colors.dark.textMuted} />
    </View>
  );
}

function EmptyBoard({ scope, kind }: { scope: Scope; kind: Tab }) {
  const scopeLabel = useMemo(
    () => (scope.kind === 'circle' ? scope.circleName : 'PulseVerse'),
    [scope],
  );
  const body =
    kind === 'current'
      ? `No scores yet for ${scopeLabel} this month. Post, comment, or share to claim a spot.`
      : `No lifetime leaders yet for ${scopeLabel}. The first finalized month will write this board.`;
  return (
    <View style={styles.emptyWrap}>
      <Ionicons name="trophy-outline" size={20} color={colors.dark.textMuted} />
      <Text style={styles.emptyText}>{body}</Text>
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.dark.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.dark.borderSubtle,
    padding: spacing.lg,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(245,158,11,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextCol: { flex: 1 },
  headerTitle: {
    ...typography.h5,
    color: colors.dark.text,
  },
  headerSubtitle: {
    fontSize: 11.5,
    color: colors.dark.textMuted,
    marginTop: 1,
  },

  // Tab toggle
  tabRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.dark.borderSubtle,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  // Scope chips
  scopeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  scopeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.dark.borderSubtle,
    backgroundColor: 'rgba(255,255,255,0.02)',
    maxWidth: 160,
  },
  scopeChipActive: {
    backgroundColor: 'rgba(20,184,166,0.12)',
    borderColor: 'rgba(20,184,166,0.50)',
  },
  scopeChipText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },

  // Rows
  listBlock: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: colors.dark.borderSubtle,
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  rankText: {
    fontSize: 11,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowMetaCol: {
    flex: 1,
    minWidth: 0,
  },
  rowName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.dark.text,
  },
  rowHandle: {
    fontSize: 11,
    color: colors.dark.textMuted,
    marginTop: 1,
  },
  rowScoreCol: {
    alignItems: 'flex-end',
    gap: 3,
    minWidth: 60,
  },
  rowScore: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.dark.text,
    letterSpacing: -0.3,
    fontVariant: ['tabular-nums'],
  },
  rowTierPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
    borderWidth: 1,
  },
  rowTierText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  rowScoreLifetime: {
    fontSize: 17,
    fontWeight: '900',
    color: '#F59E0B',
    letterSpacing: -0.3,
    fontVariant: ['tabular-nums'],
  },
  rowScoreLifetimeUnit: {
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 0.6,
    color: colors.dark.textMuted,
  },

  loadingWrap: { paddingVertical: 30, alignItems: 'center' },
  emptyWrap: {
    paddingVertical: 22,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 12,
    color: colors.dark.textMuted,
    textAlign: 'center',
    lineHeight: 17,
  },
});
