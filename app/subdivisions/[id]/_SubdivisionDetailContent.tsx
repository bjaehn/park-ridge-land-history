"use client";

import { useState, useEffect, Fragment } from "react";
import Link from "next/link";
import { StatGrid } from "@/components/ui/StatGrid";
import { ConstructionByDecadeChart } from "@/components/ui/ConstructionByDecadeChart";
import { EntityCard, UnresolvableEntityCard } from "@/components/ui/EntityCard";
import type { MetaItem } from "@/components/ui/EntityCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { HighlightReel } from "@/components/ui/HighlightReel";
import { InlineSourceNote } from "@/components/ui/SourceNote";
import { MarketHistoryChart } from "@/components/ui/MarketHistoryChart";
import {
  YearBuiltIcon,
  SizeIcon,
  SaleIcon,
  PermitIcon,
  SourceIcon,
  ExternalLinkIcon,
  NeighborhoodIcon,
  WarningIcon,
} from "@/lib/icons";
import {
  formatCount,
  formatAddress,
  formatNumber,
  formatCurrency,
} from "@/lib/formatters";
import { getEraColor } from "@/lib/mapConfig";
import {
  fetchSubdivisionParcels,
  fetchSubdivisionAssessmentStats,
  fetchSubdivisionMarketHistory,
  fetchSubdivisionGisLots,
  fetchParcelsForPins,
  fetchNeighborhoodsForSubdivision,
  filterOutDeedVerifiedElsewhere,
} from "@/lib/supabase/subdivisionQueries";
import { fetchBlockSalesStats } from "@/lib/supabase/blockQueries";
import type {
  GisLotRow,
  SubdivisionParcelRow,
  SubdivisionNeighborhoodLink,
} from "@/lib/supabase/subdivisionQueries";
import type { HighlightGroup } from "@/components/ui/HighlightReel";
import type { DecadeRow } from "@/components/ui/ConstructionByDecadeChart";
import type { BlockSalesStats, BlockAssessmentStats } from "@/lib/supabase/blockQueries";
import type { MarketHistoryRow } from "@/lib/supabase/cityQueries";
import type { SubdivisionSource } from "@/lib/subdivisionTypes";

const SUBDIVISION_HIGHLIGHTS: readonly HighlightGroup[] = [
  { heading: "Oldest surviving lots", category: "oldest" },
  { heading: "Most renovated", category: "most_active" },
  { heading: "Most recently sold", category: "most_recent_sale" },
  { heading: "Largest homes in this subdivision", category: "largest" },
];

type Props = {
  subdivisionId: string;
  recordedYear?: number | null;
  entityType?: string | null;
  geometryStatus?: string | null;
  parentSubdivision?: { id: string; name: string; entity_type: string | null } | null;
  mapSlot?: React.ReactNode;
  sources?: SubdivisionSource[];
};

export function SubdivisionDetailContent({
  subdivisionId,
  recordedYear,
  entityType,
  geometryStatus,
  parentSubdivision,
  mapSlot,
  sources = [],
}: Props) {
  const [parcels, setParcels] = useState<SubdivisionParcelRow[]>([]);
  const [gisLots, setGisLots] = useState<GisLotRow[]>([]);
  const [salesStats, setSalesStats] = useState<BlockSalesStats | null>(null);
  const [assessmentStats, setAssessmentStats] =
    useState<BlockAssessmentStats | null>(null);
  const [marketHistory, setMarketHistory] = useState<MarketHistoryRow[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<SubdivisionNeighborhoodLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchSubdivisionParcels(subdivisionId),
      fetchSubdivisionGisLots(subdivisionId),
      fetchNeighborhoodsForSubdivision(subdivisionId),
    ])
      .then(async ([deedRows, lotRows, neighborhoodRows]) => {
        setGisLots(lotRows);
        setNeighborhoods(neighborhoodRows);

        const deedPinSet = new Set(deedRows.map((p) => p.pin).filter(Boolean));
        const candidateLots = lotRows.filter(
          (l) => l.pin_normalized && !deedPinSet.has(l.pin_normalized)
        );
        const candidatePins = candidateLots.map((l) => l.pin_normalized!);
        const allowedPins = new Set(
          await filterOutDeedVerifiedElsewhere(candidatePins, subdivisionId)
        );
        const gisOnlyLots = candidateLots.filter((l) => allowedPins.has(l.pin_normalized!));
        const gisOnlyPins = gisOnlyLots.map((l) => l.pin_normalized!);
        const allPins = [...deedPinSet, ...gisOnlyPins].filter(Boolean);

        const gisParcels = gisOnlyPins.length
          ? await fetchParcelsForPins(gisOnlyPins)
          : [];

        const gisParcelMap = new Map(gisParcels.map((p) => [p.pin, p]));
        const mergedExtra: SubdivisionParcelRow[] = gisOnlyLots.map((lot) => ({
          ...(gisParcelMap.get(lot.pin_normalized!) ?? {
            pin: lot.pin_normalized!,
            address: null,
            year_built: null,
            building_sqft: null,
            sale_count: null,
            permit_count: null,
          }),
          pin: lot.pin_normalized!,
          lot_number: lot.lot_number,
          block_number: lot.block_number,
        }));

        setParcels([...deedRows, ...mergedExtra]);

        if (!allPins.length) return;
        const [sales, assessment, history] = await Promise.all([
          fetchBlockSalesStats(allPins),
          fetchSubdivisionAssessmentStats(allPins),
          fetchSubdivisionMarketHistory(allPins),
        ]);
        setSalesStats(sales);
        setAssessmentStats(assessment);
        setMarketHistory(history);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [subdivisionId]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse" aria-busy="true" aria-label="Loading subdivision data">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-surface-card border border-surface-border rounded-lg" />
        ))}
      </div>
    );
  }
  if (error) return <EmptyState heading="Unable to load subdivision data" body="Try refreshing the page." />;

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

  const lotCountForStat = gisLots.length > 0 ? gisLots.length : parcels.length;
  const addressedCount = parcels.filter((p) => p.address).length;
  const unresolvableCount = parcels.length - addressedCount;
  const teardownCount = parcels.filter((p) => p.is_teardown_rebuild).length;

  const statItems = [
    lotCountForStat > 0
      ? { value: formatCount(lotCountForStat, "lot", "lots"), label: "Lots in this plat" }
      : null,
    earliestBuilt
      ? { value: String(earliestBuilt), label: "First home built" }
      : null,
    latestBuilt && latestBuilt !== earliestBuilt
      ? { value: String(latestBuilt), label: "Most recently built" }
      : null,
    unresolvableCount > 0
      ? { value: String(unresolvableCount), label: "Without address on record" }
      : null,
  ].filter((s): s is { value: string; label: string } => s !== null);

  const columns = (Math.max(2, Math.min(statItems.length, 4))) as 2 | 3 | 4;

  const isEstateOrParent =
    entityType === "estate" || entityType === "parent_plat";

  const qualityWarnings: string[] = [];
  if (!recordedYear)
    qualityWarnings.push(
      "Plat recording date not yet verified. A source document has not been confirmed."
    );
  if (geometryStatus === "not_started" || geometryStatus === "needs_source")
    qualityWarnings.push(
      "Boundary map not yet available. The boundary shown here is based on matched parcel locations."
    );

  return (
    <div className="space-y-10">
      {/* ---- Parent subdivision context ---- */}
      {parentSubdivision && (
        <div className="flex items-center gap-2 text-sm -mt-4">
          <span className="text-text-muted text-xs uppercase tracking-wider shrink-0">
            {parentSubdivision.entity_type === "estate" ? "Estate" : "Parent plat"}
          </span>
          <span className="text-text-muted" aria-hidden="true">-</span>
          <Link
            href={`/subdivisions/${encodeURIComponent(parentSubdivision.id)}`}
            className="text-accent-purple hover:underline text-sm"
          >
            {parentSubdivision.name}
          </Link>
          <p className="text-sm text-text-secondary ml-2">
            This subdivision was carved from the {parentSubdivision.name} plat.
          </p>
        </div>
      )}

      {/* ---- Estate / parent plat context note ---- */}
      {entityType === "estate" && (
        <div className="bg-surface-raised border border-surface-border rounded-lg p-4 text-sm text-text-secondary -mt-4">
          This land was originally part of a private estate before being subdivided for residential
          use. It appears in deed records as the parent tract of one or more recorded plats.
        </div>
      )}
      {entityType === "parent_plat" && parcels.length === 0 && (
        <div className="bg-surface-raised border border-surface-border rounded-lg p-4 text-sm text-text-secondary -mt-4">
          This is a historical parent plat, not a directly recorded residential subdivision. It
          appears in deed descriptions as the source tract for one or more child plats.
        </div>
      )}

      {/* ---- Quality warnings ---- */}
      {qualityWarnings.length > 0 && (
        <div className="space-y-2 -mt-4">
          {qualityWarnings.map((w) => (
            <div
              key={w}
              className="flex items-start gap-2 text-xs text-text-muted rounded-lg border border-surface-border bg-surface-raised px-3 py-2"
            >
              <WarningIcon size={12} className="mt-0.5 shrink-0 text-amber-500" aria-hidden="true" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* ---- 1. Stat grid ---- */}
      {statItems.length > 0 && <StatGrid columns={columns} stats={statItems} />}

      {/* ---- 2. Map ---- */}
      {mapSlot && (
        <div>
          <h2 className="section-heading">Subdivision map</h2>
          <p className="text-sm text-text-muted mb-3">
            {geometryStatus === "complete"
              ? "Boundary sourced from official GIS records."
              : "Parcels shown are matched to this subdivision from deed research and GIS data. The boundary outline is approximate."}
          </p>
          {mapSlot}
        </div>
      )}

      {!mapSlot && (
        <div className="bg-surface-raised border border-surface-border rounded-lg p-6 text-center">
          <p className="text-sm text-text-muted">
            No verified boundary is available for this subdivision yet.
          </p>
          <p className="text-xs text-text-muted mt-1">
            Boundary mapping is in progress for this record.
          </p>
        </div>
      )}

      {/* ---- Development timing note ---- */}
      {yearsAfterPlat !== null && (
        <div className="bg-surface-card border border-surface-border rounded-lg p-4 flex items-start gap-3">
          <YearBuiltIcon
            size={16}
            strokeWidth={1.8}
            className="text-text-muted shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <p className="text-sm text-text-secondary leading-relaxed">
            This plat was recorded in {recordedYear}. The first known home was not built until{" "}
            {earliestBuilt},{" "}
            {yearsAfterPlat === 1 ? "1 year" : `${yearsAfterPlat} years`} later. Available
            records suggest development stalled, possibly due to economic conditions or
            infrastructure delays.
          </p>
        </div>
      )}

      {/* ---- 3. Sales activity ---- */}
      {salesStats && salesStats.totalSales > 0 && (
        <section>
          <h2 className="section-heading">Sales activity</h2>
          <p className="text-xs text-text-muted mb-3">
            Recorded market sales for matched properties in this subdivision.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-surface-card border border-surface-border rounded-lg p-4">
              <p className="text-2xl font-semibold text-text-primary tabular-nums">
                {formatNumber(salesStats.totalSales)}
              </p>
              <p className="text-sm text-text-muted mt-1">Market sales on record</p>
            </div>
            {salesStats.medianPrice != null && (
              <div className="bg-surface-card border border-surface-border rounded-lg p-4">
                <p className="text-2xl font-semibold text-text-primary tabular-nums">
                  {formatCurrency(salesStats.medianPrice)}
                </p>
                <p className="text-sm text-text-muted mt-1">Median sale price</p>
              </div>
            )}
            {salesStats.mostRecentYear != null && (
              <div className="bg-surface-card border border-surface-border rounded-lg p-4">
                <p className="text-2xl font-semibold text-text-primary tabular-nums">
                  {salesStats.mostRecentYear}
                </p>
                <p className="text-sm text-text-muted mt-1">
                  Most recent sale
                  {salesStats.mostRecentPrice != null &&
                    ` (${formatCurrency(salesStats.mostRecentPrice)})`}
                </p>
              </div>
            )}
          </div>
          <InlineSourceNote className="mt-3">
            Cook County Recorder of Deeds. Market sales only ($50K to $5M).
          </InlineSourceNote>
        </section>
      )}

      {/* ---- 4. Assessment snapshot ---- */}
      {assessmentStats?.medianAssessedValue != null && (
        <section>
          <h2 className="section-heading">Assessment snapshot</h2>
          <div className="bg-surface-card border border-surface-border rounded-lg p-4 inline-block">
            <p className="text-2xl font-semibold text-text-primary tabular-nums">
              {formatCurrency(assessmentStats.medianAssessedValue)}
            </p>
            <p className="text-sm text-text-muted mt-1">Median assessed value</p>
          </div>
          <InlineSourceNote className="mt-3">
            Cook County Assessor certified valuations.
          </InlineSourceNote>
        </section>
      )}

      {/* ---- 5. Construction by decade chart ---- */}
      {decadeRows.length > 0 && (
        <div>
          <h2 className="section-heading">How this subdivision was built</h2>
          <p className="text-sm text-text-muted mb-4">
            {earliestBuilt === latestBuilt
              ? `Construction in this plat took place in ${earliestBuilt}, based on Assessor build-year data.`
              : `Construction in this plat began in ${earliestBuilt} and extended through ${latestBuilt}, based on Assessor build-year data.`}
          </p>
          <ConstructionByDecadeChart rows={decadeRows} />
          <InlineSourceNote className="mt-3">
            Cook County Assessor build-year data.
          </InlineSourceNote>
        </div>
      )}

      {/* ---- 6. Highlight reel ---- */}
      {parcels.length > 0 && (
        <HighlightReel
          scope="subdivision"
          scopeId={subdivisionId}
          groups={SUBDIVISION_HIGHLIGHTS}
          limit={5}
        />
      )}

      {/* ---- 7. Home sales market history ---- */}
      {marketHistory.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <SaleIcon
              size={14}
              strokeWidth={1.8}
              className="text-text-muted"
              aria-hidden="true"
            />
            <h2 className="section-heading !mb-0">Home sales in this subdivision</h2>
          </div>
          <p className="text-sm text-text-muted mb-4">
            Bars show annual sales volume. Line shows median sale price. Market sales only,
            $50K to $5M.
          </p>
          <div className="-mx-[clamp(1rem,4vw,3rem)]">
            <MarketHistoryChart data={marketHistory} />
          </div>
          <InlineSourceNote className="mt-3">
            Cook County Recorder of Deeds.
          </InlineSourceNote>
        </section>
      )}

      {/* ---- 8. Properties list (grouped by decade) ---- */}
      {parcels.length > 0
        ? (() => {
            const byDecade = new Map<string, typeof parcels>();
            [...parcels].forEach((p) => {
              const key = p.year_built
                ? `${Math.floor(p.year_built / 10) * 10}s`
                : "Unknown";
              const arr = byDecade.get(key) ?? [];
              arr.push(p);
              byDecade.set(key, arr);
            });
            const decades = Array.from(byDecade.entries()).sort(([a], [b]) => {
              if (a === "Unknown") return 1;
              if (b === "Unknown") return -1;
              return a.localeCompare(b);
            });
            return (
              <div>
                <h2 className="section-heading">Properties in this subdivision</h2>
                <p className="text-sm text-text-muted mb-4">
                  Properties are assigned based on available deed research and GIS lot matching.
                  Assignment confidence varies by record.
                </p>
                {teardownCount > 0 && (
                  <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700">
                    <span aria-hidden="true">🔥</span>
                    <span>
                      <strong>{teardownCount}</strong> of {parcels.length} lots in this
                      subdivision{" "}
                      {teardownCount === 1 ? "has" : "have"} been torn down and rebuilt since
                      1990.
                    </span>
                  </div>
                )}
                <div className="space-y-8">
                  {decades.map(([decade, group]) => {
                    const decadeYear =
                      decade === "Unknown" ? null : parseInt(decade);
                    return (
                      <div key={decade}>
                        <div className="flex items-center gap-3 mb-3">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{
                              background:
                                getEraColor(decadeYear ?? undefined) ?? "#64748b",
                            }}
                            aria-hidden="true"
                          />
                          <span className="text-sm font-semibold text-text-secondary tracking-wide">
                            {decade === "Unknown" ? "Unknown era" : decade}
                          </span>
                          <div className="flex-1 border-t border-surface-border" />
                          <span className="text-xs text-text-muted">{group.length}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {group.map((p) => {
                            const lotLabel =
                              p.lot_number && p.block_number
                                ? `Lot ${p.lot_number}, Block ${p.block_number}`
                                : p.lot_number
                                ? `Lot ${p.lot_number}`
                                : undefined;
                            const multiLotSuffix =
                              p.lot_count && p.lot_count > 1
                                ? ` (+${p.lot_count - 1} more lot${p.lot_count > 2 ? "s" : ""})`
                                : "";
                            if (!p.address) {
                              return (
                                <UnresolvableEntityCard key={p.pin} pin={p.pin} />
                              );
                            }
                            return (
                              <EntityCard
                                key={p.pin}
                                href={`/properties/${encodeURIComponent(p.pin)}`}
                                title={formatAddress(p.address)}
                                meta={
                                  lotLabel
                                    ? `${lotLabel}${multiLotSuffix}`
                                    : undefined
                                }
                                metaItems={[
                                  p.year_built
                                    ? {
                                        icon: <YearBuiltIcon size={11} />,
                                        value: String(p.year_built),
                                      }
                                    : null,
                                  p.building_sqft
                                    ? {
                                        icon: <SizeIcon size={11} />,
                                        value: `${formatNumber(p.building_sqft)} sqft`,
                                      }
                                    : null,
                                  p.sale_count
                                    ? {
                                        icon: <SaleIcon size={11} />,
                                        value: `${p.sale_count} sales`,
                                      }
                                    : null,
                                  p.permit_count
                                    ? {
                                        icon: <PermitIcon size={11} />,
                                        value: `${p.permit_count} permits`,
                                      }
                                    : null,
                                ].filter((x): x is MetaItem => x !== null)}
                                eraSwatch={getEraColor(p.year_built)}
                                isTeardownRebuild={p.is_teardown_rebuild}
                                teardownConfidence={p.teardown_confidence}
                                hasDeedNotes={p.has_deed_research}
                              />
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <InlineSourceNote className="mt-3">
                  GIS-matched parcels and deed-verified lot records. Lot and block numbers from
                  Cook County GIS Lots layer or deed research.
                </InlineSourceNote>
              </div>
            );
          })()
        : !isEstateOrParent && (
            <EmptyState
              heading="No properties found"
              body="Properties for this subdivision have not yet been matched. Deed research or GIS matching is still in progress."
            />
          )}

      {/* ---- 9. GIS plat lots ---- */}
      {gisLots.length > 0 &&
        (() => {
          const matched = gisLots.filter((l) => l.pin_normalized);
          const highConf = matched.filter(
            (l) => l.match_confidence === "high"
          ).length;

          const blockMap = new Map<string, GisLotRow[]>();
          for (const lot of gisLots) {
            const key = lot.block_number ?? "Unknown";
            if (!blockMap.has(key)) blockMap.set(key, []);
            blockMap.get(key)!.push(lot);
          }
          const sortedBlocks = [...blockMap.keys()].sort((a, b) => {
            if (a === "Unknown") return 1;
            if (b === "Unknown") return -1;
            const na = parseInt(a, 10),
              nb = parseInt(b, 10);
            if (!isNaN(na) && !isNaN(nb)) return na - nb;
            return a.localeCompare(b);
          });

          return (
            <section>
              <h2 className="section-heading">GIS plat lots</h2>
              <p className="text-sm text-text-muted mb-4">
                Original plat lot-by-lot index from the Cook County GIS Lots layer, spatially
                matched to current parcel boundaries using PostGIS.
              </p>
              <div className="flex flex-wrap gap-4 mb-4">
                <div className="bg-surface-card border border-surface-border rounded-lg px-4 py-3">
                  <p className="text-xl font-semibold text-text-primary tabular-nums">
                    {gisLots.length}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    Lots in GIS layer
                  </p>
                </div>
                <div className="bg-surface-card border border-surface-border rounded-lg px-4 py-3">
                  <p className="text-xl font-semibold text-text-primary tabular-nums">
                    {matched.length}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    Matched to current parcels
                  </p>
                </div>
                {highConf > 0 && (
                  <div className="bg-surface-card border border-surface-border rounded-lg px-4 py-3">
                    <p className="text-xl font-semibold text-text-primary tabular-nums">
                      {highConf}
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">
                      High-confidence matches
                    </p>
                  </div>
                )}
              </div>
              <div className="overflow-x-auto rounded-lg border border-surface-border">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-surface-border bg-surface-raised">
                      <th className="px-3 py-2 font-semibold text-text-muted uppercase tracking-wider">
                        Lot
                      </th>
                      <th className="px-3 py-2 font-semibold text-text-muted uppercase tracking-wider">
                        Current PIN
                      </th>
                      <th className="px-3 py-2 font-semibold text-text-muted uppercase tracking-wider">
                        Match
                      </th>
                      <th className="px-3 py-2 font-semibold text-text-muted uppercase tracking-wider text-right">
                        Overlap
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedBlocks.map((blockKey) => {
                      const lots = blockMap.get(blockKey)!;
                      return (
                        <Fragment key={blockKey}>
                          <tr className="bg-surface-raised/60 border-y border-surface-border">
                            <td colSpan={4} className="px-3 py-1.5">
                              <span className="font-semibold text-text-secondary text-[11px] uppercase tracking-wider">
                                {blockKey === "Unknown"
                                  ? "Unknown block"
                                  : `Block ${blockKey}`}
                              </span>
                              <span className="ml-2 text-text-muted">
                                {lots.length} lots
                              </span>
                            </td>
                          </tr>
                          {lots.map((lot) => (
                            <tr
                              key={lot.id}
                              className="border-b border-surface-border/40 hover:bg-surface-raised/50 transition-colors"
                            >
                              <td className="px-3 py-2 text-text-secondary">
                                {lot.lot_number ?? "-"}
                              </td>
                              <td className="px-3 py-2">
                                {lot.pin_normalized ? (
                                  <Link
                                    href={`/properties/${encodeURIComponent(lot.pin_normalized)}`}
                                    className="font-mono text-accent-purple hover:underline"
                                  >
                                    {lot.pin_normalized}
                                  </Link>
                                ) : (
                                  <span className="text-text-muted italic">
                                    No match
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {lot.match_confidence ? (
                                  <span
                                    className={[
                                      "px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider",
                                      lot.match_confidence === "high"
                                        ? "bg-emerald-900/30 text-emerald-400"
                                        : lot.match_confidence === "medium"
                                        ? "bg-amber-900/30 text-amber-400"
                                        : "bg-surface-raised text-text-muted",
                                    ].join(" ")}
                                  >
                                    {lot.match_confidence}
                                  </span>
                                ) : (
                                  <span className="text-text-muted">-</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-right text-text-muted tabular-nums">
                                {lot.overlap_pct_of_parcel != null
                                  ? `${lot.overlap_pct_of_parcel}%`
                                  : "-"}
                              </td>
                            </tr>
                          ))}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <InlineSourceNote className="mt-2">
                Cook County GIS Lots layer (2025). Spatially matched using PostGIS.
              </InlineSourceNote>
            </section>
          );
        })()}

      {/* ---- 10. Related neighborhoods ---- */}
      {neighborhoods.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <NeighborhoodIcon
              size={14}
              strokeWidth={1.8}
              className="text-text-muted"
              aria-hidden="true"
            />
            <h2 className="section-heading !mb-0">Related neighborhoods</h2>
          </div>
          <p className="text-sm text-text-muted mb-4">
            Neighborhoods that overlap or contain part of this subdivision. Subdivision and
            neighborhood boundaries are distinct administrative units. These relationships are
            based on available spatial and administrative records and may be approximate.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {neighborhoods.map((n) => (
              <EntityCard
                key={n.linkId}
                href={
                  n.neighborhoodSlug
                    ? `/neighborhoods/${n.neighborhoodSlug}`
                    : undefined
                }
                title={n.neighborhoodName}
                meta={
                  n.relationshipType
                    ? `Relationship: ${n.relationshipType}`
                    : undefined
                }
              />
            ))}
          </div>
        </section>
      )}

      {/* ---- 11. Sources and confidence panel ---- */}
      {sources.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <SourceIcon
              size={14}
              strokeWidth={1.8}
              className="text-text-muted"
              aria-hidden="true"
            />
            <h2 className="section-heading !mb-0">Sources and confidence</h2>
          </div>
          <p className="text-sm text-text-muted mb-4">
            The following sources support this subdivision record. Source reliability varies.
            Records listed as research leads or secondary sources have not been independently
            verified against a recorded plat.
          </p>
          <div className="space-y-2">
            {sources.map((source) => (
              <div
                key={source.id}
                className="bg-surface-card border border-surface-border rounded-lg p-3 flex items-start gap-3"
              >
                <SourceIcon
                  size={14}
                  className="text-text-muted mt-0.5 shrink-0"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary">
                    {source.source_name}
                  </p>
                  {source.source_reference && (
                    <p className="text-xs text-text-muted mt-0.5">
                      {source.source_reference}
                    </p>
                  )}
                  {source.source_type && (
                    <p className="text-xs text-text-muted capitalize">
                      {source.source_type.replace(/_/g, " ")}
                    </p>
                  )}
                  {source.notes && (
                    <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                      {source.notes}
                    </p>
                  )}
                </div>
                {source.source_url && (
                  <a
                    href={source.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-text-link hover:underline ml-auto shrink-0"
                    aria-label={`Open source: ${source.source_name}`}
                  >
                    <ExternalLinkIcon size={14} aria-hidden="true" />
                  </a>
                )}
              </div>
            ))}
          </div>
          <InlineSourceNote className="mt-3">
            Sources are listed as provided. Record completeness varies by subdivision.
          </InlineSourceNote>
        </section>
      )}
    </div>
  );
}
