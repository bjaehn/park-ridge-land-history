"use client";

import { useState, useEffect } from "react";
import { StatGrid } from "@/components/ui/StatGrid";
import { EntityCard, UnresolvableEntityCard } from "@/components/ui/EntityCard";
import { LoadingSkeleton, EmptyState } from "@/components/ui/EmptyState";
import { InlineSourceNote } from "@/components/ui/SourceNote";
import { formatAddress, formatNumber, formatCurrency } from "@/lib/formatters";
import { getEraColor } from "@/lib/mapConfig";
import { getPinGroupDetail } from "@/lib/data/pinGroups";
import { fetchBlockSalesStats, fetchBlockPermitStats } from "@/lib/supabase/blockQueries";
import { EraPortrait } from "@/components/ui/EraPortrait";
import { CityTrendCharts } from "@/components/ui/CityTrendCharts";
import type { DecadeRow } from "@/components/ui/ConstructionByDecadeChart";
import type { PinGroupDetail } from "@/lib/data/pinGroups";
import type { BlockSalesStats, BlockPermitStats } from "@/lib/supabase/blockQueries";

type Props = {
  prefix: string;
  initialDetail?: PinGroupDetail | null;
  mapSlot?: React.ReactNode;
};

export function PinGroupContent({ prefix, initialDetail, mapSlot }: Props) {
  const [detail, setDetail] = useState<PinGroupDetail | null>(initialDetail ?? null);
  const [salesStats, setSalesStats] = useState<BlockSalesStats | null>(null);
  const [permitStats, setPermitStats] = useState<BlockPermitStats | null>(null);
  const [loading, setLoading] = useState(!initialDetail);

  useEffect(() => {
    const base = initialDetail
      ? Promise.resolve(initialDetail)
      : getPinGroupDetail(prefix).then((d) => { setDetail(d); return d; });

    base
      .then((d) => {
        if (!d) return;
        const pins = d.parcels.map((p) => p.pin).filter(Boolean);
        return Promise.all([
          fetchBlockSalesStats(pins),
          fetchBlockPermitStats(pins),
        ]);
      })
      .then((results) => {
        if (!results) return;
        const [sales, permits] = results;
        setSalesStats(sales);
        setPermitStats(permits);
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [prefix]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <LoadingSkeleton rows={3} />;
  if (!detail || detail.parcels.length === 0) {
    return <EmptyState heading="No properties found" body={`No parcels match PIN prefix ${prefix}.`} />;
  }

  const { parcels } = detail;

  // Decade distribution
  const decadeMap = new Map<number, number>();
  parcels.forEach((p) => {
    if (p.yearBuilt) {
      const d = Math.floor(p.yearBuilt / 10) * 10;
      decadeMap.set(d, (decadeMap.get(d) ?? 0) + 1);
    }
  });
  const decadeRows: DecadeRow[] = Array.from(decadeMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([decade, count]) => ({ decade: String(decade), count }));

  // Year range
  const years = parcels.map((p) => p.yearBuilt).filter((y): y is number => y != null);
  const oldestYear = years.length ? Math.min(...years) : null;
  const newestYear = years.length ? Math.max(...years) : null;
  const yearRange = oldestYear && newestYear && oldestYear !== newestYear
    ? `${oldestYear}–${newestYear}`
    : oldestYear ? String(oldestYear) : null;

  // Assessment median
  const assessedValues = parcels
    .map((p) => p.latestAssessedTotal)
    .filter((v): v is number => v != null && v > 0)
    .sort((a, b) => a - b);
  const mid = Math.floor(assessedValues.length / 2);
  const medianAssessed = assessedValues.length
    ? assessedValues.length % 2 === 0
      ? (assessedValues[mid - 1] + assessedValues[mid]) / 2
      : assessedValues[mid]
    : null;

  const statItems = [
    { value: formatNumber(parcels.length), label: "Properties" },
    yearRange ? { value: yearRange, label: "Year range built" } : null,
    salesStats && salesStats.totalSales > 0
      ? { value: formatNumber(salesStats.totalSales), label: "Sales on record" }
      : null,
    permitStats && permitStats.totalPermits > 0
      ? { value: formatNumber(permitStats.totalPermits), label: "Permits on record" }
      : null,
  ].filter((s): s is { value: string; label: string } => s !== null);

  const columns = Math.max(2, Math.min(statItems.length, 4)) as 2 | 3 | 4;

  return (
    <div className="space-y-10">
      <StatGrid columns={columns} stats={statItems} />

      {mapSlot && (
        <div>
          <p className="section-heading">Map</p>
          {mapSlot}
        </div>
      )}

      {decadeRows.length > 0 && (
        <EraPortrait rows={decadeRows} heading="When these properties were built" />
      )}

      {salesStats && salesStats.totalSales > 0 && (
        <section>
          <p className="section-heading">Sales activity</p>
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

      {permitStats && permitStats.totalPermits > 0 && (
        <section>
          <p className="section-heading">Permit activity</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-surface-card border border-surface-border rounded-lg p-4">
              <p className="text-2xl font-semibold text-text-primary tabular-nums">
                {formatNumber(permitStats.totalPermits)}
              </p>
              <p className="text-sm text-text-muted mt-1">Building permits on record</p>
            </div>
            {permitStats.mostRecentYear != null && (
              <div className="bg-surface-card border border-surface-border rounded-lg p-4">
                <p className="text-2xl font-semibold text-text-primary tabular-nums">
                  {permitStats.mostRecentYear}
                </p>
                <p className="text-sm text-text-muted mt-1">Most recent permit issued</p>
              </div>
            )}
          </div>
          <InlineSourceNote className="mt-3">Park Ridge building permit records.</InlineSourceNote>
        </section>
      )}

      {medianAssessed != null && (
        <section>
          <p className="section-heading">Assessment snapshot</p>
          <div className="bg-surface-card border border-surface-border rounded-lg p-4 inline-block">
            <p className="text-2xl font-semibold text-text-primary tabular-nums">
              {formatCurrency(medianAssessed)}
            </p>
            <p className="text-sm text-text-muted mt-1">Median assessed value</p>
          </div>
          <InlineSourceNote className="mt-3">Cook County Assessor certified valuations.</InlineSourceNote>
        </section>
      )}

      {detail.level === "Section" && (() => {
        const blockMap = new Map<string, { count: number; years: number[] }>();
        parcels.forEach((p) => {
          const blockPrefix = p.pin.slice(0, 7);
          if (!blockPrefix || blockPrefix.length < 7) return;
          const existing = blockMap.get(blockPrefix) ?? { count: 0, years: [] };
          existing.count += 1;
          if (p.yearBuilt) existing.years.push(p.yearBuilt);
          blockMap.set(blockPrefix, existing);
        });
        const blocks = Array.from(blockMap.entries())
          .map(([blockPrefix, { count, years }]) => ({
            blockPrefix,
            blockSegment: blockPrefix.slice(4, 7),
            count,
            oldestYear: years.length ? Math.min(...years) : null,
            newestYear: years.length ? Math.max(...years) : null,
          }))
          .sort((a, b) => a.blockPrefix.localeCompare(b.blockPrefix));

        if (!blocks.length) return null;
        return (
          <div>
            <p className="section-heading">Blocks in this section</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {blocks.map((b) => {
                const yearRange = b.oldestYear && b.newestYear && b.oldestYear !== b.newestYear
                  ? `${b.oldestYear}–${b.newestYear}`
                  : b.oldestYear ? String(b.oldestYear) : null;
                return (
                  <EntityCard
                    key={b.blockPrefix}
                    href={`/pin/${encodeURIComponent(b.blockPrefix)}`}
                    eyebrow="Block"
                    title={`Block ${b.blockSegment}`}
                    meta={[
                      `${formatNumber(b.count)} ${b.count === 1 ? "property" : "properties"}`,
                      yearRange ? `Built ${yearRange}` : undefined,
                    ].filter(Boolean).join(" · ") || undefined}
                    eraSwatch={getEraColor(b.oldestYear)}
                  />
                );
              })}
            </div>
          </div>
        );
      })()}

      <div>
        <p className="section-heading">Properties</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {parcels.map((p) => {
            if (!p.address) return <UnresolvableEntityCard key={p.pin} pin={p.pin} />;
            return (
              <EntityCard
                key={p.pin}
                href={`/properties/${encodeURIComponent(p.pin)}`}
                title={formatAddress(p.address)}
                meta={[
                  p.yearBuilt ? `Built ${p.yearBuilt}` : undefined,
                  p.buildingSqft ? `${formatNumber(p.buildingSqft)} sqft` : undefined,
                ].filter(Boolean).join(" · ") || undefined}
                eraSwatch={getEraColor(p.yearBuilt)}
              />
            );
          })}
        </div>
      </div>

      <CityTrendCharts />
    </div>
  );
}
