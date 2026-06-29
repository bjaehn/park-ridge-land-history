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
import type { PermitActivityRow } from "@/lib/supabase/cityQueries";

type Props = { data: PermitActivityRow[]; hideCommercial?: boolean };

export function PermitActivityChart({ data, hideCommercial }: Props) {
  if (!data.length) return null;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis
          dataKey="permitYear"
          tick={{ fill: "#64748b", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#64748b", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={36}
        />
        <Tooltip
          contentStyle={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: "8px",
            fontSize: 12,
          }}
          labelStyle={{ color: "#94a3b8" }}
        />
        <Bar
          dataKey="residentialCount"
          stackId="a"
          fill="#a78bfa"
          radius={[0, 0, 0, 0]}
          name="Residential"
        />
        {!hideCommercial && (
          <Bar
            dataKey="commercialCount"
            stackId="a"
            fill="#475569"
            radius={[2, 2, 0, 0]}
            name="Commercial"
          />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}
