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

// ─── Subdivision ──────────────────────────────────────────────────────────────

function deriveRecordedYear(formData: FormData): number | null {
  const explicit = num(formData, "recorded_year");
  if (explicit !== null) return explicit;
  const dateStr = str(formData, "recorded_date");
  if (!dateStr) return null;
  const year = parseInt(dateStr.split("-")[0], 10);
  return isNaN(year) ? null : year;
}

export async function createSubdivision(formData: FormData) {
  const alternateNames = (formData.getAll("alternate_names") as string[]).filter(Boolean);
  const { data, error } = await adminSupabase
    .from("subdivisions")
    .insert({
      name:                     str(formData, "name") ?? "",
      normalized_name:          str(formData, "normalized_name") ?? "",
      display_name:             str(formData, "display_name"),
      slug:                     str(formData, "slug"),
      alternate_names:          alternateNames.length ? alternateNames : null,
      entity_type:              str(formData, "entity_type"),
      recorded_date:            str(formData, "recorded_date"),
      recorded_year:            deriveRecordedYear(formData),
      development_era_start_year: num(formData, "development_era_start_year"),
      development_era_end_year:   num(formData, "development_era_end_year"),
      plat_book:                str(formData, "plat_book"),
      plat_page:                str(formData, "plat_page"),
      document_number:          str(formData, "document_number"),
      original_owner:           str(formData, "original_owner"),
      developer:                str(formData, "developer"),
      surveyor:                 str(formData, "surveyor"),
      confidence_level:         str(formData, "confidence_level") ?? "unknown",
      confidence_reason:        str(formData, "confidence_reason"),
      status:                   str(formData, "status"),
      geometry_status:          str(formData, "geometry_status"),
      source_name:              str(formData, "source_name"),
      source_reference:         str(formData, "source_reference"),
      source_url:               str(formData, "source_url"),
      notes:                    str(formData, "notes"),
      historical_summary:       str(formData, "historical_summary"),
      parent_subdivision_id:    str(formData, "parent_subdivision_id") || null,
    })
    .select("id")
    .single();

  revalidatePath("/admin/subdivisions");
  if (error) return { error: error.message };
  return { id: data.id };
}

export async function updateSubdivision(id: string, formData: FormData) {
  const alternateNames = (formData.getAll("alternate_names") as string[]).filter(Boolean);
  const { error } = await adminSupabase
    .from("subdivisions")
    .update({
      name:                     str(formData, "name") ?? "",
      normalized_name:          str(formData, "normalized_name") ?? "",
      display_name:             str(formData, "display_name"),
      slug:                     str(formData, "slug"),
      alternate_names:          alternateNames.length ? alternateNames : null,
      entity_type:              str(formData, "entity_type"),
      recorded_date:            str(formData, "recorded_date"),
      recorded_year:            deriveRecordedYear(formData),
      development_era_start_year: num(formData, "development_era_start_year"),
      development_era_end_year:   num(formData, "development_era_end_year"),
      plat_book:                str(formData, "plat_book"),
      plat_page:                str(formData, "plat_page"),
      document_number:          str(formData, "document_number"),
      original_owner:           str(formData, "original_owner"),
      developer:                str(formData, "developer"),
      surveyor:                 str(formData, "surveyor"),
      confidence_level:         str(formData, "confidence_level") ?? "unknown",
      confidence_reason:        str(formData, "confidence_reason"),
      status:                   str(formData, "status"),
      geometry_status:          str(formData, "geometry_status"),
      source_name:              str(formData, "source_name"),
      source_reference:         str(formData, "source_reference"),
      source_url:               str(formData, "source_url"),
      notes:                    str(formData, "notes"),
      historical_summary:       str(formData, "historical_summary"),
      parent_subdivision_id:    str(formData, "parent_subdivision_id") || null,
      updated_at:               new Date().toISOString(),
    })
    .eq("id", id);

  revalidatePath("/admin/subdivisions");
  revalidatePath(`/admin/subdivisions/${id}`);
  if (error) return { error: error.message };
  return {};
}

export async function deleteSubdivision(id: string) {
  const { error } = await adminSupabase.from("subdivisions").delete().eq("id", id);
  revalidatePath("/admin/subdivisions");
  if (error) return { error: error.message };
  return {};
}

// ─── Timeline Events ─────────────────────────────────────────────────────────

export async function upsertTimelineEvent(
  subdivisionId: string,
  eventId: string | null,
  formData: FormData
) {
  const payload = {
    subdivision_id:  subdivisionId,
    event_year:      num(formData, "event_year"),
    event_date:      str(formData, "event_date"),
    event_type:      str(formData, "event_type") ?? "other",
    title:           str(formData, "title") ?? "",
    description:     str(formData, "description"),
    source_name:     str(formData, "source_name"),
    source_reference: str(formData, "source_reference"),
    confidence_level: str(formData, "confidence_level") ?? "unknown",
  };

  const { error } = eventId
    ? await adminSupabase.from("subdivision_timeline_events").update(payload).eq("id", eventId)
    : await adminSupabase.from("subdivision_timeline_events").insert(payload);

  revalidatePath(`/admin/subdivisions/${subdivisionId}`);
  if (error) return { error: error.message };
  return {};
}

export async function deleteTimelineEvent(eventId: string, subdivisionId: string) {
  const { error } = await adminSupabase
    .from("subdivision_timeline_events")
    .delete()
    .eq("id", eventId);
  revalidatePath(`/admin/subdivisions/${subdivisionId}`);
  if (error) return { error: error.message };
  return {};
}

// ─── Sources ─────────────────────────────────────────────────────────────────

export async function upsertSource(
  subdivisionId: string,
  sourceId: string | null,
  formData: FormData
) {
  const payload = {
    subdivision_id:   subdivisionId,
    source_type:      str(formData, "source_type"),
    source_name:      str(formData, "source_name") ?? "",
    source_reference: str(formData, "source_reference"),
    source_url:       str(formData, "source_url"),
    retrieved_at:     str(formData, "retrieved_at"),
    notes:            str(formData, "notes"),
  };

  const { error } = sourceId
    ? await adminSupabase.from("subdivision_sources").update(payload).eq("id", sourceId)
    : await adminSupabase.from("subdivision_sources").insert(payload);

  revalidatePath(`/admin/subdivisions/${subdivisionId}`);
  if (error) return { error: error.message };
  return {};
}

export async function deleteSource(sourceId: string, subdivisionId: string) {
  const { error } = await adminSupabase.from("subdivision_sources").delete().eq("id", sourceId);
  revalidatePath(`/admin/subdivisions/${subdivisionId}`);
  if (error) return { error: error.message };
  return {};
}

// ─── Aliases ─────────────────────────────────────────────────────────────────

export async function upsertAlias(
  subdivisionId: string,
  aliasId: string | null,
  formData: FormData
) {
  const payload = {
    subdivision_id: subdivisionId,
    alias:          str(formData, "alias") ?? "",
    alias_type:     str(formData, "alias_type"),
    confidence:     str(formData, "confidence") ?? "unknown",
  };

  const { error } = aliasId
    ? await adminSupabase.from("subdivision_aliases").update(payload).eq("id", aliasId)
    : await adminSupabase.from("subdivision_aliases").insert(payload);

  revalidatePath(`/admin/subdivisions/${subdivisionId}`);
  if (error) return { error: error.message };
  return {};
}

export async function deleteAlias(aliasId: string, subdivisionId: string) {
  const { error } = await adminSupabase.from("subdivision_aliases").delete().eq("id", aliasId);
  revalidatePath(`/admin/subdivisions/${subdivisionId}`);
  if (error) return { error: error.message };
  return {};
}

// ─── Lots ────────────────────────────────────────────────────────────────────

export async function upsertLot(
  subdivisionId: string,
  lotId: string | null,
  formData: FormData
) {
  const payload = {
    subdivision_id:  subdivisionId,
    lot_number:      str(formData, "lot_number"),
    block_number:    str(formData, "block_number"),
    current_pin:     str(formData, "current_pin"),
    current_address: str(formData, "current_address"),
    lot_status:      str(formData, "lot_status"),
    match_method:    str(formData, "match_method"),
    confidence_level: str(formData, "confidence_level") ?? "unknown",
    notes:           str(formData, "notes"),
  };

  const { error } = lotId
    ? await adminSupabase.from("subdivision_lots").update(payload).eq("id", lotId)
    : await adminSupabase.from("subdivision_lots").insert(payload);

  revalidatePath(`/admin/subdivisions/${subdivisionId}`);
  if (error) return { error: error.message };
  return {};
}

export async function deleteLot(lotId: string, subdivisionId: string) {
  const { error } = await adminSupabase.from("subdivision_lots").delete().eq("id", lotId);
  revalidatePath(`/admin/subdivisions/${subdivisionId}`);
  if (error) return { error: error.message };
  return {};
}
