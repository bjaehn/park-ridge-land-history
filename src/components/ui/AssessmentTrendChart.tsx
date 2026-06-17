"use client";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { AssessmentTrendRow } from "@/lib/supabase/cityQueries";

const REASSESSMENT_YEARS = [2004, 2007, 2010, 2013, 2016, 2019, 2022, 2025];

type Props = { data: AssessmentTrendRow[] };

function formatK(v: number) {
  return `$${(v / 1000).toFixed(0)}K`;
}

export function AssessmentTrendChart({ data }: Props) {
  if (!data.length) return null;
  return (
    <ResponsiveContainer width="100%" height={340}>
      <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
        <defs>
          <linearGradient id="assessGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis
          dataKey="assessmentYear"
          tick={{ fill: "#64748b", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatK}
          tick={{ fill: "#64748b", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        {REASSESSMENT_YEARS.map((yr) => (
          <ReferenceLine
            key={yr}
            x={yr}
            stroke="#334155"
            strokeDasharray="4 2"
            label={{ value: "reassess", fill: "#475569", fontSize: 9, position: "top" }}
          />
        ))}
        <Tooltip
          contentStyle={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: "8px",
            fontSize: 12,
          }}
          labelStyle={{ color: "#94a3b8" }}
          formatter={(v) => [formatK(typeof v === "number" ? v : 0), "Avg assessed value"]}
        />
        <Area
          type="monotone"
          dataKey="avgTotal"
          stroke="#a78bfa"
          strokeWidth={2}
          fill="url(#assessGrad)"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
