"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import {
  addCircleModeratorAction,
  addPostPinAction,
  archiveCircleAction,
  createCircleAction,
  removeCircleModeratorAction,
  removePostPinAction,
  setFeaturedOrderAction,
  updateCircleAction,
} from "@/app/(admin)/admin/circle-admin-actions";
import { AdminFilterChip } from "@/components/admin/admin-filter-chip";
import { AdminPanelCard } from "@/components/admin/admin-panel-card";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CircleAdmin } from "@/types/admin";

type Filter = "all" | "featured" | "archived";

export function AdminCirclesConsole({ circles }: { circles: CircleAdmin[] }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editCircle, setEditCircle] = useState<CircleAdmin | null>(null);
  const [featureCircle, setFeatureCircle] = useState<CircleAdmin | null>(null);
  const [featureOrder, setFeatureOrder] = useState("");
  const [archiveTarget, setArchiveTarget] = useState<CircleAdmin | null>(null);
  const [manageCircle, setManageCircle] = useState<CircleAdmin | null>(null);
  const [pinPostId, setPinPostId] = useState("");
  const [modUserId, setModUserId] = useState("");

  const [formSlug, setFormSlug] = useState("");
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formIcon, setFormIcon] = useState("🏥");
  const [formAccent, setFormAccent] = useState("#1E4ED8");
  const [formCategories, setFormCategories] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return circles.filter((c) => {
      if (filter === "featured" && c.featuredOrder == null) return false;
      if (filter === "archived" && !c.archived) return false;
      if (filter === "all" && c.archived) return false;
      if (!needle) return true;
      return `${c.name} ${c.slug} ${c.categories.join(" ")}`.toLowerCase().includes(needle);
    });
  }, [circles, q, filter]);

  function resetForm() {
    setFormSlug("");
    setFormName("");
    setFormDescription("");
    setFormIcon("🏥");
    setFormAccent("#1E4ED8");
    setFormCategories("");
  }

  function openEdit(c: CircleAdmin) {
    setEditCircle(c);
    setFormName(c.name);
    setFormDescription(c.description);
    setFormIcon(c.icon);
    setFormAccent(c.accentColor);
    setFormCategories(c.categories.join(", "));
  }

  return (
    <div className="space-y-4">
      {msg ? (
        <p
          className={`rounded-lg border px-3 py-2 text-sm ${msg.ok ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-red-500/30 bg-red-500/10 text-red-200"}`}
        >
          {msg.text}
        </p>
      ) : null}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", "Active"],
              ["featured", "Featured"],
              ["archived", "Archived"],
            ] as const
          ).map(([key, label]) => (
            <AdminFilterChip key={key} active={filter === key} onClick={() => setFilter(key)}>
              {label}
            </AdminFilterChip>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Filter by name, slug, category…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full min-w-48 bg-secondary/40 sm:w-64"
          />
          <Button type="button" onClick={() => { resetForm(); setCreateOpen(true); }}>
            New circle
          </Button>
        </div>
      </div>

      <AdminPanelCard>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Circle directory</CardTitle>
          <p className="text-xs text-muted-foreground">
            {filtered.length} of {circles.length} shown
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {filtered.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Featured</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      {c.icon} {c.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">/{c.slug}</TableCell>
                    <TableCell className="tabular-nums">{c.members.toLocaleString()}</TableCell>
                    <TableCell className="tabular-nums">{c.featuredOrder ?? "—"}</TableCell>
                    <TableCell>
                      {c.archived ? (
                        <span className="text-xs text-amber-300">Archived</span>
                      ) : c.featuredOrder != null ? (
                        <span className="text-xs text-violet-300">Featured</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Active</span>
                      )}
                    </TableCell>
                    <TableCell className="space-x-1 text-right">
                      <Button size="sm" variant="outline" type="button" onClick={() => openEdit(c)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        type="button"
                        onClick={() => {
                          setFeatureCircle(c);
                          setFeatureOrder(c.featuredOrder != null ? String(c.featuredOrder) : "");
                        }}
                      >
                        Feature
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        type="button"
                        onClick={() => {
                          setManageCircle(c);
                          setPinPostId("");
                          setModUserId("");
                        }}
                      >
                        Pins &amp; mods
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <Link href="/admin/moderation">Moderate</Link>
                      </Button>
                      <Button
                        size="sm"
                        variant={c.archived ? "outline" : "destructive"}
                        type="button"
                        onClick={() => setArchiveTarget(c)}
                      >
                        {c.archived ? "Unarchive" : "Archive"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {circles.length === 0 ? "No communities found." : "No circles match this filter."}
            </p>
          )}
        </CardContent>
      </AdminPanelCard>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create circle</DialogTitle>
          </DialogHeader>
          <CircleFormFields
            slug={formSlug}
            setSlug={setFormSlug}
            name={formName}
            setName={setFormName}
            description={formDescription}
            setDescription={setFormDescription}
            icon={formIcon}
            setIcon={setFormIcon}
            accent={formAccent}
            setAccent={setFormAccent}
            categories={formCategories}
            setCategories={setFormCategories}
            showSlug
          />
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={pending || !formSlug.trim() || !formName.trim()}
              onClick={() => {
                start(async () => {
                  const res = await createCircleAction({
                    slug: formSlug,
                    name: formName,
                    description: formDescription,
                    icon: formIcon,
                    accentColor: formAccent,
                    categories: formCategories,
                  });
                  setMsg({ ok: res.ok, text: res.ok ? `Created /${res.slug}` : (res.error ?? "Failed") });
                  if (res.ok) {
                    setCreateOpen(false);
                    resetForm();
                  }
                });
              }}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editCircle !== null} onOpenChange={(o) => !o && setEditCircle(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit circle</DialogTitle>
          </DialogHeader>
          <CircleFormFields
            name={formName}
            setName={setFormName}
            description={formDescription}
            setDescription={setFormDescription}
            icon={formIcon}
            setIcon={setFormIcon}
            accent={formAccent}
            setAccent={setFormAccent}
            categories={formCategories}
            setCategories={setFormCategories}
          />
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setEditCircle(null)}>
              Cancel
            </Button>
            <Button
              disabled={pending || !editCircle}
              onClick={() => {
                if (!editCircle) return;
                start(async () => {
                  const res = await updateCircleAction(editCircle.id, {
                    name: formName,
                    description: formDescription,
                    icon: formIcon,
                    accentColor: formAccent,
                    categories: formCategories,
                  });
                  setMsg({ ok: res.ok, text: res.ok ? "Circle updated." : (res.error ?? "Failed") });
                  if (res.ok) setEditCircle(null);
                });
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={featureCircle !== null} onOpenChange={(o) => !o && setFeatureCircle(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Featured order</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Lower numbers appear first. Leave empty to unfeature.</p>
          <Input value={featureOrder} onChange={(e) => setFeatureOrder(e.target.value)} placeholder="e.g. 2" />
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setFeatureCircle(null)}>
              Cancel
            </Button>
            <Button
              disabled={pending || !featureCircle}
              onClick={() => {
                if (!featureCircle) return;
                const raw = featureOrder.trim();
                const next = raw === "" ? null : parseInt(raw, 10);
                if (raw !== "" && Number.isNaN(next)) {
                  setMsg({ ok: false, text: "Invalid order number." });
                  return;
                }
                start(async () => {
                  const res = await setFeaturedOrderAction(featureCircle.id, next);
                  setMsg({ ok: res.ok, text: res.ok ? "Featured order saved." : (res.error ?? "Failed") });
                  if (res.ok) setFeatureCircle(null);
                });
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={archiveTarget !== null} onOpenChange={(o) => !o && setArchiveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{archiveTarget?.archived ? "Unarchive circle" : "Archive circle"}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {archiveTarget?.archived
              ? "Restore this circle to the active directory."
              : "Marks the circle archived in metadata and clears featured order."}
          </p>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setArchiveTarget(null)}>
              Cancel
            </Button>
            <Button
              variant={archiveTarget?.archived ? "default" : "destructive"}
              disabled={pending || !archiveTarget}
              onClick={() => {
                if (!archiveTarget) return;
                start(async () => {
                  const res = await archiveCircleAction(archiveTarget.id, !archiveTarget.archived);
                  setMsg({
                    ok: res.ok,
                    text: res.ok
                      ? archiveTarget.archived
                        ? "Circle unarchived."
                        : "Circle archived."
                      : (res.error ?? "Failed"),
                  });
                  if (res.ok) setArchiveTarget(null);
                });
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={manageCircle !== null} onOpenChange={(o) => !o && setManageCircle(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pins &amp; moderators</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{manageCircle?.name}</p>
          <div className="space-y-3">
            <div>
              <Label>Pin post by ID</Label>
              <div className="mt-1 flex gap-2">
                <Input value={pinPostId} onChange={(e) => setPinPostId(e.target.value)} placeholder="Post UUID" />
                <Button
                  size="sm"
                  disabled={pending || !manageCircle || !pinPostId.trim()}
                  onClick={() => {
                    if (!manageCircle) return;
                    start(async () => {
                      const res = await addPostPinAction(manageCircle.id, pinPostId);
                      setMsg({ ok: res.ok, text: res.ok ? "Post pinned." : (res.error ?? "Failed") });
                    });
                  }}
                >
                  Pin
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending || !manageCircle || !pinPostId.trim()}
                  onClick={() => {
                    if (!manageCircle) return;
                    start(async () => {
                      const res = await removePostPinAction(manageCircle.id, pinPostId);
                      setMsg({ ok: res.ok, text: res.ok ? "Pin removed." : (res.error ?? "Failed") });
                    });
                  }}
                >
                  Unpin
                </Button>
              </div>
            </div>
            <div>
              <Label>Circle moderator user ID</Label>
              <div className="mt-1 flex gap-2">
                <Input value={modUserId} onChange={(e) => setModUserId(e.target.value)} placeholder="Profile UUID" />
                <Button
                  size="sm"
                  disabled={pending || !manageCircle || !modUserId.trim()}
                  onClick={() => {
                    if (!manageCircle) return;
                    start(async () => {
                      const res = await addCircleModeratorAction(manageCircle.id, modUserId);
                      setMsg({ ok: res.ok, text: res.ok ? "Moderator added." : (res.error ?? "Failed") });
                    });
                  }}
                >
                  Add
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending || !manageCircle || !modUserId.trim()}
                  onClick={() => {
                    if (!manageCircle) return;
                    start(async () => {
                      const res = await removeCircleModeratorAction(manageCircle.id, modUserId);
                      setMsg({ ok: res.ok, text: res.ok ? "Moderator removed." : (res.error ?? "Failed") });
                    });
                  }}
                >
                  Remove
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setManageCircle(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CircleFormFields(props: {
  slug?: string;
  setSlug?: (v: string) => void;
  name: string;
  setName: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  icon: string;
  setIcon: (v: string) => void;
  accent: string;
  setAccent: (v: string) => void;
  categories: string;
  setCategories: (v: string) => void;
  showSlug?: boolean;
}) {
  return (
    <div className="grid gap-3">
      {props.showSlug && props.setSlug ? (
        <div>
          <Label>Slug</Label>
          <Input value={props.slug ?? ""} onChange={(e) => props.setSlug!(e.target.value)} placeholder="petverse" />
        </div>
      ) : null}
      <div>
        <Label>Name</Label>
        <Input value={props.name} onChange={(e) => props.setName(e.target.value)} />
      </div>
      <div>
        <Label>Description</Label>
        <Textarea value={props.description} onChange={(e) => props.setDescription(e.target.value)} rows={3} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Icon</Label>
          <Input value={props.icon} onChange={(e) => props.setIcon(e.target.value)} />
        </div>
        <div>
          <Label>Accent color</Label>
          <Input value={props.accent} onChange={(e) => props.setAccent(e.target.value)} />
        </div>
      </div>
      <div>
        <Label>Categories (comma-separated)</Label>
        <Input value={props.categories} onChange={(e) => props.setCategories(e.target.value)} />
      </div>
    </div>
  );
}
