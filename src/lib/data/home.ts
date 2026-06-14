/**
 * Data access layer — home page.
 *
 * All functions operate on the in-memory parcel collection loaded from
 * Supabase by useParkRidgeData(). Heavy aggregations are designed to run
 * once per session via useMemo() in the consuming component.
 *
 * TODO: When the parcel count grows past ~50k, consider materializing
 * these aggregations as Supabase views or Edge Functions.
 */

import type { ParcelFeature } from "../parcelTypes";
import { computeDataCoverage } from "../dataCoverage";
import { getAllBlockSummaries, type BlockSummary } from "./blocks";

// ─── Types ───────────────────────────────────────────────────────────────────

export type HomePageStats = {
  totalProperties: number;
  yearBuiltKnown: number;
  yearBuiltPct: number;
  uniqueBlocks: number;
  historicSurveyCount: number;
  civicRecordCount: number;
  sanbornCount: number;
  salesRecords: number;
  assessmentRecords: number;
  permitRecords: number;
};

export type HomeCityGrowthRow = {
  decade: string;
  count: number;
  percent: number;
  isPeak: boolean;
};

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Compute the key stats shown in the home page stats strip.
 * All values derived directly from indexed parcel records.
 */
export function getHomePageStats(parcels: ParcelFeature[]): HomePageStats {
  if (parcels.length === 0) {
    return {
      totalProperties: 0, yearBuiltKnown: 0, yearBuiltPct: 0,
      uniqueBlocks: 0, historicSurveyCount: 0, civicRecordCount: 0,
      sanbornCount: 0, salesRecords: 0, assessmentRecords: 0, permitRecords: 0,
    };
  }

  const coverage = computeDataCoverage({ type: "FeatureCollection", features: parcels });

  const uniqueBlocks = new Set(
    parcels.map((f) => f.properties.street_block_id).filter(Boolean)
  ).size;

  return {
    totalProperties: coverage.total,
    yearBuiltKnown: coverage.yearBuiltKnown,
    yearBuiltPct: coverage.yearBuiltPct,
    uniqueBlocks,
    historicSurveyCount: parcels.filter((f) => (f.properties.hargis_record_count ?? 0) > 0).length,
    civicRecordCount: parcels.filter((f) => (f.properties.civic_record_count ?? 0) > 0).length,
    sanbornCount: parcels.filter((f) => (f.properties.sanborn_snapshot_count ?? 0) > 0).length,
    salesRecords: coverage.salesAny,
    assessmentRecords: coverage.assessedAny,
    permitRecords: coverage.permitsAny,
  };
}

/**
 * Compute decade-by-decade construction rows for the city growth chart.
 * Excludes "Unknown" and "Suspicious" values.
 * Marks the peak decade.
 */
export function getHomeCityGrowthRows(parcels: ParcelFeature[]): HomeCityGrowthRow[] {
  if (parcels.length === 0) return [];

  const counts = new Map<string, number>();
  let total = 0;

  for (const f of parcels) {
    const decade = f.properties.decade_built;
    if (!decade || decade === "Unknown" || decade === "Suspicious") continue;
    counts.set(decade, (counts.get(decade) ?? 0) + 1);
    total++;
  }

  if (total === 0) return [];

  const rows = Array.from(counts.entries())
    .map(([decade, count]) => ({
      decade,
      count,
      percent: Math.round((count / total) * 100),
      isPeak: false,
    }))
    .sort((a, b) => a.decade.localeCompare(b.decade));

  const maxCount = Math.max(...rows.map((r) => r.count));
  rows.forEach((r) => { r.isPeak = r.count === maxCount; });

  return rows;
}

/**
 * Top N blocks by earliest known construction year.
 * Requires at least 2 properties with known year_built to be included.
 * Based on known records — not a guarantee of true historical order.
 */
export function getOldestBlocks(parcels: ParcelFeature[], limit = 10): BlockSummary[] {
  return getAllBlockSummaries(parcels)
    .filter((b) => b.oldestYearBuilt !== null && b.propertyCount >= 2)
    .sort((a, b) => (a.oldestYearBuilt ?? 9999) - (b.oldestYearBuilt ?? 9999))
    .slice(0, limit);
}
