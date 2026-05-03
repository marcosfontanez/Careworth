import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, RefreshControl, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CommentItem } from '@/components/cards/CommentItem';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { StackScreenHeader } from '@/components/ui/StackScreenHeader';
import { ReportModal } from '@/components/ui/ReportModal';
import { useComments, usePost } from '@/hooks/useQueries';
import { commentService } from '@/services/comment';
import { queryClient } from '@/lib/queryClient';
import { commentKeys, postKeys } from '@/lib/queryKeys';
import { checkRateLimit } from '@/lib/rateLimit';
import { analytics } from '@/lib/analytics';
import { enqueueAction } from '@/lib/offlineQueue';
import { bumpPostCount } from '@/lib/postCacheUpdates';
import { borderRadius, colors, iconSize, layout, spacing, typography } from '@/theme';
import { useAuth } from '@/contexts/AuthContext';
import { postShouldMaskIdentity } from '@/lib/anonymousCircle';
import { MentionAutocomplete } from '@/components/ui/MentionAutocomplete';
import { COMMENT_MAX_LENGTH } from '@/constants';

function asParamString(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

export default function CommentsScreen() {
  const raw = useLocalSearchParams<{ postId: string | string[]; circle?: string | string[] }>();
  const postId = asParamString(raw.postId);
  const circle = asParamString(raw.circle);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { data: comments = [], isPending, refetch } = useComments(postId ?? '');
  const { data: post } = usePost(postId ?? '', { enabled: !!postId });
  const maskAuthors = postShouldMaskIdentity({ isAnonymous: post?.isAnonymous === true }, circle);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [reportCommentId, setReportCommentId] = useState<string | null>(null);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleSend = async () => {
    if (!postId) return;
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    if (!user) {
      Alert.alert('Sign in required', 'Log in to post a comment.');
      return;
    }
    if (!checkRateLimit('comment')) return;

    /** Defensive cap — TextInput maxLength keeps live typing inside the
     *  limit, but we re-cap the trimmed payload so any paste-edit race
     *  or future code path that bypasses the input still respects the
     *  app-wide 300 char ceiling. Same belt-and-suspenders pattern used
     *  in the post detail composer. */
    const safe = trimmed.slice(0, COMMENT_MAX_LENGTH);

    setSending(true);
    try {
      await commentService.addComment(postId, safe, replyTo?.id);
      analytics.track('comment_created', { postId, isReply: !!replyTo });
      setText('');
      setReplyTo(null);
      /**
       * Optimistically bump every cached copy of this post's commentCount
       * so the feed rail, the single-post screen, and anywhere else
       * rendering the same Post object all tick instantly without forcing
       * a feed refetch (which would flash the active video on Android).
       * The DB trigger on `comments` (migration 055) is still the source
       * of truth; this is purely a UI reconciliation.
       */
      bumpPostCount(postId, 'commentCount', 1);
      queryClient.invalidateQueries({ queryKey: commentKeys.byPost(postId) });
      queryClient.invalidateQueries({ queryKey: postKeys.byId(postId) });
    } catch (e: any) {
      /**
       * Comment send failed (network blip, server error, RLS hiccup, etc.).
       * Queue the comment so processQueue() can replay it on reconnect, and
       * tell the user it'll go out automatically -- this is far better UX
       * than losing what they typed and having to retype it.
       */
      try {
        await enqueueAction({
          type: 'create_comment',
          payload: {
            postId,
            userId: user.id,
            content: safe,
            parentId: replyTo?.id ?? null,
          },
        });
        setText('');
        setReplyTo(null);
        Alert.alert('Saved', 'Network hiccup — your comment will post automatically once you’re back online.');
      } catch {
        Alert.alert('Comment failed', e?.message ?? 'Could not post your comment.');
      }
    }
    setSending(false);
  };

  const remaining = COMMENT_MAX_LENGTH - text.length;
  const nearLimit = remaining <= 30;

  const handleReply = (commentId: string, authorName: string) => {
    setReplyTo({ id: commentId, name: authorName });
  };

  const title = post ? `Comments (${post.commentCount})` : 'Comments';

  if (!postId) {
    return (
      <View style={styles.container}>
        <StackScreenHeader
          insetTop={insets.top}
          title="Comments"
          onPressLeft={() => router.back()}
          leftIcon="close"
          leftAccessibilityLabel="Close"
        />
        <EmptyState
          icon="⚠️"
          title="Missing post"
          subtitle="This comment link is invalid. Go back and try again."
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 52 : 0}
    >
      <StackScreenHeader
        insetTop={insets.top}
        title={title}
        onPressLeft={() => router.back()}
        leftIcon="close"
        leftAccessibilityLabel="Close"
      />

      {isPending ? (
        <LoadingState />
      ) : (
        <FlatList
          style={styles.listFlex}
          data={comments}
          keyExtractor={(item) => item.id}
          /** Clipping + virtualization hides multiline edit fields mid-edit on Android. */
          removeClippedSubviews={false}
          renderItem={({ item }) => (
            <CommentItem
              comment={item}
              anonymousMode={maskAuthors}
              saltPostId={postId}
              onReply={(id, name) => handleReply(id, name)}
              onReport={(cid) => setReportCommentId(cid)}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <EmptyState icon="💬" title="No comments yet" subtitle="Be the first to share your thoughts!" />
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary.teal} />
          }
        />
      )}

      {replyTo && (
        <View style={styles.replyBar}>
          <Text style={styles.replyText}>Replying to {replyTo.name}</Text>
          <TouchableOpacity onPress={() => setReplyTo(null)} activeOpacity={0.7}>
            <Ionicons name="close-circle" size={18} color={colors.dark.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.inputBar, { paddingBottom: insets.bottom + spacing.sm }]}>
        <View style={{ flex: 1 }}>
          <MentionAutocomplete
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder={replyTo ? `Reply to ${replyTo.name}...` : 'Add a comment...'}
            placeholderTextColor={colors.dark.textMuted}
            multiline
            textAlignVertical="top"
            scrollEnabled
            maxLength={COMMENT_MAX_LENGTH}
          />
          {/* Char counter — hidden until the user starts typing so the bar
              stays minimal at rest, then turns teal at the danger zone to
              signal the cap is approaching. */}
          {text.length > 0 ? (
            <Text
              style={[
                styles.counter,
                nearLimit && styles.counterNear,
              ]}
              accessibilityLiveRegion="polite"
            >
              {text.length}/{COMMENT_MAX_LENGTH}
            </Text>
          ) : null}
        </View>
        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || sending) && styles.sendDisabled]}
          disabled={!text.trim() || sending}
          onPress={handleSend}
          activeOpacity={0.7}
        >
          <Ionicons
            name="send"
            size={iconSize.md}
            color={text.trim() && !sending ? colors.primary.teal : colors.dark.textMuted}
          />
        </TouchableOpacity>
      </View>
      <ReportModal
        visible={!!reportCommentId}
        onClose={() => setReportCommentId(null)}
        targetType="comment"
        targetId={reportCommentId ?? ''}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  /** Required so FlatList gets a bounded height inside KeyboardAvoidingView; without it some Android builds virtualize poorly and the UI can feel frozen. */
  listFlex: { flex: 1 },
  list: { paddingHorizontal: layout.screenPadding, paddingBottom: spacing.lg },
  replyBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary.teal + '12',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.primary.teal + '35',
  },
  replyText: { ...typography.bodySmall, color: colors.primary.teal, fontWeight: '600' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.dark.border,
    backgroundColor: colors.dark.bg,
  },
  input: {
    flex: 1,
    backgroundColor: colors.dark.card,
    borderRadius: borderRadius.sheet / 2,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    fontSize: 14,
    color: colors.dark.text,
    minHeight: 44,
    maxHeight: 100,
    textAlignVertical: 'top',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.dark.border,
  },
  sendBtn: { padding: spacing.sm },
  sendDisabled: { opacity: 0.4 },
  counter: {
    alignSelf: 'flex-end',
    marginTop: 4,
    marginRight: 4,
    fontSize: 11,
    color: colors.dark.textMuted,
    fontVariant: ['tabular-nums'],
  },
  counterNear: {
    color: colors.primary.teal,
    fontWeight: '700',
  },
});
