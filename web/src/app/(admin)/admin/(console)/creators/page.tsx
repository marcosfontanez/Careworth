import Link from "next/link";

import { AdminOpsStrip } from "@/components/admin/dashboard-panels";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminPanelCard } from "@/components/admin/admin-panel-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { loadCreatorRoleOptions, loadCreators, type LoadCreatorsFilters } from "@/lib/admin/queries";

export default async function AdminCreatorsPage({
  searchParams,
}: {
  searchParams: Promise<{
    role?: string;
    verified?: string;
    minFollowers?: string;
    sort?: string;
    limit?: string;
  }>;
}) {
  const q = await searchParams;
  const filters: LoadCreatorsFilters = {
    role: q.role?.trim() || undefined,
    verified: q.verified === "yes" ? "yes" : q.verified === "no" ? "no" : "all",
    minFollowers: q.minFollowers ? Number(q.minFollowers) : undefined,
    sort: q.sort === "posts" ? "posts" : q.sort === "updated" ? "updated" : "followers",
    limit: q.limit ? Number(q.limit) : 80,
  };

  const [creators, roles] = await Promise.all([loadCreators(filters), loadCreatorRoleOptions()]);
  const verified = creators.filter((c) => c.verified).length;
  const topScore = creators.length ? Math.max(...creators.map((c) => c.score)) : 0;
  const expoBase = process.env.NEXT_PUBLIC_EXPO_WEB_APP_URL?.replace(/\/$/, "").trim() ?? "";

  return (
    <div className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Partnerships", href: "/admin/advertisers" },
          { label: "Creators" },
        ]}
        title="Partner explorer · creators"
        description="Filters run server-side on profiles — commercial scoring beyond follower/post counts is roadmap-only unless noted."
      />
      <AdminOpsStrip
        items={[
          { label: "Rows loaded", value: String(creators.length), hint: `limit ${filters.limit ?? 80}` },
          { label: "Verified (sample)", value: String(verified), hint: "loaded slice" },
          { label: "Top health score", value: String(topScore), hint: "derived rank" },
        ]}
        className="xl:grid-cols-3"
      />

      <AdminPanelCard>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <p className="text-xs text-muted-foreground">
            Average views / sponsorship-ready markers need rollup tables — not shown here yet.
          </p>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" action="/admin/creators" method="get">
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              Role
              <select
                name="role"
                defaultValue={filters.role ?? ""}
                className="mt-1 w-full rounded-md border border-white/12 bg-background/80 px-2 py-2 text-sm outline-none ring-primary/20 focus:ring-2"
              >
                <option value="">Any</option>
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              Verified
              <select
                name="verified"
                defaultValue={filters.verified ?? "all"}
                className="mt-1 w-full rounded-md border border-white/12 bg-background/80 px-2 py-2 text-sm outline-none ring-primary/20 focus:ring-2"
              >
                <option value="all">Any</option>
                <option value="yes">Verified</option>
                <option value="no">Not verified</option>
              </select>
            </label>
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              Min followers
              <input
                name="minFollowers"
                type="number"
                min={0}
                defaultValue={filters.minFollowers ?? ""}
                placeholder="0"
                className="mt-1 w-full rounded-md border border-white/12 bg-background/80 px-2 py-2 text-sm tabular-nums outline-none ring-primary/20 focus:ring-2"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              Sort
              <select
                name="sort"
                defaultValue={filters.sort ?? "followers"}
                className="mt-1 w-full rounded-md border border-white/12 bg-background/80 px-2 py-2 text-sm outline-none ring-primary/20 focus:ring-2"
              >
                <option value="followers">Followers</option>
                <option value="posts">Posts</option>
                <option value="updated">Recently updated</option>
              </select>
            </label>
            <label className="space-y-1 text-xs font-medium text-muted-foreground md:col-span-2">
              Row limit
              <input
                name="limit"
                type="number"
                min={1}
                max={200}
                defaultValue={filters.limit ?? 80}
                className="mt-1 w-full rounded-md border border-white/12 bg-background/80 px-2 py-2 text-sm tabular-nums outline-none ring-primary/20 focus:ring-2"
              />
            </label>
            <div className="flex items-end gap-2 md:col-span-2">
              <Button type="submit" size="sm">
                Apply filters
              </Button>
              <Button variant="outline" size="sm" className="border-white/15 bg-transparent" asChild>
                <Link href="/admin/creators">Reset</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </AdminPanelCard>

      <AdminPanelCard>
        <CardHeader>
          <CardTitle>Creator list</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Handle</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Followers</TableHead>
                <TableHead className="text-right">Posts</TableHead>
                <TableHead className="text-right">Updated</TableHead>
                <TableHead>Verified</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {creators.length ? (
                creators.map((c) => (
                  <TableRow key={c.id} className="border-border">
                    <TableCell className="font-medium">{c.handle}</TableCell>
                    <TableCell className="text-muted-foreground">{c.profession_display}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.followers.toLocaleString()}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.post_count.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                      {c.updated_at ? new Date(c.updated_at).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell>
                      {c.verified ? (
                        <Badge variant="outline" className="border-primary/40 text-primary">
                          Verified
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{c.score}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        {expoBase ? (
                          <Button size="sm" variant="secondary" asChild>
                            <Link
                              href={`${expoBase}/profile/${encodeURIComponent(c.id)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Opens profile in the Expo web app (same-origin if deployed)"
                            >
                              App profile
                            </Link>
                          </Button>
                        ) : null}
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/admin/users/${encodeURIComponent(c.id)}`}>Admin user</Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-muted-foreground">
                    No profiles returned for these filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </AdminPanelCard>
    </div>
  );
}
