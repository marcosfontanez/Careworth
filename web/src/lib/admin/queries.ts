import "server-only";

import { createAdminDataSupabaseClient } from "@/lib/supabase/admin-data";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { formatCount } from "@/lib/admin/format";
import type {
  AdminNotificationDigest,
  AdminNotificationItem,
  AdminUser,
  AppealRow,
  CampaignRow,
  CircleAdmin,
  CreatorRow,
  LiveSessionRow,
  MarketingContactLeadRow,
  PlacementInventoryRow,
  ReportReason,
  ReportRow,
  ReportStatus,
  ReportType,
  Severity,
} from "@/types/admin";
import type {
  AudienceSlice,
  CircleActivityBar,
  EngagementDayPoint,
  GrowthPoint,
  ReportReasonSlice,
  ReportSourceBar,
} from "@/types/admin-charts";

function isReportReason(s: string): s is ReportReason {
  return [
    "harassment",
    "misinformation",
    "hate_abuse",
    "impersonation",
    "spam",
    "nudity",
    "unsafe_medical",
    "copyright",
    "scam",
    "live_incident",
    "potential_phi",
  ].includes(s as ReportReason);
}

function mapReportReason(dbReason: string): ReportReason {
  if (isReportReason(dbReason)) return dbReason;
  if (dbReason === "inappropriate" || dbReason === "other") return "spam";
  return "spam";
}

function computeCampaignPacingNote(args: {
  start_date: string;
  end_date: string;
  budget_total: unknown;
  budget_spent: unknown;
}): string | null {
  const budgetTotal = Number(args.budget_total ?? 0);
  if (!Number.isFinite(budgetTotal) || budgetTotal <= 0) return null;
  const startMs = new Date(args.start_date).getTime();
  const endMs = new Date(args.end_date).getTime();
  const now = Date.now();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return null;
  const flight = endMs - startMs;
  const elapsed = Math.min(Math.max(now - startMs, 0), flight);
  const expectedPct = flight > 0 ? elapsed / flight : 0;
  const spentPct = Math.min(Math.max(Number(args.budget_spent ?? 0) / budgetTotal, 0), 1);
  const deltaPts = (spentPct - expectedPct) * 100;
  return `Spend ${(spentPct * 100).toFixed(1)}% vs linear expectation ${(expectedPct * 100).toFixed(1)}% (${deltaPts >= 0 ? "+" : ""}${deltaPts.toFixed(1)} pts)`;
}

export type LoadCreatorsFilters = {
  role?: string;
  verified?: "all" | "yes" | "no";
  minFollowers?: number;
  sort?: "followers" | "posts" | "updated";
  limit?: number;
};

function mapReportStatus(dbStatus: string): ReportStatus {
  switch (dbStatus) {
    case "pending":
      return "pending";
    case "reviewed":
      return "under_review";
    case "action_taken":
      return "resolved";
    case "dismissed":
      return "resolved";
    default:
      return "pending";
  }
}

function mapTargetType(t: string): ReportType {
  const raw = String(t).trim().toLowerCase();
  if (raw === "live_stream") return "live";
  if (
    raw === "post" ||
    raw === "comment" ||
    raw === "profile" ||
    raw === "live" ||
    raw === "circle_thread" ||
    raw === "circle_reply" ||
    raw === "stream_message"
  ) {
    return raw as ReportType;
  }
  return "post";
}

export type LoadReportsOptions = {
  /** Moderation console: only items that still need triage (pending / in review). */
  openQueueOnly?: boolean;
};

export async function loadReports(options?: LoadReportsOptions): Promise<ReportRow[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createAdminDataSupabaseClient();
    let qb = supabase
      .from("reports")
      .select("id, reporter_id, target_type, target_id, reason, details, status, created_at, staff_notes")
      .order("created_at", { ascending: false })
      .limit(200);
    if (options?.openQueueOnly) {
      qb = qb.in("status", ["pending", "reviewed"]);
    }
    const { data: rows, error } = await qb;

    if (error) {
      console.error("loadReports:", error.message);
      return [];
    }
    if (!rows?.length) return [];

    const reporterIds = [...new Set(rows.map((r) => r.reporter_id as string))];
    const profileTargetIds = [
      ...new Set(rows.filter((r) => String(r.target_type) === "profile").map((r) => String(r.target_id))),
    ];
    const postTargetIds = [
      ...new Set(rows.filter((r) => String(r.target_type) === "post").map((r) => String(r.target_id))),
    ];
    const commentTargetIds = [
      ...new Set(rows.filter((r) => String(r.target_type) === "comment").map((r) => String(r.target_id))),
    ];
    const circleThreadTargetIds = [
      ...new Set(rows.filter((r) => String(r.target_type) === "circle_thread").map((r) => String(r.target_id))),
    ];
    const circleReplyTargetIds = [
      ...new Set(rows.filter((r) => String(r.target_type) === "circle_reply").map((r) => String(r.target_id))),
    ];
    const liveTargetIds = [
      ...new Set(
        rows
          .filter((r) => {
            const tt = String(r.target_type);
            return tt === "live" || tt === "live_stream";
          })
          .map((r) => String(r.target_id)),
      ),
    ];
    const streamMessageTargetIds = [
      ...new Set(rows.filter((r) => String(r.target_type) === "stream_message").map((r) => String(r.target_id))),
    ];

    const reportersQ = supabase.from("profiles").select("id, display_name, role").in("id", reporterIds);
    const profileTargetsQ =
      profileTargetIds.length > 0
        ? supabase
            .from("profiles")
            .select("id, display_name, role, is_verified")
            .in("id", profileTargetIds)
        : Promise.resolve({ data: [] as { id: string; display_name: string; role: string; is_verified: boolean }[] });
    const postsQ =
      postTargetIds.length > 0
        ? supabase.from("posts").select("id, caption, creator_id").in("id", postTargetIds)
        : Promise.resolve({ data: [] as { id: string; caption: string; creator_id: string }[] });
    const commentsQ =
      commentTargetIds.length > 0
        ? supabase.from("comments").select("id, content, author_id").in("id", commentTargetIds)
        : Promise.resolve({ data: [] as { id: string; content: string; author_id: string }[] });
    const circleThreadsQ =
      circleThreadTargetIds.length > 0
        ? supabase.from("circle_threads").select("id, title, body, author_id").in("id", circleThreadTargetIds)
        : Promise.resolve({ data: [] as { id: string; title: string; body: string; author_id: string }[] });
    const circleRepliesQ =
      circleReplyTargetIds.length > 0
        ? supabase.from("circle_replies").select("id, body, author_id").in("id", circleReplyTargetIds)
        : Promise.resolve({ data: [] as { id: string; body: string; author_id: string }[] });
    const liveStreamsQ =
      liveTargetIds.length > 0
        ? supabase.from("live_streams").select("id, title, host_id").in("id", liveTargetIds)
        : Promise.resolve({ data: [] as { id: string; title: string; host_id: string }[] });
    const streamMessagesQ =
      streamMessageTargetIds.length > 0
        ? supabase.from("stream_messages").select("id, content, user_id, stream_id").in("id", streamMessageTargetIds)
        : Promise.resolve({ data: [] as { id: string; content: string; user_id: string; stream_id: string }[] });

    const [reporters, profileTargets, posts, comments, circleThreads, circleReplies, liveStreams, streamMessages] =
      await Promise.all([
      reportersQ,
      profileTargetsQ,
      postsQ,
      commentsQ,
      circleThreadsQ,
      circleRepliesQ,
      liveStreamsQ,
      streamMessagesQ,
    ]);

    const reporterMap = new Map((reporters.data ?? []).map((p) => [p.id as string, p]));
    const profileById = new Map((profileTargets.data ?? []).map((p) => [p.id as string, p]));
    const postById = new Map((posts.data ?? []).map((p) => [p.id as string, p]));
    const commentById = new Map((comments.data ?? []).map((c) => [c.id as string, c]));
    const circleThreadById = new Map((circleThreads.data ?? []).map((t) => [t.id as string, t]));
    const circleReplyById = new Map((circleReplies.data ?? []).map((r) => [r.id as string, r]));
    const liveStreamById = new Map((liveStreams.data ?? []).map((s) => [s.id as string, s]));
    const streamMessageById = new Map((streamMessages.data ?? []).map((m) => [m.id as string, m]));

    const extraIds = [
      ...new Set([
        ...(posts.data ?? []).map((p) => p.creator_id as string),
        ...(comments.data ?? []).map((c) => c.author_id as string),
        ...(circleThreads.data ?? []).map((t) => t.author_id as string),
        ...(circleReplies.data ?? []).map((r) => r.author_id as string),
        ...(liveStreams.data ?? []).map((s) => s.host_id as string),
        ...(streamMessages.data ?? []).map((m) => m.user_id as string),
      ]),
    ].filter((id) => id && !profileById.has(id));

    if (extraIds.length > 0) {
      const { data: extra } = await supabase
        .from("profiles")
        .select("id, display_name, role, is_verified")
        .in("id", extraIds);
      for (const p of extra ?? []) {
        profileById.set(p.id as string, p);
      }
    }

    return rows.map((r) => {
      const reason = mapReportReason(String(r.reason));
      const status = mapReportStatus(String(r.status));
      const type = mapTargetType(String(r.target_type));
      const detailsText = ((r.details as string | null) ?? "").trim();
      const previewBase = detailsText || `${r.target_type} · ${r.target_id}`;

      let subjectDisplayName = String(r.target_id).slice(0, 48);
      let subjectMeta = `${String(r.target_type)} reported`;

      const tt = String(r.target_type);
      if (tt === "profile") {
        const pr = profileById.get(String(r.target_id));
        if (pr) {
          subjectDisplayName = String(pr.display_name || subjectDisplayName);
          subjectMeta = pr.is_verified ? "Verified · profile" : `Profile · ${pr.role ?? "member"}`;
        }
      } else if (tt === "post") {
        const post = postById.get(String(r.target_id));
        if (post) {
          const cap = String(post.caption || "").trim();
          subjectDisplayName = (cap || "Post").slice(0, 140);
          const author = profileById.get(post.creator_id as string);
          subjectMeta = author ? `Post · ${author.display_name}` : "Post";
        }
      } else if (tt === "comment") {
        const c = commentById.get(String(r.target_id));
        if (c) {
          const body = String(c.content || "").trim();
          subjectDisplayName = (body || "Comment").slice(0, 140);
          const author = profileById.get(c.author_id as string);
          subjectMeta = author ? `Comment · ${author.display_name}` : "Comment";
        }
      } else if (tt === "circle_thread") {
        const thread = circleThreadById.get(String(r.target_id));
        if (thread) {
          const title = String(thread.title || thread.body || "").trim();
          subjectDisplayName = (title || "Circle thread").slice(0, 140);
          const author = profileById.get(thread.author_id as string);
          subjectMeta = author ? `Circle thread · ${author.display_name}` : "Circle thread";
        } else {
          subjectMeta = "Circle thread";
        }
      } else if (tt === "circle_reply") {
        const reply = circleReplyById.get(String(r.target_id));
        if (reply) {
          const body = String(reply.body || "").trim();
          subjectDisplayName = (body || "Circle reply").slice(0, 140);
          const author = profileById.get(reply.author_id as string);
          subjectMeta = author ? `Circle reply · ${author.display_name}` : "Circle reply";
        } else {
          subjectMeta = "Circle reply";
        }
      } else if (tt === "live" || tt === "live_stream") {
        const stream = liveStreamById.get(String(r.target_id));
        if (stream) {
          subjectDisplayName = String(stream.title || "Live stream").slice(0, 140);
          const host = profileById.get(stream.host_id as string);
          subjectMeta = host ? `Live stream · ${host.display_name}` : "Live stream";
        } else {
          subjectMeta = "Live stream";
        }
      } else if (tt === "stream_message") {
        const msg = streamMessageById.get(String(r.target_id));
        if (msg) {
          subjectDisplayName = String(msg.content || "Live chat message").slice(0, 140);
          const author = profileById.get(msg.user_id as string);
          subjectMeta = author ? `Live chat · ${author.display_name}` : "Live chat message";
        } else {
          subjectMeta = "Live chat message";
        }
      }

      const rep = reporterMap.get(r.reporter_id as string);
      const reporterName = rep ? String((rep as { display_name?: string }).display_name || "Reporter") : "Reporter";

      return {
        id: String(r.id),
        type,
        targetId: String(r.target_id),
        preview: previewBase.slice(0, 280),
        details: previewBase,
        staffNotes: (r as { staff_notes?: string | null }).staff_notes ?? null,
        reporterName,
        reporterId: String(r.reporter_id),
        subjectName: String(r.target_id).slice(0, 48),
        subjectDisplayName,
        subjectMeta,
        reason,
        status,
        severity: (reason === "potential_phi" || reason === "unsafe_medical"
          ? "critical"
          : reason === "harassment"
            ? "high"
            : "medium") as Severity,
        createdAt: r.created_at as string,
      };
    });
  } catch (e) {
    console.error("loadReports exception:", e);
    return [];
  }
}

export async function loadAdminNotificationDigest(): Promise<AdminNotificationDigest> {
  if (!isSupabaseConfigured()) {
    return { items: [], unreadCount: 0, pendingAppealsCount: 0 };
  }
  try {
    const supabase = await createAdminDataSupabaseClient();
    const [repRes, appRes, pendingAppealsRes] = await Promise.all([
      supabase
        .from("reports")
        .select("id, reason, details, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(12),
      supabase
        .from("content_appeals")
        .select("id, status, message, created_at")
        .in("status", ["pending", "reviewed"])
        .order("created_at", { ascending: false })
        .limit(10),
      supabase.from("content_appeals").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ]);

    const pendingAppealsCount = pendingAppealsRes.count ?? 0;

    const items: AdminNotificationItem[] = [];

    for (const r of repRes.data ?? []) {
      const subtitle =
        ((r.details as string | null) ?? "").trim().slice(0, 100) || `Reason: ${String(r.reason)}`;
      items.push({
        id: `rep-${r.id}`,
        title: "Pending safety report",
        subtitle,
        href: `/admin/moderation?report=${r.id}`,
        at: r.created_at as string,
      });
    }

    for (const a of appRes.data ?? []) {
      const subtitle = ((a.message as string | null) ?? "").trim().slice(0, 100) || `Status: ${String(a.status)}`;
      items.push({
        id: `app-${a.id}`,
        title: "Content appeal",
        subtitle,
        href: "/admin/appeals",
        at: a.created_at as string,
      });
    }

    items.sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime());
    const slice = items.slice(0, 14);
    return { items: slice, unreadCount: slice.length, pendingAppealsCount };
  } catch {
    return { items: [], unreadCount: 0, pendingAppealsCount: 0 };
  }
}

export async function loadAdminUsers(): Promise<AdminUser[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createAdminDataSupabaseClient();
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select(
        "id, display_name, role, specialty, city, state, created_at, avatar_url, follower_count, is_verified",
      )
      .order("created_at", { ascending: false })
      .limit(150);

    if (error || !profiles) {
      console.error("loadAdminUsers:", error?.message);
      return [];
    }

    const { data: bans } = await supabase
      .from("user_bans")
      .select("user_id, expires_at")
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

    const banned = new Set((bans ?? []).map((b) => b.user_id as string));

    return profiles.map((p) => {
      const isBanned = banned.has(p.id);
      return {
        id: p.id,
        displayName: p.display_name,
        profession: p.role,
        specialty: p.specialty,
        avatarUrl: p.avatar_url ?? undefined,
        status: isBanned ? "banned" : "active",
        reportsCount: 0,
        strikes: 0,
        joinedAt: (p.created_at as string).slice(0, 10),
        lastActive: "—",
        country: p.state || p.city || "—",
      };
    });
  } catch (e) {
    console.error("loadAdminUsers exception:", e);
    return [];
  }
}

export async function loadCircles(): Promise<CircleAdmin[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createAdminDataSupabaseClient();
    const { data, error } = await supabase
      .from("communities")
      .select("id, name, slug, member_count, post_count, featured_order, trending_topics")
      .order("member_count", { ascending: false })
      .limit(100);

    if (error || !data) {
      console.error("loadCircles:", error?.message);
      return [];
    }

    return data.map((c, i) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      members: c.member_count ?? 0,
      posts24h: 0,
      featuredOrder: c.featured_order,
      trendScore: (c.trending_topics?.length ?? 0) + (100 - i),
    }));
  } catch (e) {
    console.error("loadCircles exception:", e);
    return [];
  }
}

export async function loadAppeals(): Promise<AppealRow[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createAdminDataSupabaseClient();
    const { data, error } = await supabase
      .from("content_appeals")
      .select("id, user_id, post_id, message, status, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error || !data) {
      console.error("loadAppeals:", error?.message);
      return [];
    }

    const userIds = [...new Set(data.map((a) => a.user_id as string))];
    const { data: profs } = await supabase.from("profiles").select("id, display_name").in("id", userIds);

    const names = new Map((profs ?? []).map((p) => [p.id as string, p.display_name as string]));

    const statusMap: Record<string, AppealRow["status"]> = {
      pending: "open",
      open: "open",
      reviewed: "under_review",
      approved: "accepted",
      rejected: "denied",
      denied: "denied",
      accepted: "accepted",
    };

    return data.map((a) => ({
      id: a.id as string,
      userName: names.get(a.user_id as string) ?? (a.user_id as string).slice(0, 8),
      actionTaken: a.post_id ? `Post ${String(a.post_id).slice(0, 8)}…` : "Account / content",
      requestedAt: a.created_at as string,
      status: statusMap[String(a.status)] ?? "open",
      notes: (a.message as string) || "—",
    }));
  } catch (e) {
    console.error("loadAppeals exception:", e);
    return [];
  }
}

export async function loadCampaigns(): Promise<CampaignRow[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createAdminDataSupabaseClient();
    const { data, error } = await supabase
      .from("ad_campaigns")
      .select(
        "id, advertiser_name, title, start_date, end_date, impressions, clicks, status, cpm_rate, budget_total, budget_spent",
      )
      .order("start_date", { ascending: false })
      .limit(120);

    if (error || !data) {
      console.error("loadCampaigns:", error?.message);
      return [];
    }

    return data.map((c) => {
      const impressions = Number(c.impressions ?? 0);
      const clicks = Number(c.clicks ?? 0);
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
      const startRaw = c.start_date as string;
      const endRaw = c.end_date as string;
      return {
        id: c.id as string,
        sponsor: c.advertiser_name as string,
        placement: (c.title as string) || "In-feed",
        start: startRaw?.slice(0, 10) ?? "—",
        end: endRaw?.slice(0, 10) ?? "—",
        impressions,
        clicks,
        ctr: Math.round(ctr * 100) / 100,
        status: String(c.status ?? "—"),
        budgetTotal: Number(c.budget_total ?? 0),
        budgetSpent: Number(c.budget_spent ?? 0),
        pacingNote: computeCampaignPacingNote({
          start_date: startRaw,
          end_date: endRaw,
          budget_total: c.budget_total,
          budget_spent: c.budget_spent,
        }),
      };
    });
  } catch (e) {
    console.error("loadCampaigns exception:", e);
    return [];
  }
}

/** Single campaign row for detail reporting (no per-day delivery table in schema). */
export async function loadCampaignById(id: string): Promise<CampaignRow | null> {
  if (!isSupabaseConfigured() || !id?.trim()) return null;
  try {
    const supabase = await createAdminDataSupabaseClient();
    const { data, error } = await supabase
      .from("ad_campaigns")
      .select(
        "id, advertiser_name, title, start_date, end_date, impressions, clicks, status, cpm_rate, budget_total, budget_spent",
      )
      .eq("id", id.trim())
      .maybeSingle();
    if (error || !data) {
      if (error) console.error("loadCampaignById:", error.message);
      return null;
    }
    const impressions = Number(data.impressions ?? 0);
    const clicks = Number(data.clicks ?? 0);
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const startRaw = data.start_date as string;
    const endRaw = data.end_date as string;
    return {
      id: data.id as string,
      sponsor: data.advertiser_name as string,
      placement: (data.title as string) || "In-feed",
      start: startRaw?.slice(0, 10) ?? "—",
      end: endRaw?.slice(0, 10) ?? "—",
      impressions,
      clicks,
      ctr: Math.round(ctr * 100) / 100,
      status: String(data.status ?? "—"),
      budgetTotal: Number(data.budget_total ?? 0),
      budgetSpent: Number(data.budget_spent ?? 0),
      pacingNote: computeCampaignPacingNote({
        start_date: startRaw,
        end_date: endRaw,
        budget_total: data.budget_total,
        budget_spent: data.budget_spent,
      }),
    };
  } catch (e) {
    console.error("loadCampaignById exception:", e);
    return null;
  }
}

export async function loadLiveSessions(): Promise<LiveSessionRow[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createAdminDataSupabaseClient();
    const { data: rows, error } = await supabase
      .from("live_streams")
      .select(
        "id, title, status, viewer_count, peak_viewer_count, started_at, created_at, host_id",
      )
      .order("created_at", { ascending: false })
      .limit(80);

    if (error || !rows?.length) {
      if (error) console.error("loadLiveSessions:", error.message);
      return [];
    }

    const hostIds = [...new Set(rows.map((r) => r.host_id as string))];
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", hostIds);
    const names = new Map((profs ?? []).map((p) => [p.id as string, p.display_name as string]));

    return rows.map((row) => {
      const host = names.get(row.host_id as string) ?? "Host";
      const st = String(row.status);
      const status: LiveSessionRow["status"] =
        st === "live" ? "live" : st === "ended" ? "ended" : "flagged";
      return {
        id: String(row.id),
        title: String(row.title),
        host,
        viewers: Number(row.viewer_count ?? 0),
        peak: Number(row.peak_viewer_count ?? row.viewer_count ?? 0),
        status,
        startedAt: (row.started_at as string | null) ?? (row.created_at as string | null) ?? "",
        flags: st === "live" ? 0 : st === "ended" ? 0 : 1,
      };
    });
  } catch (e) {
    console.error("loadLiveSessions exception:", e);
    return [];
  }
}

export async function loadCreatorRoleOptions(): Promise<string[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createAdminDataSupabaseClient();
    const { data } = await supabase.from("profiles").select("role").limit(4000);
    const bag = new Set<string>();
    for (const row of data ?? []) {
      const role = String((row as { role?: string }).role ?? "").trim();
      if (role) bag.add(role);
    }
    return [...bag].sort((a, b) => a.localeCompare(b));
  } catch (e) {
    console.error("loadCreatorRoleOptions:", e);
    return [];
  }
}

export async function loadCreators(filters?: LoadCreatorsFilters): Promise<CreatorRow[]> {
  if (!isSupabaseConfigured()) return [];
  const limit = Math.min(Math.max(filters?.limit ?? 80, 1), 200);
  try {
    const supabase = await createAdminDataSupabaseClient();
    let qb = supabase
      .from("profiles")
      .select("id, username, display_name, role, follower_count, is_verified, post_count, updated_at")
      .limit(limit);

    const verified = filters?.verified ?? "all";
    if (verified === "yes") qb = qb.eq("is_verified", true);
    else if (verified === "no") qb = qb.eq("is_verified", false);

    const role = filters?.role?.trim();
    if (role) qb = qb.eq("role", role);

    const minF = filters?.minFollowers;
    if (minF != null && minF > 0) qb = qb.gte("follower_count", minF);

    const sort = filters?.sort ?? "followers";
    const orderCol = sort === "posts" ? "post_count" : sort === "updated" ? "updated_at" : "follower_count";
    qb = qb.order(orderCol, { ascending: false });

    const { data, error } = await qb;

    if (error || !data) {
      console.error("loadCreators:", error?.message);
      return [];
    }

    return data.map((p) => {
      const uname = typeof p.username === "string" ? p.username.trim() : "";
      const dn = String(p.display_name || "user").trim();
      const handle = uname ? `@${uname}` : `@${dn.toLowerCase().replace(/\s+/g, "")}`;
      return {
        id: p.id,
        handle,
        profession_display: p.role,
        followers: p.follower_count ?? 0,
        liveHours: 0,
        verified: p.is_verified ?? false,
        score: Math.min(100, Math.round(Math.log10((p.follower_count ?? 0) + 10) * 28)),
        post_count: p.post_count ?? 0,
        updated_at: String((p as { updated_at?: string }).updated_at ?? ""),
      };
    });
  } catch (e) {
    console.error("loadCreators exception:", e);
    return [];
  }
}

export async function loadAdminCounts() {
  if (!isSupabaseConfigured()) {
    return {
      users: 0,
      openReports: 0,
      circles: 0,
      liveSessions: 0,
      dau24h: 0,
      pendingAppeals: 0,
      posts: 0,
      comments: 0,
    };
  }
  try {
    const supabase = await createAdminDataSupabaseClient();
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [profiles, reportsPending, communities, liveNow, appealsOpen, analyticsSample, postsCount, commentsCount] =
      await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("communities").select("id", { count: "exact", head: true }),
      supabase.from("live_streams").select("*", { count: "exact", head: true }).eq("status", "live"),
      supabase
        .from("content_appeals")
        .select("*", { count: "exact", head: true })
        .in("status", ["pending", "reviewed"]),
      supabase
        .from("analytics_events")
        .select("user_id")
        .gte("created_at", dayAgo)
        .not("user_id", "is", null)
        .limit(25_000),
      supabase.from("posts").select("id", { count: "exact", head: true }),
      supabase.from("comments").select("id", { count: "exact", head: true }),
    ]);

    const dau24h = new Set((analyticsSample.data ?? []).map((r) => r.user_id as string)).size;

    return {
      users: profiles.count ?? 0,
      openReports: reportsPending.count ?? 0,
      circles: communities.count ?? 0,
      liveSessions: liveNow.count ?? 0,
      dau24h,
      pendingAppeals: appealsOpen.count ?? 0,
      posts: postsCount.count ?? 0,
      comments: commentsCount.count ?? 0,
    };
  } catch {
    return {
      users: 0,
      openReports: 0,
      circles: 0,
      liveSessions: 0,
      dau24h: 0,
      pendingAppeals: 0,
      posts: 0,
      comments: 0,
    };
  }
}

export type AuditEventRow = {
  id: string;
  event_name: string;
  created_at: string;
  user_id: string | null;
};

/** Recent product analytics (admin RLS). Surfaces as a read-only activity stream in Settings. */
export async function loadRecentAnalyticsEvents(limit = 25): Promise<AuditEventRow[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createAdminDataSupabaseClient();
    const { data, error } = await supabase
      .from("analytics_events")
      .select("id, event_name, created_at, user_id")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data?.length) {
      return [];
    }

    return data.map((r) => ({
      id: String(r.id),
      event_name: String(r.event_name),
      created_at: r.created_at as string,
      user_id: (r.user_id as string | null) ?? null,
    }));
  } catch {
    return [];
  }
}

const CHART_FILLS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "rgba(148,163,184,0.55)",
] as const;

function labelForReportReason(reason: string): string {
  const r = reason.trim().toLowerCase();
  const map: Record<string, string> = {
    hate_abuse: "Hate or abuse",
    unsafe_medical: "Unsafe medical",
    potential_phi: "PHI risk",
    live_incident: "Live incident",
    misinformation: "Misinformation",
  };
  if (map[r]) return map[r];
  return r
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function sourceLabelForTargetType(targetType: string): string {
  switch (targetType) {
    case "post":
      return "Feed posts";
    case "comment":
      return "Comments";
    case "profile":
      return "Profiles";
    case "live":
      return "Live";
    case "circle_thread":
      return "Circle threads";
    case "stream_message":
      return "Live chat";
    case "live_stream":
      return "Live";
    default:
      return targetType || "Other";
  }
}

function lastNMonthEndIso(n: number): { label: string; endIso: string }[] {
  const out: { label: string; endIso: string }[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const end = new Date(
      Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0, 23, 59, 59, 999),
    );
    const label = end.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
    out.push({ label, endIso: end.toISOString() });
  }
  return out;
}

function last7UtcDayBuckets(): { day: string; startIso: string; endIso: string; key: string }[] {
  const out: { day: string; startIso: string; endIso: string; key: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date();
    day.setUTCDate(day.getUTCDate() - i);
    const start = new Date(
      Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 0, 0, 0),
    );
    const end = new Date(
      Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 23, 59, 59, 999),
    );
    out.push({
      day: start.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
      startIso: start.toISOString(),
      endIso: end.toISOString(),
      key: start.toISOString().slice(0, 10),
    });
  }
  return out;
}

function bucketTimestamps(rows: { created_at: string }[] | null, buckets: { key: string; startIso: string; endIso: string }[]) {
  const counts = new Map<string, number>();
  for (const b of buckets) counts.set(b.key, 0);
  for (const r of rows ?? []) {
    const t = new Date(r.created_at as string).getTime();
    for (const b of buckets) {
      if (t >= new Date(b.startIso).getTime() && t <= new Date(b.endIso).getTime()) {
        counts.set(b.key, (counts.get(b.key) ?? 0) + 1);
        break;
      }
    }
  }
  return counts;
}

export async function loadProfileGrowthSeries(months = 8): Promise<GrowthPoint[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createAdminDataSupabaseClient();
    const points = lastNMonthEndIso(months);
    const results = await Promise.all(
      points.map(({ endIso }) =>
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .lte("created_at", endIso),
      ),
    );
    return points.map((p, i) => ({
      month: p.label,
      users: results[i].count ?? 0,
    }));
  } catch (e) {
    console.error("loadProfileGrowthSeries:", e);
    return [];
  }
}

export async function loadEngagementWeekSeries(): Promise<EngagementDayPoint[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createAdminDataSupabaseClient();
    const buckets = last7UtcDayBuckets();
    const since = buckets[0].startIso;
    const [posts, comments, likes, shares] = await Promise.all([
      supabase.from("posts").select("created_at").gte("created_at", since).limit(12_000),
      supabase.from("comments").select("created_at").gte("created_at", since).limit(12_000),
      supabase.from("post_likes").select("created_at").gte("created_at", since).limit(12_000),
      supabase.from("post_shares").select("created_at").gte("created_at", since).limit(12_000),
    ]);

    const cPosts = bucketTimestamps(posts.data, buckets);
    const cComments = bucketTimestamps(comments.data, buckets);
    const cLikes = bucketTimestamps(likes.data, buckets);
    const cShares = bucketTimestamps(shares.data, buckets);

    return buckets.map((b) => ({
      day: b.day,
      messages: (cComments.get(b.key) ?? 0) + (cPosts.get(b.key) ?? 0),
      reactions: cLikes.get(b.key) ?? 0,
      shares: cShares.get(b.key) ?? 0,
    }));
  } catch (e) {
    console.error("loadEngagementWeekSeries:", e);
    return last7UtcDayBuckets().map((b) => ({
      day: b.day,
      messages: 0,
      reactions: 0,
      shares: 0,
    }));
  }
}

export async function loadAudienceRoleMix(limitRoles = 5): Promise<AudienceSlice[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createAdminDataSupabaseClient();
    const { data, error } = await supabase.from("profiles").select("role").limit(8000);
    if (error || !data?.length) return [];

    const tallies = new Map<string, number>();
    for (const row of data) {
      const role = (row.role as string)?.trim() || "Unspecified";
      tallies.set(role, (tallies.get(role) ?? 0) + 1);
    }
    const sorted = [...tallies.entries()].sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, limitRoles);
    const rest = sorted.slice(limitRoles).reduce((s, [, n]) => s + n, 0);
    const total = [...tallies.values()].reduce((s, n) => s + n, 0) || 1;
    const slices: AudienceSlice[] = top.map(([name, count], i) => ({
      name,
      value: Math.round((count / total) * 1000) / 10,
      fill: CHART_FILLS[i % CHART_FILLS.length],
    }));
    if (rest > 0) {
      slices.push({
        name: "Other",
        value: Math.round((rest / total) * 1000) / 10,
        fill: CHART_FILLS[5],
      });
    }
    return slices;
  } catch (e) {
    console.error("loadAudienceRoleMix:", e);
    return [];
  }
}

export async function loadReportReasonsMix(limit = 8): Promise<ReportReasonSlice[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createAdminDataSupabaseClient();
    const { data, error } = await supabase.from("reports").select("reason").limit(4000);
    if (error || !data?.length) return [];

    const tallies = new Map<string, number>();
    for (const row of data) {
      const key = String(row.reason || "other").toLowerCase();
      tallies.set(key, (tallies.get(key) ?? 0) + 1);
    }
    const sorted = [...tallies.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
    return sorted.map(([reason, value], i) => ({
      name: labelForReportReason(reason),
      value,
      fill: CHART_FILLS[i % CHART_FILLS.length],
    }));
  } catch (e) {
    console.error("loadReportReasonsMix:", e);
    return [];
  }
}

export async function loadReportsBySourceBars(): Promise<ReportSourceBar[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createAdminDataSupabaseClient();
    const { data, error } = await supabase.from("reports").select("target_type").limit(4000);
    if (error || !data?.length) return [];

    const tallies = new Map<string, number>();
    for (const row of data) {
      const raw = String(row.target_type || "post").toLowerCase();
      const label = sourceLabelForTargetType(raw);
      tallies.set(label, (tallies.get(label) ?? 0) + 1);
    }
    return [...tallies.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([source, count]) => ({ source, count }));
  } catch (e) {
    console.error("loadReportsBySourceBars:", e);
    return [];
  }
}

export async function loadTopCirclesActivityBars(topN = 6): Promise<CircleActivityBar[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createAdminDataSupabaseClient();
    const { data, error } = await supabase
      .from("communities")
      .select("name, post_count")
      .order("post_count", { ascending: false })
      .limit(topN);

    if (error || !data?.length) return [];
    const counts = data.map((r) => Number(r.post_count ?? 0));
    const max = Math.max(1, ...counts);
    return data.map((r) => {
      const raw = String(r.name || "Circle");
      const name = raw.length > 22 ? `${raw.slice(0, 20)}…` : raw;
      const pc = Number(r.post_count ?? 0);
      return { name, value: Math.round((pc / max) * 100) };
    });
  } catch (e) {
    console.error("loadTopCirclesActivityBars:", e);
    return [];
  }
}

export type ReportPipelineBucket = { status: string; count: number };

export async function loadReportPipelineSummary(): Promise<ReportPipelineBucket[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createAdminDataSupabaseClient();
    const { data, error } = await supabase.from("reports").select("status").limit(5000);
    if (error || !data?.length) {
      return [
        { status: "pending", count: 0 },
        { status: "under_review", count: 0 },
        { status: "resolved", count: 0 },
      ];
    }
    let pending = 0;
    let under = 0;
    let resolved = 0;
    for (const row of data) {
      const s = String(row.status);
      if (s === "pending") pending += 1;
      else if (s === "reviewed") under += 1;
      else if (s === "action_taken" || s === "dismissed") resolved += 1;
      else pending += 1;
    }
    return [
      { status: "pending", count: pending },
      { status: "under_review", count: under },
      { status: "resolved", count: resolved },
    ];
  } catch (e) {
    console.error("loadReportPipelineSummary:", e);
    return [
      { status: "pending", count: 0 },
      { status: "under_review", count: 0 },
      { status: "resolved", count: 0 },
    ];
  }
}

export type AdminActivityItem = { id: string; summary: string; actor: string; at: string };

export async function loadRecentAdminActivityFeed(limit = 10): Promise<AdminActivityItem[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createAdminDataSupabaseClient();
    const [reports, appeals, events] = await Promise.all([
      supabase
        .from("reports")
        .select("id, created_at, reason, target_type, reporter_id")
        .order("created_at", { ascending: false })
        .limit(12),
      supabase.from("content_appeals").select("id, created_at, status").order("created_at", { ascending: false }).limit(8),
      supabase
        .from("analytics_events")
        .select("id, created_at, event_name")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const items: AdminActivityItem[] = [];
    for (const r of reports.data ?? []) {
      items.push({
        id: `rep-${r.id}`,
        summary: `New report · ${sourceLabelForTargetType(String(r.target_type))} · ${labelForReportReason(String(r.reason))}`,
        actor: "Safety queue",
        at: r.created_at as string,
      });
    }
    for (const a of appeals.data ?? []) {
      items.push({
        id: `app-${a.id}`,
        summary: `Appeal ${String(a.status)}`,
        actor: "Appeals",
        at: a.created_at as string,
      });
    }
    for (const e of events.data ?? []) {
      items.push({
        id: `evt-${e.id}`,
        summary: `Analytics · ${String(e.event_name)}`,
        actor: "Product analytics",
        at: e.created_at as string,
      });
    }

    items.sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime());
    return items.slice(0, limit);
  } catch (e) {
    console.error("loadRecentAdminActivityFeed:", e);
    return [];
  }
}

export type ModeratorLoadRow = { id: string; name: string; load: number };

export async function loadModeratorWorkloadSnapshot(): Promise<ModeratorLoadRow[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createAdminDataSupabaseClient();
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from("reports")
      .select("reviewed_by")
      .not("reviewed_by", "is", null)
      .gte("reviewed_at", weekAgo)
      .limit(3000);

    const tallies = new Map<string, number>();
    for (const row of data ?? []) {
      const id = row.reviewed_by as string;
      tallies.set(id, (tallies.get(id) ?? 0) + 1);
    }
    if (!tallies.size) {
      const pending = await supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      const n = pending.count ?? 0;
      return [{ id: "queue", name: "Open queue (unassigned)", load: Math.min(100, n * 3 + 5) }];
    }

    const ids = [...tallies.keys()];
    const { data: profs } = await supabase.from("profiles").select("id, display_name").in("id", ids);
    const names = new Map((profs ?? []).map((p) => [p.id as string, (p.display_name as string) || "Moderator"]));
    const max = Math.max(1, ...[...tallies.values()]);
    return [...tallies.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([id, count]) => ({
        id,
        name: names.get(id) ?? id.slice(0, 8),
        load: Math.round((count / max) * 100),
      }));
  } catch (e) {
    console.error("loadModeratorWorkloadSnapshot:", e);
    return [];
  }
}

export async function loadCriticalOpenReportsCount(): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  try {
    const supabase = await createAdminDataSupabaseClient();
    const { count, error } = await supabase
      .from("reports")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")
      .in("reason", ["unsafe_medical", "potential_phi", "live_incident"]);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

export type OpsStripItem = { label: string; value: string; hint?: string };

export function buildDashboardOpsStrip(input: {
  criticalReports: number;
  pendingAppeals: number;
  liveFlagged: number;
  topCircleName: string | null;
  topCircleMembers: number;
}): OpsStripItem[] {
  return [
    {
      label: "Critical reports",
      value: String(input.criticalReports),
      hint: "Unsafe medical · PHI · live",
    },
    {
      label: "Open appeals",
      value: String(input.pendingAppeals),
      hint: "pending or in review",
    },
    {
      label: "Flagged / abnormal live",
      value: String(input.liveFlagged),
      hint: "not live or ended",
    },
    {
      label: "Largest circle",
      value: input.topCircleName ?? "—",
      hint: input.topCircleMembers ? `${formatCount(input.topCircleMembers)} members` : "no data",
    },
  ];
}

export type HealthServiceRow = { name: string; status: "operational" | "degraded" | "down" };

export async function loadSystemHealthSnapshot(): Promise<HealthServiceRow[]> {
  const base: HealthServiceRow[] = [
    { name: "Web platform", status: "operational" },
    { name: "API & database", status: "degraded" },
    { name: "Live streaming", status: "operational" },
    { name: "Media CDN", status: "operational" },
    { name: "Product analytics", status: "operational" },
  ];
  if (!isSupabaseConfigured()) {
    return base.map((r, i) => (i === 1 ? { ...r, status: "down" as const } : r));
  }
  try {
    const supabase = await createAdminDataSupabaseClient();
    const [ping, analyticsPing] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }).limit(1),
      supabase.from("analytics_events").select("id", { count: "exact", head: true }).limit(1),
    ]);
    const dbOk = !ping.error;
    const analyticsOk = !analyticsPing.error;
    return [
      { name: "Web platform", status: "operational" },
      { name: "API & database", status: dbOk ? "operational" : "degraded" },
      { name: "Live streaming", status: "operational" },
      { name: "Media CDN", status: "operational" },
      { name: "Product analytics", status: analyticsOk ? "operational" : "degraded" },
    ];
  } catch {
    return base;
  }
}

export type ModerationKpiStats = {
  open: number;
  needsReview: number;
  resolvedToday: number;
  critical: number;
  avgResolutionHours: number | null;
};

export async function loadModerationKpiStats(): Promise<ModerationKpiStats> {
  const empty: ModerationKpiStats = {
    open: 0,
    needsReview: 0,
    resolvedToday: 0,
    critical: 0,
    avgResolutionHours: null,
  };
  if (!isSupabaseConfigured()) return empty;
  try {
    const supabase = await createAdminDataSupabaseClient();
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const todayIso = start.toISOString();

    const [pending, reviewed, resolvedToday, critical, closedSample] = await Promise.all([
      supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "reviewed"),
      supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .gte("reviewed_at", todayIso)
        .in("status", ["action_taken", "dismissed"]),
      supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending")
        .in("reason", ["unsafe_medical", "potential_phi", "live_incident"]),
      supabase
        .from("reports")
        .select("created_at, reviewed_at")
        .not("reviewed_at", "is", null)
        .in("status", ["action_taken", "dismissed"])
        .limit(400),
    ]);

    let avgH: number | null = null;
    const samp = closedSample.data ?? [];
    if (samp.length) {
      let sumMs = 0;
      let n = 0;
      for (const row of samp) {
        const c = new Date(row.created_at as string).getTime();
        const rAt = new Date(row.reviewed_at as string).getTime();
        if (Number.isFinite(c) && Number.isFinite(rAt) && rAt >= c) {
          sumMs += rAt - c;
          n += 1;
        }
      }
      if (n) avgH = sumMs / n / 3600000;
    }

    return {
      open: pending.count ?? 0,
      needsReview: reviewed.count ?? 0,
      resolvedToday: resolvedToday.count ?? 0,
      critical: critical.count ?? 0,
      avgResolutionHours: avgH,
    };
  } catch (e) {
    console.error("loadModerationKpiStats:", e);
    return empty;
  }
}

function parseMarketingLeadTopic(message: string): string | null {
  const m = message.match(/^\[Inquiry:\s*([^\]]+)\]/i);
  return m ? m[1].trim() : null;
}

/** Public marketing contact form rows (service-role-capable loader for admin UI). */
export async function loadMarketingContactMessages(options?: {
  limit?: number;
  status?: string;
}): Promise<MarketingContactLeadRow[]> {
  if (!isSupabaseConfigured()) return [];
  const limit = Math.min(Math.max(options?.limit ?? 200, 1), 500);
  const statusFilter = options?.status?.trim();
  try {
    const supabase = await createAdminDataSupabaseClient();
    let qb = supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table may lag generated Database typedefs
      .from("marketing_contact_messages" as any)
      .select("id, name, email, message, created_at, host, status, owner_id, internal_notes, last_contacted_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (statusFilter) {
      qb = qb.eq("status", statusFilter);
    }

    const { data, error } = await qb;

    if (error || !data) {
      if (error) console.error("loadMarketingContactMessages:", error.message);
      return [];
    }

    const rows = data as {
      id: string;
      name: string;
      email: string;
      message: string;
      created_at: string;
      host: string | null;
      status?: string | null;
      owner_id?: string | null;
      internal_notes?: string | null;
      last_contacted_at?: string | null;
    }[];

    const ownerIds = [...new Set(rows.map((r) => r.owner_id).filter(Boolean))] as string[];
    const nameMap = new Map<string, string>();
    if (ownerIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id, display_name").in("id", ownerIds);
      for (const p of profs ?? []) {
        nameMap.set(p.id as string, String((p as { display_name?: string }).display_name ?? "").trim() || "Staff");
      }
    }

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      message: row.message,
      created_at: row.created_at,
      host: row.host ?? null,
      topic: parseMarketingLeadTopic(row.message),
      status: typeof row.status === "string" && row.status ? row.status : "new",
      owner_id: row.owner_id ?? null,
      owner_display_name: row.owner_id ? (nameMap.get(row.owner_id) ?? null) : null,
      internal_notes: row.internal_notes ?? null,
      last_contacted_at: row.last_contacted_at ?? null,
    }));
  } catch (e) {
    console.error("loadMarketingContactMessages:", e);
    return [];
  }
}

export async function loadAdminLeadOwnerOptions(): Promise<{ id: string; label: string }[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createAdminDataSupabaseClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, username")
      .eq("role_admin", true)
      .order("display_name", { ascending: true })
      .limit(120);

    if (error || !data?.length) {
      if (error) console.error("loadAdminLeadOwnerOptions:", error.message);
      return [];
    }

    return data.map((p) => {
      const id = p.id as string;
      const dn = String((p as { display_name?: string }).display_name ?? "").trim();
      const un = String((p as { username?: string }).username ?? "").trim();
      const label = dn ? (un ? `${dn} (@${un})` : dn) : un ? `@${un}` : id.slice(0, 8);
      return { id, label };
    });
  } catch (e) {
    console.error("loadAdminLeadOwnerOptions:", e);
    return [];
  }
}

function campaignPlacementActive(statusRaw: string, startIso: string, endIso: string): boolean {
  const now = Date.now();
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  const st = statusRaw.toLowerCase();
  if (st.includes("pause") || st.includes("draft") || st.includes("cancel")) return false;
  if (st.includes("active") || st.includes("running") || st.includes("live")) return true;
  if (!Number.isFinite(start) || !Number.isFinite(end)) return false;
  return now >= start && now <= end;
}

/** Placement labels == `ad_campaigns.title` (no separate inventory table). */
export async function loadPlacementInventorySummary(): Promise<PlacementInventoryRow[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createAdminDataSupabaseClient();
    const { data, error } = await supabase
      .from("ad_campaigns")
      .select("title, status, impressions, clicks, start_date, end_date")
      .limit(400);

    if (error || !data?.length) {
      if (error) console.error("loadPlacementInventorySummary:", error.message);
      return [];
    }

    type Agg = {
      campaignCount: number;
      activeCampaignCount: number;
      impressionsSum: number;
      clicksSum: number;
      statuses: Set<string>;
    };
    const map = new Map<string, Agg>();

    for (const raw of data as {
      title: string;
      status: string | null;
      impressions: number | null;
      clicks: number | null;
      start_date: string;
      end_date: string;
    }[]) {
      const placement = String(raw.title ?? "").trim() || "Untitled";
      const statusStr = String(raw.status ?? "—");
      const impressions = Number(raw.impressions ?? 0);
      const clicks = Number(raw.clicks ?? 0);
      const active = campaignPlacementActive(statusStr, raw.start_date, raw.end_date);
      const cur = map.get(placement) ?? {
        campaignCount: 0,
        activeCampaignCount: 0,
        impressionsSum: 0,
        clicksSum: 0,
        statuses: new Set<string>(),
      };
      cur.campaignCount += 1;
      if (active) cur.activeCampaignCount += 1;
      cur.impressionsSum += impressions;
      cur.clicksSum += clicks;
      cur.statuses.add(statusStr);
      map.set(placement, cur);
    }

    return [...map.entries()]
      .map(([placement, a]) => {
        const ctr = a.impressionsSum > 0 ? ((a.clicksSum / a.impressionsSum) * 100).toFixed(3) : "0";
        return {
          placement,
          campaignCount: a.campaignCount,
          activeCampaignCount: a.activeCampaignCount,
          impressionsSum: a.impressionsSum,
          clicksSum: a.clicksSum,
          ctrPct: ctr,
          statuses: [...a.statuses].sort().join(", "),
        };
      })
      .sort((x, y) => y.impressionsSum - x.impressionsSum);
  } catch (e) {
    console.error("loadPlacementInventorySummary:", e);
    return [];
  }
}

export type BrandSafetySnapshot = {
  moderation: ModerationKpiStats;
  reportsCreated30d: number;
  reportsLast30dByDay: { date: string; count: number }[];
  reportOutcome: { actionTaken: number; dismissed: number };
  appealsOpen: number;
  appealsClosed30d: number;
  liveNonTerminalStreams24h: number;
};

/** Privacy-safe internal trust signals derived from existing moderation tables (aggregates only). */
export async function loadBrandSafetySnapshot(): Promise<BrandSafetySnapshot> {
  const moderation = await loadModerationKpiStats();
  const emptyTrend: BrandSafetySnapshot = {
    moderation,
    reportsCreated30d: 0,
    reportsLast30dByDay: [],
    reportOutcome: { actionTaken: 0, dismissed: 0 },
    appealsOpen: 0,
    appealsClosed30d: 0,
    liveNonTerminalStreams24h: 0,
  };
  if (!isSupabaseConfigured()) return emptyTrend;

  try {
    const supabase = await createAdminDataSupabaseClient();
    const since30 = new Date(Date.now() - 30 * 86400000).toISOString();
    const dayKeys: string[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() - i));
      dayKeys.push(d.toISOString().slice(0, 10));
    }
    const countsByDay = Object.fromEntries(dayKeys.map((k) => [k, 0])) as Record<string, number>;

    const [
      reports30Count,
      reportRows,
      actionTaken,
      dismissed,
      appealsOpen,
      appealsClosed,
      liveSnap,
    ] = await Promise.all([
      supabase.from("reports").select("*", { count: "exact", head: true }).gte("created_at", since30),
      supabase.from("reports").select("created_at").gte("created_at", since30).limit(4000),
      supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "action_taken"),
      supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "dismissed"),
      supabase.from("content_appeals").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase
        .from("content_appeals")
        .select("*", { count: "exact", head: true })
        .gte("created_at", since30)
        .in("status", ["approved", "rejected", "denied", "accepted"]),
      loadLive24hSnapshot(),
    ]);

    for (const r of reportRows.data ?? []) {
      const day = String((r as { created_at: string }).created_at).slice(0, 10);
      if (countsByDay[day] !== undefined) countsByDay[day] += 1;
    }

    const reportsLast30dByDay = dayKeys.map((date) => ({ date, count: countsByDay[date] ?? 0 }));

    return {
      moderation,
      reportsCreated30d: reports30Count.count ?? 0,
      reportsLast30dByDay,
      reportOutcome: {
        actionTaken: actionTaken.count ?? 0,
        dismissed: dismissed.count ?? 0,
      },
      appealsOpen: appealsOpen.count ?? 0,
      appealsClosed30d: appealsClosed.count ?? 0,
      liveNonTerminalStreams24h: liveSnap.abnormal,
    };
  } catch (e) {
    console.error("loadBrandSafetySnapshot:", e);
    return emptyTrend;
  }
}

export async function loadAppealOpsStrip(): Promise<OpsStripItem[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createAdminDataSupabaseClient();
    const thirty = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const [open, review, closed] = await Promise.all([
      supabase.from("content_appeals").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("content_appeals").select("*", { count: "exact", head: true }).eq("status", "reviewed"),
      supabase
        .from("content_appeals")
        .select("*", { count: "exact", head: true })
        .gte("created_at", thirty)
        .in("status", ["approved", "rejected", "denied", "accepted"]),
    ]);
    return [
      { label: "Open", value: String(open.count ?? 0), hint: "pending action" },
      { label: "Under review", value: String(review.count ?? 0), hint: "in progress" },
      { label: "Closed (30d)", value: String(closed.count ?? 0), hint: "accepted or denied" },
    ];
  } catch {
    return [];
  }
}

type Live24hMetrics = { liveNow: number; peak: number; abnormal: number };

async function loadLive24hMetrics(): Promise<Live24hMetrics> {
  const supabase = await createAdminDataSupabaseClient();
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const [streamRows, liveNowRes] = await Promise.all([
    supabase.from("live_streams").select("peak_viewer_count, viewer_count, status, started_at, created_at").limit(800),
    supabase.from("live_streams").select("*", { count: "exact", head: true }).eq("status", "live"),
  ]);

  const rows =
    (streamRows.data ?? []).filter((r) => {
      const s = r.started_at ? new Date(r.started_at as string).getTime() : 0;
      const c = r.created_at ? new Date(r.created_at as string).getTime() : 0;
      return Math.max(s, c) >= cutoff;
    }) ?? [];

  let peak = 0;
  let abnormal = 0;
  for (const row of rows) {
    peak = Math.max(peak, Number(row.peak_viewer_count ?? row.viewer_count ?? 0));
    const st = String(row.status);
    if (st !== "live" && st !== "ended") abnormal += 1;
  }

  return { liveNow: liveNowRes.count ?? 0, peak, abnormal };
}

export type ModerationSlaSnapshot = {
  sampleSize: number;
  medianHours: string;
  p90Hours: string;
  windowDays: number;
};

/** Time from report created_at → reviewed_at for non-pending rows (sample cap). */
export async function loadModerationSlaSnapshot(): Promise<ModerationSlaSnapshot> {
  const empty: ModerationSlaSnapshot = {
    sampleSize: 0,
    medianHours: "—",
    p90Hours: "—",
    windowDays: 30,
  };
  if (!isSupabaseConfigured()) return empty;
  try {
    const supabase = await createAdminDataSupabaseClient();
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("reports")
      .select("created_at, reviewed_at, status")
      .not("reviewed_at", "is", null)
      .neq("status", "pending")
      .gte("created_at", since)
      .order("reviewed_at", { ascending: false })
      .limit(4_000);

    if (error || !data?.length) {
      return empty;
    }

    const hours: number[] = [];
    for (const r of data) {
      const c = new Date(r.created_at as string).getTime();
      const v = new Date(r.reviewed_at as string).getTime();
      if (Number.isFinite(c) && Number.isFinite(v) && v >= c) {
        hours.push((v - c) / 3_600_000);
      }
    }
    hours.sort((a, b) => a - b);
    const n = hours.length;
    if (!n) return empty;
    const median = hours[Math.floor(n / 2)] ?? 0;
    const p90 = hours[Math.min(n - 1, Math.floor(n * 0.9))] ?? median;
    return {
      sampleSize: n,
      medianHours: median.toFixed(2),
      p90Hours: p90.toFixed(2),
      windowDays: 30,
    };
  } catch (e) {
    console.error("loadModerationSlaSnapshot:", e);
    return empty;
  }
}

export async function loadLive24hSnapshot(): Promise<Live24hMetrics> {
  if (!isSupabaseConfigured()) return { liveNow: 0, peak: 0, abnormal: 0 };
  try {
    return await loadLive24hMetrics();
  } catch {
    return { liveNow: 0, peak: 0, abnormal: 0 };
  }
}

export async function loadLiveOpsStrip(): Promise<OpsStripItem[]> {
  const m = await loadLive24hSnapshot();
  return [
    { label: "Live now", value: String(m.liveNow), hint: "status = live" },
    { label: "Peak viewers (24h)", value: formatCount(m.peak), hint: "max peak_viewer_count" },
    { label: "Non-standard streams (24h)", value: String(m.abnormal), hint: "not live/ended" },
  ];
}

function formatHours(h: number | null): string {
  if (h == null || !Number.isFinite(h)) return "—";
  if (h < 1) return `${Math.round(h * 60)}m`;
  return `${h.toFixed(1)}h`;
}

export async function loadInsightsOverviewKpis(input: {
  users: number;
  dau24h: number;
  openReports: number;
  circles: number;
  liveSessions: number;
  postsTotal?: number;
  commentsTotal?: number;
}): Promise<{ label: string; value: string }[]> {
  if (!isSupabaseConfigured()) {
    return [
      { label: "Total users", value: formatCount(input.users) },
      { label: "DAU (24h)", value: formatCount(input.dau24h) },
      { label: "Open reports", value: formatCount(input.openReports) },
    ];
  }
  try {
    const supabase = await createAdminDataSupabaseClient();
    const thirty = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const [posts30, live30, wauSample, mom] = await Promise.all([
      supabase.from("posts").select("id", { count: "exact", head: true }).gte("created_at", thirty),
      supabase.from("live_streams").select("id", { count: "exact", head: true }).gte("created_at", thirty),
      supabase
        .from("analytics_events")
        .select("user_id")
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .not("user_id", "is", null)
        .limit(25_000),
      (async () => {
        const now = new Date();
        const thisStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
        const prevStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
        const [cur, prev] = await Promise.all([
          supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", thisStart.toISOString()),
          supabase
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .gte("created_at", prevStart.toISOString())
            .lt("created_at", thisStart.toISOString()),
        ]);
        const c = cur.count ?? 0;
        const p = prev.count ?? 0;
        if (p === 0) return c > 0 ? "+∞" : "0%";
        const pct = ((c - p) / p) * 100;
        const sign = pct >= 0 ? "+" : "";
        return `${sign}${pct.toFixed(0)}%`;
      })(),
    ]);

    const wau = new Set((wauSample.data ?? []).map((r) => r.user_id as string)).size;
    const momStr = await mom;

    return [
      { label: "Total users", value: formatCount(input.users) },
      { label: "DAU (24h)", value: formatCount(input.dau24h) },
      { label: "WAU (7d est.)", value: formatCount(wau) },
      { label: "Posts (30d)", value: formatCount(posts30.count ?? 0) },
      { label: "Posts (all time)", value: formatCount(input.postsTotal ?? 0) },
      { label: "Comments (all time)", value: formatCount(input.commentsTotal ?? 0) },
      { label: "Live sessions (30d)", value: formatCount(live30.count ?? 0) },
      { label: "Circles", value: formatCount(input.circles) },
      { label: "Live now", value: formatCount(input.liveSessions) },
      { label: "Open reports", value: formatCount(input.openReports) },
      { label: "New users (MoM)", value: momStr },
    ];
  } catch (e) {
    console.error("loadInsightsOverviewKpis:", e);
    return [{ label: "Total users", value: formatCount(input.users) }];
  }
}

export async function loadTrustSafetyKpis(): Promise<{ label: string; value: string }[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createAdminDataSupabaseClient();
    const thirty = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const [appeals30, bans30, reports30, action30] = await Promise.all([
      supabase.from("content_appeals").select("id", { count: "exact", head: true }).gte("created_at", thirty),
      supabase.from("user_bans").select("id", { count: "exact", head: true }).gte("created_at", thirty),
      supabase.from("reports").select("id", { count: "exact", head: true }).gte("created_at", thirty),
      supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "action_taken").gte("created_at", thirty),
    ]);
    const rtot = reports30.count ?? 0;
    const tact = action30.count ?? 0;
    const takedownPctStr = rtot > 0 ? `${((tact / rtot) * 100).toFixed(1)}%` : "0%";
    const ts = await loadModerationKpiStats();

    return [
      { label: "Avg resolution (sample)", value: formatHours(ts.avgResolutionHours) },
      { label: "Bans (30d)", value: formatCount(bans30.count ?? 0) },
      { label: "Appeals filed (30d)", value: formatCount(appeals30.count ?? 0) },
      { label: "Action-taken rate (30d)", value: takedownPctStr },
    ];
  } catch (e) {
    console.error("loadTrustSafetyKpis:", e);
    return [];
  }
}

export async function loadEngagementInsightKpis(): Promise<{ label: string; value: string }[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createAdminDataSupabaseClient();
    const thirty = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const ev = await supabase.from("analytics_events").select("id", { count: "exact", head: true }).gte("created_at", thirty);
    return [
      { label: "Analytics events (30d)", value: formatCount(ev.count ?? 0) },
      { label: "Feed impressions (est.)", value: "See warehouse" },
      { label: "Avg session", value: "—" },
      { label: "Retention", value: "—" },
    ];
  } catch {
    return [];
  }
}

export async function loadLiveInsightKpis(): Promise<{ label: string; value: string }[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createAdminDataSupabaseClient();
    const thirty = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from("live_streams")
      .select("viewer_count, peak_viewer_count")
      .gte("created_at", thirty)
      .limit(500);
    const n = data?.length ?? 0;
    let sum = 0;
    let peak = 0;
    for (const row of data ?? []) {
      const v = Number(row.viewer_count ?? 0);
      sum += v;
      peak = Math.max(peak, Number(row.peak_viewer_count ?? v));
    }
    const avg = n ? Math.round(sum / n) : 0;
    const startedRes = await supabase
      .from("live_streams")
      .select("id", { count: "exact", head: true })
      .gte("created_at", thirty);
    return [
      { label: "Sessions started (30d)", value: formatCount(startedRes.count ?? 0) },
      { label: "Avg viewers (sample)", value: formatCount(avg) },
      { label: "Peak concurrent (sample)", value: formatCount(peak) },
      { label: "Watch time", value: "—" },
    ];
  } catch {
    return [];
  }
}

export async function loadCampaignInsightKpis(): Promise<{ label: string; value: string }[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createAdminDataSupabaseClient();
    const thirty = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from("ad_campaigns")
      .select("impressions, clicks")
      .gte("created_at", thirty)
      .limit(200);
    let imp = 0;
    let clk = 0;
    for (const row of data ?? []) {
      imp += Number(row.impressions ?? 0);
      clk += Number(row.clicks ?? 0);
    }
    const ctr = imp > 0 ? ((clk / imp) * 100).toFixed(2) : "0";
    return [
      { label: "Impressions (30d window)", value: formatCount(imp) },
      { label: "Clicks", value: formatCount(clk) },
      { label: "CTR", value: `${ctr}%` },
      { label: "Attributed brand lift", value: "Not instrumented" },
    ];
  } catch {
    return [];
  }
}

export async function loadMyPulseInsightKpis(): Promise<{ label: string; value: string }[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createAdminDataSupabaseClient();
    const thirty = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const [posts, comments] = await Promise.all([
      supabase.from("posts").select("id", { count: "exact", head: true }).gte("created_at", thirty),
      supabase.from("comments").select("id", { count: "exact", head: true }).gte("created_at", thirty),
    ]);
    return [
      { label: "Posts (30d)", value: formatCount(posts.count ?? 0) },
      { label: "Comments (30d)", value: formatCount(comments.count ?? 0) },
      { label: "Shares / extras", value: "See analytics" },
      { label: "Engagement / post", value: "—" },
    ];
  } catch {
    return [];
  }
}

export async function loadCirclesOpsStrip(): Promise<OpsStripItem[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createAdminDataSupabaseClient();
    const [totalRes, featuredRes, topRes] = await Promise.all([
      supabase.from("communities").select("id", { count: "exact", head: true }),
      supabase.from("communities").select("id", { count: "exact", head: true }).not("featured_order", "is", null),
      supabase
        .from("communities")
        .select("name, member_count, post_count")
        .order("member_count", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    const t = topRes.data as { name: string; member_count: number; post_count: number } | null;
    return [
      { label: "Total circles", value: formatCount(totalRes.count ?? 0), hint: "communities row count" },
      { label: "Featured slots", value: String(featuredRes.count ?? 0), hint: "featured_order set" },
      {
        label: "Top by members",
        value: t?.name ?? "—",
        hint: t ? `${formatCount(t.member_count)} members` : undefined,
      },
    ];
  } catch {
    return [];
  }
}
