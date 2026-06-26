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

  const currentYear = new Date().getFullYear();
  const completeData = data.filter((r) => r.saleYear < currentYear);
  const latest = completeData.length ? completeData[completeData.length - 1] : data[data.length - 1];
  const earliest = data[0];
  const pctChange = earliest && earliest.medianPrice > 0 && earliest.saleYear !== latest.saleYear
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
        <p className={`text-xs mt-1 font-medium ${pctChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
          {pctChange >= 0 ? "↑" : "↓"} {pctChange >= 0 ? "+" : ""}{pctChange}% since {earliest.saleYear}
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
              labelFormatter={(_, payload) =>
                payload && payload[0] ? String(payload[0].payload.saleYear) : ""
              }
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
        Median price in {latest.saleYear}
      </p>
    </div>
  );
}
