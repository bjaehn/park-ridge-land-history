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
import type { AssessmentPoint } from "@/lib/data/properties";
import { CHART_COLORS } from "@/lib/chartTheme";

function formatK(v: number) {
  return `$${(v / 1000).toFixed(0)}K`;
}

function formatPrice(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000)}K`;
  return `$${v}`;
}

type Props = {
  timeline: AssessmentPoint[];
  appealYears: number[];
  totalReduction: number | null;
};

export function AssessmentChart({ timeline, appealYears, totalReduction }: Props) {
  const points = [...timeline].sort((a, b) => a.year - b.year);
  if (points.length < 2) return null;

  const minYear = points[0].year;
  const maxYear = points[points.length - 1].year;
  const visibleAppealYears = appealYears.filter((yr) => yr >= minYear && yr <= maxYear);

  return (
    <div>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={points} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id="propAssessGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.25} />
              <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
          <XAxis
            dataKey="year"
            tick={{ fill: CHART_COLORS.axisTick, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatK}
            tick={{ fill: CHART_COLORS.axisTick, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={56}
          />
          {visibleAppealYears.map((yr) => (
            <ReferenceLine
              key={yr}
              x={yr}
              stroke={CHART_COLORS.nonMarketOrAppeal}
              strokeDasharray="3 3"
              strokeOpacity={0.8}
              label={{ value: "appeal", fill: CHART_COLORS.nonMarketOrAppeal, fontSize: 9, position: "top" }}
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
            formatter={(v) => [formatPrice(typeof v === "number" ? v : 0), "Assessed value"]}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={CHART_COLORS.primary}
            strokeWidth={2}
            fill="url(#propAssessGrad)"
            dot={{ fill: CHART_COLORS.primary, r: 3 }}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
      {totalReduction != null && totalReduction > 0 && (
        <p className="text-xs text-amber-400/80 mt-2">
          Total reduction granted through appeals: {formatPrice(totalReduction)}
        </p>
      )}
    </div>
  );
}
