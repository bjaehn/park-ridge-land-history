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
import { CHART_COLORS } from "@/lib/chartTheme";

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
            <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.25} />
            <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
        <XAxis
          dataKey="assessmentYear"
          tick={{ fill: CHART_COLORS.axisTick, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatK}
          tick={{ fill: CHART_COLORS.axisTick, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        {REASSESSMENT_YEARS.map((yr) => (
          <ReferenceLine
            key={yr}
            x={yr}
            stroke={CHART_COLORS.secondary}
            strokeDasharray="4 2"
            label={{ value: "reassess", fill: CHART_COLORS.secondary, fontSize: 9, position: "top" }}
          />
        ))}
        <Tooltip
          contentStyle={{
            background: CHART_COLORS.tooltipBg,
            border: `1px solid ${CHART_COLORS.tooltipBorder}`,
            borderRadius: "8px",
            fontSize: 12,
          }}
          labelStyle={{ color: CHART_COLORS.tooltipLabel }}
          formatter={(v) => [formatK(typeof v === "number" ? v : 0), "Avg assessed value"]}
        />
        <Area
          type="monotone"
          dataKey="avgTotal"
          stroke={CHART_COLORS.primary}
          strokeWidth={2}
          fill="url(#assessGrad)"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
