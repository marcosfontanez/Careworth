import "server-only";

import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type {
  AdminUser,
  AppealRow,
  CampaignRow,
  CircleAdmin,
  CreatorRow,
  LiveSessionRow,
  ReportReason,
  ReportRow,
  ReportStatus,
  ReportType,
  Severity,
} from "@/types/admin";

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
  if (t === "post" || t === "comment" || t === "profile") return t;
  if (t === "live") return "live";
  return "post";
}

export async function loadReports(): Promise<ReportRow[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createSupabaseServerClient();
    const { data: rows, error } = await supabase
      .from("reports")
      .select("id, reporter_id, target_type, target_id, reason, details, status, created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error || !rows?.length) {
      if (error) console.error("loadReports:", error.message);
      return [];
    }

    const reporterIds = [...new Set(rows.map((r) => r.reporter_id as string))];
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", reporterIds);
    const names = new Map((profs ?? []).map((p) => [p.id as string, p.display_name as string]));

    return rows.map((r) => {
      const reporterName = names.get(r.reporter_id as string) ?? "Reporter";
      const reason = mapReportReason(String(r.reason));
      const status = mapReportStatus(String(r.status));
      const type = mapTargetType(String(r.target_type));
      const preview = (r.details as string | null)?.trim() || `${r.target_type} · ${r.target_id}`;
      return {
        id: String(r.id),
        type,
        targetId: String(r.target_id),
        preview: preview.slice(0, 280),
        reporterName,
        subjectName: String(r.target_id).slice(0, 48),
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

export async function loadAdminUsers(): Promise<AdminUser[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createSupabaseServerClient();
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
    const supabase = await createSupabaseServerClient();
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
    const supabase = await createSupabaseServerClient();
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
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("ad_campaigns")
      .select(
        "id, advertiser_name, title, start_date, end_date, impressions, clicks, status, cpm_rate",
      )
      .order("start_date", { ascending: false })
      .limit(80);

    if (error || !data) {
      console.error("loadCampaigns:", error?.message);
      return [];
    }

    return data.map((c) => {
      const impressions = Number(c.impressions ?? 0);
      const clicks = Number(c.clicks ?? 0);
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
      return {
        id: c.id as string,
        sponsor: c.advertiser_name as string,
        placement: (c.title as string) || "In-feed",
        start: (c.start_date as string)?.slice(0, 10) ?? "—",
        end: (c.end_date as string)?.slice(0, 10) ?? "—",
        impressions,
        ctr: Math.round(ctr * 100) / 100,
      };
    });
  } catch (e) {
    console.error("loadCampaigns exception:", e);
    return [];
  }
}

export async function loadLiveSessions(): Promise<LiveSessionRow[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createSupabaseServerClient();
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

export async function loadCreators(): Promise<CreatorRow[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, role, follower_count, is_verified, post_count")
      .order("follower_count", { ascending: false })
      .limit(80);

    if (error || !data) {
      console.error("loadCreators:", error?.message);
      return [];
    }

    return data.map((p) => ({
      id: p.id,
      handle: "@" + (p.display_name || "user").toLowerCase().replace(/\s+/g, ""),
      profession_display: p.role,
      followers: p.follower_count ?? 0,
      liveHours: 0,
      verified: p.is_verified ?? false,
      score: Math.min(100, Math.round(Math.log10((p.follower_count ?? 0) + 10) * 28)),
    }));
  } catch (e) {
    console.error("loadCreators exception:", e);
    return [];
  }
}

export async function loadAdminCounts() {
  if (!isSupabaseConfigured()) {
    return { users: 0, openReports: 0, circles: 0, liveSessions: 0 };
  }
  try {
    const supabase = await createSupabaseServerClient();
    const [profiles, reportsPending, communities, liveNow] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("communities").select("id", { count: "exact", head: true }),
      supabase.from("live_streams").select("*", { count: "exact", head: true }).eq("status", "live"),
    ]);

    return {
      users: profiles.count ?? 0,
      openReports: reportsPending.count ?? 0,
      circles: communities.count ?? 0,
      liveSessions: liveNow.count ?? 0,
    };
  } catch {
    return { users: 0, openReports: 0, circles: 0, liveSessions: 0 };
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
    const supabase = await createSupabaseServerClient();
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
