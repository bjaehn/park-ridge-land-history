"use client";

import React, { useState, useEffect } from "react";
import { StatGrid } from "@/components/ui/StatGrid";
import { ConstructionByDecadeChart } from "@/components/ui/ConstructionByDecadeChart";
import { MarketHistoryChart } from "@/components/ui/MarketHistoryChart";
import { AssessmentTrendChart } from "@/components/ui/AssessmentTrendChart";
import Link from "next/link";
import { LoadingSkeleton, EmptyState } from "@/components/ui/EmptyState";
import { SubdivisionPlatChart } from "@/components/ui/SubdivisionPlatChart";
import { EntityCard } from "@/components/ui/EntityCard";
import { formatNumber } from "@/lib/formatters";
import { getEraColor } from "@/lib/mapConfig";
import { CITY_NARRATIVE, CITY_NARRATIVE_SOURCE_NOTE } from "@/lib/content";
import { InlineSourceNote } from "@/components/ui/SourceNote";
import { HistoricalFactsPanel } from "@/components/ui/HistoricalFactsPanel";
import { CommunityProfilePanel } from "@/components/ui/CommunityProfilePanel";
import { SaleIcon, AssessmentIcon } from "@/lib/icons";
import type { DecadeRow } from "@/components/ui/ConstructionByDecadeChart";
import type { NeighborhoodSummary } from "@/lib/data/neighborhoods";
import type { HistoricalFact } from "@/lib/data/historicalFacts";
import type {
  MarketHistoryRow,
  AssessmentTrendRow,
} from "@/lib/supabase/cityQueries";

type HomeStatsSnapshot = {
  totalProperties: number;
  oldestYear: number | null;
  newestYear: number | null;
  pre1945Count: number;
  pre1945Pct: number;
  yearBuiltKnown: number;
  yearBuiltPct: number;
};

export function CityContent({ mapSlot }: { mapSlot?: React.ReactNode }) {
  const [stats, setStats] = useState<HomeStatsSnapshot | null>(null);
  const [rows, setRows] = useState<DecadeRow[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<NeighborhoodSummary[]>([]);
  const [marketHistory, setMarketHistory] = useState<MarketHistoryRow[]>([]);
  const [assessmentTrend, setAssessmentTrend] = useState<AssessmentTrendRow[]>([]);
  const [subdivisions, setSubdivisions] = useState<Array<{ id: string; name: string; normalizedName: string; earliestBuilt: number | null }>>([]);
  const [platByDecade, setPlatByDecade] = useState<Array<{ decade: number; platCount: number }>>([]);
  const [historicalFacts, setHistoricalFacts] = useState<HistoricalFact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([
      import("@/lib/supabase/homeQueries").then((m) => m.fetchHomeStats()),
      import("@/lib/supabase/homeQueries").then((m) => m.fetchDecadeDistribution()),
      import("@/lib/data/neighborhoods").then((m) => m.fetchNeighborhoodSummaries()),
      import("@/lib/supabase/cityQueries").then((m) => m.fetchMarketHistory()),
      import("@/lib/supabase/cityQueries").then((m) => m.fetchAssessmentTrend()),
      import("@/lib/supabase/subdivisionQueries").then((m) => m.fetchSubdivisionsForCityList()),
      import("@/lib/supabase/subdivisionQueries").then((m) => m.fetchSubdivisionPlatByDecade()),
      import("@/lib/data/historicalFacts").then((m) => m.getCityWideHistoricalFacts()),
    ])
      .then(([s, d, n, mh, at, subdivList, platDecade, facts]) => {
        if (s) setStats(s as unknown as HomeStatsSnapshot);
        setRows(d.map((r) => ({ decade: r.decade, count: r.count })));
        setNeighborhoods(
          [...n].sort((a, b) => (a.medianYear ?? 9999) - (b.medianYear ?? 9999))
        );
        setMarketHistory(mh);
        setAssessmentTrend(at);
        setSubdivisions(subdivList);
        setPlatByDecade(platDecade);
        setHistoricalFacts(facts);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton rows={4} />;
  if (error) return <EmptyState heading="Unable to load city data" body="Try refreshing the page." />;
  if (!stats) return null;

  const statItems = [
    { value: formatNumber(stats.totalProperties), label: "Properties" },
    stats.oldestYear != null
      ? { value: String(stats.oldestYear), label: "Oldest recorded build year" }
      : null,
    stats.pre1945Count > 0
      ? {
          value: formatNumber(stats.pre1945Count),
          label: "Built before 1945",
          note: `${stats.pre1945Pct}% of all properties`,
        }
      : null,
    stats.yearBuiltKnown > 0
      ? { value: `${stats.yearBuiltPct}%`, label: "Build year on record" }
      : null,
  ].filter((s): s is { value: string; label: string; note?: string } => s !== null);

  return (
    <div className="space-y-10">
      <p className="text-text-secondary leading-relaxed">{CITY_NARRATIVE}</p>
      <InlineSourceNote className="mt-2">{CITY_NARRATIVE_SOURCE_NOTE}</InlineSourceNote>

      {historicalFacts.length > 0 && (
        <div>
          <HistoricalFactsPanel facts={historicalFacts} heading="Planning history" />
          <InlineSourceNote className="mt-1">
            Comprehensive Plan for the City of Park Ridge (Teska Associates, Inc., 1996) and Park
            Ridge Wonderful: The City of Park Ridge's Comprehensive Plan of 2020.
          </InlineSourceNote>
        </div>
      )}

      <CommunityProfilePanel />

      <StatGrid columns={4} stats={statItems.slice(0, 4)} />

      {mapSlot}

      <div>
        <h2 className="section-heading">How Park Ridge was built</h2>
        <p className="text-sm text-text-muted mb-4">
          Park Ridge's housing stock reflects three distinct construction waves: the railroad-era 1870s-1880s, the interwar bungalow boom of the 1910s-1930s, and the postwar expansion of the 1940s-1960s.
        </p>
        <ConstructionByDecadeChart rows={rows} />
        <InlineSourceNote className="mt-3">Cook County Assessor build-year data.</InlineSourceNote>
      </div>

      {/* Market history */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <SaleIcon size={14} strokeWidth={1.8} className="text-text-muted" aria-hidden="true" />
          <h2 className="section-heading !mb-0">Park Ridge home sales, 2000 to 2025</h2>
        </div>
        <p className="text-sm text-text-muted mb-4">
          Bars show annual sales volume. Line shows median sale price. Market sales only, $50K to $5M.
        </p>
        <div className="-mx-[clamp(1rem,4vw,3rem)]">
          <MarketHistoryChart data={marketHistory} />
        </div>
        <InlineSourceNote className="mt-3">Cook County Recorder of Deeds.</InlineSourceNote>
      </section>

      {/* Assessment trend */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <AssessmentIcon size={14} strokeWidth={1.8} className="text-text-muted" aria-hidden="true" />
          <h2 className="section-heading !mb-0">Average assessed value, 1999 to 2025</h2>
        </div>
        <p className="text-sm text-text-muted mb-4">
          Certified totals from Cook County. Dashed lines mark triennial reassessment years.
        </p>
        <div className="-mx-[clamp(1rem,4vw,3rem)]">
          <AssessmentTrendChart data={assessmentTrend} />
        </div>
        <InlineSourceNote className="mt-3">Cook County Assessor certified totals.</InlineSourceNote>
      </section>

      {neighborhoods.length > 0 && (
        <div>
          <h2 className="section-heading">Development by neighborhood</h2>
          <p className="text-sm text-text-muted mb-4">
            Sorted from oldest to newest median build year.
          </p>
          <div className="bg-surface-card border border-surface-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="text-left px-4 py-3 text-text-secondary font-medium">
                    Neighborhood
                  </th>
                  <th className="text-right px-4 py-3 text-text-secondary font-medium">
                    Properties
                  </th>
                  <th className="text-right px-4 py-3 text-text-secondary font-medium">
                    Typical build year
                  </th>
                </tr>
              </thead>
              <tbody>
                {neighborhoods.map((n) => (
                  <tr key={n.id} className="border-b border-surface-border last:border-0">
                    <td className="px-4 py-3">
                      <a
                        href={`/neighborhoods/${encodeURIComponent(n.slug)}`}
                        className="text-text-primary hover:text-accent-purple transition-colors"
                      >
                        {n.label}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-right text-text-secondary tabular-nums">
                      {formatNumber(n.parcelCount)}
                    </td>
                    <td className="px-4 py-3 text-right text-text-secondary tabular-nums">
                      {n.medianYear ?? "Unknown"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {(subdivisions.length > 0 || platByDecade.length > 0) && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-heading !mb-0">How Park Ridge was platted</h2>
            <Link href="/subdivisions" className="text-sm text-accent-purple hover:underline shrink-0">
              View all →
            </Link>
          </div>
          <p className="text-sm text-text-muted mb-6">
            Park Ridge's land was divided and redivided across nearly a century.
            The 1910s and 1920s brought the densest wave of original plats; later decades
            saw additions and resubdivisions carve existing blocks into finer parcels.
          </p>

          {subdivisions.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {subdivisions.map((s) => (
                <EntityCard
                  key={s.id}
                  href={`/subdivisions/${encodeURIComponent(s.id)}`}
                  title={s.name}
                  eyebrow="Subdivision"
                  meta={s.earliestBuilt ? `First built ${s.earliestBuilt}` : undefined}
                  eraSwatch={s.earliestBuilt ? (getEraColor(s.earliestBuilt) ?? undefined) : undefined}
                />
              ))}
            </div>
          )}

          {platByDecade.length > 0 && (
            <div className="mt-8 mb-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
                Plats recorded by decade
              </p>
              <SubdivisionPlatChart data={platByDecade} />
              <InlineSourceNote className="mt-3">Cook County Recorder of Deeds.</InlineSourceNote>
            </div>
          )}
        </section>
      )}

    </div>
  );
}
