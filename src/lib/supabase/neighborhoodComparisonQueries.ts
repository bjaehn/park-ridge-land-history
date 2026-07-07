import { supabase } from "./client";
import type { NeighborhoodType } from "../data/neighborhoods";

export type NeighborhoodPriceRow = {
  neighborhoodId: string;
  label: string;
  year2015: number | null;
  year2024: number | null;
  pctChange: number | null;
};

export type NeighborhoodEraRow = {
  neighborhoodId: string;
  label: string;
  pre1920: number;
  boom: number;
  postwar: number;
  eighties: number;
  aughts: number;
  teens: number;
  recent: number;
  total: number;
};

export async function fetchNeighborhoodPriceComparison(
  types: NeighborhoodType[]
): Promise<NeighborhoodPriceRow[]> {
  if (!supabase || types.length === 0) return [];
  const { data, error } = await supabase.rpc("neighborhood_price_comparison", { p_types: types });
  if (error || !data) return [];

  const ids = (data as Array<{ neighborhood_id: string }>).map((r) => r.neighborhood_id);
  let labelMap = new Map<string, string>();
  if (ids.length > 0) {
    const { data: meta } = await supabase
      .from("neighborhoods")
      .select("id, label")
      .in("id", ids);
    if (meta) {
      for (const m of meta as Array<{ id: string; label: string }>) {
        labelMap.set(m.id, m.label);
      }
    }
  }

  return (data as Array<{ neighborhood_id: string; year_2015: number | null; year_2024: number | null }>)
    .map((r) => {
      const pct =
        r.year_2015 && r.year_2024
          ? Math.round(((r.year_2024 - r.year_2015) / r.year_2015) * 100)
          : null;
      return {
        neighborhoodId: r.neighborhood_id,
        label: labelMap.get(r.neighborhood_id) ?? r.neighborhood_id,
        year2015: r.year_2015,
        year2024: r.year_2024,
        pctChange: pct,
      };
    })
    .sort((a, b) => (b.year2024 ?? 0) - (a.year2024 ?? 0));
}

export async function fetchNeighborhoodEraDistribution(
  types: NeighborhoodType[]
): Promise<NeighborhoodEraRow[]> {
  if (!supabase || types.length === 0) return [];
  const { data, error } = await supabase.rpc("neighborhood_era_distribution", { p_types: types });
  if (error || !data) return [];

  const ids = [...new Set((data as Array<{ neighborhood_id: string }>).map((r) => r.neighborhood_id))];
  let labelMap2 = new Map<string, string>();
  if (ids.length > 0) {
    const { data: meta } = await supabase
      .from("neighborhoods")
      .select("id, label")
      .in("id", ids);
    if (meta) {
      for (const m of meta as Array<{ id: string; label: string }>) {
        labelMap2.set(m.id, m.label);
      }
    }
  }

  const byNeighborhood = new Map<string, NeighborhoodEraRow>();
  for (const r of data as Array<{ neighborhood_id: string; era: string; count: number }>) {
    if (!byNeighborhood.has(r.neighborhood_id)) {
      byNeighborhood.set(r.neighborhood_id, {
        neighborhoodId: r.neighborhood_id,
        label: labelMap2.get(r.neighborhood_id) ?? r.neighborhood_id,
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
    const row = byNeighborhood.get(r.neighborhood_id)!;
    const count = Number(r.count);
    if (r.era === "pre1920") row.pre1920 += count;
    else if (r.era === "boom") row.boom += count;
    else if (r.era === "postwar") row.postwar += count;
    else if (r.era === "eighties") row.eighties += count;
    else if (r.era === "aughts") row.aughts += count;
    else if (r.era === "teens") row.teens += count;
    else if (r.era === "recent") row.recent += count;
    row.total += count;
  }

  return Array.from(byNeighborhood.values()).sort(
    (a, b) => b.boom / b.total - a.boom / a.total
  );
}
