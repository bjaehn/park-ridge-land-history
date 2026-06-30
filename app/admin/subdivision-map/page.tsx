import { adminSupabase } from "@/lib/supabase/adminClient";
import { SubdivisionLayerMap } from "./_SubdivisionLayerMap";

export const dynamic = "force-dynamic";

export type SubdivisionListItem = {
  id: string;
  name: string;
  parcel_count: number | null;
  recorded_year: number | null;
};

export default async function SubdivisionMapPage() {
  const { data } = await adminSupabase
    .from("subdivision_index_view")
    .select("id, name, parcel_count, recorded_year")
    .order("name", { ascending: true });

  const subdivisions: SubdivisionListItem[] = (data ?? []) as SubdivisionListItem[];

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
