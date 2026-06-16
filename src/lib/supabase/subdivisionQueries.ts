/**
 * Supabase queries for the Subdivision History feature.
 *
 * All functions return null or empty arrays gracefully when Supabase is
 * unavailable or when no data exists : the UI handles those states explicitly.
 */

import { supabase } from "./client";
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
} from "../subdivisionTypes";

// ─── Subdivision index ────────────────────────────────────────────────────────

export async function fetchSubdivisionIndex(): Promise<SubdivisionSummary[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("subdivisions")
    .select(
      "id, name, normalized_name, recorded_year, confidence_level, confidence_reason, " +
      "source_name, original_owner, developer, parcel_count, notes, parent_subdivision_id"
    )
    .order("recorded_year", { ascending: true, nullsFirst: false })
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
      "source_name, original_owner, developer, parcel_count, notes, parent_subdivision_id"
    )
    .ilike("normalized_name", `%${q}%`)
    .order("recorded_year", { ascending: true, nullsFirst: false })
    .limit(limit);

  if (error || !data) return [];
  return data as unknown as SubdivisionSummary[];
}

// ─── Parcels in a subdivision ─────────────────────────────────────────────────

export async function fetchParcelsInSubdivision(
  subdivisionId: string,
  limit = 50
): Promise<Array<{ pin: string; address: string | null; year_built: number | null; lot_number: string | null; block_number: string | null }>> {
  if (!supabase || !subdivisionId) return [];
  const { data, error } = await supabase
    .from("property_subdivision_links")
    .select("pin, address, lot_number, block_number")
    .eq("subdivision_id", subdivisionId)
    .limit(limit);

  if (error || !data) return [];

  const pins = data.map((r) => r.pin).filter(Boolean) as string[];
  if (!pins.length) return [];

  const { data: parcels, error: parcelError } = await supabase
    .from("parcels")
    .select("pin_normalized, address, year_built")
    .in("pin_normalized", pins);

  if (parcelError || !parcels) {
    return data.map((r) => ({
      pin: r.pin as string,
      address: r.address as string | null,
      year_built: null,
      lot_number: r.lot_number as string | null,
      block_number: r.block_number as string | null,
    }));
  }

  const parcelMap = new Map(parcels.map((p) => [p.pin_normalized, p]));
  return data.map((r) => {
    const parcel = parcelMap.get(r.pin as string);
    return {
      pin: r.pin as string,
      address: (parcel?.address ?? r.address) as string | null,
      year_built: parcel?.year_built as number | null,
      lot_number: r.lot_number as string | null,
      block_number: r.block_number as string | null,
    };
  });
}

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
      "source_name, original_owner, developer, parcel_count, notes, parent_subdivision_id"
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

/** Parcels belonging to a specific subdivision, with historical lot detail. */
export async function fetchSubdivisionParcels(
  subdivisionId: string
): Promise<Array<{ pin: string; address?: string | null; year_built?: number | null; lot_number?: string | null; block_number?: string | null; lot_count?: number }>> {
  if (!supabase) return [];

  const { data: links, error: linksError } = await supabase
    .from("property_subdivision_links")
    .select("pin, lot_number, block_number")
    .eq("subdivision_id", subdivisionId)
    .limit(500);

  if (linksError || !links || links.length === 0) return [];

  const pins = (links as Array<{ pin: string; lot_number: string | null; block_number: string | null }>)
    .map((r) => r.pin)
    .filter(Boolean);
  if (!pins.length) return [];

  // Fetch lot-level detail from subdivision_lots
  const { data: lots } = await supabase
    .from("subdivision_lots")
    .select("current_pin, lot_number, block_number")
    .eq("subdivision_id", subdivisionId)
    .in("current_pin", pins);

  const lotsMap = new Map<string, Array<{ lot_number: string | null; block_number: string | null }>>();
  (lots ?? []).forEach((l: Record<string, unknown>) => {
    const p = String(l.current_pin ?? "");
    if (!lotsMap.has(p)) lotsMap.set(p, []);
    lotsMap.get(p)!.push({ lot_number: l.lot_number as string | null, block_number: l.block_number as string | null });
  });

  const { data: parcels, error: parcelsError } = await supabase
    .from("parcels")
    .select("pin_normalized, address, year_built")
    .in("pin_normalized", pins);

  const parcelMap = new Map(
    (!parcelsError && parcels
      ? (parcels as Array<{ pin_normalized: string; address: string | null; year_built: number | null }>)
      : []
    ).map((p) => [p.pin_normalized, p])
  );

  return (links as Array<{ pin: string; lot_number: string | null; block_number: string | null }>).map((link) => {
    const parcel = parcelMap.get(link.pin);
    const pinLots = lotsMap.get(link.pin) ?? [];
    // Use first lot from subdivision_lots if available, else fall back to link
    const firstLot = pinLots[0] ?? link;
    return {
      pin: link.pin,
      address: parcel?.address ?? null,
      year_built: parcel?.year_built ?? null,
      lot_number: firstLot.lot_number,
      block_number: firstLot.block_number,
      lot_count: pinLots.length > 1 ? pinLots.length : undefined,
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

// ─── Build-gap chart ──────────────────────────────────────────────────────────

export async function fetchSubdivisionBuildGap(): Promise<
  Array<{
    name: string;
    recordedYear: number;
    earliestBuilt: number;
    gapYears: number;
    lotCount: number;
  }>
> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("subdivision_build_gap");
  if (error || !data) return [];
  return (
    data as Array<{
      name: string;
      recorded_year: number;
      earliest_built: number;
      gap_years: number;
      lot_count: number;
    }>
  ).map((r) => ({
    name: r.name,
    recordedYear: r.recorded_year,
    earliestBuilt: r.earliest_built,
    gapYears: r.gap_years,
    lotCount: r.lot_count,
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

/** Fetch PINs and bbox for the subdivision map. */
export async function fetchSubdivisionMapData(
  subdivisionId: string
): Promise<{ pins: string[]; bbox: [number, number, number, number] | null }> {
  if (!supabase) return { pins: [], bbox: null };

  const [pinsResult, bboxResult] = await Promise.all([
    supabase
      .from("property_subdivision_links")
      .select("pin")
      .eq("subdivision_id", subdivisionId),
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
  const bbox: [number, number, number, number] | null = bboxData
    ? [bboxData.minLng, bboxData.minLat, bboxData.maxLng, bboxData.maxLat]
    : null;

  return { pins, bbox };
}

/** Fetch a subdivision for property page cross-links. */
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
