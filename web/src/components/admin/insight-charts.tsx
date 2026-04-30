"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  AudienceSlice,
  CircleActivityBar,
  EngagementDayPoint,
  GrowthPoint,
  ReportReasonSlice,
  ReportSourceBar,
} from "@/types/admin-charts";

const axisStyle = { fill: "var(--muted-foreground)", fontSize: 11 };

function formatYAxisTick(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
  return String(v);
}

export function EngagementOverviewChart({ data }: { data: EngagementDayPoint[] }) {
  const chartData = data.length
    ? data
    : [{ day: "—", messages: 0, reactions: 0, shares: 0 }];

  return (
    <div className="w-full min-w-0">
      <ResponsiveContainer width="100%" height={288}>
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="day" tick={axisStyle} axisLine={false} tickLine={false} />
          <YAxis
            tick={axisStyle}
            axisLine={false}
            tickLine={false}
            tickFormatter={formatYAxisTick}
          />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 8,
            }}
            labelStyle={{ color: "var(--foreground)" }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="messages" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="reactions" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="shares" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GrowthChart({ data }: { data: GrowthPoint[] }) {
  const chartData = data.length ? data : [{ month: "—", users: 0 }];

  return (
    <div className="w-full min-w-0">
      <ResponsiveContainer width="100%" height={288}>
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gUser" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="month" tick={axisStyle} axisLine={false} tickLine={false} />
          <YAxis
            tick={axisStyle}
            axisLine={false}
            tickLine={false}
            tickFormatter={formatYAxisTick}
          />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 8,
            }}
            labelStyle={{ color: "var(--foreground)" }}
          />
          <Area type="monotone" dataKey="users" stroke="var(--chart-1)" fill="url(#gUser)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AudienceDonutChart({ data }: { data: AudienceSlice[] }) {
  const chartData = data.length ? data : [{ name: "No profiles", value: 100, fill: "var(--muted)" }];

  return (
    <div className="w-full min-w-0">
      <ResponsiveContainer width="100%" height={288}>
        <PieChart>
          <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={84} paddingAngle={2}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.fill} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 8,
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TopCirclesBarChart({ data }: { data: CircleActivityBar[] }) {
  const chartData = data.length ? data : [{ name: "—", value: 0 }];
  const maxV = Math.max(1, ...chartData.map((d) => d.value));

  return (
    <div className="w-full min-w-0">
      <ResponsiveContainer width="100%" height={256}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
          <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} domain={[0, maxV]} />
          <YAxis type="category" dataKey="name" width={120} tick={axisStyle} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 8,
            }}
          />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} fill="var(--chart-2)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ReportReasonsDonutChart({ data }: { data: ReportReasonSlice[] }) {
  const chartData = data.length ? data : [{ name: "No reports", value: 1, fill: "var(--muted)" }];

  return (
    <div className="w-full min-w-0">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={76} paddingAngle={2}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.fill} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 8,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ReportsBySourceBarChart({ data }: { data: ReportSourceBar[] }) {
  const chartData = data.length ? data : [{ source: "—", count: 0 }];

  return (
    <div className="w-full min-w-0">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 16, left: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
          <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} />
          <YAxis
            type="category"
            dataKey="source"
            width={100}
            tick={axisStyle}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 8,
            }}
          />
          <Bar dataKey="count" radius={[0, 6, 6, 0]} fill="var(--chart-2)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MiniLineChart({ data }: { data: GrowthPoint[] }) {
  const chartData = (data.length ? data : [{ month: "—", users: 0 }]).slice(-5);

  return (
    <div className="w-full min-w-0">
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="month" hide />
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 8,
            }}
          />
          <Line type="monotone" dataKey="users" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
