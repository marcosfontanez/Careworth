import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, TextInput, RefreshControl,
  Image, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { useFeatureFlags } from '@/lib/featureFlags';
import { adsService, subscriptionService, jobPricingService, creatorTipsService } from '@/services/monetization';
import { AdminCirclesPanel } from '@/components/admin/AdminCirclesPanel';

type Tab = 'reports' | 'users' | 'content' | 'circles' | 'stats' | 'revenue';

interface Report {
  id: string;
  target_type: string;
  target_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reporter: { id: string; display_name: string; avatar_url: string | null } | null;
  target_content?: any;
}

interface UserRow {
  id: string;
  display_name: string;
  avatar_url: string | null;
  email?: string;
  role: string;
  is_verified: boolean;
  role_admin: boolean;
  created_at: string;
  post_count: number;
  follower_count: number;
}

interface ContentRow {
  id: string;
  type: string;
  caption: string | null;
  media_url: string | null;
  privacy_mode: string;
  like_count: number;
  comment_count: number;
  created_at: string;
  author: { display_name: string } | null;
}

interface DailyMetric {
  date: string;
  count: number;
}

type ReportFilter = 'all' | 'pending' | 'action_taken' | 'dismissed';

export default function AdminPanel() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('reports');

  // Reports state
  const [reports, setReports] = useState<Report[]>([]);
  const [reportFilter, setReportFilter] = useState<ReportFilter>('pending');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  // Users state
  const [users, setUsers] = useState<UserRow[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);

  // Content state
  const [content, setContent] = useState<ContentRow[]>([]);
  const [contentSearch, setContentSearch] = useState('');

  // Stats state
  const [stats, setStats] = useState({
    users: 0, posts: 0, reports: 0, communities: 0,
    pendingReports: 0, activeBans: 0, newUsersToday: 0, postsToday: 0,
  });
  const [dailyUsers, setDailyUsers] = useState<DailyMetric[]>([]);
  const [topEvents, setTopEvents] = useState<{ name: string; count: number }[]>([]);

  // Revenue state
  const featureFlags = useFeatureFlags();
  const [revenueData, setRevenueData] = useState({
    adCampaigns: 0, adImpressions: 0, adRevenue: 0,
    subscribers: 0, subRevenue: 0,
    jobListings: 0, jobRevenue: 0, jobByTier: {} as Record<string, number>,
    tipCount: 0, tipAmount: 0, uniqueTippers: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadData(); }, [tab, reportFilter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [tab, reportFilter]);

  const loadData = async () => {
    if (tab === 'circles') {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      if (tab === 'reports') {
        let query = supabase
          .from('reports')
          .select('*, reporter:reporter_id(id, display_name, avatar_url)')
          .order('created_at', { ascending: false })
          .limit(100);
        if (reportFilter !== 'all') query = query.eq('status', reportFilter);
        const { data } = await query;

        const enriched = await Promise.all(
          (data ?? []).map(async (r: any) => {
            let target_content = null;
            try {
              if (r.target_type === 'post') {
                const { data: post } = await supabase
                  .from('posts')
                  .select('caption, media_url, type')
                  .eq('id', r.target_id)
                  .single();
                target_content = post;
              } else if (r.target_type === 'comment') {
                const { data: comment } = await supabase
                  .from('comments')
                  .select('content')
                  .eq('id', r.target_id)
                  .single();
                target_content = comment;
              } else if (r.target_type === 'profile') {
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('display_name, avatar_url')
                  .eq('id', r.target_id)
                  .single();
                target_content = profile;
              }
            } catch {}
            return { ...r, target_content };
          })
        );
        setReports(enriched);
      } else if (tab === 'users') {
        let query = supabase
          .from('profiles')
          .select('id, display_name, avatar_url, role, is_verified, role_admin, created_at, post_count, follower_count')
          .order('created_at', { ascending: false })
          .limit(200);
        if (userSearch.trim()) {
          query = query.ilike('display_name', `%${userSearch.trim()}%`);
        }
        const { data } = await query;
        setUsers((data as any) ?? []);
      } else if (tab === 'content') {
        let query = supabase
          .from('posts')
          .select('id, type, caption, media_url, privacy_mode, like_count, comment_count, created_at, author:creator_id(display_name)')
          .order('created_at', { ascending: false })
          .limit(100);
        if (contentSearch.trim()) {
          query = query.ilike('caption', `%${contentSearch.trim()}%`);
        }
        const { data } = await query;
        setContent((data as any) ?? []);
      } else if (tab === 'stats') {
        const [usersRes, postsRes, reportsRes, communitiesRes, pendingRes, bansRes] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('posts').select('id', { count: 'exact', head: true }),
          supabase.from('reports').select('id', { count: 'exact', head: true }),
          supabase.from('communities').select('id', { count: 'exact', head: true }),
          supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('user_bans').select('id', { count: 'exact', head: true }),
        ]);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const [newUsersRes, postsTodayRes] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
          supabase.from('posts').select('id', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
        ]);

        setStats({
          users: usersRes.count ?? 0,
          posts: postsRes.count ?? 0,
          reports: reportsRes.count ?? 0,
          communities: communitiesRes.count ?? 0,
          pendingReports: pendingRes.count ?? 0,
          activeBans: bansRes.count ?? 0,
          newUsersToday: newUsersRes.count ?? 0,
          postsToday: postsTodayRes.count ?? 0,
        });

        // Last 7 days user signups
        const days: DailyMetric[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          d.setHours(0, 0, 0, 0);
          const nextD = new Date(d);
          nextD.setDate(nextD.getDate() + 1);
          const { count } = await supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', d.toISOString())
            .lt('created_at', nextD.toISOString());
          days.push({ date: d.toLocaleDateString('en-US', { weekday: 'short' }), count: count ?? 0 });
        }
        setDailyUsers(days);

        try {
          const { data: events } = await supabase.rpc('get_top_events', { days_back: 7 });
          setTopEvents(events ?? []);
        } catch {
          setTopEvents([]);
        }
      } else if (tab === 'revenue') {
        const [campaigns, subs, jobStats, tipStats] = await Promise.all([
          adsService.getAllCampaigns(),
          subscriptionService.getActiveSubscribers(),
          jobPricingService.getRevenueStats(),
          creatorTipsService.getPlatformTipStats(),
        ]);

        const adRevenue = campaigns.reduce((s, c) => s + (c.impressions * c.cpmRate / 1000), 0);
        const adImpressions = campaigns.reduce((s, c) => s + c.impressions, 0);
        const subRevenue = subs.reduce((s, sub) => {
          if (sub.tier === 'pro_monthly') return s + 9.99;
          if (sub.tier === 'pro_yearly') return s + 79.99;
          return s;
        }, 0);

        setRevenueData({
          adCampaigns: campaigns.filter((c) => c.status === 'active').length,
          adImpressions,
          adRevenue,
          subscribers: subs.filter((s) => s.isActive).length,
          subRevenue,
          jobListings: jobStats.activeListings,
          jobRevenue: jobStats.totalRevenue,
          jobByTier: jobStats.byTier,
          tipCount: tipStats.totalTips,
          tipAmount: tipStats.totalAmount,
          uniqueTippers: tipStats.uniqueTippers,
        });
      }
    } catch (e: any) {
      toast.show('Failed to load data', 'error');
    }
    setLoading(false);
  };

  // ─── Report Actions ───
  const handleReportAction = async (report: Report, action: 'action_taken' | 'dismissed' | 'reviewed') => {
    try {
      await supabase
        .from('reports')
        .update({ status: action, reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
        .eq('id', report.id);

      if (action === 'action_taken' && report.target_type === 'post') {
        await supabase.from('posts').update({ privacy_mode: 'private' }).eq('id', report.target_id);
      }

      toast.show(`Report ${action === 'action_taken' ? 'actioned' : action === 'dismissed' ? 'dismissed' : 'reviewed'}`, 'success');
      setSelectedReport(null);
      loadData();
    } catch {
      toast.show('Failed to update report', 'error');
    }
  };

  const handleDeleteContent = async (report: Report) => {
    Alert.alert('Delete Content', 'Permanently delete the reported content?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            if (report.target_type === 'post') {
              await supabase.from('posts').delete().eq('id', report.target_id);
            } else if (report.target_type === 'comment') {
              await supabase.from('comments').delete().eq('id', report.target_id);
            }
            await supabase.from('reports')
              .update({ status: 'action_taken', reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
              .eq('id', report.id);
            toast.show('Content deleted', 'success');
            setSelectedReport(null);
            loadData();
          } catch { toast.show('Failed to delete content', 'error'); }
        },
      },
    ]);
  };

  const handleBanFromReport = async (report: Report) => {
    if (!report.reporter) return;
    const targetUserId = report.target_type === 'profile' ? report.target_id : null;
    if (!targetUserId) {
      toast.show('Can only ban profile reports directly. Use User tab to ban.', 'info');
      return;
    }
    handleBanUser({ id: targetUserId } as any, 'Banned due to reported content');
  };

  // ─── User Actions ───
  const handleBanUser = (userRow: UserRow, defaultReason?: string) => {
    Alert.prompt
      ? Alert.prompt('Ban User', 'Enter ban reason:', async (reason) => {
          if (!reason?.trim()) return;
          await executeBan(userRow.id, reason);
        })
      : Alert.alert('Ban User', `Ban ${userRow.display_name}?`, [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Ban', style: 'destructive', onPress: async () => {
              await executeBan(userRow.id, defaultReason ?? 'Violated community guidelines');
            },
          },
        ]);
  };

  const executeBan = async (targetId: string, reason: string) => {
    try {
      await supabase.from('user_bans').insert({
        user_id: targetId,
        banned_by: user?.id,
        reason,
      });
      toast.show('User banned', 'success');
      setSelectedUser(null);
      loadData();
    } catch { toast.show('Failed to ban user', 'error'); }
  };

  const handleUnbanUser = async (targetId: string) => {
    try {
      await supabase.from('user_bans').delete().eq('user_id', targetId);
      toast.show('User unbanned', 'success');
      loadData();
    } catch { toast.show('Failed to unban', 'error'); }
  };

  const handleToggleAdmin = async (userRow: UserRow) => {
    const newVal = !userRow.role_admin;
    Alert.alert(
      newVal ? 'Grant Admin' : 'Revoke Admin',
      `${newVal ? 'Grant' : 'Revoke'} admin for ${userRow.display_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm', onPress: async () => {
            try {
              await supabase.from('profiles').update({ role_admin: newVal }).eq('id', userRow.id);
              toast.show(`Admin ${newVal ? 'granted' : 'revoked'}`, 'success');
              loadData();
            } catch { toast.show('Failed to update role', 'error'); }
          },
        },
      ]
    );
  };

  const handleToggleVerify = async (userRow: UserRow) => {
    try {
      await supabase.from('profiles').update({ is_verified: !userRow.is_verified }).eq('id', userRow.id);
      toast.show(userRow.is_verified ? 'Verification removed' : 'User verified', 'success');
      loadData();
    } catch { toast.show('Failed to update verification', 'error'); }
  };

  // ─── Content Actions ───
  const handleDeletePost = (post: ContentRow) => {
    Alert.alert('Delete Post', 'Permanently delete this post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await supabase.from('posts').delete().eq('id', post.id);
            toast.show('Post deleted', 'success');
            loadData();
          } catch { toast.show('Failed to delete post', 'error'); }
        },
      },
    ]);
  };

  const handleHidePost = async (post: ContentRow) => {
    const newMode = post.privacy_mode === 'private' ? 'public' : 'private';
    try {
      await supabase.from('posts').update({ privacy_mode: newMode }).eq('id', post.id);
      toast.show(newMode === 'private' ? 'Post hidden' : 'Post restored', 'success');
      loadData();
    } catch { toast.show('Failed to update post', 'error'); }
  };

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: 'reports', label: 'Reports', icon: 'flag-outline' },
    { key: 'users', label: 'Users', icon: 'people-outline' },
    { key: 'content', label: 'Content', icon: 'document-text-outline' },
    { key: 'circles', label: 'Circles', icon: 'globe-outline' },
    { key: 'stats', label: 'Stats', icon: 'bar-chart-outline' },
    { key: 'revenue', label: 'Revenue', icon: 'cash-outline' },
  ];

  const REPORT_FILTERS: { key: ReportFilter; label: string }[] = [
    { key: 'pending', label: 'Pending' },
    { key: 'action_taken', label: 'Actioned' },
    { key: 'dismissed', label: 'Dismissed' },
    { key: 'all', label: 'All' },
  ];

  const renderReportDetail = () => {
    if (!selectedReport) return null;
    const r = selectedReport;
    return (
      <Modal visible={!!selectedReport} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Report Detail</Text>
              <TouchableOpacity onPress={() => setSelectedReport(null)}>
                <Ionicons name="close" size={24} color={colors.dark.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Status</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(r.status), alignSelf: 'flex-start' }]}>
                  <Text style={styles.statusText}>{r.status.replace('_', ' ')}</Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Reason</Text>
                <Text style={styles.detailValue}>{r.reason}</Text>
              </View>

              {r.details && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Details</Text>
                  <Text style={styles.detailValue}>{r.details}</Text>
                </View>
              )}

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Type</Text>
                <Text style={styles.detailValue}>{r.target_type} — {r.target_id.slice(0, 12)}...</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Reporter</Text>
                <Text style={styles.detailValue}>{(r.reporter as any)?.display_name ?? 'Unknown'}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Reported At</Text>
                <Text style={styles.detailValue}>{new Date(r.created_at).toLocaleString()}</Text>
              </View>

              {r.target_content && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Reported Content</Text>
                  <View style={styles.contentPreview}>
                    {r.target_content.media_url && (
                      <Image source={{ uri: r.target_content.media_url }} style={styles.previewImage} />
                    )}
                    <Text style={styles.previewText} numberOfLines={4}>
                      {r.target_content.caption ?? r.target_content.content ?? r.target_content.display_name ?? '—'}
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {r.status === 'pending' && (
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.status.error }]}
                  onPress={() => handleDeleteContent(r)}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.dark.text} />
                  <Text style={styles.modalBtnText}>Delete Content</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.status.warning }]}
                  onPress={() => handleReportAction(r, 'action_taken')}
                >
                  <Ionicons name="eye-off-outline" size={16} color={colors.dark.text} />
                  <Text style={styles.modalBtnText}>Hide Content</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.neutral.midGray }]}
                  onPress={() => handleReportAction(r, 'dismissed')}
                >
                  <Ionicons name="checkmark-outline" size={16} color={colors.dark.text} />
                  <Text style={styles.modalBtnText}>Dismiss</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  const renderUserDetail = () => {
    if (!selectedUser) return null;
    const u = selectedUser;
    return (
      <Modal visible={!!selectedUser} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>User Detail</Text>
              <TouchableOpacity onPress={() => setSelectedUser(null)}>
                <Ionicons name="close" size={24} color={colors.dark.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.userDetailHeader}>
                <View style={styles.userAvatar}>
                  {u.avatar_url ? (
                    <Image source={{ uri: u.avatar_url }} style={styles.avatarImg} />
                  ) : (
                    <Ionicons name="person" size={32} color={colors.neutral.midGray} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.userName}>{u.display_name}</Text>
                    {u.is_verified && <Ionicons name="checkmark-circle" size={16} color={colors.primary.teal} />}
                    {u.role_admin && <View style={styles.adminPill}><Text style={styles.adminPillText}>Admin</Text></View>}
                  </View>
                  <Text style={styles.userMeta}>{u.role} · Joined {new Date(u.created_at).toLocaleDateString()}</Text>
                </View>
              </View>

              <View style={styles.userStatsRow}>
                <View style={styles.userStat}>
                  <Text style={styles.userStatNum}>{u.post_count}</Text>
                  <Text style={styles.userStatLabel}>Posts</Text>
                </View>
                <View style={styles.userStat}>
                  <Text style={styles.userStatNum}>{u.follower_count}</Text>
                  <Text style={styles.userStatLabel}>Followers</Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: u.is_verified ? colors.neutral.midGray : colors.primary.teal }]}
                onPress={() => { handleToggleVerify(u); setSelectedUser(null); }}
              >
                <Ionicons name={u.is_verified ? 'close-circle-outline' : 'checkmark-circle-outline'} size={16} color={colors.dark.text} />
                <Text style={styles.modalBtnText}>{u.is_verified ? 'Unverify' : 'Verify'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: u.role_admin ? colors.status.warning : colors.primary.royal }]}
                onPress={() => { handleToggleAdmin(u); setSelectedUser(null); }}
              >
                <Ionicons name="shield-outline" size={16} color={colors.dark.text} />
                <Text style={styles.modalBtnText}>{u.role_admin ? 'Remove Admin' : 'Make Admin'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.status.error }]}
                onPress={() => handleBanUser(u)}
              >
                <Ionicons name="ban-outline" size={16} color={colors.dark.text} />
                <Text style={styles.modalBtnText}>Ban User</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Panel</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.tabRow}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
            onPress={() => setTab(t.key)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={t.icon as any}
              size={18}
              color={tab === t.key ? colors.dark.text : colors.feed.tabInactive}
            />
            <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>{t.label}</Text>
            {t.key === 'reports' && stats.pendingReports > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{stats.pendingReports > 99 ? '99+' : stats.pendingReports}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.content}>
        {tab === 'reports' && (
          <>
            <View style={styles.filterRow}>
              {REPORT_FILTERS.map((f) => (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.filterChip, reportFilter === f.key && styles.filterChipActive]}
                  onPress={() => setReportFilter(f.key)}
                >
                  <Text style={[styles.filterText, reportFilter === f.key && styles.filterTextActive]}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {loading ? (
              <ActivityIndicator size="large" color={colors.primary.teal} style={{ marginTop: 40 }} />
            ) : (
              <FlatList
                data={reports}
                keyExtractor={(item) => item.id}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary.teal} />}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.card} onPress={() => setSelectedReport(item)} activeOpacity={0.7}>
                    <View style={styles.cardHeader}>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                        <Text style={styles.statusText}>{item.status.replace('_', ' ')}</Text>
                      </View>
                      <Text style={styles.cardDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
                    </View>
                    <Text style={styles.cardTitle}>{item.reason}</Text>
                    <Text style={styles.cardSub}>
                      <Ionicons name={getTargetIcon(item.target_type) as any} size={12} color={colors.neutral.midGray} />
                      {' '}{item.target_type} — {item.target_id.slice(0, 8)}...
                    </Text>
                    {item.target_content && (
                      <Text style={styles.cardDetails} numberOfLines={2}>
                        {item.target_content.caption ?? item.target_content.content ?? item.target_content.display_name}
                      </Text>
                    )}
                    <Text style={styles.cardReporter}>
                      By: {(item.reporter as any)?.display_name ?? 'Unknown'}
                    </Text>
                    {item.status === 'pending' && (
                      <View style={styles.quickActions}>
                        <TouchableOpacity
                          style={[styles.quickBtn, { backgroundColor: 'rgba(239,68,68,0.1)' }]}
                          onPress={(e) => { e.stopPropagation(); handleReportAction(item, 'action_taken'); }}
                        >
                          <Ionicons name="eye-off" size={14} color={colors.status.error} />
                          <Text style={[styles.quickBtnText, { color: colors.status.error }]}>Action</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.quickBtn, { backgroundColor: 'rgba(91,107,127,0.1)' }]}
                          onPress={(e) => { e.stopPropagation(); handleReportAction(item, 'dismissed'); }}
                        >
                          <Ionicons name="checkmark" size={14} color={colors.neutral.midGray} />
                          <Text style={[styles.quickBtnText, { color: colors.neutral.midGray }]}>Dismiss</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </TouchableOpacity>
                )}
                contentContainerStyle={styles.list}
                ListEmptyComponent={<EmptyTab icon="flag-outline" message="No reports found" />}
              />
            )}
          </>
        )}

        {tab === 'users' && (
          <>
            <View style={styles.searchRow}>
              <Ionicons name="search-outline" size={18} color={colors.neutral.midGray} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search users..."
                placeholderTextColor={colors.neutral.midGray}
                value={userSearch}
                onChangeText={setUserSearch}
                onSubmitEditing={loadData}
                returnKeyType="search"
              />
              {userSearch.length > 0 && (
                <TouchableOpacity onPress={() => { setUserSearch(''); setTimeout(loadData, 100); }}>
                  <Ionicons name="close-circle" size={18} color={colors.neutral.midGray} />
                </TouchableOpacity>
              )}
            </View>
            {loading ? (
              <ActivityIndicator size="large" color={colors.primary.teal} style={{ marginTop: 40 }} />
            ) : (
              <FlatList
                data={users}
                keyExtractor={(item) => item.id}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary.teal} />}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.card} onPress={() => setSelectedUser(item)} activeOpacity={0.7}>
                    <View style={styles.userRow}>
                      <View style={styles.userAvatarSmall}>
                        {item.avatar_url ? (
                          <Image source={{ uri: item.avatar_url }} style={styles.avatarSmallImg} />
                        ) : (
                          <Ionicons name="person" size={20} color={colors.neutral.midGray} />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Text style={styles.cardTitle}>{item.display_name}</Text>
                          {item.is_verified && <Ionicons name="checkmark-circle" size={14} color={colors.primary.teal} />}
                          {item.role_admin && <View style={styles.adminTag}><Text style={styles.adminTagText}>Admin</Text></View>}
                        </View>
                        <Text style={styles.cardSub}>
                          {item.role} · {item.post_count} posts · {item.follower_count} followers
                        </Text>
                        <Text style={styles.cardDate}>Joined {new Date(item.created_at).toLocaleDateString()}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.neutral.midGray} />
                    </View>
                  </TouchableOpacity>
                )}
                contentContainerStyle={styles.list}
                ListEmptyComponent={<EmptyTab icon="people-outline" message="No users found" />}
              />
            )}
          </>
        )}

        {tab === 'content' && (
          <>
            <View style={styles.searchRow}>
              <Ionicons name="search-outline" size={18} color={colors.neutral.midGray} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search posts..."
                placeholderTextColor={colors.neutral.midGray}
                value={contentSearch}
                onChangeText={setContentSearch}
                onSubmitEditing={loadData}
                returnKeyType="search"
              />
              {contentSearch.length > 0 && (
                <TouchableOpacity onPress={() => { setContentSearch(''); setTimeout(loadData, 100); }}>
                  <Ionicons name="close-circle" size={18} color={colors.neutral.midGray} />
                </TouchableOpacity>
              )}
            </View>
            {loading ? (
              <ActivityIndicator size="large" color={colors.primary.teal} style={{ marginTop: 40 }} />
            ) : (
              <FlatList
                data={content}
                keyExtractor={(item) => item.id}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary.teal} />}
                renderItem={({ item }) => (
                  <View style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={[styles.typePill, { backgroundColor: getTypeColor(item.type) }]}>
                          <Text style={styles.typePillText}>{item.type}</Text>
                        </View>
                        {item.privacy_mode === 'private' && (
                          <View style={[styles.typePill, { backgroundColor: colors.status.warning }]}>
                            <Text style={styles.typePillText}>Hidden</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.cardDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
                    </View>
                    {item.caption && <Text style={styles.cardTitle} numberOfLines={2}>{item.caption}</Text>}
                    <Text style={styles.cardSub}>
                      By {(item.author as any)?.display_name ?? 'Unknown'} · {item.like_count} likes · {item.comment_count} comments
                    </Text>
                    <View style={styles.quickActions}>
                      <TouchableOpacity
                        style={[styles.quickBtn, { backgroundColor: item.privacy_mode === 'private' ? 'rgba(20,184,166,0.1)' : 'rgba(245,158,11,0.1)' }]}
                        onPress={() => handleHidePost(item)}
                      >
                        <Ionicons name={item.privacy_mode === 'private' ? 'eye-outline' : 'eye-off-outline'} size={14}
                          color={item.privacy_mode === 'private' ? colors.primary.teal : colors.status.warning} />
                        <Text style={[styles.quickBtnText, { color: item.privacy_mode === 'private' ? colors.primary.teal : colors.status.warning }]}>
                          {item.privacy_mode === 'private' ? 'Restore' : 'Hide'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.quickBtn, { backgroundColor: 'rgba(239,68,68,0.1)' }]}
                        onPress={() => handleDeletePost(item)}
                      >
                        <Ionicons name="trash-outline" size={14} color={colors.status.error} />
                        <Text style={[styles.quickBtnText, { color: colors.status.error }]}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                contentContainerStyle={styles.list}
                ListEmptyComponent={<EmptyTab icon="document-text-outline" message="No content found" />}
              />
            )}
          </>
        )}

        {tab === 'stats' && (
          loading ? (
            <ActivityIndicator size="large" color={colors.primary.teal} style={{ marginTop: 40 }} />
          ) : (
            <ScrollView
              contentContainerStyle={styles.statsContainer}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary.teal} />}
            >
              <Text style={styles.sectionTitle}>Overview</Text>
              <View style={styles.statsGrid}>
                <StatCard label="Total Users" value={stats.users} icon="people" color={colors.primary.royal} />
                <StatCard label="Total Posts" value={stats.posts} icon="document-text" color={colors.primary.teal} />
                <StatCard label="Communities" value={stats.communities} icon="globe" color={colors.primary.gold} />
                <StatCard label="Total Reports" value={stats.reports} icon="flag" color={colors.status.error} />
              </View>

              <Text style={styles.sectionTitle}>Today</Text>
              <View style={styles.statsGrid}>
                <StatCard label="New Users" value={stats.newUsersToday} icon="person-add" color={colors.primary.royal} />
                <StatCard label="New Posts" value={stats.postsToday} icon="add-circle" color={colors.primary.teal} />
                <StatCard label="Pending Reports" value={stats.pendingReports} icon="alert-circle" color={colors.status.warning} />
                <StatCard label="Active Bans" value={stats.activeBans} icon="ban" color={colors.status.error} />
              </View>

              <Text style={styles.sectionTitle}>New Users (Last 7 Days)</Text>
              <View style={styles.chartCard}>
                <View style={styles.barChart}>
                  {dailyUsers.map((d, i) => {
                    const maxCount = Math.max(...dailyUsers.map((x) => x.count), 1);
                    const height = (d.count / maxCount) * 80 + 4;
                    return (
                      <View key={i} style={styles.barCol}>
                        <Text style={styles.barValue}>{d.count}</Text>
                        <View style={[styles.bar, { height, backgroundColor: colors.primary.royal }]} />
                        <Text style={styles.barLabel}>{d.date}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              {topEvents.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Top Events (7 Days)</Text>
                  <View style={styles.chartCard}>
                    {topEvents.slice(0, 8).map((ev, i) => (
                      <View key={i} style={styles.eventRow}>
                        <Text style={styles.eventName} numberOfLines={1}>{ev.name}</Text>
                        <View style={styles.eventBarWrap}>
                          <View
                            style={[styles.eventBar, {
                              width: `${Math.max((ev.count / (topEvents[0]?.count || 1)) * 100, 8)}%`,
                              backgroundColor: colors.primary.teal,
                            }]}
                          />
                        </View>
                        <Text style={styles.eventCount}>{ev.count}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </ScrollView>
          )
        )}
        {tab === 'circles' && (
          <View style={{ flex: 1, paddingHorizontal: 16 }}>
            <AdminCirclesPanel />
          </View>
        )}

        {tab === 'revenue' && (
          loading ? (
            <ActivityIndicator size="large" color={colors.status.premium} style={{ marginTop: 40 }} />
          ) : (
            <ScrollView
              contentContainerStyle={styles.statsContainer}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.status.premium} />}
            >
              <Text style={styles.sectionTitle}>Revenue Overview</Text>
              <View style={styles.statsGrid}>
                <StatCard
                  label="Total Revenue"
                  value={`$${(revenueData.adRevenue + revenueData.subRevenue + revenueData.jobRevenue + revenueData.tipAmount * 0.05).toFixed(0)}`}
                  icon="cash"
                  color={colors.status.premium}
                  isText
                />
              </View>

              <Text style={styles.sectionTitle}>Sponsored Posts</Text>
              <View style={styles.statsGrid}>
                <StatCard label="Active Campaigns" value={revenueData.adCampaigns} icon="megaphone" color={colors.primary.royal} />
                <StatCard label="Impressions" value={revenueData.adImpressions} icon="eye" color={colors.primary.teal} />
              </View>
              <View style={styles.statsGrid}>
                <StatCard label="Ad Revenue" value={`$${revenueData.adRevenue.toFixed(2)}`} icon="trending-up" color={colors.status.premium} isText />
              </View>

              <Text style={styles.sectionTitle}>PulseVerse Pro</Text>
              <View style={styles.statsGrid}>
                <StatCard label="Active Subs" value={revenueData.subscribers} icon="diamond" color={colors.status.premium} />
                <StatCard label="Sub Revenue" value={`$${revenueData.subRevenue.toFixed(2)}`} icon="card" color={colors.primary.teal} isText />
              </View>

              <Text style={styles.sectionTitle}>Job Listings</Text>
              <View style={styles.statsGrid}>
                <StatCard label="Active Listings" value={revenueData.jobListings} icon="briefcase" color={colors.primary.royal} />
                <StatCard label="Listing Revenue" value={`$${revenueData.jobRevenue.toFixed(2)}`} icon="cash" color={colors.primary.teal} isText />
              </View>
              {Object.keys(revenueData.jobByTier).length > 0 && (
                <View style={styles.chartCard}>
                  {Object.entries(revenueData.jobByTier).map(([tier, amount]) => (
                    <View key={tier} style={styles.eventRow}>
                      <Text style={styles.eventName}>{tier}</Text>
                      <View style={styles.eventBarWrap}>
                        <View
                          style={[styles.eventBar, {
                            width: `${Math.max((amount / Math.max(...Object.values(revenueData.jobByTier), 1)) * 100, 8)}%`,
                            backgroundColor: colors.primary.royal,
                          }]}
                        />
                      </View>
                      <Text style={styles.eventCount}>${amount}</Text>
                    </View>
                  ))}
                </View>
              )}

              <Text style={styles.sectionTitle}>Creator Tips</Text>
              <View style={styles.statsGrid}>
                <StatCard label="Total Tips" value={revenueData.tipCount} icon="gift" color={colors.status.premium} />
                <StatCard label="Tip Volume" value={`$${revenueData.tipAmount}`} icon="heart" color={colors.status.error} isText />
                <StatCard label="Unique Tippers" value={revenueData.uniqueTippers} icon="people" color={colors.primary.teal} />
                <StatCard label="Platform Fee" value={`$${(revenueData.tipAmount * 0.05).toFixed(2)}`} icon="trending-up" color={colors.status.premium} isText />
              </View>

              <View style={styles.featureFlagSection}>
                <Text style={styles.sectionTitle}>Feature Flags</Text>
                <FlagToggle label="Live streaming (tab + rooms)" flag="liveStreaming" />
                <FlagToggle label="Coin wallet + buy coins (live gifts)" flag="coinWallet" />
                <FlagToggle label="Sponsored Posts" flag="sponsoredPosts" />
                <FlagToggle label="PulseVerse Pro" flag="pulseversePro" />
                <FlagToggle label="Job Pricing Tiers" flag="jobPricingTiers" />
                <FlagToggle label="Creator Tips" flag="creatorTips" />
                <FlagToggle label="Creator Fund" flag="creatorFund" />
              </View>
            </ScrollView>
          )
        )}
      </View>

      {renderReportDetail()}
      {renderUserDetail()}
    </View>
  );
}

function StatCard({ label, value, icon, color, isText }: { label: string; value: number | string; icon: string; color: string; isText?: boolean }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Ionicons name={icon as any} size={22} color={color} />
      <Text style={styles.statValue}>{isText ? value : (value as number).toLocaleString()}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function FlagToggle({ label, flag }: { label: string; flag: keyof ReturnType<typeof useFeatureFlags.getState> }) {
  const value = useFeatureFlags((s) => s[flag]);
  const setFlag = useFeatureFlags((s) => s.setFlag);

  if (typeof value === 'function') return null;

  return (
    <TouchableOpacity
      style={[styles.flagRow, value && styles.flagRowActive]}
      onPress={() => setFlag(flag as any, !value)}
      activeOpacity={0.7}
    >
      <View style={[styles.flagDot, { backgroundColor: value ? colors.status.success : colors.neutral.midGray }]} />
      <Text style={styles.flagLabel}>{label}</Text>
      <Text style={styles.flagStatus}>{value ? 'ON' : 'OFF'}</Text>
    </TouchableOpacity>
  );
}

function EmptyTab({ icon, message }: { icon: string; message: string }) {
  return (
    <View style={styles.emptyWrap}>
      <Ionicons name={icon as any} size={48} color={colors.neutral.midGray} />
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case 'pending': return colors.status.warning;
    case 'action_taken': return colors.status.error;
    case 'dismissed': return colors.neutral.midGray;
    case 'reviewed': return colors.primary.teal;
    default: return colors.neutral.midGray;
  }
}

function getTargetIcon(type: string) {
  switch (type) {
    case 'post': return 'document-text-outline';
    case 'comment': return 'chatbubble-outline';
    case 'profile': return 'person-outline';
    default: return 'help-outline';
  }
}

function getTypeColor(type: string) {
  switch (type) {
    case 'discussion': return colors.primary.royal;
    case 'image': return colors.primary.teal;
    case 'video': return colors.status.error;
    case 'confession': return colors.community.confessions;
    default: return colors.neutral.midGray;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary.navy },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.dark.text },

  tabRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 4, paddingBottom: 12 },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)',
  },
  tabBtnActive: { backgroundColor: colors.primary.royal },
  tabLabel: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
  tabLabelActive: { color: colors.dark.text },
  tabBadge: {
    backgroundColor: colors.status.error, borderRadius: 8,
    paddingHorizontal: 5, paddingVertical: 1, marginLeft: 2,
  },
  tabBadgeText: { color: colors.dark.text, fontSize: 9, fontWeight: '800' },

  content: { flex: 1, backgroundColor: colors.dark.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20 },

  filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  filterChipActive: { backgroundColor: colors.primary.royal, borderColor: colors.primary.royal },
  filterText: { fontSize: 12, fontWeight: '600', color: colors.dark.textMuted },
  filterTextActive: { color: colors.dark.text },

  searchRow: {
    flexDirection: 'row', alignItems: 'center', margin: 16, marginBottom: 8,
    backgroundColor: colors.dark.card, borderRadius: 12, paddingHorizontal: 12, gap: 8,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: colors.dark.text },

  list: { padding: 16, gap: 12, paddingBottom: 32 },
  card: {
    backgroundColor: colors.dark.card, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: colors.dark.border,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700', color: colors.dark.text, textTransform: 'capitalize' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.dark.text },
  cardSub: { fontSize: 13, color: colors.dark.textMuted, marginTop: 2 },
  cardDetails: { fontSize: 13, color: colors.dark.textSecondary, marginTop: 8, fontStyle: 'italic' },
  cardReporter: { fontSize: 12, color: colors.dark.textMuted, marginTop: 8 },
  cardDate: { fontSize: 12, color: colors.dark.textQuiet },

  quickActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  quickBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
  },
  quickBtnText: { fontSize: 12, fontWeight: '600' },

  typePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  typePillText: { fontSize: 10, fontWeight: '700', color: colors.dark.text, textTransform: 'capitalize' },

  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  userAvatarSmall: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.dark.cardAlt,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  avatarSmallImg: { width: 40, height: 40, borderRadius: 20 },
  adminTag: { backgroundColor: colors.primary.royal, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  adminTagText: { fontSize: 9, fontWeight: '800', color: colors.dark.text },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.dark.cardAlt, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '85%', paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: colors.dark.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.dark.text },
  modalBody: { paddingHorizontal: 20, paddingTop: 16 },
  modalActions: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingTop: 16, flexWrap: 'wrap' },
  modalBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
  },
  modalBtnText: { color: colors.dark.text, fontSize: 13, fontWeight: '700' },

  detailSection: { marginBottom: 16 },
  detailLabel: { fontSize: 12, fontWeight: '700', color: colors.dark.textMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailValue: { fontSize: 15, color: colors.dark.text },
  contentPreview: {
    backgroundColor: colors.dark.bg, borderRadius: 12, padding: 12, marginTop: 4,
    borderWidth: 1, borderColor: colors.dark.border,
  },
  previewImage: { width: '100%', height: 120, borderRadius: 8, marginBottom: 8 },
  previewText: { fontSize: 13, color: colors.dark.textSecondary },

  userDetailHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  userAvatar: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: colors.dark.cardAlt,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  avatarImg: { width: 56, height: 56, borderRadius: 28 },
  userName: { fontSize: 18, fontWeight: '800', color: colors.dark.text },
  userMeta: { fontSize: 13, color: colors.dark.textMuted, marginTop: 2 },
  adminPill: { backgroundColor: colors.primary.royal, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  adminPillText: { fontSize: 10, fontWeight: '800', color: colors.dark.text },
  userStatsRow: { flexDirection: 'row', gap: 24, marginBottom: 16 },
  userStat: { alignItems: 'center' },
  userStatNum: { fontSize: 20, fontWeight: '800', color: colors.dark.text },
  userStatLabel: { fontSize: 12, color: colors.dark.textMuted },

  // Stats
  statsContainer: { padding: 16, paddingBottom: 32 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.dark.text, marginBottom: 12, marginTop: 8 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  statCard: {
    backgroundColor: colors.dark.card, borderRadius: 14, padding: 16,
    borderLeftWidth: 4, gap: 4, width: '47%', flexGrow: 1,
  },
  statValue: { fontSize: 28, fontWeight: '900', color: colors.dark.text },
  statLabel: { fontSize: 12, color: colors.dark.textMuted, fontWeight: '500' },

  chartCard: {
    backgroundColor: colors.dark.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  barChart: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  barCol: { alignItems: 'center', flex: 1 },
  bar: { width: 20, borderRadius: 4, minHeight: 4 },
  barValue: { fontSize: 10, fontWeight: '700', color: colors.dark.text, marginBottom: 4 },
  barLabel: { fontSize: 10, color: colors.dark.textMuted, marginTop: 4 },

  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  eventName: { width: 100, fontSize: 12, color: colors.dark.textSecondary, fontWeight: '500' },
  eventBarWrap: { flex: 1, height: 16, backgroundColor: colors.dark.cardAlt, borderRadius: 4, overflow: 'hidden' },
  eventBar: { height: '100%', borderRadius: 4 },
  eventCount: { width: 36, fontSize: 12, fontWeight: '700', color: colors.dark.text, textAlign: 'right' },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 80 },
  emptyText: { textAlign: 'center', color: colors.dark.textMuted, fontSize: 15 },

  featureFlagSection: { marginTop: 8, marginBottom: 16 },
  flagRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.dark.card, borderRadius: 12, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: colors.dark.border,
  },
  flagRowActive: { borderColor: colors.status.success + '40' },
  flagDot: { width: 10, height: 10, borderRadius: 5 },
  flagLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.dark.text },
  flagStatus: { fontSize: 12, fontWeight: '800', color: colors.dark.textMuted },
});
