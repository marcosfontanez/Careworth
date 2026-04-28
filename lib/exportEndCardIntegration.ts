import { exportEndCardTokens } from '@/theme/exportEndCard';

/**
 * Hooks for a future native export / transcode pipeline (FFmpeg, AVFoundation, Media3, etc.).
 *
 * For pipeline types and placeholders, import from `@/services/export/videoExportPipeline` directly
 * (keeps Metro free of cycles with this file).
 *
 * TODO:export — Concatenate source video + end card:
 * 1. Resolve `PULSEVERSE_ENDCARD_VIDEO` from `@/assets/video/endCardVideo` via expo-asset.
 * 2. Burn creator lines (handle / name / role) onto that segment with FFmpeg drawtext or an overlay —
 *    mirror `PulseVerseVideoEndCard` + `getEndCardCreatorLines`.
 * 3. `ffmpeg` concat: main clip + processed end card; align sample rate / channel layout for a=1.
 * 4. Optional sting — see `theme/exportEndCard.ts` audio TODO.
 */
export function getExportEndCardDurationSec(): number {
  return exportEndCardTokens.timing.exportDurationRecommendedMs / 1000;
}

export function getExportEndCardResolution(): { width: number; height: number } {
  return { width: 1080, height: 1920 };
}
