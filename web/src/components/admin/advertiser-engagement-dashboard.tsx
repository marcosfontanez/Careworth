"use client";

import { AdminPanelCard } from "@/components/admin/admin-panel-card";
import { AdvertiserEngagementExportButtons } from "@/components/admin/advertiser-engagement-export-buttons";
import { InsightsKpiGrid } from "@/components/admin/insights-kpi-grid";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCount } from "@/lib/admin/format";
import type { AdvertiserEngagementPayload } from "@/types/advertiser-engagement";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const axisStyle = { fill: "var(--muted-foreground)", fontSize: 11 };

function tickK(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
  return String(v);
}

function Footnote({ payload }: { payload: AdvertiserEngagementPayload }) {
  const when = new Date(payload.generatedAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  return (
    <p className="text-xs leading-relaxed text-muted-foreground">
      Window: last <span className="text-foreground/90">{payload.windowDays}</span> calendar days (UTC). Analytics
      capped at <span className="tabular-nums">{formatCount(payload.caps.analyticsRows)}</span> newest rows; post /
      comment / like / share tallies capped at <span className="tabular-nums">{formatCount(payload.caps.postsSample)}</span>{" "}
      rows each (including <span className="text-foreground/90">saved_posts</span> bookmarks); geo / specialty from up to{" "}
      <span className="tabular-nums">{formatCount(payload.caps.profilesGeoSample)}</span> profiles. Daily reach is{" "}
      <span className="font-medium text-foreground/90">distinct user_ids</span> in the analytics sample (not MAU).{" "}
      Generated {when}.
    </p>
  );
}

export function AdvertiserEngagementDashboard({ payload }: { payload: AdvertiserEngagementPayload }) {
  const daily = payload.daily.map((d) => ({
    label: d.date.slice(5),
    events: d.events,
    reach: d.estReachUsers,
    posts: d.newPosts,
    comments: d.newComments,
    likes: d.newLikes,
    shares: d.newShares,
    bookmarks: d.newBookmarks,
    signups: d.newProfiles,
  }));

  const eventBars = payload.topEventNames.map((e) => ({
    name: e.name.length > 48 ? `${e.name.slice(0, 46)}…` : e.name,
    count: e.count,
  }));
  const screenBars = payload.topScreens.map((e) => ({
    name: e.name.length > 40 ? `${e.name.slice(0, 38)}…` : e.name,
    count: e.count,
  }));
  const hourData = payload.hourOfDayUtc.map((h) => ({
    h: `${String(h.hour).padStart(2, "0")}:00`,
    events: h.events,
  }));
  const stateBars = payload.topStates.map((s) => ({ name: s.name, count: s.count }));
  const specBars = payload.topSpecialties.map((s) => ({ name: s.name, count: s.count }));
  const typeBars = payload.postTypes.map((t) => ({ name: t.name, count: t.count }));
  const { campaignRollup: cr } = payload;
  const { periodComparison: pc, contentHealth: ch, campaignLeaderboard: cl } = payload;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <Footnote payload={payload} />
        </div>
        <AdvertiserEngagementExportButtons payload={payload} />
      </div>

      <section className="grid gap-6 lg:grid-cols-3">
        <AdminPanelCard className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Half-window momentum</CardTitle>
            <p className="text-xs text-muted-foreground">
              {pc.priorLabel} vs {pc.currentLabel} · % is change vs earlier period
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead className="text-right">{pc.priorLabel}</TableHead>
                  <TableHead className="text-right">{pc.currentLabel}</TableHead>
                  <TableHead className="text-right">Δ %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pc.rows.map((r) => (
                  <TableRow key={r.label}>
                    <TableCell className="font-medium text-muted-foreground">{r.label}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.prior.toLocaleString()}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.current.toLocaleString()}</TableCell>
                    <TableCell
                      className={`text-right tabular-nums font-medium ${
                        Number(r.changePct) > 0
                          ? "text-emerald-400"
                          : Number(r.changePct) < 0
                            ? "text-rose-400"
                            : "text-muted-foreground"
                      }`}
                    >
                      {Number(r.changePct) > 0 ? "+" : ""}
                      {r.changePct}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </AdminPanelCard>
        <AdminPanelCard>
          <CardHeader>
            <CardTitle>Content health · window</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border border-white/8 bg-card/40 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Engagement / post</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{ch.engagementPerPost}</p>
            </div>
            <div className="rounded-lg border border-white/8 bg-card/40 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Comments ÷ likes</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{ch.commentToLikeRatio}</p>
            </div>
            <div className="rounded-lg border border-white/8 bg-card/40 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Share of engagement</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{ch.shareOfEngagementPct}%</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">Shares as % of likes+comments+shares+saves</p>
            </div>
          </CardContent>
        </AdminPanelCard>
      </section>

      <AdminPanelCard>
        <CardHeader>
          <CardTitle>Campaign leaderboard</CardTitle>
          <p className="text-xs text-muted-foreground">Sorted by impressions · from ad_campaigns</p>
        </CardHeader>
        <CardContent>
          {cl.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Advertiser</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Impr.</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">CTR %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cl.map((c) => (
                  <TableRow key={`${c.title}-${c.advertiserName}`}>
                    <TableCell className="max-w-[200px] truncate font-medium">{c.title}</TableCell>
                    <TableCell className="max-w-[140px] truncate text-xs text-muted-foreground">{c.advertiserName}</TableCell>
                    <TableCell className="text-xs">{c.status}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCount(c.impressions)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCount(c.clicks)}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.ctrPct}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No campaigns in database yet.</p>
          )}
        </CardContent>
      </AdminPanelCard>

      <section className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">Executive KPIs</h3>
        <InsightsKpiGrid items={payload.kpis} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <AdminPanelCard>
          <CardHeader>
            <CardTitle>Traffic & reach (sample)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full min-w-0">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} interval={4} />
                  <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={tickK} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="events" name="Analytics events" stroke="var(--chart-1)" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="reach" name="Est. daily reach" stroke="var(--chart-2)" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </AdminPanelCard>

        <AdminPanelCard>
          <CardHeader>
            <CardTitle>Content & reactions (window)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full min-w-0">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} interval={4} />
                  <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={tickK} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="posts" name="New posts" stroke="var(--chart-3)" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="comments" name="Comments" stroke="var(--chart-4)" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="likes" name="Likes" stroke="var(--chart-5)" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="shares" name="Shares" stroke="var(--chart-1)" dot={false} strokeWidth={1.5} />
                  <Line type="monotone" dataKey="bookmarks" name="Saves" stroke="var(--primary)" dot={false} strokeWidth={1.5} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </AdminPanelCard>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <AdminPanelCard>
          <CardHeader>
            <CardTitle>Top analytics event names</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full min-w-0">
              <ResponsiveContainer width="100%" height={Math.max(280, eventBars.length * 22)}>
                <BarChart data={eventBars} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                  <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={tickK} />
                  <YAxis type="category" dataKey="name" width={180} tick={{ ...axisStyle, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="count" fill="var(--chart-1)" radius={[0, 4, 4, 0]} name="Events" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </AdminPanelCard>

        <AdminPanelCard>
          <CardHeader>
            <CardTitle>Top screens (from events)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full min-w-0">
              <ResponsiveContainer width="100%" height={Math.max(240, screenBars.length * 26)}>
                <BarChart data={screenBars} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                  <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={tickK} />
                  <YAxis type="category" dataKey="name" width={140} tick={{ ...axisStyle, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="count" fill="var(--chart-2)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </AdminPanelCard>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <AdminPanelCard>
          <CardHeader>
            <CardTitle>Activity by hour (UTC)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full min-w-0">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={hourData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="h" tick={axisStyle} axisLine={false} tickLine={false} interval={3} />
                  <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={tickK} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="events" fill="var(--chart-3)" radius={[4, 4, 0, 0]} name="Events" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </AdminPanelCard>

        <AdminPanelCard>
          <CardHeader>
            <CardTitle>New profiles per day</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full min-w-0">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} interval={4} />
                  <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={tickK} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                    }}
                  />
                  <Line type="monotone" dataKey="signups" name="New profiles" stroke="var(--chart-4)" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </AdminPanelCard>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <AdminPanelCard>
          <CardHeader>
            <CardTitle>Audience geo (state, profile sample)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full min-w-0">
              <ResponsiveContainer width="100%" height={Math.max(220, stateBars.length * 24)}>
                <BarChart data={stateBars} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                  <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={56} tick={axisStyle} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="count" fill="var(--chart-5)" radius={[0, 4, 4, 0]} name="Profiles" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </AdminPanelCard>

        <AdminPanelCard>
          <CardHeader>
            <CardTitle>Specialty mix (profile sample)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full min-w-0">
              <ResponsiveContainer width="100%" height={Math.max(220, specBars.length * 24)}>
                <BarChart data={specBars} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                  <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ ...axisStyle, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="count" fill="var(--chart-1)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </AdminPanelCard>
      </section>

      <AdminPanelCard>
        <CardHeader>
          <CardTitle>Content types (new posts in window)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full min-w-0">
            <ResponsiveContainer width="100%" height={Math.max(200, typeBars.length * 28)}>
              <BarChart data={typeBars} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={100} tick={axisStyle} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="count" fill="var(--chart-2)" radius={[0, 4, 4, 0]} name="Posts" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </AdminPanelCard>

      <section className="grid gap-6 lg:grid-cols-2">
        <AdminPanelCard>
          <CardHeader>
            <CardTitle>Sponsored inventory rollup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-white/6 bg-card/40 p-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Campaigns</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">{cr.campaignsTracked}</p>
              </div>
              <div className="rounded-lg border border-white/6 bg-card/40 p-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Impressions</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">{formatCount(cr.totalImpressions)}</p>
              </div>
              <div className="rounded-lg border border-white/6 bg-card/40 p-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Clicks</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">{formatCount(cr.totalClicks)}</p>
              </div>
              <div className="rounded-lg border border-white/6 bg-card/40 p-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">CTR</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">{cr.overallCtrPct}%</p>
              </div>
            </div>
            {cr.byStatus.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Rows</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cr.byStatus.map((row) => (
                    <TableRow key={row.status}>
                      <TableCell className="font-medium">{row.status}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">No ad_campaigns rows returned.</p>
            )}
          </CardContent>
        </AdminPanelCard>

        <AdminPanelCard>
          <CardHeader>
            <CardTitle>Circles inventory (top by members)</CardTitle>
          </CardHeader>
          <CardContent>
            {payload.circlesInventory.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Circle</TableHead>
                    <TableHead className="text-right">Members</TableHead>
                    <TableHead className="text-right">Posts (stored)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payload.circlesInventory.map((c) => (
                    <TableRow key={c.name}>
                      <TableCell className="max-w-[200px] truncate font-medium">{c.name}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCount(c.members)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCount(c.posts)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">No communities data.</p>
            )}
          </CardContent>
        </AdminPanelCard>
      </section>

      <AdminPanelCard>
        <CardHeader>
          <CardTitle>Top posts by blended engagement score</CardTitle>
        </CardHeader>
        <CardContent>
          {payload.topPosts.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Preview</TableHead>
                  <TableHead>Creator</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Views</TableHead>
                  <TableHead className="text-right">Likes</TableHead>
                  <TableHead className="text-right">Cmt</TableHead>
                  <TableHead className="text-right">Shr</TableHead>
                  <TableHead className="text-right">Save</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payload.topPosts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="max-w-[220px]">
                      <span className="line-clamp-2 text-xs text-muted-foreground">{p.captionPreview}</span>
                    </TableCell>
                    <TableCell className="text-xs">{p.creatorName}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{p.type}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs">{formatCount(p.views)}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs">{formatCount(p.likes)}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs">{formatCount(p.comments)}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs">{formatCount(p.shares)}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs">{formatCount(p.saves)}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs font-medium">{p.score}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No posts returned.</p>
          )}
        </CardContent>
      </AdminPanelCard>
    </div>
  );
}
