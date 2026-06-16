"use client";
import { useState, useEffect } from "react";
import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";
import { fetchMarketHistory } from "@/lib/supabase/cityQueries";
import type { MarketHistoryRow } from "@/lib/supabase/cityQueries";

function formatPrice(v: number) {
  return `$${(v / 1000).toFixed(0)}K`;
}

export function SparklinePriceCard() {
  const [data, setData] = useState<MarketHistoryRow[]>([]);

  useEffect(() => {
    fetchMarketHistory().then(setData).catch(() => null);
  }, []);

  if (!data.length) return null;

  const latest = data[data.length - 1];
  const earliest = data[0];
  const pctChange = earliest
    ? Math.round(
        ((latest.medianPrice - earliest.medianPrice) / earliest.medianPrice) * 100
      )
    : null;

  return (
    <div className="bg-surface-card border border-surface-border rounded-lg px-5 py-4">
      <p className="text-xs text-text-muted mb-1">Median sale price, Park Ridge</p>
      <p className="text-3xl font-bold text-text-primary leading-none">
        {formatPrice(latest.medianPrice)}
      </p>
      {pctChange !== null && (
        <p className="text-xs text-text-secondary mt-1">
          +{pctChange}% since {earliest.saleYear}
        </p>
      )}
      <div className="mt-3 h-14">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
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
              formatter={(v) => [formatPrice(typeof v === "number" ? v : 0), "Median"]}
            />
            <Area
              type="monotone"
              dataKey="medianPrice"
              stroke="#a78bfa"
              strokeWidth={1.5}
              fill="url(#sparkGrad)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-text-muted mt-2">
        {earliest.saleYear} to {latest.saleYear} market sales
      </p>
    </div>
  );
}
