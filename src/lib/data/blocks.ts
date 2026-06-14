/**
 * Data access layer — blocks.
 *
 * Blocks are groups of parcels sharing a street_block_id, which is derived
 * from Census block group data. They are NOT official city blocks.
 *
 * All block queries operate against the in-memory parcels collection loaded
 * from Supabase by useParkRidgeData(). There is no separate Supabase table
 * for blocks at this time.
 *
 * TODO: If block-level aggregations become expensive, consider materializing
 * a blocks summary table in Supabase.
 */

import type { ParcelFeature } from "../parcelTypes";

// ─── Types ───────────────────────────────────────────────────────────────────

export type BlockSummary = {
  blockId: string;
  /** Derived label from the first address on the block */
  label: string;
  propertyCount: number;
  medianYearBuilt: number | null;
  oldestYearBuilt: number | null;
  newestYearBuilt: number | null;
  totalPermits: number;
  totalSales: number;
  latestSaleYear: number | null;
  latestPermitYear: number | null;
  averageAssessedValue: number | null;
};

// ─── Public API ──────────────────────────────────────────────────────────────

/** Get all properties that belong to a given block. */
export function getBlockProperties(
  parcels: ParcelFeature[],
  blockId: string
): ParcelFeature[] {
  return parcels.filter((f) => f.properties.street_block_id === blockId);
}

/** Derive a human-readable label for a block from its parcels. */
export function getBlockLabel(blockParcels: ParcelFeature[], blockId: string): string {
  const firstAddr = blockParcels[0]?.properties.address ?? "";
  const streetName = firstAddr.split(" ").slice(1).join(" ");
  return streetName || `Block ${blockId}`;
}

/** Summarize all unique blocks from a parcel collection. */
export function getAllBlockSummaries(parcels: ParcelFeature[]): BlockSummary[] {
  const map = new Map<string, ParcelFeature[]>();

  for (const f of parcels) {
    const id = f.properties.street_block_id;
    if (!id) continue;
    const bucket = map.get(id);
    if (bucket) bucket.push(f);
    else map.set(id, [f]);
  }

  return Array.from(map.entries()).map(([blockId, features]) =>
    summarizeBlock(blockId, features)
  );
}

/** Build a summary object for a single block's parcel list. */
export function summarizeBlock(
  blockId: string,
  features: ParcelFeature[]
): BlockSummary {
  const years = features
    .map((f) => f.properties.year_built)
    .filter((y): y is number => typeof y === "number" && y >= 1800 && y <= 2026)
    .sort((a, b) => a - b);

  const assessedValues = features
    .map((f) => f.properties.latest_assessed_total)
    .filter((v): v is number => typeof v === "number" && v > 0);

  const latestSaleYears = features
    .map((f) => f.properties.latest_sale_year)
    .filter((y): y is number => typeof y === "number");

  const latestPermitYears = features
    .map((f) => f.properties.latest_permit_year)
    .filter((y): y is number => typeof y === "number");

  return {
    blockId,
    label: getBlockLabel(features, blockId),
    propertyCount: features.length,
    medianYearBuilt: years.length > 0 ? median(years) : null,
    oldestYearBuilt: years[0] ?? null,
    newestYearBuilt: years[years.length - 1] ?? null,
    totalPermits: features.reduce((s, f) => s + (f.properties.permit_count ?? 0), 0),
    totalSales: features.reduce((s, f) => s + (f.properties.sale_count ?? 0), 0),
    latestSaleYear: latestSaleYears.length ? Math.max(...latestSaleYears) : null,
    latestPermitYear: latestPermitYears.length ? Math.max(...latestPermitYears) : null,
    averageAssessedValue:
      assessedValues.length
        ? Math.round(assessedValues.reduce((s, v) => s + v, 0) / assessedValues.length)
        : null,
  };
}

function median(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}
