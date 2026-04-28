/**
 * PulseVerse export pipeline — append branded end card to video (future native / server step).
 *
 * Stages (implement off-device or with native module when you add FFmpeg / AVAssetExport):
 * 1. resolveSourceUri — local file or download remote post media to cache
 * 2. resolveEndCardUri — `Asset.fromModule(PULSEVERSE_ENDCARD_VIDEO).downloadAsync()` (bundled master with audio)
 * 3. burnCreatorOverlay — FFmpeg `drawtext` / overlay using {@link ExportEndCardData} (matches in-app {@link PulseVerseVideoEndCard})
 * 4. muxSegments — concat [main.mp4] + [endcard-with-overlay.mp4] (map audio; optional sting — see theme)
 * 5. writeOutput — Gallery / share URL
 *
 * @see lib/exportEndCardIntegration.ts — duration/resolution helpers for previews (no import cycle)
 * @see theme/exportEndCard.ts for audio sting brief
 * @see services/export/FFMPEG_EXPORT.md — worker contract (`EXPO_PUBLIC_VIDEO_EXPORT_URL`)
 */

import type { ExportEndCardData } from '@/types/exportEndCard';
import { PULSEVERSE_ENDCARD_VIDEO } from '@/assets/video/endCardVideo';
import { exportEndCardTokens } from '@/theme/exportEndCard';

/** Metro `require()` id for the bundled end-card MP4 — resolve to a local file URI before concat. */
export { PULSEVERSE_ENDCARD_VIDEO };

export type ExportPipelineInput = {
  sourceVideoUri: string;
  endCard: ExportEndCardData;
  /** Bundled master clip (default). Replace only if you ship an updated outro. */
  endCardVideoModule?: typeof PULSEVERSE_ENDCARD_VIDEO;
  /** Include branded sting when asset exists */
  audioStingUri?: string | null;
};

export type ExportPipelineStage =
  | 'resolve_source'
  | 'render_end_card'
  | 'mux'
  | 'finalize';

export function describeExportPipeline(_input: ExportPipelineInput): {
  stages: ExportPipelineStage[];
  endCardDurationSec: number;
  resolution: { width: number; height: number };
} {
  return {
    stages: ['resolve_source', 'render_end_card', 'mux', 'finalize'],
    endCardDurationSec: exportEndCardTokens.timing.exportDurationRecommendedMs / 1000,
    resolution: { width: 1080, height: 1920 },
  };
}

/** Placeholder: wire to FFmpeg / Media3 / AVFoundation when native module exists. */
export async function runExportPipeline(_input: ExportPipelineInput): Promise<{ outputUri: string }> {
  throw new Error(
    'Video export pipeline is not implemented in-app yet. Use describeExportPipeline() for specs, or run concat server-side.',
  );
}
