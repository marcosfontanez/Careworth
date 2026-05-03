import React, { useCallback } from 'react';
import { Linking } from 'react-native';
import { useRouter } from 'expo-router';
import type { Post, ProfileUpdate } from '@/types';
import { getMyPulseDisplayType } from '@/utils/myPulseDisplayType';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { MyPulseThoughtCard } from './cards/MyPulseThoughtCard';
import { MyPulseClipCard } from './cards/MyPulseClipCard';
import { MyPulseLinkCard } from './cards/MyPulseLinkCard';
import { MyPulsePicsCard } from './cards/MyPulsePicsCard';
import { MyPulseCircleCard } from './cards/MyPulseCircleCard';

function postMediaPreviewUri(post: Post | undefined): string | null {
  if (!post) return null;
  const t =
    post.thumbnailUrl?.trim() ||
    post.coverAltUrl?.trim() ||
    (post.type === 'image' ? post.mediaUrl?.trim() : null);
  return t || null;
}

type Props = {
  update: ProfileUpdate;
  /** Reserved for future themed accents. */
  accent?: string;
  onDelete: (id: string) => Promise<void>;
  /**
   * Pin / unpin this update. Only exposed to the owner (readOnly = false).
   * The second arg is the desired next state so the card can call the
   * right action regardless of its own `isPinned` value at tap time.
   */
  onTogglePin?: (id: string, pin: boolean) => Promise<void>;
  /**
   * Owner-only edit hook. The section owns the mutation + cache
   * reconciliation; this is just the id + new body passthrough. Passed
   * through to card components for types whose body is primarily text.
   * Omit to disable editing (e.g. read-only visits).
   */
  onEdit?: (id: string, nextContent: string) => Promise<void>;
  /**
   * Toggle the viewer's Pulse (heart) on this card. The section owns the
   * optimistic cache update, mutation, and rollback — this is just the
   * id passthrough so each card stays presentational.
   */
  onLike?: (id: string) => void;
  /**
   * Open the comment surface for this card. Defaults to routing into
   * `/my-pulse/[id]` at the call site; the section wires this up.
   */
  onComment?: (id: string) => void;
  readOnly?: boolean;
  resolveLinkedPost?: (postId: string) => Post | undefined;
};

/**
 * Router that picks the correct My Pulse card for an update. Display-type
 * logic lives in `utils/myPulseDisplayType.ts` so the composer, cards, and
 * timeline all agree on the same four-type vocabulary.
 */
export function MyPulseItemCard({
  update: u,
  onDelete,
  onTogglePin,
  onEdit,
  onLike,
  onComment,
  readOnly,
  resolveLinkedPost,
}: Props) {
  const router = useRouter();
  const displayType = getMyPulseDisplayType(u);

  const handleDelete = useCallback(async () => {
    await onDelete(u.id);
  }, [onDelete, u.id]);

  /**
   * Stable per-card edit handler — binds the card id so the shell can
   * call `onEdit(nextContent)` without ever learning about the row's
   * id. Returns the inner promise so the modal can surface a retry
   * state when the server write fails.
   */
  const handleEdit = useCallback(
    async (nextContent: string) => {
      if (!onEdit) return;
      await onEdit(u.id, nextContent);
    },
    [onEdit, u.id],
  );

  /**
   * Flip the pin state for this card. We compute the target state from
   * the current `isPinned` flag at click time so repeated taps keep the
   * toggle semantics obvious even if the prop lags by a render.
   */
  const handleTogglePin = useCallback(async () => {
    if (!onTogglePin) return;
    await onTogglePin(u.id, !u.isPinned);
  }, [onTogglePin, u.id, u.isPinned]);

  const handleLike = useCallback(() => {
    onLike?.(u.id);
  }, [onLike, u.id]);

  const handleComment = useCallback(() => {
    onComment?.(u.id);
  }, [onComment, u.id]);

  const openSource = useCallback(() => {
    if (u.linkedPostId) {
      /**
       * Pinning a feed clip (or a Circle post) to My Pulse MUST feel
       * like bookmarking, not reposting. Tapping the pin on a profile
       * should land the viewer on the ORIGINAL post in the feed-style
       * fullscreen viewer (`/feed/[id]`) — which plays the video,
       * exposes the real like/comment/share/follow rail, and writes
       * through to the same backend tables the main feed uses. This
       * is the "redirect me to the original video" experience users
       * expect when they tap a clip card on a Pulse page.
       *
       * Pass the Circle slug through as a query param when the pin
       * came from a room post so the viewer keeps the Circle
       * attribution (accent color, anonymous masking) once they
       * share back out from the fullscreen shell.
       */
      const qs = u.linkedCircleSlug?.trim()
        ? `?circle=${encodeURIComponent(u.linkedCircleSlug.trim())}`
        : '';
      router.push(`/feed/${u.linkedPostId}${qs}` as any);
      return;
    }
    /**
     * Pure Circles discussion pins (no linked feed post) → drop into
     * the exact thread inside the Circle so visitors can read the
     * full conversation and reply in context.
     */
    if (u.linkedThreadId && u.linkedCircleSlug) {
      router.push(
        `/communities/${u.linkedCircleSlug}/thread/${u.linkedThreadId}` as any,
      );
      return;
    }
    if (u.linkedCircleSlug) {
      router.push(`/communities/${u.linkedCircleSlug}` as any);
      return;
    }
    if (u.linkedLiveId && isFeatureEnabled('liveStreaming')) {
      router.push(`/live/${u.linkedLiveId}` as any);
      return;
    }
    if (u.linkedUrl?.trim()) {
      const raw = u.linkedUrl.trim();
      const href = raw.startsWith('http') ? raw : `https://${raw}`;
      Linking.openURL(href).catch(() => undefined);
      return;
    }
    router.push(`/my-pulse/${u.id}` as any);
  }, [router, u]);

  /**
   * Types where editing the body from the Pulse card is meaningful.
   * Clips and Circles pin a foreign resource (a feed video / a Circles
   * thread) — the "body" lives on the linked resource, not on the
   * Pulse row itself, so rewriting the Pulse-side note would just be
   * shouting into the void. Keeping those types non-editable avoids
   * confusing viewers who'd see the pinned title drift from the source.
   */
  const editableTypes = new Set(['thought', 'pics', 'link']);
  const canEditBody = !!onEdit && !readOnly && editableTypes.has(displayType);
  const editContent = canEditBody
    ? (u.previewText?.trim() || u.content || '')
    : undefined;
  const forwardedOnEdit = canEditBody ? handleEdit : undefined;
  const wasEdited = !!u.editedAt;

  switch (displayType) {
    case 'circle': {
      const linkedPost = u.linkedPostId ? resolveLinkedPost?.(u.linkedPostId) : undefined;
      return (
        <MyPulseCircleCard
          update={u}
          linkedPostMediaUrl={postMediaPreviewUri(linkedPost)}
          onDelete={handleDelete}
          onTogglePin={onTogglePin ? handleTogglePin : undefined}
          onLike={handleLike}
          onComment={handleComment}
          readOnly={readOnly}
          onPress={openSource}
        />
      );
    }
    case 'clip': {
      const linkedPost = u.linkedPostId ? resolveLinkedPost?.(u.linkedPostId) : undefined;
      const thumbnail = u.mediaThumb;

      const sourceLabel =
        u.type === 'link_live'
          ? 'From Live'
          : u.type === 'link_post'
            ? 'From Feed'
            : 'PulseVerse';

      /**
       * Surface the ORIGINAL post's live engagement (likes, comments) on
       * the pin card when we can resolve it — that way the viewer sees the
       * same numbers they'll see after tapping through, making the pin
       * feel like a bookmark of a real feed post rather than a fresh
       * standalone post with zeroed counts. Fall back to the pin's own
       * counts when the post failed to resolve (offline / deleted source).
       */
      const engagementSummary = linkedPost
        ? { likes: linkedPost.likeCount, comments: linkedPost.commentCount }
        : { likes: u.likeCount, comments: u.commentCount };

      return (
        <MyPulseClipCard
          update={u}
          thumbnail={thumbnail}
          linkedPost={linkedPost}
          sourceLabel={sourceLabel}
          engagementSummary={engagementSummary}
          onDelete={handleDelete}
          onTogglePin={onTogglePin ? handleTogglePin : undefined}
          onLike={handleLike}
          onComment={handleComment}
          readOnly={readOnly}
          onPress={openSource}
        />
      );
    }
    case 'link':
      return (
        <MyPulseLinkCard
          update={u}
          onDelete={handleDelete}
          onTogglePin={onTogglePin ? handleTogglePin : undefined}
          onLike={handleLike}
          onComment={handleComment}
          readOnly={readOnly}
          onEdit={forwardedOnEdit}
          editContent={editContent}
          wasEdited={wasEdited}
        />
      );
    case 'pics':
      return (
        <MyPulsePicsCard
          update={u}
          onDelete={handleDelete}
          onTogglePin={onTogglePin ? handleTogglePin : undefined}
          onLike={handleLike}
          onComment={handleComment}
          readOnly={readOnly}
          onPress={openSource}
          onEdit={forwardedOnEdit}
          editContent={editContent}
          wasEdited={wasEdited}
        />
      );
    case 'thought':
    default:
      return (
        <MyPulseThoughtCard
          update={u}
          onDelete={handleDelete}
          onTogglePin={onTogglePin ? handleTogglePin : undefined}
          onLike={handleLike}
          onComment={handleComment}
          readOnly={readOnly}
          onPress={openSource}
          onEdit={forwardedOnEdit}
          editContent={editContent}
          wasEdited={wasEdited}
        />
      );
  }
}
