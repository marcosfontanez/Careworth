/** In-feed duet parent chrome — same modes as `DuetParentPreview`. */
export type DuetLayoutMode = 'strip' | 'floating';

export function normalizeDuetLayoutMode(raw: unknown): DuetLayoutMode | undefined {
  const s = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (s === 'strip' || s === 'floating') return s;
  return undefined;
}
