// Deploy: npx supabase functions deploy generate-circle-weekly-prompts --no-verify-jwt
//
// Intended caller: Supabase Scheduled Function (cron) or external cron POST,
// every Monday AFTER calculate-circle-weekly-prompt-metrics. Also used by future
// admin tooling for manual regeneration.
//
// What it does: for every Circle (row in public.communities) it generates ONE
// fresh weekly "This Week" prompt with OpenAI, using the Circle's identity +
// prior prompt history + prior performance metrics so prompts get smarter and
// avoid repetition. Writes to public.circle_weekly_prompts.
//
// Auth: x-cron-secret header (see _shared/circle-prompts/cronAuth.ts).
//
// Body (all optional):
//   {
//     "force": true,                      // regenerate even if a prompt exists
//     "circle_slug": "petverse",          // limit to one Circle
//     "week_start_date": "YYYY-MM-DD",    // override week (defaults to this Monday)
//     "dry_run": true                     // generate but do NOT write
//   }
//
// Env:
//   OPENAI_API_KEY            (required to generate; missing => all circles fail softly)
//   CIRCLE_PROMPTS_MODEL      (optional, default "gpt-4o-mini")
//   CIRCLE_PROMPTS_CRON_SECRET / CRON_SECRET / DISPATCH_SCHEDULED_SECRET
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEYS)

import { createClient } from "npm:@supabase/supabase-js@2";

import { edgeCorsHeaders } from "../_shared/edgeCors.ts";
import { getSupabaseSecretKey, getSupabaseUrl } from "../_shared/supabaseEnv.ts";
import { checkCronAuth } from "../_shared/circle-prompts/cronAuth.ts";
import { isTooSimilarToRecent } from "../_shared/circle-prompts/similarity.ts";

const corsHeaders = edgeCorsHeaders({
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
});

const ALLOWED_STYLES = [
  "funny",
  "debate",
  "storytime",
  "challenge",
  "educational",
  "practical",
  "emotional",
  "transformation",
  "recommendation",
  "opinion",
  "showcase",
  "confession_style",
  "before_after",
  "trend_reaction",
] as const;

const TITLE_MAX = 80;
const BODY_MAX = 240;
const CTA_MAX = 120;
const HISTORY_LIMIT = 25;
const DEFAULT_MODEL = "gpt-4o-mini";

// Retry tuning for transient OpenAI failures (429 rate limit / 5xx). Low-tier
// OpenAI accounts cap at ~10 req/min, so a full 25-Circle run WILL hit 429s.
// We retry patiently so a weekly run completes even on the lowest tier.
const OPENAI_MAX_RETRIES = 6;
const OPENAI_RETRY_BASE_MS = 2_000;
const OPENAI_RETRY_MAX_MS = 30_000;

// Supabase Edge Functions are hard-killed at ~150s wall-clock. We stop starting
// new Circles once this budget is spent and return a clean summary instead of
// being killed mid-write. Remaining Circles are picked up by the next scheduled
// pass (force=false skips Circles that already have this week's prompt).
const RUN_BUDGET_MS = 135_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Decide how long to wait before retrying a failed OpenAI call.
 * Prefers the Retry-After header, then the "try again in Xs" hint OpenAI puts in
 * the error body, then exponential backoff. Always capped at OPENAI_RETRY_MAX_MS.
 */
function retryDelayMs(res: Response, body: string, attempt: number): number {
  const header = res.headers.get("retry-after");
  if (header) {
    const secs = Number(header);
    if (Number.isFinite(secs) && secs > 0) {
      return Math.min(secs * 1000, OPENAI_RETRY_MAX_MS);
    }
  }
  const match = body.match(/try again in ([\d.]+)\s*(ms|s)/i);
  if (match) {
    const value = Number(match[1]);
    if (Number.isFinite(value) && value > 0) {
      const ms = match[2].toLowerCase() === "ms" ? value : value * 1000;
      // Pad slightly so we are past the window when we retry.
      return Math.min(Math.ceil(ms) + 500, OPENAI_RETRY_MAX_MS);
    }
  }
  const backoff = OPENAI_RETRY_BASE_MS * 2 ** attempt;
  const jitter = Math.floor(Math.random() * 500);
  return Math.min(backoff + jitter, OPENAI_RETRY_MAX_MS);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function clamp(s: unknown, max: number): string {
  const str = typeof s === "string" ? s.trim() : "";
  return str.length > max ? str.slice(0, max).trim() : str;
}

/** Monday-anchored (ISO) week start in UTC — matches public.circle_week_start. */
function currentWeekStartUTC(now = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dow = d.getUTCDay(); // 0=Sun..6=Sat
  const diffToMonday = (dow + 6) % 7; // days since Monday
  d.setUTCDate(d.getUTCDate() - diffToMonday);
  return d.toISOString().slice(0, 10);
}

interface CommunityRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  categories: string[] | null;
  metadata: Record<string, unknown> | null;
}

interface PromptConfigRow {
  tone: string | null;
  audience: string | null;
  prompt_guidance: string | null;
  banned_topics: string[] | null;
  safety_notes: string | null;
}

interface RecentPromptRow {
  prompt_title: string | null;
  prompt_body: string | null;
  prompt_style: string | null;
  week_start_date: string;
}

interface MetricRow {
  prompt_style: string | null;
  engagement_score: number | null;
  week_start_date: string;
}

interface GeneratedPrompt {
  prompt_title: string;
  prompt_body: string;
  prompt_cta: string;
  prompt_type: string;
  prompt_style: string;
  moderation_notes: string;
}

function rankStyles(metrics: MetricRow[]): { best: string[]; worst: string[] } {
  const byStyle = new Map<string, { total: number; count: number }>();
  for (const m of metrics) {
    const style = (m.prompt_style ?? "").trim();
    if (!style) continue;
    const score = Number(m.engagement_score ?? 0);
    const cur = byStyle.get(style) ?? { total: 0, count: 0 };
    cur.total += score;
    cur.count += 1;
    byStyle.set(style, cur);
  }
  const averaged = [...byStyle.entries()]
    .map(([style, v]) => ({ style, avg: v.count ? v.total / v.count : 0 }))
    .sort((a, b) => b.avg - a.avg);
  return {
    best: averaged.slice(0, 3).filter((s) => s.avg > 0).map((s) => s.style),
    worst: averaged.slice(-3).reverse().map((s) => s.style),
  };
}

function buildMessages(
  circle: CommunityRow,
  config: PromptConfigRow | null,
  recent: RecentPromptRow[],
  styles: { best: string[]; worst: string[] },
  isConfessions: boolean,
): { system: string; user: string } {
  const meta = circle.metadata ?? {};
  const rules = Array.isArray((meta as Record<string, unknown>).rules)
    ? ((meta as Record<string, unknown>).rules as unknown[]).map((r) => String(r))
    : [];

  const recentList = recent
    .slice(0, HISTORY_LIMIT)
    .map((p, i) => `${i + 1}. [${p.prompt_style ?? "?"}] ${p.prompt_title} — ${p.prompt_body}`)
    .join("\n");

  const bannedTopics = config?.banned_topics?.length ? config.banned_topics.join(", ") : "none";

  const safety: string[] = [];
  if (config?.safety_notes) safety.push(config.safety_notes);
  if (isConfessions) {
    safety.push(
      "This is an anonymous Confessions-style Circle. Prompts must be safe, supportive, and never ask for identifying details.",
    );
  }
  if (circle.slug === "the-drama-room") {
    safety.push(
      "Never ask for real names, addresses, workplaces, schools, or identifying details. No revenge posting or targeted accusations. Frame as personal experience or opinion.",
    );
  }
  if (circle.slug === "money-moves") {
    safety.push(
      "No guaranteed income claims, no investment advice, no crypto pump language, no scams, no requests for money. Frame as discussion only, not financial advice.",
    );
  }

  const system = [
    "You write a single weekly conversation-starter prompt for a social community ('Circle').",
    "Return ONLY valid JSON matching this exact shape:",
    `{"prompt_title":"string <=${TITLE_MAX} chars","prompt_body":"string <=${BODY_MAX} chars","prompt_cta":"string <=${CTA_MAX} chars","prompt_type":"weekly_conversation_starter","prompt_style":"one of: ${ALLOWED_STYLES.join(" | ")}","moderation_notes":"string"}`,
    "Rules:",
    "- Make the prompt highly specific to THIS Circle; never generic like 'What's on your mind?'.",
    "- Keep it modern, short, social-media native, and inviting.",
    "- Encourage sharing a video, photo, or story.",
    "- Do NOT repeat or closely paraphrase any recent prompt provided.",
    "- Avoid asking for sensitive personal data. Avoid medical/legal/financial claims unless framed safely as discussion.",
  ].join("\n");

  const user = [
    `Circle name: ${circle.name}`,
    `Circle slug: ${circle.slug}`,
    `Description: ${circle.description ?? ""}`,
    `Categories: ${(circle.categories ?? []).join(", ") || "n/a"}`,
    config?.tone ? `Tone: ${config.tone}` : "",
    config?.audience ? `Audience: ${config.audience}` : "",
    config?.prompt_guidance ? `Guidance: ${config.prompt_guidance}` : "",
    rules.length ? `Circle rules:\n- ${rules.join("\n- ")}` : "",
    `Banned topics: ${bannedTopics}`,
    safety.length ? `Safety notes:\n- ${safety.join("\n- ")}` : "",
    styles.best.length ? `Best-performing styles (favor these patterns, not exact wording): ${styles.best.join(", ")}` : "",
    styles.worst.length ? `Underperforming styles (avoid leaning on these): ${styles.worst.join(", ")}` : "",
    recentList ? `Recent prompts to AVOID repeating:\n${recentList}` : "No prior prompts yet — set a strong tone.",
    "",
    "Generate ONE fresh weekly prompt now as JSON.",
  ]
    .filter(Boolean)
    .join("\n");

  return { system, user };
}

async function callOpenAI(
  apiKey: string,
  model: string,
  system: string,
  user: string,
): Promise<GeneratedPrompt> {
  const payload: Record<string, unknown> = {
    model,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  };
  // GPT-5 family reasoning models only accept the default temperature, so only
  // send a custom temperature for models that support it (e.g. gpt-4o-mini).
  // This keeps the function compatible whether CIRCLE_PROMPTS_MODEL is a 4o/4.1
  // model or a gpt-5.x model.
  if (!/^(o\d|gpt-5)/i.test(model)) {
    payload.temperature = 0.9;
  }

  // Retry on 429 (rate limit) and transient 5xx. 4xx (other than 429) fail fast.
  let res: Response | null = null;
  let lastErrText = "";
  for (let attempt = 0; attempt <= OPENAI_MAX_RETRIES; attempt++) {
    res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) break;

    const retryable = res.status === 429 || (res.status >= 500 && res.status < 600);
    lastErrText = await res.text().catch(() => "");

    if (!retryable || attempt === OPENAI_MAX_RETRIES) {
      throw new Error(`OpenAI ${res.status}: ${lastErrText.slice(0, 300)}`);
    }

    await sleep(retryDelayMs(res, lastErrText, attempt));
  }

  if (!res || !res.ok) {
    throw new Error(`OpenAI request failed: ${lastErrText.slice(0, 300)}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("OpenAI returned no content");
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("OpenAI returned non-JSON content");
  }

  const title = clamp(parsed.prompt_title, TITLE_MAX);
  const body = clamp(parsed.prompt_body, BODY_MAX);
  if (!title || !body) throw new Error("Generated prompt missing title/body");

  let style = typeof parsed.prompt_style === "string" ? parsed.prompt_style.trim() : "";
  if (!ALLOWED_STYLES.includes(style as (typeof ALLOWED_STYLES)[number])) {
    style = "storytime";
  }

  return {
    prompt_title: title,
    prompt_body: body,
    prompt_cta: clamp(parsed.prompt_cta, CTA_MAX) || "Share yours",
    prompt_type: "weekly_conversation_starter",
    prompt_style: style,
    moderation_notes: clamp(parsed.moderation_notes, 500),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = checkCronAuth(req);
  if (!auth.ok) return json({ error: auth.error }, auth.status);

  const supabaseUrl = getSupabaseUrl();
  const secretKey = getSupabaseSecretKey();
  if (!supabaseUrl || !secretKey) {
    return json({ error: "SUPABASE_URL or secret API key missing" }, 503);
  }

  const apiKey = Deno.env.get("OPENAI_API_KEY")?.trim() ?? "";
  const model = Deno.env.get("CIRCLE_PROMPTS_MODEL")?.trim() || DEFAULT_MODEL;

  let force = false;
  let onlySlug: string | null = null;
  let weekStart = currentWeekStartUTC();
  let dryRun = false;
  try {
    const body = await req.json().catch(() => ({}));
    if (body && typeof body === "object") {
      force = body.force === true;
      dryRun = body.dry_run === true;
      if (typeof body.circle_slug === "string" && body.circle_slug.trim()) {
        onlySlug = body.circle_slug.trim().toLowerCase();
      }
      if (typeof body.week_start_date === "string" && body.week_start_date.trim()) {
        weekStart = body.week_start_date.trim();
      }
    }
  } catch {
    // default body
  }

  if (!apiKey) {
    return json(
      { error: "OPENAI_API_KEY is not set on this function." },
      503,
    );
  }

  const supabase = createClient(supabaseUrl, secretKey);

  let circlesQuery = supabase
    .from("communities")
    .select("id, slug, name, description, categories, metadata");
  if (onlySlug) circlesQuery = circlesQuery.eq("slug", onlySlug);

  const { data: circles, error: circlesErr } = await circlesQuery;
  if (circlesErr) {
    return json({ ok: false, error: circlesErr.message }, 500);
  }

  const summary = {
    week_start_date: weekStart,
    total_circles: circles?.length ?? 0,
    prompts_created: 0,
    prompts_skipped: 0,
    prompts_failed: 0,
    prompts_deferred: 0,
    timed_out: false,
    dry_run: dryRun,
    errors: [] as { circle_slug: string; error: string }[],
  };

  const startedAt = Date.now();

  for (const circle of (circles ?? []) as CommunityRow[]) {
    // Stop before the platform hard-kills us mid-write. Remaining Circles are
    // filled by the next scheduled pass.
    if (Date.now() - startedAt > RUN_BUDGET_MS) {
      summary.timed_out = true;
      summary.prompts_deferred += 1;
      continue;
    }
    try {
      // Skip if a prompt already exists for this week (unless force).
      const { data: existing } = await supabase
        .from("circle_weekly_prompts")
        .select("id")
        .eq("circle_id", circle.id)
        .eq("week_start_date", weekStart)
        .maybeSingle();

      if (existing && !force) {
        summary.prompts_skipped += 1;
        continue;
      }

      const [{ data: recent }, { data: metrics }, { data: config }] = await Promise.all([
        supabase
          .from("circle_weekly_prompts")
          .select("prompt_title, prompt_body, prompt_style, week_start_date")
          .eq("circle_id", circle.id)
          .order("week_start_date", { ascending: false })
          .limit(HISTORY_LIMIT),
        supabase
          .from("circle_weekly_prompt_metrics")
          .select("prompt_style, engagement_score, week_start_date")
          .eq("circle_id", circle.id)
          .order("week_start_date", { ascending: false })
          .limit(HISTORY_LIMIT),
        supabase
          .from("circle_prompt_configs")
          .select("tone, audience, prompt_guidance, banned_topics, safety_notes")
          .eq("circle_id", circle.id)
          .maybeSingle(),
      ]);

      const recentRows = (recent ?? []) as RecentPromptRow[];
      const styles = rankStyles((metrics ?? []) as MetricRow[]);
      const isConfessions = circle.slug === "confessions";

      const { system, user } = buildMessages(
        circle,
        (config ?? null) as PromptConfigRow | null,
        recentRows,
        styles,
        isConfessions,
      );

      // Generate, then run the similarity guard. One retry with a stronger
      // "make it different" nudge before giving up.
      let generated = await callOpenAI(apiKey, model, system, user);
      let sim = isTooSimilarToRecent(
        { title: generated.prompt_title, body: generated.prompt_body },
        recentRows,
      );
      if (sim.tooSimilar) {
        generated = await callOpenAI(
          apiKey,
          model,
          system,
          `${user}\n\nIMPORTANT: Your previous idea was too similar to a recent prompt (${sim.reason}). Produce a clearly DIFFERENT angle, topic, and wording.`,
        );
        sim = isTooSimilarToRecent(
          { title: generated.prompt_title, body: generated.prompt_body },
          recentRows,
        );
        if (sim.tooSimilar) {
          summary.prompts_skipped += 1;
          summary.errors.push({
            circle_slug: circle.slug,
            error: `skipped: too similar after retry (${sim.reason}, score ${sim.maxScore.toFixed(2)})`,
          });
          continue;
        }
      }

      if (dryRun) {
        summary.prompts_created += 1;
        continue;
      }

      const { error: upErr } = await supabase
        .from("circle_weekly_prompts")
        .upsert(
          {
            circle_id: circle.id,
            circle_slug: circle.slug,
            week_start_date: weekStart,
            prompt_title: generated.prompt_title,
            prompt_body: generated.prompt_body,
            prompt_cta: generated.prompt_cta,
            prompt_type: generated.prompt_type,
            prompt_style: generated.prompt_style,
            generation_source: "ai",
            model_name: model,
            status: "active",
            approved_at: new Date().toISOString(),
            metadata: {
              moderation_notes: generated.moderation_notes,
              similarity_score: sim.maxScore,
              best_styles: styles.best,
            },
          },
          { onConflict: "circle_id,week_start_date" },
        );

      if (upErr) throw new Error(upErr.message);
      summary.prompts_created += 1;
    } catch (e) {
      summary.prompts_failed += 1;
      summary.errors.push({
        circle_slug: circle.slug,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return json({ ok: true, ...summary });
});
