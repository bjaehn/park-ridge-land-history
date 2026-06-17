import { supabase } from "../supabase/client";
import type { DecadeRow } from "../../components/ui/ConstructionByDecadeChart";

export type StreetSummary = {
  name: string;
  normalizedName: string;
  parcelCount: number;
  medianYear?: number;
  oldestYear?: number;
  newestYear?: number;
  eraSpan?: string;
  neighborhoodId?: string;
  neighborhoodLabel?: string;
  neighborhoodSlug?: string;
};

export type StreetParcelRow = {
  pin: string;
  address?: string | null;
  yearBuilt?: number | null;
  permitCount?: number | null;
};

export type StreetDetail = StreetSummary & {
  decadeRows: DecadeRow[];
  parcels: StreetParcelRow[];
};

const NEIGHBORHOOD_LABELS: Record<string, string> = {
  "neighborhood:uptown":    "Uptown",
  "neighborhood:central":   "Central",
  "neighborhood:northwest": "Northwest",
  "neighborhood:northeast": "Northeast",
  "neighborhood:south":     "South Park Ridge",
};

export async function getStreetByName(rawName: string): Promise<StreetSummary> {
  const normalized = rawName.toLowerCase().trim();
  const displayName = formatStreetDisplayName(normalized);

  if (!supabase) return { name: displayName, normalizedName: normalized, parcelCount: 0 };

  try {
    const { data, error } = await supabase.rpc("street_summary", { p_street_name: normalized });
    if (error || !data || !data.length) return { name: displayName, normalizedName: normalized, parcelCount: 0 };

    const row = data[0] as Record<string, unknown>;
    const oldestYear = row.oldest_year as number | null;
    const newestYear = row.newest_year as number | null;
    const neighborhoodId = row.neighborhood_id as string | undefined;

    const eraSpan =
      oldestYear && newestYear && oldestYear !== newestYear
        ? `${Math.floor(oldestYear / 10) * 10}s to ${Math.floor(newestYear / 10) * 10}s`
        : oldestYear
        ? `${Math.floor(oldestYear / 10) * 10}s`
        : undefined;

    return {
      name: displayName,
      normalizedName: normalized,
      parcelCount: Number(row.parcel_count ?? 0),
      medianYear: row.median_year ? Number(row.median_year) : undefined,
      oldestYear: oldestYear ?? undefined,
      newestYear: newestYear ?? undefined,
      eraSpan,
      neighborhoodId,
      neighborhoodLabel: neighborhoodId ? NEIGHBORHOOD_LABELS[neighborhoodId] : undefined,
      neighborhoodSlug: neighborhoodId?.replace("neighborhood:", ""),
    };
  } catch {
    return { name: displayName, normalizedName: normalized, parcelCount: 0 };
  }
}

export async function getStreetDetail(normalizedName: string): Promise<StreetDetail> {
  const normalized = normalizedName.toLowerCase().trim();
  const summary = await getStreetByName(normalized);
  let decadeRows: DecadeRow[] = [];
  let parcels: StreetParcelRow[] = [];

  if (!supabase) return { ...summary, decadeRows, parcels };

  try {
    const { data, error } = await supabase
      .from("parcels")
      .select("pin_normalized, pin_original, address, year_built, decade_built, permit_count")
      .eq("street_name_normalized", normalized)
      .order("address", { ascending: true });

    if (!error && data) {
      parcels = data.map((r) => ({
        pin: String(r.pin_normalized ?? r.pin_original ?? ""),
        address: r.address as string | null,
        yearBuilt: r.year_built as number | null,
        permitCount: r.permit_count as number | null,
      }));

      const countsByDecade: Record<string, number> = {};
      data.forEach((r) => {
        const d = String(r.decade_built ?? "");
        if (d && d !== "Unknown" && d !== "Suspicious") {
          countsByDecade[d] = (countsByDecade[d] ?? 0) + 1;
        }
      });
      decadeRows = Object.entries(countsByDecade)
        .map(([decade, count]) => ({ decade, count }))
        .sort((a, b) => a.decade.localeCompare(b.decade));
    }
  } catch { /* return empty */ }

  return { ...summary, decadeRows, parcels };
}

export async function fetchStreetBbox(
  streetName: string
): Promise<[number, number, number, number] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc("street_bbox", { p_street_name: streetName });
    if (error || !data) return null;
    const b = data as Record<string, number>;
    if (b.minLng == null) return null;
    return [b.minLng, b.minLat, b.maxLng, b.maxLat];
  } catch {
    return null;
  }
}

function formatStreetDisplayName(normalized: string): string {
  return normalized
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
