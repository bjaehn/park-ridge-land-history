"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatAddress, formatNumber } from "@/lib/formatters";
import { fetchHighlights } from "@/lib/data/highlights";
import type { HighlightScope, HighlightCategory, HighlightParcel } from "@/lib/data/highlights";

const CATEGORY_ACCENT: Record<HighlightCategory, string> = {
  oldest:           "#e6a64a",
  most_active:      "#4fb6a8",
  newest:           "#8b7ff0",
  most_recent_sale: "#c96a70",
  largest:          "#4a90d9",
};

function primaryMetric(category: HighlightCategory, item: HighlightParcel): string | null {
  switch (category) {
    case "oldest":
    case "newest":
      return item.yearBuilt != null ? `Built ${item.yearBuilt}` : null;
    case "most_active":
      return item.permitCount != null && item.permitCount > 0
        ? `${item.permitCount} ${item.permitCount === 1 ? "permit" : "permits"}`
        : null;
    case "most_recent_sale":
      return item.latestSaleYear != null ? `Sold ${item.latestSaleYear}` : null;
    case "largest":
      return item.buildingSqft != null ? `${formatNumber(item.buildingSqft)} sqft` : null;
  }
}

export type HighlightGroup = {
  heading: string;
  category: HighlightCategory;
};

type GroupData = { category: HighlightCategory; heading: string; items: HighlightParcel[] };

type Props = {
  scope: HighlightScope;
  scopeId: string;
  groups: readonly HighlightGroup[];
  limit?: number;
};

export function HighlightReel({ scope, scopeId, groups, limit = 5 }: Props) {
  const [groupData, setGroupData] = useState<GroupData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all(
      groups.map((g) =>
        fetchHighlights(scope, scopeId, g.category, limit).then((items) => ({
          category: g.category,
          heading: g.heading,
          items,
        }))
      )
    )
      .then(setGroupData)
      .catch(() => setGroupData([]))
      .finally(() => setLoading(false));
    // groups is always a module-level constant at each call site, so it is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, scopeId, limit]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {groups.map((g) => (
          <div key={g.category}>
            <p className="section-heading">{g.heading}</p>
            <div className="space-y-0">
              {Array.from({ length: limit }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 py-2.5 border-b border-surface-border last:border-0"
                >
                  <div className="w-5 h-4 bg-surface-border rounded animate-pulse shrink-0" />
                  <div className="flex-1 h-4 bg-surface-border rounded animate-pulse" />
                  <div className="w-16 h-4 bg-surface-border rounded animate-pulse shrink-0" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!groupData.length) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {groupData.map((g) => {
        if (!g.items.length) return null;
        const accent = CATEGORY_ACCENT[g.category];
        return (
          <div key={g.category}>
            <p className="section-heading" style={{ color: accent }}>{g.heading}</p>
            <div>
              {g.items.map((item, i) => {
                const metric = primaryMetric(g.category, item);
                return (
                  <Link
                    key={item.pin}
                    href={`/properties/${encodeURIComponent(item.pin)}`}
                    className="flex items-center gap-3 py-2.5 border-b border-surface-border last:border-0 hover:bg-surface-raised/50 transition-colors rounded px-1 -mx-1"
                  >
                    <span
                      className="text-sm font-bold tabular-nums w-5 text-right shrink-0"
                      style={{ color: accent }}
                    >
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm font-medium text-text-primary truncate">
                      {formatAddress(item.address)}
                    </span>
                    {metric && (
                      <span className="text-xs text-text-muted shrink-0">{metric}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
