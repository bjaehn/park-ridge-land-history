"use client";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { PermitActivityRow } from "@/lib/supabase/cityQueries";
import { CHART_COLORS } from "@/lib/chartTheme";

type Props = {
  data: PermitActivityRow[];
  hideCommercial?: boolean;
  height?: number;
  selectedYear?: number | null;
  onYearClick?: (year: number) => void;
};

export function PermitActivityChart({
  data,
  hideCommercial,
  height = 220,
  selectedYear,
  onYearClick,
}: Props) {
  if (!data.length) return null;

  const hasSelection = selectedYear != null;

  function handleClick(payload: Record<string, unknown>) {
    if (!onYearClick) return;
    const year = Number((payload as { activeLabel?: unknown }).activeLabel);
    if (!isNaN(year)) onYearClick(year);
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        margin={{ top: 4, right: 8, bottom: 0, left: 8 }}
        onClick={onYearClick ? (payload) => handleClick(payload as Record<string, unknown>) : undefined}
        style={onYearClick ? { cursor: "pointer" } : undefined}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
        <XAxis
          dataKey="permitYear"
          tick={{ fill: CHART_COLORS.axisTick, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: CHART_COLORS.axisTick, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={36}
        />
        <Tooltip
          contentStyle={{
            background: CHART_COLORS.tooltipBg,
            border: `1px solid ${CHART_COLORS.tooltipBorder}`,
            borderRadius: "8px",
            fontSize: 12,
          }}
          labelStyle={{ color: CHART_COLORS.tooltipLabel }}
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
        />
        <Bar
          dataKey="residentialCount"
          stackId="a"
          name="Residential"
          radius={[0, 0, 0, 0]}
        >
          {data.map((entry) => (
            <Cell
              key={`res-${entry.permitYear}`}
              fill={!hasSelection || entry.permitYear === selectedYear ? CHART_COLORS.primary : CHART_COLORS.primaryMuted}
            />
          ))}
        </Bar>
        {!hideCommercial && (
          <Bar
            dataKey="commercialCount"
            stackId="a"
            name="Commercial"
            radius={[2, 2, 0, 0]}
          >
            {data.map((entry) => (
              <Cell
                key={`com-${entry.permitYear}`}
                fill={!hasSelection || entry.permitYear === selectedYear ? CHART_COLORS.secondary : CHART_COLORS.secondaryMuted}
              />
            ))}
          </Bar>
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}
