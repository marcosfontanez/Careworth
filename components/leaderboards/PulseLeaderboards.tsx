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
import { useQuery } from '@tanstack/react-query';
import { colors, spacing } from '@/theme';
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

/** Prize strip copy + preview sizes — borders match equipped monthly silver/bronze/gold frames. */
const MONTHLY_PRIZE_STRIPS = [
  { tier: 'gold' as const, label: 'Gold', rank: '1st place', photoD: 56, fireworks: true },
  { tier: 'silver' as const, label: 'Silver', rank: '2nd & 3rd', photoD: 52, fireworks: false },
  { tier: 'bronze' as const, label: 'Bronze', rank: '4th & 5th', photoD: 48, fireworks: false },
] as const;

/**
 * Pulse Score leaderboards — **This month** & **Lifetime** (global only).
 * Podium: 2nd · 1st · 3rd on tiered steps; 4th & 5th below.
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
    <LinearGradient
      colors={['rgba(32,26,52,0.97)', 'rgba(14,20,38,0.99)', '#0B1220']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.cardGradient}
    >
      <View style={styles.cardInner}>
        <View style={styles.headerRow}>
          <LinearGradient
            colors={['rgba(251,191,36,0.45)', 'rgba(168,85,247,0.35)', 'rgba(20,184,166,0.35)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerIconRing}
          >
            <View style={styles.headerIconCore}>
              <Ionicons name="trophy" size={18} color="#FCD34D" />
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
            <ActivityIndicator color={colors.primary.teal} size="small" />
            <Text style={styles.loadingText}>Loading podium…</Text>
          </View>
        ) : tab === 'current' ? (
          <PodiumCurrentBoard rows={currentRows ?? []} />
        ) : (
          <PodiumLifetimeBoard rows={lifetimeRows ?? []} />
        )}

        {tab === 'current' ? <MonthlyBorderPrizePreview /> : null}
      </View>
    </LinearGradient>
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
      <LinearGradient
        colors={['rgba(251,191,36,0.12)', 'rgba(20,184,166,0.06)', 'rgba(99,102,241,0.08)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.prizePreviewInner}>
        <View style={styles.prizePreviewTitleRow}>
          <Ionicons name="sparkles" size={16} color="#FBBF24" />
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
  const top = rows.slice(0, 3);
  const tail = rows.slice(3, 5);
  const ordered =
    top.length >= 3
      ? ([top[1], top[0], top[2]] as [PulseLeaderboardRow, PulseLeaderboardRow, PulseLeaderboardRow])
      : top.length === 2
        ? ([top[1], top[0]] as [PulseLeaderboardRow, PulseLeaderboardRow])
        : ([top[0]] as [PulseLeaderboardRow]);
  const heights =
    top.length >= 3 ? ([36, 56, 28] as const) : top.length === 2 ? ([40, 52] as const) : ([56] as const);
  const avatarSizes =
    top.length >= 3 ? ([52, 68, 48] as const) : top.length === 2 ? ([56, 72] as const) : ([76] as const);
  const medals: (keyof typeof MEDALS)[] =
    top.length >= 3 ? (['silver', 'gold', 'bronze'] as const) : top.length === 2 ? (['silver', 'gold'] as const) : (['goldsolo'] as const);

  return (
    <View style={styles.podiumSection}>
      <View style={styles.podiumRow}>
        {ordered.map((row, idx) => {
          const realRank =
            top.length >= 3 ? (idx === 0 ? 2 : idx === 1 ? 1 : 3) : top.length === 2 ? (idx === 0 ? 2 : 1) : 1;
          return (
            <PodiumStand
              key={row.userId}
              rank={realRank}
              userId={row.userId}
              displayName={row.displayName}
              username={row.username}
              avatarUrl={row.avatarUrl}
              podiumHeight={heights[idx] ?? 40}
              avatarSize={avatarSizes[idx] ?? 56}
              medal={MEDALS[medals[idx] ?? 'gold']}
              showCrown={realRank === 1}
            >
              <CurrentPodiumMetrics row={row} />
            </PodiumStand>
          );
        })}
      </View>
      {tail.length > 0 ? <RunnersCurrent tail={tail} /> : null}
    </View>
  );
}

function PodiumLifetimeBoard({ rows }: { rows: PulseLifetimeLeaderboardRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyBoard message="No lifetime totals yet. Earn Pulse in completed months to climb the board." />
    );
  }
  const top = rows.slice(0, 3);
  const tail = rows.slice(3, 5);
  const ordered =
    top.length >= 3
      ? ([top[1], top[0], top[2]] as [
          PulseLifetimeLeaderboardRow,
          PulseLifetimeLeaderboardRow,
          PulseLifetimeLeaderboardRow,
        ])
      : top.length === 2
        ? ([top[1], top[0]] as [PulseLifetimeLeaderboardRow, PulseLifetimeLeaderboardRow])
        : ([top[0]] as [PulseLifetimeLeaderboardRow]);
  const heights =
    top.length >= 3 ? ([36, 56, 28] as const) : top.length === 2 ? ([40, 52] as const) : ([56] as const);
  const avatarSizes =
    top.length >= 3 ? ([52, 68, 48] as const) : top.length === 2 ? ([56, 72] as const) : ([76] as const);
  const medals: (keyof typeof MEDALS)[] =
    top.length >= 3 ? (['silver', 'gold', 'bronze'] as const) : top.length === 2 ? (['silver', 'gold'] as const) : (['goldsolo'] as const);

  return (
    <View style={styles.podiumSection}>
      <View style={styles.podiumRow}>
        {ordered.map((row, idx) => {
          const realRank =
            top.length >= 3 ? (idx === 0 ? 2 : idx === 1 ? 1 : 3) : top.length === 2 ? (idx === 0 ? 2 : 1) : 1;
          return (
            <PodiumStand
              key={row.userId}
              rank={realRank}
              userId={row.userId}
              displayName={row.displayName}
              username={row.username}
              avatarUrl={row.avatarUrl}
              podiumHeight={heights[idx] ?? 40}
              avatarSize={avatarSizes[idx] ?? 56}
              medal={MEDALS[medals[idx] ?? 'gold']}
              showCrown={realRank === 1}
            >
              <LifetimePodiumMetrics row={row} />
            </PodiumStand>
          );
        })}
      </View>
      {tail.length > 0 ? <RunnersLifetime tail={tail} /> : null}
    </View>
  );
}

function RunnersCurrent({ tail }: { tail: PulseLeaderboardRow[] }) {
  return (
    <View style={styles.runnersBlock}>
      <RunnersHeader />
      <View style={styles.runnersRow}>
        {tail.map((row, i) => (
          <RunnerCard
            key={row.userId}
            rank={4 + i}
            userId={row.userId}
            displayName={row.displayName}
            username={row.username}
            avatarUrl={row.avatarUrl}
          >
            <RunnerCurrentRight row={row} />
          </RunnerCard>
        ))}
      </View>
    </View>
  );
}

function RunnersLifetime({ tail }: { tail: PulseLifetimeLeaderboardRow[] }) {
  return (
    <View style={styles.runnersBlock}>
      <RunnersHeader />
      <View style={styles.runnersRow}>
        {tail.map((row, i) => (
          <RunnerCard
            key={row.userId}
            rank={4 + i}
            userId={row.userId}
            displayName={row.displayName}
            username={row.username}
            avatarUrl={row.avatarUrl}
          >
            <RunnerLifetimeRight row={row} />
          </RunnerCard>
        ))}
      </View>
    </View>
  );
}

function RunnersHeader() {
  return (
    <View style={styles.runnersHeader}>
      <View style={styles.runnersRule} />
      <Text style={styles.runnersTitle}>Also climbing</Text>
      <View style={styles.runnersRule} />
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
  children: React.ReactNode;
}) {
  const router = useRouter();
  const go = () => router.push(`/profile/${userId}` as any);
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
          <Text style={styles.standName} numberOfLines={1}>
            {name}
          </Text>
        </Pressable>
        {username ? (
          <Pressable onPress={go}>
            <Text style={styles.standHandle} numberOfLines={1}>
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
          <Text style={styles.podiumRankLabel}>{ordinal(rank)}</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

function CurrentPodiumMetrics({ row }: { row: PulseLeaderboardRow }) {
  const tier = tierMeta(row.tier);
  return (
    <View style={styles.metricsPodium}>
      <Text style={styles.scoreHero}>{row.overall}</Text>
      <View style={[styles.tierChip, { borderColor: `${tier.accent}55`, backgroundColor: `${tier.accent}14` }]}>
        <Text style={[styles.tierChipText, { color: tier.accent }]}>{tier.label}</Text>
      </View>
    </View>
  );
}

function LifetimePodiumMetrics({ row }: { row: PulseLifetimeLeaderboardRow }) {
  const best = tierMeta(row.bestTier);
  return (
    <View style={styles.metricsPodium}>
      <Text style={styles.scoreHeroLifetime}>{formatPulseStat(row.lifetimeTotal)}</Text>
      <Text style={styles.lifetimeUnit}>lifetime Pulse</Text>
      <Text style={styles.bestTierHint} numberOfLines={1}>
        Peak {best.label}
      </Text>
    </View>
  );
}

function RunnerCard({
  rank,
  userId,
  displayName,
  username,
  avatarUrl,
  children,
}: {
  rank: number;
  userId: string;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const go = () => router.push(`/profile/${userId}` as any);
  const name = displayName || username || 'Creator';

  return (
    <Pressable
      onPress={go}
      style={({ pressed }) => [styles.runnerCard, pressed && { opacity: 0.9 }]}
      accessibilityRole="button"
      accessibilityLabel={`${ordinal(rank)} — ${name}, open My Pulse`}
    >
      <LinearGradient
        colors={['rgba(255,255,255,0.09)', 'rgba(255,255,255,0.02)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.runnerRank}>
        <Text style={styles.runnerRankText}>{rank}</Text>
      </View>
      <Pressable onPress={go} hitSlop={8} accessibilityLabel={`${name} profile photo`}>
        <PodiumRasterRingStack photoDiameter={44} prizeTier="bronze" avatarUrl={avatarUrl} />
      </Pressable>
      <View style={styles.runnerMeta}>
        <Pressable onPress={go}>
          <Text style={styles.runnerName} numberOfLines={1}>
            {name}
          </Text>
        </Pressable>
        {children}
      </View>
    </Pressable>
  );
}

function RunnerCurrentRight({ row }: { row: PulseLeaderboardRow }) {
  const tier = tierMeta(row.tier);
  return (
    <View style={styles.runnerRight}>
      <Text style={styles.runnerScore}>{row.overall}</Text>
      <Text style={[styles.runnerTier, { color: tier.accent }]}>{tier.label}</Text>
    </View>
  );
}

function RunnerLifetimeRight({ row }: { row: PulseLifetimeLeaderboardRow }) {
  return (
    <View style={styles.runnerRight}>
      <Text style={styles.runnerScoreGold}>{formatPulseStat(row.lifetimeTotal)}</Text>
      <Text style={styles.runnerSub}>lifetime</Text>
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
      <Ionicons name="podium-outline" size={28} color={colors.dark.textMuted} />
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cardGradient: {
    borderRadius: 22,
    padding: 1,
    borderWidth: 1,
    borderColor: 'rgba(252,211,77,0.22)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.45,
        shadowRadius: 22,
      },
      android: { elevation: 14 },
    }),
  },
  cardInner: {
    borderRadius: 21,
    backgroundColor: 'rgba(8,12,24,0.94)',
    padding: spacing.lg,
    gap: spacing.md,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
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
    color: colors.dark.text,
    letterSpacing: -0.6,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.dark.textSecondary,
    marginTop: 4,
    lineHeight: 17,
  },
  tabRow: { flexDirection: 'row', gap: 10 },
  tabBtnWrap: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.dark.borderSubtle,
    overflow: 'hidden',
    minHeight: 52,
  },
  tabBtnFill: { ...StyleSheet.absoluteFillObject },
  tabBtnMuted: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.03)' },
  tabBtnContent: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.dark.textMuted,
  },
  tabLabelActive: { color: colors.dark.text },
  tabSub: { fontSize: 10, fontWeight: '600', color: colors.dark.textQuiet, marginTop: 2 },
  tabSubActive: { color: colors.dark.textSecondary },
  loadingWrap: { paddingVertical: 32, alignItems: 'center', gap: 10 },
  loadingText: { fontSize: 12, color: colors.dark.textMuted },
  podiumSection: { gap: 18, marginTop: 4 },
  podiumRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 6 },
  standCol: { flex: 1, alignItems: 'center', minWidth: 0, maxWidth: 120 },
  standTop: { alignItems: 'center', width: '100%', marginBottom: 6, gap: 2 },
  crownWrap: { marginBottom: 2 },
  avatarPress: { marginTop: 2 },
  standName: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.dark.text,
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 2,
  },
  standHandle: {
    fontSize: 10,
    color: colors.dark.textMuted,
    fontWeight: '600',
    textAlign: 'center',
  },
  metricsPodium: { alignItems: 'center', gap: 4, marginTop: 4 },
  scoreHero: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFF',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  scoreHeroLifetime: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FCD34D',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.4,
  },
  lifetimeUnit: { fontSize: 9, fontWeight: '800', color: colors.dark.textMuted, letterSpacing: 0.8 },
  bestTierHint: { fontSize: 9, color: colors.dark.textSecondary, fontWeight: '600' },
  tierChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  tierChipText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.6 },
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
  runnersBlock: { gap: 12 },
  runnersHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  runnersRule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.12)' },
  runnersTitle: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.dark.textMuted,
  },
  runnersRow: { gap: 8 },
  runnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  runnerRank: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  runnerRankText: { fontSize: 12, fontWeight: '900', color: colors.dark.text },
  runnerMeta: { flex: 1, minWidth: 0 },
  runnerName: { fontSize: 14, fontWeight: '800', color: colors.dark.text },
  runnerRight: { alignItems: 'flex-end' },
  runnerScore: { fontSize: 18, fontWeight: '900', color: colors.dark.text, fontVariant: ['tabular-nums'] },
  runnerScoreGold: { fontSize: 17, fontWeight: '900', color: '#FBBF24', fontVariant: ['tabular-nums'] },
  runnerTier: { fontSize: 9, fontWeight: '800' },
  runnerSub: { fontSize: 9, fontWeight: '800', color: colors.dark.textMuted, letterSpacing: 0.5 },
  emptyWrap: { paddingVertical: 28, alignItems: 'center', gap: 10 },
  emptyText: {
    fontSize: 12,
    color: colors.dark.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  prizePreviewSection: {
    marginTop: spacing.sm,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(252,211,77,0.2)',
    overflow: 'hidden',
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
    color: colors.dark.text,
    letterSpacing: -0.4,
  },
  prizePreviewBody: {
    fontSize: 12.5,
    lineHeight: 19,
    color: colors.dark.textSecondary,
  },
  prizePreviewBold: {
    fontWeight: '800',
    color: colors.dark.text,
  },
  prizeSampleRowLabel: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.dark.textMuted,
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
    color: colors.dark.textQuiet,
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
    color: colors.dark.text,
    textAlign: 'center',
  },
  neonSampleRank: {
    fontSize: 9.5,
    fontWeight: '700',
    color: colors.dark.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
});
