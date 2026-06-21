"use server";

import { revalidatePath } from "next/cache";
import { adminSupabase } from "@/lib/supabase/adminClient";

function str(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  return v && typeof v === "string" && v.trim() ? v.trim() : null;
}
function num(fd: FormData, key: string): number | null {
  const v = fd.get(key);
  if (!v || typeof v !== "string" || !v.trim()) return null;
  const n = parseInt(v.trim(), 10);
  return isNaN(n) ? null : n;
}

// ─── Neighborhood ─────────────────────────────────────────────────────────────

export async function createNeighborhood(formData: FormData) {
  const id    = str(formData, "id") ?? "";
  const label = str(formData, "label") ?? "";
  const { error } = await adminSupabase.from("neighborhoods").insert({
    id,
    label,
    neighborhood_type:  str(formData, "neighborhood_type") ?? "official_planning",
    description:        str(formData, "description"),
    slug:               str(formData, "slug"),
    historical_summary: str(formData, "historical_summary"),
    established_year:   num(formData, "established_year"),
    notes:              str(formData, "notes"),
  });
  revalidatePath("/admin/neighborhoods");
  if (error) return { error: error.message };
  return { id };
}

export async function updateNeighborhood(id: string, formData: FormData) {
  const { error } = await adminSupabase
    .from("neighborhoods")
    .update({
      label:              str(formData, "label") ?? "",
      neighborhood_type:  str(formData, "neighborhood_type") ?? "official_planning",
      description:        str(formData, "description"),
      slug:               str(formData, "slug"),
      historical_summary: str(formData, "historical_summary"),
      established_year:   num(formData, "established_year"),
      notes:              str(formData, "notes"),
      updated_at:         new Date().toISOString(),
    })
    .eq("id", id);
  revalidatePath("/admin/neighborhoods");
  revalidatePath(`/admin/neighborhoods/${encodeURIComponent(id)}`);
  if (error) return { error: error.message };
  return {};
}

// ─── Boundary (geometry) ──────────────────────────────────────────────────────
// Supabase PostgREST accepts a raw GeoJSON string for geometry columns.
// The geojson field should be a valid GeoJSON Geometry object string.

export async function updateNeighborhoodGeometry(id: string, formData: FormData) {
  const geojsonStr = str(formData, "geojson");
  if (!geojsonStr) {
    const { error } = await adminSupabase
      .from("neighborhoods")
      .update({ geometry: null, bounds_json: null })
      .eq("id", id);
    revalidatePath(`/admin/neighborhoods/${encodeURIComponent(id)}`);
    if (error) return { error: error.message };
    return {};
  }

  let parsed: unknown;
  try { parsed = JSON.parse(geojsonStr); } catch {
    return { error: "Invalid JSON - paste a valid GeoJSON geometry object." };
  }

  // Use ST_GeomFromGeoJSON via rpc or pass GeoJSON directly
  const { error } = await adminSupabase
    .from("neighborhoods")
    .update({
      geometry:   geojsonStr,
      bounds_json: parsed,
    })
    .eq("id", id);

  revalidatePath(`/admin/neighborhoods/${encodeURIComponent(id)}`);
  if (error) return { error: error.message };
  return {};
}

// ─── Subdivision links ────────────────────────────────────────────────────────

export async function upsertNeighborhoodSubdivisionLink(
  neighborhoodId: string,
  linkId: string | null,
  formData: FormData
) {
  const payload = {
    neighborhood_id:   neighborhoodId,
    subdivision_id:    str(formData, "subdivision_id"),
    relationship_type: str(formData, "relationship_type"),
    notes:             str(formData, "notes"),
  };

  const { error } = linkId
    ? await adminSupabase.from("neighborhood_subdivision_links").update(payload).eq("id", linkId)
    : await adminSupabase.from("neighborhood_subdivision_links").insert(payload);

  revalidatePath(`/admin/neighborhoods/${encodeURIComponent(neighborhoodId)}`);
  if (error) return { error: error.message };
  return {};
}

export async function deleteNeighborhoodSubdivisionLink(linkId: string, neighborhoodId: string) {
  const { error } = await adminSupabase
    .from("neighborhood_subdivision_links")
    .delete()
    .eq("id", linkId);
  revalidatePath(`/admin/neighborhoods/${encodeURIComponent(neighborhoodId)}`);
  if (error) return { error: error.message };
  return {};
}

// ─── Parcel assignment by street ─────────────────────────────────────────────

export async function assignParcelsToNeighborhoodByStreet(
  neighborhoodId: string,
  neighborhoodType: string,
  streets: string[]
) {
  if (streets.length === 0) return { error: "No streets provided." };

  const column =
    neighborhoodType === "business_district" ? "business_district_id" :
    neighborhoodType === "local_market"       ? "local_neighborhood_id" :
                                                "official_planning_neighborhood_id";

  const normalizedStreets = streets.map((s) => s.toLowerCase().trim()).filter(Boolean);
  if (normalizedStreets.length === 0) return { error: "No valid street names." };

  const { error, count } = await adminSupabase
    .from("parcels")
    .update({ [column]: neighborhoodId })
    .in("street_name_normalized", normalizedStreets);

  revalidatePath(`/admin/neighborhoods/${encodeURIComponent(neighborhoodId)}`);
  if (error) return { error: error.message };
  return { updated: count ?? 0 };
}

export async function removeParcelsFromNeighborhood(
  neighborhoodId: string,
  neighborhoodType: string
) {
  const column =
    neighborhoodType === "business_district" ? "business_district_id" :
    neighborhoodType === "local_market"       ? "local_neighborhood_id" :
                                                "official_planning_neighborhood_id";

  const { error } = await adminSupabase
    .from("parcels")
    .update({ [column]: null })
    .eq(column, neighborhoodId);

  revalidatePath(`/admin/neighborhoods/${encodeURIComponent(neighborhoodId)}`);
  if (error) return { error: error.message };
  return {};
}
