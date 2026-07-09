/**
 * Supabase queries for the Subdivision History feature.
 *
 * All functions return null or empty arrays gracefully when Supabase is
 * unavailable or when no data exists : the UI handles those states explicitly.
 */

import { supabase } from "./client";
import { computeBlockAssessmentStats } from "./blockQueries";
import type { BlockAssessmentStats } from "./blockQueries";
import type { MarketHistoryRow } from "./cityQueries";
import type {
  Subdivision,
  SubdivisionSummary,
  SubdivisionWithDetail,
  PropertySubdivisionLink,
  SubdivisionTimelineEvent,
  SubdivisionSource,
  SubdivisionQAStats,
  SubdivisionHistoricalFact,
  SubdivisionAlias,
  SubdivisionResearchTask,
  SubdivisionFullDetail,
  HistoricalSubdivisionLineage,
} from "../subdivisionTypes";

// ─── Subdivision index ────────────────────────────────────────────────────────

export async function fetchSubdivisionIndex(): Promise<SubdivisionSummary[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("subdivision_index_view")
    .select(
      "id, name, normalized_name, recorded_year, confidence_level, confidence_reason, " +
      "source_name, original_owner, developer, parcel_count, linked_parcel_count, notes, parent_subdivision_id, entity_type, earliest_year_built"
    )
    .order("earliest_year_built", { ascending: true, nullsFirst: false })
    .order("normalized_name", { ascending: true });

  if (error || !data) return [];
  return data as unknown as SubdivisionSummary[];
}

// ─── Subdivision detail ───────────────────────────────────────────────────────

export async function fetchSubdivisionById(
  id: string
): Promise<SubdivisionWithDetail | null> {
  if (!supabase || !id) return null;

  const [subdivisionResult, eventsResult, sourcesResult] = await Promise.all([
    supabase
      .from("subdivisions")
      .select("*")
      .eq("id", id)
      .single(),
    supabase
      .from("subdivision_timeline_events")
      .select("*")
      .eq("subdivision_id", id)
      .order("event_year", { ascending: true, nullsFirst: false }),
    supabase
      .from("subdivision_sources")
      .select("*")
      .eq("subdivision_id", id),
  ]);

  if (subdivisionResult.error || !subdivisionResult.data) return null;

  const subdivision = subdivisionResult.data as Subdivision;
  const events = (eventsResult.data ?? []) as SubdivisionTimelineEvent[];
  const sources = (sourcesResult.data ?? []) as SubdivisionSource[];

  return { ...subdivision, timeline_events: events, sources };
}

// ─── Subdivision by normalized name ───────────────────────────────────────────

export async function fetchSubdivisionByNormalizedName(
  normalizedName: string
): Promise<Subdivision | null> {
  if (!supabase || !normalizedName) return null;
  const { data, error } = await supabase
    .from("subdivisions")
    .select("*")
    .eq("normalized_name", normalizedName)
    .single();

  if (error || !data) return null;
  return data as Subdivision;
}

// ─── Subdivision search ───────────────────────────────────────────────────────

export async function searchSubdivisions(
  query: string,
  limit = 10
): Promise<SubdivisionSummary[]> {
  if (!supabase || query.trim().length < 2) return [];
  const q = query.trim().toLowerCase();
  const { data, error } = await supabase
    .from("subdivisions")
    .select(
      "id, name, normalized_name, recorded_year, confidence_level, confidence_reason, " +
      "source_name, original_owner, developer, parcel_count, linked_parcel_count, notes, parent_subdivision_id, entity_type"
    )
    .ilike("normalized_name", `%${q}%`)
    .order("recorded_year", { ascending: true, nullsFirst: false })
    .limit(limit);

  if (error || !data) return [];
  return data as unknown as SubdivisionSummary[];
}

// ─── Parcels in a subdivision ─────────────────────────────────────────────────

// ─── Subdivisions by decade ───────────────────────────────────────────────────

export async function fetchSubdivisionDecadeDistribution(): Promise<
  Array<{ decade: string; count: number }>
> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("subdivision_decade_distribution");
  if (error || !data) return [];
  return (data as Array<{ decade: string; count: number }>).map((r) => ({
    decade: r.decade,
    count: Number(r.count),
  }));
}

// ─── QA stats ─────────────────────────────────────────────────────────────────

export async function fetchSubdivisionQAStats(): Promise<SubdivisionQAStats | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("subdivision_qa_stats");
  if (error || !data) return null;
  return data as SubdivisionQAStats;
}

// ─── Subdivision decade filter for index page ─────────────────────────────────

export async function fetchSubdivisionsByDecade(
  decade: number
): Promise<SubdivisionSummary[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("subdivisions")
    .select(
      "id, name, normalized_name, recorded_year, confidence_level, confidence_reason, " +
      "source_name, original_owner, developer, parcel_count, linked_parcel_count, notes, parent_subdivision_id"
    )
    .gte("recorded_year", decade)
    .lt("recorded_year", decade + 10)
    .order("recorded_year", { ascending: true });

  if (error || !data) return [];
  return data as unknown as SubdivisionSummary[];
}

// ---------------------------------------------------------------------------
// Aliases for Next.js pages
// ---------------------------------------------------------------------------

/** Alias for fetchSubdivisionIndex -- used by the Next.js SubdivisionsContent component. */
export const fetchSubdivisions = fetchSubdivisionIndex;

/** Parcels belonging to a specific subdivision, from any linking method: deed
 *  research (property_subdivision_links), the direct admin-assigned FK
 *  (parcels.subdivision_id), or GIS-lot spatial matching
 *  (parcel_lot_relationships -> gis_lots). Uses the same union as
 *  subdivisions.linked_parcel_count and the admin subdivision-map
 *  (get_linked_pins_for_subdivision RPC) so this page's property list and
 *  the "N properties linked" figures shown elsewhere can't drift apart.
 *  Deed-verified lot/block numbers are attached where available; parcels
 *  linked by other methods simply have no lot/block label.
 */
export async function fetchSubdivisionParcels(
  subdivisionId: string
): Promise<Array<{ pin: string; address?: string | null; year_built?: number | null; building_sqft?: number | null; sale_count?: number | null; permit_count?: number | null; lot_number?: string | null; block_number?: string | null; lot_count?: number; is_teardown_rebuild?: boolean | null; teardown_confidence?: string | null }>> {
  if (!supabase) return [];

  const { data: linkedPinsData } = await supabase
    .rpc("get_linked_pins_for_subdivision", { p_subdivision_id: subdivisionId })
    .limit(5000);
  const allPins = ((linkedPinsData ?? []) as Array<{ pin: string }>)
    .map((r) => r.pin)
    .filter(Boolean);
  if (allPins.length === 0) return [];

  // Deed-verified lot/block metadata, attached where it exists.
  const { data: links } = await supabase
    .from("property_subdivision_links")
    .select("pin, lot_number, block_number")
    .eq("subdivision_id", subdivisionId)
    .limit(5000);
  const deedLinks = (links ?? []) as Array<{ pin: string; lot_number: string | null; block_number: string | null }>;
  const deedPins = deedLinks.map((r) => r.pin);
  const deedLotFallback = new Map(deedLinks.map((r) => [r.pin, { lot_number: r.lot_number, block_number: r.block_number }]));

  const lotsMap = new Map<string, Array<{ lot_number: string | null; block_number: string | null }>>();
  if (deedPins.length > 0) {
    const { data: lots } = await supabase
      .from("subdivision_lots")
      .select("current_pin, lot_number, block_number")
      .eq("subdivision_id", subdivisionId)
      .in("current_pin", deedPins);
    (lots ?? []).forEach((l: Record<string, unknown>) => {
      const p = String(l.current_pin ?? "");
      if (!lotsMap.has(p)) lotsMap.set(p, []);
      lotsMap.get(p)!.push({ lot_number: l.lot_number as string | null, block_number: l.block_number as string | null });
    });
  }

  // Fetch parcel data for every linked pin, not just deed-verified ones.
  const parcelMap = new Map<string, Record<string, unknown>>();
  const { data: parcels } = await supabase
    .from("parcels")
    .select("pin_normalized, address, year_built, building_sqft, sale_count, permit_count, is_teardown_rebuild, teardown_confidence, has_deed_research")
    .in("pin_normalized", allPins);
  (parcels ?? []).forEach((p) => parcelMap.set((p as Record<string, unknown>).pin_normalized as string, p as Record<string, unknown>));

  return allPins.map((pin) => {
    const parcel = parcelMap.get(pin);
    const pinLots = lotsMap.get(pin) ?? [];
    const firstLot = pinLots[0] ?? deedLotFallback.get(pin) ?? { lot_number: null, block_number: null };
    return {
      pin,
      address: (parcel?.address as string | null) ?? null,
      year_built: (parcel?.year_built as number | null) ?? null,
      building_sqft: (parcel?.building_sqft as number | null) ?? null,
      sale_count: (parcel?.sale_count as number | null) ?? null,
      permit_count: (parcel?.permit_count as number | null) ?? null,
      lot_number: firstLot.lot_number,
      block_number: firstLot.block_number,
      lot_count: pinLots.length > 1 ? pinLots.length : undefined,
      is_teardown_rebuild: (parcel?.is_teardown_rebuild as boolean | null) ?? null,
      teardown_confidence: (parcel?.teardown_confidence as string | null) ?? null,
      has_deed_research: (parcel?.has_deed_research as boolean | null) ?? null,
    };
  });
}

/** Parent subdivision for a given subdivision, if set. */
export async function fetchParentSubdivision(
  subdivisionId: string
): Promise<{ id: string; name: string; entity_type: string | null } | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from("subdivisions")
    .select("parent_subdivision_id")
    .eq("id", subdivisionId)
    .single();
  const parentId = (data as Record<string, unknown> | null)?.parent_subdivision_id as string | null;
  if (!parentId) return null;
  const { data: parent } = await supabase
    .from("subdivisions")
    .select("id, name, entity_type")
    .eq("id", parentId)
    .single();
  if (!parent) return null;
  const p = parent as Record<string, unknown>;
  return { id: String(p.id), name: String(p.name), entity_type: (p.entity_type as string | null) ?? null };
}

function normalizeLineageRows(data: unknown): HistoricalSubdivisionLineage[] {
  return (Array.isArray(data) ? data : []) as HistoricalSubdivisionLineage[];
}

/** Deed-derived subdivision lineage rows for one property PIN. */
export async function fetchLineageForPin(
  pin: string
): Promise<HistoricalSubdivisionLineage[]> {
  if (!supabase || !pin) return [];
  const { data, error } = await supabase
    .from("historical_subdivision_lineage")
    .select("*")
    .eq("pin", pin)
    .order("child_subdivision", { ascending: true });

  if (error || !data) return [];
  return normalizeLineageRows(data);
}

/** Deed-derived parent/child lineage rows for one subdivision. */
export async function fetchSubdivisionLineage(
  subdivisionId: string
): Promise<HistoricalSubdivisionLineage[]> {
  if (!supabase || !subdivisionId) return [];
  const { data, error } = await supabase
    .from("historical_subdivision_lineage")
    .select("*")
    .or(`child_subdivision_id.eq.${subdivisionId},parent_subdivision_id.eq.${subdivisionId}`)
    .order("child_subdivision", { ascending: true });

  if (error || !data) return [];
  return normalizeLineageRows(data);
}

/** Featured examples for the city development-pattern view. */
export async function fetchCityResubdivisionExamples(): Promise<HistoricalSubdivisionLineage[]> {
  if (!supabase) return [];
  const keys = [
    "kulas-subdivision-from-hodges-and-murison-lot-6",
    "blacks-addition-from-peeny-and-meachem-block-1-526-n-washington",
  ];
  const { data, error } = await supabase
    .from("historical_subdivision_lineage")
    .select("*")
    .in("lineage_key", keys);

  if (error || !data) return [];
  const rows = normalizeLineageRows(data);
  return keys
    .map((key) => rows.find((row) => row.lineage_key === key))
    .filter((row): row is HistoricalSubdivisionLineage => Boolean(row));
}

// ─── Plat-by-decade chart ─────────────────────────────────────────────────────

export async function fetchSubdivisionPlatByDecade(): Promise<
  Array<{ decade: number; platCount: number }>
> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("subdivision_plat_by_decade");
  if (error || !data) return [];
  return (data as Array<{ decade: number; plat_count: number }>).map((r) => ({
    decade: r.decade,
    platCount: r.plat_count,
  }));
}

// ─── Subdivision stats (city page headline row) ───────────────────────────────

export async function fetchSubdivisionStats(): Promise<{
  total: number;
  minYear: number | null;
  maxYear: number | null;
}> {
  if (!supabase) return { total: 0, minYear: null, maxYear: null };
  try {
    const { data, error } = await supabase
      .from("subdivisions")
      .select("recorded_year");
    if (error || !data) return { total: 0, minYear: null, maxYear: null };
    const years = (data as Array<{ recorded_year: number | null }>)
      .map((r) => r.recorded_year)
      .filter((y): y is number => y != null);
    return {
      total: data.length,
      minYear: years.length ? Math.min(...years) : null,
      maxYear: years.length ? Math.max(...years) : null,
    };
  } catch {
    return { total: 0, minYear: null, maxYear: null };
  }
}

// ─── City page subdivision list (name + earliest build year) ─────────────────

export async function fetchSubdivisionsForCityList(): Promise<
  Array<{ id: string; name: string; normalizedName: string; parcelCount: number | null; earliestBuilt: number | null }>
> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("subdivision_list_with_earliest_build");
  if (error || !data) return [];
  return (data as Array<{ id: string; name: string; normalized_name: string; parcel_count: number | null; earliest_built: number | null }>).map((r) => ({
    id: r.id,
    name: r.name,
    normalizedName: r.normalized_name,
    parcelCount: r.parcel_count,
    earliestBuilt: r.earliest_built,
  }));
}

// ─── Historical context queries ───────────────────────────────────────────────

/**
 * Fetch historical facts for a subdivision with embedded source details.
 * Ordered by display_priority ascending, then event_year ascending (nulls last).
 */
export async function fetchSubdivisionHistoricalFacts(
  subdivisionId: string
): Promise<SubdivisionHistoricalFact[]> {
  if (!supabase || !subdivisionId) return [];
  const { data, error } = await supabase
    .from("subdivision_timeline_events")
    .select(
      "*, source:subdivision_sources(" +
      "id, source_key, title, source_name, source_url, author_or_publisher, " +
      "publication_name, publication_date, page_ref, column_ref, " +
      "archive_location, access_notes, reliability_tier" +
      ")"
    )
    .eq("subdivision_id", subdivisionId)
    .order("display_priority", { ascending: true })
    .order("event_year", { ascending: true, nullsFirst: false });

  if (error || !data) return [];
  return data as unknown as SubdivisionHistoricalFact[];
}

/**
 * Fetch aliases for a subdivision, ordered by confidence descending then alias ascending.
 */
export async function fetchSubdivisionAliases(
  subdivisionId: string
): Promise<SubdivisionAlias[]> {
  if (!supabase || !subdivisionId) return [];
  const { data, error } = await supabase
    .from("subdivision_aliases")
    .select("*")
    .eq("subdivision_id", subdivisionId)
    .order("confidence", { ascending: false })
    .order("alias", { ascending: true });

  if (error || !data) return [];
  return data as unknown as SubdivisionAlias[];
}

/**
 * Fetch research tasks for a subdivision.
 * If onlyPending is true (default), only returns tasks with status = 'pending'.
 * Priority ordering: high, medium, low.
 */
export async function fetchSubdivisionResearchTasks(
  subdivisionId: string,
  onlyPending = true
): Promise<SubdivisionResearchTask[]> {
  if (!supabase || !subdivisionId) return [];
  let query = supabase
    .from("subdivision_research_tasks")
    .select("*")
    .eq("subdivision_id", subdivisionId);

  if (onlyPending) {
    query = query.eq("status", "pending");
  }

  const { data, error } = await query.order("created_at", { ascending: true });

  if (error || !data) return [];

  // Sort in-memory by priority: high → medium → low
  const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  return (data as unknown as SubdivisionResearchTask[]).sort(
    (a, b) =>
      (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1)
  );
}

/**
 * Fetch full subdivision detail including historical facts, aliases, and research tasks.
 * Extends SubdivisionWithDetail with all historical context fields.
 */
export async function fetchSubdivisionFullDetail(
  id: string
): Promise<SubdivisionFullDetail | null> {
  if (!supabase || !id) return null;

  const [subdivisionResult, eventsResult, sourcesResult, factsResult, aliasesResult, tasksResult] =
    await Promise.all([
      supabase.from("subdivisions").select("*").eq("id", id).single(),
      supabase
        .from("subdivision_timeline_events")
        .select("*")
        .eq("subdivision_id", id)
        .order("event_year", { ascending: true, nullsFirst: false }),
      supabase.from("subdivision_sources").select("*").eq("subdivision_id", id),
      fetchSubdivisionHistoricalFacts(id),
      fetchSubdivisionAliases(id),
      fetchSubdivisionResearchTasks(id),
    ]);

  if (subdivisionResult.error || !subdivisionResult.data) return null;

  const subdivision = subdivisionResult.data as Subdivision;
  const events = (eventsResult.data ?? []) as SubdivisionTimelineEvent[];
  const sources = (sourcesResult.data ?? []) as SubdivisionSource[];

  return {
    ...subdivision,
    timeline_events: events,
    sources,
    facts: factsResult,
    aliases: aliasesResult,
    research_tasks: tasksResult,
  } as SubdivisionFullDetail;
}

/** Fetch PINs and bbox for the subdivision map. Uses the same linked-pin
 *  union as fetchSubdivisionParcels() (get_linked_pins_for_subdivision) so
 *  the map shows every matched parcel, not just deed-verified ones.
 */
export async function fetchSubdivisionMapData(
  subdivisionId: string
): Promise<{ pins: string[]; bbox: [number, number, number, number] | null }> {
  if (!supabase) return { pins: [], bbox: null };

  const [pinsResult, bboxResult] = await Promise.all([
    supabase
      .rpc("get_linked_pins_for_subdivision", { p_subdivision_id: subdivisionId })
      .limit(5000),
    supabase
      .from("subdivision_geometries")
      .select("bbox")
      .eq("subdivision_id", subdivisionId)
      .single(),
  ]);

  const pins = ((pinsResult.data ?? []) as Array<{ pin: string }>)
    .map((r) => r.pin)
    .filter(Boolean);

  const bboxData = (bboxResult.data?.bbox ?? null) as Record<string, number> | null;
  let bbox: [number, number, number, number] | null = bboxData
    ? [bboxData.minLng, bboxData.minLat, bboxData.maxLng, bboxData.maxLat]
    : null;

  // No official boundary - compute a bbox from the linked parcel geometries so
  // the map can still center on the actual properties.
  if (!bbox && pins.length > 0) {
    const { data: pb } = await supabase.rpc("pins_bbox", { pin_array: pins });
    const row = (pb as Array<{ min_lng: number; min_lat: number; max_lng: number; max_lat: number }>)?.[0];
    if (row?.min_lng != null) {
      bbox = [row.min_lng, row.min_lat, row.max_lng, row.max_lat];
    }
  }

  return { pins, bbox };
}

// ─── Subdivision-scoped sales + assessment stats ──────────────────────────────

export async function fetchSubdivisionAssessmentStats(pins: string[]): Promise<BlockAssessmentStats> {
  if (!supabase || !pins.length) return { medianAssessedValue: null, assessedYear: null };
  const { data, error } = await supabase
    .from("parcels")
    .select("latest_assessed_total, latest_assessed_year")
    .in("pin_normalized", pins);
  if (error || !data || !data.length) return { medianAssessedValue: null, assessedYear: null };
  return computeBlockAssessmentStats([], data as Array<Record<string, unknown>>);
}

function medianOfNumbers(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export async function fetchSubdivisionMarketHistory(pins: string[]): Promise<MarketHistoryRow[]> {
  if (!supabase || !pins.length) return [];
  const { data, error } = await supabase
    .from("sales")
    .select("sale_year, sale_price")
    .in("pin", pins)
    .eq("is_market_sale", true)
    .gte("sale_price", 50000)
    .lte("sale_price", 5000000)
    .not("sale_year", "is", null);
  if (error || !data || !data.length) return [];
  const byYear = new Map<number, number[]>();
  (data as Array<{ sale_year: number; sale_price: number }>).forEach((r) => {
    const arr = byYear.get(r.sale_year) ?? [];
    arr.push(r.sale_price);
    byYear.set(r.sale_year, arr);
  });
  return Array.from(byYear.entries())
    .sort(([a], [b]) => a - b)
    .map(([yr, prices]) => ({ saleYear: yr, saleCount: prices.length, medianPrice: Math.round(medianOfNumbers(prices)) }));
}

/** Fetch a subdivision for property page cross-links. */
export type SubdivisionParcelRow = {
  pin: string;
  address?: string | null;
  year_built?: number | null;
  building_sqft?: number | null;
  sale_count?: number | null;
  permit_count?: number | null;
  lot_number?: string | null;
  block_number?: string | null;
  lot_count?: number;
  is_teardown_rebuild?: boolean | null;
  teardown_confidence?: string | null;
  has_deed_research?: boolean | null;
};

/** Compute a lat/lng bounding box for an arbitrary list of PINs (uses pins_bbox RPC). */
export async function fetchBboxForPins(
  pins: string[]
): Promise<[number, number, number, number] | null> {
  if (!supabase || !pins.length) return null;
  const { data } = await supabase.rpc("pins_bbox", { pin_array: pins });
  const row = (data as Array<{ min_lng: number; min_lat: number; max_lng: number; max_lat: number }>)?.[0];
  if (!row?.min_lng) return null;
  return [row.min_lng, row.min_lat, row.max_lng, row.max_lat];
}

// ─── Neighborhoods linked to a subdivision ────────────────────────────────────

export type SubdivisionNeighborhoodLink = {
  linkId: string;
  neighborhoodId: string;
  neighborhoodName: string;
  neighborhoodSlug: string | null;
  relationshipType: string | null;
};

/** Fetch neighborhoods that are linked to a subdivision via neighborhood_subdivision_links. */
export async function fetchNeighborhoodsForSubdivision(
  subdivisionId: string
): Promise<SubdivisionNeighborhoodLink[]> {
  if (!supabase || !subdivisionId) return [];
  try {
    const { data, error } = await supabase
      .from("neighborhood_subdivision_links")
      .select("id, relationship_type, neighborhoods(id, label, slug)")
      .eq("subdivision_id", subdivisionId)
      .order("id");
    if (error || !data) return [];

    type RawRow = {
      id: string;
      relationship_type: string | null;
      neighborhoods: { id: string; label: string; slug: string | null } | null;
    };

    return (data as unknown as RawRow[])
      .filter(
        (row): row is RawRow & { neighborhoods: NonNullable<RawRow["neighborhoods"]> } =>
          row.neighborhoods !== null
      )
      .map((row) => ({
        linkId: row.id,
        neighborhoodId: row.neighborhoods.id,
        neighborhoodName: row.neighborhoods.label,
        neighborhoodSlug: row.neighborhoods.slug,
        relationshipType: row.relationship_type,
      }));
  } catch {
    return [];
  }
}

export async function fetchSubdivisionForPin(
  pin: string
): Promise<{ id: string; name: string; recorded_year?: number | null } | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("property_subdivision_links")
    .select("subdivision_id, subdivisions(id, name, recorded_year)")
    .eq("pin", pin)
    .maybeSingle();

  if (error || !data) return null;
  const sub = (data as unknown as { subdivisions: Record<string, unknown> | null }).subdivisions;
  if (!sub) return null;
  return {
    id: String(sub.id ?? ""),
    name: String(sub.name ?? ""),
    recorded_year: sub.recorded_year as number | null,
  };
}
