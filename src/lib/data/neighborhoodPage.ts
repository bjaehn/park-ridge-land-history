/**
 * Data access layer for the neighborhood detail page.
 *
 * All data is fetched server-side in three parallel rounds:
 *   Round 1 - identity (meta by slug)
 *   Round 2 - stats, build history, linked subdivisions, map data (all parallel)
 *   Round 3 - sales data (depends on pins from Round 2)
 *
 * No client-side fetching is needed; all data is passed as props.
 */

import { supabase } from "../supabase/client";
import { fetchNeighborhoodPins, fetchNeighborhoodBbox } from "./neighborhoods";
import { fetchSubdivisionMarketHistory } from "../supabase/subdivisionQueries";
import { fetchBlockSalesByYear } from "../supabase/blockQueries";
import type { NeighborhoodType } from "./neighborhoods";
import type { DecadeRow } from "../../components/ui/ConstructionByDecadeChart";
import type { MarketHistoryRow } from "../supabase/cityQueries";
import type { BlockSalesByYear } from "../supabase/blockQueries";

export type { MarketHistoryRow, BlockSalesByYear };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NeighborhoodMeta = {
  id: string;
  label: string;
  slug: string;
  neighborhoodType: NeighborhoodType | null;
  historicalSummary: string | null;
  establishedYear: number | null;
};

export type NeighborhoodStats = {
  parcelCount: number;
  medianYear: number | undefined;
  totalPermits: number | undefined;
  totalSales: number | undefined;
  recentTeardowns: number | undefined;
};

export type StreetRow = {
  name: string;
  displayName: string;
  parcelCount: number;
};

export type NeighborhoodBuildHistory = {
  decadeRows: DecadeRow[];
  streets: StreetRow[];
};

export type LinkedSubdivision = {
  linkId: string;
  subdivisionId: string;
  name: string;
  recordedYear: number | null;
  confidenceLevel: string | null;
  relationshipType: string | null;
};

export type NeighborhoodPageData = {
  meta: NeighborhoodMeta;
  stats: NeighborhoodStats;
  buildHistory: NeighborhoodBuildHistory;
  linkedSubdivisions: LinkedSubdivision[];
  mapData: { pins: string[]; bbox: [number, number, number, number] | null };
  salesHistory: MarketHistoryRow[];
  priceSummary: BlockSalesByYear;
};

// ---------------------------------------------------------------------------
// Round 1: identity (direct slug lookup, no all-neighborhood scan)
// ---------------------------------------------------------------------------

type RawNeighborhood = {
  id: string;
  label: string;
  slug: string | null;
  neighborhood_type: string | null;
  historical_summary: string | null;
  established_year: number | null;
};

function mapToMeta(raw: RawNeighborhood, fallbackSlug: string): NeighborhoodMeta {
  return {
    id: raw.id,
    label: raw.label,
    slug: raw.slug ?? fallbackSlug,
    neighborhoodType: (raw.neighborhood_type as NeighborhoodType) ?? null,
    historicalSummary: raw.historical_summary ?? null,
    establishedYear: raw.established_year ?? null,
  };
}

export async function getNeighborhoodMeta(slug: string): Promise<NeighborhoodMeta | null> {
  if (!supabase) return null;

  const COLUMNS = "id, label, slug, neighborhood_type, historical_summary, established_year";

  // Direct slug lookup
  try {
    const { data } = await supabase
      .from("neighborhoods")
      .select(COLUMNS)
      .eq("slug", slug)
      .single();
    if (data) return mapToMeta(data as RawNeighborhood, slug);
  } catch { /* fall through to ID-pattern fallback */ }

  // slug column is null: try common ID prefixes derived from the slug
  for (const prefix of ["official_planning", "business_district", "local_market", "neighborhood"]) {
    try {
      const { data } = await supabase
        .from("neighborhoods")
        .select(COLUMNS)
        .eq("id", `${prefix}:${slug}`)
        .maybeSingle();
      if (data) return mapToMeta(data as RawNeighborhood, slug);
    } catch { /* try next prefix */ }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Round 2a: parcel stats
// TODO: a dedicated neighborhood_stats(p_id text) RPC would avoid loading all
//       neighborhoods here. For now this reuses the index-page RPC.
// ---------------------------------------------------------------------------

function emptyStats(): NeighborhoodStats {
  return {
    parcelCount: 0,
    medianYear: undefined,
    totalPermits: undefined,
    totalSales: undefined,
    recentTeardowns: undefined,
  };
}

export async function getNeighborhoodStats(id: string): Promise<NeighborhoodStats> {
  if (!supabase) return emptyStats();
  try {
    const { data, error } = await supabase.rpc("neighborhood_summaries");
    if (error || !data) return emptyStats();
    const rows = data as Array<Record<string, unknown>>;
    const row = rows.find((r) => String(r.neighborhood_id) === id);
    if (!row) return emptyStats();
    return {
      parcelCount: Number(row.parcel_count ?? 0),
      medianYear: row.median_year ? Number(row.median_year) : undefined,
      totalPermits: row.total_permits ? Number(row.total_permits) : undefined,
      totalSales: row.total_sales ? Number(row.total_sales) : undefined,
      recentTeardowns: row.recent_teardowns ? Number(row.recent_teardowns) : undefined,
    };
  } catch {
    return emptyStats();
  }
}

// ---------------------------------------------------------------------------
// Round 2b: construction decade distribution + streets (parallel)
// ---------------------------------------------------------------------------

export async function getNeighborhoodBuildHistory(id: string): Promise<NeighborhoodBuildHistory> {
  if (!supabase) return { decadeRows: [], streets: [] };

  const [decadeResult, streetResult] = await Promise.allSettled([
    supabase.rpc("neighborhood_decade_distribution", { p_neighborhood_id: id }),
    supabase.rpc("neighborhood_streets", { p_neighborhood_id: id }),
  ]);

  const decadeRows: DecadeRow[] =
    decadeResult.status === "fulfilled" &&
    !decadeResult.value.error &&
    decadeResult.value.data
      ? (decadeResult.value.data as Array<{ decade: string; count: number }>).map((r) => ({
          decade: r.decade,
          count: Number(r.count),
        }))
      : [];

  const streets: StreetRow[] =
    streetResult.status === "fulfilled" &&
    !streetResult.value.error &&
    streetResult.value.data
      ? (
          streetResult.value.data as Array<{
            street_name: string;
            display_name: string;
            parcel_count: number;
          }>
        ).map((r) => ({
          name: r.street_name,
          displayName: r.display_name,
          parcelCount: Number(r.parcel_count),
        }))
      : [];

  return { decadeRows, streets };
}

// ---------------------------------------------------------------------------
// Round 2c: linked subdivisions via neighborhood_subdivision_links
// ---------------------------------------------------------------------------

export async function getNeighborhoodLinkedSubdivisions(
  id: string
): Promise<LinkedSubdivision[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("neighborhood_subdivision_links")
      .select(
        "id, relationship_type, subdivisions(id, name, recorded_year, confidence_level)"
      )
      .eq("neighborhood_id", id)
      .order("id");
    if (error || !data) return [];

    type RawRow = {
      id: string;
      relationship_type: string | null;
      subdivisions: {
        id: string;
        name: string;
        recorded_year: number | null;
        confidence_level: string | null;
      } | null;
    };

    return (data as unknown as RawRow[])
      .filter(
        (row): row is RawRow & { subdivisions: NonNullable<RawRow["subdivisions"]> } =>
          row.subdivisions !== null
      )
      .map((row) => ({
        linkId: row.id,
        subdivisionId: row.subdivisions.id,
        name: row.subdivisions.name,
        recordedYear: row.subdivisions.recorded_year,
        confidenceLevel: row.subdivisions.confidence_level,
        relationshipType: row.relationship_type,
      }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Round 2d: pins + bbox for the map (parallel)
// ---------------------------------------------------------------------------

export async function getNeighborhoodMapData(
  id: string
): Promise<{ pins: string[]; bbox: [number, number, number, number] | null }> {
  const [pins, bbox] = await Promise.all([
    fetchNeighborhoodPins(id).catch(() => [] as string[]),
    fetchNeighborhoodBbox(id).catch(() => null),
  ]);
  return { pins, bbox };
}

// ---------------------------------------------------------------------------
// Round 3: sales history + price summary (depend on pins from Round 2)
// The pin list is capped at 200 to keep .in() queries safe for large neighborhoods.
// TODO: a dedicated neighborhood_market_history(p_id) RPC would be more efficient.
// ---------------------------------------------------------------------------

export async function getNeighborhoodSalesHistory(
  pins: string[]
): Promise<MarketHistoryRow[]> {
  if (!pins.length) return [];
  return fetchSubdivisionMarketHistory(pins).catch(() => []);
}

export async function getNeighborhoodPriceSummary(
  pins: string[]
): Promise<BlockSalesByYear> {
  if (!pins.length) return { year2015: null, year2024: null, pctChange: null };
  return fetchBlockSalesByYear(pins).catch(() => ({
    year2015: null,
    year2024: null,
    pctChange: null,
  }));
}
