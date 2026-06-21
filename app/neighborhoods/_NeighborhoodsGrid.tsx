"use client";

import { useState, useEffect } from "react";
import { EntityCard } from "@/components/ui/EntityCard";
import { LoadingSkeleton } from "@/components/ui/EmptyState";
import { getChangeSignal } from "@/lib/formatters";
import { fetchNeighborhoodSummaries } from "@/lib/data/neighborhoods";
import type { NeighborhoodSummary } from "@/lib/data/neighborhoods";
import { NEIGHBORHOOD_ERA_LABELS } from "@/lib/content";

const TYPE_SECTIONS = [
  { type: "official_planning" as const, title: "Official Planning Neighborhoods" },
  { type: "business_district" as const, title: "Business Districts" },
  { type: "local_market" as const, title: "Local / Market Neighborhoods" },
];

function NeighborhoodSection({ title, items }: { title: string; items: NeighborhoodSummary[] }) {
  if (!items.length) return null;
  return (
    <div className="mb-10">
      <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((n) => (
          <EntityCard
            key={n.id}
            href={`/neighborhoods/${encodeURIComponent(n.slug)}`}
            eyebrow={`${n.parcelCount} properties`}
            title={n.label}
            subtitle={NEIGHBORHOOD_ERA_LABELS[n.slug] ?? (n.medianYear ? `Typical build year: ${n.medianYear}` : undefined)}
            signal={getChangeSignal({
              permit_count: n.totalPermits,
              sale_count: n.totalSales,
              recent_teardown_count: n.recentTeardowns,
            })}
          />
        ))}
      </div>
    </div>
  );
}

export function NeighborhoodsGrid() {
  const [neighborhoods, setNeighborhoods] = useState<NeighborhoodSummary[]>([]);
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
    <div>
      {TYPE_SECTIONS.map(({ type, title }) => (
        <NeighborhoodSection
          key={type}
          title={title}
          items={neighborhoods.filter((n) => n.neighborhoodType === type)}
        />
      ))}
      {/* Fallback: untyped neighborhoods */}
      <NeighborhoodSection
        title="Other"
        items={neighborhoods.filter((n) => !n.neighborhoodType)}
      />
    </div>
  );
}
