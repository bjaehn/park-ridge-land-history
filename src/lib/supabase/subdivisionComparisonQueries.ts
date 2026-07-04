import { supabase } from "./client";
import type { SubdivisionSummary } from "@/lib/subdivisionTypes";

export type SubdivisionPriceRow = {
  subdivisionId: string;
  label: string;
  year2015: number | null;
  year2024: number | null;
  pctChange: number | null;
  /** False when the subdivision has zero properties linked by any of the
   *  three union sources (see CLAUDE.md) -- distinct from having properties
   *  but no qualifying 2015/2024 sale. */
  hasProperties: boolean;
};

export type SubdivisionEraRow = {
  subdivisionId: string;
  label: string;
  pre1920: number;
  boom: number;
  postwar: number;
  eighties: number;
  aughts: number;
  teens: number;
  recent: number;
  total: number;
  hasProperties: boolean;
};

// Same ordering as the subdivision index query (fetchSubdivisionIndex):
// oldest-first by earliest_year_built, unknown last, alphabetical tiebreak.
function sortBySameOrderAsIndex(subdivisions: SubdivisionSummary[]): SubdivisionSummary[] {
  return [...subdivisions].sort((a, b) => {
    if (a.earliest_year_built == null && b.earliest_year_built == null) {
      return a.name.localeCompare(b.name);
    }
    if (a.earliest_year_built == null) return 1;
    if (b.earliest_year_built == null) return -1;
    if (a.earliest_year_built !== b.earliest_year_built) {
      return a.earliest_year_built - b.earliest_year_built;
    }
    return a.name.localeCompare(b.name);
  });
}

export async function fetchSubdivisionPriceComparison(
  subdivisions: SubdivisionSummary[]
): Promise<SubdivisionPriceRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("subdivision_price_comparison");
  if (error) return [];

  const byId = new Map<string, { year_2015: number | null; year_2024: number | null }>();
  for (const r of (data ?? []) as Array<{
    subdivision_id: string;
    year_2015: number | null;
    year_2024: number | null;
  }>) {
    byId.set(r.subdivision_id, r);
  }

  return sortBySameOrderAsIndex(subdivisions).map((s) => {
    const row = byId.get(s.id);
    const year2015 = row?.year_2015 ?? null;
    const year2024 = row?.year_2024 ?? null;
    const pctChange =
      year2015 && year2024 ? Math.round(((year2024 - year2015) / year2015) * 100) : null;
    return {
      subdivisionId: s.id,
      label: s.name,
      year2015,
      year2024,
      pctChange,
      hasProperties: (s.linked_parcel_count ?? 0) > 0,
    };
  });
}

export async function fetchSubdivisionEraDistribution(
  subdivisions: SubdivisionSummary[]
): Promise<SubdivisionEraRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("subdivision_era_distribution");
  if (error) return [];

  type EraTotals = Omit<SubdivisionEraRow, "subdivisionId" | "label" | "hasProperties">;
  const byId = new Map<string, EraTotals>();
  for (const r of (data ?? []) as Array<{ subdivision_id: string; era: string; count: number }>) {
    if (!byId.has(r.subdivision_id)) {
      byId.set(r.subdivision_id, {
        pre1920: 0,
        boom: 0,
        postwar: 0,
        eighties: 0,
        aughts: 0,
        teens: 0,
        recent: 0,
        total: 0,
      });
    }
    const bucket = byId.get(r.subdivision_id)!;
    const count = Number(r.count);
    if (r.era === "pre1920") bucket.pre1920 += count;
    else if (r.era === "boom") bucket.boom += count;
    else if (r.era === "postwar") bucket.postwar += count;
    else if (r.era === "eighties") bucket.eighties += count;
    else if (r.era === "aughts") bucket.aughts += count;
    else if (r.era === "teens") bucket.teens += count;
    else if (r.era === "recent") bucket.recent += count;
    bucket.total += count;
  }

  return sortBySameOrderAsIndex(subdivisions).map((s) => {
    const bucket = byId.get(s.id);
    return {
      subdivisionId: s.id,
      label: s.name,
      pre1920: bucket?.pre1920 ?? 0,
      boom: bucket?.boom ?? 0,
      postwar: bucket?.postwar ?? 0,
      eighties: bucket?.eighties ?? 0,
      aughts: bucket?.aughts ?? 0,
      teens: bucket?.teens ?? 0,
      recent: bucket?.recent ?? 0,
      total: bucket?.total ?? 0,
      hasProperties: (s.linked_parcel_count ?? 0) > 0,
    };
  });
}
