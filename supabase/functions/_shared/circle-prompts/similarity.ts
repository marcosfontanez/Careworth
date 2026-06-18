// Pure similarity guard for weekly-prompt generation (Deno copy).
//
// Mirrors lib/circles/weeklyPromptSimilarity.ts exactly. The app `lib/` version
// is the jest-tested source of truth; this Deno copy exists because Supabase
// only bundles shared code from supabase/functions/_shared (not repo `lib/`).
// Keep the two in sync if you change the algorithm.

export function normalizePromptText(input: string): string {
  return (input ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(input: string): Set<string> {
  const norm = normalizePromptText(input);
  if (!norm) return new Set();
  return new Set(norm.split(" ").filter(Boolean));
}

export function jaccardSimilarity(a: string, b: string): number {
  const setA = tokenSet(a);
  const setB = tokenSet(b);
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const t of setA) if (setB.has(t)) intersection += 1;
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export interface RecentPromptLike {
  prompt_title?: string | null;
  prompt_body?: string | null;
}

export interface SimilarityCheckResult {
  tooSimilar: boolean;
  maxScore: number;
  reason: "exact_duplicate" | "high_overlap" | null;
}

export function isTooSimilarToRecent(
  candidate: { title: string; body: string },
  recent: RecentPromptLike[],
  threshold = 0.6,
): SimilarityCheckResult {
  const candidateCombined = `${candidate.title} ${candidate.body}`;
  const candidateNorm = normalizePromptText(candidateCombined);

  let maxScore = 0;
  let reason: SimilarityCheckResult["reason"] = null;

  for (const r of recent) {
    const recentCombined = `${r.prompt_title ?? ""} ${r.prompt_body ?? ""}`;
    if (normalizePromptText(recentCombined) === candidateNorm && candidateNorm.length > 0) {
      return { tooSimilar: true, maxScore: 1, reason: "exact_duplicate" };
    }
    const score = jaccardSimilarity(candidateCombined, recentCombined);
    if (score > maxScore) {
      maxScore = score;
      if (score >= threshold) reason = "high_overlap";
    }
  }

  return { tooSimilar: maxScore >= threshold, maxScore, reason };
}
