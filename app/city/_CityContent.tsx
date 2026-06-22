"use client";

import React, { useState, useEffect } from "react";
import { StatGrid } from "@/components/ui/StatGrid";
import { ConstructionByDecadeChart } from "@/components/ui/ConstructionByDecadeChart";
import { MarketHistoryChart } from "@/components/ui/MarketHistoryChart";
import { AssessmentTrendChart } from "@/components/ui/AssessmentTrendChart";
import { AppealsChart } from "@/components/ui/AppealsChart";
import { PermitActivityChart } from "@/components/ui/PermitActivityChart";
import Link from "next/link";
import { LoadingSkeleton } from "@/components/ui/EmptyState";
import { SubdivisionPlatChart } from "@/components/ui/SubdivisionPlatChart";
import { EntityCard } from "@/components/ui/EntityCard";
import { formatNumber } from "@/lib/formatters";
import { getEraColor } from "@/lib/mapConfig";
import { CITY_NARRATIVE } from "@/lib/content";
import { SaleIcon, AssessmentIcon, ComparisonIcon, PermitIcon } from "@/lib/icons";
import type { DecadeRow } from "@/components/ui/ConstructionByDecadeChart";
import type { NeighborhoodSummary } from "@/lib/data/neighborhoods";
import type {
  MarketHistoryRow,
  AssessmentTrendRow,
  AppealsRow,
  PermitActivityRow,
} from "@/lib/supabase/cityQueries";
import type { CityTownship } from "@/lib/data/pinGroups";

type HomeStatsSnapshot = {
  totalProperties: number;
  oldestYear: number | null;
  newestYear: number | null;
  pre1945Count: number;
  pre1945Pct: number;
  yearBuiltKnown: number;
  yearBuiltPct: number;
};

export function CityContent({ townships = [], mapSlot }: { townships?: CityTownship[]; mapSlot?: React.ReactNode }) {
  const [stats, setStats] = useState<HomeStatsSnapshot | null>(null);
  const [rows, setRows] = useState<DecadeRow[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<NeighborhoodSummary[]>([]);
  const [marketHistory, setMarketHistory] = useState<MarketHistoryRow[]>([]);
  const [assessmentTrend, setAssessmentTrend] = useState<AssessmentTrendRow[]>([]);
  const [appealsByYear, setAppealsByYear] = useState<AppealsRow[]>([]);
  const [permitActivity, setPermitActivity] = useState<PermitActivityRow[]>([]);
  const [subdivisions, setSubdivisions] = useState<Array<{ id: string; name: string; normalizedName: string; earliestBuilt: number | null }>>([]);
  const [platByDecade, setPlatByDecade] = useState<Array<{ decade: number; platCount: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      import("@/lib/supabase/homeQueries").then((m) => m.fetchHomeStats()),
      import("@/lib/supabase/homeQueries").then((m) => m.fetchDecadeDistribution()),
      import("@/lib/data/neighborhoods").then((m) => m.fetchNeighborhoodSummaries()),
      import("@/lib/supabase/cityQueries").then((m) => m.fetchMarketHistory()),
      import("@/lib/supabase/cityQueries").then((m) => m.fetchAssessmentTrend()),
      import("@/lib/supabase/cityQueries").then((m) => m.fetchAppealsByYear()),
      import("@/lib/supabase/cityQueries").then((m) => m.fetchPermitActivity()),
      import("@/lib/supabase/subdivisionQueries").then((m) => m.fetchSubdivisionsForCityList()),
      import("@/lib/supabase/subdivisionQueries").then((m) => m.fetchSubdivisionPlatByDecade()),
    ])
      .then(([s, d, n, mh, at, ay, pa, subdivList, platDecade]) => {
        if (s) setStats(s as unknown as HomeStatsSnapshot);
        setRows(d.map((r) => ({ decade: r.decade, count: r.count })));
        setNeighborhoods(
          [...n].sort((a, b) => (a.medianYear ?? 9999) - (b.medianYear ?? 9999))
        );
        setMarketHistory(mh);
        setAssessmentTrend(at);
        setAppealsByYear(ay);
        setPermitActivity(pa);
        setSubdivisions(subdivList);
        setPlatByDecade(platDecade);
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton rows={4} />;
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
      <p className="text-text-secondary leading-relaxed max-w-prose">{CITY_NARRATIVE}</p>

      <StatGrid columns={4} stats={statItems.slice(0, 4)} />

      {mapSlot}

      <div>
        <p className="section-heading">When Park Ridge was built, wave by wave</p>
        <ConstructionByDecadeChart rows={rows} />
      </div>

      {/* Market history */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <SaleIcon size={14} strokeWidth={1.8} className="text-text-muted" aria-hidden="true" />
          <p className="section-heading !mb-0">Park Ridge home sales, 2000 to 2025</p>
        </div>
        <p className="text-sm text-text-muted mb-4">
          Bars show annual sales volume. Line shows median sale price. Market sales only, $50K to $5M.
        </p>
        <div className="-mx-[clamp(1rem,4vw,3rem)]">
          <MarketHistoryChart data={marketHistory} />
        </div>
      </section>

      {/* Assessment trend */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <AssessmentIcon size={14} strokeWidth={1.8} className="text-text-muted" aria-hidden="true" />
          <p className="section-heading !mb-0">Average assessed value, 1999 to 2025</p>
        </div>
        <p className="text-sm text-text-muted mb-4">
          Certified totals from Cook County. Dashed lines mark triennial reassessment years.
        </p>
        <div className="-mx-[clamp(1rem,4vw,3rem)]">
          <AssessmentTrendChart data={assessmentTrend} />
        </div>
      </section>

      {/* Appeals */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <ComparisonIcon size={14} strokeWidth={1.8} className="text-text-muted" aria-hidden="true" />
          <p className="section-heading !mb-0">Assessment appeals filed by year</p>
        </div>
        <p className="text-sm text-text-muted mb-4">
          Spikes follow reassessment years as residents push back on new valuations.
        </p>
        <AppealsChart data={appealsByYear} />
      </section>

      {/* Permit activity */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <PermitIcon size={14} strokeWidth={1.8} className="text-text-muted" aria-hidden="true" />
          <p className="section-heading !mb-0">Building permits, 2019 to 2026</p>
        </div>
        <p className="text-sm text-text-muted mb-4">
          Residential permits in purple, commercial in slate. The 2020 to 2021 renovation surge is visible.
        </p>
        <PermitActivityChart data={permitActivity} />
      </section>

      {neighborhoods.length > 0 && (
        <div>
          <p className="section-heading">Development by neighborhood</p>
          <p className="text-sm text-text-muted mb-4">
            Sorted from oldest to newest median build year.
          </p>
          <div className="bg-surface-card border border-surface-border rounded-lg overflow-hidden">
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
      )}

      {(subdivisions.length > 0 || platByDecade.length > 0) && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <p className="section-heading !mb-0">How Park Ridge was platted</p>
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
            </div>
          )}
        </section>
      )}

      {/* Browse by section */}
      {townships.length > 0 && (
        <section>
          <p className="section-heading">Browse by section</p>
          <div className="space-y-8">
            {townships.map((twp) => (
              <div key={twp.prefix}>
                <div className="flex items-center gap-3 mb-3">
                  <Link
                    href={`/pin/${twp.prefix}`}
                    className="text-sm font-semibold text-text-primary hover:text-accent-purple transition-colors"
                  >
                    Township {twp.prefix}
                  </Link>
                  <span className="text-xs text-text-muted">
                    {twp.parcelCount.toLocaleString()} properties
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                  {twp.sections.map((sec) => (
                    <Link
                      key={sec.sectionPrefix}
                      href={`/pin/${sec.sectionPrefix}`}
                      className="bg-surface-card border border-surface-border rounded-lg p-4 hover:border-accent-purple/40 transition-colors block"
                    >
                      <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">
                        Section {sec.sectionSegment}
                      </p>
                      <p className="text-base font-semibold text-text-primary tabular-nums leading-tight">
                        {sec.count.toLocaleString()}
                      </p>
                      <p className="text-xs text-text-muted">properties</p>
                      {sec.oldestYear && (
                        <p className="text-xs text-text-muted mt-1">Est. {sec.oldestYear}</p>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
