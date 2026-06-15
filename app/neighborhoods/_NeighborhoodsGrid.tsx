"use client";

import { useState, useEffect } from "react";
import { EntityCard } from "@/components/ui/EntityCard";
import { LoadingSkeleton } from "@/components/ui/EmptyState";
import { getChangeSignal, eraLabel } from "@/lib/formatters";
import { fetchNeighborhoodSummaries } from "@/lib/data/neighborhoods";

export function NeighborhoodsGrid() {
  const [neighborhoods, setNeighborhoods] = useState<Awaited<ReturnType<typeof fetchNeighborhoodSummaries>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNeighborhoodSummaries()
      .then(setNeighborhoods)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <LoadingSkeleton key={i} rows={1} className="h-36" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {neighborhoods.map((n) => (
        <EntityCard
          key={n.id}
          href={`/neighborhoods/${encodeURIComponent(n.slug)}`}
          eyebrow={`${n.parcelCount} properties`}
          title={n.label}
          subtitle={n.medianYear ? `Typical build year: ${n.medianYear}` : undefined}
          signal={getChangeSignal({
            permit_count: n.totalPermits,
            sale_count: n.totalSales,
            recent_teardown_count: n.recentTeardowns,
          })}
          meta={n.medianYear ? eraLabel(n.medianYear) : undefined}
        />
      ))}
    </div>
  );
}
