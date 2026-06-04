import type { FeatureFlags } from '@/lib/featureFlags';

/**
 * Creator Template Studio (B-roll Studio Phase 4) — pure config. Templates are a
 * packaging layer: each one opens an EXISTING tool (B-roll Studio cutaway/overlay,
 * Green Screen, or Combine Clips) with preset defaults applied via route params.
 * No new render pipeline, no editor logic duplicated here.
 */

export type CreatorTemplateTool = 'broll_studio' | 'green_screen' | 'combine_clips';
export type CreatorTemplateMode = 'cutaway' | 'overlay' | 'greenScreen';
export type CreatorTemplateGroup = 'Story' | 'Reaction' | 'Explainer' | 'Tutorial' | 'Comparison';

export interface CreatorTemplate {
  id: string;
  name: string;
  description: string;
  group: CreatorTemplateGroup;
  /** Ionicons name for the card. */
  icon: string;
  /** Which existing tool this template opens. */
  tool: CreatorTemplateTool;
  /** B-roll Studio mode to preselect (for `broll_studio` / `green_screen`). */
  mode?: CreatorTemplateMode;
  /**
   * Feature-flag keys that must ALL be ON for this template to be available.
   * (e.g. overlay templates require `creatorOverlayPip`.)
   */
  requires: (keyof FeatureFlags)[];
  /** Documented preset defaults (already match the underlying tool's defaults). */
  defaults?: { audioMode?: 'main' | 'clip' | 'both'; maxClips?: number };
}

export const CREATOR_TEMPLATES: CreatorTemplate[] = [
  {
    id: 'storytime_cutaway',
    name: 'Storytime + Cutaway',
    description: 'Tell the story while B-roll supports the moment.',
    group: 'Story',
    icon: 'film-outline',
    tool: 'broll_studio',
    mode: 'cutaway',
    requires: ['creatorBrollStudio'],
    defaults: { audioMode: 'main', maxClips: 3 },
  },
  {
    id: 'reaction_overlay',
    name: 'Reaction Overlay',
    description: 'React to a clip floating over your main video.',
    group: 'Reaction',
    icon: 'albums-outline',
    tool: 'broll_studio',
    mode: 'overlay',
    requires: ['creatorBrollStudio', 'creatorOverlayPip'],
    defaults: { audioMode: 'main', maxClips: 3 },
  },
  {
    id: 'green_screen_explainer',
    name: 'Green Screen Explainer',
    description: 'Put yourself over a background image or video.',
    group: 'Explainer',
    icon: 'sparkles-outline',
    tool: 'green_screen',
    mode: 'greenScreen',
    requires: ['creatorBrollStudio', 'creatorGreenScreenStudio'],
    defaults: { audioMode: 'main' },
  },
  {
    id: 'tutorial_steps',
    name: 'Tutorial Steps',
    description: 'Walk through a tip with short step clips.',
    group: 'Tutorial',
    icon: 'list-outline',
    tool: 'broll_studio',
    mode: 'cutaway',
    requires: ['creatorBrollStudio'],
    defaults: { audioMode: 'main', maxClips: 3 },
  },
  {
    id: 'before_after',
    name: 'Before / After',
    description: 'Show a before clip, then the after.',
    group: 'Comparison',
    icon: 'git-compare-outline',
    tool: 'combine_clips',
    requires: ['creatorHubCombineClips'],
  },
];

export const TEMPLATE_GROUP_ORDER: CreatorTemplateGroup[] = [
  'Story',
  'Reaction',
  'Explainer',
  'Tutorial',
  'Comparison',
];

/** True when every required feature flag is enabled. */
export function isTemplateAvailable(template: CreatorTemplate, flags: FeatureFlags): boolean {
  return template.requires.every((key) => flags[key] === true);
}

/**
 * Destination route (with preset params) for a template. B-roll Studio reads
 * `mode`; Combine Clips opens via `/create/video?openStitch=series`. The `template`
 * param lets the target show a friendly "Template: …" hint and is otherwise inert.
 */
export function templateRoute(template: CreatorTemplate): string {
  if (template.tool === 'combine_clips') {
    return `/create/video?openStitch=series&template=${template.id}`;
  }
  // broll_studio + green_screen both live inside B-roll Studio (mode selector).
  const mode = template.mode ?? 'cutaway';
  return `/create/broll-studio?mode=${mode}&template=${template.id}`;
}

/** Lookup a template by id (used by target screens to render the hint banner). */
export function getCreatorTemplate(id?: string | null): CreatorTemplate | null {
  if (!id) return null;
  return CREATOR_TEMPLATES.find((t) => t.id === id) ?? null;
}
