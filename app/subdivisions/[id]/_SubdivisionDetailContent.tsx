"use client";

import { useState, useEffect } from "react";
import { StatGrid } from "@/components/ui/StatGrid";
import { ConstructionByDecadeChart } from "@/components/ui/ConstructionByDecadeChart";
import { EntityCard, UnresolvableEntityCard } from "@/components/ui/EntityCard";
import { LoadingSkeleton } from "@/components/ui/EmptyState";
import { HighlightReel } from "@/components/ui/HighlightReel";
import { YearBuiltIcon } from "@/lib/icons";
import { formatCount, formatAddress } from "@/lib/formatters";
import { fetchSubdivisionParcels } from "@/lib/supabase/subdivisionQueries";
import type { HighlightGroup } from "@/components/ui/HighlightReel";
import type { DecadeRow } from "@/components/ui/ConstructionByDecadeChart";

const SUBDIVISION_HIGHLIGHTS: readonly HighlightGroup[] = [
  { heading: "Oldest surviving lots", category: "oldest" },
  { heading: "Most renovated", category: "most_active" },
  { heading: "Most recently sold", category: "most_recent_sale" },
];

type Props = { subdivisionId: string; recordedYear?: number | null };

export function SubdivisionDetailContent({ subdivisionId, recordedYear }: Props) {
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

  // Build decade distribution from parcel year_built
  const yearsKnown = parcels
    .map((p) => p.year_built)
    .filter((y): y is number => y != null);
  const decadeMap = new Map<number, number>();
  yearsKnown.forEach((yr) => {
    const d = Math.floor(yr / 10) * 10;
    decadeMap.set(d, (decadeMap.get(d) ?? 0) + 1);
  });
  const decadeRows: DecadeRow[] = Array.from(decadeMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([decade, count]) => ({ decade: String(decade), count }));

  const earliestBuilt = yearsKnown.length ? Math.min(...yearsKnown) : null;
  const latestBuilt = yearsKnown.length ? Math.max(...yearsKnown) : null;
  const yearsAfterPlat =
    recordedYear && earliestBuilt && earliestBuilt > recordedYear
      ? earliestBuilt - recordedYear
      : null;

  const statItems = [
    { value: formatCount(parcels.length, "lot", "lots"), label: "Lots in this plat" },
    earliestBuilt ? { value: String(earliestBuilt), label: "First home built" } : null,
    latestBuilt && latestBuilt !== earliestBuilt
      ? { value: String(latestBuilt), label: "Most recently built" }
      : null,
    unresolvableCount > 0
      ? { value: String(unresolvableCount), label: "Without address on record" }
      : null,
  ].filter((s): s is { value: string; label: string } => s !== null);

  const columns = (Math.max(2, Math.min(statItems.length, 4))) as 2 | 3 | 4;

  return (
    <div className="space-y-10">
      <StatGrid columns={columns} stats={statItems} />

      {yearsAfterPlat !== null && (
        <div className="bg-surface-card border border-surface-border rounded-lg p-4 flex items-start gap-3">
          <YearBuiltIcon
            size={16}
            strokeWidth={1.8}
            className="text-text-muted shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <p className="text-sm text-text-secondary leading-relaxed">
            This plat was recorded in {recordedYear}. The first known home
            wasn&apos;t built until {earliestBuilt},{" "}
            {yearsAfterPlat === 1 ? "1 year" : `${yearsAfterPlat} years`} later.
          </p>
        </div>
      )}

      {parcels.length > 0 && (
        <HighlightReel
          scope="subdivision"
          scopeId={subdivisionId}
          groups={SUBDIVISION_HIGHLIGHTS}
          limit={5}
        />
      )}

      {decadeRows.length > 0 && (
        <div>
          <p className="section-heading">When this subdivision was built out</p>
          <ConstructionByDecadeChart rows={decadeRows} />
        </div>
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
