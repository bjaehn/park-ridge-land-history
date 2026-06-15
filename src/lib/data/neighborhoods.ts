import { supabase } from "../supabase/client";
import type { DecadeRow } from "../../components/ui/ConstructionByDecadeChart";

export type NeighborhoodSummary = {
  id: string;
  slug: string;
  label: string;
  parcelCount: number;
  medianYear?: number;
  totalPermits?: number;
  totalSales?: number;
  recentTeardowns?: number;
};

export type NeighborhoodDetail = NeighborhoodSummary & {
  decadeRows: DecadeRow[];
  streets?: Array<{ name: string; displayName: string; parcelCount: number }>;
};

const NEIGHBORHOOD_DEFINITIONS = [
  { id: "neighborhood:uptown",    slug: "uptown",    label: "Uptown" },
  { id: "neighborhood:south",     slug: "south",     label: "South Park Ridge" },
  { id: "neighborhood:northwest", slug: "northwest", label: "Northwest" },
  { id: "neighborhood:northeast", slug: "northeast", label: "Northeast" },
  { id: "neighborhood:central",   slug: "central",   label: "Central" },
] as const;

export async function fetchNeighborhoodSummaries(): Promise<NeighborhoodSummary[]> {
  if (!supabase) return NEIGHBORHOOD_DEFINITIONS.map((n) => ({ ...n, parcelCount: 0 }));
  let data: unknown = null;
  let error: unknown = null;
  try {
    const result = await supabase.rpc("neighborhood_summaries");
    data = result.data;
    error = result.error;
  } catch {
    error = true;
  }
  if (error || !data) {
    return NEIGHBORHOOD_DEFINITIONS.map((n) => ({ ...n, parcelCount: 0 }));
  }
  return (data as unknown[]).map((row: unknown) => {
    const r = row as Record<string, unknown>;
    const def = NEIGHBORHOOD_DEFINITIONS.find((n) => n.id === r.neighborhood_id) ??
      { id: String(r.neighborhood_id), slug: String(r.neighborhood_id).replace("neighborhood:", ""), label: String(r.neighborhood_label ?? r.neighborhood_id) };
    return {
      id: def.id,
      slug: def.slug,
      label: def.label,
      parcelCount: Number(r.parcel_count ?? 0),
      medianYear: r.median_year ? Number(r.median_year) : undefined,
      totalPermits: r.total_permits ? Number(r.total_permits) : undefined,
      totalSales: r.total_sales ? Number(r.total_sales) : undefined,
      recentTeardowns: r.recent_teardowns ? Number(r.recent_teardowns) : undefined,
    };
  });
}

export async function getNeighborhoodBySlug(slug: string): Promise<NeighborhoodSummary> {
  const def = NEIGHBORHOOD_DEFINITIONS.find((n) => n.slug === slug);
  if (!def) throw new Error(`Unknown neighborhood slug: ${slug}`);
  const all = await fetchNeighborhoodSummaries();
  return all.find((n) => n.slug === slug) ?? { ...def, parcelCount: 0 };
}

export async function getNeighborhoodDetail(id: string): Promise<NeighborhoodDetail> {
  const summaries = await fetchNeighborhoodSummaries();
  const summary = summaries.find((n) => n.id === id);
  const def = NEIGHBORHOOD_DEFINITIONS.find((n) => n.id === id);
  const defProps = def ? { id: def.id, slug: def.slug, label: def.label } : {};
  const base: NeighborhoodSummary = summary ?? {
    id,
    slug: id.replace("neighborhood:", ""),
    label: id,
    parcelCount: 0,
    ...defProps,
  };

  let decadeRows: DecadeRow[] = [];
  let streets: Array<{ name: string; displayName: string; parcelCount: number }> = [];

  if (supabase) {
    let decadeData: unknown = null;
    let streetData: unknown = null;
    try {
      const r = await supabase.rpc("neighborhood_decade_distribution", { p_neighborhood_id: id });
      if (!r.error) decadeData = r.data;
    } catch { /* use empty fallback */ }
    try {
      const r = await supabase.rpc("neighborhood_streets", { p_neighborhood_id: id });
      if (!r.error) streetData = r.data;
    } catch { /* use empty fallback */ }

    if (decadeData) {
      decadeRows = (decadeData as Array<{ decade: string; count: number }>).map((r) => ({
        decade: r.decade,
        count: Number(r.count),
      }));
    }
    if (streetData) {
      streets = (streetData as Array<{ street_name: string; display_name: string; parcel_count: number }>)
        .map((r) => ({
          name: r.street_name,
          displayName: r.display_name,
          parcelCount: Number(r.parcel_count),
        }));
    }
  }

  return { ...base, decadeRows, streets };
}
