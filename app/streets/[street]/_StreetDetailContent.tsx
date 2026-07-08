"use client";

import React, { useState, useEffect } from "react";
import { StatGrid } from "@/components/ui/StatGrid";
import { EntityCard, UnresolvableEntityCard } from "@/components/ui/EntityCard";
import { LoadingSkeleton, EmptyState } from "@/components/ui/EmptyState";
import { HighlightReel } from "@/components/ui/HighlightReel";
import { DecadeGroup } from "@/components/ui/DecadeGroup";
import { ConstructionByDecadeChart } from "@/components/ui/ConstructionByDecadeChart";
import { InlineSourceNote } from "@/components/ui/SourceNote";
import { HistoricalFactsPanel } from "@/components/ui/HistoricalFactsPanel";
import { formatNumber, formatAddress, formatCount } from "@/lib/formatters";
import { getEraColor } from "@/lib/mapConfig";
import { getStreetDetail } from "@/lib/data/streets";
import { getHistoricalFactsForStreet, type HistoricalFact } from "@/lib/data/historicalFacts";
import type { HighlightGroup } from "@/components/ui/HighlightReel";

const STREET_HIGHLIGHTS: readonly HighlightGroup[] = [
  { heading: "Oldest homes on this street", category: "oldest" },
  { heading: "Most permit activity", category: "most_active" },
  { heading: "Most recently sold", category: "most_recent_sale" },
  { heading: "Largest homes on this street", category: "largest" },
];

type Props = { streetName: string; displayName: string; mapSlot?: React.ReactNode };

export function StreetDetailContent({ streetName, displayName, mapSlot }: Props) {
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getStreetDetail>> | null>(null);
  const [historicalFacts, setHistoricalFacts] = useState<HistoricalFact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([
      getStreetDetail(streetName),
      getHistoricalFactsForStreet(streetName),
    ])
      .then(([streetDetail, facts]) => {
        setDetail(streetDetail);
        setHistoricalFacts(facts);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [streetName]);

  if (loading) return <LoadingSkeleton rows={3} />;
  if (error) return <EmptyState heading="Unable to load street data" body="Try refreshing the page." />;
  if (!detail) return null;

  const statItems = [
    { value: formatNumber(detail.parcelCount), label: "Properties" },
    detail.oldestYear ? { value: String(detail.oldestYear), label: "Oldest recorded" } : null,
    detail.medianYear ? { value: String(detail.medianYear), label: "Typical build year" } : null,
  ].filter((s): s is { value: string; label: string } => s !== null);

  return (
    <div className="space-y-10">
      {historicalFacts.length > 0 && <HistoricalFactsPanel facts={historicalFacts} />}

      <StatGrid columns={(Math.max(2, Math.min(statItems.length, 4))) as 2 | 3 | 4} stats={statItems} />

      {mapSlot && (
        <div>
          <h2 className="section-heading">Street map</h2>
          {mapSlot}
        </div>
      )}

      {(detail.medianYear || detail.eraSpan) && (
        <div>
          <h2 className="section-heading">How {displayName} was built</h2>
          <p className="text-sm text-text-secondary">
            {detail.medianYear
              ? `Built primarily in the ${Math.floor(detail.medianYear / 10) * 10}s`
              : `Homes here were built`}
            {detail.eraSpan
              ? `, with homes spanning ${detail.eraSpan}.`
              : `.`}
          </p>
        </div>
      )}

      {detail.decadeRows.length > 0 && (
        <div>
          <ConstructionByDecadeChart rows={detail.decadeRows} />
          <InlineSourceNote className="mt-3">
            Cook County Assessor build-year data.
          </InlineSourceNote>
        </div>
      )}

      <HighlightReel
        scope="street"
        scopeId={streetName}
        groups={STREET_HIGHLIGHTS}
        limit={5}
      />

      <div>
        <h2 className="section-heading">All properties on {displayName}</h2>
        <DecadeGroup
          items={detail.parcels}
          getYear={(p) => p.yearBuilt ?? null}
          getKey={(p) => p.pin}
          formatCount={(count) => formatCount(count, "property", "properties")}
          renderItem={(p) =>
            !p.address ? (
              <UnresolvableEntityCard pin={p.pin} />
            ) : (
              <EntityCard
                href={`/properties/${encodeURIComponent(p.pin)}`}
                title={formatAddress(p.address)}
                meta={p.yearBuilt ? `Built ${p.yearBuilt}` : undefined}
                eraSwatch={getEraColor(p.yearBuilt)}
                isTeardownRebuild={p.isTeardownRebuild}
                teardownConfidence={p.teardownConfidence}
                hasDeedNotes={p.hasDeedNotes}
              />
            )
          }
        />
        <InlineSourceNote className="mt-3">
          Cook County Assessor parcel records, matched by street name.
        </InlineSourceNote>
      </div>
    </div>
  );
}
