/**
 * Data access for the historical_facts table -- a general-purpose,
 * source-cited fact repository (see supabase/migrations/20260615161000 and
 * 20260705000000). Facts can be scoped to a neighborhood/business
 * district/corridor via neighborhood_id, or to the whole city via
 * city_wide = true.
 */

import { supabase } from "../supabase/client";

export type HistoricalFactConfidence = "high" | "medium" | "low" | "unknown";

export type HistoricalFactSource = {
  title: string;
  creator: string | null;
  publication_year: number | null;
  source_url: string | null;
};

export type HistoricalFact = {
  factId: string;
  dateStart: number | null;
  dateEnd: number | null;
  dateText: string | null;
  category: string | null;
  factType: string | null;
  title: string;
  summary: string | null;
  printedPage: string | null;
  confidence: HistoricalFactConfidence;
  source: HistoricalFactSource | null;
};

type RawFact = {
  fact_id: string;
  date_start: number | null;
  date_end: number | null;
  date_text: string | null;
  category: string | null;
  fact_type: string | null;
  title: string;
  summary: string | null;
  printed_page: string | null;
  confidence: string | null;
  historical_sources: {
    title: string;
    creator: string | null;
    publication_year: number | null;
    source_url: string | null;
  } | null;
};

const COLUMNS =
  "fact_id, date_start, date_end, date_text, category, fact_type, title, summary, printed_page, confidence, " +
  "historical_sources ( title, creator, publication_year, source_url )";

function mapFact(raw: RawFact): HistoricalFact {
  return {
    factId: raw.fact_id,
    dateStart: raw.date_start,
    dateEnd: raw.date_end,
    dateText: raw.date_text,
    category: raw.category,
    factType: raw.fact_type,
    title: raw.title,
    summary: raw.summary,
    printedPage: raw.printed_page,
    confidence: (raw.confidence as HistoricalFactConfidence) ?? "unknown",
    source: raw.historical_sources
      ? {
          title: raw.historical_sources.title,
          creator: raw.historical_sources.creator,
          publication_year: raw.historical_sources.publication_year,
          source_url: raw.historical_sources.source_url,
        }
      : null,
  };
}

export async function getHistoricalFactsForNeighborhood(
  neighborhoodId: string
): Promise<HistoricalFact[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("historical_facts")
      .select(COLUMNS)
      .eq("neighborhood_id", neighborhoodId)
      .order("date_start", { ascending: true, nullsFirst: false });
    if (error || !data) return [];
    return (data as unknown as RawFact[]).map(mapFact);
  } catch {
    return [];
  }
}

export async function getCityWideHistoricalFacts(): Promise<HistoricalFact[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("historical_facts")
      .select(COLUMNS)
      .eq("city_wide", true)
      .order("date_start", { ascending: true, nullsFirst: false });
    if (error || !data) return [];
    return (data as unknown as RawFact[]).map(mapFact);
  } catch {
    return [];
  }
}
