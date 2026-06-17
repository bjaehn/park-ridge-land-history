"use client";

import type { PropertySale } from "@/lib/data/properties";

type PlottableSale = {
  year: number;
  price: number;
  isMarket: boolean;
};

function niceMax(value: number): number {
  const mag = Math.pow(10, Math.floor(Math.log10(value)));
  return Math.ceil(value / mag) * mag;
}

function formatShort(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}k`;
  return `$${value}`;
}

export function SalesPriceChart({ sales }: { sales: PropertySale[] }) {
  const points: PlottableSale[] = sales
    .filter((s) => s.sale_price != null && s.sale_price > 0)
    .map((s) => ({
      year: s.sale_date ? new Date(s.sale_date).getFullYear() : (s.sale_year ?? 0),
      price: s.sale_price!,
      isMarket: s.is_market_sale !== false,
    }))
    .filter((p) => p.year > 0)
    .sort((a, b) => a.year - b.year);

  if (points.length < 2) return null;

  const W = 600;
  const H = 140;
  const PAD = { top: 28, right: 16, bottom: 32, left: 8 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const years = points.map((p) => p.year);
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  const yearRange = maxYear - minYear || 1;

  const maxPrice = niceMax(Math.max(...points.map((p) => p.price)));
  const gridValues = [maxPrice * 0.5, maxPrice];

  const xOf = (year: number) => PAD.left + ((year - minYear) / yearRange) * innerW;
  const yOf = (price: number) => PAD.top + innerH - (price / maxPrice) * innerH;

  const linePts = points.map((p) => `${xOf(p.year)},${yOf(p.price)}`).join(" ");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ height: 140 }}
      aria-label="Sale price history chart"
    >
      {/* Grid lines */}
      {gridValues.map((v) => (
        <line
          key={v}
          x1={PAD.left}
          x2={W - PAD.right}
          y1={yOf(v)}
          y2={yOf(v)}
          stroke="currentColor"
          strokeOpacity={0.08}
          strokeWidth={1}
          strokeDasharray="4 4"
          className="text-text-muted"
        />
      ))}

      {/* Price grid labels (right side) */}
      {gridValues.map((v) => (
        <text
          key={`label-${v}`}
          x={W - PAD.right - 2}
          y={yOf(v) - 3}
          textAnchor="end"
          fontSize={9}
          className="fill-text-muted"
          style={{ fill: "var(--color-text-muted, #6b7280)" }}
        >
          {formatShort(v)}
        </text>
      ))}

      {/* Connecting line (market sales only) */}
      {points.filter((p) => p.isMarket).length >= 2 && (
        <polyline
          points={points
            .filter((p) => p.isMarket)
            .map((p) => `${xOf(p.year)},${yOf(p.price)}`)
            .join(" ")}
          fill="none"
          stroke="#0d9488"
          strokeWidth={1.5}
          strokeOpacity={0.6}
        />
      )}

      {/* Dots + labels */}
      {points.map((p, i) => {
        const cx = xOf(p.year);
        const cy = yOf(p.price);
        const color = p.isMarket ? "#0d9488" : "#d97706";
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r={4} fill={color} fillOpacity={0.85} />
            {/* Price label above dot */}
            <text
              x={cx}
              y={cy - 8}
              textAnchor="middle"
              fontSize={9}
              fontWeight="600"
              style={{ fill: color }}
            >
              {formatShort(p.price)}
            </text>
            {/* Year label below axis */}
            <text
              x={cx}
              y={H - 4}
              textAnchor="middle"
              fontSize={9}
              style={{ fill: "var(--color-text-muted, #6b7280)" }}
            >
              {p.year}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
