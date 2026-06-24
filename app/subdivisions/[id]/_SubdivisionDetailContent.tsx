"use client";

import { useState, useEffect, Fragment } from "react";
import Link from "next/link";
import { StatGrid } from "@/components/ui/StatGrid";
import { ConstructionByDecadeChart } from "@/components/ui/ConstructionByDecadeChart";
import { EntityCard, UnresolvableEntityCard } from "@/components/ui/EntityCard";
import type { MetaItem } from "@/components/ui/EntityCard";
import { LoadingSkeleton } from "@/components/ui/EmptyState";
import { HighlightReel } from "@/components/ui/HighlightReel";
import { InlineSourceNote } from "@/components/ui/SourceNote";
import { MarketHistoryChart } from "@/components/ui/MarketHistoryChart";
import { YearBuiltIcon, SizeIcon, SaleIcon, PermitIcon } from "@/lib/icons";
import { formatCount, formatAddress, formatNumber, formatCurrency } from "@/lib/formatters";
import { getEraColor } from "@/lib/mapConfig";
import {
  fetchSubdivisionParcels,
  fetchSubdivisionAssessmentStats,
  fetchSubdivisionMarketHistory,
  fetchSubdivisionGisLots,
} from "@/lib/supabase/subdivisionQueries";
import { fetchBlockSalesStats } from "@/lib/supabase/blockQueries";
import type { GisLotRow } from "@/lib/supabase/subdivisionQueries";
import type { HighlightGroup } from "@/components/ui/HighlightReel";
import type { DecadeRow } from "@/components/ui/ConstructionByDecadeChart";
import type { BlockSalesStats, BlockAssessmentStats } from "@/lib/supabase/blockQueries";
import type { MarketHistoryRow } from "@/lib/supabase/cityQueries";

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
  const [gisLots, setGisLots] = useState<GisLotRow[]>([]);
  const [salesStats, setSalesStats] = useState<BlockSalesStats | null>(null);
  const [assessmentStats, setAssessmentStats] = useState<BlockAssessmentStats | null>(null);
  const [marketHistory, setMarketHistory] = useState<MarketHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchSubdivisionParcels(subdivisionId),
      fetchSubdivisionGisLots(subdivisionId),
    ])
      .then(([parcelRows, lotRows]) => {
        setParcels(parcelRows);
        setGisLots(lotRows);
        const pins = parcelRows.map((p) => p.pin).filter(Boolean);
        if (!pins.length) return;
        return Promise.all([
          fetchBlockSalesStats(pins),
          fetchSubdivisionAssessmentStats(pins),
          fetchSubdivisionMarketHistory(pins),
        ]).then(([sales, assessment, history]) => {
          setSalesStats(sales);
          setAssessmentStats(assessment);
          setMarketHistory(history);
        });
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
    qualityWarnings.push("Boundary map coming soon.");

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
      {parentSubdivision && (
        <p className="text-sm text-text-secondary">This subdivision was carved from the {parentSubdivision.name} plat.</p>
      )}

      {/* Entity type badge */}
      {entityLabel && (
        <div className="-mt-6">
          <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-full border border-surface-border text-text-muted">
            {entityLabel}
          </span>
        </div>
      )}
      {entityType === "estate" && (
        <p className="text-sm text-text-secondary">This land was originally part of a private estate before being subdivided for residential use.</p>
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

      {/* GIS lot table — from Cook County GIS Lots layer (only for subdivisions
          whose PAGE_SUBREF has been resolved to a named subdivision_id) */}
      {gisLots.length > 0 && (() => {
        const matched = gisLots.filter((l) => l.pin_normalized);
        const highConf = matched.filter((l) => l.match_confidence === "high").length;

        // Group by block
        const blockMap = new Map<string, GisLotRow[]>();
        for (const lot of gisLots) {
          const key = lot.block_number ?? "Unknown";
          if (!blockMap.has(key)) blockMap.set(key, []);
          blockMap.get(key)!.push(lot);
        }
        const sortedBlocks = [...blockMap.keys()].sort((a, b) => {
          if (a === "Unknown") return 1;
          if (b === "Unknown") return -1;
          const na = parseInt(a, 10), nb = parseInt(b, 10);
          if (!isNaN(na) && !isNaN(nb)) return na - nb;
          return a.localeCompare(b);
        });

        return (
          <section>
            <h2 className="section-heading">GIS plat lots</h2>
            <div className="flex flex-wrap gap-4 mb-4">
              <div className="bg-surface-card border border-surface-border rounded-lg px-4 py-3">
                <p className="text-xl font-semibold text-text-primary tabular-nums">{gisLots.length}</p>
                <p className="text-xs text-text-muted mt-0.5">Lots in GIS layer</p>
              </div>
              <div className="bg-surface-card border border-surface-border rounded-lg px-4 py-3">
                <p className="text-xl font-semibold text-text-primary tabular-nums">{matched.length}</p>
                <p className="text-xs text-text-muted mt-0.5">Matched to current parcels</p>
              </div>
              {highConf > 0 && (
                <div className="bg-surface-card border border-surface-border rounded-lg px-4 py-3">
                  <p className="text-xl font-semibold text-text-primary tabular-nums">{highConf}</p>
                  <p className="text-xs text-text-muted mt-0.5">High-confidence matches</p>
                </div>
              )}
            </div>
            <div className="overflow-x-auto rounded-lg border border-surface-border">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-surface-border bg-surface-raised">
                    <th className="px-3 py-2 font-semibold text-text-muted uppercase tracking-wider">Lot</th>
                    <th className="px-3 py-2 font-semibold text-text-muted uppercase tracking-wider">Current PIN</th>
                    <th className="px-3 py-2 font-semibold text-text-muted uppercase tracking-wider">Match</th>
                    <th className="px-3 py-2 font-semibold text-text-muted uppercase tracking-wider text-right">Overlap</th>
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
                              {blockKey === "Unknown" ? "Unknown block" : `Block ${blockKey}`}
                            </span>
                            <span className="ml-2 text-text-muted">{lots.length} lots</span>
                          </td>
                        </tr>
                        {lots.map((lot) => (
                          <tr key={lot.id} className="border-b border-surface-border/40 hover:bg-surface-raised/50 transition-colors">
                            <td className="px-3 py-2 text-text-secondary">{lot.lot_number ?? "—"}</td>
                            <td className="px-3 py-2">
                              {lot.pin_normalized ? (
                                <Link
                                  href={`/properties/${encodeURIComponent(lot.pin_normalized)}`}
                                  className="font-mono text-accent-purple hover:underline"
                                >
                                  {lot.pin_normalized}
                                </Link>
                              ) : (
                                <span className="text-text-muted italic">No match</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {lot.match_confidence ? (
                                <span className={[
                                  "px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider",
                                  lot.match_confidence === "high"   ? "bg-emerald-900/30 text-emerald-400" :
                                  lot.match_confidence === "medium" ? "bg-amber-900/30 text-amber-400" :
                                  "bg-surface-raised text-text-muted",
                                ].join(" ")}>
                                  {lot.match_confidence}
                                </span>
                              ) : (
                                <span className="text-text-muted">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right text-text-muted tabular-nums">
                              {lot.overlap_pct_of_parcel != null ? `${lot.overlap_pct_of_parcel}%` : "—"}
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
              Cook County GIS Lots layer (2025) · Spatially matched using PostGIS
            </InlineSourceNote>
          </section>
        );
      })()}

      {mapSlot && (
        <div>
          <h2 className="section-heading">Subdivision map</h2>
          {mapSlot}
        </div>
      )}

      {/* Sales activity */}
      {salesStats && salesStats.totalSales > 0 && (
        <section>
          <h2 className="section-heading">Sales activity</h2>
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
                  {salesStats.mostRecentPrice != null && ` · ${formatCurrency(salesStats.mostRecentPrice)}`}
                </p>
              </div>
            )}
          </div>
          <InlineSourceNote className="mt-3">Cook County Recorder of Deeds. Market sales only ($50K–$5M).</InlineSourceNote>
        </section>
      )}

      {/* Assessment snapshot */}
      {assessmentStats?.medianAssessedValue != null && (
        <section>
          <h2 className="section-heading">Assessment snapshot</h2>
          <div className="bg-surface-card border border-surface-border rounded-lg p-4 inline-block">
            <p className="text-2xl font-semibold text-text-primary tabular-nums">
              {formatCurrency(assessmentStats.medianAssessedValue)}
            </p>
            <p className="text-sm text-text-muted mt-1">Median assessed value</p>
          </div>
          <InlineSourceNote className="mt-3">Cook County Assessor certified valuations.</InlineSourceNote>
        </section>
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
          <h2 className="section-heading">How this subdivision was built</h2>
          <p className="text-sm text-text-muted mb-4">
            {earliestBuilt === latestBuilt
              ? `Construction in this plat took place in ${earliestBuilt}.`
              : `Construction in this plat began in ${earliestBuilt} and extended through ${latestBuilt}.`}
          </p>
          <ConstructionByDecadeChart rows={decadeRows} />
          <InlineSourceNote className="mt-3">Cook County Assessor build-year data.</InlineSourceNote>
        </div>
      )}

      {/* Home sales in this subdivision */}
      {marketHistory.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <SaleIcon size={14} strokeWidth={1.8} className="text-text-muted" aria-hidden="true" />
            <h2 className="section-heading !mb-0">Home sales in this subdivision</h2>
          </div>
          <p className="text-sm text-text-muted mb-4">
            Bars show annual sales volume. Line shows median sale price. Market sales only, $50K to $5M.
          </p>
          <div className="-mx-[clamp(1rem,4vw,3rem)]">
            <MarketHistoryChart data={marketHistory} />
          </div>
          <InlineSourceNote className="mt-3">Cook County Recorder of Deeds.</InlineSourceNote>
        </section>
      )}

      {parcels.length > 0 && (() => {
        const byDecade = new Map<string, typeof parcels>();
        [...parcels].forEach((p) => {
          const key = p.year_built ? `${Math.floor(p.year_built / 10) * 10}s` : "Unknown";
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
            <h2 className="section-heading">Known properties in this subdivision</h2>
            <div className="space-y-8">
              {decades.map(([decade, group]) => {
                const decadeYear = decade === "Unknown" ? null : parseInt(decade);
                return (
                  <div key={decade}>
                    <div className="flex items-center gap-3 mb-3">
                      {decadeYear && (
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ background: getEraColor(decadeYear) ?? "#64748b" }}
                          aria-hidden="true"
                        />
                      )}
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
                            meta={lotLabel ? `${lotLabel}${multiLotSuffix}` : undefined}
                            metaItems={[
                              p.year_built    ? { icon: <YearBuiltIcon size={11} />, value: String(p.year_built) } : null,
                              p.building_sqft ? { icon: <SizeIcon size={11} />,     value: `${formatNumber(p.building_sqft)} sqft` } : null,
                              p.sale_count    ? { icon: <SaleIcon size={11} />,     value: `${p.sale_count} sales` } : null,
                              p.permit_count  ? { icon: <PermitIcon size={11} />,   value: `${p.permit_count} permits` } : null,
                            ].filter((x): x is MetaItem => x !== null)}
                            eraSwatch={getEraColor(p.year_built)}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <InlineSourceNote className="mt-3">
              Sourced from deed / legal descriptions. This list represents the current research sample and is not exhaustive.
            </InlineSourceNote>
          </div>
        );
      })()}
    </div>
  );
}
