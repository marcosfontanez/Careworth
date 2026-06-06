/** Flair filter + labels — mirrors native `lib/circleFlairs.ts` for web. */

export type CircleThreadKind = "question" | "story" | "advice" | "meme" | "media";

export type CircleFlairTag =
  | "question"
  | "story"
  | "humor"
  | "career_advice"
  | "caregiver_support"
  | "student_help"
  | "education"
  | "rant_vent"
  | "mythbuster"
  | "live_qa";

export type CircleFlairFilter = "all" | CircleThreadKind | CircleFlairTag | "unanswered";

export type CircleFlairOption = {
  id: CircleFlairFilter;
  label: string;
  kind?: CircleThreadKind;
  flairTag?: CircleFlairTag;
  safetyNote?: string;
};

const EDUCATION_SAFETY =
  "Share general education — not individualized medical advice, diagnosis, or treatment.";
const CAREGIVER_SAFETY =
  "Peer support and general education only — not a substitute for professional care.";
const LIVE_QA_SAFETY = "Clips and photos — keep patient details out.";

export const CIRCLE_FLAIR_CATALOG: CircleFlairOption[] = [
  { id: "all", label: "All" },
  { id: "question", label: "Question", kind: "question", flairTag: "question" },
  { id: "story", label: "Story", kind: "story", flairTag: "story" },
  { id: "humor", label: "Humor", kind: "meme", flairTag: "humor" },
  {
    id: "career_advice",
    label: "Career Advice",
    kind: "advice",
    flairTag: "career_advice",
    safetyNote: EDUCATION_SAFETY,
  },
  {
    id: "caregiver_support",
    label: "Caregiver Support",
    kind: "advice",
    flairTag: "caregiver_support",
    safetyNote: CAREGIVER_SAFETY,
  },
  {
    id: "student_help",
    label: "Student Help",
    kind: "advice",
    flairTag: "student_help",
    safetyNote: EDUCATION_SAFETY,
  },
  {
    id: "education",
    label: "Education",
    kind: "advice",
    flairTag: "education",
    safetyNote: EDUCATION_SAFETY,
  },
  { id: "rant_vent", label: "Rant/Vent", kind: "story", flairTag: "rant_vent" },
  {
    id: "mythbuster",
    label: "Mythbuster",
    kind: "advice",
    flairTag: "mythbuster",
    safetyNote: EDUCATION_SAFETY,
  },
  {
    id: "live_qa",
    label: "Live Q&A",
    kind: "media",
    flairTag: "live_qa",
    safetyNote: LIVE_QA_SAFETY,
  },
  { id: "unanswered", label: "Unanswered" },
];

const TAG_LABEL: Record<CircleFlairTag, string> = Object.fromEntries(
  CIRCLE_FLAIR_CATALOG.filter((o) => o.flairTag).map((o) => [o.flairTag!, o.label]),
) as Record<CircleFlairTag, string>;

const KIND_LABEL: Record<CircleThreadKind, string> = {
  question: "Question",
  story: "Story",
  advice: "Career Advice",
  meme: "Humor",
  media: "Live Q&A",
};

export function flairLabelForThread(thread: {
  kind: CircleThreadKind;
  flairTag?: CircleFlairTag | string | null;
}): string {
  const tag = thread.flairTag as CircleFlairTag | null | undefined;
  if (tag && TAG_LABEL[tag]) return TAG_LABEL[tag];
  return KIND_LABEL[thread.kind] ?? thread.kind;
}

function threadMatchesFlair<T extends { kind: CircleThreadKind; flairTag?: CircleFlairTag | string | null }>(
  thread: T,
  flair: CircleFlairFilter,
): boolean {
  const opt = CIRCLE_FLAIR_CATALOG.find((o) => o.id === flair);
  if (!opt) return false;
  if (opt.flairTag) {
    if (thread.flairTag) return thread.flairTag === opt.flairTag;
    return thread.kind === opt.kind;
  }
  if (opt.kind) return thread.kind === opt.kind;
  return false;
}

export function filterThreadsByFlair<
  T extends { kind: CircleThreadKind; replyCount: number; flairTag?: CircleFlairTag | string | null },
>(threads: T[], flair: CircleFlairFilter): T[] {
  if (flair === "all") return threads;
  if (flair === "unanswered") return threads.filter((t) => t.replyCount === 0);
  return threads.filter((t) => threadMatchesFlair(t, flair));
}

export function visibleFlairOptionsForThreads<
  T extends { kind: CircleThreadKind; replyCount: number; flairTag?: CircleFlairTag | string | null },
>(threads: T[]): CircleFlairOption[] {
  const allOpt = CIRCLE_FLAIR_CATALOG.find((o) => o.id === "all")!;
  const unansweredOpt = CIRCLE_FLAIR_CATALOG.find((o) => o.id === "unanswered")!;
  const visible: CircleFlairOption[] = [allOpt];

  for (const opt of CIRCLE_FLAIR_CATALOG) {
    if (opt.id === "all" || opt.id === "unanswered") continue;
    const count = threads.filter((t) => threadMatchesFlair(t, opt.id)).length;
    if (count > 0) visible.push(opt);
  }

  const unansweredCount = threads.filter((t) => t.replyCount === 0).length;
  if (unansweredCount > 0) visible.push(unansweredOpt);

  return visible;
}

export function safetyNoteForFlairFilter(flair: CircleFlairFilter): string | undefined {
  if (flair === "all" || flair === "unanswered") return undefined;
  return CIRCLE_FLAIR_CATALOG.find((o) => o.id === flair)?.safetyNote;
}

export const FLAIR_TAG_TO_KIND: Record<CircleFlairTag, CircleThreadKind> = {
  question: "question",
  story: "story",
  humor: "meme",
  career_advice: "advice",
  caregiver_support: "advice",
  student_help: "advice",
  education: "advice",
  rant_vent: "story",
  mythbuster: "advice",
  live_qa: "media",
};

export function composerFlairCatalog(): CircleFlairOption[] {
  return CIRCLE_FLAIR_CATALOG.filter((o) => o.flairTag);
}

const SLUG_FLAIR_PRIORITY: Record<string, CircleFlairTag[]> = {
  confessions: ["story", "rant_vent", "question"],
  "shift-confessions": ["story", "rant_vent", "question"],
  "student-nurses": ["question", "student_help", "career_advice", "story"],
  "future-nurses": ["question", "student_help", "career_advice", "story"],
  "caregiver-corner": ["caregiver_support", "education", "question"],
  caregivers: ["caregiver_support", "education", "question"],
  "funny-medical-memes": ["humor", "story", "rant_vent"],
  memes: ["humor", "story", "rant_vent"],
  "medical-mythbusters": ["mythbuster", "education", "question"],
  mythbusters: ["mythbuster", "education", "question"],
  "simple-medical-questions": ["question", "education", "mythbuster"],
};

const CATEGORY_FLAIR_HINTS: { pattern: RegExp; tags: CircleFlairTag[] }[] = [
  { pattern: /student|pre-med|nursing school/i, tags: ["student_help", "question", "career_advice"] },
  { pattern: /caregiver|family/i, tags: ["caregiver_support", "education", "question"] },
  { pattern: /humor|meme/i, tags: ["humor", "story", "rant_vent"] },
  { pattern: /education|clinical|medical/i, tags: ["education", "question", "mythbuster"] },
];

function flairPriorityForCircle(slug: string | undefined, categories: string[] = []): CircleFlairTag[] {
  const key = (slug ?? "").trim().toLowerCase();
  if (SLUG_FLAIR_PRIORITY[key]) return SLUG_FLAIR_PRIORITY[key]!;

  const out: CircleFlairTag[] = [];
  for (const hint of CATEGORY_FLAIR_HINTS) {
    if (categories.some((c) => hint.pattern.test(c))) {
      for (const tag of hint.tags) {
        if (!out.includes(tag)) out.push(tag);
      }
    }
  }
  return out;
}

export function getComposerFlairOptions(
  slug: string | undefined,
  categories: string[] = [],
): CircleFlairOption[] {
  const catalog = composerFlairCatalog();
  const priority = flairPriorityForCircle(slug, categories);
  if (priority.length === 0) return catalog;

  const byTag = new Map(catalog.map((o) => [o.flairTag!, o]));
  const ordered: CircleFlairOption[] = [];
  for (const tag of priority) {
    const opt = byTag.get(tag);
    if (opt) ordered.push(opt);
  }
  for (const opt of catalog) {
    if (opt.flairTag && !priority.includes(opt.flairTag)) ordered.push(opt);
  }
  return ordered;
}

export function safetyNoteForFlairTag(tag: CircleFlairTag | null | undefined): string | undefined {
  if (!tag) return undefined;
  return CIRCLE_FLAIR_CATALOG.find((o) => o.flairTag === tag)?.safetyNote;
}

export function resolveThreadCreateFlair(input: {
  postType: "thread" | "question";
  flairTag?: CircleFlairTag | null;
}): { kind: CircleThreadKind; flairTag?: CircleFlairTag } {
  if (input.flairTag) {
    return { kind: FLAIR_TAG_TO_KIND[input.flairTag], flairTag: input.flairTag };
  }
  return {
    kind: input.postType === "question" ? "question" : "story",
  };
}

/** Resolve flair + kind for editing an existing thread. Clearing flair keeps current kind. */
export function resolveThreadFlairUpdate(
  flairTag: CircleFlairTag | null,
  currentKind: CircleThreadKind,
): { flairTag: CircleFlairTag | null; kind: CircleThreadKind } {
  if (flairTag) {
    return { flairTag, kind: FLAIR_TAG_TO_KIND[flairTag] };
  }
  return { flairTag: null, kind: currentKind };
}
