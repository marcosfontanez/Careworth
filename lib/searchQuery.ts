/**
 * Escape `%`, `_`, and `\` for PostgREST `ilike` / `.or()` filter strings so user input
 * cannot widen a pattern accidentally.
 */
export function escapePostgrestIlike(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}
