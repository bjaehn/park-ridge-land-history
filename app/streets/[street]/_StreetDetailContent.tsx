"use client";

import React, { useState, useEffect } from "react";
import { StatGrid } from "@/components/ui/StatGrid";
import { ConstructionByDecadeChart } from "@/components/ui/ConstructionByDecadeChart";
import { EntityCard, UnresolvableEntityCard } from "@/components/ui/EntityCard";
import { LoadingSkeleton } from "@/components/ui/EmptyState";
import { HighlightReel } from "@/components/ui/HighlightReel";
import { formatNumber, formatCount, formatAddress } from "@/lib/formatters";
import { getEraColor } from "@/lib/mapConfig";
import { getStreetDetail } from "@/lib/data/streets";
import type { HighlightGroup } from "@/components/ui/HighlightReel";

const STREET_HIGHLIGHTS: readonly HighlightGroup[] = [
  { heading: "Oldest homes on this street", category: "oldest" },
  { heading: "Most permit activity", category: "most_active" },
  { heading: "Most recently sold", category: "most_recent_sale" },
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
          <p className="section-heading">Street map</p>
          {mapSlot}
        </div>
      )}

      <HighlightReel
        scope="street"
        scopeId={streetName}
        groups={STREET_HIGHLIGHTS}
        limit={5}
      />

      <div>
        <p className="section-heading">How {displayName} was built, decade by decade</p>
        <ConstructionByDecadeChart rows={detail.decadeRows} />
      </div>

      <div>
        <p className="section-heading">All properties on {displayName}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {detail.parcels.map((p) => {
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
    </div>
  );
}
