export type SuggestedShift = 'day' | 'night' | 'weekend' | 'any';

/** Best-effort shift label from device clock (drives Discover + Night shelf context). */
export function suggestedShiftFromClock(): SuggestedShift | null {
  const d = new Date();
  const day = d.getDay();
  const h = d.getHours();
  if (day === 0 || day === 6) return 'weekend';
  if (h >= 19 || h < 7) return 'night';
  if (h >= 7 && h < 19) return 'day';
  return 'any';
}
