"use client";

import { useMemo, useState } from "react";
import { AdminFilterChip } from "@/components/admin/admin-filter-chip";
import { StatusBadge } from "@/components/admin/status-badge";
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
import type { AdminUser } from "@/types/admin";

const STATUS_FILTERS: Array<{ key: "all" | AdminUser["status"]; label: string }> = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "suspended", label: "Suspended" },
  { key: "banned", label: "Banned" },
];

export function UsersConsole({ users }: { users: AdminUser[] }) {
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]["key"]>("all");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return users.filter((u) => {
      if (status !== "all" && u.status !== status) return false;
      if (!needle) return true;
      const hay = `${u.displayName} ${u.profession} ${u.specialty} ${u.id}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [users, status, q]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <AdminFilterChip key={f.key} active={status === f.key} onClick={() => setStatus(f.key)}>
              {f.label}
            </AdminFilterChip>
          ))}
        </div>
        <div className="flex gap-2 sm:shrink-0">
          <Input
            placeholder="Search name, role, id…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full min-w-[12rem] bg-secondary/40 sm:w-64"
          />
          <Button variant="secondary" className="shrink-0">
            Export (soon)
          </Button>
        </div>
      </div>
      <AdminPanelCard>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Directory</CardTitle>
          <p className="text-xs text-muted-foreground">
            {filtered.length} of {users.length} shown · mock
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Profession</TableHead>
                <TableHead>Specialty</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reports</TableHead>
                <TableHead>Strikes</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Last active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.id} className="border-border">
                  <TableCell className="font-medium">{u.displayName}</TableCell>
                  <TableCell>{u.profession}</TableCell>
                  <TableCell className="text-muted-foreground">{u.specialty}</TableCell>
                  <TableCell>
                    <StatusBadge status={u.status} />
                  </TableCell>
                  <TableCell>{u.reportsCount}</TableCell>
                  <TableCell>{u.strikes}</TableCell>
                  <TableCell className="text-muted-foreground">{u.joinedAt}</TableCell>
                  <TableCell className="text-muted-foreground">{u.lastActive}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline">
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </AdminPanelCard>
    </div>
  );
}
