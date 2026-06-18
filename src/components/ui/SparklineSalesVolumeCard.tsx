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

  const latest = data[data.length - 1];
  const earliest = data[0];
  const peak = data.reduce((best, r) => (r.saleCount > best.saleCount ? r : best), data[0]);
  const pctChange = earliest && earliest.saleCount > 0
    ? Math.round(((latest.saleCount - earliest.saleCount) / earliest.saleCount) * 100)
    : null;

  return (
    <div className="bg-surface-card border border-surface-border rounded-lg px-5 py-4">
      <p className="text-xs text-text-muted mb-1">Annual sales volume, Park Ridge</p>
      <p className="text-3xl font-bold text-text-primary leading-none">
        {latest.saleCount.toLocaleString()}
      </p>
      {pctChange !== null && (
        <p className="text-xs text-text-secondary mt-1">
          {pctChange >= 0 ? "+" : ""}{pctChange}% since {earliest.saleYear}
        </p>
      )}
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
              labelFormatter={(y) => String(y)}
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
        {earliest.saleYear} to {latest.saleYear} · peak {peak.saleYear} ({peak.saleCount.toLocaleString()} sales)
      </p>
    </div>
  );
}
