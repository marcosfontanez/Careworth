import React, { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { openPulsePage } from '@/lib/navigation/pulsePageRoutes';
import { useQuery } from '@tanstack/react-query';
import {
  gradients,
  iconSize,
  semantic,
  shadows,
  spacing,
} from '@/theme';
import { pulseScoresService } from '@/services/supabase';
import {
  formatPulseStat,
  PulseLeaderboardRow,
  PulseLifetimeLeaderboardRow,
  tierMeta,
} from '@/utils/pulseScore';
import {
  PodiumRasterRingStack,
  prizeFrameTierForMonthlyRank,
} from '@/components/profile/PodiumRasterRingStack';
import { CreatorHubGlassBackdrop } from '@/components/pv/CreatorHubGlassBackdrop';
import { isSummerSolstice2026PulseCollectionActive } from '@/lib/pulseRingRasterAssets';

type Tab = 'current' | 'lifetime';

interface Props {
  limit?: number;
}

const MEDALS = {
  gold: {
    step: ['#FFEB3B', '#F59E0B', '#B45309'] as const,
    edge: 'rgba(255,224,130,0.82)',
    ring: '#FFEA00',
    glow: '#FF9100',
  },
  goldsolo: {
    step: ['#FFF176', '#F59E0B', '#92400E'] as const,
    edge: 'rgba(255,235,120,0.85)',
    ring: '#FFEE58',
    glow: '#FFAB00',
  },
  silver: {
    step: ['#F1F5F9', '#94A3B8', '#475569'] as const,
    edge: 'rgba(226,232,240,0.45)',
    ring: 'rgba(203,213,225,0.65)',
    glow: '#94A3B8',
  },
  bronze: {
    step: ['#FDBA74', '#EA580C', '#7C2D12'] as const,
    edge: 'rgba(251,146,60,0.5)',
    ring: 'rgba(249,115,22,0.6)',
    glow: '#F97316',
  },
} as const;

/** Left→right display ranks for a symmetric top-N podium (winner centered when N≥3). */
const PODIUM_ORDER: Record<number, number[]> = {
  1: [1],
  2: [2, 1],
  3: [2, 1, 3],
  4: [4, 2, 1, 3],
  5: [4, 2, 1, 3, 5],
};

function podiumVisual(rank: number, soloWinner: boolean): {
  podiumHeight: number;
  avatarSize: number;
  medal: (typeof MEDALS)[keyof typeof MEDALS];
  showCrown: boolean;
} {
  if (soloWinner && rank === 1) {
    return { podiumHeight: 56, avatarSize: 72, medal: MEDALS.goldsolo, showCrown: true };
  }
  switch (rank) {
    case 1:
      return { podiumHeight: 52, avatarSize: 58, medal: MEDALS.gold, showCrown: true };
    case 2:
      return { podiumHeight: 42, avatarSize: 50, medal: MEDALS.silver, showCrown: false };
    case 3:
      return { podiumHeight: 34, avatarSize: 46, medal: MEDALS.bronze, showCrown: false };
    case 4:
      return { podiumHeight: 28, avatarSize: 42, medal: MEDALS.bronze, showCrown: false };
    case 5:
      return { podiumHeight: 24, avatarSize: 40, medal: MEDALS.bronze, showCrown: false };
    default:
      return { podiumHeight: 30, avatarSize: 44, medal: MEDALS.bronze, showCrown: false };
  }
}

function buildPodiumSlots<T extends { userId: string }>(rows: T[]): { row: T; rank: number }[] {
  const top = rows.slice(0, 5);
  const n = top.length;
  if (n === 0) return [];
  const order = PODIUM_ORDER[n];
  if (!order) return [];
  return order.map((rank) => ({ row: top[rank - 1]!, rank }));
}

/** Prize strip copy + preview sizes — borders match equipped monthly silver/bronze/gold frames. */
const MONTHLY_PRIZE_STRIPS = [
  { tier: 'gold' as const, label: 'Gold', rank: '1st place', photoD: 56, fireworks: true },
  { tier: 'silver' as const, label: 'Silver', rank: '2nd & 3rd', photoD: 52, fireworks: false },
  { tier: 'bronze' as const, label: 'Bronze', rank: '4th & 5th', photoD: 48, fireworks: false },
] as const;

/**
 * Pulse Score leaderboards — **This month** & **Lifetime** (global only).
 * Single five-slot podium: 4th · 2nd · 1st · 3rd · 5th (fewer rows omit outer slots).
 */
export function PulseLeaderboards({ limit = 5 }: Props) {
  const [tab, setTab] = useState<Tab>('current');

  const {
    data: currentRows,
    isLoading: currentLoading,
  } = useQuery({
    queryKey: ['pulseLbCurrent', 'global', limit],
    queryFn: () => pulseScoresService.getTopCurrent(limit, null),
    enabled: tab === 'current',
    staleTime: 60_000,
  });

  const {
    data: lifetimeRows,
    isLoading: lifetimeLoading,
  } = useQuery({
    queryKey: ['pulseLbLifetime', 'global', limit],
    queryFn: () => pulseScoresService.getTopLifetime(limit, null),
    enabled: tab === 'lifetime',
    staleTime: 60_000,
  });

  const loading = tab === 'current' ? currentLoading : lifetimeLoading;

  return (
    <View style={styles.cardOuter}>
      <CreatorHubGlassBackdrop borderRadius={22} blurIntensity={40} />
      <LinearGradient
        colors={['rgba(32,26,52,0.44)', 'rgba(14,20,38,0.50)', 'rgba(11,18,32,0.46)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={styles.cardInner}>
        <View style={styles.headerRow}>
          <LinearGradient
            colors={[...gradients.leaderboardHeaderRing]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerIconRing}
          >
            <View style={styles.headerIconCore}>
              <Ionicons name="trophy" size={iconSize.sm} color={semantic.premiumGoldSoft} />
            </View>
          </LinearGradient>
          <View style={styles.headerTextCol}>
            <Text style={styles.headerKicker}>Pulse champions</Text>
            <Text style={styles.headerTitle}>Leaderboard</Text>
            <Text style={styles.headerSubtitle}>
              Top creators by Pulse Score — tap a winner to open their My Pulse.
            </Text>
          </View>
        </View>

        <View style={styles.tabRow}>
          <TabControl
            active={tab === 'current'}
            label="This month"
            sub="Live 0–100"
            activeColors={['rgba(245,158,11,0.38)', 'rgba(217,119,6,0.12)']}
            borderActive="rgba(251,191,36,0.55)"
            onPress={() => setTab('current')}
          />
          <TabControl
            active={tab === 'lifetime'}
            label="Lifetime"
            sub="Running total"
            activeColors={['rgba(168,85,247,0.38)', 'rgba(88,28,135,0.18)']}
            borderActive="rgba(192,132,252,0.55)"
            onPress={() => setTab('lifetime')}
          />
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={semantic.accentTeal} size="small" />
            <Text style={styles.loadingText}>Loading podium…</Text>
          </View>
        ) : tab === 'current' ? (
          <PodiumCurrentBoard rows={currentRows ?? []} />
        ) : (
          <PodiumLifetimeBoard rows={lifetimeRows ?? []} />
        )}

        {tab === 'current' ? <MonthlyBorderPrizePreview /> : null}
      </View>
    </View>
  );
}

function MonthlyBorderPrizePreview() {
  const now = new Date();
  const monthHeading = now.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
  const solstice = isSummerSolstice2026PulseCollectionActive(now);

  return (
    <View style={styles.prizePreviewSection}>
      <CreatorHubGlassBackdrop borderRadius={18} blurIntensity={26} />
      <LinearGradient
        colors={[...gradients.leaderboardPrizePreview]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={styles.prizePreviewInner}>
        <View style={styles.prizePreviewTitleRow}>
          <Ionicons name="sparkles" size={iconSize.sm} color={semantic.warning} />
          <Text style={styles.prizePreviewKicker}>
            {solstice ? 'Summer Solstice Collection' : 'Monthly prize drop'}
          </Text>
        </View>
        <Text style={styles.prizePreviewHeadline}>
          {solstice ? 'June prizes — Summer Solstice borders' : 'This month’s exclusive borders'}
        </Text>
        <Text style={styles.prizePreviewBody}>
          {solstice ? (
            <>
              In <Text style={styles.prizePreviewBold}>June 2026</Text>, the global leaderboard awards the{' '}
              <Text style={styles.prizePreviewBold}>Summer Solstice Collection</Text>
              : <Text style={styles.prizePreviewBold}>1st</Text> earns the gold solstice frame,{' '}
              <Text style={styles.prizePreviewBold}>2nd & 3rd</Text> share silver,{' '}
              <Text style={styles.prizePreviewBold}>4th & 5th</Text> share bronze—the same art below on winners’ profiles. Equip
              earned frames in <Text style={styles.prizePreviewBold}>Customize My Pulse</Text>.
            </>
          ) : (
            <>
              Each month, the <Text style={styles.prizePreviewBold}>top five</Text> on the global Pulse leaderboard win{' '}
              <Text style={styles.prizePreviewBold}>tiered avatar frames</Text>: <Text style={styles.prizePreviewBold}>1st</Text>{' '}
              gets gold, <Text style={styles.prizePreviewBold}>2nd & 3rd</Text> share silver, and{' '}
              <Text style={styles.prizePreviewBold}>4th & 5th</Text> share bronze—the same borders you’ll see on winners’ profiles.
              The previews below match <Text style={styles.prizePreviewBold}>{monthHeading}</Text>. Equip frames you’ve earned in{' '}
              <Text style={styles.prizePreviewBold}>Customize My Pulse</Text>.
            </>
          )}
        </Text>

        <Text style={styles.prizeSampleRowLabel}>
          {solstice
            ? `Summer Solstice Collection · ${monthHeading} · 1st · 2nd–3rd · 4th–5th`
            : `${monthHeading} · 1st · 2nd–3rd · 4th–5th`}
        </Text>
        <View style={styles.prizeSampleRow}>
          {MONTHLY_PRIZE_STRIPS.map((spec) => (
            <MonthlyPrizeStrip key={spec.tier} spec={spec} />
          ))}
        </View>
        <Text style={styles.prizePreviewMicro}>
          Gold adds celebration fireworks on your profile; the silhouettes here are placeholders for your photo in the frame.
        </Text>
      </View>
    </View>
  );
}

function MonthlyPrizeStrip({ spec }: { spec: (typeof MONTHLY_PRIZE_STRIPS)[number] }) {
  return (
    <View style={[styles.neonSampleCol, spec.fireworks && styles.neonSampleColBurst]}>
      <View style={styles.neonSampleRingWrap}>
        <PodiumRasterRingStack
          photoDiameter={spec.photoD}
          prizeTier={spec.tier}
          showFireworks={spec.fireworks}
        />
      </View>
      <Text style={styles.neonSampleTier}>{spec.label}</Text>
      <Text style={styles.neonSampleRank}>{spec.rank}</Text>
    </View>
  );
}

function TabControl({
  active,
  label,
  sub,
  activeColors,
  borderActive,
  onPress,
}: {
  active: boolean;
  label: string;
  sub: string;
  activeColors: [string, string];
  borderActive: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tabBtnWrap,
        active && { borderColor: borderActive },
        pressed && { opacity: 0.92 },
      ]}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
    >
      <CreatorHubGlassBackdrop borderRadius={14} blurIntensity={22} />
      {active ? (
        <LinearGradient
          colors={activeColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.tabBtnFill}
        />
      ) : (
        <View style={styles.tabBtnMuted} />
      )}
      <View style={styles.tabBtnContent}>
        <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
        <Text style={[styles.tabSub, active && styles.tabSubActive]}>{sub}</Text>
      </View>
    </Pressable>
  );
}

function PodiumCurrentBoard({ rows }: { rows: PulseLeaderboardRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyBoard message="No scores yet this month — post, comment, and connect to claim the podium." />
    );
  }
  const slots = buildPodiumSlots(rows);
  const soloWinner = rows.length === 1;

  return (
    <View style={styles.podiumSection}>
      <View style={styles.podiumRow}>
        {slots.map(({ row, rank }) => {
          const v = podiumVisual(rank, soloWinner);
          return (
            <PodiumStand
              key={row.userId}
              rank={rank}
              userId={row.userId}
              displayName={row.displayName}
              username={row.username}
              avatarUrl={row.avatarUrl}
              podiumHeight={v.podiumHeight}
              avatarSize={v.avatarSize}
              medal={v.medal}
              showCrown={v.showCrown}
              compact={rank >= 4}
            >
              <CurrentPodiumMetrics row={row} rank={rank} />
            </PodiumStand>
          );
        })}
      </View>
    </View>
  );
}

function PodiumLifetimeBoard({ rows }: { rows: PulseLifetimeLeaderboardRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyBoard message="No lifetime totals yet. Earn Pulse in completed months to climb the board." />
    );
  }
  const slots = buildPodiumSlots(rows);
  const soloWinner = rows.length === 1;

  return (
    <View style={styles.podiumSection}>
      <View style={styles.podiumRow}>
        {slots.map(({ row, rank }) => {
          const v = podiumVisual(rank, soloWinner);
          return (
            <PodiumStand
              key={row.userId}
              rank={rank}
              userId={row.userId}
              displayName={row.displayName}
              username={row.username}
              avatarUrl={row.avatarUrl}
              podiumHeight={v.podiumHeight}
              avatarSize={v.avatarSize}
              medal={v.medal}
              showCrown={v.showCrown}
              compact={rank >= 4}
            >
              <LifetimePodiumMetrics row={row} rank={rank} />
            </PodiumStand>
          );
        })}
      </View>
    </View>
  );
}

function PodiumStand({
  rank,
  userId,
  displayName,
  username,
  avatarUrl,
  podiumHeight,
  avatarSize,
  medal,
  showCrown,
  compact,
  children,
}: {
  rank: number;
  userId: string;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  podiumHeight: number;
  avatarSize: number;
  medal: (typeof MEDALS)[keyof typeof MEDALS];
  showCrown: boolean;
  compact?: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const go = () => openPulsePage(router, userId);
  const name = displayName || username || 'Creator';
  const frameTier = prizeFrameTierForMonthlyRank(rank);
  const ringTier = frameTier ?? 'gold';

  return (
    <View style={styles.standCol}>
      <View style={styles.standTop}>
        {showCrown ? (
          <Pressable onPress={go} style={styles.crownWrap} hitSlop={8} accessibilityLabel={`${name}, first place`}>
            <Ionicons name="ribbon" size={22} color="#FFEA00" />
          </Pressable>
        ) : (
          <View style={{ height: 22 }} />
        )}
        <Pressable onPress={go} style={styles.avatarPress} accessibilityRole="button" accessibilityLabel={`Open My Pulse for ${name}`}>
          <PodiumRasterRingStack
            photoDiameter={avatarSize}
            prizeTier={ringTier}
            avatarUrl={avatarUrl}
            showFireworks={rank === 1}
          />
        </Pressable>
        <Pressable onPress={go} hitSlop={{ top: 2, bottom: 2, left: 6, right: 6 }}>
          <Text style={[styles.standName, compact && styles.standNameCompact]} numberOfLines={1}>
            {name}
          </Text>
        </Pressable>
        {username ? (
          <Pressable onPress={go}>
            <Text style={[styles.standHandle, compact && styles.standHandleCompact]} numberOfLines={1}>
              @{username}
            </Text>
          </Pressable>
        ) : (
          <Text style={styles.standHandle}> </Text>
        )}
        {children}
      </View>

      <Pressable onPress={go} accessibilityRole="button" accessibilityLabel={`${ordinal(rank)} place, ${name}`}>
        <LinearGradient
          colors={[...medal.step]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[
            styles.podiumBase,
            {
              height: podiumHeight,
              borderColor: medal.edge,
            },
          ]}
        >
          <Text style={[styles.podiumRankLabel, compact && styles.podiumRankLabelCompact]}>{ordinal(rank)}</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

function CurrentPodiumMetrics({ row, rank }: { row: PulseLeaderboardRow; rank: number }) {
  const tier = tierMeta(row.tier);
  const compact = rank >= 4;
  return (
    <View style={styles.metricsPodium}>
      <Text style={[styles.scoreHero, compact && styles.scoreHeroCompact]}>{row.overall}</Text>
      <View style={[styles.tierChip, { borderColor: `${tier.accent}55`, backgroundColor: `${tier.accent}14` }]}>
        <Text style={[styles.tierChipText, compact && styles.tierChipTextCompact, { color: tier.accent }]}>
          {tier.label}
        </Text>
      </View>
    </View>
  );
}

function LifetimePodiumMetrics({ row, rank }: { row: PulseLifetimeLeaderboardRow; rank: number }) {
  const best = tierMeta(row.bestTier);
  const compact = rank >= 4;
  return (
    <View style={styles.metricsPodium}>
      <Text style={[styles.scoreHeroLifetime, compact && styles.scoreHeroLifetimeCompact]}>
        {formatPulseStat(row.lifetimeTotal)}
      </Text>
      <Text style={[styles.lifetimeUnit, compact && styles.lifetimeUnitCompact]}>lifetime Pulse</Text>
      <Text style={[styles.bestTierHint, compact && styles.bestTierHintCompact]} numberOfLines={1}>
        Peak {best.label}
      </Text>
    </View>
  );
}

function ordinal(n: number): string {
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  return `${n}th`;
}

function EmptyBoard({ message }: { message: string }) {
  return (
    <View style={styles.emptyWrap}>
      <Ionicons name="podium-outline" size={iconSize.xl} color={semantic.textMuted} />
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cardOuter: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(252,211,77,0.20)',
    overflow: 'hidden',
    position: 'relative',
    ...shadows.lifted,
  },
  cardInner: {
    padding: spacing.lg,
    gap: spacing.lg,
    position: 'relative',
    zIndex: 1,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  headerIconRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconCore: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(8,12,24,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextCol: { flex: 1 },
  headerKicker: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: 'rgba(252,211,77,0.85)',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: semantic.textPrimary,
    letterSpacing: -0.6,
  },
  headerSubtitle: {
    fontSize: 12,
    color: semantic.textSecondary,
    marginTop: 4,
    lineHeight: 17,
  },
  tabRow: { flexDirection: 'row', gap: 10 },
  tabBtnWrap: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: semantic.borderSubtle,
    overflow: 'hidden',
    minHeight: 52,
    position: 'relative',
  },
  tabBtnFill: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  tabBtnMuted: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.05)' },
  tabBtnContent: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    position: 'relative',
    zIndex: 1,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: semantic.textMuted,
  },
  tabLabelActive: { color: semantic.textPrimary },
  tabSub: { fontSize: 10, fontWeight: '600', color: semantic.textQuiet, marginTop: 2 },
  tabSubActive: { color: semantic.textSecondary },
  loadingWrap: { paddingVertical: 32, alignItems: 'center', gap: 10 },
  loadingText: { fontSize: 12, color: semantic.textMuted },
  podiumSection: { gap: 18, marginTop: 4 },
  podiumRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 4 },
  standCol: { flex: 1, alignItems: 'center', minWidth: 0, maxWidth: 100 },
  standTop: { alignItems: 'center', width: '100%', marginBottom: 6, gap: 2 },
  crownWrap: { marginBottom: 2 },
  avatarPress: { marginTop: 2 },
  standName: {
    fontSize: 12.5,
    fontWeight: '800',
    color: semantic.textPrimary,
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 2,
  },
  standNameCompact: { fontSize: 10.5, marginTop: 4 },
  standHandle: {
    fontSize: 10,
    color: semantic.textMuted,
    fontWeight: '600',
    textAlign: 'center',
  },
  standHandleCompact: { fontSize: 9 },
  metricsPodium: { alignItems: 'center', gap: 4, marginTop: 4 },
  scoreHero: {
    fontSize: 24,
    fontWeight: '900',
    color: semantic.textPrimary,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  scoreHeroCompact: { fontSize: 17, letterSpacing: -0.35 },
  scoreHeroLifetime: {
    fontSize: 20,
    fontWeight: '900',
    color: semantic.premiumGoldSoft,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.4,
  },
  scoreHeroLifetimeCompact: { fontSize: 15, letterSpacing: -0.3 },
  lifetimeUnit: { fontSize: 9, fontWeight: '800', color: semantic.textMuted, letterSpacing: 0.8 },
  lifetimeUnitCompact: { fontSize: 8, letterSpacing: 0.5 },
  bestTierHint: { fontSize: 9, color: semantic.textSecondary, fontWeight: '600' },
  bestTierHintCompact: { fontSize: 8 },
  tierChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  tierChipText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.6 },
  tierChipTextCompact: { fontSize: 8, letterSpacing: 0.4 },
  podiumBase: {
    width: '100%',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 6,
  },
  podiumRankLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.92)',
    letterSpacing: 1,
  },
  podiumRankLabelCompact: { fontSize: 9, letterSpacing: 0.6 },
  emptyWrap: { paddingVertical: 28, alignItems: 'center', gap: 10 },
  emptyText: {
    fontSize: 12,
    color: semantic.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  prizePreviewSection: {
    marginTop: spacing.sm,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(252,211,77,0.16)',
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  prizePreviewInner: {
    padding: spacing.md,
    gap: 10,
    position: 'relative',
    zIndex: 1,
  },
  prizePreviewTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  prizePreviewKicker: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(252,211,77,0.95)',
    letterSpacing: 0.4,
  },
  prizePreviewHeadline: {
    fontSize: 17,
    fontWeight: '900',
    color: semantic.textPrimary,
    letterSpacing: -0.4,
  },
  prizePreviewBody: {
    fontSize: 12.5,
    lineHeight: 19,
    color: semantic.textSecondary,
  },
  prizePreviewBold: {
    fontWeight: '800',
    color: semantic.textPrimary,
  },
  prizeSampleRowLabel: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: semantic.textMuted,
  },
  prizeSampleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 6,
  },
  prizePreviewMicro: {
    fontSize: 10.5,
    lineHeight: 15,
    color: semantic.textQuiet,
    fontStyle: 'italic',
  },
  neonSampleCol: { flex: 1, alignItems: 'center', minWidth: 0 },
  neonSampleColBurst: { paddingTop: 6, overflow: 'visible' },
  neonSampleRingWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  neonSampleTier: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '800',
    color: semantic.textPrimary,
    textAlign: 'center',
  },
  neonSampleRank: {
    fontSize: 9.5,
    fontWeight: '700',
    color: semantic.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
});
