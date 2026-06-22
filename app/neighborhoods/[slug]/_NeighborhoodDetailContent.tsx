"use client";

import React, { useState, useEffect } from "react";
import { StatGrid } from "@/components/ui/StatGrid";
import { ConstructionByDecadeChart } from "@/components/ui/ConstructionByDecadeChart";
import { EntityCard } from "@/components/ui/EntityCard";
import { LoadingSkeleton } from "@/components/ui/EmptyState";
import { HighlightReel } from "@/components/ui/HighlightReel";
import { getChangeSignal, formatNumber, formatCount } from "@/lib/formatters";
import { getNeighborhoodDetail } from "@/lib/data/neighborhoods";
import { NEIGHBORHOOD_NARRATIVES } from "@/lib/content";
import type { HighlightGroup } from "@/components/ui/HighlightReel";

const NEIGHBORHOOD_HIGHLIGHTS: readonly HighlightGroup[] = [
  { heading: "Oldest homes in this neighborhood", category: "oldest" },
  { heading: "Most active properties", category: "most_active" },
  { heading: "Most recently sold", category: "most_recent_sale" },
];

type Props = { neighborhoodId: string; label: string; slug: string; mapSlot?: React.ReactNode };

export function NeighborhoodDetailContent({ neighborhoodId, label, slug, mapSlot }: Props) {
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getNeighborhoodDetail>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getNeighborhoodDetail(neighborhoodId)
      .then(setDetail)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [neighborhoodId]);

  if (loading) return <LoadingSkeleton rows={4} />;
  if (!detail) return null;

  const signal = getChangeSignal({
    permit_count: detail.totalPermits,
    sale_count: detail.totalSales,
    recent_teardown_count: detail.recentTeardowns,
  });

  const statItems = [
    { value: formatNumber(detail.parcelCount), label: "Properties" },
    detail.medianYear ? { value: String(detail.medianYear), label: "Typical build year" } : null,
    detail.totalPermits ? { value: formatCount(detail.totalPermits, "permit", "permits"), label: "Permits on record" } : null,
    signal !== "Dormant" ? { value: signal, label: "Activity signal" } : null,
  ].filter((s): s is { value: string; label: string } => s !== null);

  const narrative = NEIGHBORHOOD_NARRATIVES[slug];

  return (
    <div className="space-y-10">
      {narrative && (
        <p className="text-text-secondary leading-relaxed max-w-prose">{narrative}</p>
      )}

      <StatGrid columns={(Math.max(2, Math.min(statItems.length, 4))) as 2 | 3 | 4} stats={statItems.slice(0, 4)} />

      {mapSlot && (
        <div>
          <p className="section-heading">Neighborhood map</p>
          {mapSlot}
        </div>
      )}

      <HighlightReel
        scope="neighborhood"
        scopeId={neighborhoodId}
        groups={NEIGHBORHOOD_HIGHLIGHTS}
        limit={5}
      />

      <div>
        <p className="section-heading">When {label} took shape</p>
        <ConstructionByDecadeChart rows={detail.decadeRows} />
      </div>

      {detail.streets && detail.streets.length > 0 && (
        <div>
          <p className="section-heading">Streets in {label}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {detail.streets.map((street) => (
              <EntityCard
                key={street.name}
                href={`/streets/${encodeURIComponent(street.name)}`}
                title={street.displayName}
                meta={street.parcelCount ? formatCount(street.parcelCount, "property", "properties") : undefined}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
