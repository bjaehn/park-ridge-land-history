import { adminSupabase } from "@/lib/supabase/adminClient";
import { PlatMappingContent } from "./_PlatMappingContent";

export const metadata = { title: "Recorder Plat Index — Admin" };

export default async function PlatMappingPage() {
  const [{ data: rawEntries }, { data: subdivisions }] = await Promise.all([
    adminSupabase
      .from("recorder_plat_index")
      .select("id, section_ref, short_name, full_name, subdivision_id, notes, subdivisions(id, name)")
      .order("section_ref")
      .order("full_name"),
    adminSupabase
      .from("subdivisions")
      .select("id, name")
      .order("name"),
  ]);

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
    />
  );
}
