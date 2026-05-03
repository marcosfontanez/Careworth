import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { AvatarDisplay, pulseFrameFromUser } from '@/components/profile/AvatarBuilder';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCircleThread, useCircleThreadReplies, useCommunity } from '@/hooks/useQueries';
import { LoadingState } from '@/components/ui/LoadingState';
import { CircleReplyItem } from '@/components/circles/CircleReplyItem';
import { ShareToMyPulseButton } from '@/components/circles/ShareToMyPulseButton';
import { ReportModal } from '@/components/ui/ReportModal';
import { useAuth } from '@/contexts/AuthContext';
import { colors, borderRadius } from '@/theme';
import { formatCount, timeAgo } from '@/utils/format';
import type { CircleReply, CircleThreadKind, CreatorSummary } from '@/types';
import { circleContentService } from '@/services/circleContent';
import { shareCircleThread } from '@/lib/share';
import { setThreadReadReplyCount } from '@/lib/circleExperience';
import { enqueueAction } from '@/lib/offlineQueue';
import { MentionAutocomplete } from '@/components/ui/MentionAutocomplete';
import { CommentRichText } from '@/components/ui/CommentRichText';
import { anonymousDisplayName, isAnonymousConfessionCircle } from '@/lib/anonymousCircle';

const KIND_LABEL: Record<CircleThreadKind, string> = {
  question: 'Question',
  story: 'Discussion',
  advice: 'Advice',
  meme: 'Meme',
  media: 'Media',
};

export default function CircleThreadDetailScreen() {
  const { slug: slugRaw, threadId: threadIdRaw } = useLocalSearchParams<{ slug: string; threadId: string }>();
  const slug = Array.isArray(slugRaw) ? slugRaw[0] : slugRaw;
  const threadId = Array.isArray(threadIdRaw) ? threadIdRaw[0] : threadIdRaw;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { data: thread, isLoading, refetch } = useCircleThread(threadId);
  const { data: community } = useCommunity(slug);
  const { data: replies = [], refetch: refetchReplies } = useCircleThreadReplies(threadId);
  const [refreshing, setRefreshing] = useState(false);
  const [draft, setDraft] = useState('');
  const [reportOpen, setReportOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!threadId || !thread) return;
      void setThreadReadReplyCount(threadId, thread.replyCount);
    }, [threadId, thread?.replyCount, thread?.id]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchReplies()]);
    setRefreshing(false);
  }, [refetch, refetchReplies]);

  if (isLoading) return <LoadingState />;
  if (!thread) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.errTitle}>Thread unavailable</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backLinkText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  const author: CreatorSummary =
    thread.author ?? {
      id: thread.authorId,
      displayName: 'Member',
      avatarUrl: '',
      role: 'RN',
      specialty: 'General',
      city: '',
      state: '',
      isVerified: false,
    };

  const isAnonRoom = isAnonymousConfessionCircle(slug);
  const anonName = anonymousDisplayName(thread.authorId, thread.id);
  const threadDisplayName = isAnonRoom ? anonName : author.displayName;

  const accent = community?.accentColor ?? colors.primary.teal;
  const circleName = community?.name ?? thread.circleSlug;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top + 8}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color={colors.dark.text} />
        </TouchableOpacity>
        <View style={styles.headerMid}>
          <Text style={styles.headerCircle} numberOfLines={1}>
            {circleName}
          </Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            Thread · {formatCount(thread.replyCount)} replies
          </Text>
        </View>
        <View style={styles.headerActions}>
          {!isAnonRoom ? (
            <TouchableOpacity
              onPress={() => shareCircleThread(slug, threadId, thread.title)}
              style={styles.iconBtn}
              hitSlop={8}
              accessibilityLabel="Share discussion"
            >
              <Ionicons name="share-outline" size={22} color={colors.dark.text} />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            onPress={() => setReportOpen(true)}
            style={styles.iconBtn}
            hitSlop={8}
            accessibilityLabel="Report discussion"
          >
            <Ionicons name="flag-outline" size={22} color={colors.dark.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent} />
        }
      >
        <View style={[styles.hero, { borderLeftColor: accent + 'CC' }]}>
          <View style={styles.authorRow}>
            {isAnonRoom ? (
              <View style={[styles.avatar, styles.anonAvatar]}>
                <Ionicons name="eye-off-outline" size={22} color={colors.dark.textMuted} />
              </View>
            ) : (
              author.id ? (
                <TouchableOpacity
                  onPress={() => router.push(`/profile/${author.id}` as never)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Open profile"
                >
                  <AvatarDisplay
                    size={40}
                    avatarUrl={author.avatarUrl}
                    prioritizeRemoteAvatar
                    ringColor={colors.dark.border}
                    pulseFrame={pulseFrameFromUser(author.pulseAvatarFrame)}
                  />
                </TouchableOpacity>
              ) : (
                <AvatarDisplay
                  size={40}
                  avatarUrl={author.avatarUrl}
                  prioritizeRemoteAvatar
                  ringColor={colors.dark.border}
                  pulseFrame={pulseFrameFromUser(author.pulseAvatarFrame)}
                />
              )
            )}
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={styles.nameRow}>
                <Text style={styles.displayName}>{threadDisplayName}</Text>
                {!isAnonRoom && author.isVerified ? (
                  <Ionicons name="checkmark-circle" size={14} color={colors.primary.teal} />
                ) : null}
              </View>
              <Text style={styles.meta}>
                {isAnonRoom
                  ? `Anonymous · thread starter · ${timeAgo(thread.createdAt)}`
                  : `${author.role}${author.specialty ? ` · ${author.specialty}` : ''} · ${timeAgo(thread.createdAt)}`}
              </Text>
            </View>
          </View>

          <View style={styles.pillRow}>
            <View style={[styles.kindPill, { borderColor: accent + '55' }]}>
              <Text style={[styles.kindText, { color: accent }]}>{KIND_LABEL[thread.kind]}</Text>
            </View>
          </View>

          <Text style={styles.title}>{thread.title}</Text>
          <CommentRichText
            text={thread.body}
            style={styles.body}
            mentionsInteractive={!isAnonRoom}
            linksInteractive={!isAnonRoom}
          />

          {thread.mediaThumbUrl ? (
            <Image source={{ uri: thread.mediaThumbUrl }} style={styles.heroThumb} contentFit="cover" />
          ) : null}

          <View style={styles.statRow}>
            <View style={styles.stat}>
              <Ionicons name="chatbubbles-outline" size={16} color={colors.dark.textMuted} />
              <Text style={styles.statTxt}>{formatCount(thread.replyCount)}</Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="heart-outline" size={16} color={colors.dark.textMuted} />
              <Text style={styles.statTxt}>{formatCount(thread.reactionCount)}</Text>
            </View>
          </View>

          {!isAnonRoom ? (
            <View style={styles.my5Banner}>
              <ShareToMyPulseButton circleSlug={thread.circleSlug} thread={thread} layout="full" />
            </View>
          ) : null}
        </View>

        <Text style={styles.repliesHead}>Replies ({replies.length})</Text>
        {replies
          .filter(
            (r): r is CircleReply =>
              r != null && typeof r === 'object' && typeof r.id === 'string',
          )
          .map((r) => (
            <CircleReplyItem
              key={r.id}
              reply={r}
              circleSlug={slug}
              threadAuthorId={thread.authorId}
              threadId={thread.id}
            />
          ))}
      </ScrollView>

      <View style={[styles.composer, { paddingBottom: insets.bottom + 12 }]}>
        <MentionAutocomplete
          style={styles.input}
          placeholder="Add a reply…"
          placeholderTextColor={colors.dark.textMuted}
          value={draft}
          onChangeText={setDraft}
          multiline
          textAlignVertical="top"
          scrollEnabled
        />
        <TouchableOpacity
          style={[styles.sendBtn, !draft.trim() && styles.sendOff]}
          disabled={!draft.trim()}
          onPress={async () => {
            const text = draft.trim();
            if (!text) return;
            if (!user) {
              Alert.alert('Sign in required', 'Sign in to join this discussion.');
              return;
            }
            try {
              await circleContentService.addReply(thread.id, text);
              setDraft('');
              await Promise.all([refetchReplies(), refetch()]);
              await setThreadReadReplyCount(thread.id, thread.replyCount + 1);
            } catch (e: any) {
              try {
                await enqueueAction({
                  type: 'circle_thread_reply',
                  payload: { threadId: thread.id, userId: user.id, body: text },
                });
                setDraft('');
                Alert.alert(
                  'Reply queued',
                  'Network hiccup — your reply will post automatically once you’re back online.',
                );
              } catch {
                Alert.alert('Reply failed', e?.message ?? 'Could not send your reply.');
              }
            }
          }}
        >
          <Ionicons name="send" size={18} color={draft.trim() ? '#FFF' : colors.dark.textMuted} />
        </TouchableOpacity>
      </View>

      <ReportModal
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="circle_thread"
        targetId={threadId}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.dark.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errTitle: { fontSize: 17, fontWeight: '700', color: colors.dark.text },
  backLink: { marginTop: 12 },
  backLinkText: { fontSize: 15, fontWeight: '700', color: colors.primary.teal },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dark.border,
    backgroundColor: colors.dark.bg,
  },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  headerMid: { flex: 1, alignItems: 'center' },
  headerCircle: { fontSize: 13, fontWeight: '800', color: colors.primary.teal },
  headerSub: { fontSize: 11, color: colors.dark.textMuted, marginTop: 2 },
  scroll: { flex: 1 },
  hero: {
    margin: 12,
    padding: 16,
    borderRadius: borderRadius.card,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderLeftWidth: 4,
  },
  authorRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.dark.cardAlt },
  anonAvatar: { alignItems: 'center', justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  displayName: { fontSize: 16, fontWeight: '800', color: colors.dark.text },
  meta: { fontSize: 12, color: colors.dark.textMuted, marginTop: 4 },
  pillRow: { flexDirection: 'row', marginBottom: 10 },
  kindPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.chip,
    borderWidth: 1,
    backgroundColor: colors.dark.bg,
  },
  kindText: { fontSize: 11, fontWeight: '800' },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.dark.text,
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  body: { fontSize: 15, lineHeight: 22, color: colors.dark.textSecondary },
  heroThumb: {
    marginTop: 14,
    height: 200,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.dark.cardAlt,
  },
  statRow: { flexDirection: 'row', gap: 20, marginTop: 16 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statTxt: { fontSize: 14, fontWeight: '700', color: colors.dark.text },
  my5Banner: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.dark.border,
  },
  repliesHead: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.dark.text,
    paddingHorizontal: 16,
    marginBottom: 4,
    marginTop: 8,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.dark.border,
    backgroundColor: colors.dark.card,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.dark.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.dark.text,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendOff: { backgroundColor: colors.dark.cardAlt },
});
