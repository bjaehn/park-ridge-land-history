import { supabase } from "../supabase/client";
import type { ComparisonRow } from "../../components/ui/ComparisonList";

export type ParcelProperties = {
  [key: string]: unknown;
  address?: string | null;
  year_built?: number | null;
  pin_normalized?: string | null;
  pin_original?: string | null;
  building_sqft?: number | null;
  land_sqft?: number | null;
  latest_assessed_total?: number | null;
  permit_count?: number | null;
  sale_count?: number | null;
  recent_permit_count?: number | null;
  nearby_teardown_count?: number | null;
  improvement_count?: number | null;
  data_quality_flags?: string[] | null;
  source_note?: string | null;
  municipality?: string | null;
  property_class?: string | null;
  neighborhood_id?: string | null;
  neighborhood_label?: string | null;
  street_name_normalized?: string | null;
  lat?: number | null;
  lng?: number | null;
  decade_built?: string | null;
};

export type PropertyPageData = {
  address?: string | null;
  lat?: number;
  lng?: number;
  yearBuilt?: number | null;
  neighborhoodLabel?: string | null;
  neighborhoodSlug?: string | null;
  streetName?: string | null;
};

export type PropertyDetailData = {
  properties: ParcelProperties;
  subdivision?: {
    id: string;
    name: string;
    recorded_year?: number | null;
    original_owner?: string | null;
    source_reference?: string | null;
  } | null;
  comparisons?: ComparisonRow[];
  relatedHomes?: Array<{ pin: string; address?: string | null; yearBuilt?: number | null }>;
};

export async function getPropertyByPin(pin: string): Promise<PropertyPageData> {
  const props = await loadPropertyProps(pin);
  if (!props) throw new Error(`Property not found: ${pin}`);

  const lat = props.lat as number | undefined;
  const lng = props.lng as number | undefined;
  const neighborhoodId = props.neighborhood_id as string | undefined;

  return {
    address: props.address,
    lat,
    lng,
    yearBuilt: props.year_built,
    neighborhoodLabel: (props.neighborhood_label as string | undefined) ?? null,
    neighborhoodSlug: neighborhoodId?.replace("neighborhood:", "") ?? null,
    streetName: (props.street_name_normalized as string | undefined) ?? null,
  };
}

export async function getPropertyDetail(pin: string): Promise<PropertyDetailData | null> {
  const props = await loadPropertyProps(pin);
  if (!props) return null;

  let subdivision: PropertyDetailData["subdivision"] = null;
  if (supabase) {
    try {
      const { data } = await supabase
        .from("property_subdivision_links")
        .select("subdivision_id, subdivisions(id, name, recorded_year, original_owner, source_reference)")
        .eq("pin", pin)
        .maybeSingle();
      if (data?.subdivisions) {
        const sub = data.subdivisions as unknown as Record<string, unknown>;
        subdivision = {
          id: String(sub.id ?? ""),
          name: String(sub.name ?? ""),
          recorded_year: sub.recorded_year as number | null,
          original_owner: sub.original_owner as string | null,
          source_reference: sub.source_reference as string | null,
        };
      }
    } catch { /* subdivision cross-link optional */ }
  }

  let relatedHomes: PropertyDetailData["relatedHomes"] = [];
  if (supabase) {
    const streetNorm = props.street_name_normalized as string | undefined;
    if (streetNorm) {
      try {
        const { data } = await supabase
          .from("parcels")
          .select("pin_normalized, pin_original, address, year_built")
          .ilike("street_name_normalized", streetNorm)
          .neq("pin_normalized", pin)
          .limit(6);
        if (data) {
          relatedHomes = data.map((r) => ({
            pin: String(r.pin_normalized ?? r.pin_original ?? ""),
            address: r.address as string | null,
            yearBuilt: r.year_built as number | null,
          }));
        }
      } catch { /* related homes optional */ }
    }
  }

  return { properties: props, subdivision, relatedHomes };
}

async function loadPropertyProps(pin: string): Promise<ParcelProperties | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("parcels")
      .select("*")
      .eq("pin_normalized", pin)
      .single();
    if (error || !data) return null;
    const { geometry: _geom, imported_at: _ts, ...rest } = data as Record<string, unknown>;
    return rest as ParcelProperties;
  } catch {
    return null;
  }
}
