"use client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { AppealsRow } from "@/lib/supabase/cityQueries";

type Props = { data: AppealsRow[] };

export function AppealsChart({ data }: Props) {
  if (!data.length) return null;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis
          dataKey="appealYear"
          tick={{ fill: "#64748b", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#64748b", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={40}
          tickFormatter={(v) =>
            v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)
          }
        />
        <Tooltip
          contentStyle={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: "8px",
            fontSize: 12,
          }}
          labelStyle={{ color: "#94a3b8" }}
          formatter={(v) => [(typeof v === "number" ? v : 0).toLocaleString(), "Appeals filed"]}
        />
        <Bar dataKey="appealCount" fill="#7c3aed" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
