import { adminSupabase } from "@/lib/supabase/adminClient";
import { SubdivisionLayerMap } from "./_SubdivisionLayerMap";

export const dynamic = "force-dynamic";

export type SubdivisionListItem = {
  id: string;
  name: string;
  linked_parcel_count: number | null;
  deed_verified_count: number | null;
  recorded_year: number | null;
};

export default async function SubdivisionMapPage() {
  const [{ data }, { data: countsRaw }] = await Promise.all([
    adminSupabase
      .from("subdivision_index_view")
      .select("id, name, linked_parcel_count, recorded_year")
      .order("name", { ascending: true }),
    adminSupabase.from("subdivision_property_counts").select("subdivision_id, total_properties"),
  ]);

  const deedVerifiedById = new Map((countsRaw ?? []).map((c) => [c.subdivision_id, c.total_properties as number]));
  const subdivisions: SubdivisionListItem[] = (data ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    linked_parcel_count: s.linked_parcel_count,
    recorded_year: s.recorded_year,
    deed_verified_count: deedVerifiedById.get(s.id) ?? 0,
  }));

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs font-semibold tracking-widest uppercase text-text-secondary mb-2">Admin</p>
        <h1 className="text-2xl font-bold text-text-primary">Subdivision Map</h1>
        <p className="text-sm text-text-secondary mt-1">
          Toggle subdivisions as color-coded layers to spot overlaps and boundary conflicts.
        </p>
      </div>
      <SubdivisionLayerMap subdivisions={subdivisions} />
    </div>
  );
}
