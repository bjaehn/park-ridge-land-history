"use client";

import React from "react";
import Link from "next/link";
import { StatGrid } from "@/components/ui/StatGrid";
import { ConstructionByDecadeChart } from "@/components/ui/ConstructionByDecadeChart";
import { MarketHistoryChart } from "@/components/ui/MarketHistoryChart";
import { NeighborhoodPriceChart } from "@/components/ui/NeighborhoodPriceChart";
import { EntityCard } from "@/components/ui/EntityCard";
import { HighlightReel } from "@/components/ui/HighlightReel";
import { InlineSourceNote } from "@/components/ui/SourceNote";
import { getChangeSignal, formatNumber, formatCount } from "@/lib/formatters";
import { SaleIcon } from "@/lib/icons";
import { COVERAGE_DISCLAIMER, NEIGHBORHOOD_BOUNDARY_DISCLAIMER, NEIGHBORHOOD_NARRATIVES } from "@/lib/content";
import type { NeighborhoodPageData } from "@/lib/data/neighborhoodPage";
import type { HighlightGroup } from "@/components/ui/HighlightReel";

const HIGHLIGHT_GROUPS: readonly HighlightGroup[] = [
  { heading: "Oldest homes in this neighborhood", category: "oldest" },
  { heading: "Most active properties", category: "most_active" },
  { heading: "Most recently sold", category: "most_recent_sale" },
  { heading: "Largest homes in this neighborhood", category: "largest" },
];

type Props = {
  data: NeighborhoodPageData;
  eraLabel?: string;
  mapSlot?: React.ReactNode;
};

export function NeighborhoodPage({ data, eraLabel, mapSlot }: Props) {
  const { meta, stats, buildHistory, linkedSubdivisions, mapData, salesHistory, priceSummary } =
    data;

  const signal = getChangeSignal({
    permit_count: stats.totalPermits,
    sale_count: stats.totalSales,
    recent_teardown_count: stats.recentTeardowns,
  });

  const statItems = [
    stats.parcelCount > 0
      ? { value: formatNumber(stats.parcelCount), label: "Properties" }
      : null,
    stats.medianYear
      ? { value: String(stats.medianYear), label: "Typical build year" }
      : null,
    linkedSubdivisions.length > 0
      ? {
          value: formatCount(linkedSubdivisions.length, "subdivision", "subdivisions"),
          label: "Recorded plats",
        }
      : null,
    stats.totalPermits
      ? { value: formatCount(stats.totalPermits, "permit", "permits"), label: "Permits on record" }
      : null,
  ].filter((s): s is { value: string; label: string } => s !== null);

  const priceRow =
    priceSummary.year2015 || priceSummary.year2024
      ? [{ label: meta.label, ...priceSummary }]
      : [];

  const narrative = NEIGHBORHOOD_NARRATIVES[meta.slug];

  return (
    <div className="space-y-10">
      {/* Neighborhood narrative */}
      {narrative && (
        <p className="text-sm text-text-secondary leading-relaxed">{narrative}</p>
      )}

      {/* Stat grid */}
      {statItems.length > 0 && (
        <>
          <StatGrid
            columns={(Math.max(2, Math.min(statItems.length, 4))) as 2 | 3 | 4}
            stats={statItems.slice(0, 4)}
          />
          {signal !== "Dormant" && (
            <p className="text-xs text-text-muted -mt-6">
              {signal === "Reinvestment" &&
                "Ongoing improvements: elevated permit activity relative to the city median, suggesting ongoing improvement work."}
              {signal === "Turnover" &&
                "Frequently resold: elevated sale frequency relative to the city median."}
              {signal === "Rebuild pressure" &&
                "Active redevelopment: recent teardown or significant reconstruction activity detected."}
            </p>
          )}
        </>
      )}

      {/* Map */}
      <div>
        <h2 className="section-heading">Properties in {meta.label}</h2>
        {mapSlot ? (
          <>
            {mapSlot}
            <p className="text-xs text-text-muted mt-2">
              Colored by construction era. Click any property to explore its history.
            </p>
          </>
        ) : mapData.pins.length === 0 && mapData.bbox === null ? (
          <p className="text-sm text-text-muted border border-surface-border rounded-lg px-4 py-6">
            No parcel data is linked to this neighborhood yet.
          </p>
        ) : null}
      </div>

      {/* Price comparison: 2015 vs. 2024 */}
      {priceRow.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <SaleIcon size={14} strokeWidth={1.8} className="text-text-muted" aria-hidden="true" />
            <h2 className="section-heading !mb-0">Median sale price, 2015 vs. 2024</h2>
          </div>
          <p className="text-sm text-text-muted mb-4">
            Compares median sale prices between 2015 and 2024 for market sales in this neighborhood.
          </p>
          <NeighborhoodPriceChart data={priceRow} />
          <InlineSourceNote className="mt-3">
            Cook County Recorder of Deeds. Market sales only ($50K to $5M).
          </InlineSourceNote>
        </section>
      )}

      {/* Construction by decade */}
      {buildHistory.decadeRows.length > 0 && (
        <div>
          <h2 className="section-heading">How {meta.label} was built</h2>
          <p className="text-sm text-text-muted mb-4">
            {eraLabel
              ? `${meta.label} was built primarily during the ${eraLabel.toLowerCase()}.`
              : "Construction in this neighborhood spanned multiple decades, as shown below."}
          </p>
          <ConstructionByDecadeChart rows={buildHistory.decadeRows} />
          <InlineSourceNote className="mt-3">
            Cook County Assessor build-year data. Properties with unknown build year are excluded.
          </InlineSourceNote>
        </div>
      )}

      {/* Market history */}
      {salesHistory.length >= 3 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <SaleIcon size={14} strokeWidth={1.8} className="text-text-muted" aria-hidden="true" />
            <h2 className="section-heading !mb-0">Home sales in this neighborhood</h2>
          </div>
          <p className="text-sm text-text-muted mb-4">
            Bars show annual sales volume. Line shows median sale price. Market sales only, $50K to
            $5M.
          </p>
          <div className="-mx-[clamp(1rem,4vw,3rem)]">
            <MarketHistoryChart data={salesHistory} />
          </div>
          <InlineSourceNote className="mt-3">Cook County Recorder of Deeds.</InlineSourceNote>
        </section>
      )}

      {/* Highlight reel */}
      <HighlightReel
        scope="neighborhood"
        scopeId={meta.id}
        groups={HIGHLIGHT_GROUPS}
        limit={5}
      />

      {/* Related subdivisions */}
      {linkedSubdivisions.length > 0 && (
        <div>
          <h2 className="section-heading">Recorded Plats and Subdivisions</h2>
          <p className="text-sm text-text-muted mb-4">
            These recorded plats are associated with this neighborhood based on available records.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {linkedSubdivisions.map((sub) => (
              <EntityCard
                key={sub.linkId}
                href={`/subdivisions/${encodeURIComponent(sub.subdivisionId)}`}
                eyebrow={sub.relationshipType ?? undefined}
                title={sub.name}
                meta={sub.recordedYear ? `Recorded ${sub.recordedYear}` : undefined}
              />
            ))}
          </div>
          <InlineSourceNote className="mt-3">
            Cook County Recorder of Deeds plat index. Subdivision associations based on available
            research.
          </InlineSourceNote>
        </div>
      )}

      {/* Streets */}
      {buildHistory.streets.length > 0 && (
        <div>
          <h2 className="section-heading">Streets in {meta.label}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {buildHistory.streets.map((street) => (
              <EntityCard
                key={street.name}
                href={`/streets/${encodeURIComponent(street.name)}`}
                title={street.displayName}
                meta={
                  street.parcelCount
                    ? formatCount(street.parcelCount, "property", "properties")
                    : undefined
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Source and data coverage */}
      <div className="pt-6 border-t border-surface-border space-y-3">
        <h2 className="section-heading">About this data</h2>
        <div className="text-xs text-text-muted space-y-1.5">
          <p>Property data: Cook County Assessor.</p>
          <p>Sales records: Cook County Recorder of Deeds.</p>
          {linkedSubdivisions.length > 0 && (
            <p>Subdivision links: Cook County Recorder of Deeds plat index.</p>
          )}
          <p>{COVERAGE_DISCLAIMER}</p>
          <p>{NEIGHBORHOOD_BOUNDARY_DISCLAIMER}</p>
        </div>
      </div>

      {/* Related exploration */}
      <div className="pt-6 border-t border-surface-border">
        <h2 className="section-heading">Explore more</h2>
        <div className="space-y-3">
          <div>
            <Link href="/" className="text-accent-purple hover:underline">
              Search for a property in this neighborhood
            </Link>
          </div>
          <div>
            <Link href="/city" className="text-accent-purple hover:underline">
              See Park Ridge city history
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
