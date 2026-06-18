"use client";
import { useState, useEffect } from "react";
import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";
import { fetchPermitActivity } from "@/lib/supabase/cityQueries";
import type { PermitActivityRow } from "@/lib/supabase/cityQueries";

type PermitRow = PermitActivityRow & { total: number };

export function SparklinePermitCard() {
  const [data, setData] = useState<PermitRow[]>([]);

  useEffect(() => {
    fetchPermitActivity()
      .then((rows) =>
        setData(rows.map((r) => ({ ...r, total: r.residentialCount + r.commercialCount })))
      )
      .catch(() => null);
  }, []);

  if (!data.length) return null;

  const currentYear = new Date().getFullYear();
  const completeData = data.filter((r) => r.permitYear < currentYear);
  const latest = completeData.length ? completeData[completeData.length - 1] : data[data.length - 1];
  const earliest = data[0];
  const peak = data.reduce((best, r) => (r.total > best.total ? r : best), data[0]);

  return (
    <div className="bg-surface-card border border-surface-border rounded-lg px-5 py-4">
      <p className="text-xs text-text-muted mb-1">Building permits issued, Park Ridge</p>
      <p className="text-3xl font-bold text-text-primary leading-none">
        {latest.total.toLocaleString()}
      </p>
      <p className="text-xs text-text-secondary mt-1">
        Permits in {latest.permitYear}
      </p>
      <div className="mt-3 h-14">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="permitGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#fb923c" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#fb923c" stopOpacity={0} />
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
                payload && payload[0] ? String(payload[0].payload.permitYear) : ""
              }
              formatter={(v) => [typeof v === "number" ? v.toLocaleString() : v, "Permits"]}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke="#fb923c"
              strokeWidth={1.5}
              fill="url(#permitGrad)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-text-muted mt-2">
        Peak {peak.permitYear} ({peak.total.toLocaleString()} permits)
      </p>
    </div>
  );
}
