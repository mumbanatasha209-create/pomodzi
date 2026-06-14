"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface Point {
  label: string;
  value: number;
}

/** Tiny inline sparkline for cards. */
export function Sparkline({
  data,
  color = "hsl(var(--chart-1))",
  height = 44,
}: {
  data: Point[];
  color?: string;
  height?: number;
}) {
  const id = `spark-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${id})`}
          isAnimationActive
          animationDuration={900}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

interface TooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: { value: number }[];
  suffix?: string;
}

function ChartTooltip({ active, payload, label, suffix = "" }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong rounded-lg px-3 py-2 text-xs shadow-card-lg">
      <p className="mb-0.5 font-medium text-muted-foreground">{label}</p>
      <p className="tabular font-semibold text-foreground">
        {Number(payload[0].value).toLocaleString()} {suffix}
      </p>
    </div>
  );
}

/** Full-width area trend used on dashboard / wallet. */
export function AreaTrend({
  data,
  color = "hsl(var(--chart-1))",
  height = 220,
  suffix = "XLM",
}: {
  data: Point[];
  color?: string;
  height?: number;
  suffix?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <defs>
          <linearGradient id="areaTrend" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
          minTickGap={24}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={48}
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
        />
        <Tooltip content={<ChartTooltip suffix={suffix} />} cursor={{ stroke: "hsl(var(--border))" }} />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2.5}
          fill="url(#areaTrend)"
          isAnimationActive
          animationDuration={1100}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Bars for distribution charts (admin / activity). */
export function BarTrend({
  data,
  color = "hsl(var(--chart-2))",
  height = 200,
}: {
  data: Point[];
  color?: string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={40}
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.4)" }} />
        <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} isAnimationActive animationDuration={900} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Deterministic, smooth pseudo-series so visuals look alive without real history. */
export function makeSeries(seed: number, points = 12, base = 100, drift = 0.4): Point[] {
  const out: Point[] = [];
  let v = base;
  let s = seed || 1;
  const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  for (let i = 0; i < points; i++) {
    s = (s * 9301 + 49297) % 233280;
    const rnd = s / 233280;
    v = Math.max(base * 0.4, v + (rnd - 0.5) * base * drift + base * 0.04);
    out.push({ label: labels[i % 12], value: Math.round(v) });
  }
  return out;
}
