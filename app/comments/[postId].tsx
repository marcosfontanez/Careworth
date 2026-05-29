import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PostCommentThread } from '@/components/comments/PostCommentThread';
import { EmptyState } from '@/components/ui/EmptyState';
import { StackScreenHeader } from '@/components/ui/StackScreenHeader';
import { KeyboardAwareRoot } from '@/components/ui/KeyboardAwareRoot';
import { usePost } from '@/hooks/useQueries';
import { colors } from '@/theme';

function asParamString(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

/**
 * Full-screen comments route — kept for notifications, deep links, Saved comment
 * button, and accessibility fallback. Feed viewers use {@link FeedCommentsSheet}.
 */
export default function CommentsScreen() {
  const raw = useLocalSearchParams<{ postId: string | string[]; circle?: string | string[] }>();
  const postId = asParamString(raw.postId);
  const circle = asParamString(raw.circle);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: post } = usePost(postId ?? '', { enabled: !!postId });

  const title = useMemo(() => {
    if (!post) return 'Comments';
    return `Comments (${post.commentCount})`;
  }, [post]);

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
    <KeyboardAwareRoot style={styles.container} keyboardVerticalOffset={insets.top + 52}>
      <StackScreenHeader
        insetTop={insets.top}
        title={title}
        onPressLeft={() => router.back()}
        leftIcon="close"
        leftAccessibilityLabel="Close"
      />
      <PostCommentThread
        postId={postId}
        post={post}
        circleSlug={circle ?? null}
        showMediaHeader
      />
    </KeyboardAwareRoot>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
});
