"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { StatGrid } from "@/components/ui/StatGrid";
import { ConstructionByDecadeChart } from "@/components/ui/ConstructionByDecadeChart";
import { MarketHistoryChart } from "@/components/ui/MarketHistoryChart";
import { EntityCard } from "@/components/ui/EntityCard";
import { LoadingSkeleton } from "@/components/ui/EmptyState";
import { HighlightReel } from "@/components/ui/HighlightReel";
import { NeighborhoodPriceChart } from "@/components/ui/NeighborhoodPriceChart";
import { InlineSourceNote } from "@/components/ui/SourceNote";
import { getChangeSignal, formatNumber, formatCount } from "@/lib/formatters";
import { getNeighborhoodDetail, fetchNeighborhoodPins } from "@/lib/data/neighborhoods";
import { fetchBlockSalesByYear } from "@/lib/supabase/blockQueries";
import { fetchSubdivisionMarketHistory } from "@/lib/supabase/subdivisionQueries";
import type { BlockSalesByYear } from "@/lib/supabase/blockQueries";
import type { MarketHistoryRow } from "@/lib/supabase/cityQueries";
import { NEIGHBORHOOD_NARRATIVES, NEIGHBORHOOD_ERA_LABELS } from "@/lib/content";
import { SaleIcon } from "@/lib/icons";
import type { HighlightGroup } from "@/components/ui/HighlightReel";

const NEIGHBORHOOD_HIGHLIGHTS: readonly HighlightGroup[] = [
  { heading: "Oldest homes in this neighborhood", category: "oldest" },
  { heading: "Most active properties", category: "most_active" },
  { heading: "Most recently sold", category: "most_recent_sale" },
];

type Props = { neighborhoodId: string; label: string; slug: string; mapSlot?: React.ReactNode };

export function NeighborhoodDetailContent({ neighborhoodId, label, slug, mapSlot }: Props) {
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getNeighborhoodDetail>> | null>(null);
  const [salesByYear, setSalesByYear] = useState<BlockSalesByYear | null>(null);
  const [marketHistory, setMarketHistory] = useState<MarketHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getNeighborhoodDetail(neighborhoodId)
      .then((d) => {
        setDetail(d);
        return fetchNeighborhoodPins(neighborhoodId);
      })
      .then(async (pins) => {
        if (!pins.length) return;
        const [byYear, history] = await Promise.all([
          fetchBlockSalesByYear(pins),
          fetchSubdivisionMarketHistory(pins),
        ]);
        setSalesByYear(byYear);
        setMarketHistory(history);
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [neighborhoodId]);

  if (loading) return <LoadingSkeleton rows={4} />;
  if (!detail) return null;

  const signal = getChangeSignal({
    permit_count: detail.totalPermits,
    sale_count: detail.totalSales,
    recent_teardown_count: detail.recentTeardowns,
  });

  const statItems = [
    { value: formatNumber(detail.parcelCount), label: "Properties" },
    detail.medianYear ? { value: String(detail.medianYear), label: "Typical build year" } : null,
    detail.totalPermits ? { value: formatCount(detail.totalPermits, "permit", "permits"), label: "Permits on record" } : null,
    signal !== "Dormant" ? { value: signal, label: "Activity signal" } : null,
  ].filter((s): s is { value: string; label: string } => s !== null);

  const narrative = NEIGHBORHOOD_NARRATIVES[slug];

  const priceRow =
    salesByYear && (salesByYear.year2015 || salesByYear.year2024)
      ? [{ label, ...salesByYear }]
      : [];

  return (
    <div className="space-y-10">
      {/* 1. Narrative + InlineSourceNote */}
      {narrative && (
        <>
          <p className="text-text-secondary leading-relaxed max-w-prose">{narrative}</p>
          <InlineSourceNote>Historical summary based on Cook County Assessor build-year distributions and Cook County Recorder subdivision records. Era characterizations are interpretive summaries of the data. Confidence: Medium.</InlineSourceNote>
        </>
      )}

      {/* 2. Stat grid */}
      <StatGrid columns={(Math.max(2, Math.min(statItems.length, 4))) as 2 | 3 | 4} stats={statItems.slice(0, 4)} />

      {signal !== "Dormant" && (
        <p className="text-xs text-text-muted -mt-6">
          {signal === "Reinvestment" && "Elevated permit activity relative to the city median, suggesting ongoing improvement work."}
          {signal === "Turnover" && "Elevated sale frequency relative to the city median."}
          {signal === "Rebuild pressure" && "Recent teardown or significant reconstruction activity detected."}
        </p>
      )}

      {/* 3. Map */}
      {mapSlot && (
        <div>
          <h2 className="section-heading">Neighborhood map</h2>
          {mapSlot}
        </div>
      )}

      {/* 4. Price comparison */}
      {priceRow.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <SaleIcon size={14} strokeWidth={1.8} className="text-text-muted" aria-hidden="true" />
            <h2 className="section-heading !mb-0">Median sale price, 2015 vs. 2024</h2>
          </div>
          <p className="text-sm text-text-muted mb-4">Compares median sale prices between 2015 and 2024 for market sales in this neighborhood.</p>
          <NeighborhoodPriceChart data={priceRow} />
          <InlineSourceNote className="mt-3">Cook County Recorder of Deeds. Market sales only ($50K to $5M).</InlineSourceNote>
        </section>
      )}

      {/* 5. Construction by decade */}
      <div>
        <h2 className="section-heading">How {label} was built</h2>
        <p className="text-sm text-text-muted mb-4">
          {NEIGHBORHOOD_ERA_LABELS[slug]
            ? `The ${label} was built primarily during the ${NEIGHBORHOOD_ERA_LABELS[slug].toLowerCase()}.`
            : "Construction in this neighborhood spanned multiple decades, as shown below."}
        </p>
        <ConstructionByDecadeChart rows={detail.decadeRows} />
        <InlineSourceNote className="mt-3">Cook County Assessor build-year data. Properties with unknown build year are excluded.</InlineSourceNote>
      </div>

      {/* 6. Market history chart */}
      {marketHistory.length >= 3 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <SaleIcon size={14} strokeWidth={1.8} className="text-text-muted" aria-hidden="true" />
            <h2 className="section-heading !mb-0">Home sales in this neighborhood</h2>
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

      {/* 7. Highlight reel */}
      <HighlightReel
        scope="neighborhood"
        scopeId={neighborhoodId}
        groups={NEIGHBORHOOD_HIGHLIGHTS}
        limit={5}
      />

      {/* 8. Streets list */}
      {detail.streets && detail.streets.length > 0 && (
        <div>
          <h2 className="section-heading">Streets in {label}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {detail.streets.map((street) => (
              <EntityCard
                key={street.name}
                href={`/streets/${encodeURIComponent(street.name)}`}
                title={street.displayName}
                meta={street.parcelCount ? formatCount(street.parcelCount, "property", "properties") : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {/* 9. Explore more */}
      <div className="pt-6 border-t border-surface-border">
        <h2 className="section-heading">Explore more</h2>
        <div className="space-y-3">
          <div>
            <Link href="/" className="text-accent-purple hover:underline">
              Search for a property in this neighborhood →
            </Link>
          </div>
          <div>
            <Link href="/city" className="text-accent-purple hover:underline">
              See Park Ridge city history →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
