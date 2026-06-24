import { adminSupabase } from "@/lib/supabase/adminClient";
import { PlatMappingContent } from "./_PlatMappingContent";

export const metadata = { title: "Recorder Plat Index — Admin" };

export default async function PlatMappingPage() {
  const [{ data: rawEntries }, { data: subdivisions }, { data: rawPageCodes }] =
    await Promise.all([
      adminSupabase
        .from("recorder_plat_index")
        .select("id, section_ref, short_name, full_name, subdivision_id, gis_page_code, notes, subdivisions(id, name)")
        .order("section_ref")
        .order("full_name"),
      adminSupabase.from("subdivisions").select("id, name").order("name"),
      adminSupabase
        .from("parcels")
        .select("subdivision_name")
        .eq("municipality", "CITY OF PARK RIDGE")
        .not("subdivision_name", "is", null)
        .like("subdivision_name", "Assessor subdivision area %"),
    ]);

  // Aggregate page code counts client-side from raw rows
  const codeMap = new Map<string, number>();
  for (const row of rawPageCodes ?? []) {
    const code = (row.subdivision_name as string).replace("Assessor subdivision area ", "");
    codeMap.set(code, (codeMap.get(code) ?? 0) + 1);
  }
  const pageCodes = Array.from(codeMap.entries())
    .map(([code, cnt]) => ({ code, cnt }))
    .sort((a, b) => a.code.localeCompare(b.code));

  const entries = (rawEntries ?? []).map((e) => ({
    ...e,
    subdivisions: Array.isArray(e.subdivisions)
      ? (e.subdivisions[0] ?? null)
      : (e.subdivisions ?? null),
  }));

  return (
    <PlatMappingContent
      entries={entries}
      subdivisions={subdivisions ?? []}
      pageCodes={pageCodes}
    />
  );
}
