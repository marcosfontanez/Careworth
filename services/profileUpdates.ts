import type {
  EligibleCircleDiscussion,
  Post,
  ProfileUpdate,
  ProfileUpdateComment,
  ProfileUpdateType,
} from '@/types';
import { profileUpdatesDb, type AddProfileUpdateRow } from '@/services/supabase/profileUpdatesDb';

export type AddProfileUpdatePayload = {
  type: ProfileUpdateType;
  content: string;
  previewText?: string;
  mood?: string;
  linkedPostId?: string;
  linkedCircleId?: string;
  linkedCircleSlug?: string;
  linkedDiscussionTitle?: string;
  linkedThreadId?: string;
  linkedLiveId?: string;
  mediaThumb?: string;
  linkedUrl?: string;
  picsUrls?: string[];
};

function toRowPayload(payload: AddProfileUpdatePayload): AddProfileUpdateRow {
  return {
    type: payload.type,
    content: payload.content,
    preview_text: payload.previewText ?? null,
    mood: payload.mood ?? null,
    linked_post_id: payload.linkedPostId ?? null,
    linked_circle_id: payload.linkedCircleId ?? null,
    linked_circle_slug: payload.linkedCircleSlug ?? null,
    linked_discussion_title: payload.linkedDiscussionTitle ?? null,
    linked_thread_id: payload.linkedThreadId ?? null,
    linked_live_id: payload.linkedLiveId ?? null,
    media_thumb: payload.mediaThumb ?? null,
    linked_url: payload.linkedUrl ?? null,
    pics_urls: payload.picsUrls && payload.picsUrls.length > 0 ? payload.picsUrls : null,
  };
}

export const profileUpdatesService = {
  async getLatestForUser(
    userId: string,
    limit = 5,
    viewerId?: string | null,
  ): Promise<ProfileUpdate[]> {
    return profileUpdatesDb.listForUser(userId, limit, viewerId);
  },

  async getById(
    id: string,
    viewerId?: string | null,
  ): Promise<ProfileUpdate | undefined> {
    const row = await profileUpdatesDb.getById(id, viewerId);
    return row ?? undefined;
  },

  async getEligiblePostsForLinking(userId: string): Promise<Post[]> {
    return profileUpdatesDb.eligiblePosts(userId);
  },

  async getEligibleCircleDiscussionsForLinking(userId: string): Promise<EligibleCircleDiscussion[]> {
    return profileUpdatesDb.eligibleCircleDiscussions(userId);
  },

  async add(userId: string, payload: AddProfileUpdatePayload): Promise<ProfileUpdate> {
    return profileUpdatesDb.insert(userId, toRowPayload(payload));
  },

  async deleteForUser(updateId: string, userId: string): Promise<boolean> {
    return profileUpdatesDb.deleteForUser(updateId, userId);
  },

  /**
   * Pin a single profile update to the top of its owner's My Pulse.
   * Only one pin per user is allowed server-side; any previously pinned
   * row is cleared atomically by the RPC, so callers don't need to
   * toggle manually.
   */
  async pin(updateId: string): Promise<void> {
    return profileUpdatesDb.pin(updateId);
  },

  /** Remove the pin from a profile update. Safe to call on an unpinned row. */
  async unpin(updateId: string): Promise<void> {
    return profileUpdatesDb.unpin(updateId);
  },

  /**
   * Flip the viewer's Pulsed (heart) state on a profile update. Returns
   * the new liked boolean so the caller can reconcile optimistic UI.
   */
  async toggleLike(updateId: string): Promise<boolean> {
    return profileUpdatesDb.toggleLike(updateId);
  },

  async listComments(updateId: string): Promise<ProfileUpdateComment[]> {
    return profileUpdatesDb.listComments(updateId);
  },

  async addComment(
    updateId: string,
    authorId: string,
    content: string,
    parentId?: string | null,
  ): Promise<ProfileUpdateComment> {
    return profileUpdatesDb.addComment(updateId, authorId, content, parentId);
  },

  async deleteComment(commentId: string): Promise<void> {
    return profileUpdatesDb.deleteComment(commentId);
  },

  /**
   * Author-only edit for a My Pulse comment. Returns the updated row
   * (with a fresh server-stamped `editedAt`) so callers can reconcile
   * the `['profileUpdateComments', updateId]` cache in place.
   */
  async updateComment(
    commentId: string,
    authorId: string,
    content: string,
  ): Promise<ProfileUpdateComment> {
    return profileUpdatesDb.updateComment(commentId, authorId, content);
  },

  /**
   * Author-only edit for a My Pulse post. Accepts a partial patch
   * (typically just `{ content }`) and returns the updated row so
   * callers can reconcile their cache. The DB trigger writes
   * `edited_at` automatically whenever any body field drifts.
   */
  async updateForUser(
    updateId: string,
    userId: string,
    patch: Partial<Pick<AddProfileUpdatePayload, 'content' | 'previewText' | 'linkedUrl' | 'linkedDiscussionTitle' | 'mood'>>,
    viewerId?: string | null,
  ): Promise<ProfileUpdate> {
    return profileUpdatesDb.updateForUser(updateId, userId, patch, viewerId);
  },
};
