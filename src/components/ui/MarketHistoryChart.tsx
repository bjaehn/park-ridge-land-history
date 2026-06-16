"use client";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { MarketHistoryRow } from "@/lib/supabase/cityQueries";

type Props = { data: MarketHistoryRow[] };

function formatPrice(v: number) {
  return `$${(v / 1000).toFixed(0)}K`;
}

export function MarketHistoryChart({ data }: Props) {
  if (!data.length) return null;
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis
          dataKey="saleYear"
          tick={{ fill: "#64748b", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          yAxisId="vol"
          orientation="left"
          tick={{ fill: "#64748b", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={30}
        />
        <YAxis
          yAxisId="price"
          orientation="right"
          tickFormatter={formatPrice}
          tick={{ fill: "#64748b", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={52}
        />
        <Tooltip
          contentStyle={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: "8px",
            fontSize: 12,
          }}
          labelStyle={{ color: "#94a3b8" }}
          itemStyle={{ color: "#e2e8f0" }}
          formatter={(value, name) => {
            const v = typeof value === "number" ? value : 0;
            return name === "medianPrice"
              ? [formatPrice(v), "Median price"]
              : [v, "Sales"];
          }}
        />
        <Bar
          yAxisId="vol"
          dataKey="saleCount"
          fill="#334155"
          radius={[2, 2, 0, 0]}
          name="saleCount"
        />
        <Line
          yAxisId="price"
          type="monotone"
          dataKey="medianPrice"
          stroke="#a78bfa"
          strokeWidth={2}
          dot={false}
          name="medianPrice"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
