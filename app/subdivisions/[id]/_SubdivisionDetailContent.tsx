"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { StatGrid } from "@/components/ui/StatGrid";
import { ConstructionByDecadeChart } from "@/components/ui/ConstructionByDecadeChart";
import { EntityCard, UnresolvableEntityCard } from "@/components/ui/EntityCard";
import { LoadingSkeleton } from "@/components/ui/EmptyState";
import { HighlightReel } from "@/components/ui/HighlightReel";
import { InlineSourceNote } from "@/components/ui/SourceNote";
import { SubdivisionLineageCard } from "@/components/ui/SubdivisionLineageCard";
import { YearBuiltIcon } from "@/lib/icons";
import { formatCount, formatAddress } from "@/lib/formatters";
import { getEraColor } from "@/lib/mapConfig";
import { fetchSubdivisionLineage, fetchSubdivisionParcels } from "@/lib/supabase/subdivisionQueries";
import type { HighlightGroup } from "@/components/ui/HighlightReel";
import type { DecadeRow } from "@/components/ui/ConstructionByDecadeChart";
import type { HistoricalSubdivisionLineage } from "@/lib/subdivisionTypes";

const SUBDIVISION_HIGHLIGHTS: readonly HighlightGroup[] = [
  { heading: "Oldest surviving lots", category: "oldest" },
  { heading: "Most renovated", category: "most_active" },
  { heading: "Most recently sold", category: "most_recent_sale" },
];

type Props = {
  subdivisionId: string;
  recordedYear?: number | null;
  entityType?: string | null;
  geometryStatus?: string | null;
  parentSubdivision?: { id: string; name: string; entity_type: string | null } | null;
  mapSlot?: React.ReactNode;
};

export function SubdivisionDetailContent({ subdivisionId, recordedYear, entityType, geometryStatus, parentSubdivision, mapSlot }: Props) {
  const [parcels, setParcels] = useState<Awaited<ReturnType<typeof fetchSubdivisionParcels>>>([]);
  const [lineage, setLineage] = useState<HistoricalSubdivisionLineage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchSubdivisionParcels(subdivisionId),
      fetchSubdivisionLineage(subdivisionId),
    ])
      .then(([parcelRows, lineageRows]) => {
        setParcels(parcelRows);
        setLineage(lineageRows);
      })
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

  const isEstateOrParent = entityType === "estate" || entityType === "parent_plat";
  const entityLabel =
    entityType === "estate" ? "Estate"
    : entityType === "parent_plat" ? "Parent plat"
    : entityType === "plat" ? "Plat"
    : null;

  // Quality warnings for the header area
  const qualityWarnings: string[] = [];
  if (!recordedYear) qualityWarnings.push("Plat recording date not yet verified - needs source document.");
  if (geometryStatus === "not_started" || geometryStatus === "needs_source")
    qualityWarnings.push("Subdivision boundary not yet mapped.");

  return (
    <div className="space-y-10">
      {/* Parent subdivision / estate link */}
      {parentSubdivision && (
        <div className="flex items-center gap-2 text-sm text-text-secondary -mt-4">
          <span className="text-text-muted text-xs uppercase tracking-wider">
            {parentSubdivision.entity_type === "estate" ? "Estate" : "Parent plat"}
          </span>
          <span className="text-text-muted">·</span>
          <Link
            href={`/subdivisions/${encodeURIComponent(parentSubdivision.id)}`}
            className="text-accent-purple hover:underline text-sm"
          >
            {parentSubdivision.name}
          </Link>
        </div>
      )}

      {/* Entity type badge */}
      {entityLabel && (
        <div className="-mt-6">
          <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-full border border-surface-border text-text-muted">
            {entityLabel}
          </span>
        </div>
      )}

      {/* Quality warnings */}
      {qualityWarnings.length > 0 && (
        <div className="space-y-1 -mt-4">
          {qualityWarnings.map((w) => (
            <p key={w} className="text-xs text-text-muted italic">{w}</p>
          ))}
        </div>
      )}

      {/* Show a note for estates/parent plats that have no direct parcels */}
      {isEstateOrParent && parcels.length === 0 && (
        <div className="bg-surface-raised border border-surface-border rounded-lg p-4 text-sm text-text-secondary">
          This is a historical land entity (estate or parent plat), not a directly recorded subdivision.
          It appears in deed descriptions as a parent of other subdivisions.
        </div>
      )}

      {lineage.length > 0 && (
        <section>
          <p className="section-heading">Subdivision ancestry</p>
          <div className="space-y-3">
            {lineage.map((record) => (
              <SubdivisionLineageCard
                key={record.lineage_key}
                lineage={record}
                showAddress={Boolean(record.address)}
              />
            ))}
          </div>
        </section>
      )}

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

      {mapSlot && (
        <div>
          <p className="section-heading">Subdivision map</p>
          {mapSlot}
        </div>
      )}

      {parcels.length > 0 && (
        <div>
          <p className="section-heading">Known properties in this subdivision</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {parcels.map((p) => {
              const lotLabel =
                p.lot_number && p.block_number
                  ? `Lot ${p.lot_number}, Block ${p.block_number}`
                  : p.lot_number
                  ? `Lot ${p.lot_number}`
                  : undefined;
              const multiLotSuffix = p.lot_count && p.lot_count > 1
                ? ` (+${p.lot_count - 1} more lot${p.lot_count > 2 ? "s" : ""})`
                : "";
              if (!p.address) {
                return <UnresolvableEntityCard key={p.pin} pin={p.pin} />;
              }
              return (
                <EntityCard
                  key={p.pin}
                  href={`/properties/${encodeURIComponent(p.pin)}`}
                  title={formatAddress(p.address)}
                  meta={[
                    lotLabel ? `${lotLabel}${multiLotSuffix}` : undefined,
                    p.year_built ? `Built ${p.year_built}` : undefined,
                  ].filter(Boolean).join(" · ") || undefined}
                  eraSwatch={getEraColor(p.year_built)}
                />
              );
            })}
          </div>
          <InlineSourceNote className="mt-3">
            Sourced from deed / legal descriptions. This list represents the current research sample and is not exhaustive.
          </InlineSourceNote>
        </div>
      )}
    </div>
  );
}
