"use client";

import { formatDecade, formatCount } from "@/lib/formatters";
import { ERA_PALETTE, ERA_ORDER } from "@/lib/mapConfig";

export type DecadeRow = {
  decade: string;
  count: number;
  pct?: number;
};

type Props = {
  rows: DecadeRow[];
  title?: string;
};

/**
 * Single decade bar chart, used on Home, City, Neighborhood, Street,
 * and Subdivision pages. Exactly one implementation.
 *
 * Decade labels come from formatDecade so the "1950ss" and "1900ss"
 * bugs cannot reach this component.
 *
 * "Suspicious" decade is never displayed; Unknown is used instead.
 */
export function ConstructionByDecadeChart({ rows, title }: Props) {
  const filtered = rows.filter((r) => {
    const label = formatDecade(r.decade);
    return label !== "Unknown" || r.count > 0;
  });

  const sorted = [...filtered].sort((a, b) => {
    const ai = ERA_ORDER.indexOf(a.decade as (typeof ERA_ORDER)[number]);
    const bi = ERA_ORDER.indexOf(b.decade as (typeof ERA_ORDER)[number]);
    const aIdx = ai === -1 ? ERA_ORDER.length : ai;
    const bIdx = bi === -1 ? ERA_ORDER.length : bi;
    return aIdx - bIdx;
  });

  const maxCount = Math.max(...sorted.map((r) => r.count), 1);

  return (
    <div>
      {title && (
        <h2 className="text-base font-semibold text-text-primary mb-4">{title}</h2>
      )}
      <div className="space-y-2">
        {sorted.map((row) => {
          const label = formatDecade(row.decade);
          const color = ERA_PALETTE[row.decade] ?? ERA_PALETTE["Unknown"];
          const pct = (row.count / maxCount) * 100;

          return (
            <div key={row.decade} className="flex items-center gap-3 group">
              <div className="w-16 shrink-0 text-right text-xs text-text-secondary tabular-nums">
                {label}
              </div>
              <div className="flex-1 h-5 bg-surface-border rounded-sm overflow-hidden">
                <div
                  className="h-full rounded-sm transition-all duration-300"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </div>
              <div
                className="w-20 shrink-0 text-xs text-text-secondary tabular-nums"
                aria-label={formatCount(row.count, "home", "homes")}
              >
                {formatCount(row.count, "home", "homes")}
                {row.pct !== undefined && (
                  <span className="text-text-muted ml-1">({row.pct.toFixed(0)}%)</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
