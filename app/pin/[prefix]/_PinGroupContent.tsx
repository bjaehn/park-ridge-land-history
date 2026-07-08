"use client";

import { useState, useEffect } from "react";
import { StatGrid } from "@/components/ui/StatGrid";
import { EntityCard, UnresolvableEntityCard } from "@/components/ui/EntityCard";
import type { MetaItem } from "@/components/ui/EntityCard";
import { EraPortraitChart } from "@/components/ui/EraPortraitChart";
import { NeighborhoodPriceChart } from "@/components/ui/NeighborhoodPriceChart";
import { LoadingSkeleton, EmptyState } from "@/components/ui/EmptyState";
import { DecadeGroup } from "@/components/ui/DecadeGroup";
import { InlineSourceNote } from "@/components/ui/SourceNote";
import { PinScopedCharts } from "@/components/ui/PinScopedCharts";
import { SaleIcon, YearBuiltIcon, SizeIcon, PermitIcon } from "@/lib/icons";
import { formatAddress, formatNumber, formatCurrency } from "@/lib/formatters";
import { getEraColor } from "@/lib/mapConfig";
import { getPinGroupDetail } from "@/lib/data/pinGroups";
import { fetchBlockSalesStats, fetchBlockPermitStats, fetchBlockSalesByYear } from "@/lib/supabase/blockQueries";
import type { PinGroupDetail } from "@/lib/data/pinGroups";
import type { BlockSalesStats, BlockPermitStats, BlockSalesByYear } from "@/lib/supabase/blockQueries";

type Props = {
  prefix: string;
  initialDetail?: PinGroupDetail | null;
  mapSlot?: React.ReactNode;
};

export function PinGroupContent({ prefix, initialDetail, mapSlot }: Props) {
  const [detail, setDetail] = useState<PinGroupDetail | null>(initialDetail ?? null);
  const [salesStats, setSalesStats] = useState<BlockSalesStats | null>(null);
  const [permitStats, setPermitStats] = useState<BlockPermitStats | null>(null);
  const [salesByYear, setSalesByYear] = useState<BlockSalesByYear | null>(null);
  const [loading, setLoading] = useState(!initialDetail);
  const [error, setError] = useState(false);

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
          fetchBlockSalesByYear(pins),
        ]);
      })
      .then((results) => {
        if (!results) return;
        const [sales, permits, salesYr] = results;
        setSalesStats(sales);
        setPermitStats(permits);
        setSalesByYear(salesYr);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [prefix]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <LoadingSkeleton rows={3} />;
  if (error) return <EmptyState heading="Unable to load block data" body="Try refreshing the page." />;
  if (!detail || detail.parcels.length === 0) {
    return <EmptyState heading="No properties found" body={`No parcels match PIN prefix ${prefix}.`} />;
  }

  const { parcels } = detail;

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
          <h2 className="section-heading">Map</h2>
          {mapSlot}
        </div>
      )}

      {(() => {
        const eraRow = {
          label: detail.levelLabel,
          pre1920: parcels.filter((p) => p.yearBuilt && p.yearBuilt < 1920).length,
          boom:    parcels.filter((p) => p.yearBuilt && p.yearBuilt >= 1920 && p.yearBuilt < 1946).length,
          postwar: parcels.filter((p) => p.yearBuilt && p.yearBuilt >= 1946 && p.yearBuilt < 1980).length,
          eighties:parcels.filter((p) => p.yearBuilt && p.yearBuilt >= 1980 && p.yearBuilt < 2000).length,
          aughts:  parcels.filter((p) => p.yearBuilt && p.yearBuilt >= 2000 && p.yearBuilt < 2010).length,
          teens:   parcels.filter((p) => p.yearBuilt && p.yearBuilt >= 2010 && p.yearBuilt < 2020).length,
          recent:  parcels.filter((p) => p.yearBuilt && p.yearBuilt >= 2020).length,
          total:   parcels.filter((p) => p.yearBuilt).length,
        };
        const priceRow = salesByYear && (salesByYear.year2015 || salesByYear.year2024)
          ? [{ label: detail.levelLabel, ...salesByYear }]
          : [];
        return (
          <div className="space-y-10">
            {priceRow.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <SaleIcon size={14} strokeWidth={1.8} className="text-text-muted" aria-hidden="true" />
                  <h2 className="section-heading !mb-0">Median sale price, 2015 vs. 2024</h2>
                </div>
                <NeighborhoodPriceChart data={priceRow} />
              </section>
            )}
            {eraRow.total > 30 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <YearBuiltIcon size={14} strokeWidth={1.8} className="text-text-muted" aria-hidden="true" />
                  <h2 className="section-heading !mb-0">Era portrait: when these properties were built</h2>
                </div>
                <p className="text-sm text-text-muted mb-3">
                  Each bar shows 100% of properties with known build years, divided by era.
                </p>
                <EraPortraitChart data={[eraRow]} />
              </section>
            )}
          </div>
        );
      })()}

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

      {permitStats && permitStats.totalPermits > 0 && (
        <section>
          <h2 className="section-heading">Permit activity</h2>
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
          <h2 className="section-heading">Assessment snapshot</h2>
          <div className="bg-surface-card border border-surface-border rounded-lg p-4 inline-block">
            <p className="text-2xl font-semibold text-text-primary tabular-nums">
              {formatCurrency(medianAssessed)}
            </p>
            <p className="text-sm text-text-muted mt-1">Median assessed value</p>
          </div>
          <InlineSourceNote className="mt-3">Cook County Assessor certified valuations.</InlineSourceNote>
        </section>
      )}

      <PinScopedCharts prefix={prefix} levelLabel={detail.levelLabel} />

      {detail.level === "Township" && (() => {
        const sectionMap = new Map<string, { count: number; years: number[] }>();
        parcels.forEach((p) => {
          const sectionPrefix = p.pin.slice(0, 4);
          if (!sectionPrefix || sectionPrefix.length < 4) return;
          const existing = sectionMap.get(sectionPrefix) ?? { count: 0, years: [] };
          existing.count += 1;
          if (p.yearBuilt) existing.years.push(p.yearBuilt);
          sectionMap.set(sectionPrefix, existing);
        });
        const sections = Array.from(sectionMap.entries())
          .map(([sectionPrefix, { count, years }]) => ({
            sectionPrefix,
            sectionSegment: sectionPrefix.slice(2, 4),
            count,
            oldestYear: years.length ? Math.min(...years) : null,
            newestYear: years.length ? Math.max(...years) : null,
          }))
          .sort((a, b) => a.sectionPrefix.localeCompare(b.sectionPrefix));

        if (!sections.length) return null;
        return (
          <div>
            <h2 className="section-heading">Sections in this township</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sections.map((s) => {
                const yr = s.oldestYear && s.newestYear && s.oldestYear !== s.newestYear
                  ? `${s.oldestYear}–${s.newestYear}`
                  : s.oldestYear ? String(s.oldestYear) : null;
                return (
                  <EntityCard
                    key={s.sectionPrefix}
                    href={`/pin/${encodeURIComponent(s.sectionPrefix)}`}
                    eyebrow="Section"
                    title={`Section ${s.sectionSegment}`}
                    meta={[
                      `${formatNumber(s.count)} ${s.count === 1 ? "property" : "properties"}`,
                      yr ? `Built ${yr}` : undefined,
                    ].filter(Boolean).join(" · ") || undefined}
                    eraSwatch={getEraColor(s.oldestYear)}
                  />
                );
              })}
            </div>
          </div>
        );
      })()}

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
            <h2 className="section-heading">Blocks in this section</h2>
            <DecadeGroup
              items={blocks}
              getYear={(b) => b.oldestYear}
              getKey={(b) => b.blockPrefix}
              renderItem={(b) => {
                const yearRange = b.oldestYear && b.newestYear && b.oldestYear !== b.newestYear
                  ? `${b.oldestYear}–${b.newestYear}`
                  : b.oldestYear ? String(b.oldestYear) : null;
                return (
                  <EntityCard
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
              }}
            />
          </div>
        );
      })()}

      {/* Block: decade timeline */}
      {detail.level === "Block" && parcels.length > 0 && (
        <div>
          <h2 className="section-heading">Properties by decade</h2>
          <DecadeGroup
            items={parcels}
            getYear={(p) => p.yearBuilt}
            getKey={(p) => p.pin}
            renderItem={(p) =>
              !p.address ? (
                <UnresolvableEntityCard pin={p.pin} />
              ) : (
                <EntityCard
                  href={`/properties/${encodeURIComponent(p.pin)}`}
                  title={formatAddress(p.address)}
                  metaItems={[
                    p.yearBuilt    ? { icon: <YearBuiltIcon size={11} />, value: String(p.yearBuilt) } : null,
                    p.buildingSqft ? { icon: <SizeIcon size={11} />,     value: `${formatNumber(p.buildingSqft)} sqft` } : null,
                    p.saleCount    ? { icon: <SaleIcon size={11} />,     value: `${p.saleCount} sales` } : null,
                    p.permitCount  ? { icon: <PermitIcon size={11} />,   value: `${p.permitCount} permits` } : null,
                  ].filter((x): x is MetaItem => x !== null)}
                  eraSwatch={getEraColor(p.yearBuilt)}
                  isTeardownRebuild={p.isTeardownRebuild}
                  teardownConfidence={p.teardownConfidence}
                  hasDeedNotes={p.hasDeedNotes}
                />
              )
            }
          />
        </div>
      )}

      {/* Section: properties by decade */}
      {detail.level === "Section" && parcels.length > 0 && (
        <div>
          <h2 className="section-heading">Properties in this section</h2>
          <DecadeGroup
            items={parcels}
            getYear={(p) => p.yearBuilt}
            getKey={(p) => p.pin}
            renderItem={(p) =>
              !p.address ? (
                <UnresolvableEntityCard pin={p.pin} />
              ) : (
                <EntityCard
                  href={`/properties/${encodeURIComponent(p.pin)}`}
                  title={formatAddress(p.address)}
                  metaItems={[
                    p.yearBuilt    ? { icon: <YearBuiltIcon size={11} />, value: String(p.yearBuilt) } : null,
                    p.buildingSqft ? { icon: <SizeIcon size={11} />,     value: `${formatNumber(p.buildingSqft)} sqft` } : null,
                    p.saleCount    ? { icon: <SaleIcon size={11} />,     value: `${p.saleCount} sales` } : null,
                    p.permitCount  ? { icon: <PermitIcon size={11} />,   value: `${p.permitCount} permits` } : null,
                  ].filter((x): x is MetaItem => x !== null)}
                  eraSwatch={getEraColor(p.yearBuilt)}
                  isTeardownRebuild={p.isTeardownRebuild}
                  teardownConfidence={p.teardownConfidence}
                  hasDeedNotes={p.hasDeedNotes}
                />
              )
            }
          />
        </div>
      )}
    </div>
  );
}
