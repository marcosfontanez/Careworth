/** RFC-style CSV field escaping for admin exports (client or server). */
export function csvEscape(s: string): string {
  const t = String(s ?? "");
  if (/[",\n\r]/.test(t)) return `"${t.replace(/"/g, '""')}"`;
  return t;
}
