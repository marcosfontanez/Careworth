/**
 * Photo frames — overlay decorations applied on top of a slide in the
 * composer preview. Pure RN Views + LinearGradient borders so we don't need
 * a snapshot library to render them. The selected frame id is stored in
 * the post (mood_preset slot or appendix metadata) so the feed can render
 * the same frame later when we ship it there.
 */

export type PhotoFrameId = 'none' | 'polaroid' | 'badge' | 'magazine' | 'sticky' | 'lanyard' | 'chart';

export interface PhotoFrame {
  id: PhotoFrameId;
  label: string;
  emoji: string;
  description: string;
}

export const PHOTO_FRAMES: PhotoFrame[] = [
  { id: 'none',     label: 'None',         emoji: '∅',  description: 'No frame.' },
  { id: 'polaroid', label: 'Polaroid',     emoji: '📸', description: 'White border + caption strip.' },
  { id: 'badge',    label: 'Badge holder', emoji: '🪪', description: 'Hospital ID style.' },
  { id: 'magazine', label: 'Magazine',     emoji: '📰', description: 'Bold cover banner.' },
  { id: 'sticky',   label: 'Sticky note',  emoji: '🗒️', description: 'Yellow note overlay.' },
  { id: 'lanyard',  label: 'Lanyard',      emoji: '🧷', description: 'Lanyard strap top.' },
  { id: 'chart',    label: 'Chart paper',  emoji: '📋', description: 'Patient chart top bar.' },
];

export function getFrame(id: PhotoFrameId): PhotoFrame | null {
  return PHOTO_FRAMES.find((f) => f.id === id) ?? null;
}
