"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatAddress, formatNumber } from "@/lib/formatters";
import { fetchHighlights } from "@/lib/data/highlights";
import { YearBuiltIcon, SizeIcon, PermitIcon, SaleIcon } from "@/lib/icons";
import type { HighlightScope, HighlightCategory, HighlightParcel } from "@/lib/data/highlights";

const CATEGORY_ACCENT: Record<HighlightCategory, { border: string; heading: string }> = {
  oldest:           { border: "#e6a64a", heading: "#e6a64a" },
  most_active:      { border: "#4fb6a8", heading: "#4fb6a8" },
  newest:           { border: "#8b7ff0", heading: "#8b7ff0" },
  most_recent_sale: { border: "#c96a70", heading: "#c96a70" },
};

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
            <p className="section-heading" style={{ color: CATEGORY_ACCENT[g.category].heading }}>{g.heading}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {g.items.map((item) => {
                const accent = CATEGORY_ACCENT[g.category];
                return (
                <Link
                  key={item.pin}
                  href={`/properties/${encodeURIComponent(item.pin)}`}
                  className="bg-surface-card border border-surface-border rounded-lg p-4 hover:bg-surface-raised transition-colors border-l-2"
                  style={{ borderLeftColor: accent.border }}
                >
                  <p className="text-sm font-medium text-text-primary leading-snug mb-2">
                    {formatAddress(item.address)}
                  </p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-secondary">
                    {item.yearBuilt != null && (
                      <span className="flex items-center gap-1">
                        <YearBuiltIcon size={11} strokeWidth={2} aria-hidden="true" />
                        {item.yearBuilt}
                      </span>
                    )}
                    {item.buildingSqft != null && (
                      <span className="flex items-center gap-1">
                        <SizeIcon size={11} strokeWidth={2} aria-hidden="true" />
                        {formatNumber(item.buildingSqft)} sqft
                      </span>
                    )}
                    {item.saleCount != null && item.saleCount > 0 && (
                      <span className="flex items-center gap-1">
                        <SaleIcon size={11} strokeWidth={2} aria-hidden="true" />
                        {item.saleCount} {item.saleCount === 1 ? "sale" : "sales"}
                      </span>
                    )}
                    {item.permitCount != null && item.permitCount > 0 && (
                      <span className="flex items-center gap-1">
                        <PermitIcon size={11} strokeWidth={2} aria-hidden="true" />
                        {item.permitCount} {item.permitCount === 1 ? "permit" : "permits"}
                      </span>
                    )}
                  </div>
                </Link>
              );})}
            </div>
          </div>
        );
      })}
    </div>
  );
}
