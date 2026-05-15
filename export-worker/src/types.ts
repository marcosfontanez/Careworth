/** Mirrors app `ExportEndCardData` / worker request body. */
export type ExportEndCardData = {
  creatorDisplayName: string;
  creatorHandle?: string;
  profession?: string;
  specialty?: string;
};

export type VideoExportJobRequestBody = {
  sourceVideoUrl: string;
  endCard: ExportEndCardData;
  anonymousExport: boolean;
  postId: string;
  burnWatermark: boolean;
};

export type JobRecord = {
  id: string;
  userId: string;
  postId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  outputUrl?: string;
  error?: string;
  createdAt: number;
  /** Never fetch profile when true — use endCard only */
  anonymousExport: boolean;
  request: VideoExportJobRequestBody;
};

/** Side-by-side duet mux — two fetchable MP4 URLs (signed URLs OK). */
export type DuetMuxJobRequestBody = {
  leftVideoUrl: string;
  rightVideoUrl: string;
  /** Optional client correlation id for logs */
  clientRef?: string;
};

export type DuetMuxJobRecord = {
  id: string;
  userId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  outputUrl?: string;
  error?: string;
  createdAt: number;
  request: DuetMuxJobRequestBody;
};
