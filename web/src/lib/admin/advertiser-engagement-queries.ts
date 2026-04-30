import "server-only";

import { createAdminDataSupabaseClient } from "@/lib/supabase/admin-data";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { formatCount } from "@/lib/admin/format";
import type {
  AdvertiserCampaignRollup,
  AdvertiserCampaignLeaderboardRow,
  AdvertiserContentHealth,
  AdvertiserDailyPoint,
  AdvertiserEngagementPayload,
  AdvertiserPeriodComparison,
  AdvertiserNamedCount,
  AdvertiserTopPost,
} from "@/types/advertiser-engagement";

const CAP_ANALYTICS = 45_000;
const CAP_POSTS_RECENT = 18_000;
const CAP_POSTS_TOP = 80;
const CAP_PROFILES_GEO = 14_000;
const WINDOW_DAYS = 30;

function utcDayKey(iso: string): string {
  const d = new Date(iso);
  return d.toISOString().slice(0, 10);
}

function buildDayRange(days: number): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
}

function pctStr(cur: number, prev: number): string {
  if (prev === 0) return cur === 0 ? "0" : "100.0";
  return (((cur - prev) / prev) * 100).toFixed(1);
}

function buildPeriodComparison(daily: AdvertiserDailyPoint[], windowDays: number): AdvertiserPeriodComparison {
  const half = Math.max(1, Math.floor(windowDays / 2));
  const prior = daily.slice(0, half);
  const current = daily.slice(half);
  const sum = (slice: AdvertiserDailyPoint[], key: keyof AdvertiserDailyPoint) =>
    slice.reduce((s, d) => s + Number(d[key] ?? 0), 0);
  const reachPrior = sum(prior, "estReachUsers");
  const reachCurr = sum(current, "estReachUsers");
  return {
    priorLabel: `Earlier ${half}d (UTC)`,
    currentLabel: `Latest ${half}d (UTC)`,
    rows: [
      { label: "Analytics events", current: sum(current, "events"), prior: sum(prior, "events"), changePct: pctStr(sum(current, "events"), sum(prior, "events")) },
      { label: "Est. reach (Σ daily uniques)", current: reachCurr, prior: reachPrior, changePct: pctStr(reachCurr, reachPrior) },
      { label: "New posts", current: sum(current, "newPosts"), prior: sum(prior, "newPosts"), changePct: pctStr(sum(current, "newPosts"), sum(prior, "newPosts")) },
      { label: "Comments", current: sum(current, "newComments"), prior: sum(prior, "newComments"), changePct: pctStr(sum(current, "newComments"), sum(prior, "newComments")) },
      { label: "Likes", current: sum(current, "newLikes"), prior: sum(prior, "newLikes"), changePct: pctStr(sum(current, "newLikes"), sum(prior, "newLikes")) },
      { label: "Shares", current: sum(current, "newShares"), prior: sum(prior, "newShares"), changePct: pctStr(sum(current, "newShares"), sum(prior, "newShares")) },
      { label: "Saves", current: sum(current, "newBookmarks"), prior: sum(prior, "newBookmarks"), changePct: pctStr(sum(current, "newBookmarks"), sum(prior, "newBookmarks")) },
    ],
  };
}

function tallyMap(entries: string[], limit: number): AdvertiserNamedCount[] {
  const m = new Map<string, number>();
  for (const e of entries) {
    const k = e.trim() || "(blank)";
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

export async function loadAdvertiserEngagementPayload(): Promise<AdvertiserEngagementPayload> {
  const emptyRollup: AdvertiserCampaignRollup = {
    campaignsTracked: 0,
    totalImpressions: 0,
    totalClicks: 0,
    overallCtrPct: "0",
    byStatus: [],
  };
  const dayKeys = buildDayRange(WINDOW_DAYS);
  const since = new Date(`${dayKeys[0]}T00:00:00.000Z`).toISOString();

  if (!isSupabaseConfigured()) {
    return {
      windowDays: WINDOW_DAYS,
      generatedAt: new Date().toISOString(),
      caps: { analyticsRows: 0, postsSample: 0, profilesGeoSample: 0 },
      kpis: [],
      daily: dayKeys.map((date) => ({
        date,
        events: 0,
        estReachUsers: 0,
        newPosts: 0,
        newComments: 0,
        newLikes: 0,
        newShares: 0,
        newBookmarks: 0,
        newProfiles: 0,
      })),
      topEventNames: [],
      topScreens: [],
      hourOfDayUtc: Array.from({ length: 24 }, (_, hour) => ({ hour, events: 0 })),
      topPosts: [],
      topStates: [],
      topSpecialties: [],
      circlesInventory: [],
      campaignRollup: emptyRollup,
      postTypes: [],
      periodComparison: buildPeriodComparison(
        dayKeys.map((date) => ({
          date,
          events: 0,
          estReachUsers: 0,
          newPosts: 0,
          newComments: 0,
          newLikes: 0,
          newShares: 0,
          newBookmarks: 0,
          newProfiles: 0,
        })),
        WINDOW_DAYS,
      ),
      campaignLeaderboard: [],
      contentHealth: { engagementPerPost: "0", commentToLikeRatio: "—", shareOfEngagementPct: "0" },
    };
  }

  try {
    const supabase = await createAdminDataSupabaseClient();

    const [
      analyticsRes,
      postsRecentRes,
      commentsRes,
      likesRes,
      sharesRes,
      bookmarksRes,
      profilesNewRes,
      postsTopRes,
      circlesRes,
      campaignsRes,
      profilesGeoRes,
    ] = await Promise.all([
      supabase
        .from("analytics_events")
        .select("created_at, user_id, event_name, screen")
        .gte("created_at", since)
        .limit(CAP_ANALYTICS),
      supabase.from("posts").select("created_at, type").gte("created_at", since).limit(CAP_POSTS_RECENT),
      supabase.from("comments").select("created_at").gte("created_at", since).limit(CAP_POSTS_RECENT),
      supabase.from("post_likes").select("created_at").gte("created_at", since).limit(CAP_POSTS_RECENT),
      supabase.from("post_shares").select("created_at").gte("created_at", since).limit(CAP_POSTS_RECENT),
      supabase.from("saved_posts").select("created_at").gte("created_at", since).limit(CAP_POSTS_RECENT),
      supabase.from("profiles").select("created_at").gte("created_at", since).limit(CAP_POSTS_RECENT),
      supabase
        .from("posts")
        .select("id, caption, type, like_count, comment_count, share_count, view_count, save_count, creator_id, created_at")
        .order("view_count", { ascending: false })
        .limit(CAP_POSTS_TOP),
      supabase
        .from("communities")
        .select("name, member_count, post_count")
        .order("member_count", { ascending: false })
        .limit(18),
      supabase
        .from("ad_campaigns")
        .select("title, advertiser_name, impressions, clicks, status, start_date, end_date")
        .limit(250),
      supabase.from("profiles").select("state, specialty").limit(CAP_PROFILES_GEO),
    ]);

    const evRows = analyticsRes.data ?? [];
    const eventNames: string[] = [];
    const screens: string[] = [];
    const hourBuckets = Array.from({ length: 24 }, () => 0);

    const eventsByDay = Object.fromEntries(dayKeys.map((k) => [k, 0])) as Record<string, number>;
    const reachByDay = new Map<string, Set<string>>();

    for (const k of dayKeys) reachByDay.set(k, new Set());

    for (const r of evRows) {
      const day = utcDayKey(r.created_at as string);
      if (eventsByDay[day] !== undefined) {
        eventsByDay[day] += 1;
        const uid = r.user_id as string | null;
        if (uid) reachByDay.get(day)?.add(uid);
      }
      eventNames.push(String(r.event_name ?? ""));
      screens.push(String(r.screen ?? ""));
      hourBuckets[new Date(r.created_at as string).getUTCHours()] += 1;
    }

    const postsByDay = Object.fromEntries(dayKeys.map((k) => [k, 0])) as Record<string, number>;
    const postTypesList: string[] = [];
    for (const r of postsRecentRes.data ?? []) {
      const day = utcDayKey(r.created_at as string);
      if (postsByDay[day] !== undefined) postsByDay[day] += 1;
      postTypesList.push(String((r as { type?: string }).type ?? "unknown"));
    }

    const commentsByDay = Object.fromEntries(dayKeys.map((k) => [k, 0])) as Record<string, number>;
    for (const r of commentsRes.data ?? []) {
      const day = utcDayKey(r.created_at as string);
      if (commentsByDay[day] !== undefined) commentsByDay[day] += 1;
    }

    const likesByDay = Object.fromEntries(dayKeys.map((k) => [k, 0])) as Record<string, number>;
    for (const r of likesRes.data ?? []) {
      const day = utcDayKey(r.created_at as string);
      if (likesByDay[day] !== undefined) likesByDay[day] += 1;
    }

    const sharesByDay = Object.fromEntries(dayKeys.map((k) => [k, 0])) as Record<string, number>;
    for (const r of sharesRes.data ?? []) {
      const day = utcDayKey(r.created_at as string);
      if (sharesByDay[day] !== undefined) sharesByDay[day] += 1;
    }

    const bookmarksByDay = Object.fromEntries(dayKeys.map((k) => [k, 0])) as Record<string, number>;
    for (const r of bookmarksRes.data ?? []) {
      const day = utcDayKey(r.created_at as string);
      if (bookmarksByDay[day] !== undefined) bookmarksByDay[day] += 1;
    }

    const profilesByDay = Object.fromEntries(dayKeys.map((k) => [k, 0])) as Record<string, number>;
    for (const r of profilesNewRes.data ?? []) {
      const day = utcDayKey(r.created_at as string);
      if (profilesByDay[day] !== undefined) profilesByDay[day] += 1;
    }

    const daily: AdvertiserDailyPoint[] = dayKeys.map((date) => ({
      date,
      events: eventsByDay[date] ?? 0,
      estReachUsers: reachByDay.get(date)?.size ?? 0,
      newPosts: postsByDay[date] ?? 0,
      newComments: commentsByDay[date] ?? 0,
      newLikes: likesByDay[date] ?? 0,
      newShares: sharesByDay[date] ?? 0,
      newBookmarks: bookmarksByDay[date] ?? 0,
      newProfiles: profilesByDay[date] ?? 0,
    }));

    const topEventNames = tallyMap(eventNames, 22);
    const topScreens = tallyMap(screens, 16);
    const hourOfDayUtc = hourBuckets.map((events, hour) => ({ hour, events }));

    const geoStates: string[] = [];
    const specialties: string[] = [];
    for (const p of profilesGeoRes.data ?? []) {
      const st = String((p as { state?: string }).state ?? "").trim();
      if (st) geoStates.push(st);
      const sp = String((p as { specialty?: string }).specialty ?? "").trim();
      if (sp) specialties.push(sp);
    }
    const topStates = tallyMap(geoStates, 14);
    const topSpecialties = tallyMap(specialties, 12);

    const topPostsRaw = (postsTopRes.data ?? []) as {
      id: string;
      caption: string;
      type: string;
      like_count: number;
      comment_count: number;
      share_count: number;
      view_count: number;
      save_count: number;
      creator_id: string;
      created_at: string;
    }[];

    const creatorIds = [...new Set(topPostsRaw.map((p) => p.creator_id))];
    let profMap = new Map<string, string>();
    if (creatorIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", creatorIds);
      profMap = new Map((profs ?? []).map((x) => [x.id as string, String(x.display_name ?? "")]));
    }

    const topPosts: AdvertiserTopPost[] = topPostsRaw.map((p) => {
      const likes = Number(p.like_count ?? 0);
      const comments = Number(p.comment_count ?? 0);
      const shares = Number(p.share_count ?? 0);
      const views = Number(p.view_count ?? 0);
      const saves = Number(p.save_count ?? 0);
      const score = likes + comments * 2 + shares * 3 + saves * 2 + views * 0.01;
      return {
        id: p.id,
        captionPreview: String(p.caption ?? "").trim().slice(0, 120) || "(no caption)",
        type: String(p.type ?? "—"),
        likes,
        comments,
        shares,
        views,
        saves,
        score: Math.round(score * 10) / 10,
        creatorName: profMap.get(p.creator_id) ?? p.creator_id.slice(0, 8),
        createdAt: p.created_at,
      };
    });
    topPosts.sort((a, b) => b.score - a.score);

    const circlesInventory = (circlesRes.data ?? []).map((c) => ({
      name: String((c as { name: string }).name),
      members: Number((c as { member_count?: number }).member_count ?? 0),
      posts: Number((c as { post_count?: number }).post_count ?? 0),
    }));

    const campRowsFull = (campaignsRes.data ?? []) as {
      title: string;
      advertiser_name: string | null;
      impressions: number | null;
      clicks: number | null;
      status: string | null;
    }[];
    let totalImp = 0;
    let totalClk = 0;
    const stMap = new Map<string, number>();
    for (const c of campRowsFull) {
      totalImp += Number(c.impressions ?? 0);
      totalClk += Number(c.clicks ?? 0);
      const st = String(c.status ?? "unknown");
      stMap.set(st, (stMap.get(st) ?? 0) + 1);
    }
    const ctr = totalImp > 0 ? ((totalClk / totalImp) * 100).toFixed(3) : "0";
    const campaignRollup: AdvertiserCampaignRollup = {
      campaignsTracked: campRowsFull.length,
      totalImpressions: totalImp,
      totalClicks: totalClk,
      overallCtrPct: ctr,
      byStatus: [...stMap.entries()].sort((a, b) => b[1] - a[1]).map(([status, count]) => ({ status, count })),
    };

    const campaignLeaderboard: AdvertiserCampaignLeaderboardRow[] = campRowsFull
      .map((c) => {
        const imp = Number(c.impressions ?? 0);
        const clk = Number(c.clicks ?? 0);
        const ctrP = imp > 0 ? ((clk / imp) * 100).toFixed(3) : "0";
        return {
          title: String(c.title ?? "—").slice(0, 120),
          advertiserName: String(c.advertiser_name ?? "—").slice(0, 96),
          impressions: imp,
          clicks: clk,
          ctrPct: ctrP,
          status: String(c.status ?? "—"),
        };
      })
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 20);

    const postTypes = tallyMap(postTypesList, 10);

    const sum = (arr: AdvertiserDailyPoint[], key: keyof AdvertiserDailyPoint) =>
      arr.reduce((s, d) => s + (Number(d[key]) || 0), 0);

    const totalEvents = sum(daily, "events");
    const totalReachApprox = Math.max(...daily.map((d) => d.estReachUsers));
    const sumReach = daily.reduce((s, d) => s + d.estReachUsers, 0);
    const avgDailyReach = daily.length ? Math.round(sumReach / daily.length) : 0;
    const totalPosts = sum(daily, "newPosts");
    const totalComments = sum(daily, "newComments");
    const totalLikes = sum(daily, "newLikes");
    const totalShares = sum(daily, "newShares");
    const totalBookmarks = sum(daily, "newBookmarks");
    const engagements = totalLikes + totalComments + totalShares + totalBookmarks;
    const engPerPost = totalPosts > 0 ? (engagements / totalPosts).toFixed(2) : "0";
    const contentHealth: AdvertiserContentHealth = {
      engagementPerPost: engPerPost,
      commentToLikeRatio: totalLikes > 0 ? (totalComments / totalLikes).toFixed(2) : "—",
      shareOfEngagementPct: engagements > 0 ? ((totalShares / engagements) * 100).toFixed(1) : "0",
    };
    const periodComparison = buildPeriodComparison(daily, WINDOW_DAYS);

    const kpis: AdvertiserEngagementPayload["kpis"] = [
      { label: "Analytics events (window)", value: formatCount(totalEvents), hint: `${WINDOW_DAYS}d · capped row read` },
      { label: "Peak est. daily reach", value: formatCount(totalReachApprox), hint: "distinct users/day in sample" },
      { label: "Avg est. daily reach", value: formatCount(avgDailyReach), hint: "mean of daily uniques in sample" },
      { label: "New posts (window)", value: formatCount(totalPosts), hint: "public.caption posts" },
      { label: "New comments (window)", value: formatCount(totalComments), hint: "all threads" },
      { label: "Reactions (likes)", value: formatCount(totalLikes), hint: "post_likes rows" },
      { label: "Shares (window)", value: formatCount(totalShares), hint: "post_shares rows" },
      { label: "Saves / bookmarks", value: formatCount(totalBookmarks), hint: "saved_posts rows" },
      { label: "Engagements / new post", value: engPerPost, hint: "(likes+comments+shares+bookmarks)/posts" },
      { label: "Sponsored impressions (all rows)", value: formatCount(totalImp), hint: "sum ad_campaigns.impressions" },
      { label: "Sponsored clicks (all rows)", value: formatCount(totalClk), hint: "sum ad_campaigns.clicks" },
      { label: "Blended sponsored CTR", value: `${ctr}%`, hint: "clicks ÷ impressions" },
      { label: "Active circles (top slice)", value: formatCount(circlesInventory.length), hint: "highest member_count" },
    ];

    return {
      windowDays: WINDOW_DAYS,
      generatedAt: new Date().toISOString(),
      caps: { analyticsRows: CAP_ANALYTICS, postsSample: CAP_POSTS_RECENT, profilesGeoSample: CAP_PROFILES_GEO },
      kpis,
      daily,
      topEventNames,
      topScreens,
      hourOfDayUtc,
      topPosts,
      topStates,
      topSpecialties,
      circlesInventory,
      campaignRollup,
      postTypes,
      periodComparison,
      campaignLeaderboard,
      contentHealth,
    };
  } catch (e) {
    console.error("loadAdvertiserEngagementPayload:", e);
    const dayKeys = buildDayRange(WINDOW_DAYS);
    return {
      windowDays: WINDOW_DAYS,
      generatedAt: new Date().toISOString(),
      caps: { analyticsRows: 0, postsSample: 0, profilesGeoSample: 0 },
      kpis: [{ label: "Error", value: "—", hint: String(e instanceof Error ? e.message : e) }],
      daily: dayKeys.map((date) => ({
        date,
        events: 0,
        estReachUsers: 0,
        newPosts: 0,
        newComments: 0,
        newLikes: 0,
        newShares: 0,
        newBookmarks: 0,
        newProfiles: 0,
      })),
      topEventNames: [],
      topScreens: [],
      hourOfDayUtc: Array.from({ length: 24 }, (_, hour) => ({ hour, events: 0 })),
      topPosts: [],
      topStates: [],
      topSpecialties: [],
      circlesInventory: [],
      campaignRollup: emptyRollup,
      postTypes: [],
      periodComparison: buildPeriodComparison(
        dayKeys.map((date) => ({
          date,
          events: 0,
          estReachUsers: 0,
          newPosts: 0,
          newComments: 0,
          newLikes: 0,
          newShares: 0,
          newBookmarks: 0,
          newProfiles: 0,
        })),
        WINDOW_DAYS,
      ),
      campaignLeaderboard: [],
      contentHealth: { engagementPerPost: "0", commentToLikeRatio: "—", shareOfEngagementPct: "0" },
    };
  }
}
