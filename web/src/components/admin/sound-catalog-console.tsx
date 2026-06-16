"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import {
  Eye,
  EyeOff,
  Loader2,
  MoreHorizontal,
  Music2,
  Pause,
  Play,
  RefreshCw,
  Trash2,
} from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminPanelCard } from "@/components/admin/admin-panel-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type {
  SoundCatalogAuditRow,
  SoundCatalogFilters,
  SoundCatalogRow,
  SoundCatalogSort,
  SoundCatalogStatusFilter,
  SoundCatalogSummary,
} from "@/lib/admin/sound-catalog";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: { value: SoundCatalogStatusFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "hidden", label: "Hidden" },
];

const SORT_OPTIONS: { value: SoundCatalogSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "most_used", label: "Most used" },
  { value: "title", label: "Title A–Z" },
  { value: "boost", label: "Sort boost" },
];

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

function SoundPreviewPlayer({ url }: { url: string | null }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!url) {
    return <p className="text-xs text-muted-foreground">No safe preview URL for this sound.</p>;
  }

  return (
    <div className="space-y-2">
      <audio
        ref={audioRef}
        src={url}
        preload="none"
        onEnded={() => setPlaying(false)}
        onError={() => {
          setPlaying(false);
          setError("Playback failed. The clip may be unavailable.");
        }}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => {
            const el = audioRef.current;
            if (!el) return;
            setError(null);
            if (playing) {
              el.pause();
              setPlaying(false);
            } else {
              void el.play().then(
                () => setPlaying(true),
                () => setError("Playback failed. The clip may be unavailable."),
              );
            }
          }}
        >
          {playing ? <Pause className="mr-1.5 h-3.5 w-3.5" /> : <Play className="mr-1.5 h-3.5 w-3.5" />}
          {playing ? "Pause" : "Play preview"}
        </Button>
        <span className="text-[11px] text-muted-foreground">Manual play only — audio is not auto-played.</span>
      </div>
      {error ? <p className="text-xs text-amber-200">{error}</p> : null}
    </div>
  );
}

type Props = {
  summary: SoundCatalogSummary;
  sounds: SoundCatalogRow[];
  total: number;
  filters: SoundCatalogFilters;
};

export function SoundCatalogConsole({ summary, sounds, total, filters }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [detail, setDetail] = useState<SoundCatalogRow | null>(null);
  const [audit, setAudit] = useState<SoundCatalogAuditRow[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [toast, setToast] = useState<{ tone: "ok" | "err"; message: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<SoundCatalogRow | null>(null);
  const [staffNote, setStaffNote] = useState("");

  const [addPostId, setAddPostId] = useState("");
  const [editArtist, setEditArtist] = useState("");
  const [editKeywords, setEditKeywords] = useState("");
  const [editSortBoost, setEditSortBoost] = useState("1000");
  const [editActive, setEditActive] = useState(true);

  const filterForm = useMemo(
    () => ({
      q: searchParams.get("q") ?? filters.q ?? "",
      status: (searchParams.get("status") ?? filters.status ?? "all") as SoundCatalogStatusFilter,
      source: searchParams.get("source") ?? filters.source ?? "",
      sort: (searchParams.get("sort") ?? filters.sort ?? "newest") as SoundCatalogSort,
    }),
    [searchParams, filters],
  );

  const applyFilters = useCallback(
    (next: Partial<typeof filterForm>) => {
      const merged = { ...filterForm, ...next };
      const params = new URLSearchParams();
      if (merged.q) params.set("q", merged.q);
      if (merged.status && merged.status !== "all") params.set("status", merged.status);
      if (merged.source) params.set("source", merged.source);
      if (merged.sort && merged.sort !== "newest") params.set("sort", merged.sort);
      const qs = params.toString();
      router.push(qs ? `/admin/sound-catalog?${qs}` : "/admin/sound-catalog");
    },
    [filterForm, router],
  );

  async function mutate(body: Record<string, unknown>) {
    setToast(null);
    const res = await fetch("/api/admin/sounds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string; updated?: number };
    if (!res.ok || !data.ok) {
      setToast({ tone: "err", message: data.error ?? "Action failed." });
      return false;
    }
    setToast({
      tone: "ok",
      message:
        typeof data.updated === "number"
          ? `Updated ${data.updated} entr${data.updated === 1 ? "y" : "ies"}.`
          : "Saved.",
    });
    startTransition(() => router.refresh());
    return true;
  }

  async function openDetail(row: SoundCatalogRow) {
    setDetail(row);
    setEditArtist(row.artist ?? "");
    setEditKeywords(row.keywords ?? "");
    setEditSortBoost(String(row.sortBoost));
    setEditActive(row.isActive);
    setStaffNote("");
    setAudit([]);
    setAuditLoading(true);
    try {
      const res = await fetch(`/api/admin/sounds?postId=${encodeURIComponent(row.postId)}`);
      const data = (await res.json()) as { ok?: boolean; audit?: SoundCatalogAuditRow[] };
      if (data.ok && data.audit) setAudit(data.audit);
    } finally {
      setAuditLoading(false);
    }
  }

  async function saveDetail() {
    if (!detail) return;
    const parsed = parseInt(editSortBoost, 10);
    const ok = await mutate({
      action: "upsert",
      postId: detail.postId,
      artist: editArtist,
      keywords: editKeywords,
      sortBoost: Number.isFinite(parsed) ? parsed : detail.sortBoost,
      isActive: editActive,
      staffNote: staffNote.trim() || undefined,
    });
    if (ok) setDetail(null);
  }

  return (
    <div className="space-y-6 pb-10">
      <AdminPageHeader
        title="Sound catalog"
        description="Curate original video sounds for search ranking. Each entry points at an eligible video post; audio previews use public media URLs only."
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Sound catalog" },
        ]}
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => startTransition(() => router.refresh())}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2">Refresh</span>
          </Button>
        }
      />

      {toast ? (
        <div
          className={cn(
            "rounded-xl border px-4 py-3 text-sm",
            toast.tone === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
              : "border-rose-500/30 bg-rose-500/10 text-rose-100",
          )}
        >
          {toast.message}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Total curated", value: summary.total },
          { label: "Active in search", value: summary.active },
          { label: "Hidden", value: summary.hidden },
        ].map((stat) => (
          <AdminPanelCard key={stat.label}>
            <CardContent className="pt-6">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{stat.label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{stat.value}</p>
            </CardContent>
          </AdminPanelCard>
        ))}
      </div>

      <AdminPanelCard>
        <CardHeader>
          <CardTitle className="text-base">Add to catalog</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Use a video post UUID with media, not anonymous, and not a remix of another sound.
          </p>
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <Input
              value={addPostId}
              onChange={(e) => setAddPostId(e.target.value)}
              placeholder="Post UUID"
              className="font-mono text-xs"
            />
            <Button
              type="button"
              disabled={pending || !addPostId.trim()}
              onClick={async () => {
                const ok = await mutate({
                  action: "upsert",
                  postId: addPostId.trim(),
                  isActive: true,
                });
                if (ok) setAddPostId("");
              }}
            >
              Add entry
            </Button>
          </div>
        </CardContent>
      </AdminPanelCard>

      <AdminPanelCard>
        <CardHeader className="space-y-4">
          <CardTitle className="text-base">Catalog ({total})</CardTitle>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Input
              placeholder="Search title, artist, keywords, post id…"
              defaultValue={filterForm.q}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyFilters({ q: (e.target as HTMLInputElement).value });
              }}
            />
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={filterForm.status}
              onChange={(e) => applyFilters({ status: e.target.value as SoundCatalogStatusFilter })}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <Input
              placeholder="Filter by artist / creator"
              defaultValue={filterForm.source}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyFilters({ source: (e.target as HTMLInputElement).value });
              }}
            />
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={filterForm.sort}
              onChange={(e) => applyFilters({ sort: e.target.value as SoundCatalogSort })}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  Sort: {o.label}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {sounds.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <Music2 className="h-10 w-10 text-muted-foreground/60" />
              <p className="text-sm font-medium text-foreground">
                {filterForm.q || filterForm.status !== "all" || filterForm.source
                  ? "No sounds match these filters"
                  : "No curated sounds yet"}
              </p>
              <p className="max-w-md text-xs text-muted-foreground">
                {filterForm.q || filterForm.status !== "all" || filterForm.source
                  ? "Try clearing filters or broadening your search."
                  : "Add an eligible video post above to surface it in sound search."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Artist / source</TableHead>
                    <TableHead>Keywords</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Uses</TableHead>
                    <TableHead>Catalog added</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sounds.map((row) => (
                    <TableRow key={row.id} className="cursor-pointer" onClick={() => void openDetail(row)}>
                      <TableCell className="max-w-[220px]">
                        <p className="truncate font-medium">{row.title}</p>
                        <p className="truncate font-mono text-[10px] text-muted-foreground">{row.postId}</p>
                      </TableCell>
                      <TableCell className="max-w-[160px]">
                        <p className="truncate">{row.artist ?? "—"}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {row.creatorDisplayName ?? row.creatorUsername ?? "—"}
                        </p>
                      </TableCell>
                      <TableCell className="max-w-[160px] truncate text-xs text-muted-foreground">
                        {row.keywords ?? "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={row.status} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{row.remixCount}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{fmt(row.catalogCreatedAt)}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                            aria-label="Sound actions"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => void openDetail(row)}>View / edit</DropdownMenuItem>
                            {row.isActive ? (
                              <DropdownMenuItem
                                onClick={() => void mutate({ action: "hide", postId: row.postId })}
                              >
                                <EyeOff className="mr-2 h-4 w-4" /> Hide
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => void mutate({ action: "activate", postId: row.postId })}
                              >
                                <Eye className="mr-2 h-4 w-4" /> Activate
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-rose-200 focus:text-rose-100"
                              onClick={() => setConfirmDelete(row)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Remove from catalog
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </AdminPanelCard>

      <Sheet open={Boolean(detail)} onOpenChange={(open) => !open && setDetail(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {detail ? (
            <>
              <SheetHeader>
                <SheetTitle>{detail.title}</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <SoundPreviewPlayer url={detail.previewUrl} />

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="sc-artist">Artist / attribution</Label>
                    <Input id="sc-artist" value={editArtist} onChange={(e) => setEditArtist(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="sc-keywords">Keywords / tags</Label>
                    <Input
                      id="sc-keywords"
                      value={editKeywords}
                      onChange={(e) => setEditKeywords(e.target.value)}
                      placeholder="Comma-separated search terms"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sc-boost">Sort boost (0–100000)</Label>
                    <Input
                      id="sc-boost"
                      value={editSortBoost}
                      onChange={(e) => setEditSortBoost(e.target.value)}
                      inputMode="numeric"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={editActive}
                      onChange={(e) => setEditActive(e.target.checked)}
                      className="rounded border-input"
                    />
                    Active in sound search
                  </label>
                  <div>
                    <Label htmlFor="sc-note">Staff note (audit)</Label>
                    <Textarea
                      id="sc-note"
                      value={staffNote}
                      onChange={(e) => setStaffNote(e.target.value)}
                      rows={2}
                      placeholder="Optional note for audit log"
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
                  <p>
                    <span className="text-foreground/80">Post id:</span>{" "}
                    <span className="font-mono">{detail.postId}</span>
                  </p>
                  <p className="mt-1">
                    <span className="text-foreground/80">Creator:</span>{" "}
                    {detail.creatorDisplayName ?? detail.creatorUsername ?? "—"}
                  </p>
                  <p className="mt-1">
                    <span className="text-foreground/80">Remix uses:</span> {detail.remixCount}
                  </p>
                  <p className="mt-1">
                    <span className="text-foreground/80">Post created:</span> {fmt(detail.postCreatedAt)}
                  </p>
                  <p className="mt-1">
                    <span className="text-foreground/80">Catalog added:</span> {fmt(detail.catalogCreatedAt)}
                  </p>
                  <p className="mt-2 text-[11px]">
                    Title is read from the source post (`sound_title` or caption). Edit the post to change the display
                    title.
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium">Audit history</p>
                  {auditLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : audit.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No audit entries for this sound yet.</p>
                  ) : (
                    <ul className="space-y-2 text-xs">
                      {audit.map((a) => (
                        <li key={a.id} className="rounded-md border border-border/50 px-3 py-2">
                          <p className="font-medium text-foreground/90">{a.action}</p>
                          <p className="text-muted-foreground">
                            {a.staffDisplayName} · {fmt(a.createdAt)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button type="button" disabled={pending} onClick={() => void saveDetail()}>
                    Save changes
                  </Button>
                  {detail.isActive ? (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={pending}
                      onClick={() => void mutate({ action: "hide", postId: detail.postId })}
                    >
                      Hide
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={pending}
                      onClick={() => void mutate({ action: "activate", postId: detail.postId })}
                    >
                      Activate
                    </Button>
                  )}
                  <Button type="button" variant="destructive" onClick={() => setConfirmDelete(detail)}>
                    Remove
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog open={Boolean(confirmDelete)} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove from catalog?</DialogTitle>
            <DialogDescription>
              This removes the curated search entry only. The underlying video post is not deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={async () => {
                if (!confirmDelete) return;
                const ok = await mutate({ action: "delete", postId: confirmDelete.postId });
                if (ok) {
                  setConfirmDelete(null);
                  setDetail(null);
                }
              }}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
