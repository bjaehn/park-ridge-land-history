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
import { CHART_COLORS } from "@/lib/chartTheme";

type Props = { data: MarketHistoryRow[] };

function formatPrice(v: number) {
  return `$${(v / 1000).toFixed(0)}K`;
}

export function MarketHistoryChart({ data }: Props) {
  if (!data.length) return null;
  return (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
        <XAxis
          dataKey="saleYear"
          tick={{ fill: CHART_COLORS.axisTick, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          yAxisId="vol"
          orientation="left"
          tick={{ fill: CHART_COLORS.axisTick, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={30}
        />
        <YAxis
          yAxisId="price"
          orientation="right"
          tickFormatter={formatPrice}
          tick={{ fill: CHART_COLORS.axisTick, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={52}
        />
        <Tooltip
          contentStyle={{
            background: CHART_COLORS.tooltipBg,
            border: `1px solid ${CHART_COLORS.tooltipBorder}`,
            borderRadius: "8px",
            fontSize: 12,
          }}
          labelStyle={{ color: CHART_COLORS.tooltipLabel }}
          itemStyle={{ color: CHART_COLORS.tooltipValue }}
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
          fill={CHART_COLORS.secondary}
          radius={[2, 2, 0, 0]}
          name="saleCount"
        />
        <Line
          yAxisId="price"
          type="monotone"
          dataKey="medianPrice"
          stroke={CHART_COLORS.primary}
          strokeWidth={2}
          dot={false}
          name="medianPrice"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
