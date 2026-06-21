"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { PropertySale } from "@/lib/data/properties";

type SalePoint = { year: number; price: number };

function formatPrice(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000)}K`;
  return `$${v}`;
}

function SalesTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: SalePoint }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      style={{
        background: "#0f172a",
        border: "1px solid #1e293b",
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 12,
      }}
    >
      <p style={{ color: "#94a3b8", marginBottom: 2 }}>{d.year}</p>
      <p style={{ color: "#e2e8f0" }}>{formatPrice(d.price)}</p>
    </div>
  );
}

export function SalesPriceChart({ sales }: { sales: PropertySale[] }) {
  const allPoints = sales
    .filter((s) => s.sale_price != null && s.sale_price > 0)
    .map((s) => ({
      year: s.sale_date ? new Date(s.sale_date).getFullYear() : (s.sale_year ?? 0),
      price: s.sale_price!,
      isMarket: s.is_market_sale !== false,
    }))
    .filter((p) => p.year > 0)
    .sort((a, b) => a.year - b.year);

  if (allPoints.length < 2) return null;

  const marketData: SalePoint[] = allPoints
    .filter((p) => p.isMarket)
    .map((p) => ({ year: p.year, price: p.price }));
  const nonMarketData: SalePoint[] = allPoints
    .filter((p) => !p.isMarket)
    .map((p) => ({ year: p.year, price: p.price }));

  const years = allPoints.map((p) => p.year);
  const minYear = Math.min(...years) - 1;
  const maxYear = Math.max(...years) + 1;

  return (
    <div>
      <ResponsiveContainer width="100%" height={280}>
        <ScatterChart margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            type="number"
            dataKey="year"
            domain={[minYear, maxYear]}
            tick={{ fill: "#64748b", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickCount={Math.min(years.length + 2, 10)}
            tickFormatter={(v: number) => String(v)}
            name="Year"
          />
          <YAxis
            type="number"
            dataKey="price"
            tickFormatter={(v: number) => formatPrice(v)}
            tick={{ fill: "#64748b", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={60}
            name="Price"
          />
          <Tooltip content={<SalesTooltip />} />
          {marketData.length > 0 && (
            <Scatter name="Market sale" data={marketData} fill="#0d9488" fillOpacity={0.9} />
          )}
          {nonMarketData.length > 0 && (
            <Scatter name="Non-market" data={nonMarketData} fill="#d97706" fillOpacity={0.9} />
          )}
        </ScatterChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-5 mt-2 text-xs text-text-muted">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: "#0d9488" }} />
          Market sale
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: "#d97706" }} />
          Non-market transfer
        </span>
      </div>
    </div>
  );
}
