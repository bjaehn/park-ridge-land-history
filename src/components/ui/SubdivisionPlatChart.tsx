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
import { CHART_COLORS } from "@/lib/chartTheme";

type Props = { data: Array<{ decade: number; platCount: number }> };

export function SubdivisionPlatChart({ data }: Props) {
  if (!data.length) return null;
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
        <XAxis
          dataKey="decade"
          tickFormatter={(v) => `${v}s`}
          tick={{ fill: CHART_COLORS.axisTick, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: CHART_COLORS.axisTick, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={30}
        />
        <Tooltip
          contentStyle={{
            background: CHART_COLORS.tooltipBg,
            border: `1px solid ${CHART_COLORS.tooltipBorder}`,
            borderRadius: "8px",
            fontSize: 12,
          }}
          labelStyle={{ color: CHART_COLORS.tooltipLabel }}
          labelFormatter={(v) => `${v}s`}
          formatter={(v) => [(typeof v === "number" ? v : 0), "Plats recorded"]}
        />
        <Bar dataKey="platCount" fill={CHART_COLORS.primary} radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
