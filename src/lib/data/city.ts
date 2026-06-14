/**
 * Data access layer — city / Park Ridge overview.
 *
 * Citywide aggregations derived from the full parcel collection.
 * All computations run client-side from the loaded parcels.
 *
 * TODO: If performance becomes a concern, materialize these aggregations
 * as Supabase views or Edge Functions.
 */

import type { ParcelCollection } from "../parcelTypes";
import { computeDataCoverage } from "../dataCoverage";
import {
  computeTopPermitted,
  computeTopOldest,
  computeTopAssessedChange,
  type RankedInsightList
} from "../rankedInsights";

// ─── Types ───────────────────────────────────────────────────────────────────

export type CityGrowthSummary = {
  totalProperties: number;
  yearBuiltCoverage: number;
  permitsCoverage: number;
  salesCoverage: number;
  assessmentCoverage: number;
  peakDecade: string | null;
  peakDecadeCount: number;
  pre1945Count: number;
  pre1945Pct: number;
  post2000Count: number;
  post2000Pct: number;
  decadeStats: Array<{ decade: string; count: number; percent: number }>;
};

export type CityRankedInsights = {
  topOldest: RankedInsightList;
  topPermitted: RankedInsightList;
  topAssessedChange: RankedInsightList;
};

// ─── Public API ──────────────────────────────────────────────────────────────

/** Compute the city-wide growth summary from the parcel collection. */
export function getCityGrowthSummary(parcels: ParcelCollection | null): CityGrowthSummary {
  if (!parcels || parcels.features.length === 0) {
    return {
      totalProperties: 0,
      yearBuiltCoverage: 0,
      permitsCoverage: 0,
      salesCoverage: 0,
      assessmentCoverage: 0,
      peakDecade: null,
      peakDecadeCount: 0,
      pre1945Count: 0,
      pre1945Pct: 0,
      post2000Count: 0,
      post2000Pct: 0,
      decadeStats: []
    };
  }

  const coverage = computeDataCoverage(parcels);
  const features = parcels.features;
  const total = features.length;

  const pre1945Count = features.filter(
    (f) => typeof f.properties.year_built === "number" && f.properties.year_built < 1945
  ).length;

  const post2000Count = features.filter(
    (f) => typeof f.properties.year_built === "number" && f.properties.year_built >= 2000
  ).length;

  const decadeCounts = new Map<string, number>();
  let knownTotal = 0;
  for (const f of features) {
    const decade = f.properties.decade_built;
    if (!decade || decade === "Unknown" || decade === "Suspicious") continue;
    decadeCounts.set(decade, (decadeCounts.get(decade) ?? 0) + 1);
    knownTotal++;
  }

  const decadeStats = Array.from(decadeCounts.entries())
    .map(([decade, count]) => ({
      decade,
      count,
      percent: knownTotal > 0 ? Math.round((count / knownTotal) * 100) : 0
    }))
    .sort((a, b) => a.decade.localeCompare(b.decade));

  const peakEntry = decadeStats.reduce<{ decade: string; count: number } | null>(
    (best, d) => (best === null || d.count > best.count ? d : best),
    null
  );

  return {
    totalProperties: total,
    yearBuiltCoverage: coverage.yearBuiltPct,
    permitsCoverage: coverage.permitsPct,
    salesCoverage: coverage.salesPct,
    assessmentCoverage: coverage.assessedPct ?? 0,
    peakDecade: peakEntry?.decade ?? null,
    peakDecadeCount: peakEntry?.count ?? 0,
    pre1945Count,
    pre1945Pct: total > 0 ? Math.round((pre1945Count / total) * 100) : 0,
    post2000Count,
    post2000Pct: total > 0 ? Math.round((post2000Count / total) * 100) : 0,
    decadeStats
  };
}

/** Compute the three ranked insight lists for the city page. */
export function getCityRankedInsights(
  parcels: ParcelCollection | null,
  limit = 10
): CityRankedInsights {
  const features = parcels?.features ?? [];
  return {
    topOldest: computeTopOldest(features, limit),
    topPermitted: computeTopPermitted(features, limit),
    topAssessedChange: computeTopAssessedChange(features, limit)
  };
}
