"use client";

import { useState, useEffect } from "react";
import { StatGrid } from "@/components/ui/StatGrid";
import { EntityCard, UnresolvableEntityCard } from "@/components/ui/EntityCard";
import { LoadingSkeleton } from "@/components/ui/EmptyState";
import { HighlightReel } from "@/components/ui/HighlightReel";
import { formatCount, formatAddress } from "@/lib/formatters";
import { fetchSubdivisionParcels } from "@/lib/supabase/subdivisionQueries";
import type { HighlightGroup } from "@/components/ui/HighlightReel";

const SUBDIVISION_HIGHLIGHTS: readonly HighlightGroup[] = [
  { heading: "Oldest surviving lots", category: "oldest" },
  { heading: "Most renovated", category: "most_active" },
  { heading: "Most recently sold", category: "most_recent_sale" },
];

type Props = { subdivisionId: string };

export function SubdivisionDetailContent({ subdivisionId }: Props) {
  const [parcels, setParcels] = useState<Awaited<ReturnType<typeof fetchSubdivisionParcels>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubdivisionParcels(subdivisionId)
      .then(setParcels)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [subdivisionId]);

  if (loading) return <LoadingSkeleton rows={3} />;

  const addressedCount = parcels.filter((p) => p.address).length;
  const unresolvableCount = parcels.length - addressedCount;

  const statItems = [
    { value: formatCount(parcels.length, "lot", "lots"), label: "Lots in this plat" },
    unresolvableCount > 0
      ? { value: String(unresolvableCount), label: "Without a street address on record" }
      : null,
  ].filter((s): s is { value: string; label: string } => s !== null);

  return (
    <div className="space-y-10">
      <StatGrid columns={2} stats={statItems} />

      {parcels.length > 0 && (
        <HighlightReel
          scope="subdivision"
          scopeId={subdivisionId}
          groups={SUBDIVISION_HIGHLIGHTS}
          limit={5}
        />
      )}

      {parcels.length > 0 && (
        <div>
          <p className="section-heading">All lots in this subdivision</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {parcels.map((p) => {
              if (!p.address) {
                return <UnresolvableEntityCard key={p.pin} pin={p.pin} />;
              }
              return (
                <EntityCard
                  key={p.pin}
                  href={`/properties/${encodeURIComponent(p.pin)}`}
                  title={formatAddress(p.address)}
                  meta={p.year_built ? `Built ${p.year_built}` : undefined}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
