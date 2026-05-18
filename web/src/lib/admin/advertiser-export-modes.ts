import type { AdvertiserEngagementPayload } from "@/types/advertiser-engagement";

/** Aggregate-only snapshot safe to share with external partners when methodology footnotes accompany it. */
export type AdvertiserEngagementExternalPayload = {
  exportAudience: "external_advertiser_safe";
  exportSchemaVersion: 1;
  windowDays: number;
  cohortMinCount: number;
  generatedAt: string;
  dataAccess: AdvertiserEngagementPayload["dataAccess"];
  campaignMetricsScope: AdvertiserEngagementPayload["campaignMetricsScope"];
  caps: AdvertiserEngagementPayload["caps"];
  kpis: { label: string; value: string }[];
  daily: AdvertiserEngagementPayload["daily"];
  roleMix: AdvertiserEngagementPayload["roleMix"];
  topStates: AdvertiserEngagementPayload["topStates"];
  topSpecialties: AdvertiserEngagementPayload["topSpecialties"];
  circlesInventory: AdvertiserEngagementPayload["circlesInventory"];
  campaignRollup: AdvertiserEngagementPayload["campaignRollup"];
  postTypes: AdvertiserEngagementPayload["postTypes"];
  periodComparison: AdvertiserEngagementPayload["periodComparison"];
  campaignLeaderboard: AdvertiserEngagementPayload["campaignLeaderboard"];
  contentHealth: AdvertiserEngagementPayload["contentHealth"];
  registrationGrowth: AdvertiserEngagementPayload["registrationGrowth"];
  registeredUsersTotal: AdvertiserEngagementPayload["registeredUsersTotal"];
  activeCreatorsCount: AdvertiserEngagementPayload["activeCreatorsCount"];
  postViewsSumSample: AdvertiserEngagementPayload["postViewsSumSample"];
  distinctUsersAnalyticsSample: AdvertiserEngagementPayload["distinctUsersAnalyticsSample"];
  notInstrumented: AdvertiserEngagementPayload["notInstrumented"];
};

export type AdvertiserEngagementInternalExportEnvelope = {
  exportAudience: "internal_staff_only";
  exportSchemaVersion: 1;
  payload: AdvertiserEngagementPayload;
};

export function buildExternalAdvertiserPayload(payload: AdvertiserEngagementPayload): AdvertiserEngagementExternalPayload {
  return {
    exportAudience: "external_advertiser_safe",
    exportSchemaVersion: 1,
    windowDays: payload.windowDays,
    cohortMinCount: payload.cohortMinCount,
    generatedAt: payload.generatedAt,
    dataAccess: payload.dataAccess,
    campaignMetricsScope: payload.campaignMetricsScope,
    caps: payload.caps,
    kpis: payload.kpis.map(({ label, value }) => ({ label, value })),
    daily: payload.daily,
    roleMix: payload.roleMix,
    topStates: payload.topStates,
    topSpecialties: payload.topSpecialties,
    circlesInventory: payload.circlesInventory,
    campaignRollup: payload.campaignRollup,
    postTypes: payload.postTypes,
    periodComparison: payload.periodComparison,
    campaignLeaderboard: payload.campaignLeaderboard,
    contentHealth: payload.contentHealth,
    registrationGrowth: payload.registrationGrowth,
    registeredUsersTotal: payload.registeredUsersTotal,
    activeCreatorsCount: payload.activeCreatorsCount,
    postViewsSumSample: payload.postViewsSumSample,
    distinctUsersAnalyticsSample: payload.distinctUsersAnalyticsSample,
    notInstrumented: payload.notInstrumented,
  };
}

export function buildInternalAdvertiserJsonEnvelope(
  payload: AdvertiserEngagementPayload,
): AdvertiserEngagementInternalExportEnvelope {
  return {
    exportAudience: "internal_staff_only",
    exportSchemaVersion: 1,
    payload,
  };
}

function csvEscape(s: string) {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** CSV tuned for external sharing: KPI values without operational hints; no post/event telemetry rows. */
export function buildExternalAdvertiserCsv(payload: AdvertiserEngagementPayload): string {
  const lines: string[] = [];
  lines.push("section,field,value");
  lines.push(`meta,export_audience,external_advertiser_safe`);
  lines.push(`meta,export_schema_version,1`);
  lines.push(`meta,data_access,${csvEscape(payload.dataAccess)}`);
  lines.push(`meta,campaign_metrics_scope,${csvEscape(payload.campaignMetricsScope)}`);
  lines.push(`meta,cohort_min_count,${payload.cohortMinCount}`);
  lines.push(`meta,generated_at,${csvEscape(payload.generatedAt)}`);
  lines.push(`meta,registered_users_total,${payload.registeredUsersTotal ?? ""}`);
  lines.push(`meta,active_creators,${payload.activeCreatorsCount ?? ""}`);
  lines.push(`meta,distinct_users_sample,${payload.distinctUsersAnalyticsSample}`);
  lines.push(`meta,post_views_sum_sample,${payload.postViewsSumSample ?? ""}`);
  for (const k of payload.kpis) {
    lines.push([csvEscape("kpi"), csvEscape(k.label), csvEscape(k.value)].join(","));
  }
  lines.push("");
  lines.push("role,count");
  for (const r of payload.roleMix) {
    lines.push([csvEscape(r.name), r.count].join(","));
  }
  lines.push("");
  lines.push("date,events,estReachUsers,newPosts,newComments,newLikes,newShares,newBookmarks,newProfiles");
  for (const d of payload.daily) {
    lines.push(
      [
        d.date,
        d.events,
        d.estReachUsers,
        d.newPosts,
        d.newComments,
        d.newLikes,
        d.newShares,
        d.newBookmarks,
        d.newProfiles,
      ].join(","),
    );
  }
  lines.push("");
  lines.push("period_metric,label,current,prior,change_pct");
  for (const r of payload.periodComparison.rows) {
    lines.push(`comparison,${csvEscape(r.label)},${r.current},${r.prior},${r.changePct}`);
  }
  lines.push("");
  lines.push("campaign,advertiser,impressions,clicks,ctr_pct,status");
  for (const c of payload.campaignLeaderboard) {
    lines.push(
      [csvEscape(c.title), csvEscape(c.advertiserName), c.impressions, c.clicks, c.ctrPct, csvEscape(c.status)].join(","),
    );
  }
  return lines.join("\n");
}

function csvEscapeInternal(s: string) {
  return csvEscape(s);
}

/** Includes KPI hints and diagnostic distributions — staff-only companion to JSON internal export. */
export function buildInternalAdvertiserCsv(payload: AdvertiserEngagementPayload): string {
  const lines: string[] = [];
  lines.push("section,field,value");
  lines.push(`meta,export_audience,internal_staff_only`);
  lines.push(`meta,export_schema_version,1`);
  lines.push(`meta,data_access,${csvEscapeInternal(payload.dataAccess)}`);
  lines.push(`meta,campaign_metrics_scope,${csvEscapeInternal(payload.campaignMetricsScope)}`);
  lines.push(`meta,cohort_min_count,${payload.cohortMinCount}`);
  lines.push(`meta,generated_at,${csvEscapeInternal(payload.generatedAt)}`);
  lines.push(`meta,registered_users_total,${payload.registeredUsersTotal ?? ""}`);
  lines.push(`meta,active_creators,${payload.activeCreatorsCount ?? ""}`);
  lines.push(`meta,distinct_users_sample,${payload.distinctUsersAnalyticsSample}`);
  lines.push(`meta,post_views_sum_sample,${payload.postViewsSumSample ?? ""}`);
  for (const k of payload.kpis) {
    const val = k.hint ? `${k.value} · ${k.hint}` : k.value;
    lines.push([csvEscapeInternal("kpi"), csvEscapeInternal(k.label), csvEscapeInternal(val)].join(","));
  }
  lines.push("");
  lines.push("analytics_event,count");
  for (const r of payload.topEventNames) {
    lines.push([csvEscapeInternal(r.name), r.count].join(","));
  }
  lines.push("");
  lines.push("screen,count");
  for (const r of payload.topScreens) {
    lines.push([csvEscapeInternal(r.name), r.count].join(","));
  }
  lines.push("");
  lines.push("hour_utc,events");
  for (const h of payload.hourOfDayUtc) {
    lines.push(`${h.hour},${h.events}`);
  }
  lines.push("");
  lines.push("role,count");
  for (const r of payload.roleMix) {
    lines.push([csvEscapeInternal(r.name), r.count].join(","));
  }
  lines.push("");
  lines.push("date,events,estReachUsers,newPosts,newComments,newLikes,newShares,newBookmarks,newProfiles");
  for (const d of payload.daily) {
    lines.push(
      [
        d.date,
        d.events,
        d.estReachUsers,
        d.newPosts,
        d.newComments,
        d.newLikes,
        d.newShares,
        d.newBookmarks,
        d.newProfiles,
      ].join(","),
    );
  }
  lines.push("");
  lines.push("period_metric,label,current,prior,change_pct");
  for (const r of payload.periodComparison.rows) {
    lines.push(`comparison,${csvEscapeInternal(r.label)},${r.current},${r.prior},${r.changePct}`);
  }
  lines.push("");
  lines.push("campaign,advertiser,impressions,clicks,ctr_pct,status");
  for (const c of payload.campaignLeaderboard) {
    lines.push(
      [
        csvEscapeInternal(c.title),
        csvEscapeInternal(c.advertiserName),
        c.impressions,
        c.clicks,
        c.ctrPct,
        csvEscapeInternal(c.status),
      ].join(","),
    );
  }
  lines.push("");
  lines.push("post_id,caption_preview,type,creator_display,views,likes,comments,shares,saves,score,created_at");
  for (const p of payload.topPosts) {
    lines.push(
      [
        csvEscapeInternal(p.id),
        csvEscapeInternal(p.captionPreview),
        csvEscapeInternal(p.type),
        csvEscapeInternal(p.creatorName),
        p.views,
        p.likes,
        p.comments,
        p.shares,
        p.saves,
        p.score,
        csvEscapeInternal(p.createdAt),
      ].join(","),
    );
  }
  return lines.join("\n");
}
