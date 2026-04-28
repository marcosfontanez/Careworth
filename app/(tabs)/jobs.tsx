import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SearchBar } from '@/components/ui/SearchBar';
import { FilterChips } from '@/components/ui/FilterChips';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useJobs } from '@/hooks/useQueries';
import { useAppStore } from '@/store/useAppStore';
import { EmptyState } from '@/components/ui/EmptyState';
import { colors, spacing, borderRadius, typography, shadows, layout, iconSize } from '@/theme';
import type { Job } from '@/types';

const SPECIALTY_FILTERS = ['All Jobs', 'ICU', 'ED', 'Med Surg', 'OR', 'Travel'];

export default function JobsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: jobs, isLoading, isError, refetch } = useJobs();
  const toggleSaveJob = useAppStore((s) => s.toggleSaveJob);
  const savedJobIds = useAppStore((s) => s.savedJobIds);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All Jobs');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  if (isLoading || !jobs) return <LoadingState />;
  if (isError) return <ErrorState title="Couldn't load jobs" onRetry={() => refetch()} />;

  let filtered = jobs.map((j) => ({ ...j, isSaved: savedJobIds.has(j.id) }));

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (j) => j.title.toLowerCase().includes(q) || j.employerName.toLowerCase().includes(q) || j.specialty.toLowerCase().includes(q),
    );
  }
  if (filter !== 'All Jobs') {
    const f = filter.toLowerCase();
    filtered = filtered.filter(
      (j) => j.specialty.toLowerCase().includes(f) || j.title.toLowerCase().includes(f),
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Healthcare Jobs</Text>
        <TouchableOpacity onPress={() => router.push('/search')} activeOpacity={0.7}>
          <View style={styles.headerBtn}>
            <Ionicons name="search-outline" size={20} color={colors.dark.text} />
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search jobs, companies..." />
      </View>

      <View style={styles.filterRow}>
        <FilterChips options={SPECIALTY_FILTERS} selected={filter} onSelect={setFilter} />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        /** Job listings can scroll to hundreds in a major metro. */
        removeClippedSubviews={Platform.OS === 'android'}
        renderItem={({ item }) => (
          <JobCard
            job={item}
            onPress={() => router.push(`/jobs/${item.id}`)}
            onSave={() => toggleSaveJob(item.id)}
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary.teal} />
        }
        ListHeaderComponent={
          <TouchableOpacity style={styles.urgentBanner} activeOpacity={0.85}>
            <LinearGradient
              colors={[colors.status.error + '28', colors.status.error + '08']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.urgentGradient}
            >
              <View style={styles.urgentIcon}>
                <Ionicons name="flame" size={16} color={colors.status.error} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.urgentTitle}>Urgent Openings</Text>
                <Text style={styles.urgentSub}>{Math.floor(filtered.length * 0.3)} positions need immediate fill</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.status.error} />
            </LinearGradient>
          </TouchableOpacity>
        }
        ListEmptyComponent={
          <EmptyState
            icon="briefcase-outline"
            title="No jobs found"
            subtitle="Try adjusting your filters or specialty."
            accent={colors.primary.gold}
          />
        }
      />
    </View>
  );
}

function JobCard({ job, onPress, onSave }: { job: Job & { isSaved?: boolean }; onPress: () => void; onSave: () => void }) {
  const salary = `$${(job.payMin * 2080).toLocaleString()}`;
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardTop}>
        <View style={styles.employerIcon}>
          <Ionicons name="business" size={20} color={colors.primary.royal} />
        </View>
        <View style={styles.cardMeta}>
          <Text style={styles.jobTitle} numberOfLines={1}>{job.title}</Text>
          <Text style={styles.jobEmployer} numberOfLines={1}>{job.employerName}</Text>
        </View>
        <TouchableOpacity onPress={onSave} activeOpacity={0.7} hitSlop={8}>
          <Ionicons
            name={job.isSaved ? 'bookmark' : 'bookmark-outline'}
            size={22}
            color={job.isSaved ? colors.primary.gold : colors.dark.textMuted}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.pillRow}>
        <View style={[styles.pill, { backgroundColor: colors.primary.teal + '15', borderColor: colors.primary.teal + '25' }]}>
          <Ionicons name="medkit-outline" size={11} color={colors.primary.teal} />
          <Text style={[styles.pillText, { color: colors.primary.teal }]}>{job.specialty}</Text>
        </View>
        <View style={[styles.pill, { backgroundColor: colors.primary.royal + '12', borderColor: colors.primary.royal + '25' }]}>
          <Ionicons name="time-outline" size={11} color={colors.primary.royal} />
          <Text style={[styles.pillText, { color: colors.primary.royal }]}>{job.shift}</Text>
        </View>
        {(job.city || job.state) && (
          <View style={[styles.pill, { backgroundColor: colors.dark.cardAlt, borderColor: colors.dark.border }]}>
            <Ionicons name="location-outline" size={11} color={colors.dark.textMuted} />
            <Text style={[styles.pillText, { color: colors.dark.textMuted }]}>{[job.city, job.state].filter(Boolean).join(', ')}</Text>
          </View>
        )}
      </View>

      <View style={styles.cardBottom}>
        <Text style={styles.salary}>{salary}<Text style={styles.salaryPer}>/yr</Text></Text>
        <View style={styles.applyBtn}>
          <Text style={styles.applyText}>View Details</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.dark.text} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: layout.screenPadding, paddingBottom: spacing.sm + 2,
  },
  title: { ...typography.screenTitle, fontSize: 22, color: colors.dark.text },
  headerBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.dark.card,
    borderWidth: 1, borderColor: colors.dark.borderInner,
    alignItems: 'center', justifyContent: 'center',
  },
  searchWrap: { paddingHorizontal: layout.screenPadding, paddingBottom: spacing.sm },
  filterRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dark.borderSubtle,
  },
  list: { padding: layout.screenPadding, gap: spacing.sm + 2, paddingBottom: 120 },

  urgentBanner: { marginBottom: spacing.sm },
  urgentGradient: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    borderRadius: borderRadius.xl, padding: spacing.md + 2,
    borderWidth: 1, borderColor: colors.status.error + '32',
  },
  urgentIcon: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.status.error + '20',
    alignItems: 'center', justifyContent: 'center',
  },
  urgentTitle: { ...typography.subtitle, fontSize: 14, fontWeight: '700', color: colors.status.error },
  urgentSub: { ...typography.caption, fontSize: 11, color: colors.dark.textSecondary, marginTop: 2 },

  card: {
    backgroundColor: colors.dark.card,
    borderRadius: borderRadius.card - 4,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.dark.borderInner,
    ...shadows.subtle,
  },
  cardTop: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md,
  },
  employerIcon: {
    width: 44, height: 44, borderRadius: borderRadius.md,
    backgroundColor: colors.primary.royal + '18',
    borderWidth: 1, borderColor: colors.primary.royal + '24',
    alignItems: 'center', justifyContent: 'center',
  },
  cardMeta: { flex: 1 },
  jobTitle: { ...typography.subtitle, fontSize: 15, fontWeight: '700', color: colors.dark.text },
  jobEmployer: { ...typography.bodySmall, fontSize: 13, color: colors.dark.textSecondary, marginTop: 1 },

  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.md },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  pillText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.1 },

  cardBottom: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.dark.borderSubtle,
  },
  salary: { ...typography.h3, fontSize: 18, fontWeight: '800', color: colors.primary.teal, letterSpacing: -0.3 },
  salaryPer: { fontSize: 13, fontWeight: '500', color: colors.dark.textMuted },
  applyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.primary.royal,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm + 1,
    borderRadius: borderRadius.md - 2,
    ...shadows.subtle,
  },
  applyText: { ...typography.button, fontSize: 12, fontWeight: '700', color: colors.dark.text },
});
