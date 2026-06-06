/** Shared My Pulse update shapes (safe for client + server imports). */

export type WebPulseUpdateDetail = {
  id: string;
  userId: string;
  type: string;
  content: string | null;
  previewText: string | null;
  mood: string | null;
  picsUrls: string[];
  mediaThumb: string | null;
  linkedUrl: string | null;
  linkedPostId: string | null;
  createdAt: string | null;
  editedAt: string | null;
  likeCount: number;
  commentCount: number;
  likedByViewer?: boolean;
  author: {
    id: string;
    displayName: string;
    username: string | null;
    avatarUrl: string | null;
  } | null;
};

export type WebPulseUpdateComment = {
  id: string;
  body: string;
  createdAt: string | null;
  edited: boolean;
  author: {
    id: string;
    displayName: string;
    username: string | null;
    avatarUrl: string | null;
  } | null;
};

export type WebPulseUpdateResult =
  | { state: "unavailable" }
  | { state: "error" }
  | {
      state: "ok";
      update: WebPulseUpdateDetail;
      comments: WebPulseUpdateComment[];
    };
