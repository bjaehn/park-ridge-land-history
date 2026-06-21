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
function flt(fd: FormData, key: string): number | null {
  const v = fd.get(key);
  if (!v || typeof v !== "string" || !v.trim()) return null;
  const n = parseFloat(v.trim());
  return isNaN(n) ? null : n;
}

// ─── Parcel core fields ───────────────────────────────────────────────────────

export async function updateParcel(pin: string, formData: FormData) {
  const { error } = await adminSupabase
    .from("parcels")
    .update({
      address:       str(formData, "address"),
      year_built:    num(formData, "year_built"),
      property_class: str(formData, "property_class"),
      building_sqft: flt(formData, "building_sqft"),
      land_sqft:     flt(formData, "land_sqft"),
      municipality:  str(formData, "municipality"),
      pin_township:  str(formData, "pin_township"),
      pin_section:   str(formData, "pin_section"),
      pin_block:     str(formData, "pin_block"),
      pin_parcel:    str(formData, "pin_parcel"),
      pin_unit:      str(formData, "pin_unit"),
      deed_notes:    str(formData, "deed_notes"),
      official_planning_neighborhood_id: str(formData, "official_planning_neighborhood_id"),
      business_district_id:              str(formData, "business_district_id"),
      local_neighborhood_id:             str(formData, "local_neighborhood_id"),
    })
    .eq("pin_normalized", pin);

  revalidatePath(`/admin/properties/${encodeURIComponent(pin)}`);
  if (error) return { error: error.message };
  return {};
}

// ─── Subdivision links ────────────────────────────────────────────────────────

async function syncParcelCount(subdivisionId: string) {
  const { count } = await adminSupabase
    .from("property_subdivision_links")
    .select("id", { count: "exact", head: true })
    .eq("subdivision_id", subdivisionId);
  await adminSupabase
    .from("subdivisions")
    .update({ parcel_count: count ?? 0 })
    .eq("id", subdivisionId);
}

export async function upsertSubdivisionLink(
  pin: string,
  linkId: string | null,
  formData: FormData
) {
  const subdivisionId = str(formData, "subdivision_id");
  const payload = {
    pin,
    subdivision_id:   subdivisionId,
    lot_number:       str(formData, "lot_number"),
    block_number:     str(formData, "block_number"),
    year:             num(formData, "year"),
    match_method:     str(formData, "match_method") ?? "manual",
    confidence_level: str(formData, "confidence_level") ?? "unknown",
    confidence_reason: str(formData, "confidence_reason"),
    source_name:      str(formData, "source_name"),
    source_reference: str(formData, "source_reference"),
  };

  const { error } = linkId
    ? await adminSupabase.from("property_subdivision_links").update(payload).eq("id", linkId)
    : await adminSupabase.from("property_subdivision_links").upsert(payload, { onConflict: "pin,subdivision_id" });

  if (error) return { error: error.message };
  if (subdivisionId) await syncParcelCount(subdivisionId);
  revalidatePath(`/admin/properties/${encodeURIComponent(pin)}`);
  revalidatePath("/subdivisions");
  return {};
}

export async function deleteSubdivisionLink(linkId: string, pin: string) {
  // Fetch subdivision_id before deleting so we can sync the count after
  const { data: existing } = await adminSupabase
    .from("property_subdivision_links")
    .select("subdivision_id")
    .eq("id", linkId)
    .single();

  const { error } = await adminSupabase
    .from("property_subdivision_links")
    .delete()
    .eq("id", linkId);

  if (error) return { error: error.message };
  if (existing?.subdivision_id) await syncParcelCount(existing.subdivision_id);
  revalidatePath(`/admin/properties/${encodeURIComponent(pin)}`);
  revalidatePath("/subdivisions");
  return {};
}

// ─── Property events ──────────────────────────────────────────────────────────

export async function upsertPropertyEvent(
  pin: string,
  eventId: string | null,
  formData: FormData
) {
  const payload: Record<string, unknown> = {
    pin,
    event_type:  str(formData, "event_type") ?? "note",
    event_year:  num(formData, "event_year"),
    event_date:  str(formData, "event_date"),
    title:       str(formData, "title") ?? "",
    description: str(formData, "description"),
    price:       flt(formData, "price"),
    amount:      flt(formData, "amount"),
    source_id:   str(formData, "source_id"),
  };

  const { error } = eventId
    ? await adminSupabase.from("property_events").update(payload).eq("id", eventId)
    : await adminSupabase.from("property_events").insert(payload);

  revalidatePath(`/admin/properties/${encodeURIComponent(pin)}`);
  if (error) return { error: error.message };
  return {};
}

export async function deletePropertyEvent(eventId: string, pin: string) {
  const { error } = await adminSupabase.from("property_events").delete().eq("id", eventId);
  revalidatePath(`/admin/properties/${encodeURIComponent(pin)}`);
  if (error) return { error: error.message };
  return {};
}

// ─── Parcel change events ─────────────────────────────────────────────────────

export async function upsertChangeEvent(
  eventId: string | null,
  formData: FormData
): Promise<{ id?: string; error?: string }> {
  const payload = {
    event_type:      str(formData, "event_type") ?? "boundary_adj",
    event_date:      str(formData, "event_date"),
    event_year:      num(formData, "event_year"),
    date_precision:  str(formData, "date_precision") ?? "unknown",
    description:     str(formData, "description"),
    plat_book:       str(formData, "plat_book"),
    plat_page:       str(formData, "plat_page"),
    document_number: str(formData, "document_number"),
    confidence_level: str(formData, "confidence_level") ?? "unknown",
    notes:           str(formData, "notes"),
  };

  if (eventId) {
    const { error } = await adminSupabase
      .from("parcel_change_events")
      .update(payload)
      .eq("id", eventId);
    if (error) return { error: error.message };
    return { id: eventId };
  } else {
    const { data, error } = await adminSupabase
      .from("parcel_change_events")
      .insert(payload)
      .select("id")
      .single();
    if (error) return { error: error.message };
    return { id: data.id };
  }
}

export async function deleteChangeEvent(eventId: string) {
  const { error } = await adminSupabase.from("parcel_change_events").delete().eq("id", eventId);
  if (error) return { error: error.message };
  return {};
}

export async function upsertLineageEdge(
  changeEventId: string,
  edgeId: string | null,
  formData: FormData
) {
  const payload = {
    change_event_id: changeEventId,
    pin:  str(formData, "pin") ?? "",
    side: str(formData, "side") ?? "predecessor",
    notes: str(formData, "notes"),
  };

  const { error } = edgeId
    ? await adminSupabase.from("parcel_lineage_edges").update(payload).eq("id", edgeId)
    : await adminSupabase.from("parcel_lineage_edges").insert(payload);

  if (error) return { error: error.message };
  return {};
}

export async function deleteLineageEdge(edgeId: string) {
  const { error } = await adminSupabase.from("parcel_lineage_edges").delete().eq("id", edgeId);
  if (error) return { error: error.message };
  return {};
}
