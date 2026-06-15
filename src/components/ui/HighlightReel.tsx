"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatAddress } from "@/lib/formatters";
import { fetchHighlights } from "@/lib/data/highlights";
import type { HighlightScope, HighlightCategory, HighlightParcel } from "@/lib/data/highlights";

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
      <div className="space-y-8">
        {groups.map((g) => (
          <div key={g.category}>
            <p className="section-heading">{g.heading}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: Math.min(limit, 3) }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 bg-surface-card border border-surface-border rounded-lg animate-pulse"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!groupData.length) return null;

  return (
    <div className="space-y-8">
      {groupData.map((g) => {
        if (!g.items.length) return null;
        return (
          <div key={g.category}>
            <p className="section-heading">{g.heading}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {g.items.map((item) => (
                <Link
                  key={item.pin}
                  href={`/properties/${encodeURIComponent(item.pin)}`}
                  className="bg-surface-card border border-surface-border rounded-lg p-4 hover:border-accent-purple/40 hover:bg-surface-raised transition-colors"
                >
                  <p className="text-sm font-medium text-text-primary leading-snug mb-1.5">
                    {formatAddress(item.address)}
                  </p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-text-secondary">
                    {item.yearBuilt != null && <span>Built {item.yearBuilt}</span>}
                    {item.permitCount != null && item.permitCount > 0 && (
                      <span>{item.permitCount} {item.permitCount === 1 ? "permit" : "permits"}</span>
                    )}
                    {item.latestSaleYear != null && (
                      <span>Sold {item.latestSaleYear}</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
