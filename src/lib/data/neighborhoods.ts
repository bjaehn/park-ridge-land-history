import { supabase } from "../supabase/client";
import type { DecadeRow } from "../../components/ui/ConstructionByDecadeChart";

export type NeighborhoodType = "official_planning" | "business_district" | "local_market";

export type NeighborhoodSummary = {
  id: string;
  slug: string;
  label: string;
  neighborhoodType: NeighborhoodType | null;
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

type NeighborhoodMeta = { id: string; label: string; slug: string | null; neighborhood_type: string | null };

export async function fetchNeighborhoodSummaries(): Promise<NeighborhoodSummary[]> {
  if (!supabase) return [];
  let data: unknown = null;
  let error: unknown = null;
  try {
    const result = await supabase.rpc("neighborhood_summaries");
    data = result.data;
    error = result.error;
  } catch {
    error = true;
  }
  if (error || !data) return [];

  return (data as unknown[]).map((row: unknown) => {
    const r = row as Record<string, unknown>;
    const id = String(r.neighborhood_id);
    const slug = r.neighborhood_slug
      ? String(r.neighborhood_slug)
      : id.split(":").slice(1).join(":");
    const label = r.neighborhood_label ? String(r.neighborhood_label) : id;
    return {
      id,
      slug,
      label,
      neighborhoodType: (r.neighborhood_type as NeighborhoodType) ?? null,
      parcelCount: Number(r.parcel_count ?? 0),
      medianYear: r.median_year ? Number(r.median_year) : undefined,
      totalPermits: r.total_permits ? Number(r.total_permits) : undefined,
      totalSales: r.total_sales ? Number(r.total_sales) : undefined,
      recentTeardowns: r.recent_teardowns ? Number(r.recent_teardowns) : undefined,
    };
  });
}

export async function getNeighborhoodBySlug(slug: string): Promise<NeighborhoodSummary> {
  if (supabase) {
    try {
      const { data } = await supabase
        .from("neighborhoods")
        .select("id, label, slug, neighborhood_type")
        .eq("slug", slug)
        .single();
      if (data) {
        const d = data as { id: string; label: string; slug: string | null; neighborhood_type: string | null };
        const all = await fetchNeighborhoodSummaries();
        const found = all.find((n) => n.id === d.id);
        return found ?? {
          id: d.id,
          slug: d.slug ?? slug,
          label: d.label,
          neighborhoodType: (d.neighborhood_type as NeighborhoodType) ?? null,
          parcelCount: 0,
        };
      }
    } catch { /* fall through */ }

    // Slug column is NULL — try common ID prefixes derived from the slug directly
    for (const prefix of ["official_planning", "business_district", "local_market", "neighborhood"]) {
      try {
        const { data: byId } = await supabase
          .from("neighborhoods")
          .select("id, label, slug, neighborhood_type")
          .eq("id", `${prefix}:${slug}`)
          .maybeSingle();
        if (byId) {
          const d = byId as { id: string; label: string; slug: string | null; neighborhood_type: string | null };
          const all = await fetchNeighborhoodSummaries();
          const found = all.find((n) => n.id === d.id);
          return found ?? {
            id: d.id,
            slug: d.slug ?? slug,
            label: d.label,
            neighborhoodType: (d.neighborhood_type as NeighborhoodType) ?? null,
            parcelCount: 0,
          };
        }
      } catch { /* try next prefix */ }
    }

    // Last resort: match by derived slug in summaries
    try {
      const all = await fetchNeighborhoodSummaries();
      const found = all.find((n) => n.slug === slug);
      if (found) return found;
    } catch { /* fall through */ }
  }
  throw new Error(`Unknown neighborhood slug: ${slug}`);
}

export async function getNeighborhoodDetail(id: string): Promise<NeighborhoodDetail> {
  const summaries = await fetchNeighborhoodSummaries();
  const summary = summaries.find((n) => n.id === id);

  let meta: NeighborhoodMeta | null = null;
  if (supabase && !summary) {
    try {
      const { data } = await supabase
        .from("neighborhoods")
        .select("id, label, slug, neighborhood_type")
        .eq("id", id)
        .single();
      if (data) meta = data as NeighborhoodMeta;
    } catch { /* use fallback */ }
  }

  const base: NeighborhoodSummary = summary ?? {
    id,
    slug: meta?.slug ?? id.split(":").slice(1).join(":"),
    label: meta?.label ?? id,
    neighborhoodType: (meta?.neighborhood_type as NeighborhoodType) ?? null,
    parcelCount: 0,
  };

  let decadeRows: DecadeRow[] = [];
  let streets: Array<{ name: string; displayName: string; parcelCount: number }> = [];

  if (supabase) {
    try {
      const r = await supabase.rpc("neighborhood_decade_distribution", { p_neighborhood_id: id });
      if (!r.error && r.data) {
        decadeRows = (r.data as Array<{ decade: string; count: number }>).map((row) => ({
          decade: row.decade,
          count: Number(row.count),
        }));
      }
    } catch { /* use empty fallback */ }
    try {
      const r = await supabase.rpc("neighborhood_streets", { p_neighborhood_id: id });
      if (!r.error && r.data) {
        streets = (r.data as Array<{ street_name: string; display_name: string; parcel_count: number }>)
          .map((row) => ({
            name: row.street_name,
            displayName: row.display_name,
            parcelCount: Number(row.parcel_count),
          }));
      }
    } catch { /* use empty fallback */ }
  }

  return { ...base, decadeRows, streets };
}

export async function fetchNeighborhoodPins(neighborhoodId: string): Promise<string[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.rpc("neighborhood_pins", { p_neighborhood_id: neighborhoodId });
    if (error || !data) return [];
    return (data as Array<{ pin: string }>).map((r) => r.pin).filter(Boolean);
  } catch {
    return [];
  }
}

export async function fetchNeighborhoodBbox(
  neighborhoodId: string
): Promise<[number, number, number, number] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc("neighborhood_bbox", { p_neighborhood_id: neighborhoodId });
    if (error || !data) return null;
    const b = data as Record<string, number>;
    if (b.minLng == null) return null;
    return [b.minLng, b.minLat, b.maxLng, b.maxLat];
  } catch {
    return null;
  }
}
