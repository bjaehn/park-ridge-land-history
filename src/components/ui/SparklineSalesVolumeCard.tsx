"use client";
import { useState, useEffect } from "react";
import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";
import { fetchMarketHistory } from "@/lib/supabase/cityQueries";
import type { MarketHistoryRow } from "@/lib/supabase/cityQueries";

export function SparklineSalesVolumeCard() {
  const [data, setData] = useState<MarketHistoryRow[]>([]);

  useEffect(() => {
    fetchMarketHistory().then(setData).catch(() => null);
  }, []);

  if (!data.length) return null;

  const currentYear = new Date().getFullYear();
  const completeData = data.filter((r) => r.saleYear < currentYear);
  const latest = completeData.length ? completeData[completeData.length - 1] : data[data.length - 1];
  const prev = completeData.length >= 2 ? completeData[completeData.length - 2] : null;
  const yoy = prev && prev.saleCount > 0
    ? Math.round(((latest.saleCount - prev.saleCount) / prev.saleCount) * 100)
    : null;
  const peak = data.reduce((best, r) => (r.saleCount > best.saleCount ? r : best), data[0]);

  return (
    <div className="bg-surface-card border border-surface-border rounded-lg px-5 py-4">
      <p className="text-xs text-text-muted mb-1">Annual sales volume, Park Ridge</p>
      <p className="text-3xl font-bold text-text-primary leading-none">
        {latest.saleCount.toLocaleString()}
      </p>
      <p className="text-xs text-text-secondary mt-1">
        Sales in {latest.saleYear}
        {yoy !== null && (
          <span className={yoy >= 0 ? "text-emerald-400" : "text-red-400"}>
            {" "}{yoy >= 0 ? "↑" : "↓"} {yoy >= 0 ? "+" : ""}{yoy}% vs prior year
          </span>
        )}
      </p>
      <div className="mt-3 h-14">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Tooltip
              contentStyle={{
                background: "#0f172a",
                border: "1px solid #1e293b",
                borderRadius: "6px",
                fontSize: 11,
              }}
              labelFormatter={(_, payload) =>
                payload && payload[0] ? String(payload[0].payload.saleYear) : ""
              }
              formatter={(v) => [typeof v === "number" ? v.toLocaleString() : v, "Sales"]}
            />
            <Area
              type="monotone"
              dataKey="saleCount"
              stroke="#34d399"
              strokeWidth={1.5}
              fill="url(#volumeGrad)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-text-muted mt-2">
        Peak {peak.saleYear} ({peak.saleCount.toLocaleString()} sales)
      </p>
    </div>
  );
}
