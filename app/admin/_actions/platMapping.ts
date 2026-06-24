"use server";

import { revalidatePath } from "next/cache";
import { adminSupabase } from "@/lib/supabase/adminClient";

export async function linkPlatIndexEntry(id: string, subdivisionId: string | null) {
  const { error } = await adminSupabase
    .from("recorder_plat_index")
    .update({ subdivision_id: subdivisionId || null })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/plat-mapping");
}

export async function savePlatIndexNotes(id: string, notes: string) {
  const { error } = await adminSupabase
    .from("recorder_plat_index")
    .update({ notes: notes.trim() || null })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/plat-mapping");
}

export async function savePlatIndexGisCode(id: string, gisPageCode: string | null) {
  const { error } = await adminSupabase
    .from("recorder_plat_index")
    .update({ gis_page_code: gisPageCode || null })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/plat-mapping");
}

export async function bulkLinkParcelsByPageCode(
  subdivisionId: string,
  gisPageCode: string
): Promise<number> {
  const { data, error } = await adminSupabase
    .from("parcels")
    .update({
      subdivision_id: subdivisionId,
      subdivision_match_method: "gis_page_code",
      subdivision_confidence: "high",
      subdivision_source: `Cook County Assessor GIS plat page ${gisPageCode}`,
    })
    .eq("municipality", "CITY OF PARK RIDGE")
    .eq("subdivision_name", `Assessor subdivision area ${gisPageCode}`)
    .is("subdivision_id", null)
    .select("pin_normalized");

  if (error) throw new Error(error.message);
  revalidatePath(`/admin/subdivisions/${subdivisionId}`);
  revalidatePath("/subdivisions");
  return data?.length ?? 0;
}
