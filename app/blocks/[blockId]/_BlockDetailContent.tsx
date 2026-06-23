"use client";

import { useState, useEffect } from "react";
import { StatGrid } from "@/components/ui/StatGrid";
import { EntityCard, UnresolvableEntityCard } from "@/components/ui/EntityCard";
import type { MetaItem } from "@/components/ui/EntityCard";
import { LoadingSkeleton } from "@/components/ui/EmptyState";
import { InlineSourceNote } from "@/components/ui/SourceNote";
import { formatNumber, formatCurrency, formatAddress } from "@/lib/formatters";
import { YearBuiltIcon, SizeIcon, SaleIcon, PermitIcon } from "@/lib/icons";
import {
  fetchBlockParcelsWithAssessment,
  fetchBlockSalesStats,
  fetchBlockPermitStats,
} from "@/lib/supabase/blockQueries";
import type { BlockSalesStats, BlockPermitStats, BlockAssessmentStats, BlockParcel } from "@/lib/supabase/blockQueries";

type Props = {
  blockId: string;
  mapSlot?: React.ReactNode;
};

export function BlockDetailContent({ blockId, mapSlot }: Props) {
  const [parcels, setParcels] = useState<BlockParcel[]>([]);
  const [salesStats, setSalesStats] = useState<BlockSalesStats | null>(null);
  const [permitStats, setPermitStats] = useState<BlockPermitStats | null>(null);
  const [assessmentStats, setAssessmentStats] = useState<BlockAssessmentStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBlockParcelsWithAssessment(blockId)
      .then(({ parcels: p, assessmentStats: a }) => {
        setParcels(p);
        setAssessmentStats(a);
        const pins = p.map((x) => x.pin).filter(Boolean);
        return Promise.all([
          fetchBlockSalesStats(pins),
          fetchBlockPermitStats(pins),
        ]);
      })
      .then(([sales, permits]) => {
        setSalesStats(sales);
        setPermitStats(permits);
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [blockId]);

  if (loading) return <LoadingSkeleton rows={3} />;

  const yearsKnown = parcels.map((p) => p.yearBuilt).filter((y): y is number => y != null);
  const decadeMap = new Map<number, number>();
  yearsKnown.forEach((yr) => {
    const d = Math.floor(yr / 10) * 10;
    decadeMap.set(d, (decadeMap.get(d) ?? 0) + 1);
  });
  let modeDecade: number | null = null;
  let modeCount = 0;
  decadeMap.forEach((count, decade) => {
    if (count > modeCount) { modeCount = count; modeDecade = decade; }
  });

  const oldestYear = yearsKnown.length ? Math.min(...yearsKnown) : null;
  const newestYear = yearsKnown.length ? Math.max(...yearsKnown) : null;
  const yearRange = oldestYear && newestYear && oldestYear !== newestYear
    ? `${oldestYear}–${newestYear}`
    : oldestYear
    ? String(oldestYear)
    : null;

  const statItems = [
    { value: formatNumber(parcels.length), label: "Properties on this block" },
    yearRange ? { value: yearRange, label: "Year range built" } : null,
    salesStats && salesStats.totalSales > 0
      ? { value: formatNumber(salesStats.totalSales), label: "Total sales on record" }
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
          <p className="section-heading">Block map</p>
          {mapSlot}
        </div>
      )}

      {modeDecade !== null && (
        <div>
          <p className="section-heading">How this block was built</p>
          <p className="text-sm text-text-secondary">
            {`Built primarily in the ${modeDecade}s`}
            {oldestYear && newestYear && oldestYear !== newestYear
              ? `, with homes built from ${oldestYear} to ${newestYear}.`
              : `.`}
          </p>
        </div>
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

      {assessmentStats && assessmentStats.medianAssessedValue != null && (
        <section>
          <p className="section-heading">Assessment snapshot</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-surface-card border border-surface-border rounded-lg p-4">
              <p className="text-2xl font-semibold text-text-primary tabular-nums">
                {formatCurrency(assessmentStats.medianAssessedValue)}
              </p>
              <p className="text-sm text-text-muted mt-1">
                Median assessed value
                {assessmentStats.assessedYear != null && ` (${assessmentStats.assessedYear})`}
              </p>
            </div>
          </div>
          <InlineSourceNote className="mt-3">Cook County Assessor certified valuations.</InlineSourceNote>
        </section>
      )}

      {parcels.length > 0 && (
        <div>
          <p className="section-heading">Properties on this block</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {parcels.map((p) => {
              if (!p.address) return <UnresolvableEntityCard key={p.pin} pin={p.pin} />;
              return (
                <EntityCard
                  key={p.pin}
                  href={`/properties/${encodeURIComponent(p.pin)}`}
                  title={formatAddress(p.address)}
                  metaItems={[
                    p.yearBuilt    ? { icon: <YearBuiltIcon size={11} />, value: String(p.yearBuilt) } : null,
                    p.buildingSqft ? { icon: <SizeIcon size={11} />,     value: `${formatNumber(p.buildingSqft)} sqft` } : null,
                    p.saleCount    ? { icon: <SaleIcon size={11} />,     value: `${p.saleCount} sales` } : null,
                    p.permitCount  ? { icon: <PermitIcon size={11} />,   value: `${p.permitCount} permits` } : null,
                  ].filter((x): x is MetaItem => x !== null)}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
