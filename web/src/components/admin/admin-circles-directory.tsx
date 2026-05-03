"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { AdminPanelCard } from "@/components/admin/admin-panel-card";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CircleAdmin } from "@/types/admin";

export function AdminCirclesDirectory({ circles }: { circles: CircleAdmin[] }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return circles;
    return circles.filter((c) => {
      const blob = `${c.name} ${c.slug}`.toLowerCase();
      return blob.includes(needle);
    });
  }, [circles, q]);

  return (
    <AdminPanelCard>
      <CardHeader className="flex flex-col gap-4 space-y-0 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>All circles</CardTitle>
        <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <Input
            placeholder="Filter by name or slug…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full bg-secondary/40 sm:w-56"
            aria-label="Filter circles"
          />
          <Button className="bg-primary text-primary-foreground" type="button" disabled title="Create via Supabase or API">
            New circle
          </Button>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <p className="mb-3 text-xs text-muted-foreground">
          {filtered.length} of {circles.length} shown
          {q.trim() ? " · filter is local to this page" : ""}
        </p>
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Members</TableHead>
              <TableHead>24h posts</TableHead>
              <TableHead>Featured</TableHead>
              <TableHead>Trend</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length ? (
              filtered.map((c) => (
                <TableRow key={c.id} className="border-border">
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground">/{c.slug}</TableCell>
                  <TableCell className="tabular-nums">{c.members.toLocaleString()}</TableCell>
                  <TableCell className="tabular-nums">{c.posts24h}</TableCell>
                  <TableCell className="tabular-nums">{c.featuredOrder ?? "—"}</TableCell>
                  <TableCell className="tabular-nums">{c.trendScore}</TableCell>
                  <TableCell className="space-x-2 text-right">
                    <Button size="sm" variant="outline" type="button" disabled title="Edit in Supabase Studio">
                      Edit
                    </Button>
                    <Button size="sm" variant="secondary" asChild>
                      <Link href="/admin/moderation">Moderate</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground">
                  {circles.length === 0 ? "No communities found." : "No circles match this filter."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </AdminPanelCard>
  );
}
