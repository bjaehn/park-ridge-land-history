/**
 * Supabase queries for the Subdivision History feature.
 *
 * All functions return null or empty arrays gracefully when Supabase is
 * unavailable or when no data exists — the UI handles those states explicitly.
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
} from "../subdivisionTypes";

// ─── Subdivision index ────────────────────────────────────────────────────────

export async function fetchSubdivisionIndex(): Promise<SubdivisionSummary[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("subdivisions")
    .select(
      "id, name, normalized_name, recorded_year, confidence_level, confidence_reason, " +
      "source_name, original_owner, developer, parcel_count, notes"
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
      "source_name, original_owner, developer, parcel_count, notes"
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

// ─── Subdivision for a property (DNA) ────────────────────────────────────────

export async function fetchSubdivisionForPin(
  pin: string
): Promise<{ subdivision: Subdivision | null; link: PropertySubdivisionLink | null }> {
  if (!supabase || !pin) return { subdivision: null, link: null };

  const { data: linkData, error: linkError } = await supabase
    .from("property_subdivision_links")
    .select("*")
    .eq("pin", pin)
    .order("confidence_level", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (linkError || !linkData) return { subdivision: null, link: null };

  const link = linkData as PropertySubdivisionLink;
  if (!link.subdivision_id) return { subdivision: null, link };

  const { data: subData, error: subError } = await supabase
    .from("subdivisions")
    .select("*")
    .eq("id", link.subdivision_id)
    .single();

  if (subError || !subData) return { subdivision: null, link };
  return { subdivision: subData as Subdivision, link };
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
      "source_name, original_owner, developer, parcel_count, notes"
    )
    .gte("recorded_year", decade)
    .lt("recorded_year", decade + 10)
    .order("recorded_year", { ascending: true });

  if (error || !data) return [];
  return data as unknown as SubdivisionSummary[];
}
