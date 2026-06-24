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

export async function savePlatIndexGisCodes(id: string, codes: string[]) {
  const { error } = await adminSupabase
    .from("recorder_plat_index")
    .update({ gis_page_codes: codes.length > 0 ? codes : null })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/plat-mapping");
}

export async function bulkLinkParcelsByPageCodes(
  subdivisionId: string,
  gisPageCodes: string[]
): Promise<number> {
  if (!gisPageCodes.length) return 0;
  const subdivisionNames = gisPageCodes.map((c) => `Assessor subdivision area ${c}`);

  const { data, error } = await adminSupabase
    .from("parcels")
    .update({
      subdivision_id: subdivisionId,
      subdivision_match_method: "gis_page_code",
      subdivision_confidence: "high",
      subdivision_source: `Cook County Assessor GIS plat page${gisPageCodes.length > 1 ? "s" : ""} ${gisPageCodes.join(", ")}`,
    })
    .eq("municipality", "CITY OF PARK RIDGE")
    .in("subdivision_name", subdivisionNames)
    .is("subdivision_id", null)
    .select("pin_normalized");

  if (error) throw new Error(error.message);
  revalidatePath(`/admin/subdivisions/${subdivisionId}`);
  revalidatePath("/subdivisions");
  return data?.length ?? 0;
}
