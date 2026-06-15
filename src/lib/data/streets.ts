/**
 * Data access layer -- streets.
 *
 * Streets replace TIGER census blocks as the mid-tier place in the
 * City > Neighborhood > Street > Property hierarchy. Parcels are grouped
 * by normalized street name (e.g. "N PROSPECT AVE").
 *
 * No TIGER block IDs, block pages, or block URLs are created here.
 */

import { supabase } from "../supabase/client";
import type { DecadeRow } from "../../components/ui/ConstructionByDecadeChart";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StreetSummary = {
  name: string;
  normalizedName: string;
  parcelCount: number;
  oldestYear?: number;
  newestYear?: number;
  eraSpan?: string;
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
  medianYear?: number;
  decadeRows: DecadeRow[];
  parcels: StreetParcelRow[];
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getStreetByName(rawName: string): Promise<StreetSummary> {
  const normalized = rawName.toUpperCase().trim();

  if (supabase) {
    const { data, error } = await supabase
      .from("parcels")
      .select("address, year_built, neighborhood_id, neighborhood_label")
      .ilike("street_name_normalized", normalized)
      .limit(500);

    if (!error && data && data.length > 0) {
      const years = data
        .map((r) => r.year_built)
        .filter((y): y is number => typeof y === "number" && y > 1800);
      const oldestYear = years.length ? Math.min(...years) : undefined;
      const newestYear = years.length ? Math.max(...years) : undefined;

      const neighborhoodLabel = (data[0] as Record<string, unknown>).neighborhood_label as string | undefined;
      const neighborhoodId = (data[0] as Record<string, unknown>).neighborhood_id as string | undefined;
      const neighborhoodSlug = neighborhoodId?.replace("neighborhood:", "");

      const eraSpan =
        oldestYear && newestYear && oldestYear !== newestYear
          ? `${Math.floor(oldestYear / 10) * 10}s to ${Math.floor(newestYear / 10) * 10}s`
          : oldestYear
          ? `${Math.floor(oldestYear / 10) * 10}s`
          : undefined;

      return {
        name: formatStreetDisplayName(rawName),
        normalizedName: normalized,
        parcelCount: data.length,
        oldestYear,
        newestYear,
        eraSpan,
        neighborhoodLabel,
        neighborhoodSlug,
      };
    }
  }

  return {
    name: formatStreetDisplayName(rawName),
    normalizedName: normalized,
    parcelCount: 0,
  };
}

export async function getStreetDetail(normalizedName: string): Promise<StreetDetail> {
  const summary = await getStreetByName(normalizedName);
  let decadeRows: DecadeRow[] = [];
  let parcels: StreetParcelRow[] = [];

  if (supabase) {
    const { data, error } = await supabase
      .from("parcels")
      .select("pin_normalized, pin_original, address, year_built, decade_built, permit_count")
      .ilike("street_name_normalized", normalizedName.toUpperCase())
      .order("year_built", { ascending: true, nullsFirst: false });

    if (!error && data) {
      parcels = data.map((r) => ({
        pin: String(r.pin_normalized ?? r.pin_original ?? ""),
        address: r.address as string | null,
        yearBuilt: r.year_built as number | null,
        permitCount: r.permit_count as number | null,
      }));

      const countsByDecade: Record<string, number> = {};
      data.forEach((r) => {
        const d = String(r.decade_built ?? "Unknown");
        countsByDecade[d] = (countsByDecade[d] ?? 0) + 1;
      });
      decadeRows = Object.entries(countsByDecade).map(([decade, count]) => ({ decade, count }));
    }
  }

  const years = parcels.map((p) => p.yearBuilt).filter((y): y is number => typeof y === "number");
  const medianYear = years.length ? median(years) : undefined;

  return { ...summary, medianYear, decadeRows, parcels };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function formatStreetDisplayName(raw: string): string {
  return raw
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
