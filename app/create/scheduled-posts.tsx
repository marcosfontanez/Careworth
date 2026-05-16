import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StackScreenHeader } from '@/components/ui/StackScreenHeader';
import { useAuth } from '@/contexts/AuthContext';
import { colors, spacing, typography, borderRadius, pulseverse, layout } from '@/theme';
import {
  listScheduledPosts,
  cancelScheduledPost,
  formatScheduleLabel,
  type ScheduledPostRow,
} from '@/lib/scheduledPosts';
import { pulseImageListThumbProps } from '@/lib/pulseImage';

export default function ScheduledPostsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [rows, setRows] = useState<ScheduledPostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const uid = user?.id;
    if (!uid) {
      setRows([]);
      setLoading(false);
      return;
    }
    const next = await listScheduledPosts(uid);
    setRows(next);
    setLoading(false);
    setRefreshing(false);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load();
  }, [load]);

  const confirmCancel = useCallback(
    (row: ScheduledPostRow) => {
      Alert.alert(
        'Cancel scheduled post?',
        'This post will not go live at the planned time. You can compose again anytime.',
        [
          { text: 'Keep scheduled', style: 'cancel' },
          {
            text: 'Cancel schedule',
            style: 'destructive',
            onPress: () => {
              setBusyId(row.id);
              void (async () => {
                const ok = await cancelScheduledPost(row.id);
                setBusyId(null);
                if (ok) {
                  setRows((prev) => prev.filter((r) => r.id !== row.id));
                } else {
                  Alert.alert('Could not cancel', 'Check your connection and try again.');
                }
              })();
            },
          },
        ],
      );
    },
    [],
  );

  return (
    <View style={styles.root}>
      <LinearGradient colors={[...pulseverse.screenGradient]} style={StyleSheet.absoluteFill} />
      <StackScreenHeader
        insetTop={insets.top}
        title="Scheduled posts"
        onPressLeft={() => router.back()}
        leftIcon="close"
        leftAccessibilityLabel="Close"
      />

      {loading && rows.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={pulseverse.electric} />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            rows.length === 0 && styles.listEmpty,
            { paddingBottom: insets.bottom + spacing.xl },
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={pulseverse.electric} />
          }
          renderItem={({ item }) => {
            const at = item.scheduled_at ? new Date(item.scheduled_at) : null;
            const when = at && !Number.isNaN(at.getTime()) ? formatScheduleLabel(at) : 'Time pending';
            const thumb = item.thumbnail_url?.trim();
            const cap = item.caption?.trim() || 'No caption yet';
            const cancelBusy = busyId === item.id;

            return (
              <View style={styles.card}>
                <TouchableOpacity
                  activeOpacity={0.92}
                  onPress={() => router.push(`/post/${item.id}` as never)}
                  disabled={cancelBusy}
                  accessibilityRole="button"
                  accessibilityLabel="Open scheduled post"
                >
                  <View style={styles.cardInner}>
                    <View style={styles.thumbWrap}>
                      {thumb ? (
                        <Image
                          source={{ uri: thumb }}
                          style={styles.thumb}
                          contentFit="cover"
                          {...pulseImageListThumbProps}
                        />
                      ) : (
                        <View style={[styles.thumb, styles.thumbPh]}>
                          <Ionicons name="videocam-outline" size={26} color={colors.dark.textMuted} />
                        </View>
                      )}
                    </View>
                    <View style={styles.cardBody}>
                      <Text style={styles.whenRow}>
                        <Ionicons name="time-outline" size={14} color={pulseverse.electricMuted} />
                        <Text style={styles.whenText}> {when}</Text>
                      </Text>
                      <Text style={styles.typeMeta}>{item.type}</Text>
                      <Text style={styles.caption} numberOfLines={2}>
                        {cap}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => confirmCancel(item)}
                  disabled={cancelBusy}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel scheduled post"
                >
                  {cancelBusy ? (
                    <ActivityIndicator size="small" color={pulseverse.electric} />
                  ) : (
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyBlock}>
              <Ionicons name="calendar-outline" size={40} color={colors.dark.textMuted} />
              <Text style={styles.emptyTitle}>Nothing queued</Text>
              <Text style={styles.emptySub}>
                When you schedule from the composer, queued posts appear here. Tap a row to review or edit on
                the post screen.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.dark.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  listEmpty: { flexGrow: 1 },
  card: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.22)',
    backgroundColor: 'rgba(12,18,32,0.82)',
    overflow: 'hidden',
  },
  cardInner: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.md,
  },
  thumbWrap: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  thumb: { width: 72, height: 96, backgroundColor: colors.dark.cardAlt },
  thumbPh: { alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1, justifyContent: 'center', gap: 4 },
  whenRow: { flexDirection: 'row', alignItems: 'center' },
  whenText: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '700',
    color: colors.dark.text,
  },
  typeMeta: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.dark.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  caption: {
    ...typography.body,
    fontSize: 13,
    color: colors.dark.textSecondary,
    lineHeight: 18,
  },
  cancelBtn: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(148,163,184,0.18)',
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: pulseverse.electricSoft,
  },
  emptyBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['4xl'],
    gap: spacing.sm,
  },
  emptyTitle: {
    ...typography.title,
    fontSize: 18,
    color: colors.dark.text,
    marginTop: spacing.sm,
  },
  emptySub: {
    ...typography.body,
    fontSize: 14,
    color: colors.dark.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
