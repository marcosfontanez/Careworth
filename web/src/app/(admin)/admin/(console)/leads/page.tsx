import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminPanelCard } from "@/components/admin/admin-panel-card";
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
import { MARKETING_LEAD_STATUSES } from "@/lib/admin/marketing-lead-status";
import { isCampaignEditorEnabled, loadCampaignLinksByLead } from "@/lib/admin/campaign-editor";
import { loadAdminLeadOwnerOptions, loadMarketingContactMessages } from "@/lib/admin/queries";

import { updateMarketingLeadAction } from "./actions";

function datetimeLocalFromIso(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const q = await searchParams;
  const statusFilter = q.status?.trim() || undefined;
  const [rows, ownerOptions, campaignByLead, editorEnabled] = await Promise.all([
    loadMarketingContactMessages({ limit: 200, status: statusFilter }),
    loadAdminLeadOwnerOptions(),
    loadCampaignLinksByLead(),
    isCampaignEditorEnabled(),
  ]);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Partnerships", href: "/admin/advertisers" },
          { label: "Leads / inquiries" },
        ]}
        title="Leads / inquiries"
        description="Marketing-site contacts stored in Supabase. CRM columns ship with migration 189 — until applied, save actions may error until engineering applies migrations."
      />

      <AdminPanelCard>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <p className="text-xs text-muted-foreground">Filter by pipeline status (GET — bookmarkable).</p>
        </CardHeader>
        <CardContent>
          <form className="flex flex-wrap items-end gap-3" method="get" action="/admin/leads">
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              Status
              <select
                name="status"
                defaultValue={statusFilter ?? ""}
                className="block min-w-[200px] rounded-md border border-white/12 bg-background/80 px-2 py-2 text-sm outline-none ring-primary/20 focus:ring-2"
              >
                <option value="">All</option>
                {MARKETING_LEAD_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit" size="sm">
              Apply
            </Button>
            <Button variant="outline" size="sm" className="border-white/15 bg-transparent" asChild>
              <Link href="/admin/leads">Clear</Link>
            </Button>
          </form>
        </CardContent>
      </AdminPanelCard>

      <AdminPanelCard>
        <CardHeader>
          <CardTitle>Inbound messages</CardTitle>
          <p className="text-xs text-muted-foreground">
            Topics parsed when messages begin with <span className="font-mono text-foreground/90">[Inquiry: …]</span>.
            Successful saves emit <span className="font-mono text-[11px]">marketing_lead.update</span> audit events.
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[140px]">Received</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Topic</TableHead>
                <TableHead>Host</TableHead>
                <TableHead className="min-w-[280px]">CRM</TableHead>
                <TableHead className="min-w-[220px]">Message</TableHead>
                <TableHead className="min-w-[140px]">Campaign</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length ? (
                rows.map((r) => (
                  <TableRow key={r.id} className="align-top">
                    <TableCell className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="max-w-[160px] truncate text-xs">
                      <Link className="text-primary underline-offset-4 hover:underline" href={`mailto:${r.email}`}>
                        {r.email}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-[120px]">
                      {r.topic ? (
                        <span className="rounded-md border border-primary/30 px-1.5 py-0.5 text-[11px] font-medium text-primary">
                          {r.topic}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[100px] truncate text-xs text-muted-foreground">{r.host ?? "—"}</TableCell>
                    <TableCell>
                      <form action={updateMarketingLeadAction} className="flex max-w-[340px] flex-col gap-2">
                        <input type="hidden" name="id" value={r.id} />
                        <label className="space-y-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          Status
                          <select
                            name="status"
                            defaultValue={r.status}
                            className="w-full rounded-md border border-white/12 bg-background/80 px-2 py-1.5 text-xs outline-none ring-primary/20 focus:ring-2"
                          >
                            {MARKETING_LEAD_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s.replace(/_/g, " ")}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="space-y-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          Owner
                          <select
                            name="owner_id"
                            defaultValue={r.owner_id ?? ""}
                            className="w-full rounded-md border border-white/12 bg-background/80 px-2 py-1.5 text-xs outline-none ring-primary/20 focus:ring-2"
                          >
                            <option value="">Unassigned</option>
                            {ownerOptions.map((o) => (
                              <option key={o.id} value={o.id}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="space-y-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          Last contacted
                          <input
                            type="datetime-local"
                            name="last_contacted_at"
                            defaultValue={datetimeLocalFromIso(r.last_contacted_at)}
                            className="w-full rounded-md border border-white/12 bg-background/80 px-2 py-1.5 text-xs tabular-nums outline-none ring-primary/20 focus:ring-2"
                          />
                        </label>
                        <label className="space-y-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          Internal notes
                          <textarea
                            name="internal_notes"
                            rows={3}
                            defaultValue={r.internal_notes ?? ""}
                            className="w-full resize-y rounded-md border border-white/12 bg-background/80 px-2 py-1.5 text-xs outline-none ring-primary/20 focus:ring-2"
                            placeholder="Staff-only — not shown to submitter"
                          />
                        </label>
                        <Button type="submit" size="sm" variant="secondary" className="self-start">
                          Save lead
                        </Button>
                        {r.owner_display_name ? (
                          <p className="text-[10px] text-muted-foreground">Owner snapshot: {r.owner_display_name}</p>
                        ) : null}
                      </form>
                    </TableCell>
                    <TableCell className="max-w-[260px]">
                      <span className="line-clamp-4 text-xs text-muted-foreground">{r.message}</span>
                    </TableCell>
                    <TableCell className="align-top text-xs">
                      {(campaignByLead.get(r.id) ?? []).map((c) => (
                        <Link
                          key={c.id}
                          href={`/admin/campaigns/${c.id}`}
                          className="mb-1 block text-primary underline-offset-4 hover:underline"
                        >
                          {c.campaignName}
                        </Link>
                      ))}
                      {editorEnabled ? (
                        <Button size="sm" variant="secondary" className="mt-1" asChild>
                          <Link href={`/admin/campaigns/new?leadId=${encodeURIComponent(r.id)}`}>
                            Create campaign
                          </Link>
                        </Button>
                      ) : (
                        <span className="text-muted-foreground">Editor off</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-muted-foreground">
                    No rows returned — verify Supabase env, filters, or apply CRM migration{" "}
                    <span className="font-mono">189</span>.
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
