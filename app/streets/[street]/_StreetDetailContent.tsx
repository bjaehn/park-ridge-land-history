"use client";

import React, { useState, useEffect } from "react";
import { StatGrid } from "@/components/ui/StatGrid";
import { EntityCard, UnresolvableEntityCard } from "@/components/ui/EntityCard";
import { LoadingSkeleton } from "@/components/ui/EmptyState";
import { HighlightReel } from "@/components/ui/HighlightReel";
import { formatNumber, formatAddress } from "@/lib/formatters";
import { getEraColor } from "@/lib/mapConfig";
import { getStreetDetail } from "@/lib/data/streets";
import type { HighlightGroup } from "@/components/ui/HighlightReel";

const STREET_HIGHLIGHTS: readonly HighlightGroup[] = [
  { heading: "Oldest homes on this street", category: "oldest" },
  { heading: "Most permit activity", category: "most_active" },
  { heading: "Most recently sold", category: "most_recent_sale" },
  { heading: "Largest homes on this street", category: "largest" },
];

type Props = { streetName: string; displayName: string; mapSlot?: React.ReactNode };

export function StreetDetailContent({ streetName, displayName, mapSlot }: Props) {
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getStreetDetail>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStreetDetail(streetName)
      .then(setDetail)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [streetName]);

  if (loading) return <LoadingSkeleton rows={3} />;
  if (!detail) return null;

  const statItems = [
    { value: formatNumber(detail.parcelCount), label: "Properties" },
    detail.oldestYear ? { value: String(detail.oldestYear), label: "Oldest recorded" } : null,
    detail.medianYear ? { value: String(detail.medianYear), label: "Typical build year" } : null,
  ].filter((s): s is { value: string; label: string } => s !== null);

  return (
    <div className="space-y-10">
      <StatGrid columns={(Math.max(2, Math.min(statItems.length, 4))) as 2 | 3 | 4} stats={statItems} />

      {mapSlot && (
        <div>
          <h2 className="section-heading">Street map</h2>
          {mapSlot}
        </div>
      )}

      <HighlightReel
        scope="street"
        scopeId={streetName}
        groups={STREET_HIGHLIGHTS}
        limit={5}
      />

      {(detail.medianYear || detail.eraSpan) && (
        <div>
          <h2 className="section-heading">How {displayName} was built</h2>
          <p className="text-sm text-text-secondary">
            {detail.medianYear
              ? `Built primarily in the ${Math.floor(detail.medianYear / 10) * 10}s`
              : `Homes here were built`}
            {detail.eraSpan
              ? `, with homes spanning ${detail.eraSpan}.`
              : `.`}
          </p>
        </div>
      )}

      <div>
        <h2 className="section-heading">All properties on {displayName}</h2>
        {(() => {
          const decadeMap = new Map<string, typeof detail.parcels>();
          for (const p of detail.parcels) {
            const key = p.yearBuilt ? `${Math.floor(p.yearBuilt / 10) * 10}s` : "Unknown";
            if (!decadeMap.has(key)) decadeMap.set(key, []);
            decadeMap.get(key)!.push(p);
          }
          const decades = Array.from(decadeMap.entries()).sort(([a], [b]) => {
            if (a === "Unknown") return 1;
            if (b === "Unknown") return -1;
            return parseInt(a) - parseInt(b);
          });
          return (
            <div className="space-y-8">
              {decades.map(([decade, group]) => {
                const decadeYear = decade === "Unknown" ? null : parseInt(decade);
                return (
                  <div key={decade}>
                    <div className="flex items-center gap-3 mb-3">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: getEraColor(decadeYear) ?? "#64748b" }}
                        aria-hidden="true"
                      />
                      <span className="text-sm font-semibold text-text-secondary tracking-wide">
                        {decade === "Unknown" ? "Unknown era" : decade}
                      </span>
                      <div className="flex-1 border-t border-surface-border" />
                      <span className="text-xs text-text-muted">
                        {group.length} {group.length === 1 ? "property" : "properties"}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {group.map((p) => {
                        if (!p.address) {
                          return <UnresolvableEntityCard key={p.pin} pin={p.pin} />;
                        }
                        return (
                          <EntityCard
                            key={p.pin}
                            href={`/properties/${encodeURIComponent(p.pin)}`}
                            title={formatAddress(p.address)}
                            meta={p.yearBuilt ? `Built ${p.yearBuilt}` : undefined}
                            eraSwatch={getEraColor(p.yearBuilt)}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
