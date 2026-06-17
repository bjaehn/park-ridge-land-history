"use client";

import { useState, useEffect } from "react";
import { StatGrid } from "@/components/ui/StatGrid";
import { ConstructionByDecadeChart } from "@/components/ui/ConstructionByDecadeChart";
import { EntityCard } from "@/components/ui/EntityCard";
import { LoadingSkeleton } from "@/components/ui/EmptyState";
import { InlineSourceNote } from "@/components/ui/SourceNote";
import { formatNumber, formatCurrency } from "@/lib/formatters";
import {
  fetchSectionBlocks,
  fetchSectionParcelsWithAssessment,
  fetchBlockSalesStats,
  fetchBlockPermitStats,
} from "@/lib/supabase/blockQueries";
import type { DecadeRow } from "@/components/ui/ConstructionByDecadeChart";
import type { BlockSalesStats, BlockPermitStats, BlockAssessmentStats, SectionBlock } from "@/lib/supabase/blockQueries";

type Props = {
  sectionId: string;
  mapSlot?: React.ReactNode;
};

export function SectionDetailContent({ sectionId, mapSlot }: Props) {
  const [blocks, setBlocks] = useState<SectionBlock[]>([]);
  const [decadeRows, setDecadeRows] = useState<DecadeRow[]>([]);
  const [salesStats, setSalesStats] = useState<BlockSalesStats | null>(null);
  const [permitStats, setPermitStats] = useState<BlockPermitStats | null>(null);
  const [assessmentStats, setAssessmentStats] = useState<BlockAssessmentStats | null>(null);
  const [totalParcels, setTotalParcels] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchSectionBlocks(sectionId),
      fetchSectionParcelsWithAssessment(sectionId),
    ])
      .then(([blockList, { parcels, assessmentStats: as_ }]) => {
        setBlocks(blockList);
        setAssessmentStats(as_);
        setTotalParcels(parcels.length);

        const yearsKnown = parcels.map((p) => p.yearBuilt).filter((y): y is number => y != null);
        const decadeMap = new Map<number, number>();
        yearsKnown.forEach((yr) => {
          const d = Math.floor(yr / 10) * 10;
          decadeMap.set(d, (decadeMap.get(d) ?? 0) + 1);
        });
        const rows: DecadeRow[] = Array.from(decadeMap.entries())
          .sort(([a], [b]) => a - b)
          .map(([decade, count]) => ({ decade: String(decade), count }));
        setDecadeRows(rows);

        const pins = parcels.map((p) => p.pin).filter(Boolean);
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
  }, [sectionId]);

  if (loading) return <LoadingSkeleton rows={3} />;

  const statItems = [
    { value: formatNumber(totalParcels), label: "Total properties" },
    { value: formatNumber(blocks.length), label: "Blocks in this section" },
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
          <p className="section-heading">Section map</p>
          {mapSlot}
        </div>
      )}

      {decadeRows.length > 0 && (
        <div>
          <p className="section-heading">When this section was built</p>
          <ConstructionByDecadeChart rows={decadeRows} />
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
          <div className="bg-surface-card border border-surface-border rounded-lg p-4 inline-block">
            <p className="text-2xl font-semibold text-text-primary tabular-nums">
              {formatCurrency(assessmentStats.medianAssessedValue)}
            </p>
            <p className="text-sm text-text-muted mt-1">
              Median assessed value
              {assessmentStats.assessedYear != null && ` (${assessmentStats.assessedYear})`}
            </p>
          </div>
          <InlineSourceNote className="mt-3">Cook County Assessor certified valuations.</InlineSourceNote>
        </section>
      )}

      {blocks.length > 0 && (
        <div>
          <p className="section-heading">Blocks in this section</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {blocks.map((b) => {
              const yearRange = b.oldestYear && b.newestYear && b.oldestYear !== b.newestYear
                ? `${b.oldestYear}–${b.newestYear}`
                : b.oldestYear
                ? String(b.oldestYear)
                : null;
              return (
                <EntityCard
                  key={b.blockId}
                  href={`/blocks/${encodeURIComponent(b.blockId)}`}
                  eyebrow="Block"
                  title={b.blockId}
                  meta={[
                    `${formatNumber(b.parcelCount)} ${b.parcelCount === 1 ? "property" : "properties"}`,
                    yearRange ? `Built ${yearRange}` : undefined,
                  ].filter(Boolean).join(" · ") || undefined}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
